import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 获取用户的所有对话
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    const [conversations, total] = await Promise.all([
      prisma.aIConversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              role: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.aIConversation.count({ where }),
    ]);

    return NextResponse.json({
      conversations: conversations.map((conv: typeof conversations[number]) => ({
        id: conv.id,
        subject: conv.subject,
        title: conv.title,
        status: conv.status,
        lastMessage: conv.messages[0] || null,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("获取对话列表失败:", error);
    return NextResponse.json({ error: "获取对话列表失败" }, { status: 500 });
  }
}

// POST: 创建新对话
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { subject, title } = body;

    if (!subject || typeof subject !== "string") {
      return NextResponse.json({ error: "请指定学科" }, { status: 400 });
    }

    const conversation = await prisma.aIConversation.create({
      data: {
        userId,
        subject,
        title: title || `${subject} 学习对话`,
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("创建对话失败:", error);
    return NextResponse.json({ error: "创建对话失败" }, { status: 500 });
  }
}
