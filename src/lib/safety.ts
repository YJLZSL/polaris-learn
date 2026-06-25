const SENSITIVE_WORDS = [
  "自杀", "自残", "杀人", "砍人", "爆炸方法", "制毒", "炸弹制作",
  "色情", "性行为", "裸照", "盗窃方法", "诈骗技巧", "黑客工具",
  "木马程序", "赌博", "毒品", "逃学方法", "作弊技巧",
  "如何撒谎", "伪造签名", "破解家长控制",
];

const JAILBREAK_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instruction/i,
  /(pretend|act\s+as|roleplay)\s+.*(?:unrestricted|no\s+limit)/i,
  /\bDAN\b.*do\s+anything/i,
  /developer\s+mode.*enabled/i,
  /忘记.*(所有|一切).*指令/i,
  /现在.*你.*是.*没有.*限制/i,
];

const NON_EDUCATION_TOPICS: Record<string, string> = {
  "谈恋爱": "我们还是继续学习吧~有什么学习上的问题吗？",
  "玩游戏": "学习之余适当放松是可以的，不过现在我们先专注于这道题吧！",
  "八卦": "这个话题不在我的辅导范围内哦，有什么学习上的问题吗？",
  "明星": "我主要是帮你学习的，让我们继续学习吧！",
  "政治": "我主要是帮你学习的，政治上我不够专业，有什么学习问题吗？",
  "宗教": "让我们回到学习上吧！有什么题目需要我帮你分析吗？",
};

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  response?: string;
  severity?: "low" | "medium" | "high" | "critical";
  action?: string;
}

export function checkInputSafety(input: string): SafetyCheckResult {
  if (!input || input.trim().length === 0) {
    return { safe: false, reason: "输入为空" };
  }

  if (input.length > 2000) {
    return { safe: false, reason: "输入过长，请精简后重试" };
  }

  for (const word of SENSITIVE_WORDS) {
    if (input.includes(word)) {
      return {
        safe: false,
        reason: "检测到不当内容",
        severity: "critical",
        response: "我是你的AI学习助手，主要帮你解决学习上的问题。这个话题不在我的辅导范围内。我们继续学习吧！",
        action: "block_and_notify",
      };
    }
  }

  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(input)) {
      return {
        safe: false,
        reason: "检测到指令注入尝试",
        severity: "high",
        response: "我是专门辅导你学习的AI老师哦！让我们一起继续学习吧，有什么题目需要帮助吗？",
        action: "block_and_log",
      };
    }
  }

  for (const [topic, response] of Object.entries(NON_EDUCATION_TOPICS)) {
    if (input.includes(topic)) {
      return {
        safe: true,
        reason: "非教育话题",
        severity: "low",
        response,
        action: "redirect",
      };
    }
  }

  return { safe: true };
}

export function checkOutputSafety(output: string): SafetyCheckResult {
  for (const word of SENSITIVE_WORDS) {
    if (output.includes(word)) {
      return { safe: false, reason: "输出包含不当内容", severity: "critical" };
    }
  }
  return { safe: true };
}

export function getSocraticRefusalResponse(): string {
  const responses = [
    "我理解你想快点知道答案！但直接告诉你答案对你的学习帮助不大。让我们一起一步步分析，你会记得更牢。",
    "我不能直接给你答案，但我可以引导你思考。你觉得这道题考察的是什么知识点呢？",
    "学习的关键是理解过程，而不是得到答案。来，让我们先从你的思路开始——你觉得第一步应该做什么？",
    "我知道有时候很想直接知道答案，但真正掌握知识的办法是自己推导。我们一起试试看？",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function detectEmotion(messages: { role: string; content: string }[]): string {
  const recentMessages = messages.slice(-5);
  let frustrationCount = 0;
  let confusionCount = 0;

  for (const msg of recentMessages) {
    if (msg.role !== "user") continue;
    const text = msg.content;
    if (/不会|太难了|放弃|烦|不懂|不明白|算了/.test(text)) frustrationCount++;
    if (/什么意思|不明白|\?\?\?|啥|什么/.test(text)) confusionCount++;
  }

  if (frustrationCount >= 2) return "frustrated";
  if (confusionCount >= 2) return "confused";
  return "normal";
}
