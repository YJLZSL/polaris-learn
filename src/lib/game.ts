export const LEVEL_THRESHOLDS: { level: number; xpRequired: number; title: string }[] = [
  { level: 1, xpRequired: 0, title: "学习新手" },
  { level: 2, xpRequired: 100, title: "学习新手" },
  { level: 3, xpRequired: 200, title: "学习新手" },
  { level: 4, xpRequired: 350, title: "学习新手" },
  { level: 5, xpRequired: 500, title: "学习新手" },
  { level: 6, xpRequired: 700, title: "学习达人" },
  { level: 7, xpRequired: 950, title: "学习达人" },
  { level: 8, xpRequired: 1250, title: "学习达人" },
  { level: 9, xpRequired: 1600, title: "学习达人" },
  { level: 10, xpRequired: 2000, title: "学习达人" },
  { level: 11, xpRequired: 2500, title: "学霸" },
  { level: 12, xpRequired: 3100, title: "学霸" },
  { level: 13, xpRequired: 3800, title: "学霸" },
  { level: 14, xpRequired: 4600, title: "学霸" },
  { level: 15, xpRequired: 5500, title: "学霸" },
  { level: 16, xpRequired: 6500, title: "大师" },
  { level: 17, xpRequired: 7600, title: "大师" },
  { level: 18, xpRequired: 8800, title: "大师" },
  { level: 19, xpRequired: 10000, title: "大师" },
  { level: 20, xpRequired: 12000, title: "大师" },
];

export const XP_REWARDS = {
  dailyChallenge: 50,
  correctAnswer: 10,
  hardCorrectAnswer: 30,
  completeCourse: 100,
  combo3: 20,
  combo5: 40,
  combo10: 100,
  helpClassmate: 50,
  streakBonus: 25,
  errorEliminated: 30,
  perfectScore: 50,
};

export const STREAK_MILESTONES = [
  { days: 7, name: "铜徽章", icon: "🥉", xpBonus: 100 },
  { days: 30, name: "银徽章", icon: "🥈", xpBonus: 500 },
  { days: 100, name: "金徽章", icon: "🥇", xpBonus: 2000 },
  { days: 365, name: "钻石徽章", icon: "💎", xpBonus: 10000 },
];

/**
 * Task 15.2: 双货币产出规则
 *
 * 设计原则（避免反模式）：
 * - 星光（starlight）：锚定 mastery 进步的日常货币，每个动作产出固定，无随机倍率
 * - 晶核（crystal）：仅里程碑/稀有成就产出，避免高频变动奖励与多巴胺赌博机效应
 * - 不引入错误惩罚机制（无红心扣血）；消耗仅用于容错道具与个性化占位
 *
 * 产出场景对照 SubTask 15.1 中货币产出场景清单：
 *  - dailyChallenge / questComplete：每日任务完成
 *  - nodeMastered：知识节点掌握
 *  - errorEliminated：错题消灭
 *  - focusMinutes：专注时长达成（按 15 分钟一档结算，避免每分钟发奖）
 */
export const STARLIGHT_REWARDS = {
  dailyChallenge: 30,
  questComplete: 20,        // 单个每日任务完成
  nodeMastered: 25,         // 知识节点掌握度跨档（60/80/100）
  errorEliminated: 10,      // 消灭一道错题
  focusMinutes: 15,         // 每完成 15 分钟专注
  perfectScore: 40,         // 单次练习全对
  streakDailyBonus: 10,     // 连胜每日额外奖励（与 XP 的 streakBonus 区分）
};

export const CRYSTAL_REWARDS = {
  streak7: 1,               // 7 天里程碑
  streak30: 3,              // 30 天里程碑
  streak100: 10,            // 100 天里程碑
  streak365: 30,            // 365 天里程碑
  levelUpScholar: 2,        // 升入学霸段（Lv 11）
  levelUpMaster: 5,         // 升入大师段（Lv 16）
  rareBadgeUnlocked: 1,     // 解锁稀有及以上徽章
  perfectWeek: 5,           // 一周全勤（7/7 日均达成日目标）
};

/**
 * Task 15.2: 货币消耗规则（占位接口，商店具体实现见后续任务）
 * - freezeCard: 购买冻结卡（断签容错），价低，鼓励持有
 * - contentUnlock: 解锁特殊内容（扩展题包/讲解）
 * - cosmetic: 个性化装扮（仅占位）
 */
export const CURRENCY_COSTS = {
  freezeCard: 50,           // 星光购买冻结卡
  contentUnlock: 5,         // 晶核解锁特殊内容
  cosmetic: 20,             // 晶核装扮（占位）
};

/**
 * Task 15.5: 连胜里程碑保护盾奖励
 * 触发时机：currentStreak 命中 days 时发放 shieldCount 张保护盾。
 * 保护盾用途：未来"专注心流护盾"（Task 14）兜底，避免偶发中断扣分。
 */
export const STREAK_SHIELD_MILESTONES = [
  { days: 7, shields: 1, crystal: CRYSTAL_REWARDS.streak7 },
  { days: 30, shields: 2, crystal: CRYSTAL_REWARDS.streak30 },
  { days: 100, shields: 3, crystal: CRYSTAL_REWARDS.streak100 },
];

export function getLevelInfo(xp: number) {
  let currentLevel = LEVEL_THRESHOLDS[0];
  let nextLevel = LEVEL_THRESHOLDS[1];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xpRequired) {
      currentLevel = LEVEL_THRESHOLDS[i];
      nextLevel = LEVEL_THRESHOLDS[i + 1] || LEVEL_THRESHOLDS[i];
      break;
    }
  }

  const xpInLevel = xp - currentLevel.xpRequired;
  const xpNeeded = nextLevel.xpRequired - currentLevel.xpRequired;
  const progress = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    xp,
    xpToNextLevel: xpNeeded - xpInLevel,
    progress,
    nextLevel: nextLevel.level,
  };
}

export function calculateXPForAnswer(
  difficulty: number,
  correct: boolean,
  comboCount: number
): number {
  if (!correct) return 0;
  let xp = difficulty === 3 ? XP_REWARDS.hardCorrectAnswer : XP_REWARDS.correctAnswer;

  if (comboCount >= 10) xp += XP_REWARDS.combo10;
  else if (comboCount >= 5) xp += XP_REWARDS.combo5;
  else if (comboCount >= 3) xp += XP_REWARDS.combo3;

  return xp;
}

export const DEFAULT_BADGES = [
  { name: "数学之星", description: "数学知识点掌握度达到80%", icon: "🔢", category: "knowledge", rarity: "rare", condition: "math_mastery_80" },
  { name: "语文才子", description: "语文知识点掌握度达到80%", icon: "📝", category: "knowledge", rarity: "rare", condition: "chinese_mastery_80" },
  { name: "英语达人", description: "英语知识点掌握度达到80%", icon: "🌍", category: "knowledge", rarity: "rare", condition: "english_mastery_80" },
  { name: "初出茅庐", description: "完成第一次AI对话学习", icon: "🌱", category: "achievement", rarity: "common", condition: "first_ai_chat" },
  { name: "坚持不懈", description: "连续学习7天", icon: "🔥", category: "achievement", rarity: "common", condition: "streak_7" },
  { name: "学习达人", description: "答对100道题", icon: "🎯", category: "achievement", rarity: "uncommon", condition: "correct_100" },
  { name: "乐于助人", description: "帮助10位同学", icon: "🤝", category: "social", rarity: "uncommon", condition: "help_10" },
  { name: "全勤之星", description: "连续学习30天", icon: "⭐", category: "achievement", rarity: "rare", condition: "streak_30" },
  { name: "知识猎手", description: "消灭50道错题", icon: "🏹", category: "achievement", rarity: "rare", condition: "eliminate_50" },
  { name: "学霸认证", description: "达到学霸等级", icon: "👑", category: "rank", rarity: "epic", condition: "level_11" },
  { name: "满分选手", description: "单次练习全对", icon: "💯", category: "achievement", rarity: "uncommon", condition: "perfect_score" },
  { name: "早鸟先锋", description: "早上6点前开始学习", icon: "🌅", category: "behavior", rarity: "common", condition: "early_bird" },
];
