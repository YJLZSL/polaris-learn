// AGPL-3.0
// 管理员 API - 仪表盘统计数据

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 验证当前用户是否为管理员
 */
async function requireAdmin(): Promise<{ authorized: boolean; error?: NextResponse }> {
  const session = await auth();
  if (!session || !session.user) {
    return {
      authorized: false,
      error: NextResponse.json({ error: "请先登录" }, { status: 401 }),
    };
  }

  const userId = (session.user as Record<string, unknown>).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "admin") {
    return {
      authorized: false,
      error: NextResponse.json({ error: "无管理员权限" }, { status: 403 }),
    };
  }

  return { authorized: true };
}

/**
 * GET /api/admin/stats
 * 获取仪表盘综合统计数据
 */
export async function GET() {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    // 今日时间范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 并行执行所有统计查询
    const [
      totalUsers,
      activeToday,
      totalQuestions,
      totalConversations,
      totalAPIKeys,
      activeAPIKeys,
      todayUsageAgg,
      providerHealth,
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),

      // 今日活跃用户数 (lastStudyDate 为今天)
      prisma.user.count({
        where: {
          lastStudyDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // 总题目数
      prisma.question.count(),

      // 总对话数
      prisma.aIConversation.count(),

      // 总 API Key 数
      prisma.virtualAPIKey.count(),

      // 活跃 API Key 数
      prisma.virtualAPIKey.count({
        where: { status: "active" },
      }),

      // 今日 API 用量汇总
      prisma.aPIUsageLog.aggregate({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        _count: { id: true },
        _sum: {
          totalTokens: true,
          cost: true,
        },
      }),

      // 提供商健康状态
      prisma.aPIProvider.findMany({
        select: {
          id: true,
          name: true,
          healthStatus: true,
          status: true,
          lastHealthCheck: true,
        },
      }),
    ]);

    const totalUsageToday = todayUsageAgg._count.id;
    const totalTokensToday = todayUsageAgg._sum.totalTokens || 0;
    const totalRevenueToday = Math.round(Number(todayUsageAgg._sum.cost || 0) * 1_000_000) / 1_000_000;

    return NextResponse.json({
      basic: {
        totalUsers,
        activeToday,
        totalQuestions,
        totalConversations,
      },
      api: {
        totalAPIKeys,
        activeAPIKeys,
        totalUsageToday,
        totalTokensToday,
        totalRevenueToday,
      },
      providerHealth: providerHealth.map((p) => ({
        id: p.id,
        name: p.name,
        healthStatus: p.healthStatus,
        status: p.status,
        lastHealthCheck: p.lastHealthCheck,
      })),
    });
  } catch (error) {
    console.error("获取仪表盘统计失败:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}
