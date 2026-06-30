/**
 * Task 9.1 / 9.3: 模型配置向导（L1）
 *
 * 3 步流程：
 *  - Step 0: 选 provider（卡片式：DeepSeek / 通义千问 / OpenAI / Ollama / 自定义）
 *  - Step 1: 输入 API Key（Ollama 跳过此步；自定义额外可填 baseUrl）
 *  - Step 2: 测试连接 + 完成
 *
 * 完成后调用 saveAIServiceConfig 持久化（apiKey 加密存储），并通过 onComplete 回调上抛配置。
 */
import { useState, useEffect, useCallback, type ComponentType } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Cloud,
  Globe,
  Server,
  Settings,
  KeyRound,
} from "lucide-react";
import type { LLMProvider, AIServiceConfig } from "@/lib/services/ai-service";
import {
  testConnection,
  saveAIServiceConfig,
  loadAIServiceConfig,
  PROVIDER_DEFAULT_MODELS,
} from "@/lib/services/ai-service";

interface ProviderMeta {
  id: LLMProvider;
  name: string;
  desc: string;
  needsKey: boolean;
  badge?: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
}

const PROVIDERS: ProviderMeta[] = [
  { id: "deepseek", name: "DeepSeek", desc: "性价比高，中文优秀", needsKey: true, badge: "推荐", icon: Sparkles, color: "from-blue-500 to-indigo-600" },
  { id: "qwen", name: "通义千问", desc: "阿里云，国内稳定", needsKey: true, icon: Cloud, color: "from-orange-500 to-amber-600" },
  { id: "openai", name: "OpenAI", desc: "GPT-4o，英文最强", needsKey: true, icon: Globe, color: "from-emerald-500 to-teal-600" },
  { id: "ollama", name: "Ollama", desc: "本地运行，无需联网", needsKey: false, badge: "本地", icon: Server, color: "from-slate-500 to-slate-700" },
  { id: "custom", name: "自定义", desc: "OpenAI 兼容 API", needsKey: true, icon: Settings, color: "from-purple-500 to-fuchsia-600" },
];

const STEP_LABELS = ["选择模型", "输入密钥", "测试连接"];

interface ModelConfigWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (config: AIServiceConfig) => void;
}

export default function ModelConfigWizard({ open, onClose, onComplete }: ModelConfigWizardProps) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<LLMProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const reset = () => {
    setStep(0);
    setProvider(null);
    setApiKey("");
    setBaseUrl("");
    setShowKey(false);
    setTesting(false);
    setTestResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectProvider = (p: LLMProvider) => {
    setProvider(p);
    setTestResult(null);
    setStep(p === "ollama" ? 2 : 1);
  };

  const buildConfig = (): AIServiceConfig => ({
    provider: provider as LLMProvider,
    apiKey: provider === "ollama" ? "" : apiKey,
    baseUrl,
    model: PROVIDER_DEFAULT_MODELS[provider as LLMProvider],
    temperature: 0.3,
    maxTokens: 800,
    topP: 0.85,
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(buildConfig());
    setTestResult({ success: result.success, message: result.message });
    setTesting(false);
  };

  const handleComplete = () => {
    const config = buildConfig();
    saveAIServiceConfig(config);
    onComplete(config);
    reset();
  };

  const selectedMeta = PROVIDERS.find((p) => p.id === provider);
  const canNextFromKeyStep =
    provider === "ollama" ||
    provider === "custom" ||
    (provider !== null && apiKey.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            配置 AI 模型
          </DialogTitle>
          <DialogDescription>
            三步完成模型配置，让 Polaris 老师真正“开口说话”。
          </DialogDescription>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium transition-colors ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0: Provider 选择 */}
        {step === 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">选择模型提供商</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROVIDERS.map((p) => {
                const Icon = p.icon;
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProvider(p.id)}
                    className={`group relative text-left rounded-lg border p-3 transition-all hover:shadow-sm ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${p.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold">{p.name}</span>
                          {p.badge && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                              {p.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{p.desc}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {p.needsKey ? "需要 API Key" : "无需 API Key"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              配置仅存储在本地浏览器（加密），不会上传服务器。
            </p>
          </div>
        )}

        {/* Step 1: API Key 输入 */}
        {step === 1 && selectedMeta && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50">
              <selectedMeta.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{selectedMeta.name}</span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {PROVIDER_DEFAULT_MODELS[provider as LLMProvider]}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wizard-api-key" className="text-xs flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                API Key
              </Label>
              <div className="relative">
                <Input
                  id="wizard-api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                  placeholder="输入你的 API Key"
                  className="pr-10"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {provider === "deepseek" && "前往 platform.deepseek.com 获取"}
                {provider === "qwen" && "前往 dashscope.aliyun.com 获取"}
                {provider === "openai" && "前往 platform.openai.com 获取"}
                {provider === "custom" && "填写 OpenAI 兼容服务的 API Key"}
              </p>
            </div>

            {provider === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="wizard-base-url" className="text-xs">API Base URL（可选）</Label>
                <Input
                  id="wizard-base-url"
                  type="text"
                  value={baseUrl}
                  onChange={(e) => { setBaseUrl(e.target.value); setTestResult(null); }}
                  placeholder="https://your-api-host.com/v1"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                <ChevronLeft className="w-4 h-4" />
                上一步
              </Button>
              <Button size="sm" onClick={() => setStep(2)} disabled={!canNextFromKeyStep}>
                下一步
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 测试连接 + 完成 */}
        {step === 2 && selectedMeta && (
          <div className="space-y-3">
            <div className="rounded-md border p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">提供商</span>
                <span className="font-medium">{selectedMeta.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">模型</span>
                <span className="font-medium">{PROVIDER_DEFAULT_MODELS[provider as LLMProvider]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Key</span>
                <span className="font-medium">
                  {provider === "ollama" ? "无需" : apiKey ? `••••${apiKey.slice(-4)}` : "未填写"}
                </span>
              </div>
            </div>

            <Button onClick={handleTest} disabled={testing} className="w-full" variant="outline">
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在测试连接...
                </>
              ) : (
                <>
                  <ZapIcon />
                  测试连接
                </>
              )}
            </Button>

            {testResult && (
              <div
                className={`flex items-start gap-2 rounded-md p-2.5 text-xs ${
                  testResult.success
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStep(provider === "ollama" ? 0 : 1)}>
                <ChevronLeft className="w-4 h-4" />
                上一步
              </Button>
              <div className="flex items-center gap-2">
                {!testResult?.success && (
                  <Button variant="ghost" size="sm" onClick={handleComplete}>
                    跳过测试
                  </Button>
                )}
                <Button size="sm" onClick={handleComplete} disabled={testing}>
                  <Check className="w-4 h-4" />
                  完成
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ZapIcon() {
  return <Sparkles className="w-4 h-4" />;
}

/* ============================================================
 * Task 9.9: 首次使用自动弹出向导 hook
 *
 * 由于 AiTeacherPage.tsx 不能修改，本 hook 从 ModelConfigWizard 导出，
 * 供后续在 AiTeacherPage 或其它入口处集成（未来工作）。
 *
 * 用法：
 *   const { shouldShowWizard, markFirstRunDone } = useModelConfigFirstRunCheck();
 *   <ModelConfigWizard open={shouldShowWizard} onClose={markFirstRunDone} onComplete={...} />
 *
 * 触发条件：
 *   1. 当前激活配置缺少 API Key（且 provider 非 ollama）
 *   2. 本次会话尚未标记 first-run-done（避免重复弹出）
 * ============================================================ */

const FIRST_RUN_DONE_KEY = "polaris_model_wizard_first_run_done";

function hasUsableConfig(config: AIServiceConfig): boolean {
  if (config.provider === "ollama") return true;
  return !!config.apiKey && config.apiKey.trim().length > 0;
}

export interface UseModelConfigFirstRunCheckResult {
  /** 是否应该弹出向导 */
  shouldShowWizard: boolean;
  /** 标记首次使用已完成（关闭向导或用户主动跳过） */
  markFirstRunDone: () => void;
}

export function useModelConfigFirstRunCheck(): UseModelConfigFirstRunCheckResult {
  const [shouldShowWizard, setShouldShowWizard] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const config = loadAIServiceConfig();
    const alreadyDone = localStorage.getItem(FIRST_RUN_DONE_KEY) === "true";
    if (!hasUsableConfig(config) && !alreadyDone) {
      setShouldShowWizard(true);
    }
  }, []);

  const markFirstRunDone = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(FIRST_RUN_DONE_KEY, "true");
    }
    setShouldShowWizard(false);
  }, []);

  return { shouldShowWizard, markFirstRunDone };
}
