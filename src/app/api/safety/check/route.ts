import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkInputSafety, checkOutputSafety } from "@/lib/safety";

// POST: 运行安全检测
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { content, type = "input" } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "请提供待检测内容" }, { status: 400 });
    }

    if (!["input", "output"].includes(type)) {
      return NextResponse.json({ error: "检测类型无效，仅支持 input 或 output" }, { status: 400 });
    }

    // 根据类型执行安全检查
    const result = type === "input"
      ? checkInputSafety(content.trim())
      : checkOutputSafety(content.trim());

    // 记录高风险事件
    if (!result.safe && (result.severity === "high" || result.severity === "critical")) {
      await prisma.safetyIncident.create({
        data: {
          userId,
          type: result.reason || "safety_check",
          severity: result.severity,
          content: content.trim(),
          action: result.action || "detected",
        },
      });
    }

    return NextResponse.json({
      ...result,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("安全检查失败:", error);
    return NextResponse.json({ error: "安全检查失败" }, { status: 500 });
  }
}
