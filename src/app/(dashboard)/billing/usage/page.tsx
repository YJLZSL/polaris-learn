"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  CreditCard,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// --- Types ---
interface DailyBreakdown {
  date: string;
  cost: number;
  tokens: number;
  calls: number;
}

interface ModelBreakdown {
  model: string;
  provider: string;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  calls: number;
  proportion: number;
}

interface UsageData {
  period: string;
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  avgDailyTokens: number;
  tokenChange: number;
  costChange: number;
  dailyBreakdown: DailyBreakdown[];
  modelBreakdown: ModelBreakdown[];
}

type Period = "7d" | "30d" | "month";

const periodLabels: Record<Period, string> = {
  "7d": "最近7天",
  "30d": "最近30天",
  month: "本月",
};

// --- Helpers ---
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(n: number): string {
  if (n >= 1) return `¥${n.toFixed(2)}`;
  if (n >= 0.01) return `¥${n.toFixed(4)}`;
  return `¥${n.toFixed(6)}`;
}

function formatChange(change: number): { text: string; isUp: boolean } {
  const isUp = change >= 0;
  const abs = Math.abs(change);
  return {
    text: `${isUp ? "+" : ""}${abs.toFixed(1)}%`,
    isUp,
  };
}

// --- Sub-components ---

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-24 mb-1" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function SummaryCards({ data }: { data: UsageData }) {
  const tokenChange = formatChange(data.tokenChange);
  const costChange = formatChange(data.costChange);

  const cards = [
    {
      title: "本月Token用量",
      value: formatTokens(data.totalTokens),
      icon: Zap,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      change: tokenChange,
    },
    {
      title: "本月费用",
      value: formatCost(data.totalCost),
      icon: CreditCard,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      change: costChange,
    },
    {
      title: "平均每日用量",
      value: formatTokens(data.avgDailyTokens),
      icon: BarChart3,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      change: null,
    },
    {
      title: "较上月变化",
      value: tokenChange.text,
      icon: tokenChange.isUp ? TrendingUp : TrendingDown,
      iconColor: tokenChange.isUp ? "text-red-500" : "text-green-500",
      iconBg: tokenChange.isUp
        ? "bg-red-50 dark:bg-red-950/40"
        : "bg-green-50 dark:bg-green-950/40",
      change: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">
                {card.title}
              </span>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg ${card.iconBg}`}
              >
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight">
              {card.value}
            </div>
            {card.change && (
              <div className="flex items-center gap-1 mt-1">
                {card.change.isUp ? (
                  <TrendingUp className="w-3 h-3 text-red-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-green-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    card.change.isUp ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {card.change.text}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsageTrendChart({ data }: { data: DailyBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        暂无趋势数据
      </div>
    );
  }

  const maxTokens = Math.max(...data.map((d) => d.tokens), 1);

  return (
    <div className="space-y-3">
      {/* Bar chart */}
      <div className="flex items-end gap-[3px] h-40 lg:h-48">
        {data.map((day) => {
          const height = Math.max((day.tokens / maxTokens) * 100, 2);
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-popover text-popover-foreground text-xs rounded-lg px-2.5 py-1.5 shadow-lg border whitespace-nowrap">
                  <div className="font-medium">{day.date.slice(5)}</div>
                  <div>{day.tokens.toLocaleString()} tokens</div>
                  <div>¥{day.cost.toFixed(4)}</div>
                </div>
              </div>
              <div
                className="w-full rounded-t-sm bg-indigo-500/80 hover:bg-indigo-500 transition-colors min-w-[4px]"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-[3px]">
        {data.map((day, i) => {
          // Show label every N bars depending on data length
          const showLabel =
            data.length <= 7 ||
            i === 0 ||
            i === data.length - 1 ||
            (data.length <= 15 && i % 2 === 0) ||
            (data.length <= 31 && i % 5 === 0);
          return (
            <div key={day.date} className="flex-1 text-center min-w-[4px]">
              {showLabel && (
                <span className="text-[10px] text-muted-foreground">
                  {day.date.slice(5)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelTable({ models }: { models: ModelBreakdown[] }) {
  if (models.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        暂无模型用量数据
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>模型名称</TableHead>
          <TableHead className="hidden sm:table-cell">Provider</TableHead>
          <TableHead className="text-right">Token用量</TableHead>
          <TableHead className="text-right hidden sm:table-cell">费用</TableHead>
          <TableHead className="text-right hidden md:table-cell">占比</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((m) => (
          <TableRow key={`${m.provider}/${m.model}`}>
            <TableCell>
              <div className="font-medium text-sm">{m.model}</div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant="secondary" className="text-xs font-normal">
                {m.provider}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="text-sm">{formatTokens(m.tokens)}</div>
            </TableCell>
            <TableCell className="text-right hidden sm:table-cell">
              <div className="text-sm">{formatCost(m.cost)}</div>
            </TableCell>
            <TableCell className="text-right hidden md:table-cell">
              <div className="flex items-center gap-2 justify-end">
                <Progress value={m.proportion} className="w-16 h-1.5" />
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {m.proportion.toFixed(1)}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CostBreakdown({ data }: { data: UsageData }) {
  const totalTokens = data.totalPromptTokens + data.totalCompletionTokens;
  const promptRatio =
    totalTokens > 0
      ? Math.round((data.totalPromptTokens / totalTokens) * 100)
      : 50;
  const completionRatio = 100 - promptRatio;

  // Estimate cost split (input tokens typically cost less than output)
  // Use actual token ratios as approximation
  const promptCostEstimate = data.totalCost * (promptRatio / 100);
  const completionCostEstimate = data.totalCost * (completionRatio / 100);

  const categories = [
    {
      label: "Input Tokens",
      tokens: data.totalPromptTokens,
      cost: promptCostEstimate,
      ratio: promptRatio,
      color: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Output Tokens",
      tokens: data.totalCompletionTokens,
      cost: completionCostEstimate,
      ratio: completionRatio,
      color: "bg-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Token split bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Token 分布</span>
          <span>
            {formatTokens(data.totalPromptTokens)} / {formatTokens(data.totalCompletionTokens)}
          </span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${promptRatio}%` }}
          />
          <div
            className="bg-purple-500 transition-all"
            style={{ width: `${completionRatio}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            Input {promptRatio}%
          </span>
          <span className="text-[10px] text-muted-foreground">
            Output {completionRatio}%
          </span>
        </div>
      </div>

      {/* Category details */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.label}
            className={`flex items-center justify-between p-3 rounded-lg ${cat.bgColor}`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
              <span className="text-sm font-medium">{cat.label}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {formatTokens(cat.tokens)} tokens
              </div>
              <div className="text-xs text-muted-foreground">
                ~{formatCost(cat.cost)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: UsageData };

export default function BillingUsagePage() {
  const [period, setPeriod] = useState<Period>("month");
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/billing/usage?period=${period}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e));
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setPageState({ status: "success", data: json as UsageData });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPageState({ status: "error", message: e?.error || "获取用量数据失败" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period, refreshKey]);

  const handleRefresh = () => {
    setPageState({ status: "loading" });
    setRefreshKey((k) => k + 1);
  };

  const loading = pageState.status === "loading";
  const error = pageState.status === "error" ? pageState.message : "";
  const data = pageState.status === "success" ? pageState.data : null;

  return (
    <div className="space-y-5">
      {/* Time period selector */}
      <div className="flex items-center justify-between">
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as Period)}
        >
          <TabsList className="h-8">
            <TabsTrigger value="7d" className="text-xs px-3 h-6">
              {periodLabels["7d"]}
            </TabsTrigger>
            <TabsTrigger value="30d" className="text-xs px-3 h-6">
              {periodLabels["30d"]}
            </TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-3 h-6">
              {periodLabels.month}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : data ? (
        <SummaryCards data={data} />
      ) : null}

      {/* Usage trend chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>用量趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : data ? (
            <UsageTrendChart data={data.dailyBreakdown} />
          ) : null}
        </CardContent>
      </Card>

      {/* Two-column layout: Model table + Cost breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Model usage table */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle>模型用量明细</CardTitle>
          </CardHeader>
          <CardContent className="p-0 lg:p-0 lg:px-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data ? (
              <ModelTable models={data.modelBreakdown} />
            ) : null}
          </CardContent>
        </Card>

        {/* Cost breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>费用构成</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : data ? (
              <CostBreakdown data={data} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
