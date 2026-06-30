/**
 * Task 9.2 / 9.4: 模型配置高级设置（L2）
 *
 * 折叠区组件，展示并编辑当前激活配置的进阶参数：
 *  - baseUrl 输入框
 *  - model 输入框（Ollama 时为下拉选择已装模型，自动探测）
 *  - temperature 三档预设（保守 0.2 / 均衡 0.5 / 创意 0.8）+ 高级滑块
 *  - maxTokens 输入框
 *  - topP 滑块（默认隐藏，展开显示）
 *
 * 修改即生效：调用 saveAIServiceConfig 持久化（apiKey 加密存储）。
 */
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sliders,
} from "lucide-react";
import type { AIServiceConfig, LLMProvider } from "@/lib/services/ai-service";
import {
  loadAIServiceConfig,
  saveAIServiceConfig,
  fetchOllamaModels,
  PROVIDER_DEFAULT_MODELS,
} from "@/lib/services/ai-service";

const TEMP_PRESETS = [
  { label: "保守", value: 0.2, desc: "严谨稳定" },
  { label: "均衡", value: 0.5, desc: "通用推荐" },
  { label: "创意", value: 0.8, desc: "发散表达" },
];

interface ModelConfigAdvancedProps {
  /** 配置变更回调（可选） */
  onConfigChange?: (config: AIServiceConfig) => void;
  /** 外部强制展开（可选） */
  defaultOpen?: boolean;
}

export default function ModelConfigAdvanced({ onConfigChange, defaultOpen = false }: ModelConfigAdvancedProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [showTopP, setShowTopP] = useState(false);
  const [config, setConfig] = useState<AIServiceConfig>(() => loadAIServiceConfig());
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const update = useCallback(
    (patch: Partial<AIServiceConfig>) => {
      const next = { ...config, ...patch };
      setConfig(next);
      saveAIServiceConfig(next);
      onConfigChange?.(next);
    },
    [config, onConfigChange]
  );

  const refreshOllamaModels = useCallback(async (baseUrl?: string) => {
    setLoadingModels(true);
    const models = await fetchOllamaModels(baseUrl);
    setOllamaModels(models);
    setLoadingModels(false);
  }, []);

  // 挂载时加载当前配置；若为 ollama 则探测模型列表
  useEffect(() => {
    const cfg = loadAIServiceConfig();
    setConfig(cfg);
    if (cfg.provider === "ollama") {
      refreshOllamaModels(cfg.baseUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // provider 切换时若是 ollama，自动探测
  const handleProviderChange = (provider: LLMProvider) => {
    const nextModel = PROVIDER_DEFAULT_MODELS[provider];
    update({ provider, model: nextModel });
    if (provider === "ollama") {
      refreshOllamaModels(config.baseUrl);
    } else {
      setOllamaModels([]);
    }
  };

  const isOllama = config.provider === "ollama";

  return (
    <div className="border-t pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="text-xs text-muted-foreground hover:text-foreground gap-1 px-0"
      >
        <Sliders className="w-3.5 h-3.5" />
        {open ? "隐藏" : "展开"}高级设置
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </Button>

      {open && (
        <div className="mt-3 space-y-4">
          {/* Provider 切换（高级区可改） */}
          <div className="space-y-2">
            <Label className="text-xs">模型提供商</Label>
            <Select value={config.provider} onValueChange={(v) => handleProviderChange(v as LLMProvider)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="qwen">通义千问</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="ollama">Ollama (本地)</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label className="text-xs">API Base URL（可选）</Label>
            <Input
              type="text"
              value={config.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder="留空使用默认端点；自定义可填 https://host/v1"
              className="h-8 text-xs"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">模型名称</Label>
              {isOllama && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1"
                  onClick={() => refreshOllamaModels(config.baseUrl)}
                  disabled={loadingModels}
                >
                  {loadingModels ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  刷新模型
                </Button>
              )}
            </div>
            {isOllama && ollamaModels.length > 0 ? (
              <Select value={config.model} onValueChange={(v) => update({ model: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="选择已安装的模型" />
                </SelectTrigger>
                <SelectContent>
                  {ollamaModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                value={config.model}
                onChange={(e) => update({ model: e.target.value })}
                placeholder={`例如：${PROVIDER_DEFAULT_MODELS[config.provider]}`}
                className="h-8 text-xs"
              />
            )}
            {isOllama && ollamaModels.length === 0 && !loadingModels && (
              <p className="text-[11px] text-muted-foreground">
                未探测到本地模型，请确认 Ollama 已启动，或手动输入模型名。
              </p>
            )}
          </div>

          {/* Temperature 预设 + 滑块 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">温度 (Temperature)</Label>
              <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5">
                {(config.temperature ?? 0.3).toFixed(1)}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TEMP_PRESETS.map((preset) => {
                const active = Math.abs((config.temperature ?? 0.3) - preset.value) < 0.05;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => update({ temperature: preset.value })}
                    className={`rounded-md border px-2 py-1.5 text-center transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-xs font-medium">{preset.label}</div>
                    <div className="text-[10px] text-muted-foreground">{preset.desc}</div>
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature ?? 0.3}
              onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>精确 (0)</span>
              <span>创意 (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">最大 Token 数</Label>
              <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5">
                {config.maxTokens ?? 800}
              </Badge>
            </div>
            <input
              type="range"
              min="100"
              max="4096"
              step="100"
              value={config.maxTokens ?? 800}
              onChange={(e) => update({ maxTokens: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>100</span>
              <span>4096</span>
            </div>
          </div>

          {/* topP（默认隐藏） */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTopP(!showTopP)}
              className="text-[11px] text-muted-foreground hover:text-foreground gap-1 px-0 h-6"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${showTopP ? "rotate-90" : ""}`} />
              {showTopP ? "隐藏" : "显示"} top_p 参数
            </Button>
            {showTopP && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">top_p</Label>
                  <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5">
                    {(config.topP ?? 0.85).toFixed(2)}
                  </Badge>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.topP ?? 0.85}
                  onChange={(e) => update({ topP: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0</span>
                  <span>1</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
