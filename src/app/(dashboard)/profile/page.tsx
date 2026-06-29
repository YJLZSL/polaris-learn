"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Star,
  Flame,
  CheckCircle2,
  Clock,
  Trophy,
  Settings,
  GraduationCap,
  Lightbulb,
  BookOpen,
  Rocket,
  Heart,
  Sparkles,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/useUserStore";

/* ---------- helpers ---------- */
function xpForLevel(lvl: number) {
  const t = [
    0, 100, 200, 350, 500, 700, 950, 1250, 1600, 2000, 2500, 3100, 3800, 4600,
    5500, 6500, 7600, 8800, 10000, 12000,
  ];
  return t[lvl] ?? t[t.length - 1];
}

/* ---------- types ---------- */
interface ProfileData {
  id: string;
  name: string;
  email: string;
  grade: string | null;
  learningMode: string;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
  maxStreak: number;
  createdAt: string;
  studentProfile: {
    learningStyle: string | null;
    dailyGoalMin: number | null;
    weeklyGoalDays: number | null;
  } | null;
  levelInfo: { level: number; currentXP: number; nextLevelXP: number; progress: number };
  todayStats: { questionsDone: number; questionsCorrect: number; xpEarned: number; studyDuration: number };
  badges: { id: string; name: string; description: string; icon: string; category: string; rarity: string; earnedAt: string }[];
  stats: { totalConversations: number; totalErrorNotes: number; totalNotes: number; totalLearningRecords: number };
}

/* ---------- mock badges (fallback) ---------- */
const fallbackBadges = [
  { name: "初学者", icon: GraduationCap, color: "from-green-400 to-emerald-500", earned: true, desc: "完成首次练习" },
  { name: "刷题达人", icon: BookOpen, color: "from-blue-400 to-cyan-500", earned: true, desc: "累计答对 50 题" },
  { name: "坚持不懈", icon: Flame, color: "from-orange-400 to-red-500", earned: true, desc: "连续学习 7 天" },
  { name: "知识探索者", icon: Lightbulb, color: "from-amber-400 to-yellow-500", earned: false, desc: "解锁全部科目" },
  { name: "满分选手", icon: Star, color: "from-purple-400 to-pink-500", earned: false, desc: "连续答对 10 题" },
  { name: "学霸", icon: Trophy, color: "from-indigo-400 to-purple-500", earned: false, desc: "达到 Lv.10" },
  { name: "时间管理大师", icon: Clock, color: "from-cyan-400 to-blue-500", earned: false, desc: "累计学习 100 小时" },
  { name: "社交达人", icon: Heart, color: "from-pink-400 to-rose-500", earned: false, desc: "邀请 5 位好友" },
];

/* ---------- mock activity feed ---------- */
const activities = [
  { id: 1, type: "xp", text: "完成数学练习，获得", value: "+45 XP", time: "30 分钟前", icon: Sparkles, color: "text-amber-500" },
  { id: 2, type: "streak", text: "连续学习达到", value: "7 天", time: "2 小时前", icon: Flame, color: "text-orange-500" },
  { id: 3, type: "badge", text: "解锁成就徽章", value: "刷题达人", time: "昨天", icon: Trophy, color: "text-indigo-500" },
  { id: 4, type: "xp", text: "完成英语练习，获得", value: "+30 XP", time: "昨天", icon: Sparkles, color: "text-amber-500" },
  { id: 5, type: "level", text: "升级到", value: "Lv.5", time: "2 天前", icon: Rocket, color: "text-purple-500" },
  { id: 6, type: "xp", text: "完成物理练习，获得", value: "+50 XP", time: "3 天前", icon: Sparkles, color: "text-amber-500" },
];

const gradeOptions = [
  { group: "小学", items: ["小学一年级", "小学二年级", "小学三年级", "小学四年级", "小学五年级", "小学六年级"] },
  { group: "初中", items: ["初中一年级", "初中二年级", "初中三年级"] },
  { group: "高中", items: ["高中一年级", "高中二年级", "高中三年级"] },
];

const learningGoalOptions = ["提高成绩", "竞赛培优", "兴趣学习"];
const dailyTimeOptions = [
  { label: "30 分钟", value: "30" },
  { label: "1 小时", value: "60" },
  { label: "2 小时", value: "120" },
];

export default function ProfilePage() {
  const { name, level, xp, streak, avatar, grade, setUser } = useUserStore();

  /* ---------- state ---------- */
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [formName, setFormName] = useState(name || "");
  const [formGrade, setFormGrade] = useState(grade || "");
  const [formLearningGoal, setFormLearningGoal] = useState("");
  const [formDailyTime, setFormDailyTime] = useState("30");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ---------- fetch profile ---------- */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "获取资料失败");
      }
      const data = await res.json();
      setProfileData(data.user);
      // Sync form state with fetched data
      if (data.user.name) setFormName(data.user.name);
      if (data.user.grade) setFormGrade(data.user.grade);
      if (data.user.studentProfile?.learningStyle) setFormLearningGoal(data.user.studentProfile.learningStyle);
      if (data.user.studentProfile?.dailyGoalMin) setFormDailyTime(String(data.user.studentProfile.dailyGoalMin));
      // Sync zustand store
      setUser({
        name: data.user.name,
        grade: data.user.grade,
        learningMode: data.user.learningMode,
        avatar: data.user.avatar,
        xp: data.user.xp,
        level: data.user.level,
        streak: data.user.streak,
        email: data.user.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取资料失败");
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  /* ---------- computed ---------- */
  const currentLevel = profileData?.level ?? level;
  const currentXP = profileData?.xp ?? xp;
  const currentStreak = profileData?.streak ?? streak;
  const currentName = profileData?.name ?? name ?? "同学";
  const currentEmail = profileData?.email ?? "";
  const currentGrade = profileData?.grade ?? grade;
  const currentAvatar = profileData?.avatar ?? avatar;
  const createdAt = profileData?.createdAt;

  const progress = useMemo(() => {
    const cur = xpForLevel(currentLevel);
    const nxt = xpForLevel(currentLevel + 1);
    return Math.min(((currentXP - cur) / (nxt - cur)) * 100, 100);
  }, [currentXP, currentLevel]);

  const stats = [
    { icon: Star, label: "总 XP", value: `${currentXP}`, color: "text-amber-500" },
    { icon: CheckCircle2, label: "答对题数", value: `${profileData?.todayStats?.questionsCorrect ?? 128}`, color: "text-green-500" },
    { icon: Flame, label: "学习连续", value: `${currentStreak} 天`, color: "text-orange-500" },
    { icon: Trophy, label: "知识点掌握", value: `${profileData?.stats?.totalNotes ?? 0}`, color: "text-indigo-500" },
  ];

  /* ---------- save handler ---------- */
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          grade: formGrade,
          avatar: currentAvatar,
          learningStyle: formLearningGoal || undefined,
          dailyGoalMin: formDailyTime ? parseInt(formDailyTime) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }
      setUser({ name: formName, grade: formGrade });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      // Refresh profile data
      fetchProfile();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- loading skeleton ---------- */
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }

  /* ---------- error state ---------- */
  if (error && !profileData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchProfile} variant="outline" className="mt-4">
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* ====== Profile Header Card ====== */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 text-white rounded-2xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        <CardContent className="relative z-10 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <Avatar className="w-20 h-20 lg:w-24 lg:h-24 border-2 border-white/30 shrink-0">
              <AvatarFallback className="bg-white/20 backdrop-blur text-white font-bold text-2xl lg:text-3xl">
                {currentAvatar || currentName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{currentName}</h1>
                {currentGrade && (
                  <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0 hover:bg-white/30">
                    {currentGrade}
                  </Badge>
                )}
              </div>
              {currentEmail && (
                <p className="text-sm text-white/70 mb-2">{currentEmail}</p>
              )}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30 gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-300" />
                  Lv.{currentLevel}
                </Badge>
                <span className="text-sm text-white/70">{currentXP} / {xpForLevel(currentLevel + 1)} XP</span>
              </div>
              {/* XP Progress */}
              <Progress value={progress} className="h-2 max-w-xs bg-white/20 [&>div]:bg-gradient-to-r [&>div]:from-amber-300 [&>div]:to-yellow-400" />
              <p className="text-xs text-white/60 mt-2">
                距离下一级还需 {Math.max(0, xpForLevel(currentLevel + 1) - currentXP)} XP
              </p>
              {createdAt && (
                <p className="text-xs text-white/50 mt-1">
                  加入于 {new Date(createdAt).toLocaleDateString("zh-CN")}
                </p>
              )}
            </div>
            {/* Settings link */}
            <Link href="/settings">
              <Button variant="ghost" className="shrink-0 text-white hover:bg-white/20 gap-1.5">
                <Settings className="w-4 h-4" />
                设置
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ====== Stats Grid ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-lg font-bold">{s.value}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ====== Edit Form Card ====== */}
      <Card>
        <CardHeader>
          <CardTitle>编辑资料</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}
          {/* 姓名 */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">姓名</Label>
            <Input
              id="profile-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="输入你的姓名"
              maxLength={20}
            />
          </div>

          {/* 年级 */}
          <div className="space-y-2">
            <Label>年级</Label>
            <Select value={formGrade} onValueChange={setFormGrade}>
              <SelectTrigger>
                <SelectValue placeholder="请选择年级" />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map((group) => (
                  <SelectGroup key={group.group}>
                    <SelectLabel>{group.group}</SelectLabel>
                    {group.items.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 学习目标 */}
          <div className="space-y-2">
            <Label>学习目标</Label>
            <Select value={formLearningGoal} onValueChange={setFormLearningGoal}>
              <SelectTrigger>
                <SelectValue placeholder="请选择学习目标" />
              </SelectTrigger>
              <SelectContent>
                {learningGoalOptions.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 每日学习时间目标 */}
          <div className="space-y-2">
            <Label>每日学习时间目标</Label>
            <Select value={formDailyTime} onValueChange={setFormDailyTime}>
              <SelectTrigger>
                <SelectValue placeholder="请选择每日学习时间" />
              </SelectTrigger>
              <SelectContent>
                {dailyTimeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存修改
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ====== Badge Showcase ====== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>成就徽章</CardTitle>
          <span className="text-xs text-muted-foreground">
            {fallbackBadges.filter((b) => b.earned).length}/{fallbackBadges.length} 已获得
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {fallbackBadges.map((badge) => (
              <div
                key={badge.name}
                className={`flex flex-col items-center text-center gap-2 p-3 rounded-xl border transition-all ${
                  badge.earned
                    ? "bg-muted/50 border-border"
                    : "opacity-50 grayscale"
                }`}
              >
                <div
                  className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center text-white shadow-sm`}
                >
                  <badge.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <p className="text-[10px] lg:text-xs font-medium">{badge.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ====== Activity Feed ====== */}
      <Card>
        <CardHeader>
          <CardTitle>最近动态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <act.icon className={`w-4 h-4 ${act.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    {act.text}{" "}
                    <span className="font-semibold">{act.value}</span>
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
