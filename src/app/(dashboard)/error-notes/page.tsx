"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle,
  X,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Search,
  FileQuestion,
  RotateCw,
  Lightbulb,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/* ====== Types ====== */
interface QuestionInfo {
  id: string;
  content: string;
  subject: string;
  type: string;
  difficulty: number;
  options: string[];
  answer: string;
  explanation: string | null;
}

interface ErrorNoteItem {
  id: string;
  question: QuestionInfo;
  wrongAnswer: string | null;
  errorType: string | null;
  status: string;
  correctCount: number;
  createdAt: string;
  nextReviewAt: string | null;
}

interface SubjectTab {
  key: string;
  label: string;
}

/* ====== Configs ====== */
const subjectTabs: SubjectTab[] = [
  { key: "", label: "全部" },
  { key: "数学", label: "数学" },
  { key: "语文", label: "语文" },
  { key: "英语", label: "英语" },
  { key: "物理", label: "物理" },
  { key: "化学", label: "化学" },
];

const statusFilters = [
  { key: "", label: "全部" },
  { key: "active", label: "活跃" },
  { key: "eliminated", label: "已消除" },
];

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

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ====== Loading Skeleton ====== */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-3">
                <Skeleton className="h-4 w-full rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-12 rounded-md bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-5 w-16 rounded-md bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-5 w-20 rounded-md bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-10 rounded-md bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-5 w-14 rounded-md bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-5 w-24 rounded-md bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                </div>
              </div>
              <Skeleton className="h-8 w-16 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ====== Component ====== */
export default function ErrorNotesPage() {
  // Filters
  const [activeSubject, setActiveSubject] = useState("");
  const [activeStatus, setActiveStatus] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Data
  const [errorNotes, setErrorNotes] = useState<ErrorNoteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review dialog
  const [reviewingNote, setReviewingNote] = useState<ErrorNoteItem | null>(null);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewResult, setReviewResult] = useState<{
    correct: boolean;
    correctAnswer?: string;
    explanation?: string;
    eliminated?: boolean;
    message?: string;
  } | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const limit = 20;

  const fetchErrorNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeSubject) params.set("subject", activeSubject);
      if (activeStatus) params.set("status", activeStatus);
      params.set("page", String(currentPage));
      params.set("limit", String(limit));

      const res = await fetch(`/api/error-notes?${params.toString()}`);
      if (!res.ok) {
        throw new Error("获取数据失败");
      }
      const data = await res.json();
      setErrorNotes(data.errorNotes || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载错题列表失败");
      setErrorNotes([]);
    } finally {
      setLoading(false);
    }
  }, [activeSubject, activeStatus, currentPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchErrorNotes();
  }, [fetchErrorNotes]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [activeSubject, activeStatus]);

  // Review handler
  const handleStartReview = useCallback((note: ErrorNoteItem) => {
    setReviewingNote(note);
    setReviewAnswer("");
    setReviewResult(null);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!reviewingNote || !reviewAnswer.trim()) return;

    setReviewing(true);
    try {
      const res = await fetch(`/api/error-notes/${reviewingNote.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: reviewAnswer.trim() }),
      });
      const data = await res.json();
      setReviewResult(data);

      // Refresh the list after review
      fetchErrorNotes();
    } catch {
      setReviewResult({
        correct: false,
        message: "提交失败，请重试",
      });
    } finally {
      setReviewing(false);
    }
  }, [reviewingNote, reviewAnswer, fetchErrorNotes]);

  const handleCloseReview = useCallback(() => {
    setReviewingNote(null);
    setReviewAnswer("");
    setReviewResult(null);
  }, []);

  // Filter notes by search query (client-side)
  const filteredNotes = searchQuery.trim()
    ? errorNotes.filter((note) =>
        note.question.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : errorNotes;

  const filtersActive =
    searchQuery.trim() || activeSubject || activeStatus !== "active";

  const emptyTitle = searchQuery.trim()
    ? "未找到匹配的错题"
    : activeStatus === "active"
      ? "暂无活跃错题，继续保持！"
      : activeStatus === "eliminated"
        ? "暂无已消除的错题"
        : "暂无错题记录";

  const emptyDescription = searchQuery.trim()
    ? "尝试其他关键词搜索"
    : activeStatus === "active" || !activeStatus
      ? "做错的题目会自动收集到这里"
      : activeStatus === "eliminated"
        ? "连续答对2次的错题会自动消除"
        : "做错的题目会自动收集到这里";

  /* ====== Render ====== */
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* ====== Header ====== */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">错题本</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            复习错题，强化薄弱知识点
          </p>
        </div>
        {total > 0 && (
          <Badge variant="secondary" className="ml-auto">
            共 {total} 题
          </Badge>
        )}
      </div>

      {/* ====== Filters ====== */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Subject tabs */}
          <Tabs
            value={activeSubject}
            onValueChange={setActiveSubject}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto">
              {subjectTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key || "all"} className="text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Status filter + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Status badges */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">状态:</span>
              {statusFilters.map((filter) => (
                <Badge
                  key={filter.key}
                  variant={activeStatus === filter.key ? "default" : "outline"}
                  className="cursor-pointer select-none transition-colors"
                  onClick={() => setActiveStatus(filter.key)}
                >
                  {filter.label}
                </Badge>
              ))}
            </div>

            {/* Search */}
            <div className="sm:ml-auto relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索错题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== Loading State ====== */}
      {loading && <LoadingSkeleton />}

      {/* ====== Error State ====== */}
      {!loading && error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchErrorNotes}>
              <RotateCw className="h-4 w-4" />
              重新加载
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ====== Empty State ====== */}
      {!loading && !error && filteredNotes.length === 0 && (
        <EmptyState
          icon={FileQuestion}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={
            searchQuery.trim() ? "清除搜索" : filtersActive ? "重置筛选" : undefined
          }
          onAction={() => {
            setSearchQuery("");
            setActiveSubject("");
            setActiveStatus("active");
            setCurrentPage(1);
          }}
        />
      )}

      {/* ====== Error Notes List ====== */}
      {!loading && !error && filteredNotes.length > 0 && (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const isQuestionType =
              note.question.type === "choice" ||
              !note.question.type;
            return (
              <Card
                key={note.id}
                className="hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Content area */}
                    <div className="flex-1 min-w-0">
                      {/* Question content */}
                      <p className="text-sm font-medium leading-relaxed mb-2">
                        {truncateText(note.question.content, 120)}
                      </p>

                      {/* Options (for choice questions) */}
                      {isQuestionType &&
                        note.question.options &&
                        note.question.options.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {note.question.options.map(
                              (opt: string, idx: number) => {
                                const label = String.fromCharCode(65 + idx);
                                const isWrong =
                                  note.wrongAnswer?.trim() === label;
                                const isCorrectAns =
                                  note.question.answer.trim() === label;
                                return (
                                  <span
                                    key={idx}
                                    className={cn(
                                      "text-xs px-2 py-0.5 rounded-md font-mono border",
                                      isWrong
                                        ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                                        : isCorrectAns
                                          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400"
                                          : "bg-muted/50 border-border text-muted-foreground"
                                    )}
                                  >
                                    {label}. {opt}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        )}

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Subject badge */}
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", getSubjectBadgeClass(note.question.subject))}
                        >
                          {note.question.subject}
                        </Badge>

                        {/* Error type badge */}
                        {note.errorType && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {note.errorType}
                          </Badge>
                        )}

                        {/* Wrong answer */}
                        {note.wrongAnswer && (
                          <span className="text-red-500 dark:text-red-400">
                            错答: {note.wrongAnswer}
                          </span>
                        )}

                        {/* Date */}
                        <span className="text-muted-foreground ml-auto">
                          {formatDate(note.createdAt)}
                        </span>

                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            note.status === "eliminated"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
                          )}
                        >
                          {note.status === "eliminated" ? "已消除" : "活跃"}
                        </Badge>

                        {/* Correct count */}
                        {note.status === "active" && note.correctCount > 0 && (
                          <span className="text-green-500 dark:text-green-400">
                            已连续答对 {note.correctCount}/2 次
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Review button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartReview(note)}
                      className="shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      复习
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ====== Pagination ====== */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ====== Review Dialog ====== */}
      <Dialog open={!!reviewingNote} onOpenChange={(open) => !open && handleCloseReview()}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>复习错题</DialogTitle>
            <DialogDescription>重新作答以检验掌握程度</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh] pr-1">
            <div className="space-y-4 pb-2">
              {/* Question card */}
              <Card className="bg-muted/30 border-muted">
                <CardContent className="p-4">
                  <Badge
                    variant="outline"
                    className={cn(getSubjectBadgeClass(reviewingNote?.question.subject || ""))}
                  >
                    {reviewingNote?.question.subject}
                  </Badge>
                  <p className="text-base font-medium leading-relaxed mt-2">
                    {reviewingNote?.question.content}
                  </p>
                </CardContent>
              </Card>

              {/* Original wrong answer */}
              {reviewingNote?.wrongAnswer && (
                <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 [&>svg]:text-red-500">
                  <X className="h-4 w-4" />
                  <AlertTitle>原始错答</AlertTitle>
                  <AlertDescription className="font-mono">
                    {reviewingNote.wrongAnswer}
                  </AlertDescription>
                </Alert>
              )}

              {/* Correct answer (shown after review) */}
              {reviewResult?.correctAnswer && (
                <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 [&>svg]:text-green-500">
                  <Check className="h-4 w-4" />
                  <AlertTitle>正确答案</AlertTitle>
                  <AlertDescription className="font-mono">
                    {reviewResult.correctAnswer}
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* Re-answer section */}
              <div className="space-y-3">
                <p className="text-sm font-medium">重新作答</p>

                {/* Options for choice questions */}
                {(reviewingNote?.question.type === "choice" ||
                  !reviewingNote?.question.type) &&
                  reviewingNote?.question.options &&
                  reviewingNote.question.options.length > 0 && (
                    <RadioGroup
                      value={reviewAnswer}
                      onValueChange={setReviewAnswer}
                      disabled={reviewing || !!reviewResult}
                      className="space-y-2"
                    >
                      {reviewingNote.question.options.map(
                        (opt: string, idx: number) => {
                          const label = String.fromCharCode(65 + idx);
                          const isCorrectAns =
                            reviewingNote.question.answer.trim() === label;
                          const isUserWrong =
                            reviewingNote.wrongAnswer?.trim() === label;

                          return (
                            <label
                              key={idx}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                reviewResult
                                  ? isCorrectAns
                                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                                    : isUserWrong
                                      ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                                      : "border-border"
                                  : reviewAnswer === label
                                    ? "bg-primary/5 border-primary/30"
                                    : "border-border hover:border-primary/20"
                              )}
                            >
                              <RadioGroupItem value={label} id={`option-${idx}`} />
                              <Label
                                htmlFor={`option-${idx}`}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                <span className="font-mono font-bold mr-1">{label}.</span>
                                {opt}
                              </Label>
                            </label>
                          );
                        }
                      )}
                    </RadioGroup>
                  )}

                {/* Text input for non-choice questions */}
                {reviewingNote?.question.type &&
                  reviewingNote.question.type !== "choice" && (
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground mb-1">
                        输入你的答案
                      </Label>
                      <Input
                        type="text"
                        value={reviewAnswer}
                        onChange={(e) => setReviewAnswer(e.target.value)}
                        disabled={reviewing || !!reviewResult}
                        placeholder="请输入答案..."
                        className="mt-1"
                      />
                    </div>
                  )}
              </div>

              {/* Result feedback */}
              {reviewResult && (
                <Alert
                  className={cn(
                    reviewResult.correct
                      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 [&>svg]:text-green-500"
                      : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 [&>svg]:text-red-500"
                  )}
                >
                  {reviewResult.correct ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{reviewResult.message}</AlertTitle>
                  {reviewResult.eliminated && (
                    <AlertDescription className="text-green-600 dark:text-green-400 font-medium">
                      这道错题已从活跃列表中消除！
                    </AlertDescription>
                  )}
                </Alert>
              )}

              {/* Explanation callout */}
              {reviewResult?.explanation && (
                <Alert className="border-muted bg-muted/50 text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>解析</AlertTitle>
                  <AlertDescription className="leading-relaxed">
                    {reviewResult.explanation}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseReview}>
              {reviewResult ? "关闭" : "取消"}
            </Button>

            {!reviewResult && (
              <Button
                onClick={handleSubmitReview}
                disabled={!reviewAnswer.trim() || reviewing}
              >
                {reviewing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  "提交答案"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
