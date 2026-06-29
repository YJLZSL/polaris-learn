import { Calculator, BookOpen, Languages, FlaskConical, Microscope, Globe, Baby, GraduationCap, School, Briefcase, Users } from "lucide-react";

export type LearningModeId = "KINDERGARTEN" | "PRIMARY" | "MIDDLE_HIGH" | "COLLEGE" | "PROFESSIONAL";

export interface LearningModeConfig {
  id: LearningModeId;
  label: string;
  description: string;
  icon: typeof Baby;
  color: string; // tailwind gradient classes
  subjectIds: string[]; // 可用学科 id（引用 constants.ts 的 SUBJECTS id）
  difficultyRange: [number, number]; // 难度范围
  uiStyle: "large-rounded-emoji" | "standard" | "compact";
  promptStyle: string; // prompt 风格描述
  defaultGrade: string;
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
  },
  {
    id: "PRIMARY",
    label: "小学",
    description: "基础学科，亲切引导，培养学习兴趣",
    icon: School,
    color: "from-blue-400 to-cyan-400",
    subjectIds: ["math", "chinese", "english"],
    difficultyRange: [1, 3],
    uiStyle: "standard",
    promptStyle: "primary",
    defaultGrade: "四年级",
  },
  {
    id: "MIDDLE_HIGH",
    label: "初高中",
    description: "全学科，学术严谨，备考提升",
    icon: GraduationCap,
    color: "from-indigo-500 to-purple-500",
    subjectIds: ["math", "chinese", "english", "physics", "chemistry", "biology"],
    difficultyRange: [1, 5],
    uiStyle: "standard",
    promptStyle: "middle_high",
    defaultGrade: "初二",
  },
  {
    id: "COLLEGE",
    label: "大学生",
    description: "研究式学习，开放探讨，学术写作辅助",
    icon: Users,
    color: "from-emerald-500 to-teal-500",
    subjectIds: ["math", "english", "physics", "chemistry", "biology"],
    difficultyRange: [2, 5],
    uiStyle: "standard",
    promptStyle: "college",
    defaultGrade: "大一",
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
  },
];

export const LEARNING_MODE_MAP: Record<LearningModeId, LearningModeConfig> = Object.fromEntries(
  LEARNING_MODES.map((m) => [m.id, m])
) as Record<LearningModeId, LearningModeConfig>;

export function getLearningModeConfig(mode: string): LearningModeConfig {
  return LEARNING_MODE_MAP[mode as LearningModeId] || LEARNING_MODE_MAP.PRIMARY;
}

export function getSubjectsForMode(mode: string): string[] {
  return getLearningModeConfig(mode).subjectIds;
}

export function getDifficultyRangeForMode(mode: string): [number, number] {
  return getLearningModeConfig(mode).difficultyRange;
}
