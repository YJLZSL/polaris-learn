"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Activity,
  Coins,
  Zap,
  TrendingUp,
  Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DailyRecord {
  date: string;
  calls: number;
  tokens: number;
  cost: number;
}

interface ProviderUsage {
  provider: string;
  calls: number;
  tokens: number;
  cost: number;
}

interface UsageData {
  period: string;
  startDate: string;
  endDate: string;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  dailyBreakdown: DailyRecord[];
  topProviders: ProviderUsage[];
}

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "今日",
  weekly: "本周",
  monthly: "本月",
};

export default function AdminUsagePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UsageData | null>(null);
  const [period, setPeriod] = useState<Period>("daily");

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usage?period=${period}`);
      if (!res.ok) throw new Error("获取用量数据失败");
      const result: UsageData = await res.json();
      setData(result);
    } catch {
      setError("获取用量数据失败");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsage();
  }, [fetchUsage]);

  const maxCost = useMemo(() => {
    const rows = data?.dailyBreakdown;
    if (!rows || rows.length === 0) return 1;
    return Math.max(...rows.map((r) => r.cost), 0.01);
  }, [data?.dailyBreakdown]);

  const totalDailyCalls = useMemo(
    () => data?.dailyBreakdown.reduce((s, r) => s + r.calls, 0) ?? 0,
    [data?.dailyBreakdown]
  );
  const totalDailyTokens = useMemo(
    () => data?.dailyBreakdown.reduce((s, r) => s + r.tokens, 0) ?? 0,
    [data?.dailyBreakdown]
  );
  const totalDailyCost = useMemo(
    () => data?.dailyBreakdown.reduce((s, r) => s + r.cost, 0) ?? 0,
    [data?.dailyBreakdown]
  );

  const summaryCards = [
    {
      label: `${PERIOD_LABELS[period]}调用量`,
      value: (data?.totalCalls ?? 0).toLocaleString(),
      icon: Activity,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      label: `${PERIOD_LABELS[period]}Token消耗`,
      value: (data?.totalTokens ?? 0).toLocaleString(),
      icon: Zap,
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      label: `${PERIOD_LABELS[period]}费用`,
      value: `¥${(data?.totalCost ?? 0).toFixed(2)}`,
      icon: Coins,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "平均每次调用费用",
      value: `¥${data && data.totalCalls > 0 ? (data.totalCost / data.totalCalls).toFixed(4) : "0.0000"}`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            用量与收入统计
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            API调用量、Token消耗与费用统计概览
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">今日</SelectItem>
              <SelectItem value="weekly">本周</SelectItem>
              <SelectItem value="monthly">本月</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchUsage}>
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {card.label}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {card.value}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">加载中...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <Button variant="outline" onClick={fetchUsage}>
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {data.dailyBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{PERIOD_LABELS[period]}费用分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.dailyBreakdown.map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 w-16 text-right shrink-0">
                        {r.date}
                      </span>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-700"
                          style={{ width: `${maxCost > 0 ? (r.cost / maxCost) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300 w-16 text-right shrink-0">
                        ¥{r.cost.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 w-16 text-right shrink-0 hidden sm:block">
                        {r.calls.toLocaleString()}次
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.topProviders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  按Provider统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">调用次数</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Token消耗</TableHead>
                      <TableHead className="text-right">费用</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProviders.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-mono">
                              #{i + 1}
                            </Badge>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {p.provider}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {p.calls.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {p.tokens.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                            ¥{p.cost.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.dailyBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{PERIOD_LABELS[period]}明细</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead className="text-right">调用次数</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Token消耗</TableHead>
                      <TableHead className="text-right">费用</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dailyBreakdown.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <span className="text-sm text-slate-800 dark:text-slate-200">{r.date}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {r.calls.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {r.tokens.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                            ¥{r.cost.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>
                        <span className="text-sm font-medium">合计</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">{totalDailyCalls.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className="text-sm font-medium">{totalDailyTokens.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-mono font-medium">¥{totalDailyCost.toFixed(2)}</span>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}

          {!loading && !error && data && data.dailyBreakdown.length === 0 && data.topProviders.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
                <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">该时段暂无数据</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
