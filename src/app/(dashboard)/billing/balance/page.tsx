"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 余额详情页面 - 重定向到充值页面
 * 后续可扩展为显示完整的余额和交易记录页面
 */
export default function BillingBalancePage() {
  const router = useRouter();

  useEffect(() => {
    // 目前余额页面重定向到充值页（余额卡片已在充值页显示）
    router.replace("/billing/recharge");
  }, [router]);

  return null;
}
