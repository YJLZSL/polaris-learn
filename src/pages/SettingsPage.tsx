import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
import { useUserStore } from "@/stores/useUserStore";
import {
  LEARNING_MODES,
  getLearningModeConfig,
  type LearningMode,
} from "@/lib/learning-modes";
import { platform } from "@/lib/platform";
import {
  loadAIServiceConfig,
  saveAIServiceConfig,
  listProfiles,
  setActiveProfile,
  getActiveProfile,
  testConnection,
  PROVIDER_DEFAULT_MODELS,
  type LLMProvider,
  type AIServiceConfig,
  type LLMConfigProfile,
} from "@/lib/services/ai-service";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { fadeUp } from "@/lib/motion";

/* ============================================================
 * Task 12 (Polaris V2): SettingsPage 重写
 * - AI 模型配置：单一表单（provider + baseUrl + apiKey + model + temperature + 连接测试）
 * - 多配置切换：最近使用过的 3 个配置下拉
 * - 极简专注计时器：25/5 倒计时，静默（无 XP / 能量条 / 通知屏蔽）
 * - 学段选择：3 档（YOUTH / TEEN / ADULT）
 * ============================================================ */

const PROVIDER_OPTIONS: { value: LLMProvider; label: string; baseUrl: string }[] = [
  { value: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { value: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { value: "ollama", label: "Ollama（本地）", baseUrl: "http://localhost:11434/v1" },
  { value: "custom", label: "自定义", baseUrl: "" },
];

const THEME_KEY = "polaris_theme";
const FONT_SIZE_KEY = "polaris_font_size";

const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SettingsPage() {
  const { name, learningMode, setUser } = useUserStore();
  const safeMotion = useSafeMotion();

  /* ---------- 个人信息 ---------- */
  const [displayName, setDisplayName] = useState<string>(name ?? "");

  /* ---------- AI 模型配置 ---------- */
  const [provider, setProvider] = useState<LLMProvider>("deepseek");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.5);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [recentProfiles, setRecentProfiles] = useState<LLMConfigProfile[]>([]);

  /* ---------- 极简专注计时器 ---------- */
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState<number>(FOCUS_DURATION);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------- 外观设置 ---------- */
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  /* ---------- 加载模型配置 ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await loadAIServiceConfig();
        if (cancelled) return;
        setProvider(cfg.provider);
        setBaseUrl(cfg.baseUrl);
        setApiKey(cfg.apiKey);
        setModel(cfg.model);
        setTemperature(cfg.temperature ?? 0.5);
        const profiles = await listProfiles();
        if (cancelled) return;
        setRecentProfiles(profiles.slice(0, 3));
        const active = await getActiveProfile();
        if (!cancelled && active) setActiveProfileId(active.id);
      } catch (err) {
        console.error("[SettingsPage] load config failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- 加载外观偏好 ---------- */
  useEffect(() => {
    const storedTheme = (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark";
    const storedFont =
      (localStorage.getItem(FONT_SIZE_KEY) as "small" | "medium" | "large") || "medium";
    setTheme(storedTheme);
    setFontSize(storedFont);
  }, []);

  /* ---------- 应用主题 ---------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  /* ---------- 应用字号 ---------- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.fontSize = fontSize;
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  /* ---------- 专注计时器（setInterval + 卸载清理） ---------- */
  useEffect(() => {
    if (!timerRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setTimerRunning(false);
          toast.success(timerMode === "focus" ? "专注结束" : "休息结束");
          return timerMode === "focus" ? FOCUS_DURATION : BREAK_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerRunning, timerMode]);

  /* ---------- 处理函数 ---------- */
  const handleProviderChange = (next: LLMProvider) => {
    setProvider(next);
    const opt = PROVIDER_OPTIONS.find((o) => o.value === next);
    if (next !== "custom" && opt) {
      setBaseUrl(opt.baseUrl);
    }
    setModel(PROVIDER_DEFAULT_MODELS[next]);
  };

  const handleSwitchProfile = async (id: string) => {
    if (!id) return;
    const profile = recentProfiles.find((p) => p.id === id);
    if (!profile) return;
    setActiveProfileId(id);
    setActiveProfile(id);
    setProvider(profile.provider);
    setBaseUrl(profile.baseUrl);
    setApiKey(profile.apiKey);
    setModel(profile.model);
    setTemperature(profile.temperature ?? 0.5);
    toast.success("已切换到所选配置");
  };

  const buildConfig = (): AIServiceConfig => ({
    provider,
    apiKey,
    baseUrl,
    model: model || PROVIDER_DEFAULT_MODELS[provider],
    temperature,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveAIServiceConfig(buildConfig());
      setActiveProfileId(saved.id);
      // Task 12: API Key 同时写入 platform.secureStorage 的规范 key
      await platform.secureStorage.set("llm_config_apiKey", apiKey);
      const profiles = await listProfiles();
      setRecentProfiles(profiles.slice(0, 3));
      toast.success("配置已保存");
    } catch (err) {
      console.error("[SettingsPage] save failed:", err);
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (provider !== "ollama" && !apiKey.trim()) {
      toast.error("请先填写 API Key");
      return;
    }
    setTesting(true);
    try {
      const result = await testConnection(buildConfig());
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (_err) {
      toast.error("连接测试失败");
    } finally {
      setTesting(false);
    }
  };

  const handleLearningModeChange = (mode: LearningMode) => {
    setUser({ learningMode: mode });
    toast.success(`已切换为「${getLearningModeConfig(mode).label}」`);
  };

  const handleSaveDisplayName = () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("显示名称不能为空");
      return;
    }
    setUser({ name: trimmed });
    toast.success("显示名称已更新");
  };

  /* ---------- 计时器控制 ---------- */
  const startTimer = () => setTimerRunning(true);
  const pauseTimer = () => setTimerRunning(false);
  const resetTimer = () => {
    setTimerRunning(false);
    setSecondsLeft(timerMode === "focus" ? FOCUS_DURATION : BREAK_DURATION);
  };
  const switchTimerMode = (mode: "focus" | "break") => {
    setTimerMode(mode);
    setTimerRunning(false);
    setSecondsLeft(mode === "focus" ? FOCUS_DURATION : BREAK_DURATION);
  };

  /* ---------- 数据管理 ---------- */
  const handleClearCache = () => {
    try {
      const keep = new Set([THEME_KEY, FONT_SIZE_KEY]);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keep.has(key) && !key.startsWith("llm_config")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      toast.success("已清除本地缓存");
    } catch {
      toast.error("清除缓存失败");
    }
  };

  const handleExportData = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        user: { name, learningMode },
        settings: { theme, fontSize, timerMode },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `polaris-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("已导出学习数据");
    } catch {
      toast.error("导出失败");
    }
  };

  /* ---------- 渲染 ---------- */
  return (
    <motion.div
      {...safeMotion({ initial: "hidden", animate: "show", variants: fadeUp })}
      className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8"
    >
      {/* ===== 个人信息设置 ===== */}
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
          <CardDescription>学段与显示名称将影响 AI 辅导的语言风格。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="learning-mode">学段</Label>
            <Select
              value={(learningMode as string) || "TEEN"}
              onValueChange={(v) => handleLearningModeChange(v as LearningMode)}
            >
              <SelectTrigger id="learning-mode">
                <SelectValue placeholder="选择学段" />
              </SelectTrigger>
              <SelectContent>
                {LEARNING_MODES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label} — {m.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="display-name">显示名称</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的昵称"
                className="flex-1"
              />
              <Button onClick={handleSaveDisplayName} variant="outline">
                保存
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== AI 模型配置（单一表单） ===== */}
      <Card>
        <CardHeader>
          <CardTitle>AI 模型配置</CardTitle>
          <CardDescription>
            单一表单配置大模型，API Key 通过平台安全存储加密保存。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {recentProfiles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="recent-configs">最近使用过的配置</Label>
              <Select
                value={activeProfileId}
                onValueChange={(v) => handleSwitchProfile(v)}
              >
                <SelectTrigger id="recent-configs">
                  <SelectValue placeholder="切换到历史配置" />
                </SelectTrigger>
                <SelectContent>
                  {recentProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || p.model}（{p.provider}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => handleProviderChange(v as LLMProvider)}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="选择服务商" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                provider === "custom"
                  ? "https://your-endpoint/v1"
                  : PROVIDER_OPTIONS.find((o) => o.value === provider)?.baseUrl || ""
              }
              disabled={provider !== "custom"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === "ollama" ? "本地模型无需 API Key" : "sk-..."}
                className="flex-1"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApiKey((v) => !v)}
              >
                {showApiKey ? "隐藏" : "显示"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={PROVIDER_DEFAULT_MODELS[provider]}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="text-muted-foreground text-sm tabular-nums">
                {temperature.toFixed(2)}
              </span>
            </div>
            <input
              id="temperature"
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full cursor-pointer accent-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleTest} disabled={testing} variant="outline">
              {testing ? "测试中…" : "连接测试"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中…" : "保存配置"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== 极简专注计时器 ===== */}
      <Card>
        <CardHeader>
          <CardTitle>专注计时器</CardTitle>
          <CardDescription>极简番茄钟，到时静默提醒，无任何游戏化干扰。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            <Button
              variant={timerMode === "focus" ? "default" : "outline"}
              onClick={() => switchTimerMode("focus")}
              className="flex-1"
            >
              25 分钟专注
            </Button>
            <Button
              variant={timerMode === "break" ? "default" : "outline"}
              onClick={() => switchTimerMode("break")}
              className="flex-1"
            >
              5 分钟休息
            </Button>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-sm">
              {timerMode === "focus" ? "专注中" : "休息中"}
            </div>
            <div className="mx-auto my-2 text-6xl font-bold tabular-nums">
              {formatTime(secondsLeft)}
            </div>
          </div>
          <div className="flex justify-center gap-2">
            {!timerRunning ? (
              <Button onClick={startTimer}>开始</Button>
            ) : (
              <Button onClick={pauseTimer} variant="outline">
                暂停
              </Button>
            )}
            <Button onClick={resetTimer} variant="ghost">
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== 外观设置 ===== */}
      <Card>
        <CardHeader>
          <CardTitle>外观</CardTitle>
          <CardDescription>主题与字号偏好保存在本地。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme-switch">暗色主题</Label>
              <p className="text-muted-foreground text-sm">
                关闭后切换为亮色主题（默认暗色）。
              </p>
            </div>
            <Switch
              id="theme-switch"
              checked={theme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="font-size">字体大小</Label>
            <Select
              value={fontSize}
              onValueChange={(v) => setFontSize(v as "small" | "medium" | "large")}
            >
              <SelectTrigger id="font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">小</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="large">大</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ===== 数据管理 ===== */}
      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
          <CardDescription>清除缓存或导出你的学习数据。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleClearCache} variant="outline">
            清除缓存
          </Button>
          <Button onClick={handleExportData} variant="outline">
            导出学习数据
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
