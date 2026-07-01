/**
 * Polaris V2 学段定义 —— 从 5 档简化为 3 档（YOUTH / TEEN / ADULT）。
 * 仅保留 prompt 风格，不再含视觉相关配置（圆角 / 字号 / 插画密度 / 游戏化强度）。
 * 视觉语言统一为"安静单色"，由 index.css 全局负责。
 */

export type LearningMode = 'YOUTH' | 'TEEN' | 'ADULT';

export interface LearningModeConfig {
  id: LearningMode;
  label: string;
  description: string;
  promptStyle: string; // 用于 ai-service.ts 的 prompt 风格
}

export const LEARNING_MODES: LearningModeConfig[] = [
  {
    id: 'YOUTH',
    label: '少年',
    description: '小学与初中阶段，用词浅显，多用比喻',
    promptStyle: 'youth',
  },
  {
    id: 'TEEN',
    label: '青少年',
    description: '高中阶段，适度专业术语，结合考纲',
    promptStyle: 'teen',
  },
  {
    id: 'ADULT',
    label: '成人',
    description: '大学与职场，直接专业，注重实用',
    promptStyle: 'adult',
  },
];

const LEARNING_MODE_MAP: Record<LearningMode, LearningModeConfig> = Object.fromEntries(
  LEARNING_MODES.map((m) => [m.id, m])
) as Record<LearningMode, LearningModeConfig>;

/**
 * 将任意字符串（含旧 5 档 ID）迁移为合法的 LearningMode。
 * - 旧值 KINDERGARTEN/ELEMENTARY/PRIMARY → YOUTH
 * - 旧值 MIDDLE/MIDDLE_HIGH/HIGH → TEEN
 * - 旧值 COLLEGE/PROFESSIONAL → ADULT
 * - 已是新值 → 原样返回
 * - 未知值 / 空 → 默认 TEEN（青少年）
 */
export function migrateLearningMode(oldMode: string | undefined | null): LearningMode {
  if (!oldMode) return 'TEEN';
  const migrationMap: Record<string, LearningMode> = {
    KINDERGARTEN: 'YOUTH',
    ELEMENTARY: 'YOUTH',
    PRIMARY: 'YOUTH',
    MIDDLE: 'TEEN',
    MIDDLE_HIGH: 'TEEN',
    HIGH: 'TEEN',
    COLLEGE: 'ADULT',
    PROFESSIONAL: 'ADULT',
    // 新值直接通过
    YOUTH: 'YOUTH',
    TEEN: 'TEEN',
    ADULT: 'ADULT',
  };
  return migrationMap[oldMode] || 'TEEN';
}

export function getLearningModeConfig(mode: string | undefined | null): LearningModeConfig {
  const migrated = migrateLearningMode(mode);
  return LEARNING_MODE_MAP[migrated] || LEARNING_MODES[1];
}
