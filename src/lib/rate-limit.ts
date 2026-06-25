// AGPL-3.0
// 滑动窗口限流器 - 基于 Redis Sorted Set 实现

import { redis, isRedisAvailable, redisKey } from "@/lib/redis";

/**
 * 限流检查结果
 */
export interface RateLimitResult {
  /** 请求是否被允许 */
  allowed: boolean;
  /** 剩余可用次数 */
  remaining: number;
  /** 下次重置时间 (Unix 毫秒时间戳) */
  resetTime: number;
}

/**
 * 滑动窗口限流 Lua 脚本
 * 
 * KEYS[1]: 限流键名 (Sorted Set)
 * ARGV[1]: 当前时间戳 (毫秒)
 * ARGV[2]: 窗口大小 (毫秒)
 * ARGV[3]: 最大请求数
 * 
 * 返回值: {allowed, remaining, resetTime}
 *   allowed:   1=允许, 0=拒绝
 *   remaining: 剩余请求次数
 *   resetTime: 窗口内最早请求过期的时间戳（毫秒），当 allowed=0 时有用
 */
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- 计算窗口起始时间
local window_start = now - window_ms

-- 移除窗口外的过期条目
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

-- 计算当前窗口内的请求数
local current_count = redis.call('ZCARD', key)

-- 计算剩余次数
local remaining = limit - current_count
if remaining < 0 then
  remaining = 0
end

if current_count >= limit then
  -- 超出限制，获取最早条目的过期时间作为重置时间
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset_time = 0
  if #oldest >= 2 then
    reset_time = tonumber(oldest[2]) + window_ms
  else
    reset_time = now + window_ms
  end
  return {0, remaining, reset_time}
end

-- 允许请求：添加当前时间戳到有序集合
redis.call('ZADD', key, now, now .. ':' .. redis.call('TIME')[1] .. redis.call('TIME')[2])

-- 设置键过期时间，防止内存泄漏
redis.call('PEXPIRE', key, window_ms + 1000)

-- 重置时间 = 当前时间 + 窗口大小（新请求的最早过期点）
return {1, limit - current_count - 1, now + window_ms}
`;

/**
 * 检查请求是否触发限流（滑动窗口算法）
 * 
 * 实现原理：
 * - 使用 Redis Sorted Set，score 为请求时间戳
 * - 每次检查时先清理窗口外的过期记录
 * - 如果当前窗口内请求数 < limit，则允许并记录
 * - 如果达到限制，返回拒绝并告知何时重置
 * 
 * 降级策略：
 * - Redis 不可用时返回 allowed=true，不阻塞业务
 * 
 * @param key 限流标识（如 "api:chat:userId" 或 "ip:192.168.1.1"）
 * @param limit 窗口内最大请求数
 * @param windowSeconds 窗口大小（秒）
 * @returns 限流检查结果
 * 
 * @example
 * ```ts
 * const result = await checkRateLimit("api:chat:user123", 10, 60);
 * if (!result.allowed) {
 *   throw new Error("请求过于频繁，请稍后重试");
 * }
 * ```
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  // 参数校验
  if (limit <= 0) {
    return { allowed: false, remaining: 0, resetTime: Date.now() + 60000 };
  }
  if (windowSeconds <= 0) {
    return { allowed: true, remaining: limit, resetTime: Date.now() };
  }

  // Redis 不可用时降级：允许所有请求
  if (!(await isRedisAvailable())) {
    console.warn(`[RateLimit] Redis 不可用，限流降级放行: key=${key}`);
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + windowSeconds * 1000,
    };
  }

  try {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const redisKeyName = redisKey("ratelimit", key);

    const result = (await redis.eval(
      RATE_LIMIT_SCRIPT,
      1,
      redisKeyName,
      now.toString(),
      windowMs.toString(),
      limit.toString()
    )) as [number, number, number];

    const [allowedCode, remaining, resetTime] = result;

    return {
      allowed: allowedCode === 1,
      remaining: Math.max(0, remaining),
      resetTime: resetTime > 0 ? resetTime : now + windowMs,
    };
  } catch (error) {
    console.error(`[RateLimit] 限流检查异常: key=${key}`, error);
    // 异常时放行，避免误伤
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + windowSeconds * 1000,
    };
  }
}

/**
 * 便捷的固定窗口限流检查（简化接口）
 * 内部使用滑动窗口实现
 * 
 * @param identifier 限流标识符（如 userId 或 IP 地址）
 * @param action 操作类型（如 "api_call", "login", "register"）
 * @param limit 窗口内最大请求数
 * @param windowSeconds 窗口大小（秒）
 */
export async function checkRateLimitByAction(
  identifier: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  return checkRateLimit(`${action}:${identifier}`, limit, windowSeconds);
}

/**
 * 获取当前窗口内请求计数（不增加计数）
 * @param key 限流标识
 * @param windowSeconds 窗口大小（秒）
 * @returns 当前窗口内的请求数，Redis 不可用时返回 -1
 */
export async function getCurrentCount(
  key: string,
  windowSeconds: number
): Promise<number> {
  if (!(await isRedisAvailable())) {
    return -1;
  }

  try {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const redisKeyName = redisKey("ratelimit", key);

    // 清理过期条目并计数
    await redis.zremrangebyscore(redisKeyName, 0, windowStart);
    return await redis.zcard(redisKeyName);
  } catch {
    return -1;
  }
}

/**
 * 重置指定 key 的限流计数
 * @param key 限流标识
 */
export async function resetRateLimit(key: string): Promise<void> {
  if (!(await isRedisAvailable())) {
    return;
  }

  try {
    const redisKeyName = redisKey("ratelimit", key);
    await redis.del(redisKeyName);
  } catch (error) {
    console.error(`[RateLimit] 重置限流失败: key=${key}`, error);
  }
}
