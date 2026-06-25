"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import type { ApiKeyListItem, ApiKeyCreateResult } from "@/types/api-keys";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);

  // Created key result (one-time display)
  const [createdKey, setCreatedKey] = useState<{ fullKey: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form
  const [formKeyName, setFormKeyName] = useState("");

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/keys");
      if (!res.ok) throw new Error("获取API Key列表失败");
      const data = await res.json();
      setKeys(Array.isArray(data.keys) ? data.keys : []);
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
    if (!formKeyName.trim()) {
      toast.error("请填写Key名称");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ai/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formKeyName.trim() }),
      });
      if (!res.ok) throw new Error("创建失败");
      const data: ApiKeyCreateResult = await res.json();
      setCreatedKey({
        fullKey: data.fullKey,
        prefix: data.key.prefix,
      });
      toast.success("API Key已创建");
      setShowCreateModal(false);
      setFormKeyName("");
      fetchKeys();
    } catch {
      toast.error("创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeConfirm = (id: string) => {
    setShowRevokeConfirm(id);
  };

  const handleRevoke = async (id: string) => {
    setShowRevokeConfirm(null);
    setRevokingId(id);
    try {
      const res = await fetch(`/api/ai/keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404) {
          toast.error("Key不存在");
        } else if (res.status === 403) {
          toast.error("无权操作此Key");
        } else {
          throw new Error(errData.error || "吊销失败");
        }
        return;
      }
      toast.success("API Key已吊销");
      fetchKeys();
    } catch {
      toast.error("吊销失败");
    } finally {
      setRevokingId(null);
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

  const formatDate = (d?: string | null) => {
    if (!d) return "从未";
    try {
      return new Date(d).toLocaleDateString("zh-CN");
    } catch {
      return d;
    }
  };

  /** 将前缀掩码展示，如 sk-edu-a1b2c3 -> sk-edu-a1b... */
  const maskPrefix = (prefix: string) => {
    if (prefix.length <= 10) return prefix + "...";
    return prefix.slice(0, 10) + "...";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            API 密钥管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理您的云API访问密钥，用于调用平台提供的大模型API服务
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchKeys}
            title="刷新"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              setShowCreateModal(true);
              setFormKeyName("");
              setCreatedKey(null);
            }}
          >
            <Plus className="h-4 w-4" />
            创建密钥
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">使用说明</p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              <li>API Key 用于通过HTTP接口调用平台的大模型服务</li>
              <li>创建后请立即复制保存Key，完整的Key仅显示一次</li>
              <li>请妥善保管您的Key，不要泄露给他人</li>
              <li>可以在HTTP请求头中使用 <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">Authorization: Bearer YOUR_API_KEY</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Full Key Display (shown once after creation) */}
      {createdKey && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-4 animate-slideUp">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">
                请立即复制保存，关闭后将无法再次查看
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-xs bg-background px-3 py-2 rounded-lg border font-mono break-all select-all">
                  {createdKey.fullKey}
                </code>
                <Button
                  variant={copied ? "default" : "outline"}
                  size="icon"
                  onClick={handleCopyKey}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => setCreatedKey(null)}
                className="text-amber-600 dark:text-amber-400 mt-2 h-auto p-0"
              >
                我知道了，关闭提示
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Key count */}
      {!loading && !error && keys.length > 0 && (
        <p className="text-xs text-muted-foreground">
          共 {keys.length} 个密钥
        </p>
      )}

      {/* Content */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Loading */}
        {loading && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[60px]" />
            </div>
            <Separator />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-6 w-[60px] rounded-full" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[60px]" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchKeys}>
              <RefreshCw className="h-4 w-4" />
              重试
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && keys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="rounded-full bg-muted p-4">
              <Key className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">暂无API密钥</p>
              <p className="text-xs text-muted-foreground mt-1">创建一个密钥以开始使用云API服务</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(true);
                setFormKeyName("");
                setCreatedKey(null);
              }}
            >
              <Plus className="h-4 w-4" />
              创建你的第一个API密钥
            </Button>
          </div>
        )}

        {/* Key Table */}
        {!loading && !error && keys.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">名称</TableHead>
                <TableHead className="px-5 hidden sm:table-cell">密钥前缀</TableHead>
                <TableHead className="px-5">状态</TableHead>
                <TableHead className="px-5 hidden lg:table-cell">创建时间</TableHead>
                <TableHead className="px-5 hidden md:table-cell">最后使用</TableHead>
                <TableHead className="px-5 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="px-5 font-medium">{key.name}</TableCell>
                  <TableCell className="px-5 hidden sm:table-cell">
                    <code className="text-xs font-mono text-muted-foreground">
                      {maskPrefix(key.prefix)}
                    </code>
                  </TableCell>
                  <TableCell className="px-5">
                    {key.status === "active" ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                        活跃
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30">
                        已吊销
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-5 hidden lg:table-cell text-muted-foreground text-xs">
                    {formatDate(key.createdAt)}
                  </TableCell>
                  <TableCell className="px-5 hidden md:table-cell text-muted-foreground text-xs">
                    {formatDate(key.lastUsedAt)}
                  </TableCell>
                  <TableCell className="px-5 text-right">
                    {key.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeConfirm(key.id)}
                        disabled={revokingId === key.id}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        {revokingId === key.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        吊销
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Key Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>创建API Key</DialogTitle>
            <DialogDescription>
              为您的新API密钥指定一个名称，便于后续识别管理
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="key-name">
              Key名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="key-name"
              type="text"
              value={formKeyName}
              onChange={(e) => setFormKeyName(e.target.value)}
              placeholder="例如：开发测试、生产环境"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateKey();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              取消
            </Button>
            <Button onClick={handleCreateKey} disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  生成Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation AlertDialog */}
      <AlertDialog
        open={!!showRevokeConfirm}
        onOpenChange={(open) => {
          if (!open) setShowRevokeConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要吊销此密钥？</AlertDialogTitle>
            <AlertDialogDescription>
              吊销后该Key将立即失效，使用该Key的API请求将被拒绝。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showRevokeConfirm && handleRevoke(showRevokeConfirm)}
              disabled={revokingId === showRevokeConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokingId === showRevokeConfirm ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  吊销中...
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  确认吊销
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
