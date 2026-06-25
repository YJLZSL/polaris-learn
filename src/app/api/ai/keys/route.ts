// AGPL-3.0
// 用户 API Key 管理 - 当前登录用户管理自己的 API Key

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * GET /api/ai/keys
 * 列出当前用户的虚拟 API Key（不返回 keyHash）
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const keys = await prisma.virtualAPIKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        rateLimitRpm: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("获取用户API Key列表失败:", error);
    return NextResponse.json({ error: "获取Key列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/ai/keys
 * 为当前用户创建新的虚拟 API Key
 * Body: { name, rateLimitRpm? }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { name, rateLimitRpm } = body;

    // 参数校验
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Key名称不能为空" }, { status: 400 });
    }

    if (name.trim().length > 64) {
      return NextResponse.json({ error: "Key名称最长64个字符" }, { status: 400 });
    }

    // 限制每个用户的 Key 数量 (最多 20 个)
    const keyCount = await prisma.virtualAPIKey.count({ where: { userId } });
    if (keyCount >= 20) {
      return NextResponse.json(
        { error: "每个用户最多创建20个API Key" },
        { status: 400 }
      );
    }

    // 生成 Key：格式 sk-edu-{6位随机hex}-{32位随机hex}
    const prefix6 = crypto.randomBytes(3).toString("hex");
    const random32 = crypto.randomBytes(16).toString("hex");
    const rawKey = `sk-edu-${prefix6}-${random32}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const prefix = `sk-edu-${prefix6}`;

    const rpm =
      rateLimitRpm && typeof rateLimitRpm === "number" && rateLimitRpm > 0
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
        name: true,
        prefix: true,
        status: true,
        rateLimitRpm: true,
        createdAt: true,
      },
    });

    // 返回完整 Key 仅一次
    return NextResponse.json({
      success: true,
      key: apiKey,
      fullKey: rawKey,
      warning:
        "完整的API Key仅在此处展示一次，请立即复制并妥善保管。关闭此页面后无法再次获取完整Key。",
    });
  } catch (error) {
    console.error("创建API Key失败:", error);
    return NextResponse.json({ error: "创建Key失败" }, { status: 500 });
  }
}


