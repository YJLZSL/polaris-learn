// AGPL-3.0
// 公开 LLM API - Chat Completions (OpenAI-compatible)
// 认证：X-API-Key header 或 Authorization: Bearer header
// 支持 Provider 健康检查 + 故障转移 + 余额扣减计费

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import {
  chatWithLLM,
  streamChatWithLLM,
} from "@/lib/llm-adapter";
import type { ChatMessage } from "@/lib/llm-adapter";
import { estimateCost, recordUsageLog, generateRequestId, deductBalance, getBalance } from "@/lib/billing";
import {
  checkProviderHealth,
  getFailoverProvider,
  markProviderUnhealthy,
} from "@/lib/provider-health";

// ========== 常量 ==========

// 单次请求最大费用估算上限（CNY），防止异常大额扣费
const MAX_COST_ESTIMATE = 1.0;

/**
 * 从请求 Header 中提取 API Key
 * 支持两种方式：
 *   1. X-API-Key: sk-xxx
 *   2. Authorization: Bearer sk-xxx
 */
function extractApiKey(request: Request): string | null {
  // 优先 X-API-Key
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey && xApiKey.trim().length > 0) {
    return xApiKey.trim();
  }

  // 其次 Authorization Bearer
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * 从请求 Header 中认证 API Key 并返回用户信息
 * 同时校验密钥状态和用户余额
 */
async function authenticateApiKey(
  request: Request
): Promise<{ userId: string; apiKeyId: string; error?: NextResponse }> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return {
      userId: "",
      apiKeyId: "",
      error: NextResponse.json(
        {
          error: {
            message:
              "Missing API key. Provide your key via X-API-Key header or Authorization: Bearer <key>.",
            type: "unauthorized",
            code: 401,
          },
        },
        { status: 401 }
      ),
    };
  }

  // 对 API Key 做 SHA-256 哈希
  const keyHash = crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");

  // 查询数据库：验证密钥 + 获取关联用户
  const virtualKey = await prisma.virtualAPIKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: { id: true, balance: true },
      },
    },
  });

  if (!virtualKey || virtualKey.status !== "active") {
    return {
      userId: "",
      apiKeyId: "",
      error: NextResponse.json(
        {
          error: {
            message: "Invalid or revoked API key.",
            type: "invalid_api_key",
            code: 401,
          },
        },
        { status: 401 }
      ),
    };
  }

  // 更新最后使用时间（异步，不阻塞响应）
  prisma.virtualAPIKey
    .update({
      where: { id: virtualKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // 更新失败不影响主流程
    });

  return { userId: virtualKey.userId, apiKeyId: virtualKey.id };
}

/**
 * 检查用户余额是否足够
 * @returns 余额充足则返回 null，否则返回 402 错误响应
 */
async function checkUserBalance(
  userId: string
): Promise<NextResponse | null> {
  const balance = await getBalance(userId);

  if (balance <= 0) {
    return NextResponse.json(
      {
        error: {
          message: "Insufficient balance. Please top up your account.",
          type: "payment_required",
          code: 402,
          balance: 0,
        },
      },
      { status: 402 }
    );
  }

  return null;
}

/**
 * 从 model 参数中解析 provider 和 modelName
 * 格式: "provider/modelName" 或 "modelName"（默认使用 deepseek）
 */
function parseModel(fullModel: string): {
  provider: string;
  modelName: string;
} {
  if (fullModel.includes("/")) {
    const parts = fullModel.split("/");
    return {
      provider: parts[0],
      modelName: parts.slice(1).join("/"),
    };
  }
  // 未指定 provider，默认为环境变量配置的 provider 或 deepseek
  return {
    provider: process.env.LLM_PROVIDER || "deepseek",
    modelName: fullModel,
  };
}

/**
 * POST /llm-api/chat
 * OpenAI-compatible Chat Completions endpoint
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  let _statusCode = 200;
  let promptTokens = 0;
  let completionTokens = 0;
  let userId = "";
  let apiKeyId = "";
  let provider = "deepseek";
  let modelName = "";
  let finalCost = 0;

  try {
    // Step 1: 认证
    const auth = await authenticateApiKey(request);
    if (auth.error) return auth.error;
    userId = auth.userId;
    apiKeyId = auth.apiKeyId;

    // Step 2: 余额检查（预检查，余额 <= 0 直接返回 402）
    const balanceError = await checkUserBalance(userId);
    if (balanceError) return balanceError;

    // Step 3: 解析请求体
    const body = await request.json();
    const { model, messages, stream, temperature, max_tokens } = body;

    // 参数校验
    if (!model || typeof model !== "string") {
      return NextResponse.json(
        {
          error: {
            message: "model is required",
            type: "invalid_request_error",
            code: 400,
          },
        },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: "messages is required and must be a non-empty array",
            type: "invalid_request_error",
            code: 400,
          },
        },
        { status: 400 }
      );
    }

    // 验证消息格式
    for (const msg of messages) {
      if (
        !msg.role ||
        !["system", "user", "assistant", "function", "tool"].includes(msg.role)
      ) {
        return NextResponse.json(
          {
            error: {
              message: `Invalid role: ${msg.role}`,
              type: "invalid_request_error",
              code: 400,
            },
          },
          { status: 400 }
        );
      }
      if (typeof msg.content !== "string") {
        return NextResponse.json(
          {
            error: {
              message: "content must be a string",
              type: "invalid_request_error",
              code: 400,
            },
          },
          { status: 400 }
        );
      }
    }

    // Step 4: 解析模型选择，确定 Provider
    const parsed = parseModel(model);
    provider = parsed.provider;
    modelName = parsed.modelName;

    // Step 5: Provider 健康检查 + 故障转移
    const isHealthy = await checkProviderHealth(provider);
    if (!isHealthy) {
      console.warn(
        `[LLM-API] Provider ${provider} 不健康，尝试故障转移...`
      );
      const failover = await getFailoverProvider(provider);
      if (!failover) {
        _statusCode = 503;
        return NextResponse.json(
          {
            error: {
              message: `Provider "${provider}" is unavailable and no failover provider is available.`,
              type: "service_unavailable",
              code: 503,
            },
          },
          { status: 503 }
        );
      }
      console.log(`[LLM-API] 故障转移: ${provider} -> ${failover}`);
      provider = failover;
      // 故障转移时 modelName 保持不变，由 getLLMConfig 根据新 provider 的默认配置自动选择
    }

    // Step 6: 构建 LLM 配置
    const configOverrides: Partial<{
      provider: string;
      model: string;
      temperature: number;
      maxTokens: number;
    }> = {
      provider: provider as never,
      model: modelName,
    };

    if (temperature !== undefined && typeof temperature === "number") {
      configOverrides.temperature = Math.min(Math.max(temperature, 0), 2);
    }
    if (max_tokens !== undefined && typeof max_tokens === "number") {
      configOverrides.maxTokens = Math.min(Math.max(max_tokens, 1), 16384);
    }

    const requestId = generateRequestId();
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    // Step 7: 流式响应分支
    if (stream) {
      return handleStreamResponse(
        requestId,
        modelName,
        provider,
        messages as ChatMessage[],
        configOverrides,
        { userId, apiKeyId, clientIp, startTime }
      );
    }

    // Step 8: 非流式响应 —— 调用 LLM
    const chatMessages: ChatMessage[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as ChatMessage["role"],
        content: m.content,
      })
    );

    let response;
    try {
      response = await chatWithLLM(chatMessages, configOverrides as never);
    } catch (llmError) {
      console.error(
        `[LLM-API] Provider ${provider} 调用失败:`,
        llmError
      );

      // 尝试故障转移
      const failover = await getFailoverProvider(provider);
      if (failover) {
        console.log(`[LLM-API] 调用失败后故障转移: ${provider} -> ${failover}`);
        // 标记原 provider 为不健康（熔断 120 秒）
        await markProviderUnhealthy(provider, 120).catch(() => {});

        provider = failover;
        configOverrides.provider = failover as never;

        try {
          response = await chatWithLLM(chatMessages, configOverrides as never);
        } catch (retryError) {
          const msg =
            retryError instanceof Error ? retryError.message : "LLM call failed";
          // 不外泄真实 Provider API Key
          throw new Error(`LLM call failed after failover: ${msg}`);
        }
      } else {
        const msg =
          llmError instanceof Error ? llmError.message : "LLM call failed";
        // 保证错误消息中不包含真实 API Key
        throw new Error(`LLM call failed: ${msg}`);
      }
    }

    // Step 9: 计费处理
    promptTokens = response.usage?.promptTokens || 0;
    completionTokens = response.usage?.completionTokens || 0;
    finalCost = estimateCost(provider, modelName, promptTokens, completionTokens);

    // 费用上限保护
    if (finalCost > MAX_COST_ESTIMATE) {
      console.warn(
        `[LLM-API] 费用异常 (${finalCost} CNY)，截断至上限 ${MAX_COST_ESTIMATE} CNY`
      );
      finalCost = MAX_COST_ESTIMATE;
    }

    const latencyMs = Date.now() - startTime;

    // Step 10: 余额扣减 + 用量记录（异步并发，不阻塞响应）
    Promise.allSettled([
      // 扣减余额
      finalCost > 0
        ? deductBalance(userId, finalCost).then((result) => {
            if (!result.success) {
              console.warn(
                `[LLM-API] 余额扣减失败: userId=${userId}, reason=${result.reason}`
              );
            }
          })
        : Promise.resolve(),
      // 记录用量日志
      recordUsageLog({
        userId,
        apiKeyId,
        provider,
        model: modelName,
        endpoint: "/llm-api/chat",
        promptTokens,
        completionTokens,
        cost: finalCost,
        latencyMs,
        statusCode: 200,
        clientIp,
      }),
    ]).catch((err) => console.error("计费后处理失败:", err));

    // Step 11: OpenAI-compatible 格式响应
    return NextResponse.json({
      id: `chatcmpl-${requestId.substring(0, 29)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: `${provider}/${modelName}`,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: response.content,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error("[LLM-API] Chat 处理失败:", error);

    // 错误消息中绝不包含真实 Provider API Key
    const safeErrorMessage =
      error instanceof Error
        ? error.message.replace(
            /(sk-[a-zA-Z0-9]+)/g,
            "***REDACTED***"
          )
        : "Internal server error";

    // 尝试记录失败日志
    try {
      await recordUsageLog({
        userId: userId || "unknown",
        apiKeyId: apiKeyId || undefined,
        provider,
        model: modelName || "unknown",
        endpoint: "/llm-api/chat",
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
        latencyMs,
        statusCode: 500,
        clientIp:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          undefined,
      }).catch(() => {});
    } catch {
      // 日志记录失败不影响主流程
    }

    _statusCode = 500;
    return NextResponse.json(
      {
        error: {
          message: safeErrorMessage,
          type: "server_error",
          code: 500,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 处理流式响应 (SSE)
 */
async function handleStreamResponse(
  requestId: string,
  modelName: string,
  provider: string,
  messages: ChatMessage[],
  configOverrides: Record<string, unknown>,
  meta: {
    userId: string;
    apiKeyId: string;
    clientIp?: string;
    startTime: number;
  }
): Promise<Response> {
  let _completionContent = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let streamError = false;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChatWithLLM(
          messages,
          configOverrides as never
        )) {
          _completionContent += chunk;
          completionTokens++;

          // SSE 格式
          const sseData = JSON.stringify({
            id: `chatcmpl-${requestId.substring(0, 29)}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: `${provider}/${modelName}`,
            choices: [
              {
                index: 0,
                delta: { content: chunk },
                finish_reason: null,
              },
            ],
          });

          controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
        }

        // 发送结束标记
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        streamError = true;
        console.error("[LLM-API] 流式响应处理失败:", error);
        const errorMsg =
          error instanceof Error ? error.message : "Stream error";
        const safeMsg = errorMsg.replace(
          /(sk-[a-zA-Z0-9]+)/g,
          "***REDACTED***"
        );
        const errorData = JSON.stringify({
          error: {
            message: safeMsg,
            type: "server_error",
            code: 500,
          },
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } finally {
        // 流结束后进行计费处理
        promptTokens = Math.ceil(JSON.stringify(messages).length / 3.5);
        const cost = estimateCost(
          provider,
          modelName,
          promptTokens,
          completionTokens
        );
        const latencyMs = Date.now() - meta.startTime;

        // 异步扣减余额 + 记录用量
        Promise.allSettled([
          cost > 0 && !streamError
            ? deductBalance(meta.userId, cost).then((result) => {
                if (!result.success) {
                  console.warn(
                    `[LLM-API] 流式余额扣减失败: userId=${meta.userId}, reason=${result.reason}`
                  );
                }
              })
            : Promise.resolve(),
          recordUsageLog({
            userId: meta.userId,
            apiKeyId: meta.apiKeyId,
            provider,
            model: modelName,
            endpoint: "/llm-api/chat",
            promptTokens,
            completionTokens,
            cost,
            latencyMs,
            statusCode: streamError ? 500 : 200,
            clientIp: meta.clientIp,
          }),
        ]).catch((err) => console.error("流式计费后处理失败:", err));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Request-Id": requestId,
    },
  });
}
