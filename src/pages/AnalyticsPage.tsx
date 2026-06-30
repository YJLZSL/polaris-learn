import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  Target,
  Brain,
  Zap,
  Flame,
  Star,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  GraduationCap,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/common/ProgressRing";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useUserStore } from "@/stores/useUserStore";
import { getUserStats } from "@/lib/repositories/gamification.repository";
import {
  getUserPracticeRecords,
  getPracticeStats,
} from "@/lib/repositories/practice.repository";
import { getErrorNotes } from "@/lib/repositories/error-notes.repository";
import {
  getKnowledgePoints,
  getUserMastery,
} from "@/lib/repositories/knowledge.repository";

// ---- 类型定义 ----

interface Summary {
  totalStudyHours: number;
  totalQuestions: number;
  correctRate: number;
  xpGained: number;
  streakDays: number;
  currentLevel: number;
  levelTitle: string;
  xpToNextLevel: number;
  levelProgress: number;
}

interface DailyStat {
  date: string;
  studyMinutes: number;
  questionsDone: number;
  correctRate: number;
  xpEarned: number;
}

interface SubjectBreakdown {
  subject: string;
  questionsDone: number;
  correctRate: number;
  studyMinutes: number;
}

interface KnowledgeItem {
  knowledgePointId: string;
  name: string;
  subject: string;
  masteryLevel: number;
  timesCorrect: number;
  timesWrong: number;
}

interface Recommendation {
  type: "review" | "practice" | "challenge";
  topic: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface ReportData {
  summary: Summary;
  dailyStats: DailyStat[];
  subjectBreakdown: SubjectBreakdown[];
  knowledgeMastery: KnowledgeItem[];
  weakPoints: KnowledgeItem[];
  strengths: KnowledgeItem[];
  recommendations: Recommendation[];
  period: string;
  generatedAt: string;
}

type Period = "7d" | "30d" | "90d";

// ---- 辅助函数 ----

function getSubjectBadgeClass(subject: string): string {
  const colors: Record<string, string> = {
    "数学": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    "语文": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    "英语": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    "物理": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    "化学": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    "生物": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
    "历史": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    "地理": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    "政治": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  };
  return colors[subject] || "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
}

function getMasteryColor(level: number): string {
  if (level >= 80) return "bg-emerald-500";
  if (level >= 60) return "bg-blue-500";
  if (level >= 40) return "bg-amber-500";
  return "bg-red-400";
}

function getMasteryLabel(level: number): string {
  if (level >= 80) return "已掌握";
  if (level >= 60) return "熟练";
  if (level >= 40) return "学习中";
  return "需加强";
}

function getMasteryBadgeClass(level: number): string {
  if (level >= 80) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  if (level >= 60) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  if (level >= 40) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
}

function getMasteryGradient(level: number): { from: string; to: string } {
  if (level >= 80) return { from: "#10b981", to: "#059669" };
  if (level >= 60) return { from: "#3b82f6", to: "#2563eb" };
  if (level >= 40) return { from: "#f59e0b", to: "#d97706" };
  return { from: "#f87171", to: "#ef4444" };
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

// ---- 加载骨架屏 ----

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-7 w-20 mb-1" />
              <Skeleton className="h-2.5 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* Two column skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* AI suggestions skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ---- 空状态 ----

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-5">
          <BarChart3 className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          暂无学习数据
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          还尚未开始学习记录。完成一些练习或课程后，你的学习报告将在这里展示。
        </p>
        <Button asChild className="mt-5">
          <a href="/practice">
            <GraduationCap className="w-4 h-4 mr-2" />
            开始练习
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

// ---- 主组件 ----

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const learningMode = useUserStore((s) => s.learningMode);
  const userId = useUserStore((s) => s.id);
  const initFromAuth = useUserStore((s) => s.initFromAuth);

  useEffect(() => {
    initFromAuth();
  }, [initFromAuth]);

  useEffect(() => {
    fetchReport(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, userId]);

  async function fetchReport(p: Period) {
    setLoading(true);
    setError(null);
    try {
      if (!userId) {
        setError("请先登录后再查看学习报告");
        return;
      }
      // 客户端聚合：从各 repository 拉取数据组装成 ReportData
      const periodDays = p === "7d" ? 7 : p === "30d" ? 30 : 90;
      const sinceMs = Date.now() - periodDays * 86400000;

      const [stats, records, _errorNotes, knowledgePoints, masteryList] = await Promise.all([
        getUserStats(userId),
        getUserPracticeRecords(userId),
        getErrorNotes(userId),
        getKnowledgePoints(),
        getUserMastery(userId),
      ]);
      void _errorNotes; // 暂未参与聚合，保留以备未来使用

      // 过滤周期内记录
      const periodRecords = records.filter((r) => new Date(r.createdAt).getTime() >= sinceMs);

      // 每日统计
      const dailyMap = new Map<string, { studyMinutes: number; questionsDone: number; correct: number; xpEarned: number }>();
      for (const r of periodRecords) {
        const date = r.createdAt.slice(0, 10);
        const entry = dailyMap.get(date) || { studyMinutes: 0, questionsDone: 0, correct: 0, xpEarned: 0 };
        entry.questionsDone += 1;
        if (r.isCorrect) entry.correct += 1;
        entry.studyMinutes += Math.max(1, Math.round((r.timeSpentMs || 0) / 60000));
        entry.xpEarned += r.isCorrect ? 10 : 0;
        dailyMap.set(date, entry);
      }
      const dailyStats: DailyStat[] = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
          date,
          studyMinutes: v.studyMinutes,
          questionsDone: v.questionsDone,
          correctRate: v.questionsDone > 0 ? Math.round((v.correct / v.questionsDone) * 100) : 0,
          xpEarned: v.xpEarned,
        }));

      // 学科分布
      const subjectMap = new Map<string, { questionsDone: number; correct: number; studyMinutes: number }>();
      for (const r of periodRecords) {
        const entry = subjectMap.get(r.subject) || { questionsDone: 0, correct: 0, studyMinutes: 0 };
        entry.questionsDone += 1;
        if (r.isCorrect) entry.correct += 1;
        entry.studyMinutes += Math.max(1, Math.round((r.timeSpentMs || 0) / 60000));
        subjectMap.set(r.subject, entry);
      }
      const subjectBreakdown: SubjectBreakdown[] = Array.from(subjectMap.entries()).map(([subject, v]) => ({
        subject,
        questionsDone: v.questionsDone,
        correctRate: v.questionsDone > 0 ? Math.round((v.correct / v.questionsDone) * 100) : 0,
        studyMinutes: v.studyMinutes,
      }));

      // 知识点掌握度
      const masteryMap = new Map(masteryList.map((m) => [m.knowledgePointId, m.mastery]));
      const knowledgeMastery: KnowledgeItem[] = knowledgePoints.map((kp) => ({
        knowledgePointId: kp.id,
        name: kp.title,
        subject: kp.subject,
        masteryLevel: masteryMap.get(kp.id) ?? 0,
        timesCorrect: 0,
        timesWrong: 0,
      }));

      // 薄弱/已掌握
      const weakPoints = knowledgeMastery.filter((k) => k.masteryLevel > 0 && k.masteryLevel < 40);
      const strengths = knowledgeMastery.filter((k) => k.masteryLevel >= 80);

      // XP/Level
      const xp = stats?.xp ?? 0;
      const level = stats?.level ?? 1;
      const levelTitle = level >= 10 ? "学霸" : level >= 5 ? "学霸预备" : "初学者";
      const levelThresholds = [0, 100, 200, 350, 500, 700, 950, 1250, 1600, 2000, 2500, 3100, 3800, 4600, 5500, 6500, 7600, 8800, 10000, 12000];
      const curXp = levelThresholds[Math.min(level - 1, levelThresholds.length - 1)] ?? 0;
      const nextXp = levelThresholds[Math.min(level, levelThresholds.length - 1)] ?? curXp + 100;
      const xpToNextLevel = Math.max(0, nextXp - xp);
      const levelProgress = nextXp > curXp ? Math.min(100, Math.round(((xp - curXp) / (nextXp - curXp)) * 100)) : 100;

      const statsSummary = await getPracticeStats(userId);
      const totalCorrect = statsSummary.correct;
      const totalQuestions = statsSummary.total;
      const correctRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

      const report: ReportData = {
        summary: {
          totalStudyHours: Math.round((stats?.totalStudyTimeMs ?? 0) / 3600000),
          totalQuestions,
          correctRate,
          xpGained: xp,
          streakDays: stats?.currentStreak ?? 0,
          currentLevel: level,
          levelTitle,
          xpToNextLevel,
          levelProgress,
        },
        dailyStats,
        subjectBreakdown,
        knowledgeMastery,
        weakPoints,
        strengths,
        recommendations: [], // 简化处理：暂不生成 AI 建议
        period: p,
        generatedAt: new Date().toISOString(),
      };
      setData(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取学习报告时发生错误");
    } finally {
      setLoading(false);
    }
  }

  // ---- 计算图表的最大值（用于条形图高度比例） ----
  const maxStudyMinutes = data
    ? Math.max(...data.dailyStats.map((d) => d.studyMinutes), 1)
    : 1;
  const maxXP = data
    ? Math.max(...data.dailyStats.map((d) => d.xpEarned), 1)
    : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6" data-mode={learningMode}>
      {/* ---- 页面标题 ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            学习报告
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data
              ? `数据更新时间: ${new Date(data.generatedAt).toLocaleString("zh-CN")}`
              : "分析你的学习进度与知识掌握情况"}
          </p>
        </div>

        {/* 时间段选择器 */}
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as Period)}
          className="self-start"
        >
          <TabsList>
            <TabsTrigger value="7d" disabled={loading}>最近7天</TabsTrigger>
            <TabsTrigger value="30d" disabled={loading}>30天</TabsTrigger>
            <TabsTrigger value="90d" disabled={loading}>90天</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ---- 错误状态 ---- */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchReport(period)}
              className="ml-auto shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              重试
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ---- 加载骨架屏 ---- */}
      {loading && <LoadingSkeleton />}

      {/* ---- 数据内容 (有实际学习数据时) ---- */}
      {!loading && !error && data && data.summary.totalQuestions > 0 && (
        <div className="space-y-6">
          {/* ===== 总览卡片 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 总学习时长 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/40">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    总学习时长
                  </span>
                </div>
                <p className="text-xl font-bold mb-1">
                  {data.summary.totalStudyHours}h
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {period === "7d" ? "本周" : period === "30d" ? "本月" : "本季"}累计
                </p>
              </CardContent>
            </Card>

            {/* 答题数量 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/40">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    答题数量
                  </span>
                </div>
                <p className="text-xl font-bold mb-1">
                  {data.summary.totalQuestions}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {data.summary.totalQuestions > 0 ? "持续进步" : "开始练习"}
                </p>
              </CardContent>
            </Card>

            {/* 正确率 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/40">
                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    正确率
                  </span>
                </div>
                <p className="text-xl font-bold mb-1">
                  {data.summary.correctRate}%
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {data.summary.correctRate >= 80
                    ? "优秀"
                    : data.summary.correctRate >= 60
                      ? "良好"
                      : "加油"}
                </p>
              </CardContent>
            </Card>

            {/* 知识点掌握 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/40">
                    <Brain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    知识点掌握
                  </span>
                </div>
                <p className="text-xl font-bold mb-1">
                  {data.knowledgeMastery.filter((k) => k.masteryLevel >= 80).length}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  已掌握 / {data.knowledgeMastery.length} 总计
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="kindergarten-friendly border-primary/30 bg-primary/5">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">🌟</div>
              <p className="text-lg font-semibold mb-1">小朋友，继续加油哦！</p>
              <p className="text-sm text-muted-foreground">
                完成更多练习就能看到详细的学习报告啦～
              </p>
            </CardContent>
          </Card>

          {/* ===== 学习趋势图 ===== */}
          <Card className="complex-chart">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <CardTitle>学习趋势</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.dailyStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
              ) : (
                <div className="space-y-6">
                  {/* 学习时长柱状图 */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                      每日学习时长（分钟）
                    </p>
                    <div className="flex items-end gap-1 h-32">
                      {data.dailyStats.map((day) => {
                        const height = Math.max(
                          4,
                          (day.studyMinutes / maxStudyMinutes) * 100
                        );
                        const hasData = day.studyMinutes > 0;
                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center group relative"
                          >
                            {/* Tooltip */}
                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              {day.date.slice(5)}: {formatMinutes(day.studyMinutes)}
                            </div>
                            <div
                              className={cn(
                                "w-full max-w-[20px] rounded-t-sm transition-all duration-300",
                                hasData
                                  ? "bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 dark:from-blue-400 dark:to-blue-300 dark:hover:from-blue-500 dark:hover:to-blue-400"
                                  : "bg-muted"
                              )}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* X轴标签 (每7天显示一次) */}
                    <div className="flex items-end gap-1 mt-1.5">
                      {data.dailyStats.map((day, i) => {
                        const showLabel =
                          data.dailyStats.length <= 7 ||
                          i % Math.ceil(data.dailyStats.length / 7) === 0;
                        return (
                          <div key={day.date} className="flex-1 text-center">
                            {showLabel && (
                              <span className="text-[10px] text-muted-foreground">
                                {day.date.slice(5)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* XP 获取趋势 */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                      每日获得 XP
                    </p>
                    <div className="flex items-end gap-1 h-16">
                      {data.dailyStats.map((day) => {
                        const height = Math.max(
                          4,
                          (day.xpEarned / maxXP) * 100
                        );
                        const hasData = day.xpEarned > 0;
                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center group relative"
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              +{day.xpEarned} XP
                            </div>
                            <div
                              className={cn(
                                "w-full max-w-[20px] rounded-t-sm transition-all duration-300",
                                hasData
                                  ? "bg-gradient-to-t from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 dark:from-amber-400 dark:to-amber-300 dark:hover:from-amber-500 dark:hover:to-amber-400"
                                  : "bg-muted"
                              )}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 正确率趋势行 */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      每日正确率
                    </p>
                    <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-1">
                      {data.dailyStats
                        .filter((d) => d.questionsDone > 0)
                        .map((day) => (
                          <div
                            key={day.date}
                            className="text-center p-1.5 rounded-md bg-muted/50"
                            title={`${day.date}: ${day.correctRate}%`}
                          >
                            <span className="text-[10px] text-muted-foreground block leading-tight">
                              {day.date.slice(5)}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                day.correctRate >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : day.correctRate >= 60
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-red-500 dark:text-red-400"
                              )}
                            >
                              {day.correctRate}%
                            </span>
                          </div>
                        ))}
                      {data.dailyStats.filter((d) => d.questionsDone > 0).length === 0 && (
                        <p className="text-xs text-muted-foreground col-span-full text-center py-4">
                          暂无答题数据
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== 正确率趋势 + 知识掌握雷达 ===== */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 学科分布 */}
            <Card className="complex-chart">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <CardTitle>学科分布</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {data.subjectBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">暂无学科数据</p>
                ) : (
                  <div className="space-y-3">
                    {data.subjectBreakdown.map((subject) => {
                      const totalQ = data.subjectBreakdown.reduce(
                        (s, sb) => s + sb.questionsDone,
                        0
                      );
                      const barWidth = totalQ > 0
                        ? Math.round((subject.questionsDone / totalQ) * 100)
                        : 0;

                      return (
                        <div
                          key={subject.subject}
                          className="rounded-lg p-3 bg-muted/30 border border-border"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant="outline"
                              className={getSubjectBadgeClass(subject.subject)}
                            >
                              {subject.subject}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatMinutes(subject.studyMinutes)}
                            </span>
                          </div>

                          <div className="flex items-end gap-3 mb-2">
                            <span
                              className={cn(
                                "text-2xl font-bold",
                                subject.correctRate >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : subject.correctRate >= 60
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {subject.correctRate}%
                            </span>
                            <span className="text-xs text-muted-foreground pb-1">
                              正确率
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground mb-2">
                            {subject.questionsDone} 题
                          </p>

                          {/* 占比进度条 */}
                          <Progress value={barWidth} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            占总题量 {barWidth}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 知识点掌握度雷达 */}
            <Card className="complex-chart">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <CardTitle>知识点掌握度</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {data.knowledgeMastery.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">暂无知识点数据</p>
                ) : (
                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
                    {data.knowledgeMastery.map((item) => (
                      <div
                        key={item.knowledgePointId}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {item.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                              {item.subject}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <ProgressRing value={item.masteryLevel} size={48} strokeWidth={4} gradient={getMasteryGradient(item.masteryLevel)} label={<span className="text-[10px] font-bold tabular-nums">{item.masteryLevel}%</span>} className="shrink-0" />
                            <span className={cn(
                              "text-xs font-medium",
                              item.masteryLevel >= 80 ? "text-emerald-600 dark:text-emerald-400"
                              : item.masteryLevel >= 60 ? "text-blue-600 dark:text-blue-400"
                              : item.masteryLevel >= 40 ? "text-amber-600 dark:text-amber-400"
                              : "text-red-500 dark:text-red-400"
                            )}>
                              {item.masteryLevel}%
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 shrink-0", getMasteryBadgeClass(item.masteryLevel))}
                        >
                          {getMasteryLabel(item.masteryLevel)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===== 薄弱知识点 + 已掌握知识点 ===== */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* 薄弱知识点 */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <CardTitle>薄弱知识点</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {data.weakPoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    暂无薄弱知识点记录
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.weakPoints.map((wp) => (
                      <div
                        key={wp.knowledgePointId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-red-50/60 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {wp.name}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                              {wp.subject}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <ProgressRing value={wp.masteryLevel} size={48} strokeWidth={4} gradient={getMasteryGradient(wp.masteryLevel)} label={<span className="text-[10px] font-bold tabular-nums">{wp.masteryLevel}%</span>} className="shrink-0" />
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                              {wp.masteryLevel}%
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 shrink-0", getMasteryBadgeClass(wp.masteryLevel))}
                        >
                          {getMasteryLabel(wp.masteryLevel)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 已掌握知识点 */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <CardTitle>已掌握知识点</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {data.strengths.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    暂无已掌握知识点记录
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.strengths.map((s) => (
                      <div
                        key={s.knowledgePointId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {s.name}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                              {s.subject}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <ProgressRing value={s.masteryLevel} size={48} strokeWidth={4} gradient={getMasteryGradient(s.masteryLevel)} label={<span className="text-[10px] font-bold tabular-nums">{s.masteryLevel}%</span>} className="shrink-0" />
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {s.masteryLevel}%
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] px-1.5 py-0 shrink-0"
                        >
                          已掌握
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===== AI 学习建议 ===== */}
          <Alert className="border-primary/20 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle className="text-sm font-semibold">AI 学习建议</AlertTitle>
            <AlertDescription>
              {data.recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">暂无建议</p>
              ) : (
                <div className="space-y-3 mt-3">
                  {data.recommendations.map((rec, i) => {
                    const typeConfig = {
                      review: {
                        icon: BookOpen,
                        label: "复习",
                        iconBg: "bg-blue-100 dark:bg-blue-900/40",
                        iconColor: "text-blue-600 dark:text-blue-400",
                      },
                      practice: {
                        icon: GraduationCap,
                        label: "练习",
                        iconBg: "bg-purple-100 dark:bg-purple-900/40",
                        iconColor: "text-purple-600 dark:text-purple-400",
                      },
                      challenge: {
                        icon: Zap,
                        label: "挑战",
                        iconBg: "bg-amber-100 dark:bg-amber-900/40",
                        iconColor: "text-amber-600 dark:text-amber-400",
                      },
                    };
                    const config = typeConfig[rec.type];
                    const Icon = config.icon;

                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 rounded-lg bg-background border border-border"
                      >
                        <div
                          className={cn(
                            "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                            config.iconBg
                          )}
                        >
                          <Icon className={cn("w-5 h-5", config.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium">
                              {rec.topic}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 shrink-0",
                                rec.priority === "high"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                                  : rec.priority === "medium"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                                    : "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {rec.priority === "high"
                                ? "高优先级"
                                : rec.priority === "medium"
                                  ? "中优先级"
                                  : "低优先级"}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {rec.reason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </AlertDescription>
          </Alert>

          {/* ===== 额外统计信息 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 获得XP */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/40">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    获得XP
                  </span>
                </div>
                <p className="text-xl font-bold mb-1">
                  +{data.summary.xpGained}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Lv.{data.summary.currentLevel} {data.summary.levelTitle}
                </p>
              </CardContent>
            </Card>

            {/* 连续天数 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-900/40">
                    <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    连续天数
                  </span>
                </div>
                <p className="text-xl font-bold mb-1">
                  {data.summary.streakDays}天
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {data.summary.streakDays >= 7 ? "保持连胜" : "继续坚持"}
                </p>
              </CardContent>
            </Card>

            {/* 当前等级 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40">
                    <Star className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    当前等级
                  </span>
                </div>
                <p className="text-xl font-bold mb-1">
                  Lv.{data.summary.currentLevel}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  距下一级 {data.summary.xpToNextLevel} XP
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ---- 数据为空（无错误但 summary 全为 0） ---- */}
      {!loading && !error && data && data.summary.totalQuestions === 0 && (
        <EmptyState />
      )}
    </div>
  );
}
