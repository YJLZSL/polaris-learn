import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Flame,
  Star,
  Trophy,
  MessageSquare,
  Network,
  ChevronRight,
  ChevronDown,
  Check,
  Shield,
  Clock,
  Sparkles,
  RotateCw,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { staggerContainerCapped, listItem, cardHover } from "@/lib/motion";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { useUserStore } from "@/stores/useUserStore";
import { LEARNING_MODES, getLearningModeConfig } from "@/lib/learning-modes";
import { getHomeStats } from "@/lib/repositories/home-stats.repository";
import { getCurrentUser } from "@/lib/services/auth-service";
import { updateUser } from "@/lib/repositories/user.repository";
// Task 12: 每日任务系统
import DailyQuest from "@/components/common/DailyQuest";
import { generateDailyQuests } from "@/lib/repositories/quest.repository";
// Task 14: 专注心流护盾
import FocusShield from "@/components/common/FocusShield";
// Task 16: Bento Grid 组件
import { ProgressRing } from "@/components/common/ProgressRing";
import PolarisMascot, { type MascotMood } from "@/components/common/PolarisMascot";
import LearningCompanion from "@/components/common/LearningCompanion";

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
  const navigate = useNavigate();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Task 16: 累计学习时长供 LearningCompanion 使用
  const [totalStudyHours, setTotalStudyHours] = useState(0);

  // 从 useUserStore 获取 learningMode，并暴露 setUser 用于同步
  const learningMode = useUserStore((s) => s.learningMode);
  const setUser = useUserStore((s) => s.setUser);
  const initFromAuth = useUserStore((s) => s.initFromAuth);
  const safeMotion = useSafeMotion();
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
        // Task 16: 同步 totalStudyHours 供 LearningCompanion 使用
        if (user?.totalStudyHours != null) {
          setTotalStudyHours(user.totalStudyHours);
        }
        // 同步 learningMode 到 store，让徽章即时显示正确模式
        if (data.learningMode) {
          setUser({ learningMode: data.learningMode });
        }
        // Task 12.3: 每日首次打开应用时生成当日任务（幂等）
        if (user?.id) {
          generateDailyQuests(user.id).catch((e) => {
            console.error("[HomePage] generate daily quests failed:", e);
          });
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

  // Task 16: 吉祥物情绪 + 今日鼓励文案
  const mascotMood: MascotMood = useMemo(() => {
    if (streak >= 3) return "happy";
    if (streak === 0) return "worried";
    return "default";
  }, [streak]);

  const encouragement = useMemo(() => {
    if (streak >= 7) return `已坚持 ${streak} 天，星光与你同在！`;
    if (streak >= 3) return "保持节奏，你做得很好！";
    if (streak >= 1) return "今天也要加油哦！";
    return "开始今天的学习之旅吧！";
  }, [streak]);

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

  /* ---------- loading state: Bento 布局骨架 ---------- */
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        <div className="bento-grid">
          <div style={{ gridArea: "welcome" }}>
            <Skeleton className="h-56 lg:h-64 rounded-2xl" />
          </div>
          <div style={{ gridArea: "quests" }}>
            <Skeleton className="h-56 lg:h-64 rounded-2xl" />
          </div>
          <div style={{ gridArea: "focus" }}>
            <Skeleton className="h-56 lg:h-64 rounded-2xl" />
          </div>
          <div style={{ gridArea: "streak" }}>
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <div style={{ gridArea: "xp" }}>
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <div style={{ gridArea: "companion" }}>
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <div style={{ gridArea: "mascot" }}>
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <div style={{ gridArea: "recent" }}>
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div style={{ gridArea: "starlink" }}>
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <div style={{ gridArea: "ai-teacher" }}>
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        </div>
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
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 animate-fadeIn">
      {/* ====== Task 16: Bento Grid ====== */}
      <motion.div
        {...safeMotion({ variants: staggerContainerCapped, initial: "hidden", animate: "show" })}
        className="bento-grid"
      >
        {/* ====== welcome：欢迎横幅（含学习模式切换）====== */}
        <motion.div
          style={{ gridArea: "welcome" }}
          variants={listItem}
          {...cardHover}
          className="rounded-2xl overflow-hidden border border-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_20px_-5px_rgba(99,102,241,0.3)]"
        >
          <div className="relative bg-gradient-to-br from-primary/90 via-violet-500/90 to-fuchsia-500/80 p-6 lg:p-8 text-white h-full">
            {/* Decorative blurred circles */}
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute top-1/2 -left-20 w-64 h-64 rounded-full bg-violet-300/20 blur-3xl -translate-y-1/2" />
            <div className="absolute -bottom-24 right-1/3 w-56 h-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
            <div className="absolute top-6 right-8 opacity-20">
              <Sparkles className="w-20 h-20" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 h-full">
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
        </motion.div>

        {/* ====== quests：每日任务（DailyQuest 组件）====== */}
        <motion.div
          style={{ gridArea: "quests" }}
          variants={listItem}
          {...cardHover}
        >
          <DailyQuest />
        </motion.div>

        {/* ====== focus：专注心流护盾入口 ====== */}
        <motion.div
          style={{ gridArea: "focus" }}
          variants={listItem}
          {...cardHover}
          className="bento-card"
        >
          <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 p-5 lg:p-6 flex flex-col h-full justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 shadow-md shadow-purple-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm lg:text-base flex items-center gap-2">
                  专注心流护盾
                  <Badge variant="secondary" className="text-[10px] h-5 bg-purple-500/15 text-purple-700 dark:text-purple-300">
                    25min
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  番茄钟 + 深色聚焦态，屏蔽通知干扰，深度学习赢星光
                </p>
              </div>
            </div>
            <FocusShield triggerLabel="开始专注" />
          </div>
        </motion.div>

        {/* ====== streak：连胜信息（ProgressRing + count-up）====== */}
        <motion.div
          style={{ gridArea: "streak" }}
          variants={listItem}
          {...cardHover}
          className="bento-card p-5 flex flex-col items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 text-orange-500">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-medium text-muted-foreground">学习连胜</span>
          </div>
          <ProgressRing
            value={Math.min((streak / 7) * 100, 100)}
            size={100}
            strokeWidth={8}
            gradient={{ from: "#f97316", to: "#f59e0b" }}
            label={
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold tabular-nums">
                  <CountUp value={streak} />
                </span>
                <span className="text-[10px] text-muted-foreground">天</span>
              </div>
            }
          />
          <p className="text-xs text-muted-foreground text-center">
            {streak >= 7 ? "本周目标达成！" : `距 7 天目标还差 ${Math.max(0, 7 - streak)} 天`}
          </p>
        </motion.div>

        {/* ====== xp：当前等级 + XP 进度（ProgressRing）====== */}
        <motion.div
          style={{ gridArea: "xp" }}
          variants={listItem}
          {...cardHover}
          className="bento-card p-5 flex flex-col items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 text-indigo-500">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-medium text-muted-foreground">当前等级</span>
          </div>
          <ProgressRing
            value={progress}
            size={100}
            strokeWidth={8}
            gradient={{ from: "#6366f1", to: "#8b5cf6" }}
            label={
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">Lv.{level}</span>
                <span className="text-[10px] text-muted-foreground">{xp} XP</span>
              </div>
            }
          />
          <p className="text-xs text-muted-foreground text-center">
            {xpForLevel(level + 1) - xp} XP 升级
          </p>
        </motion.div>

        {/* ====== companion：学习伙伴 LearningCompanion ====== */}
        <motion.div
          style={{ gridArea: "companion" }}
          variants={listItem}
          {...cardHover}
          className="bento-card p-5 flex flex-col items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium text-muted-foreground">学习伙伴</span>
          </div>
          <LearningCompanion totalStudyHours={totalStudyHours} streak={streak} size={80} />
          <p className="text-xs text-muted-foreground text-center">
            陪你一起成长
          </p>
        </motion.div>

        {/* ====== mascot：PolarisMascot 装饰 + 今日鼓励文案 ====== */}
        <motion.div
          style={{ gridArea: "mascot" }}
          variants={listItem}
          {...cardHover}
          className="bento-card p-5 flex flex-col items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <Star className="w-4 h-4" />
            <span className="text-xs font-medium text-muted-foreground">北极星</span>
          </div>
          <PolarisMascot mood={mascotMood} size={72} />
          <p className="text-xs text-muted-foreground text-center px-2">
            {encouragement}
          </p>
        </motion.div>

        {/* ====== recent：最近学习记录 ====== */}
        <motion.div
          style={{ gridArea: "recent" }}
          variants={listItem}
          {...cardHover}
          className="bento-card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <CardTitle>最近学习</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-indigo-500 hover:text-indigo-600 gap-0.5 h-auto p-0">
                <Link to="#">
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
                onAction={() => navigate("/practice")}
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
        </motion.div>

        {/* ====== starlink：知识星图入口卡片 ====== */}
        <motion.div
          style={{ gridArea: "starlink" }}
          variants={listItem}
          {...cardHover}
          className="bento-card"
        >
          <Link
            to="/knowledge-graph"
            className="group flex flex-col items-center justify-center gap-3 p-5 h-full text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25 group-hover:scale-110 transition-transform duration-200">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">知识星图</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">
                可视化知识点掌握
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        </motion.div>

        {/* ====== ai-teacher：AI 老师入口卡片 ====== */}
        <motion.div
          style={{ gridArea: "ai-teacher" }}
          variants={listItem}
          {...cardHover}
          className="bento-card"
        >
          <Link
            to="/ai-teacher"
            className="group flex flex-col items-center justify-center gap-3 p-5 h-full text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-110 transition-transform duration-200">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI 老师</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">
                智能辅导答疑
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
