import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { EASE_OUT, DURATION_STANDARD } from "@/lib/motion";
import PolarisMascot, { type MascotMood } from "./PolarisMascot";

/**
 * Polaris V2: LearningCompanion —— 学习伙伴小灵
 *
 * 去表演化：删除 4 形态进化（egg/juvenile/adult/awakened）与多情绪规则。
 * 仅保留 3 态情绪（default / focus / sleepy），由调用方根据上下文显式传入。
 *
 * 小灵仅在以下三个位置出现（由 position prop 控制）：
 * - home：首页右上角小尺寸（≤64px），无气泡（首页底部单独显示鼓励语）
 * - ai-teacher：AI 老师页顶部居中，尺寸 96px，可显示气泡
 * - empty-state：空状态插画居中，尺寸 128px，显示气泡
 *
 * 用法：
 *   <LearningCompanion position="home" />
 *   <LearningCompanion position="ai-teacher" mood="focus" message="正在思考..." />
 *   <LearningCompanion position="empty-state" mood="sleepy" message="还没有内容哦" />
 */
export type CompanionMood = MascotMood;

type CompanionPosition = "home" | "ai-teacher" | "empty-state";

interface LearningCompanionProps {
  /** 直径（px）；未传则按 position 自动决定 */
  size?: number;
  mood?: CompanionMood;
  /** 气泡消息；home 位置不显示气泡，其余位置在 message 非空时显示 */
  message?: string;
  /** 渲染位置，决定布局与默认尺寸 */
  position?: CompanionPosition;
  className?: string;
}

// 各 position 的默认尺寸
const POSITION_SIZE: Record<CompanionPosition, number> = {
  home: 64,
  "ai-teacher": 96,
  "empty-state": 128,
};

// 各 position 的布局 className
const POSITION_LAYOUT: Record<CompanionPosition, string> = {
  home: "inline-flex items-center",
  "ai-teacher": "flex flex-col items-center",
  "empty-state": "flex flex-col items-center",
};

export default function LearningCompanion({
  size,
  mood = "default",
  message,
  position = "home",
  className,
}: LearningCompanionProps) {
  const safeMotion = useSafeMotion();
  const finalSize = size ?? POSITION_SIZE[position];
  // home 位置不显示气泡（首页底部单独显示鼓励语）
  const showBubble = position !== "home" && Boolean(message);

  return (
    <div className={cn("relative", POSITION_LAYOUT[position], className)}>
      <AnimatePresence>
        {showBubble && message && (
          <motion.div
            key={`bubble-${message}`}
            {...safeMotion({
              initial: { opacity: 0, y: 8 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: 8 },
              transition: { duration: DURATION_STANDARD, ease: EASE_OUT },
            })}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-10 w-48"
          >
            <div className="relative rounded-xl bg-polaris-surface-elevated border border-white/10 px-3 py-2 shadow-polaris-elevated">
              <p className="text-xs leading-relaxed text-polaris-text-primary text-center">
                {message}
              </p>
              {/* 气泡小三角 */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-polaris-surface-elevated border-b border-r border-white/10 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PolarisMascot size={finalSize} mood={mood} />
    </div>
  );
}
