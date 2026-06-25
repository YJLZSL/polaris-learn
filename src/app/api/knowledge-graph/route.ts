import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 获取知识图谱数据（包含用户掌握度）
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || "数学";

    // 获取该学科所有知识点
    const knowledgePoints = await prisma.knowledgePoint.findMany({
      where: { subject },
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        name: true,
        subject: true,
        description: true,
        gradeLevel: true,
        parentId: true,
        orderIndex: true,
      },
    });

    // 获取当前用户对这些知识点的掌握度
    const masteryRecords = await prisma.userKnowledgeMastery.findMany({
      where: {
        userId,
        knowledgePointId: {
          in: knowledgePoints.map((kp) => kp.id),
        },
      },
      select: {
        knowledgePointId: true,
        masteryLevel: true,
        timesCorrect: true,
        timesWrong: true,
        lastPracticedAt: true,
      },
    });

    // 构建 masteryMap
    const masteryMap = new Map<string, (typeof masteryRecords)[number]>();
    for (const record of masteryRecords) {
      masteryMap.set(record.knowledgePointId, record);
    }

    // 构建节点列表
    const nodes = knowledgePoints.map((kp) => {
      const mastery = masteryMap.get(kp.id);
      // masteryLevel 是 0-1 之间的浮点数，转换为 0-100 的百分比
      const masteryLevel = mastery ? Math.round(mastery.masteryLevel * 100) : 0;
      return {
        id: kp.id,
        name: kp.name,
        subject: kp.subject,
        description: kp.description,
        gradeLevel: kp.gradeLevel,
        parentId: kp.parentId,
        orderIndex: kp.orderIndex,
        masteryLevel,
        timesCorrect: mastery?.timesCorrect ?? 0,
        timesWrong: mastery?.timesWrong ?? 0,
        lastPracticedAt: mastery?.lastPracticedAt ?? null,
      };
    });

    // 构建边列表（仅连接有父子关系的节点）
    const edges = knowledgePoints
      .filter((kp) => kp.parentId)
      .map((kp) => ({
        from: kp.parentId!,
        to: kp.id,
        relation: "prerequisite" as const,
      }));

    return NextResponse.json({
      nodes,
      edges,
      subject,
      totalNodes: nodes.length,
    });
  } catch (error) {
    console.error("获取知识图谱失败:", error);
    return NextResponse.json({ error: "获取知识图谱失败" }, { status: 500 });
  }
}
