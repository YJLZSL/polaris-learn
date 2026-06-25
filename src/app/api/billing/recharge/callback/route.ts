// AGPL-3.0
// 计费 API - 支付回调处理（支付宝/微信支付 webhook）
// POST /api/billing/recharge/callback

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncBalanceToRedis } from "@/lib/billing";

/**
 * POST /api/billing/recharge/callback
 * 
 * 支付网关回调接口，处理支付宝/微信支付的异步通知。
 * 
 * Body: {
 *   rechargeId: string,    // 充值订单 ID
 *   transactionId: string, // 支付网关交易流水号
 *   status: "success" | "failed"
 * }
 * 
 * TODO: 生产环境需要验证支付网关签名，防止伪造回调
 * 支付宝: 验证 sign 参数 (RSA/SHA256withRSA)
 * 微信支付: 验证签名 (V2: MD5/SHA256, V3: RSA)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rechargeId, transactionId, status } = body;

    // 参数校验
    if (!rechargeId || typeof rechargeId !== "string") {
      return NextResponse.json(
        { success: false, error: "缺少充值订单 ID" },
        { status: 400 }
      );
    }

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { success: false, error: "缺少支付交易流水号" },
        { status: 400 }
      );
    }

    if (!status || !["success", "failed"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "无效的支付状态，有效值为: success, failed" },
        { status: 400 }
      );
    }

    // TODO: 验证支付网关签名
    // const signatureVerified = await verifyPaymentSignature(request, body);
    // if (!signatureVerified) {
    //   return NextResponse.json(
    //     { success: false, error: "签名验证失败" },
    //     { status: 403 }
    //   );
    // }

    // 查询充值记录
    const rechargeRecord = await prisma.rechargeRecord.findUnique({
      where: { id: rechargeId },
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        completedAt: true,
      },
    });

    if (!rechargeRecord) {
      return NextResponse.json(
        { success: false, error: "充值订单不存在" },
        { status: 404 }
      );
    }

    // 幂等性保护：已完成的订单不重复处理
    if (rechargeRecord.status === "success") {
      return NextResponse.json({
        success: true,
        rechargeId,
        status: "success",
        message: "订单已处理（重复通知）",
      });
    }

    // 处理支付失败
    if (status === "failed") {
      await prisma.rechargeRecord.update({
        where: { id: rechargeId },
        data: {
          status: "failed",
          transactionId,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        rechargeId,
        status: "failed",
        message: "支付失败记录已更新",
      });
    }

    // 处理支付成功：使用事务保证数据一致性
    await prisma.$transaction(async (tx) => {
      // 1. 更新充值记录
      const record = await tx.rechargeRecord.update({
        where: { id: rechargeId },
        data: {
          status: "success",
          transactionId,
          completedAt: new Date(),
        },
        select: { amount: true, userId: true },
      });

      // 2. 增加用户余额
      await tx.user.update({
        where: { id: record.userId },
        data: {
          balance: {
            increment: record.amount,
          },
        },
      });
    });

    // 3. 同步余额到 Redis（异步，不阻塞响应）
    const amountNum = Number(rechargeRecord.amount);
    syncBalanceToRedis(rechargeRecord.userId).catch((err) =>
      console.error("支付回调后同步 Redis 余额失败:", err)
    );

    console.log(
      `[Billing] 充值成功回调处理完成: rechargeId=${rechargeId}, userId=${rechargeRecord.userId}, amount=${amountNum}`
    );

    return NextResponse.json({
      success: true,
      rechargeId,
      status: "success",
      message: "充值已到账",
    });
  } catch (error) {
    console.error("支付回调处理失败:", error);
    return NextResponse.json(
      { success: false, error: "回调处理失败" },
      { status: 500 }
    );
  }
}
