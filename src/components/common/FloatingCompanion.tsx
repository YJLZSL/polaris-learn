import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LearningCompanion, {
  getBubbleMessage,
  getCompanionForm,
  getCompanionMood,
  getFormProgress,
  FORM_NAMES,
  FORM_MILESTONES,
} from "@/components/common/LearningCompanion";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { getCurrentUser } from "@/lib/services/auth-service";
import { useUserStore } from "@/stores/useUserStore";
import { cn } from "@/lib/utils";

/**
 * Task 13.7: FloatingCompanion —— 首页右下角常驻小灵
 *
 * 固定在视窗右下角（移动端避开 MobileNav）。
 * 点击展开气泡：显示形态名、心情、距下一里程碑进度、温暖文案。
 *
 * 数据来源：
 * - streak / recentAchievement：useUserStore（已在 initFromAuth 中同步）
 * - totalStudyHours：getCurrentUser()（Task 13.3 新增字段）
 *
 * 用法：
 *   <FloatingCompanion />   // 直接渲染，自带 fixed 定位
 */
export default function FloatingCompanion() {
  const safeMotion = useSafeMotion();
  const streak = useUserStore((s) => s.streak);
  const userId = useUserStore((s) => s.id);

  const [totalStudyHours, setTotalStudyHours] = useState(0);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 拉取累计学习时长（User.totalStudyHours）
  useEffect(() => {
    let active = true;
    async function loadHours() {
      try {
        const user = await getCurrentUser();
        if (active && user) {
          setTotalStudyHours(user.totalStudyHours ?? 0);
        }
      } catch (e) {
        // 静默失败：未登录或读取异常时不阻塞 UI
      }
    }
    loadHours();
    return () => {
      active = false;
    };
  }, [userId]);

  // 点击外部关闭气泡
  useEffect(() => {
    if (!bubbleOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setBubbleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bubbleOpen]);

  const form = getCompanionForm(totalStudyHours);
  const mood = getCompanionMood(streak, false);
  const message = getBubbleMessage(streak, false, form);
  const progress = getFormProgress(totalStudyHours);
  const nextMilestone = FORM_MILESTONES.find((m) => m.from === form);
  const hoursToNext = nextMilestone ? Math.max(0, nextMilestone.hours - totalStudyHours) : 0;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40"
    >
      {/* 气泡 */}
      <AnimatePresence>
        {bubbleOpen && (
          <motion.div
            key="bubble"
            {...safeMotion({
              initial: { opacity: 0, y: 12, scale: 0.9 },
              animate: { opacity: 1, y: 0, scale: 1 },
              exit: { opacity: 0, y: 12, scale: 0.9 },
              transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            })}
            className="absolute bottom-24 right-0 w-64 rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-md p-4 shadow-xl"
            role="dialog"
            aria-label="小灵状态"
          >
            {/* 气泡小三角 */}
            <div className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-b border-r border-border/60 bg-popover/95" />

            <div className="flex items-center gap-2 mb-2">
              <span className="text-base font-semibold text-amber-300">
                {FORM_NAMES[form]}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/20">
                {moodLabel(mood)}
              </span>
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              {message}
            </p>

            {/* 进度条 */}
            {nextMilestone ? (
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>距下一形态</span>
                  <span>{hoursToNext}h</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {FORM_NAMES[form]} → {FORM_NAMES[nextMilestone.to]}（{nextMilestone.hours}h）
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-200/80">
                ✨ 已达成最终形态，星辰璀璨
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 小灵本体（点击展开） */}
      <motion.button
        type="button"
        onClick={() => setBubbleOpen((v) => !v)}
        className="relative flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        aria-label={bubbleOpen ? "收起小灵气泡" : "展开小灵气泡"}
        aria-expanded={bubbleOpen}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* 背景光晕 */}
        <span
          className={cn(
            "absolute inset-0 rounded-full blur-md transition-opacity",
            bubbleOpen ? "opacity-70" : "opacity-40"
          )}
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(251,191,36,0) 70%)",
          }}
        />
        <LearningCompanion
          totalStudyHours={totalStudyHours}
          streak={streak}
          recentAchievement={false}
          size={64}
        />
      </motion.button>
    </div>
  );
}

function moodLabel(mood: string): string {
  switch (mood) {
    case "happy":
      return "开心";
    case "worried":
      return "担心";
    case "cheering":
      return "欢呼";
    default:
      return "平静";
  }
}
