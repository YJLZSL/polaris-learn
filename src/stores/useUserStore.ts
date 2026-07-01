import { create } from "zustand";
import { getCurrentUser } from "@/lib/services/auth-service";
import { type LearningMode, migrateLearningMode } from "@/lib/learning-modes";

interface UserState {
  id: string | null;
  name: string | null;
  email: string | null;
  grade: string | null;
  /** Task 1.4：learningMode 强类型为 5 学段联合，setUser 内部自动迁移旧值 */
  learningMode: LearningMode;
  avatar: string | null;
  weakPoints: string[];
  // learningMode 接受 string 以兼容外部 string 入参，内部自动迁移为 LearningMode
  setUser: (user: Partial<Omit<UserState, "learningMode"> & { learningMode?: string }>) => void;
  clearUser: () => void;
  initFromAuth: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  id: null,
  name: null,
  email: null,
  grade: null,
  learningMode: "YOUTH",
  avatar: null,
  weakPoints: [],
  setUser: (user) =>
    set((state) => {
      const next = { ...state, ...user } as UserState;
      if (user.learningMode !== undefined) {
        next.learningMode = migrateLearningMode(user.learningMode);
      }
      return next;
    }),
  clearUser: () =>
    set({
      id: null, name: null, email: null, grade: null, learningMode: "YOUTH",
      avatar: null, weakPoints: [],
    }),
  /**
   * 从本地 auth-service 拉取当前用户并同步到 store。
   * 用于 dashboard 页面挂载时初始化（替代原 fetch("/api/user/profile")）。
   * 多页面调用是幂等的：若 store 已有 id 则直接返回。
   */
  initFromAuth: async () => {
    if (get().id) return;
    try {
      const user = await getCurrentUser();
      if (!user) return;
      // Polaris V2: 仅同步基础资料，不再含任何游戏化字段
      set({
        id: user.id,
        name: user.name,
        email: user.email,
        grade: user.grade,
        learningMode: migrateLearningMode(user.learningMode),
        avatar: user.avatar ?? null,
      });
    } catch (e) {
      console.error("[useUserStore] initFromAuth failed:", e);
    }
  },
}));

