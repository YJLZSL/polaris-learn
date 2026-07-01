import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  Eye,
  Lightbulb,
  RotateCw,
  CheckCircle2,
  Calendar,
  Sparkles,
  Play,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { fadeIn, fadeUp, useSafeMotion } from "@/lib/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserStore } from "@/stores/useUserStore";
import {
  getErrorNotes,
  updateSM2State,
  type ErrorNote,
} from "@/lib/repositories/error-notes.repository";
import { getQuestionById } from "@/lib/repositories/practice.repository";
import {
  calculateNextReview,
  isDue,
  type ReviewRating,
  type SM2State,
} from "@/lib/spaced-repetition";

/* ====== Types ====== */
interface ErrorNoteItem {
  note: ErrorNote;
  questionContent: string;
  explanation: string | null;
  difficulty: number;
}

/* ====== Helpers ====== */

/** 从 ErrorNote 派生 SM-2 状态，缺失字段使用默认值 */
function getSM2State(note: ErrorNote): SM2State {
  return {
    ease: note.ease ?? 2.5,
    interval: note.interval ?? 0,
    repetitions: note.repetitions ?? 0,
    dueDate: note.dueDate ?? new Date(note.createdAt).getTime(),
  };
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDueLabel(state: SM2State): string {
  if (isDue(state)) return "待复习";
  const days = Math.ceil((state.dueDate - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "待复习";
  if (days === 1) return "明天复习";
  return `${days} 天后复习`;
}

function formatIntervalDays(interval: number): string {
  if (interval <= 0) return "立即";
  if (interval === 1) return "1 天后";
  return `${interval} 天后`;
}

function getSubjectBadgeClass(subject: string): string {
  const colors: Record<string, string> = {
    "数学": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    "语文": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    "英语": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
    "物理": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    "化学": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  };
  return colors[subject] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "...";
}

/* ====== Component ====== */
export default function ErrorNotesPage() {
  const userId = useUserStore((s) => s.id);
  const safeMotion = useSafeMotion();
  const navigate = useNavigate();

  const [items, setItems] = useState<ErrorNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 复习会话状态
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<ErrorNoteItem[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [ratedCount, setRatedCount] = useState(0);

  // 全部错题分组折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const notes = await getErrorNotes(userId);
      const enriched: ErrorNoteItem[] = await Promise.all(
        notes.map(async (note) => {
          const q = await getQuestionById(note.questionId);
          return {
            note,
            questionContent: q?.content ?? "(题目已删除)",
            explanation: q?.explanation ?? null,
            difficulty: q?.difficulty ?? 1,
          };
        })
      );
      setItems(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载错题列表失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 待复习列表：dueDate <= now
  const dueItems = useMemo(() => {
    return items.filter((item) => isDue(getSM2State(item.note)));
  }, [items]);

  // 按 学科/知识点 分组
  const groupedItems = useMemo(() => {
    const groups: Record<string, ErrorNoteItem[]> = {};
    for (const item of items) {
      const key = item.note.subject || "未分类";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [items]);

  const currentReviewItem = reviewQueue[reviewIndex];

  const handleStartReview = useCallback(() => {
    if (dueItems.length === 0) return;
    setReviewQueue(dueItems);
    setReviewIndex(0);
    setShowAnswer(false);
    setReviewCompleted(false);
    setRatedCount(0);
    setReviewMode(true);
  }, [dueItems]);

  const handleReviewSingle = useCallback((item: ErrorNoteItem) => {
    setReviewQueue([item]);
    setReviewIndex(0);
    setShowAnswer(false);
    setReviewCompleted(false);
    setRatedCount(0);
    setReviewMode(true);
  }, []);

  const handleExitReview = useCallback(() => {
    setReviewMode(false);
    setReviewQueue([]);
    setReviewIndex(0);
    setShowAnswer(false);
    setReviewCompleted(false);
    setRatedCount(0);
  }, []);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!currentReviewItem) return;
      const state = getSM2State(currentReviewItem.note);
      const next = calculateNextReview(state, rating);
      try {
        await updateSM2State(currentReviewItem.note.id, next);
      } catch {
        // 静默失败，UI 仍可继续
      }
      setRatedCount((c) => c + 1);
      if (reviewIndex + 1 < reviewQueue.length) {
        setReviewIndex((i) => i + 1);
        setShowAnswer(false);
      } else {
        setReviewCompleted(true);
      }
      // 后台刷新列表数据
      fetchItems();
    },
    [currentReviewItem, reviewIndex, reviewQueue.length, fetchItems]
  );

  // Task 19.2: 问 AI 详解——跳转 AI 老师并携带错题上下文
  const handleAskAI = useCallback(
    (item: ErrorNoteItem) => {
      navigate("/ai-teacher", {
        state: {
          errorNoteId: item.note.id,
          question: item.questionContent,
          userAnswer: item.note.userAnswer ?? "",
          correctAnswer: item.note.correctAnswer,
          subject: item.note.subject,
        },
      });
    },
    [navigate]
  );

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ====== 复习卡片视图 ====== */
  if (reviewMode) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-8 space-y-4 animate-fadeIn">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleExitReview}>
            <RotateCw className="w-4 h-4 mr-1" />
            退出
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            {reviewCompleted
              ? `已完成 ${ratedCount} 题`
              : `${reviewIndex + 1} / ${reviewQueue.length}`}
          </div>
        </div>

        {reviewCompleted ? (
          <motion.div {...safeMotion(fadeUp)}>
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">今日复习完成</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    共复习 {ratedCount} 道错题，继续保持节奏！
                  </p>
                </div>
                <Button onClick={handleExitReview}>返回错题本</Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : currentReviewItem ? (
          <motion.div key={currentReviewItem.note.id} {...safeMotion(fadeIn)}>
            <Card>
              <CardContent className="p-6 space-y-4">
                {/* 标签 */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", getSubjectBadgeClass(currentReviewItem.note.subject))}
                  >
                    {currentReviewItem.note.subject}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    难度 {currentReviewItem.difficulty}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    第 {(getSM2State(currentReviewItem.note).repetitions || 0) + 1} 次复习
                  </Badge>
                </div>

                {/* 题目 */}
                <div className="text-base font-medium leading-relaxed whitespace-pre-wrap">
                  {currentReviewItem.questionContent}
                </div>

                {/* 显示答案按钮 / 答案内容 */}
                {!showAnswer ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setShowAnswer(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    显示答案
                  </Button>
                ) : (
                  <motion.div {...safeMotion(fadeIn)} className="space-y-3">
                    {/* 我的错误答案 */}
                    <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 [&>svg]:text-red-500">
                      <RotateCw className="h-4 w-4" />
                      <AlertTitle>我的错误答案</AlertTitle>
                      <AlertDescription className="font-mono whitespace-pre-wrap">
                        {currentReviewItem.note.userAnswer || "(空)"}
                      </AlertDescription>
                    </Alert>

                    {/* 正确答案 */}
                    <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 [&>svg]:text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>正确答案</AlertTitle>
                      <AlertDescription className="font-mono whitespace-pre-wrap">
                        {currentReviewItem.note.correctAnswer}
                      </AlertDescription>
                    </Alert>

                    {/* 解析 */}
                    {currentReviewItem.explanation && (
                      <Alert className="border-muted bg-muted/50 text-muted-foreground">
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>解析</AlertTitle>
                        <AlertDescription className="leading-relaxed whitespace-pre-wrap">
                          {currentReviewItem.explanation}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 问 AI 详解 */}
                    <Button
                      variant="outline"
                      className="w-full border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                      onClick={() => handleAskAI(currentReviewItem)}
                    >
                      <Bot className="w-4 h-4 mr-2" />
                      问 AI 详解
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* 4 个评分按钮——仅在显示答案后出现 */}
            {showAnswer && (
              <motion.div {...safeMotion(fadeIn)} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {(() => {
                  const state = getSM2State(currentReviewItem.note);
                  const ratings: { key: ReviewRating; label: string; className: string }[] = [
                    { key: "again", label: "再来一次", className: "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" },
                    { key: "hard", label: "困难", className: "border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20" },
                    { key: "good", label: "良好", className: "border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20" },
                    { key: "easy", label: "简单", className: "border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20" },
                  ];
                  return ratings.map((r) => {
                    const next = calculateNextReview(state, r.key);
                    return (
                      <Button
                        key={r.key}
                        variant="outline"
                        className={cn("flex flex-col h-auto py-2", r.className)}
                        onClick={() => handleRate(r.key)}
                      >
                        <span className="text-sm font-medium">{r.label}</span>
                        <span className="text-[10px] opacity-70 mt-0.5">
                          {formatIntervalDays(next.interval)}
                        </span>
                      </Button>
                    );
                  });
                })()}
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </div>
    );
  }

  /* ====== 主页面 ====== */
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">错题本</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Anki 式间隔重复，无压力复习
          </p>
        </div>
        {items.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            共 {items.length} 题
          </Badge>
        )}
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 错误提示 */}
      {!loading && error && (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchItems} className="w-fit">
              <RotateCw className="h-4 w-4 mr-1" />
              重新加载
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 空状态 */}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="暂无错题记录"
          description="做错的题目会自动收集到这里，使用 Anki 式复习巩固"
        />
      )}

      {/* 待复习卡片 */}
      {!loading && !error && items.length > 0 && (
        <motion.div {...safeMotion(fadeUp)}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{dueItems.length}</span>
                  <span className="text-sm text-muted-foreground">题待复习</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dueItems.length > 0
                    ? "点击开始 Anki 式复习，按记忆节奏巩固"
                    : "当前没有到期复习，稍后再来"}
                </p>
              </div>
              <Button onClick={handleStartReview} disabled={dueItems.length === 0}>
                <Play className="w-4 h-4 mr-1" />
                开始复习
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 全部错题（按学科分组，可折叠） */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">
            全部错题（按学科分组）
          </h2>
          {Object.entries(groupedItems).map(([subject, groupItems]) => {
            const collapsed = collapsedGroups[subject] ?? false;
            const dueInGroup = groupItems.filter((i) => isDue(getSM2State(i.note))).length;
            return (
              <Card key={subject}>
                <CardContent className="p-0">
                  {/* 分组头 */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(subject)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    {collapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getSubjectBadgeClass(subject))}
                    >
                      {subject}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {groupItems.length} 题
                    </span>
                    {dueInGroup > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {dueInGroup} 待复习
                      </Badge>
                    )}
                  </button>
                  {/* 分组列表 */}
                  {!collapsed && (
                    <motion.div {...safeMotion(fadeIn)} className="divide-y divide-border">
                      {groupItems.map((item) => {
                        const state = getSM2State(item.note);
                        return (
                          <div
                            key={item.note.id}
                            className="flex items-start gap-3 p-4 hover:bg-accent/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm font-medium leading-relaxed">
                                {truncate(item.questionContent, 100)}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  添加 {formatTimestamp(new Date(item.note.createdAt).getTime())}
                                </span>
                                <span>·</span>
                                <span>{formatDueLabel(state)}</span>
                                {item.note.repetitions && item.note.repetitions > 0 ? (
                                  <>
                                    <span>·</span>
                                    <span>已复习 {item.note.repetitions} 次</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReviewSingle(item)}
                              disabled={!isDue(state)}
                            >
                              <Play className="w-3.5 h-3.5 mr-1" />
                              复习
                            </Button>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
