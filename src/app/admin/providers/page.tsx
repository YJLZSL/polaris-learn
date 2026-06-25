"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Server,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface Provider {
  id: string;
  name: string;
  status: string;
  healthStatus: string;
  endpoint: string;
  config: string;
  lastHealthCheck: string | null;
  createdAt: string;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formConfig, setFormConfig] = useState("");

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/providers");
      if (!res.ok) throw new Error("获取Provider列表失败");
      const data = await res.json();
      setProviders(data.providers || []);
    } catch {
      setError("获取Provider列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProviders();
  }, [fetchProviders]);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormName("");
    setFormApiKey("");
    setFormEndpoint("");
    setFormConfig("");
    setShowDialog(true);
  };

  const openEditDialog = (p: Provider) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormApiKey("");
    setFormEndpoint(p.endpoint);
    setFormConfig(p.config || "");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formEndpoint.trim()) {
      toast.error("请填写Provider名称和端点地址");
      return;
    }
    if (!editingId && !formApiKey.trim()) {
      toast.error("请填写API Key");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await fetch("/api/admin/providers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId: editingId, status: formName.trim() === "" ? "active" : "active" }),
        });
        if (!res.ok) throw new Error("更新失败");
        toast.success("Provider已更新");
      } else {
        const res = await fetch("/api/admin/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            apiKey: formApiKey.trim(),
            endpoint: formEndpoint.trim(),
            config: formConfig.trim() || "{}",
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "添加失败");
        }
        toast.success("Provider已添加");
      }
      setShowDialog(false);
      fetchProviders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (p: Provider) => {
    setTogglingId(p.id);
    try {
      const newStatus = p.status === "active" ? "inactive" : "active";
      const res = await fetch("/api/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: p.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("状态变更失败");
      toast.success(`Provider已${newStatus === "active" ? "激活" : "停用"}`);
      fetchProviders();
    } catch {
      toast.error("状态变更失败");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/providers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: id }),
      });
      if (!res.ok) throw new Error("删除失败");
      toast.success("Provider已删除");
      fetchProviders();
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("zh-CN"); } catch { return d; }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            模型供应商管理
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            管理接入的大模型服务商，配置API端点与密钥
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchProviders}>
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4" />
            添加Provider
          </Button>
        </div>
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
            <Button variant="outline" onClick={fetchProviders}>
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
          </CardContent>
        )}

        {!loading && !error && providers.length === 0 && (
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <Server className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">暂无Provider</p>
            <Button variant="outline" onClick={openCreateDialog}>
              <Plus className="w-4 h-4" />
              添加第一个Provider
            </Button>
          </CardContent>
        )}

        {!loading && !error && providers.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">名称</TableHead>
                <TableHead className="px-5 hidden md:table-cell">API基础URL</TableHead>
                <TableHead className="px-5">状态</TableHead>
                <TableHead className="px-5 hidden sm:table-cell">健康</TableHead>
                <TableHead className="px-5 hidden lg:table-cell">创建时间</TableHead>
                <TableHead className="px-5 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="px-5">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {p.name}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 hidden md:table-cell">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px] block">
                      {p.endpoint}
                    </span>
                  </TableCell>
                  <TableCell className="px-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(p)}
                      disabled={togglingId === p.id}
                      className={`h-auto py-1 px-2.5 text-xs rounded-full font-medium ${
                        p.status === "active"
                          ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          : "text-red-600 hover:text-red-700 dark:text-red-400"
                      }`}
                    >
                      {togglingId === p.id ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : p.status === "active" ? (
                        <Check className="w-3.5 h-3.5 mr-1" />
                      ) : (
                        <X className="w-3.5 h-3.5 mr-1" />
                      )}
                      {p.status === "active" ? "活跃" : "停用"}
                    </Button>
                  </TableCell>
                  <TableCell className="px-5 hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        p.healthStatus === "healthy"
                          ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                          : p.healthStatus === "unhealthy"
                          ? "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                          : "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          p.healthStatus === "healthy"
                            ? "bg-emerald-500"
                            : p.healthStatus === "unhealthy"
                            ? "bg-red-500"
                            : "bg-slate-400"
                        }`}
                      />
                      {p.healthStatus === "healthy" ? "健康" : p.healthStatus === "unhealthy" ? "异常" : "未知"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 hidden lg:table-cell">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(p.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(p)}
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => setDeleteTargetId(p.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑Provider" : "添加Provider"}</DialogTitle>
            <DialogDescription>
              {editingId ? "修改Provider配置信息" : "添加新的大模型服务提供商"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="providerName">名称 *</Label>
              <Input
                id="providerName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：DeepSeek, OpenAI"
                disabled={!!editingId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerApiKey">
                API Key {!editingId && "*"}
              </Label>
              <Input
                id="providerApiKey"
                type="password"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder={editingId ? "留空则不修改" : "输入API Key"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerEndpoint">端点地址 *</Label>
              <Input
                id="providerEndpoint"
                value={formEndpoint}
                onChange={(e) => setFormEndpoint(e.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerConfig">额外配置 (JSON)</Label>
              <Textarea
                id="providerConfig"
                value={formConfig}
                onChange={(e) => setFormConfig(e.target.value)}
                placeholder='{"model": "deepseek-chat"}'
                rows={3}
                className="font-mono resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  保存
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除此Provider吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
