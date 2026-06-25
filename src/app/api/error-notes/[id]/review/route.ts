import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: 复习错题（提交答案进行判断）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { id } = await params;

    const body = await request.json();
    const { answer } = body;

    if (!answer || typeof answer !== "string") {
      return NextResponse.json({ error: "请提供答案" }, { status: 400 });
    }

    // 查找错题记录（需属于当前用户）
    const errorNote = await prisma.errorNote.findUnique({
      where: { id },
      include: {
        question: {
          select: {
            id: true,
            answer: true,
            explanation: true,
          },
        },
      },
    });

    if (!errorNote) {
      return NextResponse.json({ error: "错题记录不存在" }, { status: 404 });
    }

    if (errorNote.userId !== userId) {
      return NextResponse.json({ error: "无权操作此错题" }, { status: 403 });
    }

    // 判断答案是否正确（去除首尾空格后比较）
    const isCorrect = answer.trim() === errorNote.question.answer.trim();

    if (isCorrect) {
      // 答对：增加 correctCount
      const newCorrectCount = errorNote.correctCount + 1;
      const shouldEliminate = newCorrectCount >= 2;

      await prisma.errorNote.update({
        where: { id },
        data: {
          correctCount: newCorrectCount,
          status: shouldEliminate ? "eliminated" : errorNote.status,
        },
      });

      return NextResponse.json({
        correct: true,
        explanation: errorNote.question.explanation,
        eliminated: shouldEliminate,
        message: shouldEliminate ? "恭喜！连续答对2次，错题已消除！" : "回答正确！",
      });
    } else {
      // 答错：重置 correctCount
      await prisma.errorNote.update({
        where: { id },
        data: {
          correctCount: 0,
          wrongAnswer: answer.trim(),
        },
      });

      return NextResponse.json({
        correct: false,
        correctAnswer: errorNote.question.answer,
        explanation: errorNote.question.explanation,
        eliminated: false,
        message: "回答错误，请仔细查看正确答案和解析，下次再试！",
      });
    }
  } catch (error) {
    console.error("复习错题失败:", error);
    return NextResponse.json({ error: "复习错题失败" }, { status: 500 });
  }
}
