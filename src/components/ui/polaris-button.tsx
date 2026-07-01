import { motion } from "framer-motion";
import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useSafeMotion } from "@/hooks/useSafeMotion";

/**
 * PolarisButton —— 带按压缩放微交互的 Button 包装器
 *
 * 与原生 Button 完全兼容的 props，额外增加 Framer Motion 的 whileTap 反馈。
 * 尊重 prefers-reduced-motion：无障碍偏好下禁用动画。
 */
const PolarisButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    const safeMotion = useSafeMotion();

    return (
      <motion.div
        {...safeMotion({ whileTap: { scale: 0.97 } })}
        className="inline-flex"
        style={{ display: "inline-flex" }}
      >
        <Button ref={ref} {...props}>
          {children}
        </Button>
      </motion.div>
    );
  }
);
PolarisButton.displayName = "PolarisButton";

export { PolarisButton };
