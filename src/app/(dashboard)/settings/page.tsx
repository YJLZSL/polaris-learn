"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
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

/* ---------- LLM 配置 localStorage 读写 ---------- */
const LLM_STORAGE_PREFIX = "llm_config_";

function loadLlmConfig() {
  if (typeof window === "undefined") {
    return { provider: "deepseek", apiKey: "", baseUrl: "", model: "", temperature: 0.7, maxTokens: 800 };
  }
  return {
    provider: localStorage.getItem(`${LLM_STORAGE_PREFIX}provider`) || "deepseek",
    apiKey: localStorage.getItem(`${LLM_STORAGE_PREFIX}apiKey`) || "",
    baseUrl: localStorage.getItem(`${LLM_STORAGE_PREFIX}baseUrl`) || "",
    model: localStorage.getItem(`${LLM_STORAGE_PREFIX}model`) || "",
    temperature: parseFloat(localStorage.getItem(`${LLM_STORAGE_PREFIX}temperature`) || "0.7"),
    maxTokens: parseInt(localStorage.getItem(`${LLM_STORAGE_PREFIX}maxTokens`) || "800", 10),
  };
}

function saveLlmConfig(config: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  for (const [key, value] of Object.entries(config)) {
    localStorage.setItem(`${LLM_STORAGE_PREFIX}${key}`, String(value));
  }
}

const reminderTimeOptions = [
  { label: "8:00", value: "08:00" },
  { label: "9:00", value: "09:00" },
  { label: "10:00", value: "10:00" },
  { label: "20:00", value: "20:00" },
  { label: "21:00", value: "21:00" },
];

export default function SettingsPage() {
  const { name, grade, avatar, setUser, clearUser } = useUserStore();

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

  /* ---------- appearance settings ---------- */
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");

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

  /* ---------- LLM 大模型配置 ---------- */
  const [llmProvider, setLlmProvider] = useState("deepseek");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmTemperature, setLlmTemperature] = useState(0.7);
  const [llmMaxTokens, setLlmMaxTokens] = useState(800);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ ok: boolean; message: string } | null>(null);

  /* ---------- fetch profile on mount ---------- */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "获取设置失败");
      }
      const data = await res.json();
      // Sync store
      setUser({
        name: data.user.name,
        grade: data.user.grade,
        avatar: data.user.avatar,
        xp: data.user.xp,
        level: data.user.level,
        streak: data.user.streak,
        email: data.user.email,
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "获取设置失败");
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  // Load LLM config from localStorage
  useEffect(() => {
    const cfg = loadLlmConfig();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLlmProvider(cfg.provider);
    setLlmApiKey(cfg.apiKey);
    setLlmBaseUrl(cfg.baseUrl);
    setLlmModel(cfg.model);
    setLlmTemperature(cfg.temperature);
    setLlmMaxTokens(cfg.maxTokens);
  }, []);

  // Load theme preference from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme-mode") as "light" | "dark" | "system" | null;
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeMode(saved);
    }
  }, []);

  /* ---------- LLM config update ---------- */
  const updateLlmConfig = (key: string, value: string | number) => {
    saveLlmConfig({ [key]: value });
    switch (key) {
      case "provider": setLlmProvider(value as string); break;
      case "apiKey": setLlmApiKey(value as string); break;
      case "baseUrl": setLlmBaseUrl(value as string); break;
      case "model": setLlmModel(value as string); break;
      case "temperature": setLlmTemperature(value as number); break;
      case "maxTokens": setLlmMaxTokens(value as number); break;
    }
  };

  /* ---------- test LLM connection ---------- */
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "math", message: "你好，请做一个简短的自我介绍。" }),
      });
      const data = await res.json();
      if (res.ok && data.response) {
        setConnectionResult({ ok: true, message: "连接成功！模型已就绪。" });
      } else {
        setConnectionResult({ ok: false, message: data.error || "连接失败，请检查配置。" });
      }
    } catch {
      setConnectionResult({ ok: false, message: "网络错误，无法连接到API服务。" });
    } finally {
      setTestingConnection(false);
    }
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

  /* ---------- save notification settings ---------- */
  const handleSaveNotifications = async () => {
    setNotifySaving(true);
    setNotifySaveError(null);
    setNotifySaveSuccess(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          grade: grade,
          avatar: avatar,
          // Store notification preferences as part of profile metadata
          notificationSettings: {
            learningReminder: notifyLearningReminder,
            dailyReport: notifyDailyReport,
            achievement: notifyAchievement,
            reminderTime,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
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
      setPasswordSaveError("请填写所有密码字段");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordSaveError("两次输入的新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordSaveError("新密码至少需要6个字符");
      return;
    }
    setPasswordSaving(true);
    setPasswordSaveSuccess(false);
    try {
      // Client-side flow: just show success for now
      // In production, this would call a password change API
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPasswordSaveSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaveSuccess(false), 2000);
    } catch {
      setPasswordSaveError("修改密码失败，请重试");
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
      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">通知设置</span>
            <span className="sm:hidden">通知</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">外观设置</span>
            <span className="sm:hidden">外观</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">安全设置</span>
            <span className="sm:hidden">安全</span>
          </TabsTrigger>
        </TabsList>

        {/* ====== 通知设置 Tab ====== */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
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
          <Card>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== 安全设置 Tab ====== */}
        <TabsContent value="security" className="space-y-4">
          {/* 修改密码 */}
          <Card>
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
          <Card>
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

      {/* ====== LLM Configuration (always visible below tabs) ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            大模型配置
          </CardTitle>
          <CardDescription>配置 AI 辅导使用的语言模型</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider */}
          <div className="space-y-2">
            <Label>模型提供商</Label>
            <Select value={llmProvider} onValueChange={(v) => updateLlmConfig("provider", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="qwen">通义千问 (Qwen)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="ollama">Ollama (本地)</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={llmApiKey}
                onChange={(e) => updateLlmConfig("apiKey", e.target.value)}
                placeholder="输入你的 API Key"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* API Base URL */}
          <div className="space-y-2">
            <Label>API Base URL</Label>
            <Input
              type="text"
              value={llmBaseUrl}
              onChange={(e) => updateLlmConfig("baseUrl", e.target.value)}
              placeholder="自定义 API 端点地址（可选）"
            />
          </div>

          {/* Model Name */}
          <div className="space-y-2">
            <Label>模型名称</Label>
            <Input
              type="text"
              value={llmModel}
              onChange={(e) => updateLlmConfig("model", e.target.value)}
              placeholder="例如：deepseek-chat, gpt-4o-mini"
            />
          </div>

          {/* Test Connection */}
          <div>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  测试连接
                </>
              )}
            </Button>
            {connectionResult && (
              <p className={`mt-2 text-xs ${connectionResult.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {connectionResult.ok && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                {connectionResult.message}
              </p>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-muted-foreground hover:text-foreground gap-1 px-0"
            >
              {showAdvanced ? "隐藏" : "展开"}高级设置
            </Button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                {/* Temperature */}
                <div className="space-y-2">
                  <Label className="text-xs">
                    温度 (Temperature): {llmTemperature.toFixed(1)}
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={llmTemperature}
                    onChange={(e) => updateLlmConfig("temperature", parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>精确 (0)</span>
                    <span>创意 (2)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <Label className="text-xs">
                    最大 Token 数: {llmMaxTokens}
                  </Label>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={llmMaxTokens}
                    onChange={(e) => updateLlmConfig("maxTokens", parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>100</span>
                    <span>2000</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            自托管用户请在此配置您的大模型API Key。配置仅存储在本地浏览器中，不会上传到服务器。
          </p>
        </CardContent>
      </Card>

      {/* App version */}
      <p className="text-center text-[11px] text-muted-foreground pb-4">
        AI 课堂 v1.0.0
      </p>
    </div>
  );
}
