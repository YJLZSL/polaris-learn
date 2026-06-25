// AGPL-3.0
// 管理员 API - 用量统计

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
 * GET /api/admin/usage?period=daily|weekly|monthly&limit=50
 * 获取用量统计
 */
export async function GET(request: Request) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    // 计算时间范围
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "daily":
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
    }

    // 总量统计
    const aggregateResult = await prisma.aPIUsageLog.aggregate({
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
      _sum: {
        totalTokens: true,
        cost: true,
      },
    });

    const totalCalls = aggregateResult._count.id;
    const totalTokens = aggregateResult._sum.totalTokens || 0;
    const totalCost = Number(aggregateResult._sum.cost || 0);

    // 按日期分组的每日明细
    const allLogs = await prisma.aPIUsageLog.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
      select: {
        provider: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        cost: true,
        createdAt: true,
      },
      take: limit * 10, // 多取一些用于分组
    });

    // 按日期分组
    const dailyMap = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const log of allLogs) {
      const dateKey = log.createdAt.toISOString().split("T")[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { calls: 0, tokens: 0, cost: 0 });
      }
      const entry = dailyMap.get(dateKey)!;
      entry.calls++;
      entry.tokens += log.totalTokens;
      entry.cost += Math.round(Number(log.cost) * 1_000_000) / 1_000_000;
    }

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        calls: data.calls,
        tokens: data.tokens,
        cost: data.cost,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 按提供商分组
    const providerMap = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const log of allLogs) {
      if (!providerMap.has(log.provider)) {
        providerMap.set(log.provider, { calls: 0, tokens: 0, cost: 0 });
      }
      const entry = providerMap.get(log.provider)!;
      entry.calls++;
      entry.tokens += log.totalTokens;
      entry.cost += Math.round(Number(log.cost) * 1_000_000) / 1_000_000;
    }

    const topProviders = Array.from(providerMap.entries())
      .map(([provider, data]) => ({
        provider,
        calls: data.calls,
        tokens: data.tokens,
        cost: data.cost,
      }))
      .sort((a, b) => b.cost - a.cost);

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalCalls,
      totalTokens,
      totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
      dailyBreakdown,
      topProviders,
    });
  } catch (error) {
    console.error("获取用量统计失败:", error);
    return NextResponse.json({ error: "获取用量统计失败" }, { status: 500 });
  }
}
