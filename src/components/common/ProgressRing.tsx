import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

/**
 * Task 4: ProgressRing —— SVG 环形进度组件
 *
 * 特性：
 * - SVG ring + motion.circle + strokeDashoffset 动画（Task 4.2）
 * - 集成 useCountUp 实现数字 count-up（Task 4.3）
 * - 支持渐变描边（SVG linearGradient）（Task 4.4）
 *
 * 用法：
 *   <ProgressRing value={75} />
 *   <ProgressRing value={xp} size={140} gradient={{ from: "#fbbf24", to: "#f59e0b" }} label={<span>Lv.5</span>} />
 */
export interface ProgressRingProps {
  /** 进度值 0-100 */
  value: number;
  /** 直径（px），默认 120 */
  size?: number;
  /** 描边宽度（px），默认 8 */
  strokeWidth?: number;
  /** 渐变描边（不传则使用 text-primary 实色） */
  gradient?: { from: string; to: string; id?: string };
  /** 中心自定义内容（不传则显示百分比 count-up） */
  label?: React.ReactNode;
  /** 附加类名 */
  className?: string;
  /** count-up 动画时长（秒），默认 0.8 */
  duration?: number;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  gradient,
  label,
  className,
  duration = 0.8,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;
  const displayValue = useCountUp(clampedValue, duration);
  // 稳定的 gradient id（避免每次渲染变化导致 SVG 引用失效）
  const gradientId =
    gradient?.id || `progress-ring-grad-${size}-${Math.round(clampedValue)}`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="img"
        aria-label={`进度 ${Math.round(clampedValue)}%`}
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradient.from} />
              <stop offset="100%" stopColor={gradient.to} />
            </linearGradient>
          </defs>
        )}
        {/* 背景圆轨道 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* 进度圆 —— motion.circle + strokeDashoffset 动画（Task 4.2） */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradient ? `url(#${gradientId})` : "currentColor"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration, ease: "easeOut" }}
          className={gradient ? undefined : "text-primary"}
        />
      </svg>
      {/* 中心内容（Task 4.3: 默认显示 count-up 百分比） */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label !== undefined ? (
          label
        ) : (
          <span className="text-lg font-semibold tabular-nums">
            {Math.round(displayValue)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default ProgressRing;
