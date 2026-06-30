import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Check, XCircle, Trophy, Star, Timer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { useUserStore } from "@/stores/useUserStore";
import {
  getErrorNotesByWeakness,
  markReviewed,
  type ErrorNote,
} from "@/lib/repositories/error-notes.repository";
import {
  getQuestionById,
  type Question,
} from "@/lib/repositories/practice.repository";
import { updateQuestProgress } from "@/lib/repositories/quest.repository";
import { scaleIn, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Task 11: 错题消灭战
 *
 * 60 秒内连续答题，将红色薄弱节点点亮成绿色。
 * - 答对：节点 scaleIn + 颜色过渡到绿色（连续答对 2 次视为消灭）
 * - 答错：节点 shake 动画（keyframes x: [0, -10, 10, -10, 10, 0]），不退出
 * - 结算：count-up 展示"消灭了 X 个红色节点" + 星光奖励动画
 */

interface BattleQuestion {
  note: ErrorNote;
  question: Question;
}

export interface ErrorEliminationBattleProps {
  open: boolean;
  onClose: () => void;
  /** 限定学科（从 KnowledgeGraphPage 红星点击传入） */
  subject?: string;
  /** 战斗结束回调，返回消灭的节点数 */
  onEliminated?: (count: number) => void;
}

const BATTLE_DURATION_SEC = 60;
const WRONG_PENALTY_SEC = 3;
const XP_PER_ELIMINATION = 5;

type Phase = "loading" | "playing" | "finished" | "empty";
type NodeState = "pending" | "correct" | "wrong";
type Feedback = "none" | "correct" | "wrong";

export function ErrorEliminationBattle({
  open,
  onClose,
  subject,
  onEliminated,
}: ErrorEliminationBattleProps) {
  const userId = useUserStore((s) => s.id);
  const addXP = useUserStore((s) => s.addXP);

  const [phase, setPhase] = useState<Phase>("loading");
  const [battleQuestions, setBattleQuestions] = useState<BattleQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [nodeStates, setNodeStates] = useState<NodeState[]>([]);
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BATTLE_DURATION_SEC);
  const [shakeKey, setShakeKey] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [lastMastered, setLastMastered] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载错题（按薄弱度排序）
  const loadBattle = useCallback(async () => {
    if (!userId) {
      setPhase("empty");
      return;
    }
    setPhase("loading");
    try {
      const notes = await getErrorNotesByWeakness(userId, 10, subject);
      if (notes.length === 0) {
        setPhase("empty");
        return;
      }
      const loaded = await Promise.all(
        notes.map(async (note) => {
          const q = await getQuestionById(note.questionId);
          return q ? { note, question: q } : null;
        }),
      );
      const valid = loaded.filter((x): x is BattleQuestion => x !== null);
      if (valid.length === 0) {
        setPhase("empty");
        return;
      }
      setBattleQuestions(valid);
      setNodeStates(new Array(valid.length).fill("pending" as NodeState));
      setCurrentIdx(0);
      setEliminatedCount(0);
      setAttemptedCount(0);
      setSelectedAnswer("");
      setFeedback("none");
      setLastMastered(false);
      setTimeLeft(BATTLE_DURATION_SEC);
      setShakeKey(0);
      setPhase("playing");
    } catch {
      setPhase("empty");
    }
  }, [userId, subject]);

  // 倒计时
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("finished");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // 打开/关闭时加载或重置
  useEffect(() => {
    if (open) {
      void loadBattle();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("loading");
      setBattleQuestions([]);
    }
  }, [open, loadBattle]);

  const currentQuestion = battleQuestions[currentIdx];

  const advanceOrFinish = useCallback(() => {
    setFeedback("none");
    setSelectedAnswer("");
    setCurrentIdx((idx) => {
      if (idx + 1 >= battleQuestions.length) {
        setPhase("finished");
        return idx;
      }
      return idx + 1;
    });
  }, [battleQuestions.length]);

  const handleAnswer = useCallback(
    async (answer: string) => {
      if (!currentQuestion || feedback !== "none") return;
      const isCorrect =
        answer.trim() === currentQuestion.question.correctAnswer.trim();

      setAttemptedCount((c) => c + 1);

      if (isCorrect) {
        // 答对：判断是否达到掌握（reviewCount + 1 >= 2）
        const newReviewCount = (currentQuestion.note.reviewCount ?? 0) + 1;
        const mastered = newReviewCount >= 2;
        try {
          await markReviewed(currentQuestion.note.id, mastered);
        } catch {
          /* 静默失败：UI 状态仍更新 */
        }

        setNodeStates((prev) => {
          const next = [...prev];
          next[currentIdx] = mastered ? "correct" : "pending";
          return next;
        });
        setLastMastered(mastered);
        setFeedback("correct");

        if (mastered) {
          setEliminatedCount((c) => c + 1);
          addXP(XP_PER_ELIMINATION);
          // Task 19.5: 消灭红色节点上报每日任务进度
          if (userId) {
            updateQuestProgress(userId, "eliminate_errors", 1).catch(() => {
              /* 静默失败 */
            });
          }
        }

        window.setTimeout(advanceOrFinish, 800);
      } else {
        // 答错：shake 动画，扣时，但不退出
        setNodeStates((prev) => {
          const next = [...prev];
          next[currentIdx] = "wrong";
          return next;
        });
        setFeedback("wrong");
        setShakeKey((k) => k + 1);
        setTimeLeft((t) => Math.max(0, t - WRONG_PENALTY_SEC));

        window.setTimeout(advanceOrFinish, 1000);
      }
    },
    [currentQuestion, feedback, currentIdx, addXP, advanceOrFinish, userId],
  );

  const handleFinish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("finished");
  }, []);

  const energyPercent = (timeLeft / BATTLE_DURATION_SEC) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base flex items-center gap-2">
                  错题消灭战
                  {subject && (
                    <Badge variant="secondary" className="text-[10px]">
                      {subject}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  60 秒内消灭尽可能多的红色节点
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Loading */}
        {phase === "loading" && (
          <div className="p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"
            />
            <p className="text-sm text-muted-foreground">正在集结错题...</p>
          </div>
        )}

        {/* Empty */}
        {phase === "empty" && (
          <div className="p-8 text-center space-y-3">
            <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
            <p className="text-sm font-medium">暂无活跃错题</p>
            <p className="text-xs text-muted-foreground">
              {subject ? `${subject}学科` : "你"}已无薄弱节点，继续保持！
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        )}

        {/* Playing */}
        {phase === "playing" && currentQuestion && (
          <div className="flex flex-col">
            {/* 能量条（心流能量，非数字） */}
            <div className="px-5 py-3 border-b bg-muted/30">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">心流能量</span>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {currentIdx + 1} / {battleQuestions.length}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      timeLeft > 20
                        ? "linear-gradient(90deg, #22c55e, #84cc16)"
                        : timeLeft > 10
                          ? "linear-gradient(90deg, #f59e0b, #eab308)"
                          : "linear-gradient(90deg, #ef4444, #dc2626)",
                  }}
                  initial={{ width: "100%" }}
                  animate={{ width: `${energyPercent}%` }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </div>
            </div>

            {/* 节点状态条（红色 → 绿色 点亮动画） */}
            <div className="px-5 py-2 border-b bg-muted/10">
              <div className="flex flex-wrap gap-1.5">
                {nodeStates.map((state, idx) => (
                  <motion.div
                    key={battleQuestions[idx]?.note.id ?? idx}
                    className={cn(
                      "w-4 h-4 rounded-full",
                      state === "pending" && "bg-red-500/40",
                      state === "wrong" && "bg-red-500",
                    )}
                    initial={false}
                    animate={
                      state === "correct"
                        ? { scale: [1, 1.4, 1], backgroundColor: "#22c55e" }
                        : state === "wrong"
                          ? { x: [0, -10, 10, -10, 10, 0] }
                          : { scale: 1 }
                    }
                    transition={{ duration: 0.4 }}
                    style={
                      state === "correct"
                        ? { boxShadow: "0 0 6px rgba(34,197,94,0.6)" }
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>

            {/* 题目区 */}
            <ScrollArea className="flex-1 max-h-[50vh]">
              <motion.div
                key={currentIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                className="p-5 space-y-4"
              >
                <motion.div
                  key={shakeKey}
                  animate={
                    feedback === "wrong" ? { x: [0, -10, 10, -10, 10, 0] } : {}
                  }
                  transition={{ duration: 0.4 }}
                >
                  <Card className="bg-muted/30 border-muted">
                    <CardContent className="p-4">
                      <Badge variant="outline" className="text-[10px] mb-2">
                        {currentQuestion.note.subject}
                      </Badge>
                      <p className="text-sm font-medium leading-relaxed">
                        {currentQuestion.question.content}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={(v) => {
                    setSelectedAnswer(v);
                    void handleAnswer(v);
                  }}
                  disabled={feedback !== "none"}
                  className="space-y-2"
                >
                  {currentQuestion.question.options?.map((opt, idx) => {
                    const label = String.fromCharCode(65 + idx);
                    const isCorrectAns =
                      currentQuestion.question.correctAnswer.trim() === label;
                    const showAsCorrect = feedback !== "none" && isCorrectAns;
                    const showAsWrong =
                      selectedAnswer === label && feedback === "wrong";
                    return (
                      <label
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          showAsCorrect
                            ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                            : showAsWrong
                              ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                              : "border-border hover:border-primary/30",
                        )}
                      >
                        <RadioGroupItem value={label} id={`battle-opt-${idx}`} />
                        <Label
                          htmlFor={`battle-opt-${idx}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <span className="font-mono font-bold mr-1">{label}.</span>
                          {opt}
                        </Label>
                        {showAsCorrect && <Check className="w-4 h-4 text-green-500" />}
                      </label>
                    );
                  })}
                </RadioGroup>

                <AnimatePresence>
                  {feedback === "correct" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {lastMastered
                          ? "消灭成功！星光 +5"
                          : "答对！再答对一次即可消灭"}
                      </span>
                    </motion.div>
                  )}
                  {feedback === "wrong" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>答错，节点未消灭，继续努力！</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </ScrollArea>

            <div className="px-5 py-3 border-t flex items-center justify-between bg-muted/30">
              <Button variant="ghost" size="sm" onClick={handleFinish}>
                提前结算
              </Button>
              <span className="text-xs text-muted-foreground">
                已消灭{" "}
                <span className="font-bold text-green-500">{eliminatedCount}</span>{" "}
                个
              </span>
            </div>
          </div>
        )}

        {/* Finished */}
        {phase === "finished" && (
          <FinishScreen
            eliminatedCount={eliminatedCount}
            attemptedCount={attemptedCount}
            onClose={() => {
              onEliminated?.(eliminatedCount);
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * 结算页：count-up 展示消灭数 + 星光奖励动画
 */
function FinishScreen({
  eliminatedCount,
  attemptedCount,
  onClose,
}: {
  eliminatedCount: number;
  attemptedCount: number;
  onClose: () => void;
}) {
  const eliminatedDisplay = useCountUp(eliminatedCount, 1.2);
  const xpReward = eliminatedCount * XP_PER_ELIMINATION;
  const xpDisplay = useCountUp(xpReward, 1.2);

  const accuracy = useMemo(() => {
    if (attemptedCount === 0) return 0;
    return Math.round((eliminatedCount / attemptedCount) * 100);
  }, [eliminatedCount, attemptedCount]);

  return (
    <div className="p-6 space-y-5">
      {/* 星光奖励动画 */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        className="flex justify-center"
      >
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
          >
            <Trophy className="w-10 h-10 text-white" />
          </motion.div>
          {/* 星光散落 */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
                x: Math.cos((i / 6) * Math.PI * 2) * 60,
                y: Math.sin((i / 6) * Math.PI * 2) * 60,
              }}
              transition={{
                duration: 1.5,
                delay: 0.3 + i * 0.1,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            >
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold">消灭战结束</h3>
        <p className="text-sm text-muted-foreground">
          {eliminatedCount > 0
            ? "干得漂亮！红色节点已被点亮"
            : "本次未消灭节点，再接再厉"}
        </p>
      </div>

      {/* 战绩统计（count-up） */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="show"
          className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-center"
        >
          <p className="text-2xl font-bold text-red-500 tabular-nums">
            {Math.round(eliminatedDisplay)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">消灭节点</p>
        </motion.div>
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center"
        >
          <p className="text-2xl font-bold text-blue-500 tabular-nums">
            {attemptedCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">答题数</p>
        </motion.div>
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-center"
        >
          <p className="text-2xl font-bold text-amber-500 tabular-nums">
            +{Math.round(xpDisplay)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">星光奖励</p>
        </motion.div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        正确率 <span className="font-bold text-foreground">{accuracy}%</span>
      </div>

      <Button className="w-full" onClick={onClose}>
        完成
      </Button>
    </div>
  );
}

export default ErrorEliminationBattle;
