"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Check,
  X,
  Flame,
  Zap,
  ArrowRight,
  Trophy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { SUBJECT_MAP } from "@/lib/constants";
import {
  getSubjectsForMode,
  getDifficultyRangeForMode,
  getLearningModeConfig,
} from "@/lib/learning-modes";
import { useUserStore } from "@/stores/useUserStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { staggerContainer, listItem, fadeIn } from "@/lib/motion";

/* ====== Types ====== */
interface Question {
  id: string;
  subject: string;
  difficulty: number;
  content: string;
  options: string[];
  explanation?: string;
  gradeLevel?: string;
}

// 全部难度级别（1-5）；实际可见项由学习模式范围动态过滤
const difficultyLevels = [
  { key: "easy", label: "基础", value: 1 },
  { key: "medium", label: "中等", value: 2 },
  { key: "hard", label: "困难", value: 3 },
  { key: "expert", label: "极难", value: 4 },
  { key: "hell", label: "地狱", value: 5 },
];

const difficultyColor: Record<number, string> = {
  1: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  2: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  3: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  4: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  5: "bg-slate-200 text-slate-800 dark:bg-slate-700/60 dark:text-slate-200",
};

const xpForDifficulty: Record<number, number> = {
  1: 10,
  2: 25,
  3: 50,
  4: 80,
  5: 120,
};

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "基础",
  2: "中等",
  3: "困难",
  4: "极难",
  5: "地狱",
};

const PAGE_SIZE = 10;

export default function PracticePage() {
  /* ---------- user / learning mode ---------- */
  const learningMode = useUserStore((s) => s.learningMode);
  const setUser = useUserStore((s) => s.setUser);

  // 挂载时主动拉取用户资料，确保 learningMode 与服务端一致
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.user?.learningMode) {
          setUser({ learningMode: data.user.learningMode as string });
        }
      } catch {
        /* 静默失败：将使用默认 PRIMARY 模式 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // 当前模式的有效学习模式 id（learningMode 未就绪时回退到 PRIMARY）
  const effectiveMode = learningMode || "PRIMARY";

  // 基于模式派生：可用学科标签、可用难度列表、默认年级
  const subjects = useMemo(() => {
    const ids = getSubjectsForMode(effectiveMode);
    return ids
      .map((id) => SUBJECT_MAP[id]?.label)
      .filter((label): label is string => Boolean(label));
  }, [effectiveMode]);

  const availableDifficulties = useMemo(() => {
    const [min, max] = getDifficultyRangeForMode(effectiveMode);
    return difficultyLevels.filter((d) => d.value >= min && d.value <= max);
  }, [effectiveMode]);

  const gradeLevel = useMemo(
    () => getLearningModeConfig(effectiveMode).defaultGrade,
    [effectiveMode]
  );

  /* ---------- state ---------- */
  const [subject, setSubject] = useState("数学");
  const [difficulty, setDifficulty] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streakCount, setStreakCount] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const [todayXP, setTodayXP] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // 缓存已提交的题目结果
  const submittedRef = useRef<Map<string, { correct: boolean; explanation?: string }>>(new Map());

  // 当学习模式变化导致当前 subject/difficulty 不再可选时，回退到首个合法值
  useEffect(() => {
    if (subjects.length === 0) return;
    if (!subjects.includes(subject)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubject(subjects[0]);
    }
  }, [subjects, subject]);

  useEffect(() => {
    if (availableDifficulties.length === 0) return;
    const validValues = availableDifficulties.map((d) => d.value);
    if (!validValues.includes(difficulty)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDifficulty(availableDifficulties[0].value);
    }
  }, [availableDifficulties, difficulty]);

  /* ---------- fetch questions ---------- */
  const fetchQuestions = useCallback(
    async (subj: string, diff: number, p: number, grade?: string) => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({
          subject: subj,
          difficulty: String(diff),
          page: String(p),
          limit: String(PAGE_SIZE),
        });
        if (grade) params.set("gradeLevel", grade);
        const res = await fetch(`/api/questions?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "获取题目失败");
        }
        const data = await res.json();
        setQuestions(data.questions || []);
        setTotal(data.total || 0);
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "加载失败");
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 初始加载 & 筛选变化时重新加载
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore({ correct: 0, total: 0 });
    setStreakCount(0);
    setShowStreak(false);
    setComboCount(0);
    submittedRef.current.clear();
    fetchQuestions(subject, difficulty, 1, gradeLevel);
  }, [subject, difficulty, fetchQuestions, gradeLevel]);

  // 翻页时重新加载
  useEffect(() => {
    if (page !== 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentIndex(0);
      setSelectedOption(null);
      setAnswered(false);
      fetchQuestions(subject, difficulty, page, gradeLevel);
    }
  }, [page, subject, difficulty, fetchQuestions, gradeLevel]);

  /* ---------- derived ---------- */
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const question = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;
  const _progressPct = totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIndex >= totalQuestions - 1;
  const progressValue = total > 0 ? ((page - 1) * PAGE_SIZE + currentIndex + 1) / total * 100 : 0;

  /* ---------- handlers ---------- */
  const handleSelect = useCallback(
    async (idx: number) => {
      if (answered || !question || submitting) return;
      setSelectedOption(idx);
      setAnswered(true);
      setSubmitting(true);

      // 检查是否已提交过
      const cached = submittedRef.current.get(question.id);
      if (cached) {
        // 已提交过，使用缓存结果
        if (cached.correct) {
          setStreakCount((s) => s + 1);
          if (streakCount + 1 >= 3) setShowStreak(true);
          setComboCount((c) => c + 1);
          setScore((s) => ({ ...s, correct: s.correct + 1 }));
        } else {
          setStreakCount(0);
          setShowStreak(false);
          setComboCount(0);
        }
        setScore((s) => ({ ...s, total: s.total + 1 }));
        setSubmitting(false);
        return;
      }

      try {
        const res = await fetch("/api/questions/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: question.id,
            answer: String.fromCharCode(65 + idx),
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "提交失败");
        }

        const data = await res.json();

        // 缓存结果
        submittedRef.current.set(question.id, {
          correct: data.correct,
          explanation: data.explanation,
        });

        if (data.correct) {
          setXpAmount(data.xpEarned || 0);
          setShowXP(true);
          setStreakCount((s) => s + 1);
          if (streakCount + 1 >= 3) setShowStreak(true);
          setComboCount((c) => c + 1);
          setTodayXP((prev) => prev + (data.xpEarned || 0));
          setScore((s) => ({ ...s, correct: s.correct + 1 }));

          if (data.xpEarned) {
            toast.success(`+${data.xpEarned} XP`, {
              icon: <Sparkles className="w-4 h-4 text-amber-400" />,
              duration: 2000,
            });
          }
          if (data.leveledUp) {
            toast(`恭喜升级到 Lv.${data.newLevel}！`, {
              icon: "🎉",
              duration: 3000,
            });
          }
        } else {
          setStreakCount(0);
          setShowStreak(false);
          setComboCount(0);
          toast.error("回答错误，看看解析吧", { duration: 2000 });
        }
        setScore((s) => ({ ...s, total: s.total + 1 }));

        setTimeout(() => setShowXP(false), 1500);
        setTimeout(() => setShowStreak(false), 2000);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "提交失败");
      } finally {
        setSubmitting(false);
      }
    },
    [answered, question, submitting, streakCount]
  );

  const handleNext = useCallback(() => {
    if (!isLastQuestion) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    } else if (page < totalPages) {
      // 跳转到下一页
      setPage((p) => p + 1);
    }
  }, [isLastQuestion, page, totalPages]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      const prevQuestion = questions[currentIndex - 1];
      const cached = prevQuestion ? submittedRef.current.get(prevQuestion.id) : undefined;
      if (cached) {
        // Restore previous answer state
        setAnswered(true);
      } else {
        setSelectedOption(null);
        setAnswered(false);
      }
    } else if (page > 1) {
      setPage((p) => p - 1);
    }
  }, [currentIndex, page, questions]);

  const handleRestart = useCallback(() => {
    setPage(1);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore({ correct: 0, total: 0 });
    setStreakCount(0);
    setShowStreak(false);
    setComboCount(0);
    setTodayXP(0);
    submittedRef.current.clear();
    fetchQuestions(subject, difficulty, 1, gradeLevel);
  }, [subject, difficulty, fetchQuestions, gradeLevel]);

  const handleSubjectChange = useCallback(
    (s: string) => {
      setSubject(s);
    },
    []
  );

  const handleDifficultyChange = useCallback(
    (d: string) => {
      setDifficulty(Number(d));
    },
    []
  );

  /* ---------- render ---------- */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">练习中心</h1>
          <p className="text-sm text-muted-foreground mt-1">
            刷题练习，积累经验升级！
          </p>
        </div>
        {/* Combo + XP display */}
        <div className="flex items-center gap-3">
          {comboCount >= 3 && (
            <Badge className="bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 animate-pulse-glow">
              <Flame className="w-3.5 h-3.5 mr-1" />
              {comboCount} 连击！
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <Zap className="w-3.5 h-3.5" />
            今日 {todayXP} XP
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Subject filter */}
            <Select value={subject} onValueChange={handleSubjectChange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Difficulty filter */}
            <Select value={String(difficulty)} onValueChange={handleDifficultyChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="选择难度" />
              </SelectTrigger>
              <SelectContent>
                {availableDifficulties.map((d) => (
                  <SelectItem key={d.key} value={String(d.value)}>
                    {d.label} (+{xpForDifficulty[d.value]}XP)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索题目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ) : fetchError ? (
        /* Error State */
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchQuestions(subject, difficulty, page, gradeLevel)}
            className="mt-2 gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            重试
          </Button>
        </Alert>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                进度 {total > 0 ? (page - 1) * PAGE_SIZE + currentIndex + 1 : 0}/{total}
              </span>
              <span>
                正确 {score.correct}/{score.total || 0}
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          {/* Question Card */}
          {question ? (
            // eslint-disable-next-line react-hooks/refs
            (() => {
              const submittedResult = submittedRef.current.get(question.id);
              const isCorrect = submittedResult?.correct;
              return (
                <motion.div
                  key={question.id}
                  variants={fadeIn}
                  initial="hidden"
                  animate="show"
                >
                <Card
                  className={cn(
                    "relative transition-colors duration-300",
                    answered && isCorrect && "border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-900/10",
                    answered && !isCorrect && "border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-900/10"
                  )}
                >
                  {/* XP gain animation */}
                  {showXP && (
                    <div className="absolute top-4 right-4 z-10 animate-xpGain pointer-events-none">
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg text-sm px-3 py-1">
                        <Sparkles className="w-3.5 h-3.5 mr-1" />+{xpAmount} XP
                      </Badge>
                    </div>
                  )}

                  {/* Streak animation */}
                  {showStreak && streakCount >= 3 && (
                    <div className="absolute top-16 right-4 z-10 animate-xpGain pointer-events-none">
                      <Badge className="bg-gradient-to-r from-red-400 to-pink-500 text-white border-0 shadow-lg text-xs px-3 py-1">
                        <Flame className="w-3.5 h-3.5 mr-1" />{streakCount} 连胜！
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        第 {(page - 1) * PAGE_SIZE + currentIndex + 1} 题
                      </Badge>
                      <Badge variant="outline">{question.subject}</Badge>
                      <Badge
                        className={cn(
                          "border-0",
                          difficultyColor[question.difficulty] || difficultyColor[1]
                        )}
                      >
                        {DIFFICULTY_LABEL[question.difficulty] || question.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="leading-relaxed mt-2">
                      {question.content}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Options as card-style buttons */}
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                    >
                    <RadioGroup
                      value={selectedOption !== null ? String(selectedOption) : undefined}
                      onValueChange={(val) => handleSelect(Number(val))}
                      disabled={answered || submitting}
                      className="space-y-3"
                    >
                      {question.options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrectAnswer = answered && isCorrect && isSelected;
                        const isIncorrectAnswer = answered && isCorrect === false && isSelected;

                        return (
                          <motion.div key={idx} variants={listItem}>
                          <Card
                            className={cn(
                              "relative overflow-hidden transition-all duration-200 cursor-pointer",
                              "hover:border-primary/50 hover:bg-accent/30",
                              isCorrectAnswer &&
                                "border-green-500 bg-green-50 dark:bg-green-950/30",
                              isIncorrectAnswer &&
                                "border-red-500 bg-red-50 dark:bg-red-950/30",
                              isSelected &&
                                !isCorrectAnswer &&
                                !isIncorrectAnswer &&
                                "border-primary bg-primary/5 text-primary",
                              (answered || submitting) && "cursor-default"
                            )}
                          >
                            <CardContent className="p-4">
                              <Label
                                htmlFor={`option-${idx}`}
                                className={cn(
                                  "flex items-start sm:items-center gap-3 min-h-[44px] py-2 cursor-pointer",
                                  (answered || submitting) && "cursor-default"
                                )}
                              >
                                <RadioGroupItem
                                  value={String(idx)}
                                  id={`option-${idx}`}
                                  disabled={answered || submitting}
                                />
                                <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="flex-1 text-sm font-medium break-words whitespace-normal leading-snug">{opt}</span>
                                {isCorrectAnswer && (
                                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                                )}
                                {isIncorrectAnswer && (
                                  <X className="w-5 h-5 text-red-500 shrink-0" />
                                )}
                              </Label>
                            </CardContent>
                          </Card>
                          </motion.div>
                        );
                      })}
                    </RadioGroup>
                    </motion.div>

                    {/* Explanation after answering */}
                    {answered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30"
                      >
                        <p className={cn(
                          "text-xs font-semibold mb-1",
                          submittedResult?.correct
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-700 dark:text-red-300"
                        )}>
                          {submittedResult?.correct
                            ? "✓ 回答正确！"
                            : "✗ 回答错误"}
                        </p>
                        <p className="text-xs text-blue-600/70 dark:text-blue-300/70">
                          {question.explanation || "暂无解析"}
                        </p>
                      </motion.div>
                    )}

                    {/* Navigation buttons */}
                    {answered && (
                      <div className="mt-4 flex flex-col-reverse sm:flex-row gap-3">
                        <Button
                          variant="outline"
                          onClick={handlePrev}
                          disabled={currentIndex === 0 && page <= 1}
                          className="gap-1 w-full sm:w-auto"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          上一题
                        </Button>
                        {!isLastQuestion || page < totalPages ? (
                          <Button
                            onClick={handleNext}
                            className="w-full gap-1"
                          >
                            {isLastQuestion && page < totalPages ? "下一页" : "下一题"}
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={handleRestart}
                            className="w-full gap-1"
                          >
                            <Trophy className="w-4 h-4" />
                            重新练习
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                </motion.div>
              );
            })()
          ) : (
            /* Empty state */
            <EmptyState
              icon={BookOpen}
              title="暂无题目"
              description="请尝试选择其他科目或难度"
              actionLabel="重新加载"
              onAction={() => fetchQuestions(subject, difficulty, 1, gradeLevel)}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-3">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* End-of-session summary */}
      {answered && isLastQuestion && page >= totalPages && score.total > 0 && (
        <Card className="animate-slideUp">
          <CardContent className="p-6 text-center">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold mb-1">练习完成！</h3>
            <p className="text-sm text-muted-foreground mb-4">
              正确率 {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
              （{score.correct}/{score.total}）
            </p>
            <Separator className="my-4" />
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Zap className="w-3 h-3" />
                今日累计 {todayXP} XP
              </Badge>
              {comboCount >= 3 && (
                <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-0 gap-1">
                  <Flame className="w-3 h-3" />
                  最高 {comboCount} 连击
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
