import type { Variants, Transition } from "framer-motion";

/**
 * Polaris animation presets — reusable across the app.
 * Import these instead of inlining motion props for consistency.
 */

// Polaris 标准缓动曲线 — iOS 风格弹性
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

// Page transition: fade + slight slide up (300ms ease-out-expo)
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransitionProps = {
  initial: "initial",
  animate: "animate",
  exit: "exit",
  variants: pageTransition,
  transition: { duration: 0.3, ease: EASE_OUT_EXPO } as Transition,
};

// Stagger container — wraps lists so children animate in sequence
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

// List item: fade in + slide up (staggered by parent container)
export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT_EXPO },
  },
};

// Card hover — spring lift (use on motion.div wrappers around cards)
export const cardHover = {
  whileHover: {
    y: -4,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
};

// Button tap — subtle scale down
export const buttonTap = {
  whileTap: { scale: 0.97 },
};

// Simple fade in
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

// Scale in (for modals, popovers, badges)
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EASE_OUT_EXPO },
  },
};

// Slide in from left (for sidebar sheets, drawers)
export const slideInLeft: Variants = {
  hidden: { x: -20, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: EASE_OUT_EXPO },
  },
};

// Slide in from right (for sheets, drawers on the right side)
export const slideInRight: Variants = {
  hidden: { x: 20, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: EASE_OUT_EXPO },
  },
};

// Slide in from bottom (for message bubbles, toasts)
export const slideInBottom: Variants = {
  hidden: { y: 16, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: EASE_OUT_EXPO },
  },
};
