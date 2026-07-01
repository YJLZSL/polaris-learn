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
  xp: number;
  level: number;
  streak: number;
  avatar: string | null;
  weakPoints: string[];
  // learningMode 接受 string 以兼容外部 string 入参，内部自动迁移为 LearningMode
  setUser: (user: Partial<Omit<UserState, "learningMode"> & { learningMode?: string }>) => void;
  addXP: (amount: number) => void;
  clearUser: () => void;
  initFromAuth: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  id: null,
  name: null,
  email: null,
  grade: null,
  learningMode: "YOUTH",
  xp: 0,
  level: 1,
  streak: 0,
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
  addXP: (amount) =>
    set((state) => {
      const newXP = state.xp + amount;
      let newLevel = state.level;
      const thresholds = [0, 100, 200, 350, 500, 700, 950, 1250, 1600, 2000, 2500, 3100, 3800, 4600, 5500, 6500, 7600, 8800, 10000, 12000];
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (newXP >= thresholds[i]) {
          newLevel = i + 1;
          break;
        }
      }
      return { xp: newXP, level: newLevel };
    }),
  clearUser: () =>
    set({
      id: null, name: null, email: null, grade: null, learningMode: "YOUTH",
      xp: 0, level: 1, streak: 0, avatar: null, weakPoints: [],
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
      // Polaris V2: gamification.repository 已移除，不再拉取 xp/level/streak
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

interface GameState {
  comboCount: number;
  todayXP: number;
  dailyChallengeDone: boolean;
  showLevelUp: boolean;
  levelUpInfo: { oldLevel: number; newLevel: number } | null;
  setComboCount: (count: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  addTodayXP: (amount: number) => void;
  setDailyChallengeDone: (done: boolean) => void;
  triggerLevelUp: (oldLevel: number, newLevel: number) => void;
  clearLevelUp: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  comboCount: 0,
  todayXP: 0,
  dailyChallengeDone: false,
  showLevelUp: false,
  levelUpInfo: null,
  setComboCount: (count) => set({ comboCount: count }),
  incrementCombo: () => set((s) => ({ comboCount: s.comboCount + 1 })),
  resetCombo: () => set({ comboCount: 0 }),
  addTodayXP: (amount) => set((s) => ({ todayXP: s.todayXP + amount })),
  setDailyChallengeDone: (done) => set({ dailyChallengeDone: done }),
  triggerLevelUp: (oldLevel, newLevel) =>
    set({ showLevelUp: true, levelUpInfo: { oldLevel, newLevel } }),
  clearLevelUp: () => set({ showLevelUp: false, levelUpInfo: null }),
}));
