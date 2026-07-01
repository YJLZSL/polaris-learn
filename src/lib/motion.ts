import type { Variants } from "framer-motion";

/**
 * Polaris V2 动画预设 —— 安静单色，极简动画系统。
 * 仅保留淡入 / 上移 / 列表入场 / stagger 四类基础动画。
 * 时长统一为两档：instant（150ms）/ standard（300ms）。
 */

/* ---------- Duration tokens ---------- */
export const DURATION_INSTANT = 0.15;
export const DURATION_STANDARD = 0.3;

/* ---------- Easing ---------- */
// Framer Motion 12 的 ease 属性要求驼峰命名（easeOut），而非 CSS 的 kebab-case（ease-out）。
// 此常量仅用于 Framer Motion 的 transition.ease，CSS 的 transition-timing-function 仍用 ease-out。
export const EASE_OUT = "easeOut" as const;

/* ---------- 无障碍降级 ---------- */
// useSafeMotion 实现位于 hooks/useSafeMotion.ts，此处 re-export 以集中动画 API。
export { useSafeMotion } from "../hooks/useSafeMotion";

/* ---------- 基础动画预设 ---------- */

// 淡入 + 上移 8px（时长 300ms）
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_STANDARD, ease: EASE_OUT },
  },
};

// 纯淡入（时长 150ms）
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: DURATION_INSTANT, ease: EASE_OUT },
  },
};

// 列表项入场（淡入 + 上移，时长 300ms）
export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_STANDARD, ease: EASE_OUT },
  },
};

/* ---------- Stagger container ---------- */

// stagger 容器：子项间隔 60ms；子项 > 6 时第 7 项起立即显示
// （通过组件层对超出第 6 项的子元素直接给定 show 态实现，此处仅提供基础节奏）
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};
