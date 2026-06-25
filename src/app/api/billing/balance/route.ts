// AGPL-3.0
// 计费 API - 用户余额管理

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBalance } from "@/lib/billing";

/**
 * GET /api/billing/balance
 * 获取当前用户余额（优先 Redis，降级数据库）
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // 优先从 Redis 读取（高性能），降级到数据库
    const balance = await getBalance(userId);

    return NextResponse.json({
      balance,
      currency: "CNY",
    });
  } catch (error) {
    console.error("获取用户余额失败:", error);
    return NextResponse.json({ error: "获取余额信息失败" }, { status: 500 });
  }
}
