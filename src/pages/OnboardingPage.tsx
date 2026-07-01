import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PolarisMascot from "@/components/common/PolarisMascot";
import { LEARNING_MODES, type LearningMode } from "@/lib/learning-modes";
import { SUBJECTS } from "@/lib/constants";
import {
  PROVIDER_DEFAULT_MODELS,
  type LLMProvider,
  saveAIServiceConfig,
  testConnection,
} from "@/lib/services/ai-service";
import { useUserStore } from "@/stores/useUserStore";
import { cn } from "@/lib/utils";

const ONBOARDING_PROGRESS_KEY = "polaris_onboarding_v1";
const ONBOARDING_COMPLETE_KEY = "polaris_onboarding_complete";
const LEARNING_MODE_KEY = "polaris_learning_mode";

const INTEREST_TAGS = [
  ...SUBJECTS.map((s) => ({ id: s.id, label: s.label })),
  { id: "programming", label: "编程" },
  { id: "painting", label: "绘画" },
  { id: "music", label: "音乐" },
  { id: "sports", label: "体育" },
  { id: "science", label: "科学" },
  { id: "history", label: "历史" },
  { id: "geography", label: "地理" },
];

const PROVIDER_OPTIONS: { id: LLMProvider; label: string }[] = [
  { id: "deepseek", label: "DeepSeek" },
  { id: "qwen", label: "通义千问" },
  { id: "openai", label: "OpenAI" },
  { id: "ollama", label: "Ollama (本地)" },
  { id: "custom", label: "自定义兼容 OpenAI" },
];

interface OnboardingData {
  step: number;
  learningMode: LearningMode;
  interests: string[];
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function getDefaultData(): OnboardingData {
  return {
    step: 1,
    learningMode: "YOUTH",
    interests: [],
    provider: "deepseek",
    apiKey: "",
    baseUrl: "",
    model: PROVIDER_DEFAULT_MODELS.deepseek,
  };
}

const STEP_TITLES = ["", "选择学段", "选择兴趣", "配置 AI 老师"];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const setUser = useUserStore((s) => s.setUser);
  const [data, setData] = useState<OnboardingData>(getDefaultData);
  const [testStatus, setTestStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >({ type: "idle" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true") {
      navigate("/home", { replace: true });
      return;
    }
    const saved = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<OnboardingData>;
        setData((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore malformed progress
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      model: PROVIDER_DEFAULT_MODELS[prev.provider],
    }));
  }, [data.provider]);

  const progress = useMemo(() => Math.round((data.step / 3) * 100), [data.step]);

  const toggleInterest = (id: string) => {
    setData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
  };

  const goNext = () => {
    if (data.step >= 3) {
      finish();
    } else {
      setData((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const skipStep = () => {
    if (data.step >= 3) {
      finish();
    } else {
      setData((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const finish = async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
      localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
      localStorage.setItem(LEARNING_MODE_KEY, data.learningMode);
    }
    setUser({ learningMode: data.learningMode });
    try {
      await saveAIServiceConfig({
        provider: data.provider,
        apiKey: data.apiKey,
        baseUrl: data.baseUrl,
        model: data.model,
        temperature: 0.3,
        maxTokens: 800,
        topP: 0.85,
      });
    } catch (e) {
      console.error("[Onboarding] Failed to save AI config:", e);
    }
    navigate("/home", { replace: true });
  };

  const handleTestConnection = async () => {
    setTestStatus({ type: "loading" });
    const result = await testConnection({
      provider: data.provider,
      apiKey: data.apiKey,
      baseUrl: data.baseUrl,
      model: data.model,
      temperature: 0.3,
      maxTokens: 5,
      topP: 0.85,
    });
    setTestStatus({
      type: result.success ? "success" : "error",
      message: result.message,
    });
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      data-mode={data.learningMode}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0B0F19] via-[#11131C] to-indigo-950/40" />
      <div className="pointer-events-none absolute inset-0 starry-bg" />
      <div className="pointer-events-none absolute inset-0 aurora-bg" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <PolarisMascot mood="default" size={72} />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
              欢迎来到 Polaris
            </h1>
            <p className="text-sm text-slate-400">三步完成个性化设置</p>
          </div>
        </div>

        <Card className="border-white/10 bg-[#11131C]/90 backdrop-blur-md shadow-polaris-elevated">
          <CardHeader className="pb-4">
            <div className="mb-3 flex items-center justify-between">
              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-300">
                步骤 {data.step} / 3
              </Badge>
              <span className="text-xs text-muted-foreground">{STEP_TITLES[data.step]}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <CardTitle className="pt-4 text-xl text-white">{STEP_TITLES[data.step]}</CardTitle>
            <CardDescription>
              {data.step === 1 && "选择你当前的学习阶段，Polaris 会据此调整界面与教学内容。"}
              {data.step === 2 && "选择感兴趣的学科或方向，帮助我们推荐适合你的内容。"}
              {data.step === 3 && "配置你的 AI 老师，所有密钥都会安全存储在本地。"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {data.step === 1 && (
              <div className="grid gap-3">
                {LEARNING_MODES.map((mode) => {
                  const selected = data.learningMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setData((prev) => ({ ...prev, learningMode: mode.id }))}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border p-4 text-left transition",
                        selected
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/10 bg-card hover:bg-white/5"
                      )}
                    >
                      {/* V2：学段统一视觉，不再使用差异化 icon/color */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                        <BookOpen className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{mode.label}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {data.step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">点击标签即可选中或取消</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_TAGS.map((tag) => {
                    const selected = data.interests.includes(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        variant={selected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer select-none px-3 py-1.5 text-sm transition",
                          selected
                            ? "bg-indigo-600 hover:bg-indigo-500"
                            : "border-white/10 text-slate-300 hover:border-indigo-500/50 hover:text-white"
                        )}
                        onClick={() => toggleInterest(tag.id)}
                      >
                        {tag.label}
                      </Badge>
                    );
                  })}
                </div>
                {data.interests.length > 0 && (
                  <p className="text-xs text-indigo-300">
                    已选择 {data.interests.length} 个兴趣标签
                  </p>
                )}
              </div>
            )}

            {data.step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">模型提供商</Label>
                  <Select
                    value={data.provider}
                    onValueChange={(value) =>
                      setData((prev) => ({ ...prev, provider: value as LLMProvider }))
                    }
                  >
                    <SelectTrigger id="provider" className="bg-transparent">
                      <SelectValue placeholder="选择提供商" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_OPTIONS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">模型名称</Label>
                  <Input
                    id="model"
                    value={data.model}
                    onChange={(e) => setData((prev) => ({ ...prev, model: e.target.value }))}
                    placeholder={PROVIDER_DEFAULT_MODELS[data.provider]}
                    className="bg-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseUrl">
                    自定义 Base URL（可选）
                  </Label>
                  <Input
                    id="baseUrl"
                    value={data.baseUrl}
                    onChange={(e) => setData((prev) => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="留空使用默认端点"
                    className="bg-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={data.apiKey}
                    onChange={(e) => setData((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={data.provider === "ollama" ? "本地模型无需填写" : "sk-..."}
                    className="bg-transparent"
                  />
                  <p className="text-xs text-muted-foreground">
                    密钥会写入平台安全存储，不会明文保存。
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/10"
                  onClick={handleTestConnection}
                  disabled={testStatus.type === "loading"}
                >
                  {testStatus.type === "loading" ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      测试中…
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      测试连接
                    </>
                  )}
                </Button>

                {testStatus.type === "success" && (
                  <p className="text-sm text-emerald-400">{testStatus.message}</p>
                )}
                {testStatus.type === "error" && (
                  <p className="text-sm text-rose-400">{testStatus.message}</p>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between gap-3 pt-2">
            {data.step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setData((prev) => ({ ...prev, step: prev.step - 1 }))}
              >
                上一步
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={skipStep} className="border-white/10">
                {data.step >= 3 ? "跳过配置" : "跳过"}
              </Button>
              <Button onClick={goNext} className="btn-polaris btn-polaris-rest btn-polaris-hover btn-polaris-active">
                {data.step >= 3 ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    开始探索
                  </>
                ) : (
                  "下一步"
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export { ONBOARDING_COMPLETE_KEY, LEARNING_MODE_KEY };
