/**
 * prisma/seed.ts
 *
 * Polaris 北极星学习平台 - 种子数据脚本
 *
 * 植入内容：
 *   1. 12 个徽章（来自 src/lib/game.ts 的 DEFAULT_BADGES）
 *   2. 基础知识点树（数学/语文/英语/物理/化学/生物）
 *   3. 60 道按学习模式分层的示例题目
 *
 * 运行：npm run db:seed  (等价于 npx prisma db seed)
 *
 * 设计要点：
 *   - 使用 findFirst + create/update 包装实现幂等 upsert（Badge.name 未声明 @unique）
 *   - KnowledgePoint 使用 subject+name+gradeLevel 组合判定唯一性
 *   - Question 使用 content 作为唯一性判定依据
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Prisma 客户端初始化（与 src/lib/prisma.ts 保持一致） ────────────────
function createPrismaClient() {
  const provider = (process.env.DATABASE_PROVIDER || "sqlite").toLowerCase();

  if (provider === "postgresql") {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL 环境变量在 PostgreSQL 模式下必填"
      );
    }
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    return new PrismaClient({ adapter } as never);
  }

  // 默认 SQLite (libsql)
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || "file:./dev.db",
  });
  return new PrismaClient({ adapter } as never);
}

const prisma = createPrismaClient();

// ═══════════════════════════════════════════════════════════════
//  1. 徽章数据（与 src/lib/game.ts 的 DEFAULT_BADGES 同步）
// ═══════════════════════════════════════════════════════════════
const BADGES = [
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
] as const;

// ═══════════════════════════════════════════════════════════════
//  2. 知识点数据（按学科 + 学段组织）
// ═══════════════════════════════════════════════════════════════
interface KnowledgeSeed {
  subject: string;
  gradeLevel: string;
  name: string;
  description: string;
  orderIndex: number;
}

const KNOWLEDGE_POINTS: KnowledgeSeed[] = [
  // ─── 数学 - 小学 ───────────────────────────────
  { subject: "数学", gradeLevel: "小学", name: "加减法", description: "20以内、100以内的加减法运算", orderIndex: 1 },
  { subject: "数学", gradeLevel: "小学", name: "乘除法", description: "九九乘法表与基本除法运算", orderIndex: 2 },
  { subject: "数学", gradeLevel: "小学", name: "分数", description: "分数的概念、比较与简单运算", orderIndex: 3 },
  { subject: "数学", gradeLevel: "小学", name: "小数", description: "小数的意义、比较与四则运算", orderIndex: 4 },
  { subject: "数学", gradeLevel: "小学", name: "几何图形", description: "三角形、四边形、圆等平面图形认识", orderIndex: 5 },

  // ─── 数学 - 初中 ───────────────────────────────
  { subject: "数学", gradeLevel: "初中", name: "方程", description: "一元一次方程、二元一次方程组", orderIndex: 1 },
  { subject: "数学", gradeLevel: "初中", name: "函数", description: "一次函数、二次函数、反比例函数", orderIndex: 2 },
  { subject: "数学", gradeLevel: "初中", name: "三角形", description: "三角形性质、全等与相似", orderIndex: 3 },
  { subject: "数学", gradeLevel: "初中", name: "圆", description: "圆的性质、切线、与圆有关的计算", orderIndex: 4 },
  { subject: "数学", gradeLevel: "初中", name: "概率", description: "概率初步、频率与可能性", orderIndex: 5 },

  // ─── 语文 - 小学 ───────────────────────────────
  { subject: "语文", gradeLevel: "小学", name: "拼音", description: "声母、韵母、整体认读音节", orderIndex: 1 },
  { subject: "语文", gradeLevel: "小学", name: "汉字", description: "常用汉字的认读与书写", orderIndex: 2 },
  { subject: "语文", gradeLevel: "小学", name: "词语", description: "常用词语的理解与运用", orderIndex: 3 },
  { subject: "语文", gradeLevel: "小学", name: "句子", description: "简单句、修辞句、句式变换", orderIndex: 4 },
  { subject: "语文", gradeLevel: "小学", name: "古诗", description: "小学必背古诗词赏析与背诵", orderIndex: 5 },

  // ─── 语文 - 初中 ───────────────────────────────
  { subject: "语文", gradeLevel: "初中", name: "文言文", description: "文言文阅读与翻译技巧", orderIndex: 1 },
  { subject: "语文", gradeLevel: "初中", name: "现代文阅读", description: "记叙文、说明文、议论文阅读理解", orderIndex: 2 },
  { subject: "语文", gradeLevel: "初中", name: "作文", description: "记叙文、议论文写作方法", orderIndex: 3 },
  { subject: "语文", gradeLevel: "初中", name: "修辞手法", description: "比喻、拟人、排比等修辞辨析", orderIndex: 4 },

  // ─── 英语 - 小学 ───────────────────────────────
  { subject: "英语", gradeLevel: "小学", name: "字母", description: "26 个英文字母的认读与书写", orderIndex: 1 },
  { subject: "英语", gradeLevel: "小学", name: "单词", description: "基础词汇与常见名词、动词", orderIndex: 2 },
  { subject: "英语", gradeLevel: "小学", name: "简单句型", description: "This is... / I am... 等基础句型", orderIndex: 3 },
  { subject: "英语", gradeLevel: "小学", name: "日常对话", description: "问候、介绍、购物等日常情境对话", orderIndex: 4 },

  // ─── 英语 - 初中 ───────────────────────────────
  { subject: "英语", gradeLevel: "初中", name: "语法", description: "时态、语态、从句等语法知识", orderIndex: 1 },
  { subject: "英语", gradeLevel: "初中", name: "阅读理解", description: "短文阅读与信息提取", orderIndex: 2 },
  { subject: "英语", gradeLevel: "初中", name: "完形填空", description: "语篇理解与词汇运用", orderIndex: 3 },
  { subject: "英语", gradeLevel: "初中", name: "写作", description: "应用文与短文写作", orderIndex: 4 },

  // ─── 物理 - 初中 ───────────────────────────────
  { subject: "物理", gradeLevel: "初中", name: "力学", description: "力的概念、重力、摩擦力", orderIndex: 1 },
  { subject: "物理", gradeLevel: "初中", name: "运动学", description: "速度、加速度、匀速直线运动", orderIndex: 2 },
  { subject: "物理", gradeLevel: "初中", name: "电学", description: "电流、电压、电阻与欧姆定律", orderIndex: 3 },
  { subject: "物理", gradeLevel: "初中", name: "光学", description: "光的传播、反射与折射", orderIndex: 4 },

  // ─── 化学 - 初中 ───────────────────────────────
  { subject: "化学", gradeLevel: "初中", name: "元素", description: "常见元素符号与元素周期表初步", orderIndex: 1 },
  { subject: "化学", gradeLevel: "初中", name: "化合物", description: "常见化合物的性质与用途", orderIndex: 2 },
  { subject: "化学", gradeLevel: "初中", name: "化学反应", description: "化合、分解、置换、复分解反应", orderIndex: 3 },
  { subject: "化学", gradeLevel: "初中", name: "酸碱盐", description: "常见酸、碱、盐的性质与反应", orderIndex: 4 },

  // ─── 生物 - 初中 ───────────────────────────────
  { subject: "生物", gradeLevel: "初中", name: "细胞", description: "细胞结构与功能、细胞分裂", orderIndex: 1 },
  { subject: "生物", gradeLevel: "初中", name: "植物", description: "植物的分类、结构与生理", orderIndex: 2 },
  { subject: "生物", gradeLevel: "初中", name: "人体", description: "人体八大系统与生理功能", orderIndex: 3 },
  { subject: "生物", gradeLevel: "初中", name: "生态系统", description: "生态系统的组成与能量流动", orderIndex: 4 },
];

// ═══════════════════════════════════════════════════════════════
//  3. 题目数据（按学习模式分层：幼儿园/小学/初高中/大学/上班族）
// ═══════════════════════════════════════════════════════════════
interface QuestionSeed {
  subject: string;
  difficulty: number;   // 1-5
  gradeLevel: string;   // 学段标签
  type: string;         // 题型，统一为 "choice"
  content: string;      // 题干
  options: string[];    // 4 个选项
  answer: string;        // 正确答案文本（需与 options 中某项完全一致）
  explanation: string;  // 解析
  source?: string;      // 题源（统一为 "seed"）
}

const QUESTIONS: QuestionSeed[] = [
  // ─── 幼儿园（10 题：数学 6 + 语文 4）────────────────────
  // 数学 6 题
  {
    subject: "数学", difficulty: 1, gradeLevel: "学前", type: "choice",
    content: "数一数，下面有几个苹果？🍎🍎🍎🍎🍎",
    options: ["3", "4", "5", "6"], answer: "5",
    explanation: "数一数图中的苹果，共有 5 个。",
  },
  {
    subject: "数学", difficulty: 1, gradeLevel: "学前", type: "choice",
    content: "哪个数字更大？",
    options: ["3", "7", "2", "1"], answer: "7",
    explanation: "1 < 2 < 3 < 7，最大的数是 7。",
  },
  {
    subject: "数学", difficulty: 1, gradeLevel: "学前", type: "choice",
    content: "1 + 2 = ?",
    options: ["2", "3", "4", "1"], answer: "3",
    explanation: "1 加 2 等于 3。",
  },
  {
    subject: "数学", difficulty: 2, gradeLevel: "学前", type: "choice",
    content: "3 + 4 = ?",
    options: ["5", "6", "7", "8"], answer: "7",
    explanation: "3 加 4 等于 7。",
  },
  {
    subject: "数学", difficulty: 2, gradeLevel: "学前", type: "choice",
    content: "5 - 2 = ?",
    options: ["2", "3", "4", "5"], answer: "3",
    explanation: "5 减 2 等于 3。",
  },
  {
    subject: "数学", difficulty: 1, gradeLevel: "学前", type: "choice",
    content: "下面哪个是圆形？",
    options: ["△", "□", "○", "☆"], answer: "○",
    explanation: "○ 是圆形，△ 是三角形，□ 是正方形，☆ 是星形。",
  },
  // 语文 4 题
  {
    subject: "语文", difficulty: 1, gradeLevel: "学前", type: "choice",
    content: "下面哪个字的读音是 \"mā\"?",
    options: ["爸", "妈", "哥", "姐"], answer: "妈",
    explanation: "\"妈\" 的拼音是 mā，常用于称呼母亲。",
  },
  {
    subject: "语文", difficulty: 1, gradeLevel: "学前", type: "choice",
    content: "\"大\" 的反义词是？",
    options: ["高", "小", "多", "长"], answer: "小",
    explanation: "\"大\" 与 \"小\" 是一对反义词。",
  },
  {
    subject: "语文", difficulty: 2, gradeLevel: "学前", type: "choice",
    content: "下面哪个是动物？",
    options: ["苹果", "小狗", "桌子", "衣服"], answer: "小狗",
    explanation: "小狗是动物，其余三项分别是水果、家具、衣物。",
  },
  {
    subject: "语文", difficulty: 2, gradeLevel: "学前", type: "choice",
    content: "\"一二三四五\" 中一共有几个字？",
    options: ["3", "4", "5", "6"], answer: "5",
    explanation: "\"一、二、三、四、五\" 共 5 个汉字。",
  },

  // ─── 小学（15 题：数学 5 + 语文 5 + 英语 5）────────────────────
  // 数学 5
  {
    subject: "数学", difficulty: 1, gradeLevel: "四年级", type: "choice",
    content: "25 + 17 = ?",
    options: ["32", "42", "52", "41"], answer: "42",
    explanation: "25 + 17 = 42，可分步：25 + 10 = 35，35 + 7 = 42。",
  },
  {
    subject: "数学", difficulty: 2, gradeLevel: "四年级", type: "choice",
    content: "6 × 8 = ?",
    options: ["42", "46", "48", "54"], answer: "48",
    explanation: "6 × 8 = 48，依据九九乘法表。",
  },
  {
    subject: "数学", difficulty: 2, gradeLevel: "四年级", type: "choice",
    content: "下列哪个分数最大？",
    options: ["1/2", "1/3", "1/4", "1/5"], answer: "1/2",
    explanation: "分子相同的分数，分母越小分数越大。",
  },
  {
    subject: "数学", difficulty: 3, gradeLevel: "四年级", type: "choice",
    content: "一个长方形长 6 厘米，宽 4 厘米，它的面积是多少平方厘米？",
    options: ["10", "20", "24", "48"], answer: "24",
    explanation: "长方形面积 = 长 × 宽 = 6 × 4 = 24 平方厘米。",
  },
  {
    subject: "数学", difficulty: 3, gradeLevel: "四年级", type: "choice",
    content: "0.5 等于几分之几？",
    options: ["1/2", "1/4", "1/5", "2/5"], answer: "1/2",
    explanation: "0.5 = 5/10 = 1/2。",
  },
  // 语文 5
  {
    subject: "语文", difficulty: 1, gradeLevel: "四年级", type: "choice",
    content: "下列哪个字的拼音是 \"huā\"?",
    options: ["花", "画", "话", "化"], answer: "花",
    explanation: "\"花\" 的拼音是 huā，意为花朵。",
  },
  {
    subject: "语文", difficulty: 2, gradeLevel: "四年级", type: "choice",
    content: "\"美丽\" 的近义词是？",
    options: ["丑陋", "漂亮", "粗鲁", "可爱"], answer: "漂亮",
    explanation: "\"美丽\" 与 \"漂亮\" 都表示好看、赏心悦目，互为近义词。",
  },
  {
    subject: "语文", difficulty: 2, gradeLevel: "四年级", type: "choice",
    content: "成语 \"亡羊补牢\" 的意思是？",
    options: ["丢失了羊后修补羊圈，比喻出了问题再补救", "羊死了没办法", "羊圈很牢固", "羊跑得快"],
    answer: "丢失了羊后修补羊圈，比喻出了问题再补救",
    explanation: "\"亡羊补牢\" 比喻出了问题之后想办法补救，可防止继续受损失。",
  },
  {
    subject: "语文", difficulty: 3, gradeLevel: "四年级", type: "choice",
    content: "下列诗句中，哪句出自《静夜思》？",
    options: ["白日依山尽", "床前明月光", "春眠不觉晓", "锄禾日当午"], answer: "床前明月光",
    explanation: "\"床前明月光，疑是地上霜\" 出自李白的《静夜思》。",
  },
  {
    subject: "语文", difficulty: 3, gradeLevel: "四年级", type: "choice",
    content: "\"他高兴得跳了起来\" 中，\"得\" 的用法是？",
    options: ["表示得到", "连接补语", "表示必须", "无意义"], answer: "连接补语",
    explanation: "\"得\" 在动词或形容词后连接补充说明的程度补语。",
  },
  // 英语 5
  {
    subject: "英语", difficulty: 1, gradeLevel: "四年级", type: "choice",
    content: "How do you spell \"cat\" (猫)?",
    options: ["c-a-t", "k-a-t", "c-a-d", "c-a-r"], answer: "c-a-t",
    explanation: "\"cat\" 的拼写为 c-a-t。",
  },
  {
    subject: "英语", difficulty: 2, gradeLevel: "四年级", type: "choice",
    content: "Which one is a fruit? (哪个是水果？)",
    options: ["book", "apple", "desk", "pen"], answer: "apple",
    explanation: "apple 意为苹果，是水果；其余是书、桌子、笔。",
  },
  {
    subject: "英语", difficulty: 2, gradeLevel: "四年级", type: "choice",
    content: "Choose: \"Hello! How are you?\" —— \"________\"",
    options: ["I'm fine, thanks.", "Goodbye.", "See you.", "Nice to meet you."], answer: "I'm fine, thanks.",
    explanation: "对方问 \"How are you?\" 时，常用 \"I'm fine, thanks.\" 回答。",
  },
  {
    subject: "英语", difficulty: 3, gradeLevel: "四年级", type: "choice",
    content: "What color is the sky on a sunny day? (晴天天空是什么颜色？)",
    options: ["Red", "Green", "Blue", "Yellow"], answer: "Blue",
    explanation: "晴朗时天空是蓝色的，blue 表示蓝色。",
  },
  {
    subject: "英语", difficulty: 3, gradeLevel: "四年级", type: "choice",
    content: "Which word means \"书\"?",
    options: ["pen", "book", "bag", "ruler"], answer: "book",
    explanation: "book 意为书；pen 是笔，bag 是包，ruler 是尺子。",
  },

  // ─── 初高中（15 题：数学 3 + 语文 2 + 英语 2 + 物理 3 + 化学 3 + 生物 2）──
  // 数学 3
  {
    subject: "数学", difficulty: 3, gradeLevel: "初二", type: "choice",
    content: "解方程：2x + 6 = 14，x = ?",
    options: ["2", "3", "4", "5"], answer: "4",
    explanation: "2x = 14 - 6 = 8，x = 8 / 2 = 4。",
  },
  {
    subject: "数学", difficulty: 4, gradeLevel: "初二", type: "choice",
    content: "直角三角形两直角边长分别为 3 和 4，斜边长为？",
    options: ["5", "6", "7", "√7"], answer: "5",
    explanation: "由勾股定理：3² + 4² = 9 + 16 = 25，斜边 = √25 = 5。",
  },
  {
    subject: "数学", difficulty: 5, gradeLevel: "初二", type: "choice",
    content: "一次函数 y = 2x + 1 在 y 轴上的截距是？",
    options: ["0", "1", "2", "-1"], answer: "1",
    explanation: "与 y 轴交点为 x = 0，y = 2·0 + 1 = 1，故截距为 1。",
  },
  // 语文 2
  {
    subject: "语文", difficulty: 4, gradeLevel: "初二", type: "choice",
    content: "下列哪句出自《论语》？",
    options: ["学而时习之，不亦说乎", "床前明月光", "锄禾日当午", "白日依山尽"], answer: "学而时习之，不亦说乎",
    explanation: "\"学而时习之，不亦说乎\" 出自《论语·学而》。",
  },
  {
    subject: "语文", difficulty: 3, gradeLevel: "初二", type: "choice",
    content: "\"沉鱼落雁\" 最初形容的是谁？",
    options: ["杨玉环", "西施", "貂蝉", "王昭君"], answer: "西施",
    explanation: "\"沉鱼\" 形容西施浣纱时鱼儿沉入水底；\"落雁\" 指王昭君出塞。",
  },
  // 英语 2
  {
    subject: "英语", difficulty: 3, gradeLevel: "初二", type: "choice",
    content: "Choose the correct sentence.",
    options: ["He don't like apples.", "He doesn't likes apples.", "He doesn't like apples.", "He not like apples."], answer: "He doesn't like apples.",
    explanation: "第三人称单数否定用 doesn't + 动词原形。",
  },
  {
    subject: "英语", difficulty: 4, gradeLevel: "初二", type: "choice",
    content: "Which word is a synonym of \"happy\"?",
    options: ["sad", "angry", "joyful", "tired"], answer: "joyful",
    explanation: "joyful 与 happy 同义，都表示高兴的。",
  },
  // 物理 3
  {
    subject: "物理", difficulty: 3, gradeLevel: "初二", type: "choice",
    content: "在国际单位制中，力的单位是？",
    options: ["焦耳", "牛顿", "瓦特", "帕斯卡"], answer: "牛顿",
    explanation: "力的国际单位是牛顿，符号 N。",
  },
  {
    subject: "物理", difficulty: 4, gradeLevel: "初二", type: "choice",
    content: "一物体在水平面上受到 10 N 的水平拉力做匀速直线运动，它所受摩擦力大小为？",
    options: ["0 N", "5 N", "10 N", "无法确定"], answer: "10 N",
    explanation: "匀速直线运动时合力为零，摩擦力等于拉力 10 N。",
  },
  {
    subject: "物理", difficulty: 5, gradeLevel: "初二", type: "choice",
    content: "欧姆定律的表达式是？",
    options: ["I = U/R", "I = UR", "I = R/U", "U = I/R"], answer: "I = U/R",
    explanation: "欧姆定律：通过导体的电流 I 与电压 U 成正比，与电阻 R 成反比。",
  },
  // 化学 3
  {
    subject: "化学", difficulty: 3, gradeLevel: "初二", type: "choice",
    content: "水的化学式是？",
    options: ["H2O", "CO2", "O2", "NaCl"], answer: "H2O",
    explanation: "水由 2 个氢原子和 1 个氧原子构成，化学式 H2O。",
  },
  {
    subject: "化学", difficulty: 4, gradeLevel: "初二", type: "choice",
    content: "下列哪种物质属于单质？",
    options: ["水", "氧气", "二氧化碳", "氯化钠"], answer: "氧气",
    explanation: "氧气 O2 由同种元素组成，是单质；其余均为化合物。",
  },
  {
    subject: "化学", difficulty: 5, gradeLevel: "初二", type: "choice",
    content: "实验室用 H2 与 O2 反应生成水，该反应类型属于？",
    options: ["化合反应", "分解反应", "置换反应", "复分解反应"], answer: "化合反应",
    explanation: "两种物质生成一种新物质的反应是化合反应：2H2 + O2 = 2H2O。",
  },
  // 生物 2
  {
    subject: "生物", difficulty: 3, gradeLevel: "初二", type: "choice",
    content: "植物进行光合作用的主要场所是？",
    options: ["细胞核", "叶绿体", "线粒体", "细胞膜"], answer: "叶绿体",
    explanation: "叶绿体含有叶绿素，是光合作用的场所。",
  },
  {
    subject: "生物", difficulty: 4, gradeLevel: "初二", type: "choice",
    content: "人体呼吸过程中，吸入的气体中含量最多的成分是？",
    options: ["氧气", "二氧化碳", "氮气", "水蒸气"], answer: "氮气",
    explanation: "空气中氮气约占 78%，吸入气体中氮气含量最高。",
  },

  // ─── 大学生（10 题：数学 3 + 英语 2 + 物理 2 + 化学 2 + 生物 1）──────
  // 数学 3
  {
    subject: "数学", difficulty: 4, gradeLevel: "大一", type: "choice",
    content: "极限 lim(x→0) (sin x) / x = ?",
    options: ["0", "1", "∞", "不存在"], answer: "1",
    explanation: "这是重要极限之一，lim(x→0) sin(x)/x = 1。",
  },
  {
    subject: "数学", difficulty: 5, gradeLevel: "大一", type: "choice",
    content: "函数 f(x) = x² 的导数 f'(x) = ?",
    options: ["x", "2x", "x²/2", "2"], answer: "2x",
    explanation: "由幂函数求导公式 (xⁿ)' = n·xⁿ⁻¹，得 (x²)' = 2x。",
  },
  {
    subject: "数学", difficulty: 3, gradeLevel: "大一", type: "choice",
    content: "矩阵 [[1,2],[3,4]] 的行列式为？",
    options: ["-2", "2", "0", "1"], answer: "-2",
    explanation: "2×2 行列式 |a b; c d| = ad - bc = 1·4 - 2·3 = -2。",
  },
  // 英语 2
  {
    subject: "英语", difficulty: 4, gradeLevel: "大一", type: "choice",
    content: "Choose the word that best completes: \"He is _____ in computer science.\"",
    options: ["majoring", "majored", "major", "majors"], answer: "majoring",
    explanation: "\"be majoring in\" 表示正在主修某专业，用现在进行时。",
  },
  {
    subject: "英语", difficulty: 5, gradeLevel: "大一", type: "choice",
    content: "Which of the following is a thesis statement (thesis)?",
    options: ["In this essay...", "I will write about...", "Social media has reshaped modern communication.", "Firstly, ..."], answer: "Social media has reshaped modern communication.",
    explanation: "论点（thesis）应是表达明确观点的陈述句，其余只是引入或过渡。",
  },
  // 物理 2
  {
    subject: "物理", difficulty: 4, gradeLevel: "大一", type: "choice",
    content: "牛顿第二定律的表达式是？",
    options: ["F = ma", "F = mv", "F = m/a", "a = Fm"], answer: "F = ma",
    explanation: "牛顿第二定律：物体所受合外力等于质量与加速度的乘积。",
  },
  {
    subject: "物理", difficulty: 5, gradeLevel: "大一", type: "choice",
    content: "理想气体状态方程是？",
    options: ["PV = nRT", "P = nRT", "V = nRT", "PV = T"], answer: "PV = nRT",
    explanation: "理想气体状态方程 PV = nRT，P 压强、V 体积、n 物质的量、R 气体常数、T 温度。",
  },
  // 化学 2
  {
    subject: "化学", difficulty: 4, gradeLevel: "大一", type: "choice",
    content: "下列哪个是芳香烃？",
    options: ["甲烷", "苯", "乙醇", "乙酸"], answer: "苯",
    explanation: "苯 (C6H6) 是典型的芳香烃，含苯环结构。",
  },
  {
    subject: "化学", difficulty: 5, gradeLevel: "大一", type: "choice",
    content: "化学平衡常数 Kc 与下列哪个因素有关？",
    options: ["浓度", "压力", "温度", "催化剂"], answer: "温度",
    explanation: "平衡常数 Kc 只与温度有关，与浓度、压力、催化剂无关。",
  },
  // 生物 1
  {
    subject: "生物", difficulty: 4, gradeLevel: "大一", type: "choice",
    content: "DNA 双螺旋结构是谁发现的？",
    options: ["达尔文", "孟德尔", "沃森和克里克", "巴斯德"], answer: "沃森和克里克",
    explanation: "1953 年，沃森 (Watson) 和克里克 (Crick) 提出 DNA 双螺旋结构。",
  },

  // ─── 上班族（10 题：数学 3 + 英语 4 + 语文 3）──────────────────
  // 数学 3（实用数学）
  {
    subject: "数学", difficulty: 3, gradeLevel: "自学", type: "choice",
    content: "本金 10000 元，年利率 5%，按单利计算，2 年后利息是多少元？",
    options: ["500", "1000", "1500", "2000"], answer: "1000",
    explanation: "单利公式：利息 = 本金 × 利率 × 时间 = 10000 × 5% × 2 = 1000 元。",
  },
  {
    subject: "数学", difficulty: 4, gradeLevel: "自学", type: "choice",
    content: "某商品原价 200 元，先涨价 10%，再降价 10%，最终价格是多少元？",
    options: ["200", "198", "202", "196"], answer: "198",
    explanation: "200 × 1.1 × 0.9 = 198 元，先后两个 10% 不相抵。",
  },
  {
    subject: "数学", difficulty: 5, gradeLevel: "自学", type: "choice",
    content: "每月定投 1000 元，年化收益率 6%，按月复利，1 年后约有多少？（不考虑费用）",
    options: ["约 12000 元", "约 12330 元", "约 12600 元", "约 13000 元"], answer: "约 12330 元",
    explanation: "每月定投期初年金终值公式约得 12330 元，比 12000 多出复利收益。",
  },
  // 英语 4（职场英语）
  {
    subject: "英语", difficulty: 2, gradeLevel: "自学", type: "choice",
    content: "职场中，收到邮件时常用 \"_____\" 表示已收到。",
    options: ["Noted", "Forgot", "Ignored", "Deleted"], answer: "Noted",
    explanation: "\"Noted\" 在职场邮件中表示 \"已知悉/已记录\"。",
  },
  {
    subject: "英语", difficulty: 3, gradeLevel: "自学", type: "choice",
    content: "Which phrase means \"请按时完成\"?",
    options: ["Please complete on time.", "Please complete later.", "Take your time.", "No rush."], answer: "Please complete on time.",
    explanation: "\"on time\" 表示按时，整句意为请按时完成。",
  },
  {
    subject: "英语", difficulty: 4, gradeLevel: "自学", type: "choice",
    content: "Meeting 中 \"Let's table this issue\" 的意思是？",
    options: ["把这个问题放到桌面上讨论", "暂搁此问题，留待以后讨论", "立即解决此问题", "取消此问题"],
    answer: "暂搁此问题，留待以后讨论",
    explanation: "\"table an issue\" 在会议语境中常表示推迟讨论，留待以后再说。",
  },
  {
    subject: "英语", difficulty: 5, gradeLevel: "自学", type: "choice",
    content: "商务邮件结尾，下列哪个最正式？",
    options: ["Cheers,", "Bye!", "Sincerely,", "See ya!"], answer: "Sincerely,",
    explanation: "\"Sincerely,\" 是商务/正式邮件中常用的结尾敬语。",
  },
  // 语文 3（应用文写作）
  {
    subject: "语文", difficulty: 2, gradeLevel: "自学", type: "choice",
    content: "下列哪种属于应用文？",
    options: ["诗歌", "请假条", "散文", "小说"], answer: "请假条",
    explanation: "请假条是日常生活与工作中常用的应用文。",
  },
  {
    subject: "语文", difficulty: 3, gradeLevel: "自学", type: "choice",
    content: "写工作汇报时，下列哪种表述更专业？",
    options: ["我觉得吧，这事挺好", "本月完成销售额 50 万元，同比增长 10%", "做了点事，还行", "马马虎虎吧"],
    answer: "本月完成销售额 50 万元，同比增长 10%",
    explanation: "工作汇报应使用具体数据与专业表达，避免口语化。",
  },
  {
    subject: "语文", difficulty: 4, gradeLevel: "自学", type: "choice",
    content: "通知的正文开头通常应包含？",
    options: ["原因、依据或目的", "故事开头", "诗句", "比喻"], answer: "原因、依据或目的",
    explanation: "通知开头应说明发文缘由、依据或目的，再写事项与要求。",
  },
];

// ═══════════════════════════════════════════════════════════════
//  种子执行主流程
// ═══════════════════════════════════════════════════════════════
async function seedBadges() {
  console.log(`\n[1/3] 开始植入 ${BADGES.length} 个徽章...`);
  let created = 0;
  let updated = 0;

  for (const badge of BADGES) {
    const existing = await prisma.badge.findFirst({ where: { name: badge.name } });
    if (existing) {
      await prisma.badge.update({
        where: { id: existing.id },
        data: {
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          rarity: badge.rarity,
          condition: badge.condition,
        },
      });
      updated++;
    } else {
      await prisma.badge.create({
        data: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          rarity: badge.rarity,
          condition: badge.condition,
        },
      });
      created++;
    }
  }

  console.log(`  ✅ 徽章植入完成：新增 ${created} 个，更新 ${updated} 个`);
}

async function seedKnowledgePoints() {
  console.log(`\n[2/3] 开始植入 ${KNOWLEDGE_POINTS.length} 个知识点...`);
  let created = 0;
  let updated = 0;

  for (const kp of KNOWLEDGE_POINTS) {
    const existing = await prisma.knowledgePoint.findFirst({
      where: {
        subject: kp.subject,
        name: kp.name,
        gradeLevel: kp.gradeLevel,
      },
    });

    if (existing) {
      await prisma.knowledgePoint.update({
        where: { id: existing.id },
        data: {
          description: kp.description,
          orderIndex: kp.orderIndex,
        },
      });
      updated++;
    } else {
      await prisma.knowledgePoint.create({
        data: {
          subject: kp.subject,
          name: kp.name,
          description: kp.description,
          gradeLevel: kp.gradeLevel,
          orderIndex: kp.orderIndex,
        },
      });
      created++;
    }
  }

  console.log(`  ✅ 知识点植入完成：新增 ${created} 个，更新 ${updated} 个`);
}

async function seedQuestions() {
  console.log(`\n[3/3] 开始植入 ${QUESTIONS.length} 道题目...`);
  let created = 0;
  let updated = 0;

  // 按学习模式统计
  const stats: Record<string, number> = {};

  for (const q of QUESTIONS) {
    stats[q.gradeLevel] = (stats[q.gradeLevel] || 0) + 1;

    const existing = await prisma.question.findFirst({
      where: { content: q.content },
    });

    const optionsJson = JSON.stringify(q.options);

    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          subject: q.subject,
          type: q.type,
          difficulty: q.difficulty,
          options: optionsJson,
          answer: q.answer,
          explanation: q.explanation,
          source: q.source ?? "seed",
          gradeLevel: q.gradeLevel,
        },
      });
      updated++;
    } else {
      await prisma.question.create({
        data: {
          subject: q.subject,
          type: q.type,
          difficulty: q.difficulty,
          content: q.content,
          options: optionsJson,
          answer: q.answer,
          explanation: q.explanation,
          source: q.source ?? "seed",
          gradeLevel: q.gradeLevel,
        },
      });
      created++;
    }
  }

  console.log(`  ✅ 题目植入完成：新增 ${created} 道，更新 ${updated} 道`);
  console.log("  📊 按学段分布：");
  for (const [level, count] of Object.entries(stats)) {
    console.log(`     - ${level}: ${count} 道`);
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Polaris 北极星学习平台 - 种子数据植入");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`数据库 provider: ${process.env.DATABASE_PROVIDER || "sqlite"}`);
  console.log(`开始时间: ${new Date().toISOString()}`);

  await seedBadges();
  await seedKnowledgePoints();
  await seedQuestions();

  console.log(`\n完成时间: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ 全部种子数据植入完成");
}

main()
  .catch((error) => {
    console.error("❌ 种子数据植入失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
