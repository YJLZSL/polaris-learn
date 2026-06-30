import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Send,
  ArrowLeft,
  Lightbulb,
  ShieldCheck,
  Bot,
  User,
  Trash2,
  Loader2,
  AlertTriangle,
  RotateCw,
  Volume2,
  Mic,
  MicOff,
  Square,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { SUBJECTS } from "@/lib/constants";
import { getSubjectsForMode } from "@/lib/learning-modes";
import { getCurrentUser } from "@/lib/services/auth-service";
import { chat as aiChat, type ChatMessage } from "@/lib/services/ai-service";
import { updateQuestProgress } from "@/lib/repositories/quest.repository";
import { bumpSubjectRootMastery } from "@/lib/repositories/knowledge.repository";
import { useTTS } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import {
  getConversations as repoGetConversations,
  saveConversation as repoSaveConversation,
  deleteConversation as repoDeleteConversation,
  getConversationById as repoGetConversationById,
  type AIConversation,
} from "@/lib/repositories/conversation.repository";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { slideInBottom } from "@/lib/motion";
import PolarisMascot from "@/components/common/PolarisMascot";
import { ProgressRing } from "@/components/common/ProgressRing";

/* ---------- types ---------- */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  stage?: string;
  timestamp: number;
  interrupted?: boolean;
  fallback?: boolean;
}

interface Conversation {
  id: string;
  subject: string;
  title: string;
  lastMessage: {
    content: string;
    role: string;
    createdAt: string;
  } | null;
  updatedAt: string;
  createdAt: string;
}

type SocraticStage =
  | "diagnostic"
  | "clarification"
  | "hypothesis"
  | "reasoning"
  | "verification"
  | "reflection";

/* ---------- constants ---------- */
const SUBJECT_CONFIG: Record<string, { icon: string; color: string; desc: string; bgGradient: string }> = {
  数学: { icon: "📐", color: "from-blue-400 to-blue-600", desc: "代数、几何、函数", bgGradient: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20" },
  语文: { icon: "📖", color: "from-orange-400 to-orange-600", desc: "阅读、写作、文言文", bgGradient: "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20" },
  英语: { icon: "🌍", color: "from-green-400 to-green-600", desc: "词汇、语法、阅读", bgGradient: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20" },
  物理: { icon: "⚡", color: "from-purple-400 to-purple-600", desc: "力学、电磁学、光学", bgGradient: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20" },
  化学: { icon: "🧪", color: "from-teal-400 to-teal-600", desc: "元素、反应、方程式", bgGradient: "from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20" },
  生物: { icon: "🧬", color: "from-pink-400 to-pink-600", desc: "细胞、遗传、生态", bgGradient: "from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20" },
};

const STAGE_INFO: Record<SocraticStage, { label: string; color: string; icon: string }> = {
  diagnostic: { label: "诊断", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: "🔍" },
  clarification: { label: "澄清", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: "💡" },
  hypothesis: { label: "假设", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300", icon: "🤔" },
  reasoning: { label: "推理", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: "🧠" },
  verification: { label: "验证", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: "✅" },
  reflection: { label: "反思", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: "🪞" },
};

const STAGE_ORDER: SocraticStage[] = [
  "diagnostic",
  "clarification",
  "hypothesis",
  "reasoning",
  "verification",
  "reflection",
];

/** Task 6.7: AI 推理摘要（思考过程折叠区内容） */
const STAGE_REASONING: Record<SocraticStage, string> = {
  diagnostic: "正在诊断你的知识水平，确定最佳教学起点。",
  clarification: "正在澄清问题要点，确保理解无误。",
  hypothesis: "正在引导你形成解题假设与初步思路。",
  reasoning: "正在引导你逐步推理，拆解解题步骤。",
  verification: "正在引导你验证答案的正确性。",
  reflection: "正在引导你反思学习过程，总结收获。",
};

/** Task 6.3: 解析 <stage> 标签 */
const STAGE_TAG_REGEX = /^<stage>(\w+)<\/stage>$/m;

function parseStageTag(content: string): SocraticStage | null {
  const match = content.match(STAGE_TAG_REGEX);
  if (!match) return null;
  const stage = match[1] as SocraticStage;
  return STAGE_ORDER.includes(stage) ? stage : null;
}

/**
 * Task 6.6: 剥离 <stage> 标签（不显示给用户）
 * 同时处理流式传输中的部分标签（如 "<stage>diag"、"<st"）
 */
function stripStageTag(content: string): string {
  // 移除完整的 stage 标签
  let result = content.replace(/<stage>\w+<\/stage>/g, "");
  // 流式中：移除末尾的部分 stage 标签
  const stageIdx = result.lastIndexOf("<stage");
  if (stageIdx !== -1) {
    result = result.slice(0, stageIdx);
  } else {
    // 检查末尾是否有部分开标签（<, <s, <st, <sta, <stag）
    for (const p of ["<stag", "<sta", "<st", "<s", "<"]) {
      if (result.endsWith(p)) {
        result = result.slice(0, -p.length);
        break;
      }
    }
  }
  return result.replace(/\s+$/, "");
}

/** 判断是否为高级学段（展示思考过程折叠区） */
function isAdvancedMode(mode: string): boolean {
  return mode === "MIDDLE" || mode === "HIGH" || mode === "PROFESSIONAL";
}

const DIRECT_ANSWER_RESPONSE = "我理解你想要直接答案，但苏格拉底教学法的核心是引导你自己发现问题。试着告诉我：你对这道题有什么初步的想法？哪怕是直觉也可以，我们一起来分析。";

/** Task 17.8: empty state recommended questions */
const RECOMMENDED_QUESTIONS = ["这道题我不会做", "帮我复习重点知识", "解释一下这个概念"];

/* ---------- helper ---------- */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Task 17.6: thinking fold (AnimatePresence + height auto) */
function ThinkingFold({ stage }: { stage: SocraticStage }) {
  const [open, setOpen] = useState(false);
  const info = STAGE_INFO[stage];
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="text-[10px] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1">
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} className="inline-block">▸</motion.span>
        查看思考过程
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="overflow-hidden">
            <p className="text-[10px] text-muted-foreground/70 mt-1 pl-3 italic leading-relaxed">
              阶段：{info.label} - {STAGE_REASONING[stage]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- component ---------- */
export default function AiTeacherPage() {
  const { weakPoints, addXP, learningMode, setUser, id: userId, initFromAuth } = useUserStore();

  /* ----- Task 19.2: 接收来自 PracticePage / ErrorNotesPage 的错题上下文 ----- */
  const location = useLocation();
  const passedContext = location.state as {
    errorNoteId?: string;
    question?: string;
    userAnswer?: string;
    correctAnswer?: string;
    subject?: string;
  } | null;

  /* ----- 拉取用户 learningMode（用于学科过滤与样式适配） ----- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initFromAuth();
        const user = await getCurrentUser();
        if (!cancelled && user?.learningMode) {
          setUser({ learningMode: user.learningMode });
        }
      } catch {
        // silent: 失败时使用默认 PRIMARY 模式
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, initFromAuth]);

  /* ----- 基于学习模式派生可用学科与 UI 风格 ----- */
  const allowedSubjectIds = getSubjectsForMode(learningMode);
  const visibleSubjects = SUBJECTS.filter((s) => allowedSubjectIds.includes(s.id));
  const isKindergarten = learningMode === "KINDERGARTEN";

  /* ----- state ----- */
  const [subject, setSubject] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<SocraticStage>("diagnostic");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [convsError, setConvsError] = useState<string | null>(null);
  const [showConvsMobile, setShowConvsMobile] = useState(true);
  const [newConvDialogOpen, setNewConvDialogOpen] = useState(false);
  const [newConvSubject, setNewConvSubject] = useState<string>("");

  /* ----- Task 19.2: 待发送的错题提问 prompt（等 subject 就绪后自动发送） ----- */
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  /* ----- Task 19.2: 防止重复处理同一份 router state ----- */
  const aiContextHandledRef = useRef<boolean>(false);
  /* ----- Task 19.3: 标记本次会话是否已发放 reflection 阶段掌握度奖励 ----- */
  const masteryBumpedRef = useRef<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ----- Task 7: 流式响应 refs ----- */
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamBufferRef = useRef<string>("");
  const streamDisplayIdxRef = useRef<number>(0);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const streamCompletedRef = useRef<boolean>(false);

  /* ----- Task 8: 语音功能 hooks ----- */
  const { speak: ttsSpeak, stop: ttsStop, isSpeaking } = useTTS();
  const { isListening, transcript: sttTranscript, startListening, stopListening } = useSTT();

  /* ----- Task 8: STT 实时回填输入框 ----- */
  useEffect(() => {
    if (isListening && sttTranscript) {
      setInput(sttTranscript);
    }
  }, [isListening, sttTranscript]);

  /* ----- Task 8.6: 追踪当前朗读的消息 ID ----- */
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const handleSpeakMessage = useCallback((msgId: string, content: string) => {
    if (speakingMsgId === msgId && isSpeaking) {
      ttsStop();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msgId);
      ttsSpeak(content).then(() => {
        setSpeakingMsgId((cur) => (cur === msgId ? null : cur));
      });
    }
  }, [speakingMsgId, isSpeaking, ttsSpeak, ttsStop]);

  /* ----- load conversations ----- */
  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }
    setConvsLoading(true);
    setConvsError(null);
    try {
      const list = await repoGetConversations(userId);
      // 映射 AIConversation -> 本地 Conversation 结构
      const mapped: Conversation[] = list.map((c) => {
        const lastMsg = c.messages?.[c.messages.length - 1];
        return {
          id: c.id,
          subject: c.subject,
          title: c.title || `${c.subject} 学习对话`,
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                role: lastMsg.role,
                createdAt: lastMsg.timestamp,
              }
            : null,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        };
      });
      setConversations(mapped);
    } catch (err) {
      setConversations([]);
      setConvsError(err instanceof Error ? err.message : "加载对话列表失败");
    } finally {
      setConvsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  /* ----- Task 19.2: 收到错题上下文时构造 prompt 并预置 subject ----- */
  useEffect(() => {
    if (!passedContext?.question) return;
    if (aiContextHandledRef.current) return;
    aiContextHandledRef.current = true;

    // 重置会话状态，开启新对话
    setMessages([]);
    setConversationId(null);
    setCurrentStage("diagnostic");
    masteryBumpedRef.current = false;
    if (passedContext.subject) {
      setSubject(passedContext.subject);
    }

    const q = passedContext.question;
    const ua = passedContext.userAnswer ?? "?";
    const ca = passedContext.correctAnswer ?? "?";
    setPendingPrompt(`这道题我做错了：${q}。我选了${ua}，正确答案是${ca}。请用苏格拉底法引导我理解错在哪里。`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passedContext]);

  /* ----- auto-scroll ----- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* ----- Task 7.6: 停止生成 ----- */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    const msgId = streamingMsgIdRef.current;
    if (msgId && streamBufferRef.current) {
      const display = stripStageTag(streamBufferRef.current);
      const parsed = parseStageTag(streamBufferRef.current);
      if (parsed) setCurrentStage(parsed);
      setMessages((prev) => prev.map((m) =>
        m.id === msgId
          ? { ...m, content: display, stage: parsed || currentStage, interrupted: true }
          : m
      ));
    }
    streamBufferRef.current = "";
    streamDisplayIdxRef.current = 0;
    streamingMsgIdRef.current = null;
    streamCompletedRef.current = false;
    abortControllerRef.current = null;
    setIsLoading(false);
  }, [currentStage]);

  /* ----- send message (Task 6.3-6.5, 7.5-7.7) ----- */
  const sendMessage = useCallback(
    async (overrideMessage?: string) => {
      const msg = (overrideMessage ?? input).trim();
      if (!msg || !subject || isLoading) return;

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: msg,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      // Task 7.5: 消息气泡立即出现，内容逐字流入
      const aiMsgId = generateId();
      const aiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // 初始化流式状态
      streamBufferRef.current = "";
      streamDisplayIdxRef.current = 0;
      streamingMsgIdRef.current = aiMsgId;
      streamCompletedRef.current = false;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Task 7.5: 打字机定时器（每 50ms 一个字符）
      streamTimerRef.current = setInterval(() => {
        const buffer = streamBufferRef.current;
        const idx = streamDisplayIdxRef.current;
        if (idx < buffer.length) {
          streamDisplayIdxRef.current = idx + 1;
          const raw = buffer.slice(0, idx + 1);
          const display = stripStageTag(raw);
          setMessages((prev) => prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: display } : m
          ));
        } else if (streamCompletedRef.current) {
          if (streamTimerRef.current) {
            clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
          }
          // 打字机自行收尾时释放 loading 状态
          setIsLoading(false);
        }
      }, 50);

      try {
        const chatMessages: ChatMessage[] = [
          ...messages.map((m) => ({
            role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: msg },
        ];

        // Task 7.1-7.4: 流式调用 AI（传入 weakPoints + onChunk）
        const result = await aiChat(
          chatMessages,
          learningMode,
          undefined,
          undefined,
          abortController.signal,
          weakPoints,
          (chunk) => { streamBufferRef.current += chunk; }
        );

        // Task 7.7: 流式结束，标记完成（打字机定时器检测到后自行收尾）
        streamCompletedRef.current = true;

        // Task 6.3/6.4: 解析末尾 <stage> 标签驱动阶段进度条
        const parsedStage = parseStageTag(result.content);
        if (parsedStage) {
          setCurrentStage(parsedStage);
        }
        // Task 6.5: stage 缺失时保持当前阶段不变，不报错

        // Task 6.6: 剥离 <stage> 标签后的展示内容
        const displayContent = stripStageTag(result.content);

        // 同步更新消息的 stage 与 fallback 字段（content 由打字机最终写入）
        setMessages((prev) => prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, stage: parsedStage || currentStage, fallback: result.fallback }
            : m
        ));

        // 持久化对话到 IndexedDB（使用剥离 stage 后的内容）
        const convId = conversationId || generateId();
        if (userId) {
          const existing = await repoGetConversationById(convId);
          const nowIso = new Date().toISOString();
          const newMessages: AIConversation["messages"] = [
            ...(existing?.messages || []),
            { role: "user", content: msg, timestamp: nowIso },
            { role: "assistant", content: displayContent, timestamp: nowIso },
          ];
          const conv: AIConversation = {
            id: convId,
            userId,
            subject: subject || "数学",
            title: existing?.title || msg.slice(0, 24),
            messages: newMessages,
            createdAt: existing?.createdAt || nowIso,
            updatedAt: nowIso,
          };
          await repoSaveConversation(conv);
        }

        setConversationId(convId);

        // award XP for interaction
        addXP(5);

        // Task 19.3: 上报每日任务 ai_chat 进度（每轮对话 +1）
        if (userId) {
          updateQuestProgress(userId, "ai_chat", 1).catch(() => {
            /* 静默失败 */
          });
        }

        // Task 19.3: 对话达到 reflection 阶段时，提升该学科根节点掌握度 +5（封顶 100）
        // 幂等：同一会话仅发放一次
        if (
          parsedStage === "reflection" &&
          !masteryBumpedRef.current &&
          userId &&
          subject
        ) {
          masteryBumpedRef.current = true;
          bumpSubjectRootMastery(userId, subject, 5).catch(() => {
            /* 静默失败：不阻塞对话 */
          });
        }

        // reload conversations list
        loadConversations();
      } catch (err) {
        // Task 7.6: AbortError - 已在 stopGeneration 中处理消息更新，这里仅清理
        if ((err as Error)?.name === "AbortError") {
          return;
        }
        // 网络错误：移除空的 assistant 消息气泡，显示错误提示
        setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
        const errMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: "网络连接失败，请检查网络后重试",
          stage: currentStage,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        // 清理打字机（finally 据此跳过等待并设置 isLoading=false）
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
      } finally {
        abortControllerRef.current = null;
        // 若打字机仍在运行，由其自行收尾时设置 isLoading=false
        if (!streamTimerRef.current) {
          setIsLoading(false);
        }
      }
    },
    [input, subject, isLoading, conversationId, currentStage, addXP, loadConversations, learningMode, userId, messages, weakPoints]
  );

  /* ----- Task 19.2: subject 就绪后自动发送错题提问 prompt ----- */
  useEffect(() => {
    if (!pendingPrompt || !subject || isLoading) return;
    const msg = pendingPrompt;
    setPendingPrompt(null);
    void sendMessage(msg);
  }, [pendingPrompt, subject, isLoading, sendMessage]);

  /* ----- handle "直接告诉我答案" ----- */
  const handleDirectAnswer = useCallback(() => {
    if (isLoading) return;
    const aiMsg: Message = {
      id: generateId(),
      role: "assistant",
      content: DIRECT_ANSWER_RESPONSE,
      stage: "clarification",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setCurrentStage("clarification");
  }, [isLoading]);

  /* ----- handle keypress ----- */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ----- select conversation ----- */
  const selectConversation = useCallback(
    async (conv: Conversation) => {
      setSubject(conv.subject);
      setConversationId(conv.id);
      setMessages([]);
      setCurrentStage("diagnostic");
      masteryBumpedRef.current = false;
      setShowConvsMobile(false);

      // 从 IndexedDB 加载历史消息
      try {
        const existing = await repoGetConversationById(conv.id);
        if (existing?.messages?.length) {
          const restored: Message[] = existing.messages.map((m, i) => ({
            id: `${conv.id}_${i}`,
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
            timestamp: new Date(m.timestamp).getTime(),
          }));
          setMessages(restored);
        }
      } catch {
        // silent
      }
    },
    []
  );

  /* ----- start with subject (empty state) ----- */
  const handleSubjectSelect = (s: string) => {
    setSubject(s);
    setMessages([]);
    setConversationId(null);
    setCurrentStage("diagnostic");
    masteryBumpedRef.current = false;
    setShowConvsMobile(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /* ----- handle new conversation from dialog ----- */
  const handleNewConvFromDialog = () => {
    if (!newConvSubject) return;
    handleSubjectSelect(newConvSubject);
    setNewConvDialogOpen(false);
    setNewConvSubject("");
  };

  /* ----- delete conversation ----- */
  const deleteConversation = useCallback(
    async (convId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await repoDeleteConversation(convId);
        loadConversations();
        if (convId === conversationId) {
          setConversationId(null);
          setMessages([]);
          setSubject(null);
        }
      } catch {
        // silent
      }
    },
    [conversationId, loadConversations]
  );

  /* ----- render helpers ----- */
  const stageIndex = STAGE_ORDER.indexOf(currentStage);

  /* ========== LEFT PANEL (Desktop / Mobile overlay) ========== */
  const conversationsPanel = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-bold text-sm lg:text-base">AI 老师</h2>
        </div>
        <Dialog open={newConvDialogOpen} onOpenChange={setNewConvDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-sm">
              <Plus className="w-4 h-4" />
              新对话
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>开始新对话</DialogTitle>
              <DialogDescription>选择一个学科，开始与 AI 老师对话</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              {visibleSubjects.map((s) => {
                const cfg = SUBJECT_CONFIG[s.label];
                const isSelected = newConvSubject === s.label;
                return (
                  <Card
                    key={s.id}
                    className={`cursor-pointer transition-all hover:shadow-sm ${
                      isSelected
                        ? "ring-2 ring-indigo-500 border-indigo-300 dark:border-indigo-700"
                        : ""
                    }`}
                    onClick={() => setNewConvSubject(s.label)}
                  >
                    <CardContent className="p-3 flex flex-col items-center gap-1.5">
                      <span className="text-xl">{cfg.icon}</span>
                      <span className="text-sm font-semibold">{s.label}</span>
                      <span className="text-[10px] text-muted-foreground">{cfg.desc}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewConvDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleNewConvFromDialog} disabled={!newConvSubject}>
                开始对话
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {convsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : convsError ? (
            <div className="px-2 pt-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>加载失败</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  <p>{convsError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadConversations}
                  >
                    <RotateCw className="h-4 w-4" />
                    重试
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="暂无对话记录"
              description="选择学科开始与 AI 老师对话"
              actionLabel="开始新对话"
              onAction={() => setNewConvDialogOpen(true)}
            />
          ) : (
            conversations.map((conv) => {
              const cfg = SUBJECT_CONFIG[conv.subject] || SUBJECT_CONFIG["数学"];
              const isActive = conv.id === conversationId;
              return (
                <div key={conv.id} className="relative group">
                  <Button
                    variant="ghost"
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left p-3 rounded-xl mb-1 h-auto flex-col items-start gap-1 border-l-4 transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground border-primary"
                        : "border-transparent hover:bg-muted/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="text-xs font-semibold truncate flex-1">{conv.title || `${conv.subject} 学习对话`}</span>
                    </div>
                    {conv.lastMessage && (
                      <p className="text-[11px] text-muted-foreground truncate pl-6 w-full">
                        {conv.lastMessage.role === "user" ? "你" : "AI"}：{conv.lastMessage.content.slice(0, 30)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 pl-6">{timeAgo(conv.updatedAt)}</p>
                  </Button>
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => deleteConversation(conv.id, e)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Weak points hint */}
      {weakPoints && weakPoints.length > 0 && (
        <div className="p-3 border-t">
          <p className="text-[10px] text-muted-foreground mb-1.5">薄弱知识点</p>
          <div className="flex flex-wrap gap-1">
            {weakPoints.slice(0, 3).map((wp) => (
              <Badge key={wp} variant="secondary" className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-0">
                {wp}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ========== MAIN CHAT AREA ========== */
  const chatPanel = (
    <div className="flex flex-col h-full">
      {/* --- Top bar: mobile back + subject tabs --- */}
      <div className="shrink-0 bg-background border-b">
        {/* Mobile back button + mascot */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setShowConvsMobile(true); setMessages([]); }}
            aria-label="返回对话列表"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <motion.div
            className="rounded-full shrink-0"
            animate={isLoading ? { boxShadow: ["0 0 0 0 rgba(99,102,241,0.4)", "0 0 0 10px rgba(99,102,241,0)"] } : {}}
            transition={isLoading ? { duration: 1.5, repeat: Infinity, ease: "easeOut" } : {}}
          >
            <PolarisMascot
              mood={isLoading ? "thinking" : "default"}
              size={32}
              className="shrink-0"
            />
          </motion.div>
          <span className="text-sm font-semibold truncate">
            {subject ? `${subject} · AI 老师` : "AI 老师"}
          </span>
          {isLoading && (
            <div className="flex items-center gap-0.5 ml-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 h-1 rounded-full bg-indigo-500"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop header: mascot + title + status (pulse-glow when thinking) */}
        <div className="hidden lg:flex items-center gap-3 px-4 pt-3">
          <motion.div
            className="rounded-full shrink-0"
            animate={isLoading ? { boxShadow: ["0 0 0 0 rgba(99,102,241,0.4)", "0 0 0 12px rgba(99,102,241,0)"] } : {}}
            transition={isLoading ? { duration: 1.5, repeat: Infinity, ease: "easeOut" } : {}}
          >
            <PolarisMascot
              mood={isLoading ? "thinking" : "default"}
              size={48}
              className="shrink-0"
            />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">Polaris · AI 老师</span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              {isLoading ? (
                <>
                  正在思考
                  <span className="inline-flex items-center gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1 h-1 rounded-full bg-indigo-500 inline-block"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                      />
                    ))}
                  </span>
                </>
              ) : "苏格拉底式教学引导"}
            </span>
          </div>
        </div>

        {/* Subject tabs — desktop always, mobile when subject is selected */}
        <div className="flex gap-1.5 px-4 pb-3 lg:pb-3 lg:pt-3 overflow-x-auto">
          {visibleSubjects.map((s) => {
            const cfg = SUBJECT_CONFIG[s.label];
            const isActive = s.label === subject;
            return (
              <Button
                key={s.id}
                variant={isActive ? "default" : "secondary"}
                size="sm"
                onClick={() => handleSubjectSelect(s.label)}
                className={`shrink-0 gap-1.5 ${
                  isActive
                    ? `bg-gradient-to-r ${cfg.color} text-white shadow-md hover:opacity-90`
                    : ""
                }`}
              >
                <span className="text-xs">{cfg.icon}</span>
                {s.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* --- Stage Progress Indicator (Task 17.5: ProgressRing) --- */}
      {subject && (
        <div className="shrink-0 px-4 py-2.5 bg-background border-b">
          <div className="flex items-center gap-1 justify-center">
            {STAGE_ORDER.map((stage, i) => {
              const info = STAGE_INFO[stage];
              const done = i < stageIndex;
              const active = i === stageIndex;
              const future = i > stageIndex;
              return (
                <div key={stage} className="flex items-center">
                  <div className={`flex flex-col items-center gap-0.5 transition-opacity ${future ? "opacity-50" : "opacity-100"}`}>
                    <ProgressRing
                      size={36}
                      strokeWidth={3}
                      value={done ? 100 : active ? 60 : 0}
                      gradient={active ? { from: "#6366f1", to: "#a855f7" } : undefined}
                      label={<span className="text-[11px] leading-none">{info.icon}</span>}
                    />
                    <span className={`text-[9px] leading-none ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}>{info.label}</span>
                  </div>
                  {i < STAGE_ORDER.length - 1 && (
                    <div className={`w-3 h-px mx-0.5 ${done ? "bg-indigo-400" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Messages area --- */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4 pb-20">
          {messages.length === 0 ? (
            /* ====== Empty State ====== */
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4 animate-fadeIn">
              {/* Welcome illustration area — Polaris mascot */}
              <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100 to-amber-200/50 dark:from-amber-900/30 dark:to-amber-800/20 animate-pulse" />
                {/* orbit dots */}
                <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <div className="absolute bottom-2 left-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
                <div className="absolute bottom-4 right-2 w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "1s" }} />
                <PolarisMascot mood="happy" size={96} className="relative z-10" />
              </div>

              <h2 className="text-lg font-bold mb-2">
                {subject ? `开始${subject}学习` : "选择学科开始对话"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                采用苏格拉底式教学法，通过启发式提问引导你自主思考，而非直接给出答案。选择下方学科开始吧！
              </p>

              {/* Subject cards */}
              {!subject && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
                  {visibleSubjects.map((s) => {
                    const cfg = SUBJECT_CONFIG[s.label];
                    return (
                      <Card
                        key={s.id}
                        className="group cursor-pointer transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
                        onClick={() => handleSubjectSelect(s.label)}
                      >
                        <CardContent className={`p-4 flex flex-col items-center gap-2 bg-gradient-to-br ${cfg.bgGradient} rounded-xl`}>
                          <span className="text-2xl">{cfg.icon}</span>
                          <span className="text-sm font-semibold">{s.label}</span>
                          <span className="text-[10px] text-muted-foreground">{cfg.desc}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* If subject is selected, show a prompt */}
              {subject && (
                <div className="flex flex-col items-center gap-3 mt-2">
                  <Card className="border-indigo-200 dark:border-indigo-800/30">
                    <CardContent className="p-3 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                      <Lightbulb className="w-5 h-5 text-indigo-500 shrink-0" />
                      <p className="text-sm text-indigo-600 dark:text-indigo-300 text-left">
                        在下方输入你的问题，AI老师会通过提问引导你找到答案！
                      </p>
                    </CardContent>
                  </Card>
                  {/* Task 17.8: 推荐问题 chips（点击直接发送） */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {RECOMMENDED_QUESTIONS.map((q) => (
                      <motion.button
                        key={q}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => sendMessage(q)}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 hover:bg-primary/20 transition-colors"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ====== Messages ====== */
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                variants={slideInBottom}
                initial="hidden"
                animate="show"
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <Avatar className="h-8 w-8 shrink-0 mt-1">
                    <AvatarFallback className={
                      msg.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-gradient-to-br from-indigo-400 to-purple-500 text-white"
                    }>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 group">
                    {msg.role === "assistant" && msg.stage && STAGE_INFO[msg.stage as SocraticStage] && (
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-medium gap-1 ${STAGE_INFO[msg.stage as SocraticStage].color}`}
                        >
                          {STAGE_INFO[msg.stage as SocraticStage].icon}
                          {STAGE_INFO[msg.stage as SocraticStage].label}
                        </Badge>
                        {msg.interrupted && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                            已中断
                          </Badge>
                        )}
                        {msg.fallback && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            降级响应
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm text-sm"
                        : isKindergarten
                        ? "bg-muted text-foreground rounded-tl-sm text-lg leading-relaxed"
                        : "bg-muted text-foreground rounded-tl-sm text-sm"
                    }`}>
                      {msg.content ? (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      ) : (
                        /* Task 7.5: 空内容时显示打字动画（流式占位） */
                        <div className="flex items-center gap-1 py-0.5">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                    </div>
                    {/* Task 17.6: 思考过程折叠区（AnimatePresence + height auto） */}
                    {msg.role === "assistant" && msg.stage && isAdvancedMode(learningMode) && msg.content && (
                      <ThinkingFold stage={msg.stage as SocraticStage} />
                    )}
                    {/* Task 8.6: 朗读按钮 + 时间戳 */}
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {msg.role === "assistant" && msg.content && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-5 w-5 text-muted-foreground hover:text-primary p-0 transition-opacity ${speakingMsgId === msg.id && isSpeaking ? "opacity-100" : "opacity-0 group-hover:opacity-100 max-sm:opacity-100"}`}
                          onClick={() => handleSpeakMessage(msg.id, msg.content)}
                          aria-label={speakingMsgId === msg.id && isSpeaking ? "停止朗读" : "朗读"}
                        >
                          {speakingMsgId === msg.id && isSpeaking ? (
                            <Square className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {/* Task 7.5: 流式打字动画已内嵌到空 assistant 气泡中，无需独立 loading 指示器 */}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* --- Input Area --- */}
      {subject && (
        <div className="shrink-0 p-3 lg:p-4 bg-background border-t">
          <div className="flex items-end gap-2">
            {/* Task 8.7: 🎤 录音按钮 */}
            <div className="relative shrink-0">
              <Button
                variant={isListening ? "default" : "outline"}
                size="icon"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                disabled={isLoading}
                className={`h-12 w-12 min-h-[44px] min-w-[44px] ${
                  isListening ? "bg-red-500 hover:bg-red-600" : ""
                }`}
                aria-label={isListening ? "停止录音" : "开始录音"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              {isListening && (
                <motion.span
                  className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-background"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "AI 正在思考..." : isListening ? "正在聆听..." : "输入你的问题..."}
                rows={1}
                disabled={isLoading}
                className="resize-none min-h-[44px] sm:min-h-[52px] max-h-[120px] pr-3"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 120) + "px";
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Select value={subject || undefined} onValueChange={(v) => setSubject(v)}>
                <SelectTrigger className="w-[100px] h-9 text-xs">
                  <SelectValue placeholder="学科" />
                </SelectTrigger>
                <SelectContent>
                  {visibleSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.label}>
                      {SUBJECT_CONFIG[s.label].icon} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLoading ? (
              /* Task 7.6: 停止生成按钮 */
              <Button
                onClick={stopGeneration}
                size="icon"
                className="h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 bg-red-500 hover:bg-red-600 shadow-md"
                aria-label="停止生成"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                size="icon"
                className="h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* "直接告诉我答案" button */}
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDirectAnswer}
              disabled={isLoading}
              className="text-xs text-muted-foreground hover:text-indigo-500 gap-1 h-auto p-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              直接告诉我答案
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  /* ========== RENDER ========== */
  return (
    <div className="flex h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-0px)] -m-4 md:-m-6 lg:m-0 animate-fadeIn">
      {/* ====== Desktop Left Panel (w-80) ====== */}
      <aside className="hidden lg:flex lg:w-80 lg:shrink-0 lg:flex-col bg-background border-r">
        {conversationsPanel}
      </aside>

      {/* ====== Mobile: Conversations List Overlay ====== */}
      {showConvsMobile && (
        <div className="lg:hidden fixed inset-0 z-30 bg-background">
          {conversationsPanel}
        </div>
      )}

      {/* ====== Main Chat Area ====== */}
      <main className={`flex-1 flex flex-col min-w-0 ${showConvsMobile ? "lg:flex hidden" : "flex"}`}>
        {chatPanel}
      </main>
    </div>
  );
}
