import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Trash2,
  RotateCw,
  Volume2,
  VolumeX,
  Square,
  Copy,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { SUBJECTS } from "@/lib/constants";
import { getCurrentUser } from "@/lib/services/auth-service";
import { chat as aiChat, type ChatMessage } from "@/lib/services/ai-service";
import { platform } from "@/lib/platform";
import { toast } from "@/hooks/use-toast";
import {
  saveConversation as repoSaveConversation,
  getConversationById as repoGetConversationById,
  type AIConversation,
} from "@/lib/repositories/conversation.repository";
import { speak, stopSpeaking, loadVoiceSettings } from "@/lib/services/voice-service";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { fadeUp, useSafeMotion } from "@/lib/motion";
import LearningCompanion from "@/components/common/LearningCompanion";

/* ---------- 类型 ---------- */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  interrupted?: boolean;
  fallback?: boolean;
}

/* ---------- 常量 ---------- */
const SUBJECT_CONFIG: Record<string, { icon: string; desc: string }> = {
  数学: { icon: "📐", desc: "代数、几何、函数" },
  语文: { icon: "📖", desc: "阅读、写作、文言文" },
  英语: { icon: "🌍", desc: "词汇、语法、阅读" },
  物理: { icon: "⚡", desc: "力学、电磁学、光学" },
  化学: { icon: "🧪", desc: "元素、反应、方程式" },
  生物: { icon: "🧬", desc: "细胞、遗传、生态" },
};

/** 空状态推荐问题 */
const RECOMMENDED_QUESTIONS = ["这道题我不会做", "帮我复习重点知识", "解释一下这个概念"];

/* ---------- 工具函数 ---------- */
function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * 静默剥离历史遗留的 <stage> 与 <topic> 标签（向后兼容旧数据/旧模型输出）。
 * 不报错、不更新任何进度，仅清理展示与朗读文本。
 * 同时处理流式传输中残缺的开标签（如 "<stage>diag"、"<st"）。
 */
function stripLegacyTags(content: string): string {
  // 完整标签整体移除
  let result = content.replace(/<stage>\w+<\/stage>/g, "").replace(/<topic>[\s\S]*?<\/topic>/g, "");
  // 残缺的 <stage 开标签
  const stageIdx = result.lastIndexOf("<stage");
  if (stageIdx !== -1) {
    result = result.slice(0, stageIdx);
  } else {
    for (const p of ["<stag", "<sta", "<st", "<s", "<"]) {
      if (result.endsWith(p)) {
        result = result.slice(0, -p.length);
        break;
      }
    }
  }
  // 残缺的 <topic 开标签
  const topicIdx = result.lastIndexOf("<topic");
  if (topicIdx !== -1) {
    result = result.slice(0, topicIdx);
  } else {
    for (const p of ["<topi", "<top", "<to", "<t", "<"]) {
      if (result.endsWith(p)) {
        result = result.slice(0, -p.length);
        break;
      }
    }
  }
  return result.replace(/\s+$/, "");
}

/* ---------- 简单格式化渲染（代码块 / 行内代码） ---------- */
function FormattedMessage({ content, className }: { content: string; className?: string }) {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return (
    <div className={`whitespace-pre-wrap break-words ${className || ""}`}>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const code = part.replace(/^```(\w+)?\n?/, "").replace(/```$/, "");
          return (
            <pre
              key={i}
              className="mt-2 mb-2 p-2.5 rounded-lg bg-black/40 text-xs font-mono overflow-x-auto border border-white/5"
            >
              <code>{code}</code>
            </pre>
          );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          return (
            <code key={i} className="px-1 py-0.5 rounded bg-white/10 text-xs font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

/* ---------- AI 消息工具栏：朗读 / 复制 / 重新生成 ---------- */
interface MessageToolbarProps {
  msgId: string;
  content: string;
  timestamp: number;
  speakingMsgId: string | null;
  onSpeak: (msgId: string, content: string) => void;
  onCopy: (content: string) => void;
  onRegenerate: () => void;
}

function MessageToolbar({
  msgId,
  content,
  timestamp,
  speakingMsgId,
  onSpeak,
  onCopy,
  onRegenerate,
}: MessageToolbarProps) {
  const isSpeaking = speakingMsgId === msgId;
  return (
    <div className="flex items-center gap-1 mt-1.5 px-1">
      <p className="text-[10px] text-muted-foreground mr-auto">
        {new Date(timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary"
          onClick={() => onSpeak(msgId, content)}
          aria-label={isSpeaking ? "停止朗读" : "朗读"}
        >
          {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary"
          onClick={() => onCopy(content)}
          aria-label="复制"
        >
          <Copy className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary"
          onClick={onRegenerate}
          aria-label="重新生成"
        >
          <RotateCw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- 主组件：安静的对话窗口 ---------- */
export default function AiTeacherPage() {
  const safeMotion = useSafeMotion();
  const { weakPoints, learningMode, setUser, id: userId, initFromAuth } = useUserStore();

  /* ----- 拉取用户 learningMode（用于学科过滤与样式适配） ----- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initFromAuth();
        const user = await getCurrentUser();
        if (!cancelled && user && user.learningMode) {
          setUser({ learningMode: user.learningMode });
        }
      } catch {
        // 静默：失败时使用默认模式
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, initFromAuth]);

  /* ----- 基于学习模式派生可用学科与 UI 风格 ----- */
  // V2：getSubjectsForMode 已删除，学段不再按学科过滤，统一展示全部学科
  const visibleSubjects = SUBJECTS;
  const isYouth = learningMode === "YOUTH";

  /* ----- 接收来自其他页面（如错题本"问 AI 详解"）的题目上下文 ----- */
  const location = useLocation();
  const passedContext = location.state as {
    question?: string;
    myAnswer?: string;
    userAnswer?: string;
    correctAnswer?: string;
    analysis?: string;
    subject?: string;
  } | null;

  /* ----- state ----- */
  const [subject, setSubject] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  /* ----- 待发送的错题提问 prompt（等 subject 就绪后自动发送） ----- */
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  /* ----- refs ----- */
  const aiContextHandledRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ----- 流式响应 refs ----- */
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamBufferRef = useRef<string>("");
  const streamDisplayIdxRef = useRef<number>(0);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const streamCompletedRef = useRef<boolean>(false);

  /* ----- 默认学科：visibleSubjects 就绪后取第一个，避免阻塞输入 ----- */
  useEffect(() => {
    if (!subject && visibleSubjects.length > 0) {
      setSubject(visibleSubjects[0].label);
    }
  }, [subject, visibleSubjects]);

  /* ----- 收到错题上下文：重置会话、预置 subject、构造 prompt ----- */
  useEffect(() => {
    if (!passedContext?.question) return;
    if (aiContextHandledRef.current) return;
    aiContextHandledRef.current = true;

    setMessages([]);
    setConversationId(null);
    if (passedContext.subject) setSubject(passedContext.subject);

    const q = passedContext.question;
    const ua = passedContext.myAnswer ?? passedContext.userAnswer ?? "?";
    const ca = passedContext.correctAnswer ?? "?";
    const analysis = passedContext.analysis ? `参考解析：${passedContext.analysis}。` : "";
    setPendingPrompt(
      `这道题我做错了：${q}。我选了${ua}，正确答案是${ca}。${analysis}请用苏格拉底法引导我理解错在哪里。`
    );
  }, [passedContext]);

  /* ----- 自动滚动到底部 ----- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* ----- 朗读 / 停止朗读（TTS 走 voice-service） ----- */
  const handleSpeakMessage = useCallback(
    async (msgId: string, content: string) => {
      if (speakingMsgId === msgId) {
        await stopSpeaking();
        setSpeakingMsgId(null);
      } else {
        if (speakingMsgId) await stopSpeaking();
        setSpeakingMsgId(msgId);
        const vs = loadVoiceSettings();
        await speak(content, {
          lang: vs.lang,
          rate: vs.rate,
          pitch: vs.pitch,
          volume: 1,
          cloudEngine: vs.cloudEnabled ? vs.cloudEngine : undefined,
          cloudApiKey: vs.cloudEnabled ? vs.cloudApiKey : undefined,
          onEnd: () => setSpeakingMsgId((cur) => (cur === msgId ? null : cur)),
        });
      }
    },
    [speakingMsgId]
  );

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await platform.clipboard.writeText(content);
      toast({ title: "已复制到剪贴板" });
    } catch {
      toast({ title: "复制失败", variant: "destructive" });
    }
  }, []);

  /* ----- 停止生成 ----- */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    const msgId = streamingMsgIdRef.current;
    if (msgId && streamBufferRef.current) {
      const display = stripLegacyTags(streamBufferRef.current);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: display, interrupted: true } : m))
      );
    }
    streamBufferRef.current = "";
    streamDisplayIdxRef.current = 0;
    streamingMsgIdRef.current = null;
    streamCompletedRef.current = false;
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  /* ----- 发送消息（流式逐字输出） ----- */
  const sendMessage = useCallback(
    async (overrideMessage?: string) => {
      const msg = (overrideMessage ?? input).trim();
      if (!msg || isLoading) return;
      const effSubject = subject || visibleSubjects[0]?.label || "数学";

      const userMsg: Message = { id: generateId(), role: "user", content: msg, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      // 消息气泡立即出现，内容逐字流入
      const aiMsgId = generateId();
      setMessages((prev) => [
        ...prev,
        { id: aiMsgId, role: "assistant", content: "", timestamp: Date.now() },
      ]);

      // 初始化流式状态
      streamBufferRef.current = "";
      streamDisplayIdxRef.current = 0;
      streamingMsgIdRef.current = aiMsgId;
      streamCompletedRef.current = false;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 打字机定时器（每 50ms 一个字符）
      streamTimerRef.current = setInterval(() => {
        const buffer = streamBufferRef.current;
        const idx = streamDisplayIdxRef.current;
        if (idx < buffer.length) {
          streamDisplayIdxRef.current = idx + 1;
          const display = stripLegacyTags(buffer.slice(0, idx + 1));
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, content: display } : m))
          );
        } else if (streamCompletedRef.current) {
          if (streamTimerRef.current) {
            clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
          }
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

        // 流式调用 AI（注入 weakPoints 实现个性化引导）
        const result = await aiChat(
          chatMessages,
          learningMode,
          undefined,
          undefined,
          abortController.signal,
          weakPoints,
          (chunk) => {
            streamBufferRef.current += chunk;
          }
        );

        streamCompletedRef.current = true;

        // 剥离历史遗留 <stage>/<topic> 标签后的展示内容
        const displayContent = stripLegacyTags(result.content);
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, fallback: result.fallback } : m))
        );

        // 持久化对话到 IndexedDB（保存剥离标签后的内容）
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
            subject: effSubject,
            title: existing?.title || msg.slice(0, 24),
            messages: newMessages,
            createdAt: existing?.createdAt || nowIso,
            updatedAt: nowIso,
          };
          await repoSaveConversation(conv);
          setConversationId(convId);
        }
      } catch (err) {
        // AbortError：已在 stopGeneration 中处理消息更新，这里仅清理
        if ((err as Error)?.name === "AbortError") return;
        // 网络错误：移除空 assistant 气泡，显示错误提示
        setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: "网络连接失败，请检查网络后重试",
            timestamp: Date.now(),
          },
        ]);
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
      } finally {
        abortControllerRef.current = null;
        // 若打字机仍在运行，由其自行收尾时设置 isLoading=false
        if (!streamTimerRef.current) setIsLoading(false);
      }
    },
    [input, subject, isLoading, conversationId, learningMode, userId, messages, weakPoints, visibleSubjects]
  );

  const handleRegenerateMessage = useCallback(
    (msgIndex: number) => {
      // 找到当前 AI 消息前最近一条用户消息并重新发送
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
          void sendMessage(messages[i].content);
          return;
        }
      }
      toast({ title: "无法重新生成", description: "未找到对应的问题。", variant: "destructive" });
    },
    [messages, sendMessage]
  );

  /* ----- 待发送 prompt 就绪后自动发送（依赖 sendMessage，需在其后声明） ----- */
  useEffect(() => {
    if (!pendingPrompt || !subject || isLoading) return;
    const msg = pendingPrompt;
    setPendingPrompt(null);
    void sendMessage(msg);
  }, [pendingPrompt, subject, isLoading, sendMessage]);

  /* ----- 清空当前对话 ----- */
  const handleClearConversation = useCallback(() => {
    if (messages.length === 0 && !isLoading) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    streamBufferRef.current = "";
    streamDisplayIdxRef.current = 0;
    streamingMsgIdRef.current = null;
    streamCompletedRef.current = false;
    abortControllerRef.current = null;
    void stopSpeaking();
    setSpeakingMsgId(null);
    setMessages([]);
    setConversationId(null);
    setInput("");
    setIsLoading(false);
    toast({ title: "已清空对话" });
  }, [messages.length, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  /* ========== 渲染 ========== */
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-0px)] -m-4 md:-m-6 lg:m-0">
      {/* ====== 顶部：小灵 persona + 标题 + 清空对话 ====== */}
      <header className="shrink-0 bg-polaris-surface border-b border-white/5 px-4 py-3 flex items-center gap-4">
        <motion.div {...safeMotion({ variants: fadeUp, initial: "hidden", animate: "show" })}>
          <LearningCompanion size={96} mood="focus" position="ai-teacher" />
        </motion.div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-base font-bold">AI 老师</span>
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
            ) : (
              "苏格拉底式引导 · 陪你一起想清楚"
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearConversation}
          className="text-xs text-muted-foreground hover:text-destructive gap-1.5 shrink-0"
          aria-label="清空对话"
        >
          <Trash2 className="w-3.5 h-3.5" />
          清空对话
        </Button>
      </header>

      {/* ====== 消息区 ====== */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4 pb-6">
          {messages.length === 0 ? (
            /* ====== 空状态 ====== */
            <motion.div
              {...safeMotion({ variants: fadeUp, initial: "hidden", animate: "show" })}
              className="flex flex-col items-center justify-center min-h-[400px] text-center px-4"
            >
              <LearningCompanion
                size={128}
                mood="focus"
                position="empty-state"
                message="问我任何问题，我们一起开始"
              />
              <h2 className="text-lg font-bold mt-6 mb-2">开始你的学习对话</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                通过启发式提问引导你自主思考，而非直接给出答案。在下方输入你的问题，或试试这些：
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {RECOMMENDED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg, msgIndex) => (
              <motion.div
                key={msg.id}
                {...safeMotion({ variants: fadeUp, initial: "hidden", animate: "show" })}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-2.5 max-w-[90%] sm:max-w-[80%] ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="h-8 w-8 shrink-0 mt-1">
                    <AvatarFallback
                      className={
                        msg.role === "user"
                          ? "bg-indigo-500 text-white"
                          : "bg-gradient-to-br from-indigo-400 to-purple-500 text-white"
                      }
                    >
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 group">
                    <div
                      className={`px-4 py-2.5 rounded-2xl shadow-polaris-card transition-all duration-200 ${
                        msg.role === "user"
                          ? "bg-indigo-500 text-white rounded-tr-sm text-sm"
                          : isYouth
                          ? "bg-polaris-surface-elevated text-foreground rounded-tl-sm text-lg leading-relaxed border border-white/5"
                          : "bg-polaris-surface-elevated text-foreground rounded-tl-sm text-sm border border-white/5"
                      }`}
                    >
                      {msg.content ? (
                        <FormattedMessage content={msg.content} />
                      ) : (
                        /* 空内容时显示打字动画（流式占位） */
                        <div className="flex items-center gap-1 py-0.5">
                          <span
                            className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      )}
                    </div>
                    {/* AI 消息工具栏：朗读 / 复制 / 重新生成 */}
                    {msg.role === "assistant" && msg.content && (
                      <MessageToolbar
                        msgId={msg.id}
                        content={msg.content}
                        timestamp={msg.timestamp}
                        speakingMsgId={speakingMsgId}
                        onSpeak={handleSpeakMessage}
                        onCopy={handleCopyMessage}
                        onRegenerate={() => handleRegenerateMessage(msgIndex)}
                      />
                    )}
                    {/* 用户消息时间戳 */}
                    {msg.role === "user" && (
                      <div className="flex items-center justify-end mt-1 px-1">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* ====== 底部输入区 ====== */}
      <div className="shrink-0 p-3 lg:p-4 bg-polaris-surface border-t border-white/5">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "AI 正在思考…" : "输入你的问题…"}
              rows={1}
              disabled={isLoading}
              className="resize-none min-h-[44px] sm:min-h-[52px] max-h-[120px] pr-3 bg-polaris-surface-elevated border-white/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-indigo-500/50"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <Select value={subject || undefined} onValueChange={(v) => setSubject(v)}>
            <SelectTrigger className="w-[100px] h-11 text-xs bg-polaris-surface-elevated border-white/10 shrink-0">
              <SelectValue placeholder="学科" />
            </SelectTrigger>
            <SelectContent className="bg-polaris-surface-elevated border-white/10">
              {visibleSubjects.map((s) => (
                <SelectItem key={s.id} value={s.label}>
                  {SUBJECT_CONFIG[s.label]?.icon} {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoading ? (
            <Button
              onClick={stopGeneration}
              size="icon"
              className="h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 bg-red-500 hover:bg-red-600 shadow-md rounded-xl"
              aria-label="停止生成"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => void sendMessage()}
              disabled={!input.trim()}
              size="icon"
              className="h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 bg-indigo-500 hover:bg-indigo-600 shadow-md rounded-xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
