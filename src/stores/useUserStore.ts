import { create } from "zustand";
import { getCurrentUser } from "@/lib/services/auth-service";
import { getUserStats } from "@/lib/repositories/gamification.repository";

interface UserState {
  id: string | null;
  name: string | null;
  email: string | null;
  grade: string | null;
  learningMode: string;
  xp: number;
  level: number;
  streak: number;
  avatar: string | null;
  weakPoints: string[];
  setUser: (user: Partial<UserState>) => void;
  addXP: (amount: number) => void;
  clearUser: () => void;
  initFromAuth: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  id: null,
  name: null,
  email: null,
  grade: null,
  learningMode: "PRIMARY",
  xp: 0,
  level: 1,
  streak: 0,
  avatar: null,
  weakPoints: [],
  setUser: (user) => set((state) => ({ ...state, ...user })),
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
      id: null, name: null, email: null, grade: null, learningMode: "PRIMARY",
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
      const stats = await getUserStats(user.id);
      set({
        id: user.id,
        name: user.name,
        email: user.email,
        grade: user.grade,
        learningMode: user.learningMode,
        avatar: user.avatar ?? null,
        xp: stats?.xp ?? 0,
        level: stats?.level ?? 1,
        streak: stats?.currentStreak ?? 0,
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
