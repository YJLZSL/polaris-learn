"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Award,
  Flame,
  CheckCircle,
  MessageSquare,
  Network,
  BookOpen,
  FileQuestion,
  Play,
  ChevronRight,
  Star,
  Trophy,
  TrendingUp,
  Clock,
  Lightbulb,
  Sparkles,
  RotateCw,
  AlertTriangle,
  ChevronDown,
  Check,
} from "lucide-react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { staggerContainer, listItem } from "@/lib/motion";
import { useUserStore } from "@/stores/useUserStore";
import { LEARNING_MODES, getLearningModeConfig } from "@/lib/learning-modes";
import { getHomeStats } from "@/lib/repositories/home-stats.repository";
import { getCurrentUser } from "@/lib/services/auth-service";
import { updateUser } from "@/lib/repositories/user.repository";

/* ---------- helpers ---------- */
function xpForLevel(lvl: number) {
  const t = [
    0, 100, 200, 350, 500, 700, 950, 1250, 1600, 2000, 2500, 3100, 3800, 4600,
    5500, 6500, 7600, 8800, 10000, 12000,
  ];
  return t[lvl] ?? t[t.length - 1];
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，注意休息";
  if (h < 9) return "早上好";
  if (h < 12) return "上午好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
};

/* ---------- quick actions ---------- */
const quickActions = [
  { href: "/ai-teacher", label: "AI 老师", icon: MessageSquare, color: "bg-indigo-500", desc: "智能辅导答疑" },
  { href: "/practice", label: "开始练习", icon: BookOpen, color: "bg-purple-500", desc: "题库刷题" },
  { href: "/knowledge-graph", label: "知识图谱", icon: Network, color: "bg-cyan-500", desc: "知识点掌握情况" },
  { href: "/error-notes", label: "错题本", icon: FileQuestion, color: "bg-amber-500", desc: "查漏补缺复习" },
];

const subjectColor: Record<string, string> = {
  数学: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  英语: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  物理: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  语文: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  化学: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
};

/* ---------- types ---------- */
interface RecentRecord {
  id: string;
  subject: string;
  type: string;
  questionsDone: number;
  questionsCorrect: number;
  xpEarned: number;
  createdAt: string;
}

interface HomeStats {
  xp: number;
  level: number;
  streak: number;
  maxStreak: number;
  learningMode?: string;
  todayDuration: number;
  todayQuestions: number;
  todayCorrect: number;
  correctRate: number;
  todayXP: number;
  totalXP: number;
  recentRecords: RecentRecord[];
}

/* ---------- count-up helper ---------- */
function CountUp({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) {
      const controls = animate(motionValue, value, {
        duration,
        ease: "easeOut",
        onUpdate: (latest) => setDisplay(Math.floor(latest).toString()),
      });
      return () => controls.stop();
    }
  }, [inView, value, duration, motionValue]);

  return <span ref={ref}>{display}</span>;
}

/* ---------- component ---------- */
export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从 useUserStore 获取 learningMode，并暴露 setUser 用于同步
  const learningMode = useUserStore((s) => s.learningMode);
  const setUser = useUserStore((s) => s.setUser);
  const initFromAuth = useUserStore((s) => s.initFromAuth);
  const [modeSwitching, setModeSwitching] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        // 先确保 store 已从本地 session 初始化
        await initFromAuth();
        const user = await getCurrentUser();
        const data = await getHomeStats(user);
        setStats(data);
        // 同步 learningMode 到 store，让徽章即时显示正确模式
        if (data.learningMode) {
          setUser({ learningMode: data.learningMode });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [setUser, learningMode, initFromAuth]);

  /* ---------- 快速切换学习模式 ---------- */
  const handleQuickSwitchMode = async (modeId: string) => {
    if (modeId === learningMode || modeSwitching) return;
    setModeSwitching(true);
    // 乐观更新
    setUser({ learningMode: modeId });
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("未登录");
      user.learningMode = modeId;
      await updateUser(user);
    } catch (err) {
      // 回滚
      setUser({ learningMode });
      console.error("切换学习模式失败:", err);
    } finally {
      setModeSwitching(false);
    }
  };

  const level = stats?.level ?? 1;
  const xp = stats?.xp ?? 0;
  const streak = stats?.streak ?? 0;

  const progress = useMemo(() => {
    const cur = xpForLevel(level);
    const nxt = xpForLevel(level + 1);
    return Math.min(((xp - cur) / (nxt - cur)) * 100, 100);
  }, [xp, level]);

  const statCards = [
    {
      icon: Zap,
      label: "总 XP",
      value: stats ? `${stats.totalXP}` : "--",
      bgColor: "bg-amber-100 dark:bg-amber-950",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: Award,
      label: "当前等级",
      value: `Lv.${level}`,
      bgColor: "bg-indigo-100 dark:bg-indigo-950",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      icon: Flame,
      label: "学习连胜",
      value: `${streak} 天`,
      bgColor: "bg-orange-100 dark:bg-orange-950",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      icon: CheckCircle,
      label: "答题正确率",
      value: stats ? `${stats.correctRate}%` : "--",
      bgColor: "bg-green-100 dark:bg-green-950",
      iconColor: "text-green-600 dark:text-green-400",
    },
  ];

  const records = stats?.recentRecords || [];

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}小时前`;
    if (diffH < 48) return "昨天";
    return `${Math.floor(diffH / 24)}天前`;
  }

  /* ---------- loading state ---------- */
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        {/* Welcome Banner Skeleton */}
        <Card className="overflow-hidden border-0 rounded-2xl">
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 p-6 lg:p-8">
            <Skeleton className="h-4 w-48 rounded-lg bg-gradient-to-r from-white/20 via-white/30 to-white/20 mb-3" />
            <Skeleton className="h-6 w-64 rounded-lg bg-gradient-to-r from-white/20 via-white/30 to-white/20 mb-4" />
            <div className="flex flex-wrap gap-2 mb-4">
              <Skeleton className="h-7 w-20 rounded-full bg-gradient-to-r from-white/20 via-white/30 to-white/20" />
              <Skeleton className="h-7 w-24 rounded-full bg-gradient-to-r from-white/20 via-white/30 to-white/20" />
              <Skeleton className="h-7 w-16 rounded-full bg-gradient-to-r from-white/20 via-white/30 to-white/20" />
            </div>
            <Skeleton className="h-2.5 w-full max-w-xs rounded-full bg-gradient-to-r from-white/20 via-white/30 to-white/20" />
          </div>
        </Card>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Skeleton className="size-10 rounded-full bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <Skeleton className="h-5 w-16 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <Skeleton className="h-3 w-20 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily Challenge + Quick Actions Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="lg:col-span-2 rounded-xl">
            <CardContent className="relative z-10 p-5 lg:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-32 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-4 w-64 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="size-7 rounded-full bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                    ))}
                  </div>
                  <Skeleton className="h-3 w-40 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                </div>
                <Skeleton className="h-12 w-32 rounded-xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="p-3 lg:p-4 flex flex-col items-center text-center gap-2">
                  <Skeleton className="size-10 lg:size-12 rounded-xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-3 w-16 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-2.5 w-20 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Suggestion + Recent Learning Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-7 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <Skeleton className="h-5 w-28 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                  <Skeleton className="size-4 rounded-md mt-0.5 bg-gradient-to-r from-muted-foreground/30 via-muted-foreground/20 to-muted-foreground/30" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                    <Skeleton className="h-3 w-full rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  </div>
                </div>
              ))}
              <Skeleton className="h-4 w-24 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-7 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-5 w-24 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                </div>
                <Skeleton className="h-4 w-12 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 p-3">
                    <Skeleton className="size-9 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-3.5 w-3/4 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                      <Skeleton className="h-2.5 w-16 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      <Skeleton className="h-3.5 w-12 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                      <Skeleton className="h-2.5 w-10 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                    </div>
                  </div>
                  {i < 3 && <Separator className="my-0.5 opacity-50" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA Skeleton */}
        <Card className="rounded-xl">
          <CardContent className="p-5 lg:p-6 text-center space-y-3">
            <Skeleton className="h-5 w-56 mx-auto rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
            <Skeleton className="h-3 w-48 mx-auto rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
            <Skeleton className="h-10 w-28 mx-auto rounded-xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- error state ---------- */
  if (error && !stats) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2 gap-1"
          >
            <RotateCw className="h-4 w-4" />
            重新加载
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* ====== Welcome Banner ====== */}
      <Card className="overflow-hidden border-0 rounded-2xl">
        <div className="relative bg-gradient-to-br from-primary/90 via-violet-500/90 to-fuchsia-500/80 p-6 lg:p-8 text-white">
          {/* Decorative blurred circles */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-1/2 -left-20 w-64 h-64 rounded-full bg-violet-300/20 blur-3xl -translate-y-1/2" />
          <div className="absolute -bottom-24 right-1/3 w-56 h-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="absolute top-6 right-8 opacity-20">
            <Sparkles className="w-20 h-20" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs lg:text-sm font-medium text-white/80 uppercase tracking-wider mb-1">
                {greeting()}，同学
              </p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight drop-shadow-sm break-words">
                今天又是元气满满的一天！
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {/* 学习模式徽章 - 点击快速切换 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={modeSwitching}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="切换学习模式"
                    >
                      {(() => {
                        const ModeIcon = getLearningModeConfig(learningMode).icon;
                        return <ModeIcon className="w-3.5 h-3.5 text-white" />;
                      })()}
                      <span className="font-semibold">{getLearningModeConfig(learningMode).label}</span>
                      <ChevronDown className="w-3 h-3 text-white/80" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {LEARNING_MODES.map((mode) => {
                      const ModeIcon = mode.icon;
                      const isActive = mode.id === learningMode;
                      return (
                        <DropdownMenuItem
                          key={mode.id}
                          onSelect={() => handleQuickSwitchMode(mode.id)}
                          className="gap-2.5 cursor-pointer"
                        >
                          <span className={`w-7 h-7 rounded-md bg-gradient-to-br ${mode.color} flex items-center justify-center shrink-0`}>
                            <ModeIcon className="w-4 h-4 text-white" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{mode.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{mode.description}</p>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 gap-1.5 backdrop-blur-sm">
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span className="font-semibold">{streak}</span> 天连胜
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 gap-1.5 backdrop-blur-sm">
                  <Star className="w-3.5 h-3.5 text-yellow-300" />
                  <span className="font-semibold">{stats?.todayXP ?? 0}</span> XP 今日
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 gap-1.5 backdrop-blur-sm">
                  <Trophy className="w-3.5 h-3.5 text-amber-200" />
                  Lv.{level}
                </Badge>
              </div>
            </div>

            {/* Level progress right side */}
            <div className="w-full lg:w-56 shrink-0">
              <div className="flex items-center justify-between text-xs text-white/90 mb-2 font-medium">
                <span>Lv.{level}</span>
                <span>{xpForLevel(level + 1) - xp} XP 升级</span>
              </div>
              <div className="rounded-full bg-white/20 p-1 ring-1 ring-white/20">
                <Progress
                  value={progress}
                  className="h-2.5 bg-white/20 [&>div]:bg-gradient-to-r [&>div]:from-amber-300 [&>div]:to-yellow-400"
                />
              </div>
              <p className="text-[10px] text-white/70 mt-1.5 text-right">
                {xp} / {xpForLevel(level + 1)} XP
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ====== Learning Stats Grid ====== */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4"
      >
        {statCards.map((s) => (
          <motion.div key={s.label} variants={listItem}>
            <Card className="transition-shadow hover:shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
                <div className={`w-10 h-10 rounded-full ${s.bgColor} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <span className="text-lg lg:text-xl font-bold">
                  {s.label === "总 XP" && stats ? (
                    <CountUp value={stats.totalXP} />
                  ) : s.label === "学习连胜" ? (
                    <>
                      <CountUp value={streak} /> 天
                    </>
                  ) : s.label === "答题正确率" && stats ? (
                    <>
                      <CountUp value={stats.correctRate} />%
                    </>
                  ) : (
                    s.value
                  )}
                </span>
                <span className="text-[10px] lg:text-xs text-muted-foreground">
                  {s.label}
                </span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ====== Micro Learning (PROFESSIONAL mode only) ====== */}
      <div className="micro-learning-card">
        <div className="grid grid-cols-3 gap-2">
          <Link href="/ai-teacher" className="group">
            <Card className="transition-all hover:shadow-sm hover:-translate-y-0.5">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">5 分钟速学</p>
                  <p className="text-[10px] text-muted-foreground truncate">AI 快速答疑</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/practice" className="group">
            <Card className="transition-all hover:shadow-sm hover:-translate-y-0.5">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">5 分钟速学</p>
                  <p className="text-[10px] text-muted-foreground truncate">刷 3 道题</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/error-notes" className="group">
            <Card className="transition-all hover:shadow-sm hover:-translate-y-0.5">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <FileQuestion className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">5 分钟速学</p>
                  <p className="text-[10px] text-muted-foreground truncate">复习错题</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ====== Daily Challenge + Quick Actions Grid ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Daily Challenge Card */}
        <Card className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/50 to-transparent dark:from-amber-900/20 rounded-bl-3xl" />
          <CardContent className="relative z-10 p-5 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-semibold">每日挑战</h2>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs">
                    每日刷新
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  完成 5 道精选题目，赢取额外 XP 奖励！
                </p>
                {/* Progress dots */}
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                        i < (stats && stats.todayQuestions >= 5 ? 5 : Math.min(stats?.todayQuestions || 0, 5))
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i < (stats && stats.todayQuestions >= 5 ? 5 : Math.min(stats?.todayQuestions || 0, 5))
                        ? "\u2713"
                        : i + 1}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats && stats.todayQuestions >= 5
                    ? "今日挑战已完成！"
                    : `已完成 ${stats?.todayQuestions || 0}/5 题`}
                </p>
              </div>
              <Button asChild size="lg" className="shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30">
                <Link href="/practice" className="gap-2">
                  <Play className="w-4 h-4" />
                  {stats && stats.todayQuestions >= 5 ? "查看结果" : "开始挑战"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Grid (2x2) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {quickActions.map((action) => (
            <Card key={action.label} className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-pointer">
              <CardContent className="p-3 lg:p-4 flex flex-col items-center text-center gap-2">
                <Link href={action.href} className="flex flex-col items-center gap-2 w-full rounded-lg outline-none focus-visible:outline-none">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl ${action.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-sm font-semibold break-words">{action.label}</p>
                    <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5 break-words">
                      {action.desc}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ====== AI Suggestion + Recent Learning ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* AI Suggestion Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <CardTitle>AI 学习建议</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700/50">
              <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-indigo-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-indigo-800 dark:text-slate-200">
                  二次函数需要加强
                </p>
                <p className="text-xs text-indigo-600/70 dark:text-slate-400 mt-1">
                  最近 3 次练习中正确率仅 60%，建议重点复习顶点式和图像性质。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50 dark:bg-slate-800/50 border border-purple-100 dark:border-slate-700/50">
              <TrendingUp className="w-4 h-4 text-purple-500 dark:text-purple-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-slate-200">
                  继续保持英语优势
                </p>
                <p className="text-xs text-purple-600/70 dark:text-slate-400 mt-1">
                  词汇语法正确率 85%，非常棒！可以挑战更高难度的阅读理解。
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-indigo-500 hover:text-indigo-600 gap-1 p-0 h-auto">
              查看更多建议 <ChevronRight className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Learning */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <CardTitle>最近学习</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-indigo-500 hover:text-indigo-600 gap-0.5 h-auto p-0">
                <Link href="#">
                  全部 <ChevronRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="暂无学习记录"
                description="开始练习来记录你的学习轨迹吧"
                actionLabel="开始练习"
                onAction={() => router.push("/practice")}
              />
            ) : (
              <div className="space-y-1">
                {records.map((rec, idx) => (
                  <div key={rec.id}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          subjectColor[rec.subject || ""] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {(rec.subject || "练").slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {rec.subject ? `${rec.subject} - ${rec.type}` : rec.type}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{formatTime(rec.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-indigo-500">
                          +{rec.xpEarned} XP
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {rec.questionsCorrect}/{rec.questionsDone}
                        </p>
                      </div>
                    </div>
                    {idx < records.length - 1 && <Separator className="my-0.5 opacity-50" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== Bottom CTA ====== */}
      <Card className="mb-6 pb-4 sm:pb-0 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 border-indigo-100 dark:border-slate-700/50">
        <CardContent className="p-5 lg:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            <span className="font-bold text-sm lg:text-base text-foreground dark:text-slate-100">
              准备好开始今天的练习了吗？
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            每天坚持练习，成绩稳步提升
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 dark:from-indigo-600 dark:to-purple-700 dark:hover:from-indigo-500 dark:hover:to-purple-600 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 dark:shadow-indigo-900/30">
            <Link href="/practice" className="gap-2">
              <Play className="w-4 h-4" />
              开始练习
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
