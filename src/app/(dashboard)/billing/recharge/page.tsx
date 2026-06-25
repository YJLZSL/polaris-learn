"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Wallet,
  CreditCard,
  CircleDollarSign,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  QrCode,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// 预设充值金额
const presetAmounts = [10, 30, 50, 100, 200, 500];

// 支付方式选项
const paymentMethods = [
  { value: "alipay" as const, label: "支付宝", sublabel: "推荐使用", color: "text-blue-500" },
  { value: "wechat" as const, label: "微信支付", sublabel: "扫码支付", color: "text-green-500" },
];

// 充值记录类型
interface RechargeRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export default function RechargePage() {
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"alipay" | "wechat">("alipay");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // 加载当前余额
  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await fetch("/api/user/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      } else {
        console.error("获取余额失败:", res.status);
      }
    } catch (err) {
      console.error("获取余额网络异常:", err);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  // 加载充值记录
  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const res = await fetch("/api/billing/recharge/records");
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data.records) ? data.records : []);
      }
    } catch {
      // 静默处理，充值记录为辅助信息
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBalance();
    loadRecords();
  }, [loadBalance, loadRecords]);

  // 实际充值金额
  const actualAmount = useCustom
    ? parseFloat(customAmount) || 0
    : selectedAmount;

  // 表单是否有效
  const isValid =
    actualAmount >= 1 &&
    actualAmount <= 10000 &&
    !isNaN(actualAmount) &&
    !submitting;

  // 提交充值
  const handleRecharge = async () => {
    if (!isValid) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: actualAmount,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "充值失败，请稍后重试");
        return;
      }

      if (data.status === "success") {
        // 开发模式：自动完成充值
        toast.success(`充值成功！到账 ¥${data.amount}，当前余额 ¥${data.balance}`);
        setBalance(data.balance);
        setShowConfirmDialog(false);
        loadRecords();
        // 1.5 秒后跳转到余额页
        setTimeout(() => router.push("/billing/balance"), 1500);
      } else if (data.paymentUrl) {
        // 生产模式：展示支付链接
        toast.success("订单已创建，请完成支付", { duration: 5000 });
        // TODO: 生产环境中应跳转到支付页面或展示二维码
        console.log("支付链接:", data.paymentUrl);
      }
    } catch (err) {
      toast.error("网络异常，请检查网络后重试");
      console.error("充值请求失败:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化金额显示
  const formatBalance = (value: number) => {
    return value.toFixed(2);
  };

  // 格式化充值记录时间
  const formatRecordDate = (d: string) => {
    try {
      return new Date(d).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  };

  // 支付方式标签
  const paymentLabel = paymentMethod === "alipay" ? "支付宝" : "微信支付";

  return (
    <div className="space-y-6">
      {/* ====== 余额展示卡片 ====== */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground rounded-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary-foreground/70" />
            <CardTitle className="text-base font-medium text-primary-foreground/70">
              账户余额
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1">
            {loadingBalance ? (
              <Skeleton className="h-10 w-[120px] bg-white/20" />
            ) : (
              <span className="text-3xl lg:text-4xl font-bold">
                {formatBalance(balance)}
              </span>
            )}
            <span className="text-lg text-primary-foreground/70">CNY</span>
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={loadBalance}
            disabled={loadingBalance}
            className="mt-1 h-auto p-0 text-primary-foreground/50 hover:text-primary-foreground/80"
          >
            {loadingBalance ? "加载中..." : "点击刷新余额"}
          </Button>
        </CardContent>
      </Card>

      {/* ====== 充值金额选择 ====== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            <CardTitle>选择充值金额</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 预设金额按钮 */}
          <div className="grid grid-cols-3 gap-2">
            {presetAmounts.map((amount) => (
              <Button
                key={amount}
                variant={!useCustom && selectedAmount === amount ? "default" : "outline"}
                className="h-auto py-3 flex-col gap-0.5"
                onClick={() => {
                  setUseCustom(false);
                  setSelectedAmount(amount);
                }}
              >
                <span className="text-lg font-semibold">¥{amount}</span>
                <span className="text-[10px] opacity-70">
                  {amount >= 200 ? "推荐" : amount >= 100 ? "常用" : "小额"}
                </span>
              </Button>
            ))}
          </div>

          {/* 自定义金额 */}
          <div className="space-y-2">
            <Button
              variant={useCustom ? "default" : "outline"}
              className={`w-full ${useCustom ? "" : "border-dashed"}`}
              onClick={() => setUseCustom(!useCustom)}
            >
              {useCustom ? "已选择自定义金额" : "自定义金额"}
            </Button>

            {useCustom && (
              <div className="space-y-2 animate-fadeIn">
                <Label className="text-xs text-muted-foreground">
                  输入金额 (1 - 10,000 CNY)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ¥
                  </span>
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="请输入金额"
                    min={1}
                    max={10000}
                    step={0.01}
                    className="pl-8"
                  />
                </div>
                {customAmount && (parseFloat(customAmount) > 10000 || parseFloat(customAmount) < 1) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    金额范围: 1 - 10,000 CNY
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ====== 支付方式选择 ====== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>支付方式</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as "alipay" | "wechat")}
            className="grid grid-cols-2 gap-3"
          >
            {paymentMethods.map((pm) => (
              <Label
                key={pm.value}
                htmlFor={pm.value}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  paymentMethod === pm.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <RadioGroupItem value={pm.value} id={pm.value} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{pm.label}</p>
                  <p className="text-[10px] text-muted-foreground">{pm.sublabel}</p>
                </div>
                {paymentMethod === pm.value && (
                  <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                )}
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* ====== 充值汇总与确认 ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>确认充值</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">充值金额</span>
              <span className="font-semibold text-lg">¥{actualAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">支付方式</span>
              <span className="font-medium">{paymentLabel}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">充值后余额</span>
              <span className="font-semibold text-lg text-primary">
                ¥{(balance + actualAmount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {process.env.NODE_ENV === "development"
                ? "开发模式：点击确认后将自动完成充值，余额即时到账。"
                : "点击确认后将跳转至支付页面完成付款。"}
            </p>
          </div>

          {/* 确认按钮 */}
          <Button
            className="w-full"
            size="lg"
            disabled={!isValid}
            onClick={() => setShowConfirmDialog(true)}
          >
            <CreditCard className="h-4 w-4" />
            立即充值 ¥{actualAmount.toFixed(2)}
          </Button>
        </CardContent>
      </Card>

      {/* ====== 充值确认对话框 ====== */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认充值</DialogTitle>
            <DialogDescription>
              请确认以下充值信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">充值金额</span>
                <span className="font-bold text-lg">¥{actualAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">支付方式</span>
                <span className="font-medium">{paymentLabel}</span>
              </div>
            </div>

            <Separator />

            {/* QR Code Placeholder */}
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-40 h-40 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/50">
                <QrCode className="h-16 w-16 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                {process.env.NODE_ENV === "development"
                  ? "开发模式：点击确认即可完成充值"
                  : "请使用" + paymentLabel + "扫描二维码完成支付"}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleRecharge}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  确认充值 ¥{actualAmount.toFixed(2)}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== 最近充值记录 ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>最近充值记录</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[60px]" />
                  <Skeleton className="h-4 w-[60px]" />
                  <Skeleton className="h-5 w-[50px] rounded-full" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CreditCard className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">暂无充值记录</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>方式</TableHead>
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 5).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRecordDate(record.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      ¥{Number(record.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.paymentMethod === "alipay" ? "支付宝" : "微信支付"}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.status === "success" ? (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                          成功
                        </Badge>
                      ) : record.status === "pending" ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                          待支付
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30">
                          失败
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
