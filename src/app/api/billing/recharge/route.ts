// AGPL-3.0
// 计费 API - 用户充值下单
// POST /api/billing/recharge

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncBalanceToRedis } from "@/lib/billing";
import { checkInputSafety } from "@/lib/safety";
import { Prisma } from "@/generated/prisma/client";

/**
 * POST /api/billing/recharge
 * Body: { amount: number, paymentMethod: "alipay" | "wechat" }
 * 
 * 创建充值订单：
 * - dev 环境：自动完成充值（模拟支付成功）
 * - production 环境：生成支付链接（当前返回 mock URL，待对接真实支付网关）
 */
export async function POST(request: Request) {
  try {
    // 1. 认证检查
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // 2. 解析并校验请求参数
    const body = await request.json();
    const { amount, paymentMethod } = body;

    // 金额校验: 必须是正数，范围 1-10000
    const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!parsedAmount || typeof parsedAmount !== "number" || isNaN(parsedAmount)) {
      return NextResponse.json({ error: "充值金额必须为有效数字" }, { status: 400 });
    }
    if (parsedAmount < 1) {
      return NextResponse.json({ error: "充值金额最低为 1 元" }, { status: 400 });
    }
    if (parsedAmount > 10000) {
      return NextResponse.json({ error: "单次充值金额不能超过 10,000 元" }, { status: 400 });
    }

    // 支付方式校验
    const validMethods = ["alipay", "wechat"];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `无效的支付方式，有效值为: ${validMethods.join(", ")}` },
        { status: 400 }
      );
    }

    // 安全检查
    const methodCheck = checkInputSafety(paymentMethod);
    if (!methodCheck.safe) {
      return NextResponse.json({ error: "支付方式参数不合法" }, { status: 400 });
    }

    // 3. 验证用户存在并获取当前余额
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, balance: true },
    });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const isDev = process.env.NODE_ENV === "development";

    // 4. 创建充值记录
    const rechargeRecord = await prisma.rechargeRecord.create({
      data: {
        userId,
        amount: new Prisma.Decimal(parsedAmount),
        paymentMethod,
        status: isDev ? "success" : "pending",
        completedAt: isDev ? new Date() : null,
        transactionId: isDev
          ? `DEV_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          : null,
      },
    });

    // 5. dev 环境：自动完成充值（模拟支付成功）
    let newBalance = user.balance;
    if (isDev) {
      // 更新 User.balance
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: new Prisma.Decimal(parsedAmount),
          },
        },
        select: { balance: true },
      });
      newBalance = updatedUser.balance;

      // 同步余额到 Redis
      syncBalanceToRedis(userId, Number(newBalance)).catch((err) =>
        console.error("充值后同步 Redis 余额失败:", err)
      );

      return NextResponse.json({
        success: true,
        rechargeId: rechargeRecord.id,
        amount: parsedAmount,
        paymentMethod,
        status: "success",
        balance: Number(newBalance),
        currency: "CNY",
        message: "充值成功（开发模式自动完成）",
      });
    }

    // 6. production 环境：生成支付链接（当前 mock）
    // TODO: 对接真实支付网关（支付宝/微信支付），生成实际支付二维码或支付链接
    const mockPaymentUrl =
      paymentMethod === "alipay"
        ? `https://openapi.alipay.com/gateway.do?mock_order_id=${rechargeRecord.id}&amount=${parsedAmount}`
        : `https://api.mch.weixin.qq.com/pay/unifiedorder?mock_order_id=${rechargeRecord.id}&amount=${parsedAmount}`;

    return NextResponse.json({
      success: true,
      rechargeId: rechargeRecord.id,
      amount: parsedAmount,
      paymentMethod,
      status: "pending",
      paymentUrl: mockPaymentUrl,
      message: "订单已创建，请完成支付",
    });
  } catch (error) {
    console.error("充值下单失败:", error);
    return NextResponse.json({ error: "充值处理失败，请稍后重试" }, { status: 500 });
  }
}
