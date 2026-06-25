// AGPL-3.0
// API Key 单个操作 - 撤销指定 Key

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/ai/keys/[id]
 * 撤销（软删除）指定的 API Key
 * - 验证用户登录状态
 * - 验证 Key 归属于当前用户（403 无权限）
 * - 返回 404 如果 Key 不存在
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 认证检查
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { id: keyId } = await params;

    if (!keyId || typeof keyId !== "string") {
      return NextResponse.json({ error: "无效的Key ID" }, { status: 400 });
    }

    // 2. 查找 Key
    const existingKey = await prisma.virtualAPIKey.findUnique({
      where: { id: keyId },
    });

    if (!existingKey) {
      return NextResponse.json({ error: "Key不存在" }, { status: 404 });
    }

    // 3. 所有权验证 - 非所有者返回 403
    if (existingKey.userId !== userId) {
      return NextResponse.json({ error: "无权操作此Key" }, { status: 403 });
    }

    // 4. 软删除：标记为已撤销
    const revoked = await prisma.virtualAPIKey.update({
      where: { id: keyId },
      data: {
        status: "revoked",
        revokedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        revokedAt: true,
      },
    });

    return NextResponse.json({ success: true, key: revoked });
  } catch (error) {
    console.error("撤销API Key失败:", error);
    return NextResponse.json({ error: "撤销Key失败" }, { status: 500 });
  }
}
