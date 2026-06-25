import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * 生成 API Key：格式 sk-edu-{6位随机hex}-{32位随机hex}
 * 使用 crypto.randomBytes 安全随机生成
 */
function generateApiKey(): { rawKey: string; prefix: string; keyHash: string } {
  const prefix6 = crypto.randomBytes(3).toString("hex"); // 6 hex chars
  const random32 = crypto.randomBytes(16).toString("hex"); // 32 hex chars
  const rawKey = `sk-edu-${prefix6}-${random32}`;
  const prefix = `sk-edu-${prefix6}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, prefix, keyHash };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, grade, role } = body;

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
        grade: grade || null,
        role: role || "student",
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
        role: true,
        grade: true,
        createdAt: true,
      },
    });

    // 为新用户自动创建首个 VirtualAPIKey
    const { rawKey, prefix, keyHash } = generateApiKey();

    const apiKey = await prisma.virtualAPIKey.create({
      data: {
        userId: user.id,
        name: "默认Key",
        keyHash,
        prefix,
        rateLimitRpm: 120,
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

    // 注册响应中返回一次完整Key明文（之后永不再返回）
    return NextResponse.json(
      {
        success: true,
        user,
        apiKey: {
          ...apiKey,
          fullKey: rawKey,
          warning:
            "完整的API Key仅在此处展示一次，请立即复制并妥善保管。关闭此页面后无法再次获取完整Key。",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("注册失败:", error);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
