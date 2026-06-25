"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  Crown,
  Flame,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, listItem, scaleIn } from "@/lib/motion";

/* ====== Types ====== */
interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  level: number;
  xp: number;
  streak: number;
}

/* ====== Helper ====== */
function getInitial(name: string): string {
  return name?.charAt(0) || "?";
}

/* ====== Podium Card ====== */
function PodiumCard({
  user,
  place,
}: {
  user: LeaderboardUser | undefined;
  place: 1 | 2 | 3;
}) {
  const config = {
    1: {
      crown: true,
      avatarSize: "h-20 w-20 lg:h-24 lg:w-24",
      avatarFallback:
        "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-white text-2xl lg:text-3xl",
      ring: "ring-4 ring-yellow-400/70 dark:ring-yellow-400/60",
      glow: "shadow-[0_0_24px_rgba(250,204,21,0.45)] dark:shadow-[0_0_28px_rgba(250,204,21,0.35)]",
      podiumHeight: "h-28 lg:h-32",
      podiumBg:
        "bg-gradient-to-t from-yellow-200 via-yellow-100 to-yellow-50 dark:from-yellow-700/60 dark:via-yellow-600/40 dark:to-yellow-500/30 border-yellow-300 dark:border-yellow-500/50",
      podiumBase:
        "bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 dark:from-yellow-600 dark:via-yellow-700 dark:to-yellow-800 shadow-lg shadow-yellow-500/30 dark:shadow-yellow-900/40",
      badgeVariant: "default" as const,
      badgeClass:
        "bg-gradient-to-b from-yellow-300 to-yellow-500 border border-yellow-200 text-yellow-950 hover:from-yellow-300 hover:to-yellow-500",
      nameClass: "text-base lg:text-lg font-bold",
      xpClass: "text-yellow-700 dark:text-yellow-300",
      order: "order-2",
    },
    2: {
      crown: false,
      avatarSize: "h-16 w-16 lg:h-20 lg:w-20",
      avatarFallback:
        "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white text-xl lg:text-2xl",
      ring: "ring-4 ring-slate-300/70 dark:ring-slate-400/50",
      glow: "shadow-[0_0_20px_rgba(203,213,225,0.35)] dark:shadow-[0_0_24px_rgba(203,213,225,0.25)]",
      podiumHeight: "h-20 lg:h-24",
      podiumBg:
        "bg-gradient-to-t from-slate-200 via-slate-100 to-slate-50 dark:from-slate-700/60 dark:via-slate-600/40 dark:to-slate-500/30 border-slate-300 dark:border-slate-500/50",
      podiumBase:
        "bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 dark:from-slate-500 dark:via-slate-600 dark:to-slate-700 shadow-lg shadow-slate-500/25 dark:shadow-slate-900/40",
      badgeVariant: "secondary" as const,
      badgeClass:
        "bg-gradient-to-b from-slate-300 to-slate-500 border border-slate-200 text-slate-950 hover:from-slate-300 hover:to-slate-500",
      nameClass: "text-sm lg:text-base font-semibold",
      xpClass: "text-slate-700 dark:text-slate-300",
      order: "order-1",
    },
    3: {
      crown: false,
      avatarSize: "h-16 w-16 lg:h-20 lg:w-20",
      avatarFallback:
        "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white text-xl lg:text-2xl",
      ring: "ring-4 ring-amber-600/60 dark:ring-amber-500/50",
      glow: "shadow-[0_0_20px_rgba(217,119,6,0.35)] dark:shadow-[0_0_24px_rgba(217,119,6,0.28)]",
      podiumHeight: "h-16 lg:h-20",
      podiumBg:
        "bg-gradient-to-t from-amber-200 via-amber-100 to-amber-50 dark:from-amber-800/60 dark:via-amber-700/40 dark:to-amber-600/30 border-amber-300 dark:border-amber-600/50",
      podiumBase:
        "bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 shadow-lg shadow-amber-700/30 dark:shadow-amber-950/40",
      badgeVariant: "secondary" as const,
      badgeClass:
        "bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-500 text-white hover:from-amber-600 hover:to-amber-800",
      nameClass: "text-sm lg:text-base font-semibold",
      xpClass: "text-amber-700 dark:text-amber-300",
      order: "order-3",
    },
  }[place];

  return (
    <div className={cn("flex flex-col items-center", config.order)}>
      {/* Crown for #1 */}
      {config.crown && (
        <Crown className="h-7 w-7 lg:h-8 lg:w-8 text-yellow-500 drop-shadow-md mb-1" />
      )}

      {/* Avatar */}
      <div className={cn("relative mb-3 rounded-full", config.glow)}>
        <Avatar className={cn(config.avatarSize, config.ring, "shadow-md")}>
          {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
          <AvatarFallback className={config.avatarFallback}>
            {user ? getInitial(user.name) : "?"}
          </AvatarFallback>
        </Avatar>
        <Badge
          className={cn(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold rounded-full shadow-sm",
            config.badgeClass
          )}
        >
          {place}
        </Badge>
      </div>

      {/* Podium block */}
      <div className="w-full flex flex-col items-center">
        <div
          className={cn(
            "w-full rounded-t-xl border-x border-t flex flex-col items-center justify-center text-center px-2 relative overflow-hidden",
            config.podiumHeight,
            config.podiumBg
          )}
        >
          {/* Metallic sheen overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/5 dark:from-white/10 dark:to-black/20 pointer-events-none" />
          <div className="relative z-10">
            <p className={cn("truncate w-full", config.nameClass)}>
              {user?.name || "---"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Lv.{user?.level ?? 0}
            </p>
            <p className={cn("text-xs font-bold", config.xpClass)}>
              {user?.xp ?? 0} XP
            </p>
          </div>
        </div>
        {/* Podium base */}
        <div
          className={cn(
            "w-[110%] h-3 rounded-b-lg -mt-px",
            config.podiumBase
          )}
        />
      </div>
    </div>
  );
}

/* ====== Main Page ====== */
export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/game/leaderboard?period=${activeTab}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "获取排行榜失败");
        }
        const result = await res.json();
        setData(result.leaderboard || []);
        setCurrentUser(result.currentUser || null);
        setCurrentUserRank(result.currentUserRank || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [activeTab]);

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);
  const isInTop10 =
    currentUserRank !== null && currentUserRank <= 10;

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
              努力练习，挑战更高的排名！
            </p>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <Skeleton className="h-9 w-full rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />

        {/* Podium Skeleton */}
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="order-1 flex flex-col items-center gap-2">
                <Skeleton className="h-16 w-16 lg:h-20 lg:w-20 rounded-full bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <Skeleton className="w-full h-20 lg:h-24 rounded-t-xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              </div>
              <div className="order-2 flex flex-col items-center gap-2">
                <Skeleton className="h-20 w-20 lg:h-24 lg:w-24 rounded-full bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <Skeleton className="w-full h-28 lg:h-32 rounded-t-xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              </div>
              <div className="order-3 flex flex-col items-center gap-2">
                <Skeleton className="h-16 w-16 lg:h-20 lg:w-20 rounded-full bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <Skeleton className="w-full h-16 lg:h-20 rounded-t-xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-6 rounded-md bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <Skeleton className="h-9 w-9 rounded-full bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                  <Skeleton className="h-2.5 w-16 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
                </div>
                <Skeleton className="h-4 w-10 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              </div>
            ))}
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
  if (!loading && data.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">排行榜</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              努力练习，挑战更高的排名！
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger
              value="weekly"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground"
            >
              周榜
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground"
            >
              月榜
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground"
            >
              总榜
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <EmptyState
          icon={Trophy}
          title="暂无排行数据"
          description="快去练习，成为第一个上榜的人吧！"
          actionLabel="刷新榜单"
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
            努力练习，挑战更高的排名！
          </p>
        </div>
      </div>

      {/* Time Period Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="weekly" className="flex-1">周榜</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">月榜</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">总榜</TabsTrigger>
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
          {/* ====== Top 3 Podium ====== */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-3 gap-3 items-end"
              >
                {/* 2nd place */}
                <motion.div variants={listItem}>
                  <PodiumCard user={top3[1]} place={2} />
                </motion.div>
                {/* 1st place - champion with float */}
                <motion.div variants={scaleIn} className="animate-float">
                  <PodiumCard user={top3[0]} place={1} />
                </motion.div>
                {/* 3rd place */}
                <motion.div variants={listItem}>
                  <PodiumCard user={top3[2]} place={3} />
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>

          {/* ====== Ranking Table (ranks 4+) ====== */}
          {rest.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>完整排名</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">排名</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">
                        等级
                      </TableHead>
                      <TableHead className="text-right">XP</TableHead>
                      <TableHead className="text-center w-16 hidden sm:table-cell">连续</TableHead>
                    </TableRow>
                  </TableHeader>
                  <motion.tbody
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="[&_tr:last-child]:border-0"
                  >
                    {rest.map((user, idx) => {
                      const rank = idx + 4;
                      const isMe = currentUser?.userId === user.userId;

                      return (
                        <motion.tr
                          key={user.userId}
                          variants={listItem}
                          className={cn(
                            "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                            isMe && "bg-accent",
                            !isMe && rank % 2 === 0 && "bg-muted/30"
                          )}
                        >
                          {/* Rank */}
                          <TableCell className="text-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              {rank}
                            </span>
                          </TableCell>

                          {/* Avatar + Name */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {user.avatar && (
                                  <AvatarImage
                                    src={user.avatar}
                                    alt={user.name}
                                  />
                                )}
                                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-bold">
                                  {getInitial(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium truncate">
                                    {user.name}
                                  </span>
                                  {isMe && (
                                    <Badge
                                      variant="outline"
                                      className="h-4 px-1 text-[10px] text-primary border-primary/30"
                                    >
                                      我
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground sm:hidden">
                                  Lv.{user.level} · {user.xp} XP
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Level (hidden on mobile) */}
                          <TableCell className="text-center hidden sm:table-cell">
                            <Badge variant="secondary" className="text-[11px]">
                              Lv.{user.level}
                            </Badge>
                          </TableCell>

                          {/* XP */}
                          <TableCell className="text-right">
                            <span className="text-sm font-semibold">
                              {user.xp.toLocaleString()}
                            </span>
                          </TableCell>

                          {/* Streak */}
                          <TableCell className="text-center hidden sm:table-cell">
                            <div className="flex items-center justify-center gap-0.5">
                              <Flame className="h-3.5 w-3.5 text-orange-400" />
                              <span className="text-xs font-semibold">
                                {user.streak}
                              </span>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </motion.tbody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ====== User's Own Rank (sticky bottom) ====== */}
          {currentUser && currentUserRank && !isInTop10 && (
            <div className="static sm:sticky sm:bottom-4 z-10 mt-4">
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground shrink-0">
                      我的排名
                    </Badge>
                    <span className="text-2xl font-bold text-primary">
                      #{currentUserRank}
                    </span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {currentUser.avatar && (
                          <AvatarImage
                            src={currentUser.avatar}
                            alt={currentUser.name}
                          />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-bold">
                          {getInitial(currentUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-medium">{currentUser.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Lv.{currentUser.level} · {currentUser.xp} XP
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
