/**
 * 课程 repository（v3.0.0 静态化版本）
 *
 * 原 /api/courses 路由从 Prisma `Course` 模型查询，v3.0.0 移除后端后，
 * 课程数据非核心功能，使用静态 in-memory 示例数据。
 * 不持久化到 IndexedDB（无 STORES.COURSES）。
 */

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  coverImage: string | null;
  isFree: boolean;
  price: number;
  lessonCount: number;
  totalDuration: number; // 分钟
  enrolledCount: number;
  progress: number; // 0-100
  createdAt: string;
}

const STATIC_COURSES: Course[] = [
  {
    id: "course-math-junior1",
    title: "初中数学同步课·七年级上",
    description: "覆盖有理数、一元一次方程、几何图形基础等核心知识点，配合例题精讲与课后练习。",
    subject: "数学",
    gradeLevel: "初中一年级",
    coverImage: null,
    isFree: true,
    price: 0,
    lessonCount: 24,
    totalDuration: 720,
    enrolledCount: 1280,
    progress: 0,
    createdAt: "2025-09-01T08:00:00.000Z",
  },
  {
    id: "course-math-junior2",
    title: "二次函数与一元二次方程专项突破",
    description: "深入讲解二次函数图像性质、与一元二次方程的关系，适合初三年级冲刺复习。",
    subject: "数学",
    gradeLevel: "初中三年级",
    coverImage: null,
    isFree: false,
    price: 99,
    lessonCount: 16,
    totalDuration: 480,
    enrolledCount: 856,
    progress: 50,
    createdAt: "2025-10-15T10:00:00.000Z",
  },
  {
    id: "course-chinese-read",
    title: "文言文阅读入门：先秦诸子散文",
    description: "从《论语》《孟子》《庄子》选篇入手，培养文言文语感与翻译能力。",
    subject: "语文",
    gradeLevel: "高中一年级",
    coverImage: null,
    isFree: true,
    price: 0,
    lessonCount: 18,
    totalDuration: 540,
    enrolledCount: 642,
    progress: 0,
    createdAt: "2025-09-10T09:30:00.000Z",
  },
  {
    id: "course-chinese-write",
    title: "高考作文冲刺：议论文高分技巧",
    description: "拆解议论文结构、立意、论证方法，配合真题范文精析，快速提分。",
    subject: "语文",
    gradeLevel: "高中三年级",
    coverImage: null,
    isFree: false,
    price: 129,
    lessonCount: 12,
    totalDuration: 360,
    enrolledCount: 1102,
    progress: 100,
    createdAt: "2025-11-20T14:00:00.000Z",
  },
  {
    id: "course-english-grammar",
    title: "英语语法系统课·时态与从句",
    description: "梳理 16 种时态用法、定语从句与名词性从句，配套随堂测验巩固。",
    subject: "英语",
    gradeLevel: "高中二年级",
    coverImage: null,
    isFree: true,
    price: 0,
    lessonCount: 20,
    totalDuration: 600,
    enrolledCount: 924,
    progress: 0,
    createdAt: "2025-08-25T08:00:00.000Z",
  },
  {
    id: "course-english-read",
    title: "英语阅读理解技巧训练（中考）",
    description: "针对中考阅读题型，训练主旨大意、细节理解、推理判断三大解题策略。",
    subject: "英语",
    gradeLevel: "初中三年级",
    coverImage: null,
    isFree: false,
    price: 79,
    lessonCount: 14,
    totalDuration: 420,
    enrolledCount: 738,
    progress: 30,
    createdAt: "2025-10-05T11:00:00.000Z",
  },
  {
    id: "course-physics-mech",
    title: "初中物理：力学基础与运动学",
    description: "从牛顿三定律到简单机械，配套实验演示与典型例题分析。",
    subject: "物理",
    gradeLevel: "初中二年级",
    coverImage: null,
    isFree: true,
    price: 0,
    lessonCount: 22,
    totalDuration: 660,
    enrolledCount: 512,
    progress: 0,
    createdAt: "2025-09-15T09:00:00.000Z",
  },
  {
    id: "course-physics-elec",
    title: "高中物理电磁学专题进阶",
    description: "深入电场、磁场、电磁感应核心难点，配高考真题精讲。",
    subject: "物理",
    gradeLevel: "高中三年级",
    coverImage: null,
    isFree: false,
    price: 149,
    lessonCount: 18,
    totalDuration: 540,
    enrolledCount: 388,
    progress: 70,
    createdAt: "2025-11-01T16:00:00.000Z",
  },
  {
    id: "course-chem-elem",
    title: "化学元素周期表与化学键入门",
    description: "系统讲解元素周期律、化学键类型、分子结构基础。",
    subject: "化学",
    gradeLevel: "高中一年级",
    coverImage: null,
    isFree: true,
    price: 0,
    lessonCount: 16,
    totalDuration: 480,
    enrolledCount: 456,
    progress: 0,
    createdAt: "2025-09-20T13:00:00.000Z",
  },
  {
    id: "course-chem-reaction",
    title: "化学反应原理：氧化还原与酸碱盐",
    description: "聚焦氧化还原反应配平、酸碱盐判断与离子共存问题。",
    subject: "化学",
    gradeLevel: "初中三年级",
    coverImage: null,
    isFree: false,
    price: 89,
    lessonCount: 14,
    totalDuration: 420,
    enrolledCount: 612,
    progress: 0,
    createdAt: "2025-10-25T10:30:00.000Z",
  },
];

export interface CourseFilters {
  subject?: string;
  sort?: "latest" | "popular" | "progress";
}

export async function getCourses(filters?: CourseFilters): Promise<Course[]> {
  let result = [...STATIC_COURSES];
  if (filters?.subject && filters.subject !== "全部") {
    result = result.filter((c) => c.subject === filters.subject);
  }
  if (filters?.sort === "popular") {
    result.sort((a, b) => b.enrolledCount - a.enrolledCount);
  } else if (filters?.sort === "progress") {
    result.sort((a, b) => b.progress - a.progress);
  } else {
    // 默认 latest：按 createdAt 倒序
    result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return result;
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  return STATIC_COURSES.find((c) => c.id === id);
}
