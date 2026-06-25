// AGPL-3.0
// GET /api/user/balance - 获取当前用户余额

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBalance } from "@/lib/billing";

/**
 * GET /api/user/balance
 * 返回当前登录用户的账户余额
 * Response: { balance: number, currency: "CNY" }
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // 使用 billing 模块的 getBalance（优先 Redis，降级数据库）
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
