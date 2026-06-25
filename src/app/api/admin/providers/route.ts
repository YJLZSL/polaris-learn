// AGPL-3.0
// 管理员 API - API 提供商管理

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkInputSafety } from "@/lib/safety";

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
 * GET /api/admin/providers
 * 列出所有 API 提供商（不返回 apiKeyEncrypted）
 */
export async function GET() {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const providers = await prisma.aPIProvider.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        healthStatus: true,
        endpoint: true,
        config: true,
        lastHealthCheck: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ providers });
  } catch (error) {
    console.error("获取API提供商列表失败:", error);
    return NextResponse.json({ error: "获取提供商列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/admin/providers
 * 添加新的 API 提供商
 * Body: { name, apiKey, endpoint, config? }
 */
export async function POST(request: Request) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const body = await request.json();
    const { name, apiKey, endpoint, config } = body;

    // 参数校验
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "提供商名称不能为空" }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json({ error: "API Key不能为空" }, { status: 400 });
    }
    if (!endpoint || typeof endpoint !== "string" || endpoint.trim().length === 0) {
      return NextResponse.json({ error: "接口地址不能为空" }, { status: 400 });
    }

    // 安全检查
    const nameCheck = checkInputSafety(name.trim());
    if (!nameCheck.safe) {
      return NextResponse.json({ error: "提供商名称包含不安全内容" }, { status: 400 });
    }

    // 检查 name 是否已存在
    const existing = await prisma.aPIProvider.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: "该提供商名称已存在" }, { status: 409 });
    }

    // 创建提供商，apiKey 以明文存储（后续加密）
    const provider = await prisma.aPIProvider.create({
      data: {
        name: name.trim(),
        apiKeyEncrypted: apiKey.trim(),
        endpoint: endpoint.trim(),
        config: config ? (typeof config === "string" ? config : JSON.stringify(config)) : "{}",
        status: "active",
        healthStatus: "unknown",
      },
    });

    // 不返回 apiKeyEncrypted
    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        endpoint: provider.endpoint,
        config: provider.config,
        status: provider.status,
        healthStatus: provider.healthStatus,
        createdAt: provider.createdAt,
      },
    });
  } catch (error) {
    console.error("添加API提供商失败:", error);
    return NextResponse.json({ error: "添加提供商失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/providers
 * 更新提供商状态
 * Body: { providerId, status }
 */
export async function PUT(request: Request) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const body = await request.json();
    const { providerId, status } = body;

    if (!providerId || typeof providerId !== "string") {
      return NextResponse.json({ error: "providerId不能为空" }, { status: 400 });
    }

    const validStatuses = ["active", "inactive"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `状态值无效，有效值为: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.aPIProvider.findUnique({
      where: { id: providerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "提供商不存在" }, { status: 404 });
    }

    const updated = await prisma.aPIProvider.update({
      where: { id: providerId },
      data: { status },
      select: {
        id: true,
        name: true,
        status: true,
        healthStatus: true,
        endpoint: true,
      },
    });

    return NextResponse.json({ success: true, provider: updated });
  } catch (error) {
    console.error("更新提供商状态失败:", error);
    return NextResponse.json({ error: "更新提供商状态失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/providers
 * 删除提供商
 * Body: { providerId }
 */
export async function DELETE(request: Request) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const body = await request.json();
    const { providerId } = body;

    if (!providerId || typeof providerId !== "string") {
      return NextResponse.json({ error: "providerId不能为空" }, { status: 400 });
    }

    const existing = await prisma.aPIProvider.findUnique({
      where: { id: providerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "提供商不存在" }, { status: 404 });
    }

    await prisma.aPIProvider.delete({
      where: { id: providerId },
    });

    return NextResponse.json({ success: true, message: "提供商已删除" });
  } catch (error) {
    console.error("删除提供商失败:", error);
    return NextResponse.json({ error: "删除提供商失败" }, { status: 500 });
  }
}
