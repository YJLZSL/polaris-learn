import { motion, AnimatePresence } from "framer-motion";
import type { JSX } from "react";

/**
 * Task 5: PolarisMascot —— 北极星吉祥物组件
 *
 * 拟人化北极星 SVG 形象，作为 AI 导师 persona 入口。
 * 表情：default / happy / worried / cheering / thinking
 *
 * 特性：
 * - 5 种表情 SVG（Task 5.1）
 * - props: mood / size / animated / className（Task 5.2）
 * - AnimatePresence 实现表情 crossfade 过渡（Task 5.3）
 * - idle 呼吸动画（3 秒循环，上下浮动 3px）（Task 5.4）
 *
 * 用法：
 *   <PolarisMascot mood="thinking" size={64} />
 *   <PolarisMascot mood={isLoading ? "thinking" : "default"} />
 */
export type MascotMood = "default" | "happy" | "worried" | "cheering" | "thinking";

interface PolarisMascotProps {
  mood?: MascotMood;
  /** 直径（px），默认 80 */
  size?: number;
  /** 是否启用呼吸动画，默认 true */
  animated?: boolean;
  className?: string;
}

// 各表情的眼睛 SVG 元素
const EYES: Record<MascotMood, JSX.Element> = {
  default: (
    <>
      <circle cx="35" cy="45" r="3" fill="#1e1b4b" />
      <circle cx="65" cy="45" r="3" fill="#1e1b4b" />
    </>
  ),
  happy: (
    <>
      <path d="M30 45 Q35 40, 40 45" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M60 45 Q65 40, 70 45" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  worried: (
    <>
      <circle cx="35" cy="46" r="2.5" fill="#1e1b4b" />
      <circle cx="65" cy="46" r="2.5" fill="#1e1b4b" />
      <path d="M28 40 L42 42" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M72 40 L58 42" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  cheering: (
    <>
      <path d="M30 42 L40 48 M40 42 L30 48" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 42 L70 48 M70 42 L60 48" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  thinking: (
    <>
      <circle cx="35" cy="45" r="3" fill="#1e1b4b" />
      <path d="M60 45 Q65 42, 70 45" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
};

// 各表情的嘴巴 SVG 元素
const MOUTH: Record<MascotMood, JSX.Element> = {
  default: <path d="M40 58 Q50 63, 60 58" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />,
  happy: <path d="M38 55 Q50 68, 62 55" stroke="#1e1b4b" strokeWidth="2" fill="#1e1b4b" strokeLinecap="round" />,
  worried: <circle cx="50" cy="60" r="3" fill="#1e1b4b" />,
  cheering: <ellipse cx="50" cy="60" rx="8" ry="6" fill="#1e1b4b" />,
  thinking: <path d="M45 60 Q52 58, 58 61" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />,
};

// 北极星主体（五角星 + 光晕 + 渐变）
function StarBody() {
  return (
    <>
      <defs>
        <radialGradient id="mascot-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mascot-star" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* 光晕 */}
      <circle cx="50" cy="50" r="45" fill="url(#mascot-glow)" />
      {/* 五角星 */}
      <path
        d="M50 15 L58 38 L82 38 L63 53 L70 76 L50 62 L30 76 L37 53 L18 38 L42 38 Z"
        fill="url(#mascot-star)"
        stroke="#f59e0b"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </>
  );
}

export default function PolarisMascot({
  mood = "default",
  size = 80,
  animated = true,
  className,
}: PolarisMascotProps) {
  return (
    <motion.div
      className={className}
      style={{ width: size, height: size, display: "inline-block" }}
      animate={animated ? { y: [0, -3, 0] } : {}}
      transition={animated ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Polaris ${mood}`}>
        <StarBody />
        <AnimatePresence mode="wait">
          <motion.g
            key={mood}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {EYES[mood]}
            {MOUTH[mood]}
          </motion.g>
        </AnimatePresence>
      </svg>
    </motion.div>
  );
}
