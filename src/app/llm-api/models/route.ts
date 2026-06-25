// AGPL-3.0
// 公开 LLM API - 列出可用模型（仅返回健康 Provider 的模型）

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHealthyProviders, getProviderHealthSummary } from "@/lib/provider-health";

// 定价表 (CNY per token) —— 与 lib/billing.ts 保持一致
const PRICING: Record<string, Record<string, { input: number; output: number }>> = {
  deepseek: {
    "deepseek-chat": { input: 0.000001, output: 0.000002 },
    "deepseek-reasoner": { input: 0.000004, output: 0.000016 },
    default: { input: 0.000001, output: 0.000002 },
  },
  qwen: {
    "qwen-turbo": { input: 0.0000003, output: 0.0000006 },
    "qwen-plus": { input: 0.0000008, output: 0.000002 },
    "qwen-max": { input: 0.000002, output: 0.000006 },
    default: { input: 0.000001, output: 0.000002 },
  },
  openai: {
    "gpt-4o": { input: 0.0000025, output: 0.000010 },
    "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
    "gpt-3.5-turbo": { input: 0.0000005, output: 0.0000015 },
    default: { input: 0.000015, output: 0.000060 },
  },
  ollama: {
    default: { input: 0, output: 0 },
  },
  custom: {
    default: { input: 0, output: 0 },
  },
};

/**
 * 获取 Provider 的默认模型列表（如果数据库中没有配置 models）
 */
function getDefaultModels(providerName: string): string[] {
  const defaults: Record<string, string[]> = {
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
    qwen: ["qwen-turbo", "qwen-plus", "qwen-max"],
    openai: ["gpt-4o-mini", "gpt-4o"],
    ollama: ["qwen2.5:7b", "llama3:8b"],
    custom: [],
  };
  return defaults[providerName] || [];
}

/**
 * 获取模型的定价信息
 */
function resolvePricing(
  providerName: string,
  modelName: string
): { input: number; output: number } {
  const providerPricing = PRICING[providerName];
  if (!providerPricing) {
    return { input: 0.000001, output: 0.000002 };
  }
  return providerPricing[modelName] || providerPricing["default"];
}

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  pricing: {
    input: number;
    output: number;
  };
}

/**
 * GET /llm-api/models
 * 列出所有健康 Provider 提供的可用模型（无需认证）
 * 过滤掉不健康的 Provider，确保返回的模型均可正常调用
 */
export async function GET() {
  try {
    // 获取健康 Provider 列表
    const healthyProviders = await getHealthyProviders();
    const healthySet = new Set(healthyProviders);

    // 获取健康状态概览（用于响应中附加元信息）
    const _healthSummary = await getProviderHealthSummary();

    // 获取所有活跃的 Provider（数据库）
    const dbProviders = await prisma.aPIProvider.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        config: true,
      },
    });

    if (dbProviders.length === 0) {
      return NextResponse.json({
        models: [],
        healthy_providers: healthyProviders,
        message: "暂无可用模型",
      });
    }

    const models: ModelInfo[] = [];

    for (const provider of dbProviders) {
      const providerName = provider.name;

      // 只返回健康的 Provider 的模型
      if (!healthySet.has(providerName)) {
        continue;
      }

      const config = JSON.parse(provider.config || "{}");
      const providerModels: (string | { name: string; id: string })[] =
        config.models || [];

      if (providerModels.length > 0) {
        for (const model of providerModels) {
          const modelName =
            typeof model === "string" ? model : model.name || model.id;
          if (!modelName) continue;

          const pricing = resolvePricing(providerName, modelName);

          models.push({
            id: `${providerName}/${modelName}`,
            provider: providerName,
            name: modelName,
            pricing: {
              input: pricing.input,
              output: pricing.output,
            },
          });
        }
      } else {
        // 数据库未配置模型列表，使用默认值
        const fallbackModels = getDefaultModels(providerName);
        for (const modelName of fallbackModels) {
          const pricing = resolvePricing(providerName, modelName);

          models.push({
            id: `${providerName}/${modelName}`,
            provider: providerName,
            name: modelName,
            pricing: {
              input: pricing.input,
              output: pricing.output,
            },
          });
        }
      }
    }

    return NextResponse.json({
      models,
      healthy_providers: healthyProviders,
      ...(models.length === 0 && {
        note: "当前所有 Provider 均已配置但不可用，请检查 API Key 或网络连接",
      }),
    });
  } catch (error) {
    console.error("获取可用模型列表失败:", error);
    return NextResponse.json(
      { error: "获取模型列表失败" },
      { status: 500 }
    );
  }
}
