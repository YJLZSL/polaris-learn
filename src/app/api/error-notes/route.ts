import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 获取用户错题本列表
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject"); // 学科筛选，为空则全部
    const status = searchParams.get("status") as "active" | "eliminated" | null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 50);
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Record<string, unknown> = { userId };
    if (status && (status === "active" || status === "eliminated")) {
      where.status = status;
    }

    // 如果指定了学科，需要通过关联的 question 筛选
    if (subject) {
      where.question = { subject };
    }

    const [errorNotes, total] = await Promise.all([
      prisma.errorNote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          question: {
            select: {
              id: true,
              content: true,
              subject: true,
              type: true,
              difficulty: true,
              options: true,
              answer: true,
              explanation: true,
            },
          },
        },
      }),
      prisma.errorNote.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // 格式化返回数据
    const formattedErrorNotes = errorNotes.map((en) => ({
      id: en.id,
      question: {
        id: en.question.id,
        content: en.question.content,
        subject: en.question.subject,
        type: en.question.type,
        difficulty: en.question.difficulty,
        options: en.question.options ? JSON.parse(en.question.options) : [],
        answer: en.question.answer,
        explanation: en.question.explanation,
      },
      wrongAnswer: en.wrongAnswer,
      errorType: en.errorType,
      status: en.status,
      correctCount: en.correctCount,
      createdAt: en.createdAt,
      nextReviewAt: en.nextReviewAt,
    }));

    return NextResponse.json({
      errorNotes: formattedErrorNotes,
      total,
      page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error("获取错题列表失败:", error);
    return NextResponse.json({ error: "获取错题列表失败" }, { status: 500 });
  }
}
