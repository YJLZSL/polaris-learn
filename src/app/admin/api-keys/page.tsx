"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  KeyRound,
  Plus,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
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

interface ApiKeyInfo {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  status: string;
  rateLimitRpm: number;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [createdKey, setCreatedKey] = useState<{ fullKey: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [formUserId, setFormUserId] = useState("");
  const [formKeyName, setFormKeyName] = useState("");
  const [formRateLimit, setFormRateLimit] = useState(120);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-keys");
      if (!res.ok) throw new Error("获取API Key列表失败");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setError("获取API Key列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKeys();
  }, [fetchKeys]);

  const handleCreateKey = async () => {
    if (!formUserId.trim() || !formKeyName.trim()) {
      toast.error("请填写用户ID和Key名称");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: formUserId.trim(),
          name: formKeyName.trim(),
          rateLimitRpm: formRateLimit,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建失败");
      }
      const data = await res.json();
      setCreatedKey({
        fullKey: data.fullKey || "",
        prefix: data.key?.prefix || "",
      });
      toast.success("API Key已创建");
      setShowCreateDialog(false);
      fetchKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("吊销失败");
      toast.success("API Key已吊销");
      fetchKeys();
    } catch {
      toast.error("吊销失败");
    } finally {
      setRevokingId(null);
      setRevokeTargetId(null);
    }
  };

  const handleCopyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.fullKey);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("复制失败");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "从未";
    try { return new Date(d).toLocaleDateString("zh-CN"); } catch { return d; }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            API密钥管理
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            管理所有用户的虚拟API Key，支持创建、吊销与速率限制
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchKeys}>
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
          <Button
            onClick={() => {
              setShowCreateDialog(true);
              setFormUserId("");
              setFormKeyName("");
              setFormRateLimit(120);
              setCreatedKey(null);
            }}
          >
            <Plus className="w-4 h-4" />
            创建Key
          </Button>
        </div>
      </div>

      {createdKey && (
        <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">
                  请立即复制保存，此Key仅显示一次
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-700 font-mono break-all select-all">
                    {createdKey.fullKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setCreatedKey(null)}
                  className="text-amber-600 dark:text-amber-400 mt-2 p-0 h-auto"
                >
                  我知道了，关闭提示
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <Button variant="outline" onClick={fetchKeys}>
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
          </CardContent>
        )}

        {!loading && !error && keys.length === 0 && (
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <KeyRound className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">暂无API Key</p>
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4" />
              创建第一个Key
            </Button>
          </CardContent>
        )}

        {!loading && !error && keys.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">用户ID</TableHead>
                <TableHead className="px-5">Key名称</TableHead>
                <TableHead className="px-5 hidden sm:table-cell">Key前缀</TableHead>
                <TableHead className="px-5">状态</TableHead>
                <TableHead className="px-5 hidden md:table-cell">创建时间</TableHead>
                <TableHead className="px-5 hidden lg:table-cell">最后使用</TableHead>
                <TableHead className="px-5 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="px-5">
                    <span className="text-sm font-medium text-slate-900 dark:text-white font-mono">
                      {key.userId.slice(0, 8)}...
                    </span>
                  </TableCell>
                  <TableCell className="px-5">
                    <span className="text-sm text-slate-800 dark:text-slate-200">{key.name}</span>
                  </TableCell>
                  <TableCell className="px-5 hidden sm:table-cell">
                    <code className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {key.prefix}
                    </code>
                  </TableCell>
                  <TableCell className="px-5">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        key.status === "active"
                          ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                          : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                      }`}
                    >
                      {key.status === "active" ? "活跃" : "已吊销"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 hidden md:table-cell">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(key.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 hidden lg:table-cell">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(key.lastUsedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 text-right">
                    {key.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeTargetId(key.id)}
                        disabled={revokingId === key.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        吊销
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建虚拟API Key</DialogTitle>
            <DialogDescription>为指定用户创建新的虚拟API Key</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">用户ID *</Label>
              <Input
                id="userId"
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
                placeholder="输入用户ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyName">Key名称 *</Label>
              <Input
                id="keyName"
                value={formKeyName}
                onChange={(e) => setFormKeyName(e.target.value)}
                placeholder="例如：开发测试Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateLimit">速率限制 (次/分钟)</Label>
              <Input
                id="rateLimit"
                type="number"
                min={10}
                max={10000}
                step={10}
                value={formRateLimit}
                onChange={(e) => setFormRateLimit(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateKey} disabled={submitting}>
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  创建
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTargetId} onOpenChange={(open) => !open && setRevokeTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认吊销</AlertDialogTitle>
            <AlertDialogDescription>
              吊销后该Key将无法使用，此操作不可撤销。确定要吊销此API Key吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTargetId && handleRevoke(revokeTargetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认吊销
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
