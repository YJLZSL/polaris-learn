import { useReducedMotion } from "framer-motion";

/**
 * Task 3.1: useSafeMotion
 *
 * 包裹 motion 组件的动画 props，检测 `prefers-reduced-motion: reduce`：
 * - 用户偏好减少动画时返回空对象，让 motion 组件回退到无动画状态
 * - 否则原样返回传入的 props
 *
 * 用法：
 *   const safeMotion = useSafeMotion();
 *   <motion.div {...safeMotion({ ...fadeUp, initial: "hidden", animate: "show" })} />
 *   <motion.div {...safeMotion({ variants: listItem })} />
 *
 * 注意：Framer Motion 的 useReducedMotion 内部已会让 spring/tween 动画跳过，
 * 本 hook 提供更显式的控制层，便于在需要完全禁用 initial/animate/exit 时使用。
 */
export function useSafeMotion() {
  const shouldReduce = useReducedMotion();

  return function wrap<T extends object>(motionProps: T): T | Record<string, never> {
    if (shouldReduce) return {};
    return motionProps;
  };
}

export default useSafeMotion;
