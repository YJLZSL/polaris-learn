import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    // 参数校验
    if (!oldPassword || typeof oldPassword !== "string") {
      return NextResponse.json({ error: "请输入当前密码" }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "新密码至少需要6位" }, { status: 400 });
    }

    // 查询用户（包含密码哈希）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
    }

    // 新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      return NextResponse.json({ error: "新密码不能与当前密码相同" }, { status: 400 });
    }

    // 哈希新密码并更新
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("修改密码失败:", error);
    return NextResponse.json({ error: "修改密码失败，请稍后重试" }, { status: 500 });
  }
}
