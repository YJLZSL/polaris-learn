/**
 * Task 12: 每日任务系统 repository
 *
 * 设计要点：
 * - 任务模板（QUEST_TEMPLATES）固定 5 个，每日随机抽 3 个生成实例
 * - 实例存于 `daily_quests` store，主键 `${userId}_${date}_${templateId}` 保证幂等
 * - 进度更新通过 `updateQuestProgress(userId, templateId, delta)` 增量推进
 * - progress >= target 时自动标记 completed=true 并发放星光奖励（仅一次，幂等）
 * - 全部完成时 `claimChest(userId)` 触发宝箱掉落：随机徽章碎片 + 星光
 *
 * 与其他模块的契约：
 * - 答对题目：调用 updateQuestProgress(userId, 'correct_answers', 1)
 * - 完成知识节点：调用 updateQuestProgress(userId, 'complete_node', 1)
 * - 消灭错题：调用 updateQuestProgress(userId, 'eliminate_errors', 1)
 * - 与 AI 对话：调用 updateQuestProgress(userId, 'ai_chat', 1)
 * - 专注分钟：调用 updateQuestProgress(userId, 'focus_minutes', minutes)
 */

import { getByKey, put, queryByIndex } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';
import { addStarlight } from './currency.repository';
import { getUserById, updateUser } from './user.repository';
import { STARLIGHT_REWARDS } from '@/lib/game';

/** 任务模板 ID（语义化短名，便于其他模块引用） */
export type QuestTemplateId =
  | 'complete_node'
  | 'eliminate_errors'
  | 'focus_minutes'
  | 'ai_chat'
  | 'correct_answers';

export interface QuestTemplate {
  id: QuestTemplateId;
  title: string;
  description: string;
  target: number;
  /** 奖励：单个任务完成时产出 */
  reward: {
    starlight: number;
    crystal?: number;
    /** 该任务可掉落的徽章碎片类型（可选，宝箱统一掉落） */
    badgeFragment?: string;
  };
  /** lucide 图标名（组件侧映射到具体 Icon） */
  icon: string;
  /** 单位文案，如「分钟」「道」「轮」 */
  unit: string;
}

/**
 * Task 12.2: 任务模板池
 * 每日随机抽 3 个生成实例。
 */
export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'complete_node',
    title: '攻克新节点',
    description: '完成 1 个新知识节点的学习',
    target: 1,
    reward: { starlight: STARLIGHT_REWARDS.questComplete },
    icon: 'Network',
    unit: '个',
  },
  {
    id: 'eliminate_errors',
    title: '错题消灭战',
    description: '消灭 5 道错题，查漏补缺',
    target: 5,
    reward: { starlight: STARLIGHT_REWARDS.questComplete },
    icon: 'Sword',
    unit: '道',
  },
  {
    id: 'focus_minutes',
    title: '专注时刻',
    description: '累计专注学习 15 分钟',
    target: 15,
    reward: { starlight: STARLIGHT_REWARDS.questComplete },
    icon: 'Timer',
    unit: '分钟',
  },
  {
    id: 'ai_chat',
    title: '与 AI 老师对话',
    description: '与 AI 老师对话 3 轮',
    target: 3,
    reward: { starlight: STARLIGHT_REWARDS.questComplete },
    icon: 'MessageSquare',
    unit: '轮',
  },
  {
    id: 'correct_answers',
    title: '答对题目',
    description: '答对 10 道题目',
    target: 10,
    reward: { starlight: STARLIGHT_REWARDS.questComplete },
    icon: 'CheckCircle',
    unit: '道',
  },
];

/** 每日生成的任务数量 */
export const DAILY_QUEST_COUNT = 3;

/** 宝箱掉落徽章碎片类型池（按稀有度） */
const BADGE_FRAGMENT_POOL = [
  { type: 'common_ore', label: '普通矿石', weight: 50 },
  { type: 'rare_gem', label: '稀有宝石', weight: 30 },
  { type: 'epic_crystal', label: '史诗晶石', weight: 15 },
  { type: 'legendary_shard', label: '传说碎片', weight: 5 },
] as const;

export interface DailyQuest {
  /** 主键：`${userId}_${date}_${templateId}` */
  id: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  templateId: QuestTemplateId;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  /** 奖励是否已发放（避免重复发放） */
  rewarded: boolean;
  reward: {
    starlight: number;
    crystal?: number;
    badgeFragment?: string;
  };
  icon: string;
  unit: string;
  createdAt: string;
  /** 任务完成时间（用于排序展示） */
  completedAt?: string;
}

/** 宝箱掉落结果 */
export interface ChestDrop {
  starlight: number;
  fragments: { type: string; label: string; count: number }[];
}

/* ---------- 内部工具 ---------- */

/** 取当日 YYYY-MM-DD（本地时区） */
export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fisher–Yates 洗牌 */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 加权随机抽取碎片 */
function rollFragment(): { type: string; label: string } {
  const total = BADGE_FRAGMENT_POOL.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of BADGE_FRAGMENT_POOL) {
    r -= f.weight;
    if (r <= 0) return { type: f.type, label: f.label };
  }
  // 兜底
  const fallback = BADGE_FRAGMENT_POOL[0];
  return { type: fallback.type, label: fallback.label };
}

function questId(userId: string, date: string, templateId: QuestTemplateId): string {
  return `${userId}_${date}_${templateId}`;
}

/* ---------- 对外 API ---------- */

/**
 * Task 12.3: 生成当日任务（幂等）。
 * 若当日已生成则跳过；否则随机抽 DAILY_QUEST_COUNT 个模板创建实例。
 */
export async function generateDailyQuests(userId: string): Promise<DailyQuest[]> {
  const date = getTodayDate();
  const existing = await getTodayQuests(userId);
  if (existing.length > 0) {
    return existing;
  }
  const picked = shuffle(QUEST_TEMPLATES).slice(0, DAILY_QUEST_COUNT);
  const now = new Date().toISOString();
  const quests: DailyQuest[] = picked.map((tpl) => ({
    id: questId(userId, date, tpl.id),
    userId,
    date,
    templateId: tpl.id,
    title: tpl.title,
    description: tpl.description,
    target: tpl.target,
    progress: 0,
    completed: false,
    rewarded: false,
    reward: { ...tpl.reward },
    icon: tpl.icon,
    unit: tpl.unit,
    createdAt: now,
  }));
  await Promise.all(quests.map((q) => put(STORES.DAILY_QUESTS, q)));
  return quests;
}

/**
 * 读取用户当日任务列表（按生成顺序稳定返回）。
 */
export async function getTodayQuests(userId: string): Promise<DailyQuest[]> {
  const date = getTodayDate();
  const all = await queryByIndex<DailyQuest>(STORES.DAILY_QUESTS, 'userId', userId);
  return all
    .filter((q) => q.date === date)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/**
 * Task 12.4/12.5: 增量更新任务进度。
 * - delta > 0：进度增加（封顶 target）
 * - 达成 target 时自动标记 completed=true 并发放星光奖励（幂等，仅一次）
 * - 返回更新后的任务（若不存在则返回 undefined）
 *
 * 供其他模块调用示例：
 *   await updateQuestProgress(userId, 'correct_answers', 1);
 */
export async function updateQuestProgress(
  userId: string,
  templateId: QuestTemplateId,
  delta: number
): Promise<DailyQuest | undefined> {
  if (!Number.isFinite(delta) || delta === 0) return undefined;
  const date = getTodayDate();
  const quest = await getByKey<DailyQuest>(
    STORES.DAILY_QUESTS,
    questId(userId, date, templateId)
  );
  if (!quest) return undefined;
  if (quest.completed) return quest; // 已完成，忽略后续增量

  const nextProgress = Math.min(quest.target, Math.max(0, quest.progress + delta));
  if (nextProgress === quest.progress) return quest;
  quest.progress = nextProgress;

  // 达成判定：进度封顶后自动完成并发放奖励（幂等）
  if (quest.progress >= quest.target && !quest.completed) {
    quest.completed = true;
    quest.rewarded = true;
    quest.completedAt = new Date().toISOString();
    await put(STORES.DAILY_QUESTS, quest);
    // 发放星光奖励（写货币流水）
    if (quest.reward.starlight > 0) {
      await addStarlight(userId, quest.reward.starlight, `每日任务完成：${quest.title}`);
    }
  } else {
    await put(STORES.DAILY_QUESTS, quest);
  }
  return quest;
}

/**
 * 判定当日任务是否全部完成（用于触发宝箱）。
 */
export async function areAllQuestsCompleted(userId: string): Promise<boolean> {
  const quests = await getTodayQuests(userId);
  if (quests.length === 0) return false;
  return quests.every((q) => q.completed);
}

/**
 * Task 12.7: 领取宝箱奖励。
 * - 仅当当日任务全部完成且未领取过时触发
 * - 随机掉落 1-3 个徽章碎片 + 固定星光奖励
 * - 碎片写入 user.badgeFragments（自动累加同类型计数）
 *
 * 返回掉落结果；若不满足条件返回 null。
 *
 * TODO: 碎片合成稀有徽章的逻辑在后续任务实现，此处仅入库累计。
 */
export async function claimChest(userId: string): Promise<ChestDrop | null> {
  const allDone = await areAllQuestsCompleted(userId);
  if (!allDone) return null;

  // 通过 user.chestClaimedDate 标记幂等（避免重复领取当日宝箱）
  const user = await getUserById(userId);
  if (!user) return null;
  const today = getTodayDate();
  if (user.chestClaimedDate === today) return null;

  // 随机掉落 1-3 个碎片
  const fragmentCount = 1 + Math.floor(Math.random() * 3); // 1..3
  const fragments: { type: string; label: string; count: number }[] = [];
  for (let i = 0; i < fragmentCount; i++) {
    const rolled = rollFragment();
    const existing = fragments.find((f) => f.type === rolled.type);
    if (existing) {
      existing.count += 1;
    } else {
      fragments.push({ type: rolled.type, label: rolled.label, count: 1 });
    }
  }

  // 宝箱固定星光奖励（区别于单个任务奖励）
  const chestStarlight = 30;

  // 写入 user.badgeFragments（累加计数）
  const currentFragments = user.badgeFragments ?? [];
  for (const f of fragments) {
    const found = currentFragments.find((x) => x.type === f.type);
    if (found) {
      found.count += f.count;
    } else {
      currentFragments.push({ type: f.type, count: f.count });
    }
  }
  user.badgeFragments = currentFragments;
  user.chestClaimedDate = today;
  await updateUser(user);

  // 星光产出（写货币流水）
  await addStarlight(userId, chestStarlight, '每日任务宝箱奖励');

  return { starlight: chestStarlight, fragments };
}

/**
 * 读取用户当前累计的徽章碎片（按类型聚合，count 倒序）。
 */
export async function getBadgeFragments(
  userId: string
): Promise<{ type: string; count: number }[]> {
  const user = await getUserById(userId);
  return (user?.badgeFragments ?? []).slice().sort((a, b) => b.count - a.count);
}
