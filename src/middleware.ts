// AGPL-3.0
// 全局限流中间件 (Next.js App Router Edge Runtime)
//
// 设计说明：
// - 由于 Next.js 中间件运行在 Edge Runtime，无法使用依赖 Node.js `net` 模块的 ioredis，
//   因此本中间件使用基于内存的滑动窗口限流器。
// - 本中间件不依赖 Redis，确保核心保护不中断。

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ========== 常量 ==========

// API Key 限流：每个 Key 每分钟 120 次
const API_KEY_RPM = 120;
const API_KEY_WINDOW_MS = 60_000; // 1 分钟

// IP 限流：每个 IP 每分钟 300 次
const IP_RPM = 300;
const IP_WINDOW_MS = 60_000;

// Web 路由限流：每个用户会话每分钟 300 次
const WEB_RPM = 300;
const WEB_WINDOW_MS = 60_000;

// 内存清理间隔：每 5 分钟清理一次过期条目，防止内存泄漏
const CLEANUP_INTERVAL_MS = 300_000;

// ========== 内存限流存储 ==========

interface RateLimitBucket {
  timestamps: number[];
}

// 使用 Map 存储限流桶（Edge Runtime 中全局 Map 在请求间共享）
// 注意：在 Vercel / 多实例部署下各实例独立，不具备分布式一致性
const apiKeyStore = new Map<string, RateLimitBucket>();
const ipStore = new Map<string, RateLimitBucket>();
const webSessionStore = new Map<string, RateLimitBucket>();

// 上次清理时间
let lastCleanup = Date.now();

/**
 * 清理所有限流存储中的过期条目
 */
function cleanupStaleEntries(): void {
  const now = Date.now();

  // 每 5 分钟最多执行一次清理
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const maxWindowMs = Math.max(API_KEY_WINDOW_MS, IP_WINDOW_MS, WEB_WINDOW_MS);

  const cleanStore = (store: Map<string, RateLimitBucket>) => {
    for (const [key, bucket] of store) {
      bucket.timestamps = bucket.timestamps.filter(
        (ts) => now - ts < maxWindowMs
      );
      // 如果桶为空，删除以节省内存
      if (bucket.timestamps.length === 0) {
        store.delete(key);
      }
    }
  };

  cleanStore(apiKeyStore);
  cleanStore(ipStore);
  cleanStore(webSessionStore);
}

/**
 * 内存滑动窗口限流检查
 * 
 * @param store - 限流存储 Map
 * @param key   - 限流标识键
 * @param limit - 窗口内最大请求数
 * @param windowMs - 窗口大小（毫秒）
 * @returns 限流结果
 */
function checkInMemoryRateLimit(
  store: Map<string, RateLimitBucket>,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = store.get(key);

  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(key, bucket);
  }

  // 清理过期时间戳
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  const currentCount = bucket.timestamps.length;
  const remaining = Math.max(0, limit - currentCount - 1);

  if (currentCount >= limit) {
    // 超出限制：计算最早条目的过期时间作为重置时间
    const oldestTs = bucket.timestamps.length > 0 ? bucket.timestamps[0] : now;
    const resetTime = oldestTs + windowMs;

    return { allowed: false, remaining: Math.max(0, limit - currentCount), resetTime };
  }

  // 允许请求：记录当前时间戳
  bucket.timestamps.push(now);

  return {
    allowed: true,
    remaining,
    resetTime: now + windowMs,
  };
}

// ========== 工具函数 ==========

/**
 * 从请求 Header 中提取 API Key（X-API-Key 或 Authorization Bearer）
 */
function extractApiKey(request: NextRequest): string | null {
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey && xApiKey.trim().length > 0) {
    return xApiKey.trim();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * 从请求中提取客户端 IP
 * 优先级：x-forwarded-for > x-real-ip > 直连 IP
 */
function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for 可能包含多个 IP，取第一个
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // 直连 IP（Edge Runtime 中可用）
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         request.headers.get("x-real-ip") ||
         "unknown";
}

/**
 * 从请求中提取用户会话标识
 * 用于 Web 路由的限流
 */
function extractSessionId(request: NextRequest): string {
  // 尝试从 cookie 中获取 session token
  const authToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (authToken) {
    return `session:${authToken.substring(0, 32)}`;
  }

  // 无 session 时回退到 IP
  return `ip:${extractClientIp(request)}`;
}

// ========== 路由判断 ==========

/**
 * 检查路径是否为 API 路由
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/ai/");
}

/**
 * 检查路径是否为 Web 仪表盘路由
 */
function isWebRoute(pathname: string): boolean {
  return pathname.startsWith("/") && !pathname.startsWith("/api/") && !pathname.startsWith("/_next");
}

// ========== 主中间件函数 ==========

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过不需要限流的路径
  if (shouldSkipRateLimit(pathname)) {
    return NextResponse.next();
  }

  // 定期清理过期条目
  cleanupStaleEntries();

  // API 路由限流
  if (isApiRoute(pathname)) {
    return handleApiRateLimit(request);
  }

  // Web 路由限流
  if (isWebRoute(pathname)) {
    return handleWebRateLimit(request);
  }

  return NextResponse.next();
}

/**
 * 处理 API 路由限流（双维度：API Key + IP）
 */
function handleApiRateLimit(request: NextRequest): NextResponse {
  const ip = extractClientIp(request);
  const apiKey = extractApiKey(request);

  // --- 维度 1：IP 限流（300 RPM） ---
  const ipResult = checkInMemoryRateLimit(
    ipStore,
    `ip:${ip}`,
    IP_RPM,
    IP_WINDOW_MS
  );

  if (!ipResult.allowed) {
    const retryAfterSeconds = Math.ceil(
      (ipResult.resetTime - Date.now()) / 1000
    );

    return new NextResponse(
      JSON.stringify({
        error: {
          message: "Too many requests. Please try again later.",
          type: "rate_limit_exceeded",
          code: 429,
        },
      }),
      {
        status: 429,
        headers: buildRateLimitHeaders(
          IP_RPM,
          ipResult.remaining,
          ipResult.resetTime,
          retryAfterSeconds
        ),
      }
    );
  }

  // --- 维度 2：API Key 限流（120 RPM per key） ---
  if (apiKey) {
    const keyResult = checkInMemoryRateLimit(
      apiKeyStore,
      `key:${apiKey}`,
      API_KEY_RPM,
      API_KEY_WINDOW_MS
    );

    if (!keyResult.allowed) {
      const retryAfterSeconds = Math.ceil(
        (keyResult.resetTime - Date.now()) / 1000
      );

      return new NextResponse(
        JSON.stringify({
          error: {
            message: "API key rate limit exceeded. Please reduce request frequency.",
            type: "rate_limit_exceeded",
            code: 429,
          },
        }),
        {
          status: 429,
          headers: buildRateLimitHeaders(
            API_KEY_RPM,
            keyResult.remaining,
            keyResult.resetTime,
            retryAfterSeconds
          ),
        }
      );
    }
  }

  // 限流通过，继续处理
  return NextResponse.next();
}

/**
 * 处理 Web 仪表盘路由限流（300 RPM per session）
 */
function handleWebRateLimit(request: NextRequest): NextResponse {
  const sessionId = extractSessionId(request);

  const result = checkInMemoryRateLimit(
    webSessionStore,
    sessionId,
    WEB_RPM,
    WEB_WINDOW_MS
  );

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(
      (result.resetTime - Date.now()) / 1000
    );

    // Web 路由限流时返回一个友好的提示页面或 JSON
    return new NextResponse(
      JSON.stringify({
        error: {
          message: "访问过于频繁，请稍后再试。",
          type: "rate_limit_exceeded",
          code: 429,
        },
      }),
      {
        status: 429,
        headers: buildRateLimitHeaders(
          WEB_RPM,
          result.remaining,
          result.resetTime,
          retryAfterSeconds
        ),
      }
    );
  }

  return NextResponse.next();
}

/**
 * 构建限流相关的响应头
 */
function buildRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTimeMs: number,
  retryAfterSeconds: number
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Retry-After": String(Math.max(1, retryAfterSeconds)),
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(resetTimeMs / 1000)),
  };
}

/**
 * 判断是否需要跳过限流
 * 
 * 跳过的路径：
 * - 静态资源（/_next/*, /favicon.ico, /manifest.json, /sw.js, /offline）
 * - 静态文件（*.js, *.css, *.png, *.ico, *.svg 等）
 * - 认证相关路由（/login, /register, /api/auth/*）
 * - 健康检查端点
 */
function shouldSkipRateLimit(pathname: string): boolean {
  // Next.js 内部资源
  if (pathname.startsWith("/_next/")) return true;

  // 静态文件和资源
  if (
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/offline")
  ) {
    return true;
  }

  // 带扩展名的静态文件请求
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif)$/i.test(pathname)) {
    return true;
  }

  // 认证路由
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth/")
  ) {
    return true;
  }

  return false;
}

/**
 * Next.js 中间件配置
 * matcher 定义了哪些路径会触发中间件
 */
export const config = {
  matcher: [
    /*
     * 匹配以下路径：
     * - /api/ai/ 下的所有路由
     * - /(dashboard)/ 下的所有仪表盘页面
     * - 根路径
     */
    "/api/ai/:path*",
    "/:path*",
  ],
};
