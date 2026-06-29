import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { LEARNING_MODES, getLearningModeConfig, type LearningModeId } from "@/lib/learning-modes";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 参数校验
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "密码至少需要6位" }, { status: 400 });
    }

    // 校验学习模式
    const validModeIds = LEARNING_MODES.map((m) => m.id);
    const rawMode =
      typeof body.learningMode === "string" ? body.learningMode : "PRIMARY";
    if (!validModeIds.includes(rawMode as LearningModeId)) {
      return NextResponse.json({ error: "无效的学习模式" }, { status: 400 });
    }
    const learningMode = rawMode as LearningModeId;
    const grade = getLearningModeConfig(learningMode).defaultGrade;

    // 检查邮箱唯一性
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户 + StudentProfile
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        grade,
        learningMode,
        studentProfile: {
          create: {
            weakPoints: "[]",
            strongPoints: "[]",
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        grade: true,
        learningMode: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("注册失败:", error);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
