import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkInputSafety } from "@/lib/safety";
import {
  hasAPIKey,
  chatWithLLM,
  buildSocraticSystemPrompt,
  getFallbackResponse,
  getLLMConfig,
} from "@/lib/llm-adapter";
import type { ChatMessage } from "@/lib/llm-adapter";

/** 苏格拉底式教学的阶段名称列表，用于从 AI 响应中提取 stage */
const SOCRATIC_STAGES = [
  "diagnostic",
  "clarification",
  "hypothesis",
  "reasoning",
  "reflection",
  "verification",
];

/**
 * 从 AI 响应内容中提取当前的苏格拉底阶段。
 * 通过关键词匹配识别阶段，若无法识别则返回 "guide"。
 */
function extractStage(content: string): string {
  const lowered = content.toLowerCase();
  for (const stage of SOCRATIC_STAGES) {
    if (lowered.includes(stage)) return stage;
  }
  return "guide";
}

/**
 * 从 AI 响应内容中判断学生答案是否正确。
 * 通过识别肯定性词汇做简单启发式判断。
 */
function detectCorrectness(content: string): boolean | undefined {
  if (/正确|很好|太棒|非常棒|没错|答对|完全正确|理解到位/.test(content)) return true;
  if (/不对|不正确|再想想|不太对|有问题|错误/.test(content)) return false;
  return undefined;
}

export async function POST(request: Request) {
  try {
    // 身份验证
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { conversationId, subject, message } = body;

    // 参数校验
    if (!subject || typeof subject !== "string") {
      return NextResponse.json({ error: "请指定学科" }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    // 安全检查
    const safetyResult = checkInputSafety(message.trim());
    if (!safetyResult.safe) {
      // 记录安全事件
      if (safetyResult.severity === "critical" || safetyResult.severity === "high") {
        await prisma.safetyIncident.create({
          data: {
            userId,
            type: safetyResult.reason || "safety_check",
            severity: safetyResult.severity,
            content: message.trim(),
            action: safetyResult.action || "blocked",
          },
        });
      }

      // 返回安全拒绝响应
      return NextResponse.json({
        response: safetyResult.response || "消息包含不当内容，请重新输入。",
        stage: "diagnostic",
        conversationId: conversationId || null,
        safe: false,
        reason: safetyResult.reason,
      });
    }

    // 获取或创建对话
    let conversation;
    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: "对话不存在" }, { status: 404 });
      }
    }

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          subject,
          title: `${subject} 学习对话`,
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });
    }

    // 确定当前阶段：取最近一条 AI 消息的 socraticStage，默认 diagnostic
    const lastAiMessage = conversation.messages?.find(
      (m: Record<string, unknown>) => m.role === "assistant"
    ) as Record<string, unknown> | undefined;
    const currentStage = (lastAiMessage?.socraticStage as string) || "diagnostic";

    // 保存用户消息
    await prisma.aIDialogueMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message.trim(),
        messageType: "text",
      },
    });

    // ---- 构建 LLM 对话消息 ----
    const systemPrompt = buildSocraticSystemPrompt({
      grade: (session.user as Record<string, unknown>).grade as string | undefined,
      subject,
    });

    const existingMessages: ChatMessage[] = (conversation.messages || [])
      .slice()
      .reverse() // prisma 返回 desc，反转为时间升序
      .map((m: Record<string, unknown>) => ({
        role: m.role as ChatMessage["role"],
        content: m.content as string,
      }));

    const conversationHistory: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...existingMessages,
      { role: "user", content: message.trim() },
    ];

    // ---- 调用 LLM 或降级 ----
    let aiContent: string;
    let aiStage: string;
    let isCorrect: boolean | undefined;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      if (hasAPIKey()) {
        // 调用真实大模型
        const aiResponse = await chatWithLLM(conversationHistory);
        aiContent = aiResponse.content;
        aiStage = extractStage(aiContent);
        isCorrect = detectCorrectness(aiContent);

        // 提取 token 用量（仅用于响应元数据）
        promptTokens = aiResponse.usage?.promptTokens || 0;
        completionTokens = aiResponse.usage?.completionTokens || 0;
      } else {
        // 无 API Key 时使用本地降级响应
        aiContent = getFallbackResponse(subject, currentStage, message.trim());
        aiStage = currentStage;
        isCorrect = undefined;
      }
    } catch (llmError) {
      console.error("LLM 调用失败，使用降级响应:", llmError);
      aiContent = getFallbackResponse(subject, currentStage, message.trim());
      aiStage = currentStage;
      isCorrect = undefined;
    }

    // 运行输出安全检查
    const { checkOutputSafety } = await import("@/lib/safety");
    const outputCheck = checkOutputSafety(aiContent);
    const finalContent = outputCheck.safe
      ? aiContent
      : "你的问题我收到了，让我们继续专注于学习吧！有什么题目需要我帮忙分析吗？";

    // 获取活跃的 LLM 配置信息（用于响应元数据）
    const llmConfig = getLLMConfig();

    // 保存 AI 响应
    await prisma.aIDialogueMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: finalContent,
        messageType: "text",
        socraticStage: aiStage,
        metadata: JSON.stringify({ isCorrect: isCorrect || false }),
      },
    });

    // 更新对话时间
    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      response: finalContent,
      stage: aiStage,
      conversationId: conversation.id,
      isCorrect: isCorrect || false,
      safe: true,
      model: {
        provider: llmConfig.provider,
        model: llmConfig.model,
      },
      usage: {
        promptTokens,
        completionTokens,
      },
    });
  } catch (error) {
    console.error("AI对话处理失败:", error);
    return NextResponse.json({ error: "对话处理失败，请稍后重试" }, { status: 500 });
  }
}
