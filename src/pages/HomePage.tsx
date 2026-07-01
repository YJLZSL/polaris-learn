import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  MessageSquare,
  RotateCw,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fadeUp, fadeIn, useSafeMotion } from "@/lib/motion";
import LearningCompanion from "@/components/common/LearningCompanion";
import {
  getHomeStats,
  type HomeStats,
} from "@/lib/repositories/home-stats.repository";
import { getCurrentUser } from "@/lib/services/auth-service";
import { getStudyStats } from "@/lib/game";

/* ---------- 鼓励语语料库（30 条） ---------- */
const ENCOURAGEMENTS: string[] = [
  "学习不在多，在于坚持。",
  "今天弄懂一个知识点，就是进步。",
  "慢慢来，比较快。",
  "不懂就问 AI 老师，它一直在。",
  "错题是学习的路标，不是失败的标记。",
  "休息一下，也是学习的一部分。",
  "每一次回顾，都在加固记忆。",
  "不必和别人比，按自己的节奏来。",
  "今天的努力，未来的你会感谢。",
  "学一点，记一点，稳一点。",
  "遇到难题，先想想，再问问。",
  "知识像星空，一颗一颗点亮。",
  "专注当下，结果自然来。",
  "允许自己慢，但不要停。",
  "复习比学新更重要。",
  "把不会的变成会的，就是成长。",
  "学习是一场长跑，不是冲刺。",
  "哪怕只学十分钟，也算数。",
  "不急着求成，先求理解。",
  "今天的错题，明天的得分点。",
  "心静下来，思路就清晰了。",
  "学习路上，有北极星指路，也有小灵陪伴。",
  "每个知识点，都值得认真对待。",
  "不必完美，只要持续。",
  "慢工出细活，学习也一样。",
  "想清楚再动笔，比盲目刷题有效。",
  "学习是给未来的礼物。",
  "一天一点，积少成多。",
  "难的不会，先从简单的开始。",
  "保持好奇心，学习就不会累。",
];

/* ---------- 问候语（按时段） ---------- */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，注意休息";
  if (h < 9) return "早上好";
  if (h < 12) return "上午好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

/* ---------- 日期格式化：2026年7月1日 星期三 ---------- */
function formatDate(): string {
  const d = new Date();
  const weekdays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${
    weekdays[d.getDay()]
  }`;
}

/* ---------- 中部入口配置 ---------- */
interface EntryConfig {
  to: string;
  icon: typeof BookOpen;
  title: string;
  desc: string;
}

const ENTRIES: EntryConfig[] = [
  {
    to: "/knowledge-graph",
    icon: BookOpen,
    title: "继续学习",
    desc: "回到知识星图，继续探索。",
  },
  {
    to: "/ai-teacher",
    icon: MessageSquare,
    title: "问 AI 老师",
    desc: "随时提问，获得耐心解答。",
  },
  {
    to: "/error-notes",
    icon: RotateCw,
    title: "复习错题",
    desc: "巩固薄弱环节，稳步提升。",
  },
];

/* ---------- 组件 ---------- */
export default function HomePage() {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 今日学习分钟：先用本地 getStudyStats 同步初始化，挂载后再与 home-stats 合并
  const [todayMinutes, setTodayMinutes] = useState<number>(() =>
    getStudyStats().todayMinutes
  );
  // 鼓励语：组件挂载时随机取一次
  const [encouragement] = useState<string>(
    () =>
      ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
  );

  const safeMotion = useSafeMotion();

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);
        // initFromAuth 已移至 App 级别处理，此处仅取当前用户与首页聚合数据
        const user = await getCurrentUser();
        const s = await getHomeStats(user);
        setStats(s);
        // 取本地与 home-stats 两者较大值，避免任一来源遗漏
        const localMinutes = getStudyStats().todayMinutes;
        setTodayMinutes(Math.max(s.todayDuration || 0, localMinutes));
      } catch {
        setError("加载首页数据失败，请稍后重试。");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // 渲染用的今日学习时长：优先 stats，回退本地
  const displayMinutes = Math.max(stats?.todayDuration ?? 0, todayMinutes);

  /* ----- 加载态：居中 Skeleton（非 bento-grid） ----- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-polaris-bg px-6">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
    );
  }

  /* ----- 错误态：Alert + 重新加载按钮 ----- */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-polaris-bg px-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>出错了</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                重新加载
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  /* ----- 主渲染：顶部 + 中部三入口 + 底部小灵与鼓励语 ----- */
  return (
    <div className="min-h-screen bg-polaris-bg">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* 顶部区域：问候 / 日期 / 今日学习时长 */}
        <motion.section
          {...safeMotion({
            initial: "hidden",
            animate: "show",
            variants: fadeUp,
          })}
          className="mb-14"
        >
          <h1
            className="text-3xl font-semibold text-polaris-text-primary"
            style={{ lineHeight: 1.4 }}
          >
            {greeting()}
          </h1>
          <p
            className="mt-2 text-sm text-polaris-text-secondary"
            style={{ lineHeight: 1.7 }}
          >
            {formatDate()}
          </p>
          <p
            className="mt-1 text-xs text-polaris-text-muted"
            style={{ lineHeight: 1.7 }}
          >
            今日已学习 {displayMinutes} 分钟
          </p>
        </motion.section>

        {/* 中部区域：三个简洁入口卡片（仅淡入，无 stagger / hover spring） */}
        <section className="mb-20 grid gap-6 sm:grid-cols-3">
          {ENTRIES.map((entry) => {
            const Icon = entry.icon;
            return (
              <motion.div
                key={entry.to}
                {...safeMotion({
                  initial: "hidden",
                  animate: "show",
                  variants: fadeIn,
                })}
              >
                <Link
                  to={entry.to}
                  className="block h-full rounded-xl border border-white/10 bg-polaris-surface p-6 transition-colors hover:border-[var(--polaris-accent)]/40"
                >
                  <Icon
                    className="mb-4 h-6 w-6 text-polaris-accent"
                    strokeWidth={1.75}
                  />
                  <h3
                    className="text-base font-medium text-polaris-text-primary"
                    style={{ lineHeight: 1.5 }}
                  >
                    {entry.title}
                  </h3>
                  <p
                    className="mt-1 text-xs text-polaris-text-secondary"
                    style={{ lineHeight: 1.7 }}
                  >
                    {entry.desc}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </section>

        {/* 底部区域：小灵静态形象 + 随机鼓励语 */}
        <motion.section
          {...safeMotion({
            initial: "hidden",
            animate: "show",
            variants: fadeIn,
          })}
          className="flex flex-col items-center text-center"
        >
          <LearningCompanion size={64} mood="default" position="home" />
          <p
            className="mt-6 max-w-sm text-sm text-polaris-text-secondary"
            style={{ lineHeight: 1.7 }}
          >
            {encouragement}
          </p>
        </motion.section>
      </div>
    </div>
  );
}
