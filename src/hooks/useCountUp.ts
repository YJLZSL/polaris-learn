import { useEffect, useState } from "react";
import { useMotionValue, animate, useReducedMotion } from "framer-motion";

/**
 * Task 3.5: useCountUp
 *
 * 基于 useMotionValue + animate 实现数字 count-up 动画。
 * 当 target 变化时自动从当前值平滑动画到新值。
 *
 * 用法：
 *   const display = useCountUp(xp); // 默认 0.8s easeOut
 *   const display = useCountUp(value, 1.2);
 *
 * 在 prefers-reduced-motion 下直接跳到 target，不播放动画。
 *
 * 常见场景：XP 增加动画、等级数字滚动、统计数字入场。
 */
export function useCountUp(target: number, duration: number = 0.8): number {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const unsubscribe = motionValue.on("change", (v) => {
      setDisplayValue(v);
    });
    return () => unsubscribe();
  }, [motionValue]);

  useEffect(() => {
    // 减少动画偏好下直接跳到目标值
    if (shouldReduce) {
      motionValue.set(target);
      setDisplayValue(target);
      return;
    }
    const controls = animate(motionValue, target, {
      duration,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [target, duration, motionValue, shouldReduce]);

  return displayValue;
}

export default useCountUp;
