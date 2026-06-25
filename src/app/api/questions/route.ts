import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 获取题目列表（支持分页和筛选，学生端不返回答案）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const difficulty = searchParams.get("difficulty");
    const gradeLevel = searchParams.get("gradeLevel");
    const type = searchParams.get("type");
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10"), 1), 100);
    const offset = (page - 1) * limit;

    // 保留 offset 参数向后兼容
    const offsetParam = searchParams.get("offset");
    const skip = offsetParam !== null ? parseInt(offsetParam) : offset;
    const take = offsetParam !== null
      ? Math.min(parseInt(searchParams.get("limit") || "20"), 100)
      : limit;

    const where: Record<string, unknown> = {};
    if (subject) where.subject = subject;
    if (difficulty) where.difficulty = parseInt(difficulty);
    if (gradeLevel) where.gradeLevel = gradeLevel;
    if (type) where.type = type;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          knowledge: {
            include: {
              knowledgePoint: {
                select: { id: true, name: true, subject: true },
              },
            },
          },
          _count: {
            select: { errorNotes: true },
          },
        },
      }),
      prisma.question.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // 解析 JSON 字段并格式化返回，排除 answer 字段（学生端不应看到答案）
    const formattedQuestions = questions.map((q: typeof questions[number]) => ({
      id: q.id,
      subject: q.subject,
      type: q.type,
      difficulty: q.difficulty,
      content: q.content,
      options: JSON.parse(q.options),
      explanation: q.explanation,
      source: q.source,
      gradeLevel: q.gradeLevel,
      knowledgePoints: q.knowledge.map((k: typeof q.knowledge[number]) => k.knowledgePoint),
      errorNoteCount: q._count.errorNotes,
      createdAt: q.createdAt,
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("获取题目列表失败:", error);
    return NextResponse.json({ error: "获取题目列表失败" }, { status: 500 });
  }
}

// POST: 受保护，添加新题目（内容管理）
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // 仅管理员和教师可添加题目
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "admin" && userRole !== "teacher") {
      return NextResponse.json({ error: "无权限执行此操作" }, { status: 403 });
    }

    const body = await request.json();
    const {
      subject,
      type = "choice",
      difficulty = 1,
      content,
      options = [],
      answer,
      explanation,
      source,
      gradeLevel,
    } = body;

    // 参数校验
    if (!subject || typeof subject !== "string") {
      return NextResponse.json({ error: "请指定学科" }, { status: 400 });
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "题目内容不能为空" }, { status: 400 });
    }

    if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
      return NextResponse.json({ error: "答案不能为空" }, { status: 400 });
    }

    if (difficulty < 1 || difficulty > 5) {
      return NextResponse.json({ error: "难度等级应在1-5之间" }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        subject,
        type,
        difficulty,
        content: content.trim(),
        options: JSON.stringify(options),
        answer: answer.trim(),
        explanation: explanation || null,
        source: source || null,
        gradeLevel: gradeLevel || null,
      },
    });

    return NextResponse.json(
      {
        question: {
          ...question,
          options: JSON.parse(question.options),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("添加题目失败:", error);
    return NextResponse.json({ error: "添加题目失败" }, { status: 500 });
  }
}
