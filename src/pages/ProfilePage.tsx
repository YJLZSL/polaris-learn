import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LogOut,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { fadeUp, fadeIn, useSafeMotion } from "@/lib/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/useUserStore";
import { getCurrentUser } from "@/lib/services/auth-service";
import { updateUser as repoUpdateUser } from "@/lib/repositories/user.repository";
import { getErrorNotes } from "@/lib/repositories/error-notes.repository";
import { getHomeStats } from "@/lib/repositories/home-stats.repository";
import { getLearningModeConfig } from "@/lib/learning-modes";
import { signOut } from "@/components/providers/SessionProvider";

/* ---------- helpers ---------- */
function formatStudyTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 分钟";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} 分钟`;
  if (minutes <= 0) return `${hours} 小时`;
  return `${hours} 小时 ${minutes} 分钟`;
}

/* ---------- types ---------- */
interface ProfileData {
  id: string;
  name: string;
  email: string;
  learningMode: string;
  avatar: string | null;
  createdAt: string;
  totalStudyMinutes: number;
  errorNoteCount: number;
}

export default function ProfilePage() {
  const { name, learningMode, avatar, setUser, initFromAuth } = useUserStore();
  const navigate = useNavigate();
  const safeMotion = useSafeMotion();

  /* ---------- state ---------- */
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState(name || "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ---------- fetch profile ---------- */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await initFromAuth();
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("未登录");
      }

      const [errorNotes, stats] = await Promise.all([
        getErrorNotes(user.id),
        getHomeStats(user),
      ]);

      const data: ProfileData = {
        id: user.id,
        name: user.name,
        email: user.email,
        learningMode: user.learningMode,
        avatar: user.avatar ?? null,
        createdAt: user.createdAt,
        totalStudyMinutes: stats.totalStudyMinutes,
        errorNoteCount: errorNotes.length,
      };

      setProfileData(data);
      if (user.name) setFormName(user.name);
      setUser({
        name: user.name,
        learningMode: user.learningMode,
        avatar: user.avatar ?? null,
        email: user.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取资料失败");
    } finally {
      setLoading(false);
    }
  }, [setUser, initFromAuth]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ---------- computed ---------- */
  const currentName = profileData?.name ?? name ?? "同学";
  const currentAvatar = profileData?.avatar ?? avatar;
  const currentLearningMode = profileData?.learningMode ?? learningMode;
  const modeLabel = getLearningModeConfig(currentLearningMode).label;
  const createdAt = profileData?.createdAt;
  const totalStudyMinutes = profileData?.totalStudyMinutes ?? 0;
  const errorNoteCount = profileData?.errorNoteCount ?? 0;

  /* ---------- save handler ---------- */
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("未登录");
      }
      user.name = formName;
      await repoUpdateUser(user);
      setUser({ name: formName });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      fetchProfile();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- logout handler ---------- */
  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  /* ---------- loading skeleton ---------- */
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  /* ---------- error state ---------- */
  if (error && !profileData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-8">
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
    <motion.div
      {...safeMotion({ initial: "hidden", animate: "show", variants: fadeUp })}
      className="max-w-2xl mx-auto px-4 py-6 lg:py-8 space-y-6"
    >
      {/* ====== Profile Header ====== */}
      <Card>
        <CardContent className="p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Avatar className="w-20 h-20 lg:w-24 lg:h-24 border border-border shrink-0">
              <AvatarFallback className="bg-[#6366F1]/10 text-[#6366F1] font-bold text-2xl lg:text-3xl">
                {currentAvatar || currentName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{currentName}</h1>
              {profileData?.email && (
                <p className="text-sm text-muted-foreground mt-1">{profileData.email}</p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#6366F1] bg-[#6366F1]/10 px-2.5 py-1 rounded-full">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {modeLabel}
                </span>
                {createdAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    加入于 {new Date(createdAt).toLocaleDateString("zh-CN")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== Stats ====== */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div {...safeMotion({ initial: "hidden", animate: "show", variants: fadeIn })}>
          <Card>
            <CardContent className="p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-xs">累计学习</span>
              </div>
              <span className="text-lg font-semibold tabular-nums">
                {formatStudyTime(totalStudyMinutes)}
              </span>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...safeMotion({ initial: "hidden", animate: "show", variants: fadeIn })}>
          <Card>
            <CardContent className="p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs">错题本</span>
              </div>
              <span className="text-lg font-semibold tabular-nums">{errorNoteCount} 题</span>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ====== Edit Name ====== */}
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
          <div className="space-y-2">
            <Label htmlFor="profile-name">显示名称</Label>
            <Input
              id="profile-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="输入你的显示名称"
              maxLength={20}
            />
          </div>
          <Separator />
          <motion.div whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
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
          </motion.div>
        </CardContent>
      </Card>

      {/* ====== Logout ====== */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">退出登录</p>
            <p className="text-xs text-muted-foreground mt-1">
              退出当前账号，需要重新登录后才能继续学习。
            </p>
          </div>
          <motion.div whileTap={{ scale: 0.97 }} className="shrink-0">
            <Button onClick={handleLogout} variant="outline" className="gap-1.5">
              <LogOut className="w-4 h-4" />
              退出登录
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
