export interface SocraticPrompt {
  stage: string;
  content: string;
  options?: string[];
}

const SOCRATIC_STAGES = [
  "diagnostic",
  "clarification",
  "hypothesis",
  "reasoning",
  "reflection",
  "verification",
];

const SUBJECT_TEMPLATES: Record<string, SocraticPrompt[]> = {
  math: [
    { stage: "diagnostic", content: "看到这道题，你觉得它考察的是什么知识点？" },
    { stage: "clarification", content: "你能从题目中找出哪些已知条件？" },
    { stage: "hypothesis", content: "你觉得应该用什么方法来解决？能说说你的思路吗？" },
    { stage: "reasoning", content: "很好！按照你的思路，第一步应该怎么算？" },
    { stage: "verification", content: "得出答案后，我们怎么验证它是正确的呢？" },
    { stage: "reflection", content: "这道题的解题方法和之前学的有什么关系？你能总结一下吗？" },
  ],
  chinese: [
    { stage: "diagnostic", content: "这篇文章主要讲了什么？你能用自己的话概括一下吗？" },
    { stage: "clarification", content: "你觉得作者想表达什么思想感情？" },
    { stage: "hypothesis", content: "如果让你来写，你会怎样组织这篇作文的结构？" },
    { stage: "reasoning", content: "这个修辞手法在这里起到了什么作用？" },
    { stage: "reflection", content: "这篇文章给你的启发是什么？" },
  ],
  english: [
    { stage: "diagnostic", content: "先读一遍题目，你能理解题干的意思吗？" },
    { stage: "clarification", content: "这里的关键词是什么？它提示了什么语法点？" },
    { stage: "hypothesis", content: "根据上下文，你觉得应该选哪个时态？为什么？" },
    { stage: "reasoning", content: "能试着用英语说出你的思考过程吗？" },
    { stage: "reflection", content: "这个语法规则还可以用在哪些场景？" },
  ],
  physics: [
    { stage: "diagnostic", content: "这道物理题涉及什么物理概念？" },
    { stage: "clarification", content: "题目中给出了哪些物理量？它们之间有什么关系？" },
    { stage: "hypothesis", content: "应该用哪个物理公式来解决这个问题？" },
    { stage: "reasoning", content: "代入数据算一算，你得到了什么结果？单位对吗？" },
    { stage: "reflection", content: "如果改变其中一个条件，结果会怎样变化？" },
  ],
};

const ENCOURAGEMENTS = [
  "完全正确！👍",
  "太棒了！你自己想到了！🎉",
  "非常好！你的思路很清晰！",
  "没错！继续加油！💪",
  "答对了！你的理解很到位！",
];

const GENTLE_CORRECTIONS = [
  "嗯，这里有个小细节需要注意...",
  "你的思路方向是对的，不过再想想这一步...",
  "很接近了！但这里有个小陷阱，很多人都容易踩...",
  "你的直觉很好，不过我们再仔细看看...",
];

const STUCK_RESPONSES = [
  "没关系，让我们换个角度想想。你可以从已知条件出发，看看能推出什么。",
  "卡住了吗？我们退一步，先回顾一下相关的基础概念。",
  "给你一个小提示：注意题目中的这个关键词...",
];

const ANSWER_REQUEST_RESPONSES = [
  "我理解你想快点知道答案！😊 但我不能直接把答案给你，因为那样的话你可能很快就忘了。让我们一起分析，你自己得出的答案会记得更牢！",
  "我知道有时候很想直接知道答案，但真正掌握知识的方法是理解过程。我们已经很接近了！你觉得下一步该怎么做？",
  "不能直接告诉你答案哦~但我可以引导你：注意看题目中的这个条件，它能帮你找到突破口。",
];

const SUMMARY_TEMPLATES: Record<string, string> = {
  math: "总结一下你刚才用到的知识点：\n1️⃣ 审题找已知条件\n2️⃣ 确定适用的公式/定理\n3️⃣ 分步计算验证\n4️⃣ 检验答案合理性",
  chinese: "总结一下阅读理解的方法：\n1️⃣ 通读全文把握大意\n2️⃣ 定位关键句和关键词\n3️⃣ 分析写作手法和修辞\n4️⃣ 联系上下文理解深意",
  english: "总结一下解题思路：\n1️⃣ 理解题干和选项\n2️⃣ 确定考察的语法点\n3️⃣ 结合上下文分析\n4️⃣ 排除干扰项选出最佳答案",
  physics: "总结一下物理解题步骤：\n1️⃣ 明确已知物理量和未知量\n2️⃣ 选择适用的物理公式\n3️⃣ 代入数据计算\n4️⃣ 检查单位换算和结果合理性",
};

export function getSocraticPrompt(
  subject: string,
  stage: string,
  studentAnswer?: string,
  isCorrect?: boolean
): string {
  const templates = SUBJECT_TEMPLATES[subject] || SUBJECT_TEMPLATES.math;

  if (studentAnswer === "直接告诉我答案" || studentAnswer === "给答案") {
    return ANSWER_REQUEST_RESPONSES[Math.floor(Math.random() * ANSWER_REQUEST_RESPONSES.length)];
  }

  if (studentAnswer && studentAnswer.length < 3) {
    return STUCK_RESPONSES[Math.floor(Math.random() * STUCK_RESPONSES.length)];
  }

  if (isCorrect === true) {
    const enc = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    const nextStage = templates.find((t) => t.stage === stage);
    if (nextStage) {
      return `${enc} ${nextStage.content}`;
    }
    return `${enc} 要不要做一道类似的题巩固一下？`;
  }

  if (isCorrect === false) {
    const correction = GENTLE_CORRECTIONS[Math.floor(Math.random() * GENTLE_CORRECTIONS.length)];
    return `${correction} 要不要再试一次？`;
  }

  const prompt = templates.find((t) => t.stage === stage);
  if (prompt) return prompt.content;

  return "你觉得这道题应该从哪里入手呢？说说你的想法吧！";
}

export function getSummaryResponse(subject: string): string {
  return SUMMARY_TEMPLATES[subject] || SUMMARY_TEMPLATES.math;
}

export function getNextStage(currentStage: string): string {
  const idx = SOCRATIC_STAGES.indexOf(currentStage);
  if (idx >= 0 && idx < SOCRATIC_STAGES.length - 1) {
    return SOCRATIC_STAGES[idx + 1];
  }
  return "reflection";
}

export function simulateAIResponse(
  subject: string,
  question: string,
  stage: string,
  studentMessage: string
): { content: string; nextStage: string; isCorrect?: boolean } {
  const lowered = studentMessage.toLowerCase().trim();

  const isCorrect =
    lowered.includes("对") ||
    lowered.includes("是的") ||
    lowered.includes("没错") ||
    lowered.includes("正确") ||
    (subject === "math" && /\d+/.test(lowered) && lowered.length > 5);

  const isAskingForAnswer =
    lowered.includes("答案") ||
    lowered.includes("直接说") ||
    lowered.includes("告诉我");

  if (isAskingForAnswer) {
    return {
      content: getSocraticPrompt(subject, stage, "直接告诉我答案"),
      nextStage: stage,
    };
  }

  if (isCorrect && stage !== "reflection") {
    const nextStage = getNextStage(stage);
    return {
      content: getSocraticPrompt(subject, nextStage, studentMessage, true),
      nextStage,
      isCorrect: true,
    };
  }

  if (!isCorrect && lowered.length > 0 && stage !== "diagnostic") {
    return {
      content: getSocraticPrompt(subject, stage, studentMessage, false),
      nextStage: stage,
      isCorrect: false,
    };
  }

  const nextStage = isCorrect ? getNextStage(stage) : stage;
  return {
    content: getSocraticPrompt(subject, nextStage, studentMessage),
    nextStage,
  };
}
