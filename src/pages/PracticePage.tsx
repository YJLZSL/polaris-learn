import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Check,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  BookOpen,
  Bot,
  Clock,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/useUserStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  fadeUp,
  fadeIn,
  listItem,
  staggerContainer,
  useSafeMotion,
} from "@/lib/motion";
import {
  getQuestions,
  savePracticeRecord,
  type Question,
} from "@/lib/repositories/practice.repository";
import {
  getKnowledgePoints,
  type KnowledgePoint,
} from "@/lib/repositories/knowledge.repository";
import { addErrorNote } from "@/lib/repositories/error-notes.repository";

/* ====== 类型定义 ====== */
type Step = "select-kp" | "select-count" | "quiz" | "result";

interface AnswerResult {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}

/* ====== 题量选项（每题约 2 分钟） ====== */
const COUNT_OPTIONS = [
  { count: 5, minutes: 10 },
  { count: 10, minutes: 20 },
  { count: 20, minutes: 40 },
];

/* 北极星靛蓝主色 */
const PRIMARY = "#6366F1";

export default function PracticePage() {
  const userId = useUserStore((s) => s.id);
  const navigate = useNavigate();
  const safeMotion = useSafeMotion();

  /* ---------- 状态 ---------- */
  const [step, setStep] = useState<Step>("select-kp");

  // 知识点列表
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [loadingKP, setLoadingKP] = useState(false);
  const [kpError, setKpError] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // 选中的知识点
  const [selectedKp, setSelectedKp] = useState<KnowledgePoint | null>(null);

  // 题目
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // 答题状态
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<AnswerResult[]>([]);

  /* ---------- 加载知识点 ---------- */
  const loadKnowledgePoints = useCallback(async () => {
    setLoadingKP(true);
    setKpError(null);
    try {
      const points = await getKnowledgePoints();
      setKnowledgePoints(points);
      if (points.length > 0) {
        setExpandedSubject(points[0].subject);
      }
    } catch (e) {
      setKpError(e instanceof Error ? e.message : "加载知识点失败");
    } finally {
      setLoadingKP(false);
    }
  }, []);

  useEffect(() => {
    loadKnowledgePoints();
  }, [loadKnowledgePoints]);

  /* ---------- 按学科分组 ---------- */
  const groupedBySubject = useMemo(() => {
    const map = new Map<string, KnowledgePoint[]>();
    for (const kp of knowledgePoints) {
      if (!map.has(kp.subject)) map.set(kp.subject, []);
      map.get(kp.subject)!.push(kp);
    }
    return Array.from(map.entries()).map(([subject, points]) => ({
      subject,
      points,
    }));
  }, [knowledgePoints]);

  /* ---------- 派生值 ---------- */
  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const isMultiple = currentQuestion?.type === "multiple_choice";
  const currentResult = results[results.length - 1] ?? null;
  const correctCount = results.filter((r) => r.isCorrect).length;

  /* ---------- 工具函数 ---------- */
  // 选项索引数组转答案字符串（如 "AC"）
  const toAnswerString = useCallback((opts: number[]): string => {
    return opts
      .slice()
      .sort((a, b) => a - b)
      .map((i) => String.fromCharCode(65 + i))
      .join("");
  }, []);

  // 判断答案是否正确（兼容单选/多选/判断题）
  const checkAnswer = useCallback(
    (userAnswer: string, correctAnswer: string): boolean => {
      const normalize = (s: string) =>
        s.trim().toUpperCase().replace(/[\s,，]/g, "");
      const u = normalize(userAnswer);
      const c = normalize(correctAnswer);
      if (u === c) return true;
      // 多选：排序后逐字符比较
      return (
        u.split("").sort().join("") === c.split("").sort().join("")
      );
    },
    []
  );

  /* ---------- 提交答案 ---------- */
  const submitAnswer = useCallback(
    async (selectedIdxs: number[]) => {
      if (answered || !currentQuestion || submitting) return;
      setSubmitting(true);
      setSelectedOptions(selectedIdxs);
      setAnswered(true);

      const userAnswer = toAnswerString(selectedIdxs);
      const isCorrect = checkAnswer(userAnswer, currentQuestion.correctAnswer);
      const result: AnswerResult = {
        questionId: currentQuestion.id,
        isCorrect,
        userAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation || "暂无解析",
      };
      setResults((prev) => [...prev, result]);

      // 答错入错题本
      if (!isCorrect && userId) {
        try {
          await addErrorNote({
            id: `${userId}_${currentQuestion.id}_err_${Date.now()}`,
            userId,
            questionId: currentQuestion.id,
            subject: currentQuestion.subject,
            userAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            status: "new",
            reviewCount: 0,
            createdAt: new Date().toISOString(),
          });
        } catch {
          /* 静默失败，不阻塞答题流程 */
        }
      }

      // 保存练习记录
      if (userId) {
        try {
          await savePracticeRecord({
            id: `${userId}_${currentQuestion.id}_${Date.now()}`,
            userId,
            questionId: currentQuestion.id,
            subject: currentQuestion.subject,
            difficulty: currentQuestion.difficulty,
            isCorrect,
            userAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            timeSpentMs: 0,
            createdAt: new Date().toISOString(),
          });
        } catch {
          /* 静默失败 */
        }
      }

      setSubmitting(false);
      if (!isCorrect) {
        toast.error("回答错误，看看解析吧", { duration: 2000 });
      }
    },
    [answered, currentQuestion, submitting, toAnswerString, checkAnswer, userId]
  );

  /* ---------- 选择题量并加载题目 ---------- */
  const handleSelectCount = useCallback(
    async (count: number) => {
      if (!selectedKp) return;
      setLoadingQuestions(true);
      try {
        const all = await getQuestions({ subject: selectedKp.subject });
        // 按 knowledgePointId 过滤
        const filtered = all.filter(
          (q) => q.knowledgePointId === selectedKp.id
        );
        const sliced = filtered.slice(0, count);
        setQuestions(sliced);
        setCurrentIndex(0);
        setSelectedOptions([]);
        setAnswered(false);
        setResults([]);
        setStep("quiz");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "加载题目失败");
      } finally {
        setLoadingQuestions(false);
      }
    },
    [selectedKp]
  );

  /* ---------- 其他 handlers ---------- */
  const handleSelectKp = useCallback((kp: KnowledgePoint) => {
    setSelectedKp(kp);
    setStep("select-count");
  }, []);

  const handleToggleOption = useCallback(
    (idx: number) => {
      if (answered || submitting) return;
      setSelectedOptions((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    },
    [answered, submitting]
  );

  const handleNext = useCallback(() => {
    if (!isLastQuestion) {
      setCurrentIndex((i) => i + 1);
      setSelectedOptions([]);
      setAnswered(false);
    } else {
      setStep("result");
    }
  }, [isLastQuestion]);

  // 答错后跳转 AI 老师，携带题目上下文
  const handleAskAI = useCallback(() => {
    if (!currentQuestion) return;
    navigate("/ai-teacher", {
      state: {
        question: currentQuestion.content,
        myAnswer: toAnswerString(selectedOptions),
        correctAnswer: currentQuestion.correctAnswer,
        analysis: currentQuestion.explanation,
      },
    });
  }, [currentQuestion, navigate, selectedOptions, toAnswerString]);

  // 再来一组：回到选题量
  const handleRetry = useCallback(() => {
    setQuestions([]);
    setResults([]);
    setCurrentIndex(0);
    setSelectedOptions([]);
    setAnswered(false);
    setStep("select-count");
  }, []);

  // 返回选择知识点
  const handleBackToKp = useCallback(() => {
    setQuestions([]);
    setResults([]);
    setCurrentIndex(0);
    setSelectedOptions([]);
    setAnswered(false);
    setSelectedKp(null);
    setStep("select-kp");
  }, []);

  /* ---------- 判断选项状态（答题后高亮） ---------- */
  const getOptionState = (
    idx: number
  ): "correct" | "wrong" | "muted" | "default" => {
    if (!answered || !currentQuestion) return "default";
    const correctLetters = currentQuestion.correctAnswer
      .toUpperCase()
      .replace(/[\s,，]/g, "")
      .split("");
    const correctIdxs = correctLetters
      .map((l) => l.charCodeAt(0) - 65)
      .filter((i) => i >= 0);
    const isCorrectOption = correctIdxs.includes(idx);
    const isSelected = selectedOptions.includes(idx);
    if (isCorrectOption) return "correct";
    if (isSelected) return "wrong";
    return "muted";
  };

  /* ===================== render ===================== */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6">
      {/* 页面标题 */}
      <motion.div {...safeMotion(fadeUp)} initial="hidden" animate="show">
        <h1 className="text-2xl font-bold tracking-tight">练习中心</h1>
        <p className="text-sm text-muted-foreground mt-1">
          按知识点选题，专注练习
        </p>
      </motion.div>

      {/* ============ 第一步：选择知识点 ============ */}
      {step === "select-kp" && (
        <motion.div
          {...safeMotion(fadeUp)}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold">选择知识点</h2>

          {loadingKP ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : kpError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>加载失败</AlertTitle>
              <AlertDescription>{kpError}</AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={loadKnowledgePoints}
                className="mt-2 gap-1"
              >
                <RotateCcw className="h-4 w-4" /> 重试
              </Button>
            </Alert>
          ) : groupedBySubject.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="暂无知识点"
              description="请先在管理页面导入知识点数据"
              actionLabel="重新加载"
              onAction={loadKnowledgePoints}
            />
          ) : (
            <div className="space-y-3">
              {groupedBySubject.map(({ subject, points }) => {
                const isExpanded = expandedSubject === subject;
                return (
                  <Card key={subject} className="overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedSubject(isExpanded ? null : subject)
                      }
                      className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{subject}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {points.length} 个知识点
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <motion.div
                        {...safeMotion(staggerContainer)}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 pt-0"
                      >
                        {points.map((kp) => (
                          <motion.div key={kp.id} {...safeMotion(listItem)}>
                            <button
                              onClick={() => handleSelectKp(kp)}
                              className="w-full text-left p-3 rounded-xl border border-border hover:border-[#6366F1] hover:bg-[#6366F1]/5 transition-all"
                            >
                              <div className="font-medium text-sm">
                                {kp.title}
                              </div>
                              {kp.description && (
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {kp.description}
                                </div>
                              )}
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ============ 第二步：选择题量 ============ */}
      {step === "select-count" && (
        <motion.div
          {...safeMotion(fadeUp)}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <button
            onClick={() => setStep("select-kp")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> 返回选择知识点
          </button>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">已选知识点</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{selectedKp?.subject}</Badge>
              <p className="font-semibold mt-2">{selectedKp?.title}</p>
              {selectedKp?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedKp.description}
                </p>
              )}
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold">选择题量</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {COUNT_OPTIONS.map((opt) => (
              <motion.button
                key={opt.count}
                {...safeMotion(listItem)}
                onClick={() => handleSelectCount(opt.count)}
                disabled={loadingQuestions}
                className="p-6 rounded-xl border-2 border-border hover:border-[#6366F1] hover:bg-[#6366F1]/5 transition-all text-center disabled:opacity-50"
              >
                <div
                  className="text-3xl font-bold"
                  style={{ color: PRIMARY }}
                >
                  {opt.count}
                </div>
                <div className="text-sm text-muted-foreground mt-1">题</div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-3">
                  <Clock className="w-3 h-3" /> 约 {opt.minutes} 分钟
                </div>
              </motion.button>
            ))}
          </div>
          {loadingQuestions && (
            <div className="text-center text-sm text-muted-foreground">
              正在加载题目...
            </div>
          )}
        </motion.div>
      )}

      {/* ============ 第三步：答题（一题一屏）============ */}
      {step === "quiz" && (
        <motion.div
          {...safeMotion(fadeUp)}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* 顶部进度条 */}
          {questions.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span className="truncate">{selectedKp?.title}</span>
                <span className="tabular-nums shrink-0 ml-2">
                  {currentIndex + 1} / {questions.length}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                    backgroundColor: PRIMARY,
                  }}
                />
              </div>
            </div>
          )}

          {/* 加载中 */}
          {loadingQuestions ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </CardContent>
            </Card>
          ) : questions.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="该知识点暂无题目"
              description="请尝试选择其他知识点"
              actionLabel="返回选择知识点"
              onAction={handleBackToKp}
            />
          ) : currentQuestion ? (
            <Card
              className={cn(
                "border shadow-sm transition-colors",
                answered &&
                  currentResult?.isCorrect &&
                  "border-green-400 dark:border-green-500",
                answered &&
                  !currentResult?.isCorrect &&
                  "border-red-400 dark:border-red-500"
              )}
            >
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">第 {currentIndex + 1} 题</Badge>
                  <Badge variant="outline">{currentQuestion.subject}</Badge>
                  {isMultiple && (
                    <Badge
                      variant="outline"
                      style={{ color: PRIMARY, borderColor: PRIMARY }}
                    >
                      多选题
                    </Badge>
                  )}
                </div>
                <CardTitle className="leading-relaxed mt-2 text-lg">
                  {currentQuestion.content}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* 选项 */}
                <div className="space-y-3">
                  {(currentQuestion.options ?? []).map((opt, idx) => {
                    const state = getOptionState(idx);
                    const isSelected = selectedOptions.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() =>
                          isMultiple
                            ? handleToggleOption(idx)
                            : submitAnswer([idx])
                        }
                        disabled={answered || submitting}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                          "border-border hover:border-[#6366F1]/50",
                          !answered &&
                            isSelected &&
                            "border-[#6366F1] bg-[#6366F1]/5",
                          state === "correct" &&
                            "border-green-500 bg-green-50 dark:bg-green-950/30",
                          state === "wrong" &&
                            "border-red-500 bg-red-50 dark:bg-red-950/30",
                          state === "muted" && "opacity-50",
                          (answered || submitting) && "cursor-default"
                        )}
                      >
                        <span
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                            state === "correct"
                              ? "bg-green-500 text-white"
                              : state === "wrong"
                              ? "bg-red-500 text-white"
                              : isSelected
                              ? "text-white"
                              : "bg-muted"
                          )}
                          style={
                            isSelected && state === "default"
                              ? { backgroundColor: PRIMARY }
                              : undefined
                          }
                        >
                          {state === "correct" ? (
                            <Check className="w-4 h-4" />
                          ) : state === "wrong" ? (
                            <X className="w-4 h-4" />
                          ) : (
                            String.fromCharCode(65 + idx)
                          )}
                        </span>
                        <span className="flex-1 text-sm font-medium break-words">
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 多选确认按钮 */}
                {isMultiple && !answered && (
                  <Button
                    onClick={() => submitAnswer(selectedOptions)}
                    disabled={selectedOptions.length === 0 || submitting}
                    className="w-full gap-1"
                  >
                    确认答案
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}

                {/* 答题反馈 */}
                {answered && currentResult && (
                  <motion.div
                    {...safeMotion(fadeIn)}
                    initial="hidden"
                    animate="show"
                    className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30"
                  >
                    <p
                      className={cn(
                        "text-xs font-semibold mb-1",
                        currentResult.isCorrect
                          ? "text-green-700 dark:text-green-300"
                          : "text-red-700 dark:text-red-300"
                      )}
                    >
                      {currentResult.isCorrect
                        ? "✓ 回答正确！"
                        : `✗ 回答错误 · 正确答案：${currentQuestion.correctAnswer}`}
                    </p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-300/70 mt-1">
                      {currentResult.explanation}
                    </p>
                  </motion.div>
                )}

                {/* 答错显示问 AI 老师 */}
                {answered && currentResult && !currentResult.isCorrect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAskAI}
                    className="gap-1.5 border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                  >
                    <Bot className="w-4 h-4" />
                    问 AI 老师
                  </Button>
                )}

                {/* 下一题 / 查看结果 */}
                {answered && (
                  <Button
                    onClick={handleNext}
                    className="w-full gap-1"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {isLastQuestion ? "查看结果" : "下一题"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : null}
        </motion.div>
      )}

      {/* ============ 第四步：结果汇总 ============ */}
      {step === "result" && (
        <motion.div
          {...safeMotion(fadeUp)}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${PRIMARY}1A` }}
              >
                <Check
                  className="w-10 h-10"
                  style={{ color: PRIMARY }}
                />
              </div>
              <h2 className="text-xl font-bold mb-2">练习完成！</h2>
              <p
                className="text-3xl font-bold"
                style={{ color: PRIMARY }}
              >
                {correctCount}/{results.length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                正确率{" "}
                {results.length > 0
                  ? Math.round((correctCount / results.length) * 100)
                  : 0}
                %
              </p>
              {selectedKp && (
                <p className="text-xs text-muted-foreground mt-3">
                  知识点：{selectedKp.title}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="flex-1 gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              再来一组
            </Button>
            <Button
              onClick={handleBackToKp}
              className="flex-1 gap-1"
              style={{ backgroundColor: PRIMARY }}
            >
              <BookOpen className="w-4 h-4" />
              返回选择知识点
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
