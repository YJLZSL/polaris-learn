import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 按关键词搜索题目
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim();
    const subject = searchParams.get("subject");
    const difficulty = searchParams.get("difficulty");
    const gradeLevel = searchParams.get("gradeLevel");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!keyword || keyword.length === 0) {
      return NextResponse.json({ error: "请输入搜索关键词" }, { status: 400 });
    }

    // 构建筛选条件
    const filters: Record<string, unknown>[] = [
      { content: { contains: keyword } },
      { answer: { contains: keyword } },
      { explanation: { contains: keyword } },
      { source: { contains: keyword } },
    ];

    const where: Record<string, unknown> = { OR: filters };

    if (subject) where.subject = subject;
    if (difficulty) where.difficulty = parseInt(difficulty);
    if (gradeLevel) where.gradeLevel = gradeLevel;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          knowledge: {
            include: {
              knowledgePoint: {
                select: { id: true, name: true, subject: true },
              },
            },
          },
        },
      }),
      prisma.question.count({ where }),
    ]);

    const formattedQuestions = questions.map((q: typeof questions[number]) => ({
      id: q.id,
      subject: q.subject,
      type: q.type,
      difficulty: q.difficulty,
      content: q.content,
      options: JSON.parse(q.options),
      answer: q.answer,
      explanation: q.explanation,
      source: q.source,
      gradeLevel: q.gradeLevel,
      knowledgePoints: q.knowledge.map((k: typeof q.knowledge[number]) => k.knowledgePoint),
      createdAt: q.createdAt,
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      total,
      keyword,
      limit,
      offset,
    });
  } catch (error) {
    console.error("搜索题目失败:", error);
    return NextResponse.json({ error: "搜索题目失败" }, { status: 500 });
  }
}
