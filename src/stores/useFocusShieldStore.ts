/**
 * Task 14.5: 专注心流护盾 —— 全局通知拦截 store
 *
 * 设计要点：
 * - `isActive` 标记当前是否处于专注模式（focusing / break 阶段）
 * - 专注期间所有 toast 调用被拦截，推入 `pendingToasts` 队列延后显示
 * - 专注结束时由 FocusShield 组件调用 `flushToasts()` 一次性取出并重放
 * - 与 use-toast.ts 解耦：store 不导入 use-toast，避免循环依赖
 *
 * 用法：
 *   const isActive = useFocusShieldStore(s => s.isActive);
 *   useFocusShieldStore.getState().enableFocus();
 *   useFocusShieldStore.getState().queueToast({ title: "成就解锁", ... });
 *   const queued = useFocusShieldStore.getState().flushToasts();
 */
import { create } from "zustand";
import type { ReactNode } from "react";
import type { ToastProps, ToastActionElement } from "@/components/ui/toast";

/** 被拦截的 toast 快照（与 use-toast.ts 中 Toast 类型结构兼容） */
export interface QueuedToast {
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
  variant?: ToastProps["variant"];
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface FocusShieldState {
  /** 当前是否处于专注模式（focusing / break） */
  isActive: boolean;
  /** 被拦截的 toast 队列 */
  pendingToasts: QueuedToast[];
  /** 进入专注模式 */
  enableFocus: () => void;
  /** 退出专注模式 */
  disableFocus: () => void;
  /** 将一条 toast 推入待显示队列 */
  queueToast: (toast: QueuedToast) => void;
  /** 取出并清空待显示队列（由 FocusShield 在专注结束后重放） */
  flushToasts: () => QueuedToast[];
}

export const useFocusShieldStore = create<FocusShieldState>((set, get) => ({
  isActive: false,
  pendingToasts: [],

  enableFocus: () => set({ isActive: true }),

  disableFocus: () => set({ isActive: false }),

  queueToast: (toast) =>
    set((state) => ({
      pendingToasts: [...state.pendingToasts, toast],
    })),

  flushToasts: () => {
    const queued = get().pendingToasts;
    set({ pendingToasts: [] });
    return queued;
  },
}));
