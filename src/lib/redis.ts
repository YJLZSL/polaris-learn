// AGPL-3.0
// Redis 客户端单例 - 连接管理、优雅降级

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// 全局单例引用，避免 Next.js 热重载时创建多个连接
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  redisAvailable: boolean;
  redisChecked: boolean;
};

function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // 重试策略：最多重试 3 次，间隔递增
      if (times > 3) {
        return null; // 停止重试
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
    // 连接超时 5 秒
    connectTimeout: 5000,
    // 命令超时 3 秒
    commandTimeout: 3000,
  });

  // 连接事件处理
  client.on("connect", () => {
    console.log("[Redis] 正在连接...");
  });

  client.on("ready", () => {
    console.log("[Redis] 连接就绪");
    globalForRedis.redisAvailable = true;
    globalForRedis.redisChecked = true;
  });

  client.on("error", (err) => {
    console.error("[Redis] 连接错误:", err.message);
    // 连接失败不影响应用运行，标记为不可用
    globalForRedis.redisAvailable = false;
    globalForRedis.redisChecked = true;
  });

  client.on("close", () => {
    console.warn("[Redis] 连接已关闭");
    globalForRedis.redisAvailable = false;
  });

  client.on("reconnecting", () => {
    console.log("[Redis] 正在重新连接...");
  });

  return client;
}

// 获取或创建 Redis 实例
export const redis: Redis =
  globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// 初始化连接状态
if (globalForRedis.redisChecked === undefined) {
  globalForRedis.redisChecked = false;
}
if (globalForRedis.redisAvailable === undefined) {
  globalForRedis.redisAvailable = false;
}

/**
 * 检查 Redis 是否可用
 * 如果未被初始化过，尝试 ping 检测
 * @returns true 表示 Redis 可用，false 表示不可用（需降级处理）
 */
export async function isRedisAvailable(): Promise<boolean> {
  // 快速路径：已确认可用
  if (globalForRedis.redisAvailable) {
    return true;
  }

  // 如果还没确认过状态，尝试 ping
  if (!globalForRedis.redisChecked) {
    try {
      await redis.ping();
      globalForRedis.redisAvailable = true;
      globalForRedis.redisChecked = true;
      console.log("[Redis] ping 成功，标记为可用");
      return true;
    } catch {
      globalForRedis.redisAvailable = false;
      globalForRedis.redisChecked = true;
      console.warn("[Redis] ping 失败，将使用降级模式运行");
      return false;
    }
  }

  // 已确认不可用
  return false;
}

/**
 * 安全执行 Redis 操作，失败时返回默认值
 * @param fn 要执行的 Redis 异步函数
 * @param fallback 失败时的默认返回值
 */
export async function safeRedisOp<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    if (!(await isRedisAvailable())) {
      return fallback;
    }
    return await fn();
  } catch (error) {
    console.error("[Redis] 操作失败，使用降级方案:", error);
    return fallback;
  }
}

/**
 * 生成 Redis 键名前缀，用于命名空间隔离
 */
export function redisKey(...parts: string[]): string {
  return `ai_edu:${parts.join(":")}`;
}
