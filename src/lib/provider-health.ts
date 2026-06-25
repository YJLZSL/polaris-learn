// AGPL-3.0
// Provider 健康检查模块 - 检测各 LLM Provider 的可用性，支持故障转移

import { redis, isRedisAvailable, redisKey } from "@/lib/redis";
import type { LLMProvider } from "@/lib/llm-adapter";

// 故障转移链：deepseek → qwen → openai → ollama
const FAILOVER_CHAIN: LLMProvider[] = ["deepseek", "qwen", "openai", "ollama"];

// 健康状态 TTL（秒）
const HEALTH_TTL = 60;

// Provider 端点与 API Key 的映射
const PROVIDER_ENV_MAP: Record<
  LLMProvider,
  { baseUrlEnv: string; apiKeyEnv: string; healthEndpoint: string }
> = {
  deepseek: {
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    healthEndpoint: "/models",
  },
  qwen: {
    baseUrlEnv: "QWEN_BASE_URL",
    apiKeyEnv: "QWEN_API_KEY",
    healthEndpoint: "/models",
  },
  openai: {
    baseUrlEnv: "OPENAI_BASE_URL",
    apiKeyEnv: "OPENAI_API_KEY",
    healthEndpoint: "/models",
  },
  ollama: {
    baseUrlEnv: "OLLAMA_BASE_URL",
    apiKeyEnv: "", // Ollama 无需 API Key
    healthEndpoint: "/api/tags",
  },
  custom: {
    baseUrlEnv: "CUSTOM_BASE_URL",
    apiKeyEnv: "CUSTOM_API_KEY",
    healthEndpoint: "/models",
  },
};

/**
 * 生成 Provider 健康状态的 Redis 键名
 */
function healthKey(providerName: string): string {
  return redisKey("provider_health", providerName);
}

/**
 * 检查单个 Provider 是否健康
 * 
 * 实现方式：向 Provider 的轻量级端点（/models 或 /api/tags）发起带超时的 GET 请求。
 * 如果返回 2xx 状态码，则认为 Provider 健康。
 * 
 * 结果缓存策略：健康状态写入 Redis 并设置 60 秒 TTL。后续查询优先读缓存。
 * 
 * @param providerName - LLM Provider 名称 (deepseek/qwen/openai/ollama/custom)
 * @param forceCheck  - 是否跳过缓存，强制执行实时检查
 * @returns true 表示 Provider 可用，false 表示不可用
 */
export async function checkProviderHealth(
  providerName: string,
  forceCheck = false
): Promise<boolean> {
  const redisAvailable = await isRedisAvailable();

  // 如果有 Redis 且不强制刷新，先读缓存
  if (redisAvailable && !forceCheck) {
    try {
      const cached = await redis.get(healthKey(providerName));
      if (cached !== null) {
        return cached === "1";
      }
    } catch {
      // 缓存读取失败，继续实时检查
    }
  }

  // 实时健康检查
  const isHealthy = await performHealthCheck(providerName);

  // 缓存结果（60 秒 TTL）
  if (redisAvailable) {
    try {
      await redis.set(healthKey(providerName), isHealthy ? "1" : "0", "EX", HEALTH_TTL);
    } catch {
      // 缓存写入失败不影响主流程
    }
  }

  return isHealthy;
}

/**
 * 执行实际的健康检查请求
 */
async function performHealthCheck(providerName: string): Promise<boolean> {
  const config = PROVIDER_ENV_MAP[providerName as LLMProvider];
  if (!config) {
    console.warn(`[ProviderHealth] 未知 provider: ${providerName}`);
    return false;
  }

  const baseUrl = process.env[config.baseUrlEnv] || "";
  if (!baseUrl) {
    // 未配置端点，视为不可用
    return false;
  }

  // Ollama 无需 API Key
  if (providerName !== "ollama") {
    const apiKey = process.env[config.apiKeyEnv] || "";
    if (!apiKey) {
      // 未配置 API Key，视为不可用
      return false;
    }
  }

  try {
    const url = `${baseUrl.replace(/\/$/, "")}${config.healthEndpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (providerName !== "ollama") {
      const apiKey = process.env[config.apiKeyEnv] || "";
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000), // 5 秒超时
    });

    const healthy = response.ok;
    if (!healthy) {
      console.warn(
        `[ProviderHealth] ${providerName} 健康检查返回非 2xx: ${response.status}`
      );
    }
    return healthy;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[ProviderHealth] ${providerName} 健康检查失败: ${msg}`);
    return false;
  }
}

/**
 * 获取所有健康 Provider 的列表
 * 
 * 检查 failover chain 中的所有 Provider，返回当前健康的。
 * 如果 Redis 不可用，假定所有 Provider 都是健康的（避免误判阻塞业务）。
 * 
 * @returns 健康 Provider 名称数组
 */
export async function getHealthyProviders(): Promise<string[]> {
  const redisAvailable = await isRedisAvailable();

  // Redis 不可用时，假定所有 Provider 都健康（降级策略）
  if (!redisAvailable) {
    // 只返回已配置了 API Key 或端点的 Provider
    const configured: string[] = [];
    for (const provider of FAILOVER_CHAIN) {
      const cfg = PROVIDER_ENV_MAP[provider];
      const baseUrl = process.env[cfg.baseUrlEnv] || "";
      if (baseUrl) {
        if (provider === "ollama") {
          configured.push(provider);
        } else if (process.env[cfg.apiKeyEnv]) {
          configured.push(provider);
        }
      }
    }
    return configured;
  }

  // 从 Redis 批量读取健康状态
  const healthyProviders: string[] = [];
  const pipeline = redis.pipeline();

  for (const provider of FAILOVER_CHAIN) {
    pipeline.get(healthKey(provider));
  }

  try {
    const results = await pipeline.exec();
    if (!results) {
      // pipeline 返回 null，回退到实时检查
      return await checkAllProvidersLive();
    }

    for (let i = 0; i < FAILOVER_CHAIN.length; i++) {
      const provider = FAILOVER_CHAIN[i];
      const [err, cached] = results[i] || [];

      if (err || cached === null) {
        // 缓存未命中或读取错误，执行实时检查
        const isHealthy = await checkProviderHealth(provider);
        if (isHealthy) healthyProviders.push(provider);
      } else if (cached === "1") {
        healthyProviders.push(provider);
      }
      // cached === "0" 表示不健康，跳过
    }
  } catch {
    // pipeline 失败，回退到全员实时检查
    return await checkAllProvidersLive();
  }

  return healthyProviders;
}

/**
 * 回退方案：对所有 Provider 执行实时健康检查
 */
async function checkAllProvidersLive(): Promise<string[]> {
  const results: string[] = [];
  const checks = FAILOVER_CHAIN.map(async (provider) => {
    const healthy = await checkProviderHealth(provider, true);
    if (healthy) results.push(provider);
  });
  await Promise.allSettled(checks);
  return results;
}

/**
 * 获取故障转移的备用 Provider
 * 
 * 按 failover chain 顺序查找下一个健康的 Provider。
 * 如果没有任何健康的 Provider 可用，返回 null。
 * 
 * @param failedProvider - 当前失败的 Provider 名称
 * @returns 下一个可用的 Provider 名称，或 null
 */
export async function getFailoverProvider(
  failedProvider: string
): Promise<string | null> {
  const failedIndex = FAILOVER_CHAIN.indexOf(failedProvider as LLMProvider);
  if (failedIndex === -1) {
    // 不在核心链中的 provider（如 custom），默认尝试 deepseek
    const healthy = await checkProviderHealth("deepseek");
    return healthy ? "deepseek" : null;
  }

  // 从失败 Provider 之后开始查找
  for (let i = failedIndex + 1; i < FAILOVER_CHAIN.length; i++) {
    const candidate = FAILOVER_CHAIN[i];
    const healthy = await checkProviderHealth(candidate);
    if (healthy) return candidate;
  }

  // 也可以尝试环绕查找（从链的开头到失败位置之前）
  for (let i = 0; i < failedIndex; i++) {
    const candidate = FAILOVER_CHAIN[i];
    const healthy = await checkProviderHealth(candidate);
    if (healthy) return candidate;
  }

  return null;
}

/**
 * 手动标记 Provider 为不健康
 * 用于在检测到连续失败后主动熔断
 * 
 * @param providerName - Provider 名称
 * @param ttlSeconds - 不健康状态持续时间（默认 120 秒）
 */
export async function markProviderUnhealthy(
  providerName: string,
  ttlSeconds = 120
): Promise<void> {
  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) return;

  try {
    await redis.set(healthKey(providerName), "0", "EX", ttlSeconds);
    console.warn(
      `[ProviderHealth] ${providerName} 被标记为不健康，持续 ${ttlSeconds}s`
    );
  } catch (error) {
    console.error(`[ProviderHealth] 标记 ${providerName} 不健康失败:`, error);
  }
}

/**
 * 获取所有 Provider 的健康状态概览
 * 用于管理后台展示
 * 
 * @returns Provider 健康状态列表
 */
export async function getProviderHealthSummary(): Promise<
  Array<{ provider: string; healthy: boolean; lastCheck: number | null }>
> {
  const summary: Array<{
    provider: string;
    healthy: boolean;
    lastCheck: number | null;
  }> = [];

  const redisAvailable = await isRedisAvailable();

  for (const provider of FAILOVER_CHAIN) {
    let healthy = true;
    let lastCheck: number | null = null;

    if (redisAvailable) {
      try {
        const cached = await redis.get(healthKey(provider));
        healthy = cached === null ? true : cached === "1";

        // 读取 TTL 来推算上次检查时间
        const ttl = await redis.ttl(healthKey(provider));
        if (ttl > 0) {
          lastCheck = Date.now() - (HEALTH_TTL - ttl) * 1000;
        }
      } catch {
        // 忽略
      }
    }

    summary.push({ provider, healthy, lastCheck });
  }

  return summary;
}
