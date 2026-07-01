import { putMany, count } from './indexeddb';
import { STORES } from './schema';
import type { KnowledgePoint } from '@/lib/repositories/knowledge.repository';
import type { Question } from '@/lib/repositories/practice.repository';

// ═══════════════════════════════════════════════════════════════
//  1. 知识点数据（与 prisma/seed.ts 的 KNOWLEDGE_POINTS 同步，39 个）
// ═══════════════════════════════════════════════════════════════
const KNOWLEDGE_POINTS_SEED: KnowledgePoint[] = [
  // ─── 数学 - 小学 ───────────────────────────────
  { id: 'kp_math_primary_1', subject: '数学', gradeLevel: '四年级', title: '加减法', description: '20以内、100以内的加减法运算', order: 1 },
  { id: 'kp_math_primary_2', subject: '数学', gradeLevel: '四年级', title: '乘除法', description: '九九乘法表与基本除法运算', order: 2 },
  { id: 'kp_math_primary_3', subject: '数学', gradeLevel: '四年级', title: '分数', description: '分数的概念、比较与简单运算', order: 3 },
  { id: 'kp_math_primary_4', subject: '数学', gradeLevel: '四年级', title: '小数', description: '小数的意义、比较与四则运算', order: 4 },
  { id: 'kp_math_primary_5', subject: '数学', gradeLevel: '四年级', title: '几何图形', description: '三角形、四边形、圆等平面图形认识', order: 5 },
  // ─── 数学 - 初中 ───────────────────────────────
  { id: 'kp_math_middle_1', subject: '数学', gradeLevel: '初二', title: '方程', description: '一元一次方程、二元一次方程组', order: 1 },
  { id: 'kp_math_middle_2', subject: '数学', gradeLevel: '初二', title: '函数', description: '一次函数、二次函数、反比例函数', order: 2 },
  { id: 'kp_math_middle_3', subject: '数学', gradeLevel: '初二', title: '三角形', description: '三角形性质、全等与相似', order: 3 },
  { id: 'kp_math_middle_4', subject: '数学', gradeLevel: '初二', title: '圆', description: '圆的性质、切线、与圆有关的计算', order: 4 },
  { id: 'kp_math_middle_5', subject: '数学', gradeLevel: '初二', title: '概率', description: '概率初步、频率与可能性', order: 5 },
  // ─── 语文 - 小学 ───────────────────────────────
  { id: 'kp_chinese_primary_1', subject: '语文', gradeLevel: '四年级', title: '拼音', description: '声母、韵母、整体认读音节', order: 1 },
  { id: 'kp_chinese_primary_2', subject: '语文', gradeLevel: '四年级', title: '汉字', description: '常用汉字的认读与书写', order: 2 },
  { id: 'kp_chinese_primary_3', subject: '语文', gradeLevel: '四年级', title: '词语', description: '常用词语的理解与运用', order: 3 },
  { id: 'kp_chinese_primary_4', subject: '语文', gradeLevel: '四年级', title: '句子', description: '简单句、修辞句、句式变换', order: 4 },
  { id: 'kp_chinese_primary_5', subject: '语文', gradeLevel: '四年级', title: '古诗', description: '小学必背古诗词赏析与背诵', order: 5 },
  // ─── 语文 - 初中 ───────────────────────────────
  { id: 'kp_chinese_middle_1', subject: '语文', gradeLevel: '初二', title: '文言文', description: '文言文阅读与翻译技巧', order: 1 },
  { id: 'kp_chinese_middle_2', subject: '语文', gradeLevel: '初二', title: '现代文阅读', description: '记叙文、说明文、议论文阅读理解', order: 2 },
  { id: 'kp_chinese_middle_3', subject: '语文', gradeLevel: '初二', title: '作文', description: '记叙文、议论文写作方法', order: 3 },
  { id: 'kp_chinese_middle_4', subject: '语文', gradeLevel: '初二', title: '修辞手法', description: '比喻、拟人、排比等修辞辨析', order: 4 },
  // ─── 英语 - 小学 ───────────────────────────────
  { id: 'kp_english_primary_1', subject: '英语', gradeLevel: '四年级', title: '字母', description: '26 个英文字母的认读与书写', order: 1 },
  { id: 'kp_english_primary_2', subject: '英语', gradeLevel: '四年级', title: '单词', description: '基础词汇与常见名词、动词', order: 2 },
  { id: 'kp_english_primary_3', subject: '英语', gradeLevel: '四年级', title: '简单句型', description: 'This is... / I am... 等基础句型', order: 3 },
  { id: 'kp_english_primary_4', subject: '英语', gradeLevel: '四年级', title: '日常对话', description: '问候、介绍、购物等日常情境对话', order: 4 },
  // ─── 英语 - 初中 ───────────────────────────────
  { id: 'kp_english_middle_1', subject: '英语', gradeLevel: '初二', title: '语法', description: '时态、语态、从句等语法知识', order: 1 },
  { id: 'kp_english_middle_2', subject: '英语', gradeLevel: '初二', title: '阅读理解', description: '短文阅读与信息提取', order: 2 },
  { id: 'kp_english_middle_3', subject: '英语', gradeLevel: '初二', title: '完形填空', description: '语篇理解与词汇运用', order: 3 },
  { id: 'kp_english_middle_4', subject: '英语', gradeLevel: '初二', title: '写作', description: '应用文与短文写作', order: 4 },
  // ─── 物理 - 初中 ───────────────────────────────
  { id: 'kp_physics_middle_1', subject: '物理', gradeLevel: '初二', title: '力学', description: '力的概念、重力、摩擦力', order: 1 },
  { id: 'kp_physics_middle_2', subject: '物理', gradeLevel: '初二', title: '运动学', description: '速度、加速度、匀速直线运动', order: 2 },
  { id: 'kp_physics_middle_3', subject: '物理', gradeLevel: '初二', title: '电学', description: '电流、电压、电阻与欧姆定律', order: 3 },
  { id: 'kp_physics_middle_4', subject: '物理', gradeLevel: '初二', title: '光学', description: '光的传播、反射与折射', order: 4 },
  // ─── 化学 - 初中 ───────────────────────────────
  { id: 'kp_chemistry_middle_1', subject: '化学', gradeLevel: '初二', title: '元素', description: '常见元素符号与元素周期表初步', order: 1 },
  { id: 'kp_chemistry_middle_2', subject: '化学', gradeLevel: '初二', title: '化合物', description: '常见化合物的性质与用途', order: 2 },
  { id: 'kp_chemistry_middle_3', subject: '化学', gradeLevel: '初二', title: '化学反应', description: '化合、分解、置换、复分解反应', order: 3 },
  { id: 'kp_chemistry_middle_4', subject: '化学', gradeLevel: '初二', title: '酸碱盐', description: '常见酸、碱、盐的性质与反应', order: 4 },
  // ─── 生物 - 初中 ───────────────────────────────
  { id: 'kp_biology_middle_1', subject: '生物', gradeLevel: '初二', title: '细胞', description: '细胞结构与功能、细胞分裂', order: 1 },
  { id: 'kp_biology_middle_2', subject: '生物', gradeLevel: '初二', title: '植物', description: '植物的分类、结构与生理', order: 2 },
  { id: 'kp_biology_middle_3', subject: '生物', gradeLevel: '初二', title: '人体', description: '人体八大系统与生理功能', order: 3 },
  { id: 'kp_biology_middle_4', subject: '生物', gradeLevel: '初二', title: '生态系统', description: '生态系统的组成与能量流动', order: 4 },
];

// ═══════════════════════════════════════════════════════════════
//  2. 题目数据（与 prisma/seed.ts 的 QUESTIONS 同步，60 道）
// ═══════════════════════════════════════════════════════════════
const QUESTIONS_SEED: Question[] = [
  // ─── 幼儿园（10 题：数学 6 + 语文 4）────────────────────
  { id: 'q_kinder_1', subject: '数学', difficulty: 1, gradeLevel: '学前', type: 'single_choice', content: '数一数，下面有几个苹果？🍎🍎🍎🍎🍎', options: ['3', '4', '5', '6'], correctAnswer: '5', explanation: '数一数图中的苹果，共有 5 个。' },
  { id: 'q_kinder_2', subject: '数学', difficulty: 1, gradeLevel: '学前', type: 'single_choice', content: '哪个数字更大？', options: ['3', '7', '2', '1'], correctAnswer: '7', explanation: '1 < 2 < 3 < 7，最大的数是 7。' },
  { id: 'q_kinder_3', subject: '数学', difficulty: 1, gradeLevel: '学前', type: 'single_choice', content: '1 + 2 = ?', options: ['2', '3', '4', '1'], correctAnswer: '3', explanation: '1 加 2 等于 3。' },
  { id: 'q_kinder_4', subject: '数学', difficulty: 2, gradeLevel: '学前', type: 'single_choice', content: '3 + 4 = ?', options: ['5', '6', '7', '8'], correctAnswer: '7', explanation: '3 加 4 等于 7。' },
  { id: 'q_kinder_5', subject: '数学', difficulty: 2, gradeLevel: '学前', type: 'single_choice', content: '5 - 2 = ?', options: ['2', '3', '4', '5'], correctAnswer: '3', explanation: '5 减 2 等于 3。' },
  { id: 'q_kinder_6', subject: '数学', difficulty: 1, gradeLevel: '学前', type: 'single_choice', content: '下面哪个是圆形？', options: ['△', '□', '○', '☆'], correctAnswer: '○', explanation: '○ 是圆形，△ 是三角形，□ 是正方形，☆ 是星形。' },
  { id: 'q_kinder_7', subject: '语文', difficulty: 1, gradeLevel: '学前', type: 'single_choice', content: '下面哪个字的读音是 "mā"?', options: ['爸', '妈', '哥', '姐'], correctAnswer: '妈', explanation: '"妈" 的拼音是 mā，常用于称呼母亲。' },
  { id: 'q_kinder_8', subject: '语文', difficulty: 1, gradeLevel: '学前', type: 'single_choice', content: '"大" 的反义词是？', options: ['高', '小', '多', '长'], correctAnswer: '小', explanation: '"大" 与 "小" 是一对反义词。' },
  { id: 'q_kinder_9', subject: '语文', difficulty: 2, gradeLevel: '学前', type: 'single_choice', content: '下面哪个是动物？', options: ['苹果', '小狗', '桌子', '衣服'], correctAnswer: '小狗', explanation: '小狗是动物，其余三项分别是水果、家具、衣物。' },
  { id: 'q_kinder_10', subject: '语文', difficulty: 2, gradeLevel: '学前', type: 'single_choice', content: '"一二三四五" 中一共有几个字？', options: ['3', '4', '5', '6'], correctAnswer: '5', explanation: '"一、二、三、四、五" 共 5 个汉字。' },

  // ─── 小学（15 题：数学 5 + 语文 5 + 英语 5）────────────────────
  { id: 'q_primary_1', subject: '数学', difficulty: 1, gradeLevel: '四年级', type: 'single_choice', content: '25 + 17 = ?', options: ['32', '42', '52', '41'], correctAnswer: '42', explanation: '25 + 17 = 42，可分步：25 + 10 = 35，35 + 7 = 42。' },
  { id: 'q_primary_2', subject: '数学', difficulty: 2, gradeLevel: '四年级', type: 'single_choice', content: '6 × 8 = ?', options: ['42', '46', '48', '54'], correctAnswer: '48', explanation: '6 × 8 = 48，依据九九乘法表。' },
  { id: 'q_primary_3', subject: '数学', difficulty: 2, gradeLevel: '四年级', type: 'single_choice', content: '下列哪个分数最大？', options: ['1/2', '1/3', '1/4', '1/5'], correctAnswer: '1/2', explanation: '分子相同的分数，分母越小分数越大。' },
  { id: 'q_primary_4', subject: '数学', difficulty: 3, gradeLevel: '四年级', type: 'single_choice', content: '一个长方形长 6 厘米，宽 4 厘米，它的面积是多少平方厘米？', options: ['10', '20', '24', '48'], correctAnswer: '24', explanation: '长方形面积 = 长 × 宽 = 6 × 4 = 24 平方厘米。' },
  { id: 'q_primary_5', subject: '数学', difficulty: 3, gradeLevel: '四年级', type: 'single_choice', content: '0.5 等于几分之几？', options: ['1/2', '1/4', '1/5', '2/5'], correctAnswer: '1/2', explanation: '0.5 = 5/10 = 1/2。' },
  { id: 'q_primary_6', subject: '语文', difficulty: 1, gradeLevel: '四年级', type: 'single_choice', content: '下列哪个字的拼音是 "huā"?', options: ['花', '画', '话', '化'], correctAnswer: '花', explanation: '"花" 的拼音是 huā，意为花朵。' },
  { id: 'q_primary_7', subject: '语文', difficulty: 2, gradeLevel: '四年级', type: 'single_choice', content: '"美丽" 的近义词是？', options: ['丑陋', '漂亮', '粗鲁', '可爱'], correctAnswer: '漂亮', explanation: '"美丽" 与 "漂亮" 都表示好看、赏心悦目，互为近义词。' },
  { id: 'q_primary_8', subject: '语文', difficulty: 2, gradeLevel: '四年级', type: 'single_choice', content: '成语 "亡羊补牢" 的意思是？', options: ['丢失了羊后修补羊圈，比喻出了问题再补救', '羊死了没办法', '羊圈很牢固', '羊跑得快'], correctAnswer: '丢失了羊后修补羊圈，比喻出了问题再补救', explanation: '"亡羊补牢" 比喻出了问题之后想办法补救，可防止继续受损失。' },
  { id: 'q_primary_9', subject: '语文', difficulty: 3, gradeLevel: '四年级', type: 'single_choice', content: '下列诗句中，哪句出自《静夜思》？', options: ['白日依山尽', '床前明月光', '春眠不觉晓', '锄禾日当午'], correctAnswer: '床前明月光', explanation: '"床前明月光，疑是地上霜" 出自李白的《静夜思》。' },
  { id: 'q_primary_10', subject: '语文', difficulty: 3, gradeLevel: '四年级', type: 'single_choice', content: '"他高兴得跳了起来" 中，"得" 的用法是？', options: ['表示得到', '连接补语', '表示必须', '无意义'], correctAnswer: '连接补语', explanation: '"得" 在动词或形容词后连接补充说明的程度补语。' },
  { id: 'q_primary_11', subject: '英语', difficulty: 1, gradeLevel: '四年级', type: 'single_choice', content: 'How do you spell "cat" (猫)?', options: ['c-a-t', 'k-a-t', 'c-a-d', 'c-a-r'], correctAnswer: 'c-a-t', explanation: '"cat" 的拼写为 c-a-t。' },
  { id: 'q_primary_12', subject: '英语', difficulty: 2, gradeLevel: '四年级', type: 'single_choice', content: 'Which one is a fruit? (哪个是水果？)', options: ['book', 'apple', 'desk', 'pen'], correctAnswer: 'apple', explanation: 'apple 意为苹果，是水果；其余是书、桌子、笔。' },
  { id: 'q_primary_13', subject: '英语', difficulty: 2, gradeLevel: '四年级', type: 'single_choice', content: 'Choose: "Hello! How are you?" ——"________"', options: ['I\'m fine, thanks.', 'Goodbye.', 'See you.', 'Nice to meet you.'], correctAnswer: 'I\'m fine, thanks.', explanation: '对方问 "How are you?" 时，常用 "I\'m fine, thanks." 回答。' },
  { id: 'q_primary_14', subject: '英语', difficulty: 3, gradeLevel: '四年级', type: 'single_choice', content: 'What color is the sky on a sunny day? (晴天天空是什么颜色？)', options: ['Red', 'Green', 'Blue', 'Yellow'], correctAnswer: 'Blue', explanation: '晴朗时天空是蓝色的，blue 表示蓝色。' },
  { id: 'q_primary_15', subject: '英语', difficulty: 3, gradeLevel: '四年级', type: 'single_choice', content: 'Which word means "书"?', options: ['pen', 'book', 'bag', 'ruler'], correctAnswer: 'book', explanation: 'book 意为书；pen 是笔，bag 是包，ruler 是尺子。' },

  // ─── 初高中（15 题：数学 3 + 语文 2 + 英语 2 + 物理 3 + 化学 3 + 生物 2）──
  { id: 'q_middle_1', subject: '数学', difficulty: 3, gradeLevel: '初二', type: 'single_choice', content: '解方程：2x + 6 = 14，x = ?', options: ['2', '3', '4', '5'], correctAnswer: '4', explanation: '2x = 14 - 6 = 8，x = 8 / 2 = 4。' },
  { id: 'q_middle_2', subject: '数学', difficulty: 4, gradeLevel: '初二', type: 'single_choice', content: '直角三角形两直角边长分别为 3 和 4，斜边长为？', options: ['5', '6', '7', '√7'], correctAnswer: '5', explanation: '由勾股定理：3² + 4² = 9 + 16 = 25，斜边 = √25 = 5。' },
  { id: 'q_middle_3', subject: '数学', difficulty: 5, gradeLevel: '初二', type: 'single_choice', content: '一次函数 y = 2x + 1 在 y 轴上的截距是？', options: ['0', '1', '2', '-1'], correctAnswer: '1', explanation: '与 y 轴交点为 x = 0，y = 2·0 + 1 = 1，故截距为 1。' },
  { id: 'q_middle_4', subject: '语文', difficulty: 4, gradeLevel: '初二', type: 'single_choice', content: '下列哪句出自《论语》？', options: ['学而时习之，不亦说乎', '床前明月光', '锄禾日当午', '白日依山尽'], correctAnswer: '学而时习之，不亦说乎', explanation: '"学而时习之，不亦说乎" 出自《论语·学而》。' },
  { id: 'q_middle_5', subject: '语文', difficulty: 3, gradeLevel: '初二', type: 'single_choice', content: '"沉鱼落雁" 最初形容的是谁？', options: ['杨玉环', '西施', '貂蝉', '王昭君'], correctAnswer: '西施', explanation: '"沉鱼" 形容西施浣纱时鱼儿沉入水底；"落雁" 指王昭君出塞。' },
  { id: 'q_middle_6', subject: '英语', difficulty: 3, gradeLevel: '初二', type: 'single_choice', content: 'Choose the correct sentence.', options: ['He don\'t like apples.', 'He doesn\'t likes apples.', 'He doesn\'t like apples.', 'He not like apples.'], correctAnswer: 'He doesn\'t like apples.', explanation: '第三人称单数否定用 doesn\'t + 动词原形。' },
  { id: 'q_middle_7', subject: '英语', difficulty: 4, gradeLevel: '初二', type: 'single_choice', content: 'Which word is a synonym of "happy"?', options: ['sad', 'angry', 'joyful', 'tired'], correctAnswer: 'joyful', explanation: 'joyful 与 happy 同义，都表示高兴的。' },
  { id: 'q_middle_8', subject: '物理', difficulty: 3, gradeLevel: '初二', type: 'single_choice', content: '在国际单位制中，力的单位是？', options: ['焦耳', '牛顿', '瓦特', '帕斯卡'], correctAnswer: '牛顿', explanation: '力的国际单位是牛顿，符号 N。' },
  { id: 'q_middle_9', subject: '物理', difficulty: 4, gradeLevel: '初二', type: 'single_choice', content: '一物体在水平面上受到 10 N 的水平拉力做匀速直线运动，它所受摩擦力大小为？', options: ['0 N', '5 N', '10 N', '无法确定'], correctAnswer: '10 N', explanation: '匀速直线运动时合力为零，摩擦力等于拉力 10 N。' },
  { id: 'q_middle_10', subject: '物理', difficulty: 5, gradeLevel: '初二', type: 'single_choice', content: '欧姆定律的表达式是？', options: ['I = U/R', 'I = UR', 'I = R/U', 'U = I/R'], correctAnswer: 'I = U/R', explanation: '欧姆定律：通过导体的电流 I 与电压 U 成正比，与电阻 R 成反比。' },
  { id: 'q_middle_11', subject: '化学', difficulty: 3, gradeLevel: '初二', type: 'single_choice', content: '水的化学式是？', options: ['H2O', 'CO2', 'O2', 'NaCl'], correctAnswer: 'H2O', explanation: '水由 2 个氢原子和 1 个氧原子构成，化学式 H2O。' },
  { id: 'q_middle_12', subject: '化学', difficulty: 4, gradeLevel: '初二', type: 'single_choice', content: '下列哪种物质属于单质？', options: ['水', '氧气', '二氧化碳', '氯化钠'], correctAnswer: '氧气', explanation: '氧气 O2 由同种元素组成，是单质；其余均为化合物。' },
  { id: 'q_middle_13', subject: '化学', difficulty: 5, gradeLevel: '初二', type: 'single_choice', content: '实验室用 H2 与 O2 反应生成水，该反应类型属于？', options: ['化合反应', '分解反应', '置换反应', '复分解反应'], correctAnswer: '化合反应', explanation: '两种物质生成一种新物质的反应是化合反应：2H2 + O2 = 2H2O。' },
  { id: 'q_middle_14', subject: '生物', difficulty: 3, gradeLevel: '初二', type: 'single_choice', content: '植物进行光合作用的主要场所是？', options: ['细胞核', '叶绿体', '线粒体', '细胞膜'], correctAnswer: '叶绿体', explanation: '叶绿体含有叶绿素，是光合作用的场所。' },
  { id: 'q_middle_15', subject: '生物', difficulty: 4, gradeLevel: '初二', type: 'single_choice', content: '人体呼吸过程中，吸入的气体中含量最多的成分是？', options: ['氧气', '二氧化碳', '氮气', '水蒸气'], correctAnswer: '氮气', explanation: '空气中氮气约占 78%，吸入气体中氮气含量最高。' },

  // ─── 大学生（10 题：数学 3 + 英语 2 + 物理 2 + 化学 2 + 生物 1）──────
  { id: 'q_college_1', subject: '数学', difficulty: 4, gradeLevel: '大一', type: 'single_choice', content: '极限 lim(x→0) (sin x) / x = ?', options: ['0', '1', '∞', '不存在'], correctAnswer: '1', explanation: '这是重要极限之一，lim(x→0) sin(x)/x = 1。' },
  { id: 'q_college_2', subject: '数学', difficulty: 5, gradeLevel: '大一', type: 'single_choice', content: '函数 f(x) = x² 的导数 f\'(x) = ?', options: ['x', '2x', 'x²/2', '2'], correctAnswer: '2x', explanation: '由幂函数求导公式 (xⁿ)\' = n·xⁿ⁻¹，得 (x²)\' = 2x。' },
  { id: 'q_college_3', subject: '数学', difficulty: 3, gradeLevel: '大一', type: 'single_choice', content: '矩阵 [[1,2],[3,4]] 的行列式为？', options: ['-2', '2', '0', '1'], correctAnswer: '-2', explanation: '2×2 行列式 |a b; c d| = ad - bc = 1·4 - 2·3 = -2。' },
  { id: 'q_college_4', subject: '英语', difficulty: 4, gradeLevel: '大一', type: 'single_choice', content: 'Choose the word that best completes: "He is _____ in computer science."', options: ['majoring', 'majored', 'major', 'majors'], correctAnswer: 'majoring', explanation: '"be majoring in" 表示正在主修某专业，用现在进行时。' },
  { id: 'q_college_5', subject: '英语', difficulty: 5, gradeLevel: '大一', type: 'single_choice', content: 'Which of the following is a thesis statement (thesis)?', options: ['In this essay...', 'I will write about...', 'Social media has reshaped modern communication.', 'Firstly, ...'], correctAnswer: 'Social media has reshaped modern communication.', explanation: '论点（thesis）应是表达明确观点的陈述句，其余只是引入或过渡。' },
  { id: 'q_college_6', subject: '物理', difficulty: 4, gradeLevel: '大一', type: 'single_choice', content: '牛顿第二定律的表达式是？', options: ['F = ma', 'F = mv', 'F = m/a', 'a = Fm'], correctAnswer: 'F = ma', explanation: '牛顿第二定律：物体所受合外力等于质量与加速度的乘积。' },
  { id: 'q_college_7', subject: '物理', difficulty: 5, gradeLevel: '大一', type: 'single_choice', content: '理想气体状态方程是？', options: ['PV = nRT', 'P = nRT', 'V = nRT', 'PV = T'], correctAnswer: 'PV = nRT', explanation: '理想气体状态方程 PV = nRT，P 压强、V 体积、n 物质的量、R 气体常数、T 温度。' },
  { id: 'q_college_8', subject: '化学', difficulty: 4, gradeLevel: '大一', type: 'single_choice', content: '下列哪个是芳香烃？', options: ['甲烷', '苯', '乙醇', '乙酸'], correctAnswer: '苯', explanation: '苯 (C6H6) 是典型的芳香烃，含苯环结构。' },
  { id: 'q_college_9', subject: '化学', difficulty: 5, gradeLevel: '大一', type: 'single_choice', content: '化学平衡常数 Kc 与下列哪个因素有关？', options: ['浓度', '压力', '温度', '催化剂'], correctAnswer: '温度', explanation: '平衡常数 Kc 只与温度有关，与浓度、压力、催化剂无关。' },
  { id: 'q_college_10', subject: '生物', difficulty: 4, gradeLevel: '大一', type: 'single_choice', content: 'DNA 双螺旋结构是谁发现的？', options: ['达尔文', '孟德尔', '沃森和克里克', '巴斯德'], correctAnswer: '沃森和克里克', explanation: '1953 年，沃森 (Watson) 和克里克 (Crick) 提出 DNA 双螺旋结构。' },

  // ─── 上班族（10 题：数学 3 + 英语 4 + 语文 3）──────────────────
  { id: 'q_pro_1', subject: '数学', difficulty: 3, gradeLevel: '自学', type: 'single_choice', content: '本金 10000 元，年利率 5%，按单利计算，2 年后利息是多少元？', options: ['500', '1000', '1500', '2000'], correctAnswer: '1000', explanation: '单利公式：利息 = 本金 × 利率 × 时间 = 10000 × 5% × 2 = 1000 元。' },
  { id: 'q_pro_2', subject: '数学', difficulty: 4, gradeLevel: '自学', type: 'single_choice', content: '某商品原价 200 元，先涨价 10%，再降价 10%，最终价格是多少元？', options: ['200', '198', '202', '196'], correctAnswer: '198', explanation: '200 × 1.1 × 0.9 = 198 元，先后两个 10% 不相抵。' },
  { id: 'q_pro_3', subject: '数学', difficulty: 5, gradeLevel: '自学', type: 'single_choice', content: '每月定投 1000 元，年化收益率 6%，按月复利，1 年后约有多少？（不考虑费用）', options: ['约 12000 元', '约 12330 元', '约 12600 元', '约 13000 元'], correctAnswer: '约 12330 元', explanation: '每月定投期初年金终值公式约得 12330 元，比 12000 多出复利收益。' },
  { id: 'q_pro_4', subject: '英语', difficulty: 2, gradeLevel: '自学', type: 'single_choice', content: '职场中，收到邮件时常用 "_____" 表示已收到。', options: ['Noted', 'Forgot', 'Ignored', 'Deleted'], correctAnswer: 'Noted', explanation: '"Noted" 在职场邮件中表示 "已知悉/已记录"。' },
  { id: 'q_pro_5', subject: '英语', difficulty: 3, gradeLevel: '自学', type: 'single_choice', content: 'Which phrase means "请按时完成"?', options: ['Please complete on time.', 'Please complete later.', 'Take your time.', 'No rush.'], correctAnswer: 'Please complete on time.', explanation: '"on time" 表示按时，整句意为请按时完成。' },
  { id: 'q_pro_6', subject: '英语', difficulty: 4, gradeLevel: '自学', type: 'single_choice', content: 'Meeting 中 "Let\'s table this issue" 的意思是？', options: ['把这个问题放到桌面上讨论', '暂搁此问题，留待以后讨论', '立即解决此问题', '取消此问题'], correctAnswer: '暂搁此问题，留待以后讨论', explanation: '"table an issue" 在会议语境中常表示推迟讨论，留待以后再说。' },
  { id: 'q_pro_7', subject: '英语', difficulty: 5, gradeLevel: '自学', type: 'single_choice', content: '商务邮件结尾，下列哪个最正式？', options: ['Cheers,', 'Bye!', 'Sincerely,', 'See ya!'], correctAnswer: 'Sincerely,', explanation: '"Sincerely," 是商务/正式邮件中常用的结尾敬语。' },
  { id: 'q_pro_8', subject: '语文', difficulty: 2, gradeLevel: '自学', type: 'single_choice', content: '下列哪种属于应用文？', options: ['诗歌', '请假条', '散文', '小说'], correctAnswer: '请假条', explanation: '请假条是日常生活与工作中常用的应用文。' },
  { id: 'q_pro_9', subject: '语文', difficulty: 3, gradeLevel: '自学', type: 'single_choice', content: '写工作汇报时，下列哪种表述更专业？', options: ['我觉得吧，这事挺好', '本月完成销售额 50 万元，同比增长 10%', '做了点事，还行', '马马虎虎吧'], correctAnswer: '本月完成销售额 50 万元，同比增长 10%', explanation: '工作汇报应使用具体数据与专业表达，避免口语化。' },
  { id: 'q_pro_10', subject: '语文', difficulty: 4, gradeLevel: '自学', type: 'single_choice', content: '通知的正文开头通常应包含？', options: ['原因、依据或目的', '故事开头', '诗句', '比喻'], correctAnswer: '原因、依据或目的', explanation: '通知开头应说明发文缘由、依据或目的，再写事项与要求。' },
];

export async function isSeeded(): Promise<boolean> {
  const kpCount = await count(STORES.KNOWLEDGE_POINTS);
  return kpCount > 0;
}

export async function seedIfEmpty(): Promise<void> {
  if (await isSeeded()) return;
  await putMany(STORES.KNOWLEDGE_POINTS, KNOWLEDGE_POINTS_SEED);
  await putMany(STORES.QUESTIONS, QUESTIONS_SEED);
}
