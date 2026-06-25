"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Activity,
  DollarSign,
  Clock,
  Server,
  KeyRound,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface StatsData {
  basic: {
    totalUsers: number;
    activeToday: number;
    totalQuestions: number;
    totalConversations: number;
  };
  api: {
    totalAPIKeys: number;
    activeAPIKeys: number;
    totalUsageToday: number;
    totalTokensToday: number;
    totalRevenueToday: number;
  };
  providerHealth: {
    id: string;
    name: string;
    healthStatus: string;
    status: string;
    lastHealthCheck: string | null;
  }[];
}

interface ActivityItem {
  id: number;
  action: string;
  detail: string;
  time: string;
  type: string;
}

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 1, action: "新增用户注册", detail: "user@example.com", time: "3 分钟前", type: "user" },
  { id: 2, action: "API Key 创建", detail: "sk-a1b2...xyz", time: "15 分钟前", type: "key" },
  { id: 3, action: "Provider 状态变更", detail: "DeepSeek → active", time: "1 小时前", type: "provider" },
  { id: 4, action: "用量告警", detail: "今日Token消耗超80%", time: "2 小时前", type: "warning" },
  { id: 5, action: "用户充值", detail: "¥50.00", time: "3 小时前", type: "billing" },
];

const QUICK_LINKS = [
  { href: "/admin/users", label: "用户管理", desc: "用户信息管理", icon: Users },
  { href: "/admin/providers", label: "模型供应商", desc: "大模型接入配置", icon: Server },
  { href: "/admin/api-keys", label: "API密钥管理", desc: "虚拟KEY管理", icon: KeyRound },
  { href: "/admin/usage", label: "用量统计", desc: "调用与收入分析", icon: TrendingUp },
];

const ACTIVITY_TYPE_STYLES: Record<string, string> = {
  user: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  key: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  provider: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  billing: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-20" />
                </div>
                <Skeleton className="w-9 h-9 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-5 lg:p-6">
            <Skeleton className="h-5 w-20 mb-4" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="w-14 h-5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 lg:p-6">
            <Skeleton className="h-5 w-16 mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("获取数据失败");
      const data: StatsData = await res.json();
      setStats(data);
      setActivity(MOCK_ACTIVITY);
    } catch {
      setError("获取数据失败，显示模拟数据");
      setActivity(MOCK_ACTIVITY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      label: "总用户数",
      value: (stats?.basic.totalUsers ?? 0).toLocaleString(),
      icon: Users,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      label: "今日活跃",
      value: (stats?.basic.activeToday ?? 0).toLocaleString(),
      icon: UserCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "API调用量",
      value: (stats?.api.totalUsageToday ?? 0).toLocaleString(),
      icon: Activity,
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      label: "今日收入",
      value: `¥${(stats?.api.totalRevenueToday ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDashboard}>
            <RefreshCw className="w-4 h-4" />
            重试
          </Button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          管理控制台
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          系统概览与快捷入口
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-sm transition-shadow duration-200">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {stat.label}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              最近动态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <Badge
                    variant="secondary"
                    className={`text-[10px] shrink-0 ${ACTIVITY_TYPE_STYLES[item.type] || ""}`}
                  >
                    {item.type === "user" && "用户"}
                    {item.type === "key" && "密钥"}
                    {item.type === "provider" && "模型"}
                    {item.type === "warning" && "告警"}
                    {item.type === "billing" && "账单"}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 truncate">
                      {item.action}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{item.detail}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <Button
                  key={link.href}
                  variant="ghost"
                  asChild
                  className="w-full justify-start gap-3 p-3 h-auto"
                >
                  <Link href={link.href}>
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <link.icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {link.label}
                      </p>
                      <p className="text-[11px] text-slate-400">{link.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.providerHealth && stats.providerHealth.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Provider 健康状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.providerHealth.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/30"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      p.healthStatus === "healthy"
                        ? "bg-emerald-500"
                        : p.healthStatus === "unhealthy"
                        ? "bg-red-500"
                        : "bg-slate-400"
                    }`}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{p.name}</span>
                  <Badge
                    variant={p.status === "active" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {p.status === "active" ? "活跃" : "停用"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
