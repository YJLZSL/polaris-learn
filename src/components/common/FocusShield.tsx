import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  X,
  Coffee,
  Brain,
  Star,
  Zap,
  Clock,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/common/ProgressRing";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { useCountUp } from "@/hooks/useCountUp";
import { useFocusShieldStore } from "@/stores/useFocusShieldStore";
import { useUserStore } from "@/stores/useUserStore";
import { addStarlight } from "@/lib/repositories/currency.repository";
import { updateQuestProgress } from "@/lib/repositories/quest.repository";
import { addXP } from "@/lib/repositories/gamification.repository";
import { toast } from "@/hooks/use-toast";
import { scaleIn, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Task 14: 专注心流护盾 (Focus Flow Shield)
 *
 * 功能：
 * - 25 分钟番茄钟 + 5 分钟休息循环（标准番茄钟）
 * - 三阶段状态机：idle → focusing (25min) → break (5min) → focusing → ...
 * - 心流能量条可视化（ProgressRing + 渐变描边）
 * - 进入专注时 UI 切换深色聚焦态（body.focus-mode）
 * - 全屏覆盖层遮挡非专注元素
 * - 期间屏蔽所有 toast 通知（延后到专注结束）
 * - 结束后集中结算：专注 XP 加成 + 星光 + 每日任务进度
 *
 * 用法：
 *   <FocusShield />                                     // 默认触发按钮
 *   <FocusShield triggerLabel="🛡️ 开始专注" />            // 自定义按钮文案
 *   <FocusShield triggerVariant="outline" />             // 自定义按钮样式
 */

/* ====== 常量 ====== */
const FOCUS_DURATION_MS = 25 * 60 * 1000; // 25 分钟
const BREAK_DURATION_MS = 5 * 60 * 1000; // 5 分钟
const TICK_MS = 1000;

/* ====== 状态机 ====== */
type FocusStatus = "idle" | "focusing" | "break" | "settling";

interface FocusState {
  status: FocusStatus;
  remainingMs: number;
  focusedMs: number;
  completedCycles: number;
}

type FocusAction =
  | { type: "START" }
  | { type: "TICK" }
  | { type: "END_FOCUS" }
  | { type: "CLOSE_SETTLEMENT" };

const initialState: FocusState = {
  status: "idle",
  remainingMs: 0,
  focusedMs: 0,
  completedCycles: 0,
};

function reducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case "START":
      return {
        status: "focusing",
        remainingMs: FOCUS_DURATION_MS,
        focusedMs: 0,
        completedCycles: 0,
      };
    case "TICK": {
      if (state.status === "focusing") {
        const newRemainingMs = state.remainingMs - TICK_MS;
        const newFocusedMs = state.focusedMs + TICK_MS;
        if (newRemainingMs <= 0) {
          // 专注阶段结束 → 进入休息
          return {
            ...state,
            status: "break",
            remainingMs: BREAK_DURATION_MS,
            focusedMs: newFocusedMs,
            completedCycles: state.completedCycles + 1,
          };
        }
        return { ...state, remainingMs: newRemainingMs, focusedMs: newFocusedMs };
      }
      if (state.status === "break") {
        const newRemainingMs = state.remainingMs - TICK_MS;
        if (newRemainingMs <= 0) {
          // 休息结束 → 进入下一轮专注
          return {
            ...state,
            status: "focusing",
            remainingMs: FOCUS_DURATION_MS,
          };
        }
        return { ...state, remainingMs: newRemainingMs };
      }
      return state;
    }
    case "END_FOCUS":
      if (state.status === "focusing" || state.status === "break") {
        return { ...state, status: "settling" };
      }
      return state;
    case "CLOSE_SETTLEMENT":
      return initialState;
    default:
      return state;
  }
}

/* ====== 工具函数 ====== */
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/* ====== useFocusShield hook ====== */
/**
 * Task 14.5: 暴露专注状态给外部组件。
 * toast() 调用已由 use-toast.ts 自动拦截，外部直接调用 toast() 即可。
 */
export function useFocusShield() {
  const isActive = useFocusShieldStore((s) => s.isActive);
  return { isActive };
}

/* ====== 结算数据类型 ====== */
interface Settlement {
  focusedMinutes: number;
  starlight: number;
  xpBonus: number;
}

/* ====== 结算弹窗 ====== */
interface SettlementModalProps {
  settlement: Settlement;
  onClose: () => void;
}

function StatRow({
  icon: Icon,
  label,
  displayValue,
  unit,
  color,
}: {
  icon: LucideIcon;
  label: string;
  displayValue: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`text-lg font-bold tabular-nums ${color}`}>
        {displayValue}
        {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function SettlementModal({ settlement, onClose }: SettlementModalProps) {
  const safeMotion = useSafeMotion();
  const focusedMinutesDisplay = useCountUp(settlement.focusedMinutes, 1.2);
  const starlightDisplay = useCountUp(settlement.starlight, 1.2);
  const xpBonusDisplay = useCountUp(settlement.xpBonus, 1.2);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        {...safeMotion({ variants: scaleIn, initial: "hidden", animate: "show" })}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="专注结算"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-3 shadow-lg shadow-amber-500/30">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">专注结算</h2>
          <p className="text-sm text-muted-foreground mt-1">恭喜完成一次专注！</p>
        </div>

        {/* Stats with count-up */}
        <div className="space-y-3 mb-6">
          <StatRow
            icon={Clock}
            label="专注时长"
            displayValue={`${Math.round(focusedMinutesDisplay)}`}
            unit="分钟"
            color="text-indigo-500"
          />
          <StatRow
            icon={Star}
            label="获得星光"
            displayValue={`+${Math.round(starlightDisplay)}`}
            unit=""
            color="text-amber-500"
          />
          <StatRow
            icon={Zap}
            label="XP 加成"
            displayValue={`+${Math.round(xpBonusDisplay)}`}
            unit=""
            color="text-purple-500"
          />
        </div>

        {/* Close button */}
        <Button onClick={onClose} className="w-full" size="lg" aria-label="完成结算">
          完成
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ====== 主组件 ====== */
export interface FocusShieldProps {
  /** 触发按钮文案 */
  triggerLabel?: string;
  /** 触发按钮样式 */
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  /** 触发按钮尺寸 */
  triggerSize?: "default" | "sm" | "lg" | "icon";
  /** 触发按钮附加类名 */
  triggerClassName?: string;
  /** 用户 ID（不传则从 useUserStore 获取） */
  userId?: string;
}

export default function FocusShield({
  triggerLabel = "🛡️ 开始专注",
  triggerVariant = "outline",
  triggerSize = "default",
  triggerClassName = "",
  userId,
}: FocusShieldProps) {
  const safeMotion = useSafeMotion();
  const storeUserId = useUserStore((s) => s.id);
  const effectiveUserId = userId ?? storeUserId ?? "";

  const enableFocus = useFocusShieldStore((s) => s.enableFocus);
  const disableFocus = useFocusShieldStore((s) => s.disableFocus);
  const flushToasts = useFocusShieldStore((s) => s.flushToasts);

  const [state, dispatch] = useReducer(reducer, initialState);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const settledRef = useRef(false);

  /* ---------- 计时器：focusing / break 时每秒 tick ---------- */
  useEffect(() => {
    if (state.status !== "focusing" && state.status !== "break") return;
    const timer = setInterval(() => {
      dispatch({ type: "TICK" });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [state.status]);

  /* ---------- 全局 isActive + body.focus-mode 同步 ---------- */
  useEffect(() => {
    const active = state.status === "focusing" || state.status === "break";
    if (active) {
      enableFocus();
      document.body.classList.add("focus-mode");
    } else {
      disableFocus();
      document.body.classList.remove("focus-mode");
    }
    return () => {
      document.body.classList.remove("focus-mode");
    };
  }, [state.status, enableFocus, disableFocus]);

  /* ---------- 组件卸载时清理全局状态 ---------- */
  useEffect(() => {
    return () => {
      useFocusShieldStore.getState().disableFocus();
      document.body.classList.remove("focus-mode");
    };
  }, []);

  /* ---------- 结算逻辑：status → settling 时触发 ---------- */
  useEffect(() => {
    if (state.status !== "settling") return;
    if (settledRef.current) return;
    settledRef.current = true;

    // 专注结束后一次性 flush 被拦截的 toast（错峰 200ms）
    const queued = flushToasts();
    queued.forEach((t, i) => {
      setTimeout(() => toast(t as Parameters<typeof toast>[0]), (i + 1) * 200);
    });

    const focusedMinutes = Math.floor(state.focusedMs / 60000);
    if (focusedMinutes < 1) {
      // 专注不足 1 分钟，跳过结算
      dispatch({ type: "CLOSE_SETTLEMENT" });
      return;
    }

    const starlight = focusedMinutes * 3;
    const xpBonus = Math.round(focusedMinutes * 1.5);
    setSettlement({ focusedMinutes, starlight, xpBonus });

    // 调用奖励 API
    const uid = effectiveUserId;
    if (uid) {
      Promise.all([
        addStarlight(uid, starlight, "专注时长奖励"),
        updateQuestProgress(uid, "focus_minutes", focusedMinutes),
        addXP(uid, xpBonus).catch(() => null),
      ]).catch((e) => console.error("[FocusShield] settlement failed:", e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  /* ---------- handlers ---------- */
  const startFocus = useCallback(() => {
    settledRef.current = false;
    setSettlement(null);
    dispatch({ type: "START" });
  }, []);

  const endFocus = useCallback(() => {
    dispatch({ type: "END_FOCUS" });
  }, []);

  const closeSettlement = useCallback(() => {
    setSettlement(null);
    dispatch({ type: "CLOSE_SETTLEMENT" });
  }, []);

  /* ---------- 派生值 ---------- */
  const isFocusing = state.status === "focusing";
  const isBreak = state.status === "break";
  const isOverlayVisible = isFocusing || isBreak;

  const totalMs = isBreak ? BREAK_DURATION_MS : FOCUS_DURATION_MS;
  const energyPercent = totalMs > 0 ? (state.remainingMs / totalMs) * 100 : 0;

  const gradient = isBreak
    ? { from: "#10b981", to: "#06b6d4", id: "focus-shield-break" }
    : { from: "#a855f7", to: "#3b82f6", id: "focus-shield-focus" };

  const statusLabel = isBreak ? "休息中" : "专注中";
  const StatusIcon = isBreak ? Coffee : Brain;

  /* ---------- 渲染 ---------- */
  return (
    <>
      {/* 触发按钮 */}
      <Button
        onClick={startFocus}
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        aria-label="开始专注"
        disabled={isOverlayVisible}
      >
        <Shield className="w-4 h-4 mr-1.5" />
        {triggerLabel}
      </Button>

      {/* 全屏覆盖层 */}
      <AnimatePresence>
        {isOverlayVisible && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{
              background: "rgba(10,10,15,0.85)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          >
            {/* 关闭按钮（右上角） */}
            <button
              type="button"
              onClick={endFocus}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="结束专注"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 状态标签 */}
            <motion.div
              {...safeMotion({
                initial: { opacity: 0, y: -8 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.4, ease: EASE_OUT_EXPO },
              })}
              className="flex items-center gap-2 mb-8"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isBreak
                    ? "bg-gradient-to-br from-emerald-400 to-cyan-500"
                    : "bg-gradient-to-br from-purple-500 to-blue-500"
                }`}
              >
                <StatusIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/90 text-sm font-medium uppercase tracking-wider">
                {statusLabel}
              </span>
            </motion.div>

            {/* 心流能量条（ProgressRing + 渐变） */}
            <ProgressRing
              value={energyPercent}
              size={260}
              strokeWidth={14}
              gradient={gradient}
              duration={0.8}
              label={
                <div className="flex flex-col items-center justify-center">
                  <span
                    role="timer"
                    aria-live="off"
                    aria-label={`剩余时间 ${formatTime(state.remainingMs)}`}
                    className="text-2xl font-bold tabular-nums text-white"
                  >
                    {formatTime(state.remainingMs)}
                  </span>
                  <span className="text-[11px] text-white/50 mt-1">
                    {statusLabel}
                  </span>
                </div>
              }
            />

            {/* 已完成番茄钟数 */}
            <div className="mt-8 flex items-center gap-1.5">
              {state.completedCycles > 0 && (
                <span className="text-xs text-white/40">
                  已完成 {state.completedCycles} 个番茄钟
                </span>
              )}
            </div>

            {/* 结束专注按钮 */}
            <Button
              onClick={endFocus}
              variant="secondary"
              size="lg"
              className="mt-6 gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/10"
              aria-label="结束专注并结算"
            >
              <Shield className="w-4 h-4" />
              结束专注
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 结算弹窗 */}
      <AnimatePresence>
        {settlement && (
          <SettlementModal settlement={settlement} onClose={closeSettlement} />
        )}
      </AnimatePresence>
    </>
  );
}
