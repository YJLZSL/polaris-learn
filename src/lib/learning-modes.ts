import { Calculator, BookOpen, Languages, FlaskConical, Microscope, Globe, Baby, GraduationCap, School, Briefcase, Users } from "lucide-react";

/**
 * Polaris 5 学段 ID（Task 1.3 重命名）
 * - KINDERGARTEN / PROFESSIONAL 保留
 * - 新增 ELEMENTARY（小学，旧 PRIMARY）/ MIDDLE（初中，旧 MIDDLE_HIGH 拆分）/ HIGH（高中，旧 COLLEGE）
 */
export type LearningModeId = "KINDERGARTEN" | "ELEMENTARY" | "MIDDLE" | "HIGH" | "PROFESSIONAL";

export interface LearningModeConfig {
  id: LearningModeId;
  label: string;
  description: string;
  icon: typeof Baby;
  color: string; // tailwind gradient classes
  subjectIds: string[]; // 可用学科 id（引用 constants.ts 的 SUBJECTS id）
  difficultyRange: [number, number]; // 难度范围
  uiStyle: "large-rounded-emoji" | "standard" | "compact";
  promptStyle: string; // prompt 风格描述（保留旧值以兼容 ai-service.ts）
  defaultGrade: string;
  // Task 1.3 新增：学段自适应字段（与 CSS --radius-scale / --text-scale / --game-strength 对应）
  radiusScale: number; // rem
  textScale: number; // 字号倍率
  gameStrength: number; // 游戏化强度（0~1.5+）
  illustrationDensity: "high" | "medium" | "low"; // 插画密度
}

export const LEARNING_MODES: LearningModeConfig[] = [
  {
    id: "KINDERGARTEN",
    label: "幼儿园",
    description: "启蒙学习，游戏化互动，语音图像为主",
    icon: Baby,
    color: "from-pink-400 to-rose-400",
    subjectIds: ["math", "chinese"],
    difficultyRange: [1, 2],
    uiStyle: "large-rounded-emoji",
    promptStyle: "kindergarten",
    defaultGrade: "学前",
    radiusScale: 1.25,
    textScale: 1.25,
    gameStrength: 1.5,
    illustrationDensity: "high",
  },
  {
    id: "ELEMENTARY",
    label: "小学",
    description: "基础学科，亲切引导，培养学习兴趣",
    icon: School,
    color: "from-blue-400 to-cyan-400",
    subjectIds: ["math", "chinese", "english"],
    difficultyRange: [1, 3],
    uiStyle: "standard",
    promptStyle: "primary", // 保留旧 promptStyle 值，避免 ai-service.ts 联动改动
    defaultGrade: "四年级",
    radiusScale: 1.0,
    textScale: 1.1,
    gameStrength: 1.0,
    illustrationDensity: "medium",
  },
  {
    id: "MIDDLE",
    label: "初中",
    description: "初中阶段，学术严谨，过渡提升",
    icon: GraduationCap,
    color: "from-indigo-500 to-purple-500",
    subjectIds: ["math", "chinese", "english", "physics", "chemistry", "biology"],
    difficultyRange: [1, 4],
    uiStyle: "standard",
    promptStyle: "middle_high", // 保留旧 promptStyle 值
    defaultGrade: "初二",
    radiusScale: 0.875,
    textScale: 1.0,
    gameStrength: 0.8,
    illustrationDensity: "low",
  },
  {
    id: "HIGH",
    label: "高中",
    description: "高中阶段，备考提升，深度学习",
    icon: Users,
    color: "from-emerald-500 to-teal-500",
    subjectIds: ["math", "chinese", "english", "physics", "chemistry", "biology"],
    difficultyRange: [2, 5],
    uiStyle: "standard",
    promptStyle: "college", // 保留旧 promptStyle 值
    defaultGrade: "高一",
    radiusScale: 0.75,
    textScale: 1.0,
    gameStrength: 0.7,
    illustrationDensity: "low",
  },
  {
    id: "PROFESSIONAL",
    label: "上班族",
    description: "实用导向，碎片化微学习，职业技能提升",
    icon: Briefcase,
    color: "from-amber-500 to-orange-500",
    subjectIds: ["math", "english", "chinese"],
    difficultyRange: [1, 5],
    uiStyle: "compact",
    promptStyle: "professional",
    defaultGrade: "自学",
    radiusScale: 0.5,
    textScale: 0.95,
    gameStrength: 0.5,
    illustrationDensity: "low",
  },
];

export const LEARNING_MODE_MAP: Record<LearningModeId, LearningModeConfig> = Object.fromEntries(
  LEARNING_MODES.map((m) => [m.id, m])
) as Record<LearningModeId, LearningModeConfig>;

/**
 * 旧学段 ID → 新学段 ID 迁移映射（Task 1.4 向后兼容）
 * 旧值 PRIMARY/MIDDLE_HIGH/COLLEGE 自动映射到新值，确保历史用户数据无缝迁移。
 */
const LEGACY_MODE_MAPPING: Record<string, LearningModeId> = {
  PRIMARY: "ELEMENTARY",
  MIDDLE_HIGH: "MIDDLE",
  COLLEGE: "HIGH",
};

const VALID_MODE_IDS: ReadonlySet<string> = new Set([
  "KINDERGARTEN",
  "ELEMENTARY",
  "MIDDLE",
  "HIGH",
  "PROFESSIONAL",
]);

/**
 * 将任意字符串（含旧 ID）迁移为合法的 LearningModeId。
 * - 旧值 PRIMARY/MIDDLE_HIGH/COLLEGE → 新值
 * - 已是新值 → 原样返回
 * - 未知值 → 默认 ELEMENTARY（小学）
 */
export function migrateLearningMode(mode: string): LearningModeId {
  if (LEGACY_MODE_MAPPING[mode]) return LEGACY_MODE_MAPPING[mode];
  if (VALID_MODE_IDS.has(mode)) return mode as LearningModeId;
  return "ELEMENTARY";
}

export function getLearningModeConfig(mode: string): LearningModeConfig {
  const newMode = migrateLearningMode(mode);
  return LEARNING_MODE_MAP[newMode] || LEARNING_MODE_MAP.ELEMENTARY;
}

export function getSubjectsForMode(mode: string): string[] {
  return getLearningModeConfig(mode).subjectIds;
}

export function getDifficultyRangeForMode(mode: string): [number, number] {
  return getLearningModeConfig(mode).difficultyRange;
}
