/**
 * Task 10: SM-2 间隔重复算法（简化版）
 *
 * 用于 Anki 式错题复习卡片。基于 SuperMemo SM-2，做了如下简化：
 * - 'again' 不降低 ease（避免反复答错导致 ease 跌入谷底）
 * - 'hard' / 'easy' 仅线性调整 ease（±0.15）
 * - 'good' 保持 ease 不变
 * - ease 范围限制在 [1.3, 3.0]
 *
 * 间隔规则：
 * - again: 间隔归 0，立即再次到期
 * - 1 次答对: 1 天
 * - 2 次答对: 3 天
 * - 之后: round(interval * ease)
 * - easy 额外乘 1.3
 */

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface SM2State {
  ease: number;        // 难度系数，初始 2.5，范围 1.3-3.0
  interval: number;    // 间隔天数，初始 0
  repetitions: number; // 连续答对次数，初始 0
  dueDate: number;     // 下次到期时间戳（ms）
}

/**
 * 根据当前 SM-2 状态与用户评分计算下一次复习状态。
 *
 * @param state 当前状态（ease / interval / repetitions / dueDate）
 * @param rating 用户评分：again / hard / good / easy
 * @returns 新的 SM-2 状态
 */
export function calculateNextReview(state: SM2State, rating: ReviewRating): SM2State {
  const now = Date.now();
  let { ease, interval, repetitions } = state;

  if (rating === 'again') {
    repetitions = 0;
    interval = 0;
    // ease 不变（简化版不降低 ease）
  } else {
    // 调整 ease
    if (rating === 'hard') ease = Math.max(1.3, ease - 0.15);
    else if (rating === 'easy') ease = Math.min(3.0, ease + 0.15);
    // 'good' 保持 ease 不变

    repetitions += 1;

    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * ease);

    if (rating === 'easy') interval = Math.round(interval * 1.3);
  }

  const dueDate = now + interval * 24 * 60 * 60 * 1000;
  return { ease, interval, repetitions, dueDate };
}

/**
 * 判断错题是否到期需要复习。
 *
 * @param state SM-2 状态
 * @returns true 表示已到期（dueDate <= now）
 */
export function isDue(state: Pick<SM2State, 'dueDate'>): boolean {
  return Date.now() >= state.dueDate;
}
