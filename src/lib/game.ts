/**
 * Polaris V2 游戏化逻辑（极简版）
 * 抛弃商业平台特征（双货币/连胜/徽章/冻结卡/保护盾）
 * 仅保留学习时长统计作为隐式进度
 */

export interface StudyStats {
  totalMinutes: number;
  todayMinutes: number;
  weekMinutes: number;
  lastStudyDate: string | null;
}

const STORAGE_KEY = 'polaris-study-stats';

export function getStudyStats(): StudyStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudyStats;
      return {
        totalMinutes: parsed.totalMinutes || 0,
        todayMinutes: isToday(parsed.lastStudyDate) ? parsed.todayMinutes : 0,
        weekMinutes: parsed.weekMinutes || 0,
        lastStudyDate: parsed.lastStudyDate || null,
      };
    }
  } catch {
    // ignore
  }
  return { totalMinutes: 0, todayMinutes: 0, weekMinutes: 0, lastStudyDate: null };
}

export function recordStudy(minutes: number): StudyStats {
  const current = getStudyStats();
  const updated: StudyStats = {
    totalMinutes: current.totalMinutes + minutes,
    todayMinutes: (isToday(current.lastStudyDate) ? current.todayMinutes : 0) + minutes,
    weekMinutes: current.weekMinutes + minutes,
    lastStudyDate: todayString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr === todayString();
}
