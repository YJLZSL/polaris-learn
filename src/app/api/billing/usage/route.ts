// AGPL-3.0
// 计费 API - 用户用量查询

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Period = "7d" | "30d" | "month";

function getPeriodRange(period: Period, now: Date) {
  const start = new Date(now);
  if (period === "7d") {
    start.setDate(start.getDate() - 7);
  } else if (period === "30d") {
    start.setDate(start.getDate() - 30);
  } else {
    // 本月
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return start;
}

function getPreviousPeriodRange(period: Period, now: Date) {
  const prevEnd = new Date(getPeriodRange(period, now));
  const prevStart = new Date(prevEnd);
  if (period === "7d") {
    prevStart.setDate(prevStart.getDate() - 7);
  } else if (period === "30d") {
    prevStart.setDate(prevStart.getDate() - 30);
  } else {
    prevStart.setMonth(prevStart.getMonth() - 1);
    prevStart.setDate(1);
    prevStart.setHours(0, 0, 0, 0);
  }
  return { start: prevStart, end: prevEnd };
}

/**
 * GET /api/billing/usage?period=7d|30d|month
 * 返回当前用户的用量汇总 + 模型明细 + 每日趋势 + 上期对比
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const periodParam = (request.nextUrl.searchParams.get("period") || "month") as Period;
    const period: Period = ["7d", "30d", "month"].includes(periodParam) ? periodParam : "month";

    const now = new Date();
    const periodStart = getPeriodRange(period, now);

    // 当期汇总
    const periodAgg = await prisma.aPIUsageLog.aggregate({
      where: {
        userId,
        createdAt: { gte: periodStart },
      },
      _count: { id: true },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
        cost: true,
      },
    });

    // 上期汇总（用于环比计算）
    const prevRange = getPreviousPeriodRange(period, now);
    const prevAgg = await prisma.aPIUsageLog.aggregate({
      where: {
        userId,
        createdAt: { gte: prevRange.start, lt: prevRange.end },
      },
      _sum: {
        totalTokens: true,
        cost: true,
      },
    });

    // 当期日志（用于每日分组 + 模型分组）
    const recentLogs = await prisma.aPIUsageLog.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart },
      },
      orderBy: { createdAt: "desc" },
      select: {
        provider: true,
        model: true,
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
        cost: true,
        createdAt: true,
      },
    });

    // 按日期分组
    const dailyMap = new Map<string, { cost: number; tokens: number; calls: number }>();
    for (const log of recentLogs) {
      const dateKey = log.createdAt.toISOString().split("T")[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { cost: 0, tokens: 0, calls: 0 });
      }
      const entry = dailyMap.get(dateKey)!;
      entry.calls++;
      entry.tokens += log.totalTokens;
      entry.cost += Math.round(Number(log.cost) * 1_000_000) / 1_000_000;
    }

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        cost: data.cost,
        tokens: data.tokens,
        calls: data.calls,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 按模型分组
    const modelMap = new Map<string, {
      provider: string;
      tokens: number;
      promptTokens: number;
      completionTokens: number;
      cost: number;
      calls: number;
    }>();
    for (const log of recentLogs) {
      const key = `${log.provider}/${log.model}`;
      if (!modelMap.has(key)) {
        modelMap.set(key, {
          provider: log.provider,
          tokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          cost: 0,
          calls: 0,
        });
      }
      const entry = modelMap.get(key)!;
      entry.calls++;
      entry.tokens += log.totalTokens;
      entry.promptTokens += log.promptTokens;
      entry.completionTokens += log.completionTokens;
      entry.cost += Math.round(Number(log.cost) * 1_000_000) / 1_000_000;
    }

    const totalTokens = periodAgg._sum.totalTokens || 0;
    const modelBreakdown = Array.from(modelMap.entries())
      .map(([key, data]) => ({
        model: key.split("/").pop() || key,
        provider: data.provider,
        tokens: data.tokens,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        cost: data.cost,
        calls: data.calls,
        proportion: totalTokens > 0 ? Math.round((data.tokens / totalTokens) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.tokens - a.tokens);

    // 环比计算
    const prevTokens = prevAgg._sum.totalTokens || 0;
    const prevCost = Number(prevAgg._sum.cost || 0);
    const currentTokens = periodAgg._sum.totalTokens || 0;
    const currentCost = Number(periodAgg._sum.cost || 0);

    const tokenChange = prevTokens > 0
      ? Math.round(((currentTokens - prevTokens) / prevTokens) * 10000) / 100
      : currentTokens > 0 ? 100 : 0;
    const costChange = prevCost > 0
      ? Math.round(((currentCost - prevCost) / prevCost) * 10000) / 100
      : currentCost > 0 ? 100 : 0;

    // 计算平均每日用量
    const daysInPeriod = period === "7d" ? 7 : period === "30d" ? 30 : now.getDate();
    const avgDailyTokens = daysInPeriod > 0 ? Math.round(currentTokens / daysInPeriod) : 0;

    return NextResponse.json({
      userId,
      period,
      totalCost: Math.round(currentCost * 1_000_000) / 1_000_000,
      totalTokens: currentTokens,
      totalCalls: periodAgg._count.id,
      totalPromptTokens: periodAgg._sum.promptTokens || 0,
      totalCompletionTokens: periodAgg._sum.completionTokens || 0,
      avgDailyTokens,
      tokenChange,
      costChange,
      dailyBreakdown,
      modelBreakdown,
    });
  } catch (error) {
    console.error("获取用户用量失败:", error);
    return NextResponse.json({ error: "获取用量信息失败" }, { status: 500 });
  }
}
