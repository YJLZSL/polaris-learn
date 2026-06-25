// AGPL-3.0
// 计费工具模块 - 费用估算、请求ID生成、用量日志记录、Redis余额管理

import { prisma } from "@/lib/prisma";
import { redis, isRedisAvailable, redisKey } from "@/lib/redis";
import crypto from "crypto";

// ========== 定价表 (CNY per token) ==========
// 格式: { provider: { model?: { input, output } } }
// 未匹配到的 model 使用 provider 级别的 default 定价
const PRICING: Record<string, Record<string, { input: number; output: number }>> = {
  deepseek: {
    default: { input: 0.000001, output: 0.000002 },
  },
  qwen: {
    default: { input: 0.000001, output: 0.000002 },
  },
  openai: {
    default: { input: 0.000015, output: 0.000060 },
    "gpt-4o": { input: 0.0000025, output: 0.000010 },
    "gpt-4o-mini": { input: 0.0000015, output: 0.0000060 },
  },
  ollama: {
    default: { input: 0, output: 0 },
  },
  custom: {
    default: { input: 0, output: 0 },
  },
};

/**
 * 根据 provider + model 估算费用 (CNY)
 * @param provider LLM 提供商名称 (deepseek/qwen/openai/ollama/custom)
 * @param model 模型名称
 * @param promptTokens 输入 token 数
 * @param completionTokens 输出 token 数
 * @returns 估算费用 (CNY)
 */
export function estimateCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const providerPricing = PRICING[provider];
  if (!providerPricing) {
    // 未知 provider，按 deepseek 最低价估算
    console.warn(`未知 provider: ${provider}，使用默认定价`);
    return promptTokens * 0.000001 + completionTokens * 0.000002;
  }

  const modelPricing = providerPricing[model] || providerPricing["default"];
  const cost =
    promptTokens * modelPricing.input +
    completionTokens * modelPricing.output;

  // 保留 6 位小数
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * 生成唯一的请求 ID (UUID v4)
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * 用量日志记录参数
 */
export interface RecordUsageLogParams {
  userId: string;
  apiKeyId?: string;
  provider: string;
  model: string;
  endpoint: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latencyMs?: number;
  statusCode?: number;
  clientIp?: string;
}

/**
 * 将 API 调用记录写入数据库
 */
export async function recordUsageLog(
  params: RecordUsageLogParams
): Promise<void> {
  try {
    await prisma.aPIUsageLog.create({
      data: {
        userId: params.userId,
        apiKeyId: params.apiKeyId || null,
        provider: params.provider,
        model: params.model,
        endpoint: params.endpoint,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.promptTokens + params.completionTokens,
        cost: params.cost,
        latencyMs: params.latencyMs || null,
        statusCode: params.statusCode || null,
        clientIp: params.clientIp || null,
        requestId: generateRequestId(),
      },
    });
  } catch (error) {
    // 用量日志记录失败不应阻塞主流程
    console.error("记录用量日志失败:", error);
  }
}

// ========== Redis 余额管理 ==========

/**
 * 余额扣减结果的返回值
 */
export interface DeductBalanceResult {
  success: boolean;
  balance: number;
  reason?: string;
}

/**
 * 生成用户余额的 Redis 键名
 */
function balanceKey(userId: string): string {
  return redisKey("balance", userId);
}

/**
 * 原子余额扣减 Lua 脚本
 * 
 * 返回值：
 *   {1, newBalance}  - 扣减成功
 *   {-1, balance}     - 余额不足（<=0）
 *   {-2, balance}     - 余额不足以支付本次费用
 */
const DEDUCT_BALANCE_SCRIPT = `
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
if balance <= 0 then
  return {-1, balance}
end
local cost = tonumber(ARGV[1])
local new_balance = balance - cost
if new_balance < 0 then
  return {-2, balance}
end
redis.call('SET', KEYS[1], new_balance)
return {1, new_balance}
`;

/**
 * 使用 Redis Lua 脚本原子扣减余额
 * 
 * 设计说明：
 * - 使用 Lua 脚本保证「读余额 -> 校验 -> 扣减」的原子性
 * - 如果 Redis 不可用，返回成功（降级模式，只能事后对账）
 * - 扣减成功后不会同步写回数据库（最终一致性，通过定时任务 syncBalanceToRedis 同步）
 * 
 * @param userId 用户 ID
 * @param amount 扣减金额
 * @returns 扣减结果，包含是否成功、当前余额、失败原因
 */
export async function deductBalance(
  userId: string,
  amount: number
): Promise<DeductBalanceResult> {
  // 扣减金额必须为正数
  if (amount <= 0) {
    return { success: false, balance: 0, reason: "扣减金额必须大于零" };
  }

  // 如果 Redis 不可用，降级处理：允许通过（需要事后对账）
  const available = await isRedisAvailable();
  if (!available) {
    console.warn(
      `[Billing] Redis 不可用，余额扣减跳过: userId=${userId}, amount=${amount}`
    );
    // 降级模式下尝试从数据库获取余额
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      const balance = Number(user?.balance ?? 0);
      if (balance <= 0) {
        return { success: false, balance, reason: "账户余额不足" };
      }
      if (balance < amount) {
        return { success: false, balance, reason: "余额不足以支付本次费用" };
      }
      return { success: true, balance: balance - amount };
    } catch {
      // 数据库也失败时返回成功，避免阻塞业务
      return { success: true, balance: 0, reason: "降级模式" };
    }
  }

  try {
    const key = balanceKey(userId);
    const result = (await redis.eval(
      DEDUCT_BALANCE_SCRIPT,
      1,
      key,
      amount.toString()
    )) as [number, number];

    const [code, balance] = result;

    switch (code) {
      case 1:
        return { success: true, balance };
      case -1:
        return {
          success: false,
          balance,
          reason: "账户余额不足",
        };
      case -2:
        return {
          success: false,
          balance,
          reason: "余额不足以支付本次费用",
        };
      default:
        return {
          success: false,
          balance,
          reason: "未知扣减状态",
        };
    }
  } catch (error) {
    console.error("[Billing] Redis 余额扣减异常:", error);
    // 异常时降级为数据库查询
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      const balance = Number(user?.balance ?? 0);
      if (balance <= 0) {
        return { success: false, balance, reason: "账户余额不足" };
      }
      if (balance < amount) {
        return { success: false, balance, reason: "余额不足以支付本次费用" };
      }
      return { success: true, balance: balance - amount };
    } catch (dbError) {
      console.error("[Billing] 数据库查询也失败:", dbError);
      return {
        success: false,
        balance: 0,
        reason: "服务暂时不可用，请稍后重试",
      };
    }
  }
}

/**
 * 将用户余额从数据库同步到 Redis
 * 在以下场景调用：
 * - 用户充值后
 * - 管理员手动调整余额后
 * - 定时任务定期同步（对账）
 * 
 * @param userId 用户 ID
 * @param balance 要同步的余额值。如果不传，则从数据库读取当前余额
 */
export async function syncBalanceToRedis(
  userId: string,
  balance?: number
): Promise<void> {
  const available = await isRedisAvailable();
  if (!available) {
    console.warn(`[Billing] Redis 不可用，跳过余额同步: userId=${userId}`);
    return;
  }

  try {
    let syncBalance = balance;
    if (syncBalance === undefined) {
      // 从数据库读取最新余额
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      syncBalance = Number(user?.balance ?? 0);
    }

    const key = balanceKey(userId);
    await redis.set(key, syncBalance.toString());
    console.log(
      `[Billing] 余额同步成功: userId=${userId}, balance=${syncBalance}`
    );
  } catch (error) {
    console.error(`[Billing] 余额同步失败: userId=${userId}`, error);
    // 同步失败不抛异常，不能阻塞业务
  }
}

/**
 * 获取用户余额
 * 优先从 Redis 读取（高性能），Redis 不可用时降级到数据库
 * 
 * @param userId 用户 ID
 * @returns 用户当前余额
 */
export async function getBalance(userId: string): Promise<number> {
  // 优先读取 Redis
  const available = await isRedisAvailable();
  if (available) {
    try {
      const key = balanceKey(userId);
      const cached = await redis.get(key);
      if (cached !== null) {
        return parseFloat(cached);
      }
    } catch (error) {
      console.error(`[Billing] Redis 读取余额失败: userId=${userId}`, error);
    }
  }

  // 降级到数据库
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    const balance = Number(user?.balance ?? 0);

    // 如果 Redis 可用但缓存未命中，回写缓存
    if (available) {
      try {
        await redis.set(balanceKey(userId), balance.toString());
      } catch {
        // 回写失败不影响结果返回
      }
    }

    return balance;
  } catch (error) {
    console.error(`[Billing] 数据库读取余额失败: userId=${userId}`, error);
    return 0;
  }
}
