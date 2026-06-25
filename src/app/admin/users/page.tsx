"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Pencil,
  Ban,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  grade: string | null;
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string | null;
  createdAt: string;
  apiKeysCount: number;
  conversationsCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("获取用户列表失败");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: UserInfo) => {
    setTogglingId(user.id);
    try {
      const newStatus = user.status === "active" ? "suspended" : "active";
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("状态变更失败");
      toast.success(newStatus === "active" ? "用户已激活" : "用户已停用");
      fetchUsers();
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, status: newStatus });
      }
    } catch {
      toast.error("状态变更失败");
    } finally {
      setTogglingId(null);
    }
  };

  const openUserSheet = (user: UserInfo) => {
    setSelectedUser(user);
    setSheetOpen(true);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString("zh-CN"); } catch { return d; }
  };

  const filteredUsers = users.filter((u) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!u.email.toLowerCase().includes(q) && !(u.name || "").includes(q)) return false;
    }
    if (roleFilter && roleFilter !== "all" && u.role !== roleFilter) return false;
    return true;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended" || u.status === "banned").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            用户管理
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            管理平台注册用户、查看使用情况、启用或停用账号
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers}>
          <RefreshCw className="w-4 h-4" />
          刷新数据
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        {[
          { label: "总用户数", value: stats.total, color: "text-slate-900 dark:text-white" },
          { label: "活跃", value: stats.active, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "已停用", value: stats.suspended, color: "text-red-600 dark:text-red-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 lg:p-5">
              <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                {s.label}
              </p>
              <p className={`text-xl lg:text-2xl font-bold tracking-tight ${s.color}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索邮箱或姓名..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="suspended">禁用</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="角色筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            <SelectItem value="student">学生</SelectItem>
            <SelectItem value="admin">管理员</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading && (
          <CardContent className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">加载中...</p>
            </div>
          </CardContent>
        )}

        {!loading && error && (
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
          </CardContent>
        )}

        {!loading && !error && filteredUsers.length === 0 && (
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {search ? "没有匹配的用户" : "暂无用户数据"}
            </p>
          </CardContent>
        )}

        {!loading && !error && filteredUsers.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">用户</TableHead>
                <TableHead className="px-5 hidden sm:table-cell">邮箱</TableHead>
                <TableHead className="px-5">角色</TableHead>
                <TableHead className="px-5">状态</TableHead>
                <TableHead className="px-5 hidden lg:table-cell">注册时间</TableHead>
                <TableHead className="px-5 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="px-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                        {user.name || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 hidden sm:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[180px] block">
                      {user.email}
                    </span>
                  </TableCell>
                  <TableCell className="px-5">
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "管理员" : "学生"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        user.status === "active"
                          ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                          : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                      }`}
                    >
                      {user.status === "active" ? "活跃" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 hidden lg:table-cell">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(user.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openUserSheet(user)}>
                          <Eye className="h-4 w-4" />
                          查看
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openUserSheet(user)}>
                          <Pencil className="h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user)}
                          disabled={togglingId === user.id}
                        >
                          {user.status === "active" ? (
                            <>
                              <Ban className="h-4 w-4" />
                              禁用
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              启用
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle>用户详情</SheetTitle>
                <SheetDescription>查看和管理用户信息</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="text-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedUser.name || "未设置姓名"}
                    </p>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>账号状态</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={selectedUser.status === "active"}
                        disabled={togglingId === selectedUser.id}
                        onCheckedChange={() => handleToggleStatus(selectedUser)}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {selectedUser.status === "active" ? "活跃" : "禁用"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">角色</p>
                      <Badge variant={selectedUser.role === "admin" ? "default" : "secondary"}>
                        {selectedUser.role === "admin" ? "管理员" : "学生"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">年级</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedUser.grade || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">等级</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        Lv.{selectedUser.level}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">经验值</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedUser.xp.toLocaleString()} XP
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">连续学习</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedUser.streak} 天
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">API密钥数</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedUser.apiKeysCount}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">最近活动</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">对话数</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedUser.conversationsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">最后学习</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatDate(selectedUser.lastStudyDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">注册时间</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatDate(selectedUser.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
