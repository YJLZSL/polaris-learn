import { create } from "zustand";

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
}

export const useUserStore = create<UserState>((set) => ({
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
