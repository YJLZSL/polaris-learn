import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp } from "@/lib/motion";
import { useSafeMotion } from "@/hooks/useSafeMotion";

interface PageTransitionProps {
  children: ReactNode;
  /** 当前页面的 key（保留以兼容调用方；同时用作 motion.div 的 key，路由切换时重挂载以重播入场动画） */
  pageKey?: string;
}

/**
 * Polaris V2: 页面转场包装器
 *
 * 去表演化：仅"淡入 + 上移 8px"，使用 fadeUp variant。
 * 尊重 prefers-reduced-motion：由 useSafeMotion 做无障碍降级。
 *
 * 用法：
 *   <PageTransition pageKey={location.pathname}>
 *     <Outlet />
 *   </PageTransition>
 */
export default function PageTransition({
  children,
  pageKey,
}: PageTransitionProps) {
  const safeMotion = useSafeMotion();
  return (
    <motion.div
      key={pageKey}
      {...safeMotion({ ...fadeUp, initial: "hidden", animate: "show" })}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
