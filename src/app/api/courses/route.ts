import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/courses - 获取课程列表（含用户进度）
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user
      ? ((session.user as Record<string, unknown>).id as string)
      : null;

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || undefined;
    const sort = searchParams.get("sort") || "latest";

    // 构建查询条件
    const where = subject && subject !== "全部" ? { subject } : {};

    // 查询课程列表
    const courses = await prisma.course.findMany({
      where,
      include: {
        sections: {
          select: { id: true, duration: true },
          orderBy: { orderIndex: "asc" },
        },
        userCourses: userId
          ? { where: { userId }, select: { progress: true } }
          : false,
        _count: { select: { userCourses: true } },
      },
      orderBy:
        sort === "popular"
          ? { userCourses: { _count: "desc" } }
          : sort === "progress"
          ? { createdAt: "desc" }
          : { createdAt: "desc" },
    });

    const result = courses.map((course) => {
      const totalDuration = course.sections.reduce(
        (sum, s) => sum + s.duration,
        0
      );
      const lessonCount = course.sections.length;
      const userProgress =
        userId && course.userCourses?.length
          ? course.userCourses[0].progress
          : 0;

      return {
        id: course.id,
        title: course.title,
        description: course.description || "",
        subject: course.subject,
        gradeLevel: course.gradeLevel,
        coverImage: course.coverImage,
        isFree: course.isFree,
        price: course.price,
        lessonCount,
        totalDuration,
        enrolledCount: course._count.userCourses,
        progress: userProgress,
        createdAt: course.createdAt,
      };
    });

    // 按 progress 排序需要在内存中处理
    if (sort === "progress" && userId) {
      result.sort((a, b) => b.progress - a.progress);
    }

    return NextResponse.json({ courses: result });
  } catch (error) {
    console.error("获取课程列表失败:", error);
    return NextResponse.json({ error: "获取课程列表失败" }, { status: 500 });
  }
}
