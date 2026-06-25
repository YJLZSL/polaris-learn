// AGPL-3.0
// POST /api/billing/balance/check
// 内部余额检查接口（供 Middleware 调用）
// 通过 X-API-Key 认证，返回用户余额是否充足

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * POST /api/billing/balance/check
 * 由 Middleware 内部调用，用于检查 LLM API 用户的余额
 * 
 * Headers: X-API-Key - 用户的 Virtual API Key
 * Body: { checkType: "llm_api_balance" }
 * 
 * Response:
 * - 200 { balance: number, sufficient: true } - 余额充足
 * - 402 { balance: number, sufficient: false } - 余额不足
 * - 401 - API Key 无效
 */
export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing API key" },
        { status: 401 }
      );
    }

    // 对 API Key 做哈希
    const keyHash = crypto
      .createHash("sha256")
      .update(apiKey.trim())
      .digest("hex");

    // 查询 VirtualAPIKey 及关联用户
    const virtualKey = await prisma.virtualAPIKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        status: true,
        userId: true,
        user: {
          select: {
            id: true,
            balance: true,
          },
        },
      },
    });

    if (!virtualKey || virtualKey.status !== "active") {
      return NextResponse.json(
        { error: "Invalid or revoked API key" },
        { status: 401 }
      );
    }

    const balance = Number(virtualKey.user.balance);

    // 余额 <= 0 时返回 402
    if (balance <= 0) {
      return NextResponse.json(
        {
          balance: 0,
          sufficient: false,
          recharge_url: "/billing/recharge",
        },
        { status: 402 }
      );
    }

    // 余额充足
    return NextResponse.json({
      balance,
      sufficient: true,
    });
  } catch (error) {
    console.error("[BalanceCheck] 余额检查失败:", error);
    // 检查失败时放行（不阻塞业务），LLM API 内部也会做余额扣减校验
    return NextResponse.json({
      balance: -1,
      sufficient: true,
      note: "balance check skipped due to internal error",
    });
  }
}
