import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Palette,
  Shield,
  Clock,
  LogOut,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Sun,
  Moon,
  Smartphone,
  Globe,
  GraduationCap,
  Sparkles,
  Cpu,
  Volume2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/stores/useUserStore";
import { LEARNING_MODES, type LearningModeId } from "@/lib/learning-modes";
import { changePassword, getCurrentUser } from "@/lib/services/auth-service";
import { updateUser as repoUpdateUser } from "@/lib/repositories/user.repository";
import { loadAIServiceConfig, type AIServiceConfig } from "@/lib/services/ai-service";
import {
  loadVoiceSettings,
  saveVoiceSettings,
  testVoice,
  isWebSpeechAvailable,
  isCapacitorEnvironment,
  type VoiceSettings,
  type TtsEngine,
} from "@/lib/services/voice-service";
import ModelConfigWizard from "@/components/common/ModelConfigWizard";
import ModelConfigAdvanced from "@/components/common/ModelConfigAdvanced";

const LEADERBOARD_VISIBLE_KEY = "polaris_leaderboard_visible";
function loadLeaderboardVisible(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(LEADERBOARD_VISIBLE_KEY) !== "false";
}
function saveLeaderboardVisible(visible: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEADERBOARD_VISIBLE_KEY, String(visible));
}

const reminderTimeOptions = [
  { label: "8:00", value: "08:00" },
  { label: "9:00", value: "09:00" },
  { label: "10:00", value: "10:00" },
  { label: "20:00", value: "20:00" },
  { label: "21:00", value: "21:00" },
];

export default function SettingsPage() {
  const { name, grade, avatar, learningMode, setUser, clearUser, initFromAuth } = useUserStore();

  /* ---------- loading state ---------- */
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  /* ---------- notification settings ---------- */
  const [notifyLearningReminder, setNotifyLearningReminder] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(false);
  const [notifyAchievement, setNotifyAchievement] = useState(true);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [notifySaving, setNotifySaving] = useState(false);
  const [notifySaveSuccess, setNotifySaveSuccess] = useState(false);
  const [notifySaveError, setNotifySaveError] = useState<string | null>(null);

  /* ---------- learning mode settings ---------- */
  const [modeSaving, setModeSaving] = useState(false);
  const [modeSaveSuccess, setModeSaveSuccess] = useState(false);
  const [modeSaveError, setModeSaveError] = useState<string | null>(null);

  /* ---------- Task 3.7: active tab for shared element animation ---------- */
  const [activeTab, setActiveTab] = useState("learning-mode");

  /* ---------- appearance settings ---------- */
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);

  /* ---------- security settings ---------- */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaveSuccess, setPasswordSaveSuccess] = useState(false);
  const [passwordSaveError, setPasswordSaveError] = useState<string | null>(null);

  /* ---------- LLM 大模型配置（Task 9.8 集成） ---------- */
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeConfig, setActiveConfig] = useState<AIServiceConfig>(() => loadAIServiceConfig());
  const [advancedKey, setAdvancedKey] = useState(0);

  /* ---------- Task 8.8: 语音设置 ---------- */
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => loadVoiceSettings());
  const [voiceTesting, setVoiceTesting] = useState(false);

  const handleVoiceChange = useCallback((patch: Partial<VoiceSettings>) => {
    const next = saveVoiceSettings(patch);
    setVoiceSettings(next);
  }, []);

  const handleTestVoice = useCallback(async () => {
    setVoiceTesting(true);
    try {
      await testVoice(voiceSettings);
    } catch {
      toast.error("语音测试失败");
    } finally {
      setVoiceTesting(false);
    }
  }, [voiceSettings]);

  /* ---------- fetch profile on mount ---------- */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      await initFromAuth();
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("未登录");
      }
      setUser({
        name: user.name,
        grade: user.grade,
        avatar: user.avatar ?? null,
        learningMode: user.learningMode,
        email: user.email,
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "获取设置失败");
    } finally {
      setLoading(false);
    }
  }, [setUser, initFromAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  // Load theme preference from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme-mode") as "light" | "dark" | "system" | null;
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeMode(saved);
    }
    setLeaderboardVisible(loadLeaderboardVisible());
  }, []);

  /* ---------- Task 9.8: 配置向导完成回调 ---------- */
  const handleWizardComplete = (cfg: AIServiceConfig) => {
    setActiveConfig(cfg);
    setWizardOpen(false);
    // 强制刷新高级设置区，让其重新从 localStorage 读取最新配置
    setAdvancedKey((k) => k + 1);
    toast.success("模型配置已保存");
  };

  /* ---------- Task 9.8: 高级设置变更回调 ---------- */
  const handleAdvancedChange = (cfg: AIServiceConfig) => {
    setActiveConfig(cfg);
  };

  /* ---------- theme toggle ---------- */
  const applyTheme = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    localStorage.setItem("theme-mode", mode);
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "light") {
      root.classList.remove("dark");
    } else {
      // system
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  /* ---------- switch learning mode ---------- */
  const handleSelectMode = async (modeId: LearningModeId) => {
    // 乐观更新：如果与当前一致则无需请求
    if (modeId === learningMode) return;
    setModeSaving(true);
    setModeSaveError(null);
    setModeSaveSuccess(false);
    // 立即更新本地 store，让 UI 即时反馈
    setUser({ learningMode: modeId });
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("未登录");
      }
      user.learningMode = modeId;
      await repoUpdateUser(user);
      setModeSaveSuccess(true);
      setTimeout(() => setModeSaveSuccess(false), 2000);
    } catch (err) {
      // 回滚到上一次的 mode
      setUser({ learningMode });
      setModeSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setModeSaving(false);
    }
  };

  /* ---------- save notification settings ---------- */
  const handleSaveNotifications = async () => {
    setNotifySaving(true);
    setNotifySaveError(null);
    setNotifySaveSuccess(false);
    try {
      // 通知设置仅持久化到 localStorage（无后端存储）
      localStorage.setItem("polaris_notification_settings", JSON.stringify({
        learningReminder: notifyLearningReminder,
        dailyReport: notifyDailyReport,
        achievement: notifyAchievement,
        reminderTime,
      }));
      // 同步用户基本信息到 repository（确保 name/grade/avatar 不丢失）
      const user = await getCurrentUser();
      if (user) {
        if (name !== undefined) user.name = name ?? user.name;
        if (grade !== undefined) user.grade = grade ?? user.grade;
        if (avatar !== undefined) user.avatar = avatar ?? user.avatar;
        await repoUpdateUser(user);
      }
      setNotifySaveSuccess(true);
      setTimeout(() => setNotifySaveSuccess(false), 2000);
    } catch (err) {
      setNotifySaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setNotifySaving(false);
    }
  };

  /* ---------- change password ---------- */
  const handleChangePassword = async () => {
    setPasswordSaveError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      const msg = "请填写所有密码字段";
      setPasswordSaveError(msg);
      toast.error(msg);
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = "两次输入的新密码不一致";
      setPasswordSaveError(msg);
      toast.error(msg);
      return;
    }
    if (newPassword.length < 6) {
      const msg = "新密码至少需要6个字符";
      setPasswordSaveError(msg);
      toast.error(msg);
      return;
    }
    setPasswordSaving(true);
    setPasswordSaveSuccess(false);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSaveSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("密码修改成功");
      setTimeout(() => setPasswordSaveSuccess(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "修改密码失败，请重试";
      setPasswordSaveError(msg);
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  /* ---------- logout ---------- */
  const handleLogout = () => {
    if (confirm("确定要退出登录吗？")) {
      clearUser();
    }
  };

  /* ---------- loading skeleton ---------- */
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-9 w-80 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  /* ---------- error state ---------- */
  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
        <Button onClick={fetchProfile} variant="outline" className="mt-4">
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理你的账户和学习偏好
        </p>
      </div>

      {/* ====== Tabs Layout ====== */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="learning-mode" className="gap-1.5 relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === "learning-mode" && (
              <motion.span layoutId="active-tab" className="absolute inset-0 rounded-md bg-background shadow" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <GraduationCap className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline relative z-10">学习模式</span>
            <span className="sm:hidden relative z-10">模式</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === "notifications" && (
              <motion.span layoutId="active-tab" className="absolute inset-0 rounded-md bg-background shadow" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <Bell className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline relative z-10">通知设置</span>
            <span className="sm:hidden relative z-10">通知</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === "appearance" && (
              <motion.span layoutId="active-tab" className="absolute inset-0 rounded-md bg-background shadow" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <Palette className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline relative z-10">外观设置</span>
            <span className="sm:hidden relative z-10">外观</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === "security" && (
              <motion.span layoutId="active-tab" className="absolute inset-0 rounded-md bg-background shadow" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <Shield className="w-4 h-4 relative z-10" />
            <span className="hidden sm:inline relative z-10">安全设置</span>
            <span className="sm:hidden relative z-10">安全</span>
          </TabsTrigger>
        </TabsList>

        {/* ====== 学习模式 Tab ====== */}
        <TabsContent value="learning-mode" className="space-y-4">
          <Card className="border border-white/5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                学习模式
              </CardTitle>
              <CardDescription>
                选择适合你的学习阶段，系统将根据模式调整内容难度、学科范围与界面风格
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {modeSaveError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{modeSaveError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {LEARNING_MODES.map((mode) => {
                  const isSelected = mode.id === learningMode;
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleSelectMode(mode.id)}
                      disabled={modeSaving}
                      className={`group relative text-left rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-sm shrink-0`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold">{mode.label}</p>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                            {mode.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 状态提示条 */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {modeSaving ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      正在保存...
                    </span>
                  ) : modeSaveSuccess ? (
                    <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      保存成功
                    </span>
                  ) : (
                    <>当前模式：{LEARNING_MODES.find((m) => m.id === learningMode)?.label ?? "小学"}</>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== 通知设置 Tab ====== */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="border border-white/5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                通知偏好
              </CardTitle>
              <CardDescription>选择你希望接收的通知类型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifySaveError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{notifySaveError}</AlertDescription>
                </Alert>
              )}

              {/* 学习提醒 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">学习提醒</Label>
                  <p className="text-xs text-muted-foreground">每天定时提醒你开始学习</p>
                </div>
                <Switch
                  checked={notifyLearningReminder}
                  onCheckedChange={setNotifyLearningReminder}
                />
              </div>

              <Separator />

              {/* 每日报告 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">每日报告</Label>
                  <p className="text-xs text-muted-foreground">每天总结你的学习数据</p>
                </div>
                <Switch
                  checked={notifyDailyReport}
                  onCheckedChange={setNotifyDailyReport}
                />
              </div>

              <Separator />

              {/* 成就通知 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">成就通知</Label>
                  <p className="text-xs text-muted-foreground">获得成就和升级时通知你</p>
                </div>
                <Switch
                  checked={notifyAchievement}
                  onCheckedChange={setNotifyAchievement}
                />
              </div>

              <Separator />

              {/* 提醒时间 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">提醒时间</Label>
                  <p className="text-xs text-muted-foreground">选择每日学习提醒的时间</p>
                </div>
                <Select value={reminderTime} onValueChange={setReminderTime}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderTimeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <Button onClick={handleSaveNotifications} disabled={notifySaving} className="w-full sm:w-auto">
                {notifySaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : notifySaveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    已保存
                  </>
                ) : (
                  "保存通知设置"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== 外观设置 Tab ====== */}
        <TabsContent value="appearance" className="space-y-4">
          <Card className="border border-white/5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                主题与外观
              </CardTitle>
              <CardDescription>自定义你的界面外观</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 主题模式 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">主题模式</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => applyTheme("light")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      themeMode === "light"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Sun className={`w-6 h-6 ${themeMode === "light" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${themeMode === "light" ? "text-primary" : "text-muted-foreground"}`}>
                      亮色
                    </span>
                  </button>
                  <button
                    onClick={() => applyTheme("dark")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      themeMode === "dark"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Moon className={`w-6 h-6 ${themeMode === "dark" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${themeMode === "dark" ? "text-primary" : "text-muted-foreground"}`}>
                      暗色
                    </span>
                  </button>
                  <button
                    onClick={() => applyTheme("system")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      themeMode === "system"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Monitor className={`w-6 h-6 ${themeMode === "system" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${themeMode === "system" ? "text-primary" : "text-muted-foreground"}`}>
                      跟随系统
                    </span>
                  </button>
                </div>
              </div>

              <Separator />

              {/* 语言 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    语言
                  </Label>
                  <p className="text-xs text-muted-foreground">选择界面显示语言</p>
                </div>
                <Select defaultValue="zh-CN">
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>显示排行榜</Label>
                  <p className="text-xs text-muted-foreground">上班族模式可隐藏排行榜以专注学习</p>
                </div>
                <Switch
                  checked={leaderboardVisible}
                  onCheckedChange={(v) => {
                    setLeaderboardVisible(v);
                    saveLeaderboardVisible(v);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== 安全设置 Tab ====== */}
        <TabsContent value="security" className="space-y-4">
          {/* 修改密码 */}
          <Card className="border border-white/5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                修改密码
              </CardTitle>
              <CardDescription>更新你的登录密码</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordSaveError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordSaveError}</AlertDescription>
                </Alert>
              )}

              {/* 当前密码 */}
              <div className="space-y-2">
                <Label htmlFor="current-password">当前密码</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="输入当前密码"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 新密码 */}
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="输入新密码（至少6位）"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 确认密码 */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认密码</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button onClick={handleChangePassword} disabled={passwordSaving} className="w-full sm:w-auto">
                {passwordSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    修改中...
                  </>
                ) : passwordSaveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    密码已修改
                  </>
                ) : (
                  "修改密码"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 登录设备 */}
          <Card className="border border-white/5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                登录设备
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">当前设备</p>
                    <p className="text-xs text-muted-foreground">
                      {typeof navigator !== "undefined" ? navigator.userAgent.split(" ").slice(-1)[0] : "浏览器"} · 刚刚活跃
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">当前</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 退出登录 */}
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">退出登录</p>
                  <p className="text-xs text-muted-foreground">退出当前账户</p>
                </div>
                <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  退出登录
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ====== LLM Configuration (Task 9.8: 集成 ModelConfigWizard + ModelConfigAdvanced) ====== */}
      <Card className="border border-white/5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            大模型配置
          </CardTitle>
          <CardDescription>
            配置 AI 辅导使用的语言模型。推荐使用三步向导快速上手，进阶参数可在下方高级设置中调整。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 当前配置摘要 + 触发向导按钮 */}
          <div className="rounded-lg border p-3 flex items-center justify-between gap-3 bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium">
                    {activeConfig.provider === "deepseek" && "DeepSeek"}
                    {activeConfig.provider === "qwen" && "通义千问"}
                    {activeConfig.provider === "openai" && "OpenAI"}
                    {activeConfig.provider === "ollama" && "Ollama (本地)"}
                    {activeConfig.provider === "custom" && "自定义"}
                  </p>
                  <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 font-mono">
                    {activeConfig.model || "未设置"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeConfig.provider === "ollama"
                    ? "本地运行，无需 API Key"
                    : activeConfig.apiKey
                    ? `API Key: ••••${activeConfig.apiKey.slice(-4)}`
                    : "未配置 API Key（当前为降级模式）"}
                </p>
              </div>
            </div>
            <Button onClick={() => setWizardOpen(true)} size="sm" className="shrink-0">
              <Sparkles className="w-4 h-4" />
              配置模型
            </Button>
          </div>

          {/* L2 高级设置折叠区（Task 9.2/9.4） */}
          <ModelConfigAdvanced
            key={advancedKey}
            onConfigChange={handleAdvancedChange}
          />

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            自托管用户请在此配置您的大模型 API Key。配置仅存储在本地浏览器中（API Key 已加密混淆），不会上传到服务器。
          </p>
        </CardContent>
      </Card>

      {/* Task 9.1: 模型配置向导 */}
      <ModelConfigWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
      />

      {/* ====== Task 8.8: 语音设置 ====== */}
      <Card className="border border-white/5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" />
            语音设置
          </CardTitle>
          <CardDescription>
            配置 AI 老师的语音朗读功能。本地语音（Web Speech API / Capacitor）免费，云端语音质量更高但需配置 API Key。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isWebSpeechAvailable() ? "default" : "secondary"} className="text-[10px]">
              Web Speech API {isWebSpeechAvailable() ? "可用" : "不可用"}
            </Badge>
            {isCapacitorEnvironment() && (
              <Badge variant="secondary" className="text-[10px]">
                Capacitor 原生环境
              </Badge>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">启用语音朗读</Label>
              <p className="text-xs text-muted-foreground">在 AI 老师消息气泡显示朗读按钮</p>
            </div>
            <Switch
              checked={voiceSettings.enabled}
              onCheckedChange={(v) => handleVoiceChange({ enabled: v })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">本地 TTS 引擎</Label>
              <p className="text-xs text-muted-foreground">选择语音合成引擎</p>
            </div>
            <Select
              value={voiceSettings.engine}
              onValueChange={(v) => handleVoiceChange({ engine: v as TtsEngine })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web">Web Speech API</SelectItem>
                <SelectItem value="capacitor">Capacitor TTS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">朗读语言</Label>
              <p className="text-xs text-muted-foreground">影响发音与测试文本</p>
            </div>
            <Select
              value={voiceSettings.lang}
              onValueChange={(v) => handleVoiceChange({ lang: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">语速</Label>
              <span className="text-xs text-muted-foreground font-mono">{voiceSettings.rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceSettings.rate}
              onChange={(e) => handleVoiceChange({ rate: parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">音调</Label>
              <span className="text-xs text-muted-foreground font-mono">{voiceSettings.pitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceSettings.pitch}
              onChange={(e) => handleVoiceChange({ pitch: parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">高质量云端 TTS</Label>
              <p className="text-xs text-muted-foreground">MiniMax 中文 / OpenAI 英文，按字符计费</p>
            </div>
            <Switch
              checked={voiceSettings.cloudEnabled}
              onCheckedChange={(v) => handleVoiceChange({ cloudEnabled: v })}
            />
          </div>

          {voiceSettings.cloudEnabled && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">云端引擎</Label>
                  <p className="text-xs text-muted-foreground">选择云端 TTS 服务商</p>
                </div>
                <Select
                  value={voiceSettings.cloudEngine}
                  onValueChange={(v) => handleVoiceChange({ cloudEngine: v as "minimax" | "openai" })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimax">MiniMax（中文）</SelectItem>
                    <SelectItem value="openai">OpenAI（英文）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cloud-tts-key">云端 API Key</Label>
                <Input
                  id="cloud-tts-key"
                  type="password"
                  value={voiceSettings.cloudApiKey}
                  onChange={(e) => handleVoiceChange({ cloudApiKey: e.target.value })}
                  placeholder="输入云端 TTS API Key"
                />
                <p className="text-[10px] text-muted-foreground">
                  {voiceSettings.cloudEngine === "minimax"
                    ? "MiniMax 计费：约 0.1 元/千字符"
                    : "OpenAI 计费：约 $0.015/千字符"}
                </p>
              </div>
            </>
          )}

          <Separator />

          <Button onClick={handleTestVoice} disabled={voiceTesting} variant="outline" className="w-full sm:w-auto">
            {voiceTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                正在朗读...
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                测试语音
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* App version */}
      <p className="text-center text-[11px] text-muted-foreground pb-4">
        AI 课堂 v1.0.0
      </p>
    </div>
  );
}
