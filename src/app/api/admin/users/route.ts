// AGPL-3.0
// 管理员 API - 用户管理

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
 * GET /api/admin/users?status=active|suspended|banned
 * 获取用户列表及统计
 */
export async function GET(request: Request) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || undefined;

    // 验证状态值
    const validStatuses = ["active", "suspended", "banned"];
    if (statusFilter && !validStatuses.includes(statusFilter)) {
      return NextResponse.json(
        { error: `无效的状态值，有效值为: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // 总用户数
    const totalUsers = await prisma.user.count();

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (statusFilter) {
      where.status = statusFilter;
    }

    // 获取用户列表
    const users = await prisma.user.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        grade: true,
        xp: true,
        level: true,
        streak: true,
        lastStudyDate: true,
        createdAt: true,
        _count: {
          select: {
            conversations: true,
            virtualAPIKeys: true,
          },
        },
      },
    });

    // 最近注册用户 (近7天)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    return NextResponse.json({
      totalUsers,
      recentUsers,
      filteredCount: users.length,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        grade: u.grade,
        xp: u.xp,
        level: u.level,
        streak: u.streak,
        lastStudyDate: u.lastStudyDate,
        createdAt: u.createdAt,
        apiKeysCount: u._count.virtualAPIKeys,
        conversationsCount: u._count.conversations,
      })),
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * 更新用户状态
 * Body: { userId, status }  (status: active|suspended|banned)
 */
export async function POST(request: Request) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) return authCheck.error!;

    const body = await request.json();
    const { userId, status } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId不能为空" }, { status: 400 });
    }

    const validStatuses = ["active", "suspended", "banned"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `无效的状态值，有效值为: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        status,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      previousStatus: existing.status,
      user: updated,
    });
  } catch (error) {
    console.error("更新用户状态失败:", error);
    return NextResponse.json({ error: "更新用户状态失败" }, { status: 500 });
  }
}
