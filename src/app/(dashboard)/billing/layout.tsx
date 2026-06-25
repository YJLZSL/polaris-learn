"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiCreditCard, HiChartBar, HiWallet } from "react-icons/hi2";

const tabs = [
  { href: "/billing/recharge", label: "充值", icon: HiCreditCard },
  { href: "/billing/usage", label: "用量", icon: HiChartBar },
  { href: "/billing/balance", label: "余额", icon: HiWallet },
];

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">计费中心</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          管理账户余额、查看用量明细
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                isActive
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
