// AGPL-3.0
// 管理员 API - 虚拟API Key管理

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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
 * GET /api/admin/api-keys
 * 列出所有虚拟 API Key（管理员视图）
 */
export async function GET() {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const keys = await prisma.virtualAPIKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        name: true,
        prefix: true,
        keyHash: true,
        status: true,
        rateLimitRpm: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("获取API Key列表失败:", error);
    return NextResponse.json({ error: "获取Key列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/admin/api-keys
 * 管理员为用户创建新的虚拟 API Key
 * Body: { userId, name, rateLimitRpm? }
 */
export async function POST(request: Request) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const body = await request.json();
    const { userId, name, rateLimitRpm } = body;

    // 参数校验
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId不能为空" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Key名称不能为空" }, { status: 400 });
    }

    // 验证目标用户存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "目标用户不存在" }, { status: 404 });
    }

    // 生成 Key
    const rawKey = `sk-${crypto.randomUUID().replace(/-/g, "")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.substring(0, 12);

    const rpm = rateLimitRpm && typeof rateLimitRpm === "number" && rateLimitRpm > 0
      ? Math.min(rateLimitRpm, 10000)
      : 120;

    const apiKey = await prisma.virtualAPIKey.create({
      data: {
        userId,
        name: name.trim(),
        keyHash,
        prefix,
        rateLimitRpm: rpm,
        status: "active",
      },
      select: {
        id: true,
        userId: true,
        name: true,
        prefix: true,
        status: true,
        rateLimitRpm: true,
        createdAt: true,
      },
    });

    // 返回完整 Key 一次（之后不再展示）
    return NextResponse.json({
      success: true,
      key: apiKey,
      fullKey: rawKey,
      warning: "完整的API Key仅在此处展示一次，请妥善保管，之后无法再次获取。",
    });
  } catch (error) {
    console.error("管理员创建API Key失败:", error);
    return NextResponse.json({ error: "创建Key失败" }, { status: 500 });
  }
}
