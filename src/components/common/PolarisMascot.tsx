import { motion } from "framer-motion";
import type { JSX } from "react";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { EASE_OUT, DURATION_STANDARD } from "@/lib/motion";

/**
 * Polaris V2: PolarisMascot —— 北极星小灵（单一静态形态）
 *
 * 去表演化：删除 4 形态进化与多情绪规则。
 * 仅保留一个 SVG 北极星形象 + 3 态情绪（默认 / 专注 / 困意）。
 *
 * 微动效（由 useSafeMotion 做无障碍降级）：
 * - 呼吸：scale [1, 1.03, 1]，3s 循环
 * - 浮动：y [0, -4, 0]，2.5s 循环
 * - 眨眼：眼睛 scaleY [1, 0.1, 1]，每 5s 一次（sleepy 时不眨眼）
 *
 * 用法：
 *   <PolarisMascot size={64} mood="default" />
 *   <PolarisMascot mood={isLoading ? "focus" : "default"} />
 */
export type MascotMood = "default" | "focus" | "sleepy";

interface PolarisMascotProps {
  /** 直径（px），默认 64（首页 64 / AI 老师页 96 / 空状态 128）
   * （内部由 LearningCompanion 按 position 自动决定，独立使用时手动传入） */
  size?: number;
  mood?: MascotMood;
  className?: string;
}

// 各 mood 的眨眼 keyframes（null 表示该 mood 不眨眼）
const BLINK_KEYFRAMES: Record<MascotMood, number[] | null> = {
  default: [1, 1, 0.1, 1, 1],
  focus: [0.6, 0.6, 0.1, 0.6, 0.6],
  sleepy: null,
};

// 各 mood 的静态眼睛 scaleY（用于非眨眼态或 sleepy）
const EYE_BASE_SCALE_Y: Record<MascotMood, number> = {
  default: 1,
  focus: 0.6,
  sleepy: 0.3,
};

// 各 mood 的嘴巴 SVG（default 微笑 / focus 嘴角更平 / sleepy 微笑偏平）
const MOUTH: Record<MascotMood, JSX.Element> = {
  default: (
    <path
      d="M40 58 Q50 63, 60 58"
      stroke="#1e1b4b"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  ),
  focus: (
    <path
      d="M42 59 Q50 60, 58 59"
      stroke="#1e1b4b"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  ),
  sleepy: (
    <path
      d="M42 60 Q50 62, 58 60"
      stroke="#1e1b4b"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  ),
};

const moodLabel: Record<MascotMood, string> = {
  default: "默认",
  focus: "专注",
  sleepy: "困意",
};

export default function PolarisMascot({
  size = 64,
  mood = "default",
  className,
}: PolarisMascotProps) {
  const safeMotion = useSafeMotion();
  const blinkKeyframes = BLINK_KEYFRAMES[mood];

  // 眨眼动画：5s 周期，前 40% 时间静止，中段快速眨眼，后段静止
  const eyeMotion = blinkKeyframes
    ? safeMotion({
        animate: { scaleY: blinkKeyframes },
        transition: {
          duration: 5,
          times: [0, 0.4, 0.42, 0.44, 1],
          repeat: Infinity,
          ease: EASE_OUT,
        },
      })
    : safeMotion({
        animate: { scaleY: EYE_BASE_SCALE_Y[mood] },
        transition: { duration: DURATION_STANDARD, ease: EASE_OUT },
      });

  return (
    <motion.div
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        position: "relative",
      }}
      {...safeMotion({
        animate: {
          scale: [1, 1.03, 1],
          y: [0, -4, 0],
        },
        transition: {
          scale: { duration: 3, repeat: Infinity, ease: EASE_OUT },
          y: { duration: 2.5, repeat: Infinity, ease: EASE_OUT },
        },
      })}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={`Polaris 小灵 · ${moodLabel[mood]}`}
      >
        <defs>
          <radialGradient id="polaris-mascot-glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id="polaris-mascot-star"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* 光晕 */}
        <circle cx="50" cy="50" r="45" fill="url(#polaris-mascot-glow)" />

        {/* 五角星主体 */}
        <path
          d="M50 15 L58 38 L82 38 L63 53 L70 76 L50 62 L30 76 L37 53 L18 38 L42 38 Z"
          fill="url(#polaris-mascot-star)"
          stroke="#f59e0b"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* 眼睛（眨眼 / 微眯 / 半闭） */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          {...eyeMotion}
        >
          <circle cx="40" cy="45" r="3" fill="#1e1b4b" />
          <circle cx="60" cy="45" r="3" fill="#1e1b4b" />
        </motion.g>

        {/* 嘴巴 */}
        {MOUTH[mood]}
      </svg>

      {/* sleepy：旁边浮动 "Z" 字符 */}
      {mood === "sleepy" && (
        <motion.span
          aria-hidden
          style={{
            position: "absolute",
            top: "8%",
            right: "0%",
            fontSize: size * 0.28,
            color: "#6366f1",
            fontWeight: 700,
            lineHeight: 1,
            pointerEvents: "none",
          }}
          {...safeMotion({
            animate: { y: [0, -6, 0], opacity: [0.5, 1, 0.5] },
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: EASE_OUT,
            },
          })}
        >
          Z
        </motion.span>
      )}
    </motion.div>
  );
}
