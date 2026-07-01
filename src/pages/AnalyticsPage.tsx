import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Target, AlertTriangle, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/useUserStore";
import { getUserPracticeRecords } from "@/lib/repositories/practice.repository";
import { getUserMastery } from "@/lib/repositories/knowledge.repository";
import { getErrorNotes } from "@/lib/repositories/error-notes.repository";
import { getStudyStats } from "@/lib/game";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { fadeUp, staggerContainer } from "@/lib/motion";

/* ---- 设计常量：北极星靛蓝单色系 ---- */
const INDIGO = "#6366F1"; // 主色
const INDIGO_LIGHT = "#818CF8"; // 渐变浅端
const MASTERY_THRESHOLD = 70; // 已掌握阈值（与 knowledge.repository 一致）
const WEEK_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/* ---- 数据类型 ---- */
interface WeeklyDatum {
  label: string;
  minutes: number;
}
interface MonthlyDatum {
  label: string;
  count: number;
}
interface ReviewRate {
  total: number;
  reviewed: number;
  rate: number; // 0-100
}

/* ---- 日期辅助函数 ---- */

/** 获取本周一到周日的 7 个日期（各代表一天，时间归零到当天 00:00） */
function getCurrentWeekDates(): Date[] {
  const now = new Date();
  const day = now.getDay(); // 0=周日, 1=周一, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/** 获取本月各周的起止日期（按自然周切分，标签为 第1周/第2周...） */
function getCurrentMonthWeeks(): { label: string; start: Date; end: Date }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const weeks: { label: string; start: Date; end: Date }[] = [];
  const cursor = new Date(firstDay);
  let weekIdx = 1;
  while (cursor <= lastDay) {
    const end = new Date(cursor);
    end.setDate(cursor.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    if (end > lastDay) end.setTime(lastDay.getTime());
    weeks.push({
      label: `第${weekIdx}周`,
      start: new Date(cursor),
      end: new Date(end),
    });
    cursor.setDate(cursor.getDate() + 7);
    weekIdx++;
  }
  return weeks;
}

/* ============ 图表组件：纯 SVG 自绘 ============ */

/** 本周学习时长趋势 —— 折线图（单色线条 + 浅色填充） */
function WeeklyLineChart({ data }: { data: WeeklyDatum[] }) {
  const W = 720,
    H = 300,
    padT = 24,
    padR = 24,
    padB = 44,
    padL = 48;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.minutes), 30); // 至少 30 分钟刻度
  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW;
  const baseline = padT + plotH;

  const points = data.map((d, i) => ({
    x: padL + stepX * i,
    y: padT + plotH * (1 - d.minutes / max),
    label: d.label,
    minutes: d.minutes,
  }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath =
    `M ${points[0].x} ${baseline} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x} ${baseline} Z`;
  const gridT = [0, 0.5, 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto text-slate-500 dark:text-slate-400"
      role="img"
      aria-label="本周学习时长趋势"
    >
      <defs>
        <linearGradient id="weeklyArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INDIGO} stopOpacity="0.28" />
          <stop offset="100%" stopColor={INDIGO} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 网格线 + Y 轴刻度 */}
      {gridT.map((t, i) => {
        const y = padT + plotH * t;
        const val = Math.round(max * (1 - t));
        return (
          <g key={i}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
              fillOpacity="0.55"
            >
              {val}m
            </text>
          </g>
        );
      })}
      {/* 填充区域 */}
      <path d={areaPath} fill="url(#weeklyArea)" />
      {/* 折线 */}
      <path
        d={linePath}
        fill="none"
        stroke={INDIGO}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 数据点 + tooltip */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={INDIGO}>
            <title>{`${p.label}: ${p.minutes} 分钟`}</title>
          </circle>
        </g>
      ))}
      {/* X 轴标签 */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={H - padB + 22}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          fillOpacity="0.65"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

/** 本月知识点掌握增长 —— 柱状图（单色柱体，圆角顶部） */
function MonthlyBarChart({ data }: { data: MonthlyDatum[] }) {
  const W = 720,
    H = 300,
    padT = 32,
    padR = 24,
    padB = 44,
    padL = 48;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.count), 4); // 至少 4 的刻度
  const slotW = plotW / Math.max(data.length, 1);
  const barW = Math.min(slotW * 0.5, 56);
  const gridT = [0, 0.5, 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto text-slate-500 dark:text-slate-400"
      role="img"
      aria-label="本月知识点掌握增长"
    >
      <defs>
        <linearGradient id="monthlyBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INDIGO_LIGHT} />
          <stop offset="100%" stopColor={INDIGO} />
        </linearGradient>
      </defs>
      {/* 网格线 + Y 轴刻度 */}
      {gridT.map((t, i) => {
        const y = padT + plotH * t;
        const val = Math.round(max * (1 - t));
        return (
          <g key={i}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
              fillOpacity="0.55"
            >
              {val}
            </text>
          </g>
        );
      })}
      {/* 柱体 */}
      {data.map((d, i) => {
        const slotX = padL + slotW * i;
        const barX = slotX + (slotW - barW) / 2;
        const barH = (d.count / max) * plotH;
        const barY = padT + plotH - barH;
        return (
          <g key={i}>
            <rect
              x={barX}
              y={barY}
              width={barW}
              height={Math.max(barH, 2)}
              rx="6"
              ry="6"
              fill="url(#monthlyBar)"
            >
              <title>{`${d.label}: ${d.count} 个`}</title>
            </rect>
            {d.count > 0 && (
              <text
                x={barX + barW / 2}
                y={barY - 8}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill={INDIGO}
              >
                {d.count}
              </text>
            )}
            <text
              x={slotX + slotW / 2}
              y={H - padB + 22}
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
              fillOpacity="0.65"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** 错题复习完成率 —— 环形图（单色环 + 中间百分比） */
function ReviewDonutChart({
  rate,
  reviewed,
  total,
}: {
  rate: number;
  reviewed: number;
  total: number;
}) {
  const size = 200,
    cx = 100,
    cy = 100,
    r = 80,
    sw = 18;
  const C = 2 * Math.PI * r;
  const dash = (rate / 100) * C;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-44 h-44 text-slate-500 dark:text-slate-400"
        role="img"
        aria-label="错题复习完成率"
      >
        <defs>
          <linearGradient id="donutArc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={INDIGO} />
            <stop offset="100%" stopColor={INDIGO_LIGHT} />
          </linearGradient>
        </defs>
        {/* 背景环 */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth={sw}
        />
        {/* 进度环 */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#donutArc)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* 中心百分比 */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill={INDIGO}
        >
          {rate}%
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          fillOpacity="0.6"
        >
          完成率
        </text>
      </svg>
      <p className="mt-3 text-sm text-muted-foreground">
        已复习 <span className="font-semibold text-foreground">{reviewed}</span> / {total} 题
      </p>
    </div>
  );
}

/* ---- 加载骨架屏 ---- */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---- 主组件 ---- */
export default function AnalyticsPage() {
  const safeMotion = useSafeMotion();
  const userId = useUserStore((s) => s.id);
  const initFromAuth = useUserStore((s) => s.initFromAuth);

  const [weeklyData, setWeeklyData] = useState<WeeklyDatum[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyDatum[]>([]);
  const [reviewRate, setReviewRate] = useState<ReviewRate>({
    total: 0,
    reviewed: 0,
    rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    initFromAuth();
  }, [initFromAuth]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!userId) {
          setError("请先登录后再查看学习数据");
          return;
        }
        // 并行拉取 3 组数据
        const [records, mastery, errorNotes] = await Promise.all([
          getUserPracticeRecords(userId),
          getUserMastery(userId),
          getErrorNotes(userId),
        ]);
        if (cancelled) return;

        // ----- 1. 本周学习时长趋势 -----
        const weekDates = getCurrentWeekDates();
        let weekly: WeeklyDatum[] = weekDates.map((d, i) => {
          const dayStart = new Date(d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(d);
          dayEnd.setHours(23, 59, 59, 999);
          const dayRecords = records.filter((r) => {
            const t = new Date(r.createdAt).getTime();
            return t >= dayStart.getTime() && t <= dayEnd.getTime();
          });
          const minutes = dayRecords.reduce(
            (sum, r) => sum + (r.timeSpentMs || 0),
            0,
          );
          return { label: WEEK_LABELS[i], minutes: Math.round(minutes / 60000) };
        });
        // 兜底：若练习记录未带时长，则用 getStudyStats() 的 weekMinutes 分摊到 7 天
        const totalFromRecords = weekly.reduce((s, d) => s + d.minutes, 0);
        const studyStats = getStudyStats();
        if (totalFromRecords === 0 && studyStats.weekMinutes > 0) {
          const nowDay = new Date().getDay();
          const todayColIdx = nowDay === 0 ? 6 : nowDay - 1;
          const todayMin = Math.min(
            studyStats.todayMinutes,
            studyStats.weekMinutes,
          );
          const perOther = Math.round((studyStats.weekMinutes - todayMin) / 6);
          weekly = weekly.map((d, i) => ({
            ...d,
            minutes: i === todayColIdx ? todayMin : perOther,
          }));
        }
        setWeeklyData(weekly);

        // ----- 2. 本月知识点掌握增长 -----
        const monthWeeks = getCurrentMonthWeeks();
        const monthly: MonthlyDatum[] = monthWeeks.map((w) => {
          const count = mastery.filter((m) => {
            if (m.mastery < MASTERY_THRESHOLD) return false;
            const t = new Date(m.updatedAt).getTime();
            return t >= w.start.getTime() && t <= w.end.getTime();
          }).length;
          return { label: w.label, count };
        });
        setMonthlyData(monthly);

        // ----- 3. 错题复习完成率 -----
        const total = errorNotes.length;
        const reviewed = errorNotes.filter(
          (n) => (n.reviewCount ?? 0) > 0 || !!n.lastReviewedAt,
        ).length;
        const rate = total > 0 ? Math.round((reviewed / total) * 100) : 0;
        setReviewRate({ total, reviewed, rate });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "获取学习数据时发生错误");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  return (
    <motion.div
      {...safeMotion({
        initial: "hidden",
        animate: "show",
        variants: fadeUp,
      })}
      className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6"
      style={{ background: "var(--polaris-bg)" }}
    >
      {/* ---- 页面标题 ---- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">学习数据</h1>
        <p className="mt-1 text-sm text-muted-foreground leading-[1.7]">
          关注自己的学习节奏，看见每一周的积累与成长。
        </p>
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
              className="ml-auto shrink-0"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              重试
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ---- 加载骨架屏 ---- */}
      {loading && <LoadingSkeleton />}

      {/* ---- 三个图表卡片 ---- */}
      {!loading && !error && (
        <motion.div
          {...safeMotion({
            variants: staggerContainer,
            initial: "hidden",
            animate: "show",
          })}
          className="space-y-6"
        >
          {/* 1. 本周学习时长趋势（折线图） */}
          <motion.div {...safeMotion({ variants: fadeUp })}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" style={{ color: INDIGO }} />
                  <CardTitle>本周学习时长趋势</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {weeklyData.length > 0 ? (
                  <WeeklyLineChart data={weeklyData} />
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    暂无数据
                  </p>
                )}
                <p className="mt-4 text-xs text-muted-foreground leading-[1.7]">
                  周一到周日的每日学习分钟数，单色折线呈现本周节奏。
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* 2. 本月知识点掌握增长 + 3. 错题复习完成率 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div {...safeMotion({ variants: fadeUp })}>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" style={{ color: INDIGO }} />
                    <CardTitle>本月知识点掌握增长</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {monthlyData.length > 0 ? (
                    <MonthlyBarChart data={monthlyData} />
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      暂无数据
                    </p>
                  )}
                  <p className="mt-4 text-xs text-muted-foreground leading-[1.7]">
                    本月每周新增掌握的知识点数（掌握度 ≥ 70 视为已掌握）。
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...safeMotion({ variants: fadeUp })}>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5" style={{ color: INDIGO }} />
                    <CardTitle>错题复习完成率</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-6">
                  <ReviewDonutChart
                    rate={reviewRate.rate}
                    reviewed={reviewRate.reviewed}
                    total={reviewRate.total}
                  />
                  <p className="mt-4 text-xs text-muted-foreground leading-[1.7] text-center">
                    待复习错题中已复习的比例，复习过的错题才算真正消化。
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
