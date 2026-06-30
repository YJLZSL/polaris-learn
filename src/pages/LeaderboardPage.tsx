import { useState, useEffect } from "react";
import {
  Trophy,
  Flame,
  AlertTriangle,
  RotateCw,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Shield,
  Snowflake,
  Users,
  Heart,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, listItem } from "@/lib/motion";
import { useUserStore } from "@/stores/useUserStore";
import { getCurrentUser } from "@/lib/services/auth-service";
import {
  getCohortBucket,
  getPersonalProgress,
  getDowngradeStatus,
  type CohortBucket,
  type PersonalProgress,
  type DowngradeStatus,
  type BucketMember,
} from "@/lib/repositories/leaderboard.repository";
import { getStreakSnapshot, type StreakSnapshot } from "@/lib/repositories/gamification.repository";

const LEADERBOARD_VISIBLE_KEY = "polaris_leaderboard_visible";

/* ====== Helper ====== */
function getInitial(name: string): string {
  return name?.charAt(0) || "?";
}

/** 将 0-1 分位转为"前 X%"模糊描述，避免精确名次压力 */
function describePercentile(p: number | undefined): string {
  if (p === undefined) return "—";
  // 向上取整到 nearest 10%，最低 10%
  const pct = Math.max(10, Math.ceil(p * 10) * 10);
  return `前 ${pct}%`;
}

function describeTrend(trend: PersonalProgress["trend"]): {
  icon: typeof TrendingUp;
  color: string;
  label: string;
} {
  if (trend === "up") {
    return { icon: TrendingUp, color: "text-emerald-500", label: "进步" };
  }
  if (trend === "down") {
    return { icon: TrendingDown, color: "text-amber-500", label: "退步" };
  }
  return { icon: Minus, color: "text-muted-foreground", label: "持平" };
}

/* ====== Personal Progress Card ====== */
function ProgressCard({ progress }: { progress: PersonalProgress }) {
  const trend = describeTrend(progress.trend);
  const TrendIcon = trend.icon;
  const masteryDelta = progress.weekMasteredNodes - progress.lastWeekMasteredNodes;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-amber-500" />
          超越昨日的自己
        </CardTitle>
        <CardDescription className="text-xs">
          {progress.encouragement}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 今日 vs 昨日 XP */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">今日 XP</p>
            <p className="text-2xl font-bold mt-0.5">{progress.todayXP}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">昨日 XP</p>
            <p className="text-2xl font-bold mt-0.5 text-muted-foreground">
              {progress.yesterdayXP}
            </p>
          </div>
        </div>

        {/* 趋势条 */}
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div className="flex items-center gap-2">
            <TrendIcon className={cn("h-4 w-4", trend.color)} />
            <span className="text-sm font-medium">{trend.label}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {progress.xpDelta > 0 ? "+" : ""}
            {progress.xpDelta} XP
          </span>
        </div>

        {/* 本周掌握节点 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">本周新掌握节点</p>
            <p className="text-lg font-semibold mt-0.5">
              {progress.weekMasteredNodes}
              <span className="text-xs text-muted-foreground ml-1">
                / 上周 {progress.lastWeekMasteredNodes}
              </span>
            </p>
          </div>
          {masteryDelta > 0 && (
            <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
              +{masteryDelta} 节点
            </Badge>
          )}
        </div>

        {/* 连胜 + 历史最高 */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">当前连胜</p>
              <p className="text-sm font-semibold">{progress.currentStreak} 天</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">历史最高</p>
              <p className="text-sm font-semibold">{progress.longestStreak} 天</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ====== Streak Items Strip ====== */
function StreakItemsStrip({ snapshot }: { snapshot: StreakSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="rounded-xl">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400/20 to-blue-500/20 flex items-center justify-center">
            <Snowflake className="h-4 w-4 text-sky-500" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">冻结卡</p>
            <p className="text-base font-bold">{snapshot.freezeCards}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400/20 to-fuchsia-500/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">保护盾</p>
            <p className="text-base font-bold">{snapshot.shieldCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ====== Cohort Bucket View ====== */
function CohortBucketView({ bucket }: { bucket: CohortBucket }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            你的小队
          </span>
          <Badge variant="outline" className="text-[11px] font-normal">
            {bucket.bucketLabel}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {bucket.myPercentile !== undefined ? (
            <>
              你在小队中位列
              <span className="font-semibold text-foreground mx-1">
                {describePercentile(bucket.myPercentile)}
              </span>
              · 共 {bucket.size} 人
            </>
          ) : (
            <>小队共 {bucket.size} 人</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="divide-y"
        >
          {bucket.members.map((m) => (
            <CohortMemberRow key={m.userId} member={m} />
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}

function CohortMemberRow({
  member,
}: {
  member: BucketMember;
}) {
  const isMe = !!member.isMe;
  // 用相对位置条而非数字名次：position bar 长度 = (1 - percentile) * 100%
  const barWidth = Math.max(8, Math.round((1 - member.percentile) * 100));

  return (
    <motion.div
      variants={listItem}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors",
        isMe && "bg-primary/5"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
        <AvatarFallback
          className={cn(
            "text-xs font-bold",
            isMe
              ? "bg-gradient-to-br from-indigo-400 to-purple-500 text-white"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isMe ? "我" : getInitial(member.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{member.name}</span>
          {isMe && (
            <Badge variant="outline" className="h-4 px-1 text-[10px] text-primary border-primary/30">
              我
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isMe
                  ? "bg-gradient-to-r from-indigo-400 to-purple-500"
                  : "bg-muted-foreground/40"
              )}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            Lv.{member.level}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Flame className="h-3 w-3 text-orange-400" />
        <span className="text-xs text-muted-foreground">{member.currentStreak}</span>
      </div>
    </motion.div>
  );
}

/* ====== Downgrade Hint Banner ====== */
function DowngradeBanner({ status }: { status: DowngradeStatus }) {
  if (!status.shouldDowngrade && status.daysUntilDowngrade > 3) {
    return null;
  }
  return (
    <Alert>
      <Heart className="h-4 w-4 text-rose-400" />
      <AlertTitle className="text-sm">
        {status.shouldDowngrade ? "已进入休整节奏" : "节奏提醒"}
      </AlertTitle>
      <AlertDescription className="text-xs">{status.hint}</AlertDescription>
    </Alert>
  );
}

/* ====== Main Page ====== */
export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("progress");
  const [progress, setProgress] = useState<PersonalProgress | null>(null);
  const [bucket, setBucket] = useState<CohortBucket | null>(null);
  const [downgrade, setDowngrade] = useState<DowngradeStatus | null>(null);
  const [snapshot, setSnapshot] = useState<StreakSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const learningMode = useUserStore((s) => s.learningMode);
  const setUser = useUserStore((s) => s.setUser);
  const userId = useUserStore((s) => s.id);
  const initFromAuth = useUserStore((s) => s.initFromAuth);
  const [modeReady, setModeReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  // 挂载时主动拉取用户资料，确保 learningMode 与服务端一致
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
        /* 静默失败 */
      } finally {
        if (!cancelled) setModeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, initFromAuth]);

  // 根据 learningMode 与 localStorage 决定是否隐藏排行榜
  useEffect(() => {
    if (!modeReady) return;
    const stored = localStorage.getItem(LEADERBOARD_VISIBLE_KEY);
    if (learningMode === "PROFESSIONAL" && stored === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHidden(true);
    } else {
      setHidden(false);
    }
  }, [learningMode, modeReady]);

  useEffect(() => {
    if (hidden) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        if (!userId) {
          setProgress(null);
          setBucket(null);
          setDowngrade(null);
          setSnapshot(null);
          return;
        }
        const [prog, bk, dg, snap] = await Promise.all([
          getPersonalProgress(userId),
          getCohortBucket(userId),
          getDowngradeStatus(userId),
          getStreakSnapshot(userId),
        ]);
        setProgress(prog);
        setBucket(bk);
        setDowngrade(dg);
        setSnapshot(snap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
        setProgress(null);
        setBucket(null);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [hidden, userId]);

  /* ---------- Hidden state (PROFESSIONAL mode default) ---------- */
  if (hidden) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">排行榜</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              上班族模式已隐藏排行榜
            </p>
          </div>
        </div>
        <EmptyState
          icon={EyeOff}
          title="排行榜已隐藏"
          description="上班族模式默认隐藏排行榜，帮助你在碎片化学习中保持专注。如需开启，请前往「设置 → 外观」打开显示排行榜开关。"
        />
      </div>
    );
  }

  /* ---------- Loading state ---------- */
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">排行榜</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              超越昨日的自己，节奏由你掌控
            </p>
          </div>
        </div>

        <Skeleton className="h-9 w-full rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />

        {/* Progress Card Skeleton */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
            <Skeleton className="h-3 w-48 mt-2 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              <Skeleton className="h-20 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
            </div>
            <Skeleton className="h-12 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
            <Skeleton className="h-10 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Error state ---------- */
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">排行榜</h1>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RotateCw className="h-4 w-4" />
              重试
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  /* ---------- Empty state ---------- */
  if (!progress && !bucket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">排行榜</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              超越昨日的自己，节奏由你掌控
            </p>
          </div>
        </div>
        <EmptyState
          icon={Trophy}
          title="暂无数据"
          description="完成一次练习后，这里会展示你的进步轨迹与小队定位。"
          actionLabel="去练习"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  /* ---------- Main content ---------- */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">排行榜</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            超越昨日的自己，节奏由你掌控
          </p>
        </div>
      </div>

      {/* Task 15.9: 柔和降级提示 */}
      {downgrade && <DowngradeBanner status={downgrade} />}

      {/* Task 15.4/15.5: 连胜容错道具展示 */}
      {snapshot && <StreakItemsStrip snapshot={snapshot} />}

      {/* Tabs: 进步榜（主） + 小队列（副） */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="progress" className="flex-1">
            个人进步
          </TabsTrigger>
          <TabsTrigger value="cohort" className="flex-1">
            小队列
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {activeTab === "progress" && progress && (
                <ProgressCard progress={progress} />
              )}
              {activeTab === "cohort" && bucket && (
                <CohortBucketView bucket={bucket} />
              )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
