"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Send,
  ArrowLeft,
  Lightbulb,
  GraduationCap,
  ShieldCheck,
  Bot,
  User,
  Trash2,
  Loader2,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { useUserStore } from "@/stores/useUserStore";
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

/* ---------- types ---------- */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  stage?: string;
  timestamp: number;
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

type SocraticStage = "diagnostic" | "guide" | "reasoning" | "reflect";

/* ---------- constants ---------- */
const SUBJECTS = ["数学", "语文", "英语", "物理", "化学", "生物"] as const;

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
  guide: { label: "引导", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: "💡" },
  reasoning: { label: "推理", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: "🧠" },
  reflect: { label: "反思", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: "🪞" },
};

const STAGE_ORDER: SocraticStage[] = ["diagnostic", "guide", "reasoning", "reflect"];

const DIRECT_ANSWER_RESPONSE = "我理解你想要直接答案，但苏格拉底教学法的核心是引导你自己发现问题。试着告诉我：你对这道题有什么初步的想法？哪怕是直觉也可以，我们一起来分析。";

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

/* ---------- component ---------- */
export default function AITeacherPage() {
  const { weakPoints, addXP } = useUserStore();

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ----- load conversations ----- */
  const loadConversations = useCallback(async () => {
    setConvsLoading(true);
    setConvsError(null);
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      } else {
        throw new Error("加载对话列表失败");
      }
    } catch (err) {
      setConversations([]);
      setConvsError(err instanceof Error ? err.message : "加载对话列表失败");
    } finally {
      setConvsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  /* ----- auto-scroll ----- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* ----- send message ----- */
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

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            subject,
            message: msg,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setConversationId(data.conversationId);
          setCurrentStage(data.stage as SocraticStage);

          const aiMsg: Message = {
            id: generateId(),
            role: "assistant",
            content: data.response,
            stage: data.stage,
            timestamp: Date.now(),
          };

          setMessages((prev) => [...prev, aiMsg]);

          // award XP for interaction
          addXP(5);
          // reload conversations list
          loadConversations();
        } else {
          const err = await res.json();
          const errMsg: Message = {
            id: generateId(),
            role: "assistant",
            content: err.error || "对话处理失败，请稍后重试",
            stage: currentStage,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errMsg]);
        }
      } catch {
        const errMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: "网络连接失败，请检查网络后重试",
          stage: currentStage,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, subject, isLoading, conversationId, currentStage, addXP, loadConversations]
  );

  /* ----- handle "直接告诉我答案" ----- */
  const handleDirectAnswer = useCallback(() => {
    if (isLoading) return;
    const aiMsg: Message = {
      id: generateId(),
      role: "assistant",
      content: DIRECT_ANSWER_RESPONSE,
      stage: "guide",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setCurrentStage("guide");
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
      setShowConvsMobile(false);

      // try loading messages from server
      try {
        const res = await fetch(`/api/ai/conversations`);
        if (res.ok) {
          await res.json();
          // for simplicity, start fresh
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
        const res = await fetch(`/api/ai/conversations/${convId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          loadConversations();
          if (convId === conversationId) {
            setConversationId(null);
            setMessages([]);
            setSubject(null);
          }
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
              {SUBJECTS.map((s) => {
                const cfg = SUBJECT_CONFIG[s];
                const isSelected = newConvSubject === s;
                return (
                  <Card
                    key={s}
                    className={`cursor-pointer transition-all hover:shadow-sm ${
                      isSelected
                        ? "ring-2 ring-indigo-500 border-indigo-300 dark:border-indigo-700"
                        : ""
                    }`}
                    onClick={() => setNewConvSubject(s)}
                  >
                    <CardContent className="p-3 flex flex-col items-center gap-1.5">
                      <span className="text-xl">{cfg.icon}</span>
                      <span className="text-sm font-semibold">{s}</span>
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
        {/* Mobile back button */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setShowConvsMobile(true); setMessages([]); }}
            aria-label="返回对话列表"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-semibold truncate">
            {subject ? `${subject} · AI 老师` : "AI 老师"}
          </span>
        </div>

        {/* Subject tabs — desktop always, mobile when subject is selected */}
        <div className="flex gap-1.5 px-4 pb-3 lg:pb-3 lg:pt-3 overflow-x-auto">
          {SUBJECTS.map((s) => {
            const cfg = SUBJECT_CONFIG[s];
            const isActive = s === subject;
            return (
              <Button
                key={s}
                variant={isActive ? "default" : "secondary"}
                size="sm"
                onClick={() => handleSubjectSelect(s)}
                className={`shrink-0 gap-1.5 ${
                  isActive
                    ? `bg-gradient-to-r ${cfg.color} text-white shadow-md hover:opacity-90`
                    : ""
                }`}
              >
                <span className="text-xs">{cfg.icon}</span>
                {s}
              </Button>
            );
          })}
        </div>
      </div>

      {/* --- Stage Progress Indicator --- */}
      {subject && (
        <div className="shrink-0 px-4 py-2.5 bg-background border-b">
          <div className="flex items-center gap-1.5">
            {STAGE_ORDER.map((stage, idx) => {
              const info = STAGE_INFO[stage];
              const done = idx < stageIndex;
              const active = idx === stageIndex;
              return (
                <div key={stage} className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-medium gap-1 ${
                      active
                        ? info.color + " ring-2 ring-offset-1 ring-current opacity-80"
                        : done
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/50 text-muted-foreground/50"
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span className="hidden sm:inline">{info.label}</span>
                  </Badge>
                  {idx < STAGE_ORDER.length - 1 && (
                    <div className={`w-4 h-px ${idx < stageIndex ? "bg-indigo-400" : "bg-border"}`} />
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
              {/* Welcome illustration area */}
              <div className="relative w-32 h-32 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-800/40 dark:to-purple-800/40 flex items-center justify-center">
                  <GraduationCap className="w-14 h-14 text-indigo-500 dark:text-indigo-400" />
                </div>
                {/* orbit dots */}
                <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <div className="absolute bottom-2 left-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
                <div className="absolute bottom-4 right-2 w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "1s" }} />
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
                  {SUBJECTS.map((s) => {
                    const cfg = SUBJECT_CONFIG[s];
                    return (
                      <Card
                        key={s}
                        className="group cursor-pointer transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
                        onClick={() => handleSubjectSelect(s)}
                      >
                        <CardContent className={`p-4 flex flex-col items-center gap-2 bg-gradient-to-br ${cfg.bgGradient} rounded-xl`}>
                          <span className="text-2xl">{cfg.icon}</span>
                          <span className="text-sm font-semibold">{s}</span>
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
                </div>
              )}
            </div>
          ) : (
            /* ====== Messages ====== */
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slideUp`}
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

                  <div>
                    {msg.role === "assistant" && msg.stage && STAGE_INFO[msg.stage as SocraticStage] && (
                      <Badge
                        variant="secondary"
                        className={`mb-1.5 text-[10px] font-medium gap-1 ${STAGE_INFO[msg.stage as SocraticStage].color}`}
                      >
                        {STAGE_INFO[msg.stage as SocraticStage].icon}
                        {STAGE_INFO[msg.stage as SocraticStage].label}
                      </Badge>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all duration-200 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Loading indicator – typing animation */}
          {isLoading && (
            <div className="flex justify-start animate-slideUp">
              <div className="flex gap-2.5 max-w-[85%] sm:max-w-[75%]">
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Badge
                    variant="secondary"
                    className={`mb-1.5 text-[10px] font-medium gap-1 ${STAGE_INFO[currentStage]?.color}`}
                  >
                    {STAGE_INFO[currentStage]?.icon}
                    {STAGE_INFO[currentStage]?.label}
                  </Badge>
                  <div className="mt-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-muted text-foreground shadow-sm transition-all duration-200">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* --- Input Area --- */}
      {subject && (
        <div className="shrink-0 p-3 lg:p-4 bg-background border-t">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "AI 正在思考..." : "输入你的问题..."}
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
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUBJECT_CONFIG[s].icon} {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md"
            >
              <Send className="w-4 h-4" />
            </Button>
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
