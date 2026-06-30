import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Sword,
  Timer,
  MessageSquare,
  CheckCircle,
  Star,
  Sparkles,
  Gift,
  Check,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { useCountUp } from "@/hooks/useCountUp";
import { useUserStore } from "@/stores/useUserStore";
import { getCurrentUser } from "@/lib/services/auth-service";
import { cn } from "@/lib/utils";
import {
  generateDailyQuests,
  getTodayQuests,
  claimChest,
  type DailyQuest as DailyQuestModel,
  type ChestDrop,
} from "@/lib/repositories/quest.repository";
import { staggerContainer, listItem, scaleIn, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Task 12.4 / 12.5 / 12.6 / 12.7: DailyQuest —— 每日任务卡片
 *
 * 功能：
 * - 显示当日 3 个任务（图标 / 标题 / 描述 / 进度条 / 奖励徽章）
 * - 任务完成时打勾动画（scaleIn + 颜色过渡）+ 星光奖励 count-up
 * - 全部完成时显示宝箱，点击触发挥宝箱开启动画（光芒粒子）
 * - 宝箱开启后展示随机掉落的徽章碎片 + 星光奖励
 *
 * 用法：
 *   <DailyQuest />   // 自管理 userId / 数据加载
 *   <DailyQuest userId="u_xxx" />
 *
 * 数据来源：daily_quests store（Task 12.1），奖励产出经 currency.repository 写流水。
 */

/* ---------- 图标映射 ---------- */
const ICON_MAP: Record<string, LucideIcon> = {
  Network,
  Sword,
  Timer,
  MessageSquare,
  CheckCircle,
};

/* ---------- 单个任务行 ---------- */
interface QuestRowProps {
  quest: DailyQuestModel;
}

function QuestRow({ quest }: QuestRowProps) {
  const safeMotion = useSafeMotion();
  const Icon = ICON_MAP[quest.icon] ?? CheckCircle;
  const percent = Math.min(100, Math.round((quest.progress / quest.target) * 100));
  // count-up 仅在已完成时启用，展示获得的星光数量
  const starlightDisplay = useCountUp(quest.completed ? quest.reward.starlight : 0, 0.8);

  return (
    <motion.div
      variants={listItem}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-xl border transition-colors",
        quest.completed
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border bg-muted/30"
      )}
    >
      {/* 左侧图标（完成时变绿色 + scaleIn） */}
      <motion.div
        variants={scaleIn}
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          quest.completed
            ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
            : "bg-primary/10 text-primary"
        )}
      >
        {quest.completed ? (
          <Check className="w-5 h-5" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </motion.div>

      {/* 中间：标题 + 描述 + 进度条 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium truncate">{quest.title}</p>
          <span className="text-xs tabular-nums text-muted-foreground shrink-0">
            {quest.progress}/{quest.target}
            <span className="ml-1 text-muted-foreground/70">{quest.unit}</span>
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">
          {quest.description}
        </p>
        <Progress
          value={percent}
          className={cn(
            "h-1.5",
            quest.completed && "[&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-teal-500"
          )}
        />
      </div>

      {/* 右侧：奖励徽章（完成时 count-up） */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <AnimatePresence mode="wait">
          {quest.completed ? (
            <motion.div
              key="rewarded"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 gap-1">
                <Star className="w-3 h-3" />
                +{Math.round(starlightDisplay)}
              </Badge>
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Badge variant="outline" className="gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <Star className="w-3 h-3" />
                +{quest.reward.starlight}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 完成时的边缘高亮（颜色过渡） */}
      {quest.completed && (
        <motion.div
          {...safeMotion({
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.5 },
          })}
          className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-emerald-500/30"
          aria-hidden
        />
      )}
    </motion.div>
  );
}

/* ---------- 宝箱 ---------- */
interface TreasureChestProps {
  opened: boolean;
  onOpen: () => void;
}

/** 宝箱 SVG（关闭态：箱体 + 顶盖 + 锁；开启态：顶盖旋转 + 内部光晕） */
function ChestSvg({ opened }: { opened: boolean }) {
  return (
    <svg
      width="120"
      height="100"
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_4px_12px_rgba(245,158,11,0.4)]"
    >
      <defs>
        <linearGradient id="chest-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#713f12" />
        </linearGradient>
        <linearGradient id="chest-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <radialGradient id="chest-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#facc15" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 内部光晕（开启时显示） */}
      {opened && (
        <motion.circle
          cx="60"
          cy="60"
          r="40"
          fill="url(#chest-glow)"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          style={{ transformOrigin: "60px 60px" }}
        />
      )}

      {/* 箱体（底部） */}
      <rect x="15" y="50" width="90" height="40" rx="4" fill="url(#chest-body)" stroke="#451a03" strokeWidth="2" />

      {/* 箱体金属带 */}
      <rect x="15" y="62" width="90" height="4" fill="#fbbf24" opacity="0.6" />
      <rect x="15" y="78" width="90" height="4" fill="#fbbf24" opacity="0.6" />

      {/* 顶盖（开启时旋转） */}
      <motion.g
        initial={false}
        animate={{ rotate: opened ? -45 : 0, y: opened ? -4 : 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        style={{ transformOrigin: "60px 50px" }}
      >
        <path
          d="M15 50 Q15 20 60 20 Q105 20 105 50 Z"
          fill="url(#chest-lid)"
          stroke="#451a03"
          strokeWidth="2"
        />
        <rect x="55" y="30" width="10" height="14" rx="1" fill="#fbbf24" opacity="0.7" />
      </motion.g>

      {/* 锁（关闭时显示） */}
      {!opened && (
        <motion.g
          initial={{ opacity: 1 }}
          animate={{ opacity: opened ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <rect x="54" y="58" width="12" height="14" rx="2" fill="#fbbf24" stroke="#451a03" strokeWidth="1.5" />
          <circle cx="60" cy="65" r="1.5" fill="#451a03" />
        </motion.g>
      )}
    </svg>
  );
}

/** 光芒粒子（多条放射线，开启时 stagger 旋转外扩） */
function RadiantParticles({ count = 12 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 origin-left"
            style={{
              width: 60,
              height: 3,
              background: `linear-gradient(90deg, rgba(253,224,71,0.9), rgba(253,224,71,0))`,
              borderRadius: 999,
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            }}
            initial={{ opacity: 0, scale: 0, x: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.8], x: [0, 60, 80] }}
            transition={{
              duration: 1.2,
              delay: i * 0.04,
              ease: EASE_OUT_EXPO,
              times: [0, 0.4, 1],
            }}
          />
        );
      })}
      {/* 中心爆点 */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300"
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{ width: [0, 120, 80], height: [0, 120, 80], opacity: [0, 0.7, 0] }}
        transition={{ duration: 1, ease: EASE_OUT_EXPO }}
        style={{ filter: "blur(8px)" }}
      />
    </div>
  );
}

function TreasureChest({ opened, onOpen }: TreasureChestProps) {
  const safeMotion = useSafeMotion();
  return (
    <motion.div
      {...safeMotion({
        variants: scaleIn,
        initial: "hidden",
        animate: "show",
      })}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
    >
      <div className="relative flex items-center justify-center w-[120px] h-[100px]">
        {/* 放射粒子仅在开启后渲染 */}
        <AnimatePresence>
          {opened && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <RadiantParticles />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={opened ? undefined : onOpen}
          disabled={opened}
          whileHover={opened ? undefined : { scale: 1.05 }}
          whileTap={opened ? undefined : { scale: 0.95 }}
          className="relative z-10 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg disabled:cursor-default"
          aria-label={opened ? "宝箱已开启" : "点击开启宝箱"}
        >
          <motion.div
            animate={opened ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          >
            <ChestSvg opened={opened} />
          </motion.div>
        </motion.button>
      </div>

      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
        {opened ? "宝箱已开启" : "全部完成！点击开启宝箱"}
      </p>
    </motion.div>
  );
}

/* ---------- 主组件 ---------- */
export interface DailyQuestProps {
  userId?: string;
  /** 可选：外部通知任务完成（用于触发 XPToast 等） */
  onQuestCompleted?: (quest: DailyQuestModel) => void;
  /** 可选：外部通知宝箱开启 */
  onChestOpened?: (drop: ChestDrop) => void;
}

export default function DailyQuest({ userId, onQuestCompleted, onChestOpened }: DailyQuestProps) {
  const safeMotion = useSafeMotion();
  const storeUserId = useUserStore((s) => s.id);
  const effectiveUserId = userId ?? storeUserId ?? "";

  const [quests, setQuests] = useState<DailyQuestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [chestOpened, setChestOpened] = useState(false);
  const [chestDrop, setChestDrop] = useState<ChestDrop | null>(null);
  const [claiming, setClaiming] = useState(false);

  // 加载任务（确保当日已生成）
  const loadQuests = useCallback(async () => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }
    try {
      await generateDailyQuests(effectiveUserId);
      const list = await getTodayQuests(effectiveUserId);
      setQuests(list);
    } catch (e) {
      // 静默失败，不影响首页其他模块
      console.error("[DailyQuest] load quests failed:", e);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // 监听 store userId 变化时重新加载（首次登录后 store 才有 id）
  useEffect(() => {
    if (!effectiveUserId) return;
    // 同步检测当前用户是否已领取当日宝箱
    let active = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!active || !user) return;
        const today = new Date().toISOString().slice(0, 10);
        if (user.chestClaimedDate === today) {
          setChestOpened(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [effectiveUserId]);

  // 定时轮询任务进度（捕获其他模块触发的 updateQuestProgress）
  useEffect(() => {
    if (!effectiveUserId) return;
    const timer = setInterval(async () => {
      try {
        const list = await getTodayQuests(effectiveUserId);
        setQuests((prev) => {
          // 检测新完成的任务，触发回调
          if (onQuestCompleted) {
            for (const q of list) {
              const prevQ = prev.find((p) => p.id === q.id);
              if (q.completed && prevQ && !prevQ.completed) {
                onQuestCompleted(q);
              }
            }
          }
          return list;
        });
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [effectiveUserId, onQuestCompleted]);

  const allCompleted = useMemo(
    () => quests.length > 0 && quests.every((q) => q.completed),
    [quests]
  );

  const handleOpenChest = useCallback(async () => {
    if (!effectiveUserId || chestOpened || claiming) return;
    setClaiming(true);
    try {
      const drop = await claimChest(effectiveUserId);
      if (drop) {
        setChestDrop(drop);
        // 略延迟显示"已开启"状态，让开盖动画先播放
        setTimeout(() => {
          setChestOpened(true);
        }, 300);
        onChestOpened?.(drop);
      }
    } catch (e) {
      console.error("[DailyQuest] claim chest failed:", e);
    } finally {
      setClaiming(false);
    }
  }, [effectiveUserId, chestOpened, claiming, onChestOpened]);

  const completedCount = quests.filter((q) => q.completed).length;
  const todayLabel = new Date().toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });

  /* ---------- 渲染 ---------- */
  return (
    <Card className="relative overflow-hidden">
      {/* 顶部装饰光晕 */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
      <CardContent className="relative z-10 p-5 lg:p-6">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-semibold">每日任务</h2>
            <Badge variant="secondary" className="text-[10px] h-5">
              {todayLabel}
            </Badge>
          </div>
          <Badge
            className={cn(
              "border-0 gap-1 transition-colors",
              allCompleted
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            )}
          >
            {completedCount}/{quests.length || 3}
          </Badge>
        </div>

        {/* 任务列表 */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : quests.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {effectiveUserId ? "今日任务生成中…" : "请先登录查看每日任务"}
          </div>
        ) : (
          <motion.div
            {...safeMotion({
              variants: staggerContainer,
              initial: "hidden",
              animate: "show",
            })}
            className="space-y-2"
          >
            {quests.map((q) => (
              <QuestRow key={q.id} quest={q} />
            ))}
          </motion.div>
        )}

        {/* 宝箱区域 */}
        <AnimatePresence>
          {allCompleted && !loading && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              className="overflow-hidden"
            >
              <TreasureChest opened={chestOpened} onOpen={handleOpenChest} />

              {/* 掉落展示 */}
              <AnimatePresence>
                {chestOpened && chestDrop && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4, ease: EASE_OUT_EXPO }}
                    className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                  >
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      宝箱掉落
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 gap-1">
                        <Star className="w-3 h-3" />
                        +{chestDrop.starlight} 星光
                      </Badge>
                      {chestDrop.fragments.map((f, idx) => (
                        <Badge
                          key={`${f.type}-${idx}`}
                          variant="outline"
                          className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300"
                        >
                          <Sparkles className="w-3 h-3" />
                          {f.label} ×{f.count}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      碎片可在背包中合成稀有徽章（合成系统即将开放）
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
