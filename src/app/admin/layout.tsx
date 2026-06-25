"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Server,
  BarChart3,
  Menu,
  X,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/api-keys", label: "API密钥", icon: KeyRound },
  { href: "/admin/providers", label: "Provider管理", icon: Server },
  { href: "/admin/usage", label: "用量统计", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => setSidebarOpen((v) => !v);
    window.addEventListener("toggle-admin-sidebar", handler);
    return () => window.removeEventListener("toggle-admin-sidebar", handler);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">验证管理员身份...</p>
        </div>
      </div>
    );
  }

  // 管理后台独立登录页不经过管理员鉴权与侧边栏外壳，直接渲染
  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  const role = (session?.user as unknown as { role?: string })?.role;
  if (status === "unauthenticated" || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            无权限访问
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            {status === "unauthenticated"
              ? "请先登录管理员账号后再访问管理后台。"
              : "您当前的账号没有管理员权限，无法访问管理后台。如需开通权限，请联系超级管理员。"}
          </p>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href="/admin/login">
                前往登录
                <LogOut className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || "管理员";
  const userEmail = session?.user?.email || "";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-slate-300 flex-col transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:flex"
        )}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-700/60 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500">
            <span className="text-white text-lg font-bold">智</span>
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold tracking-wide text-white">智学AI</span>
            <p className="text-[10px] text-indigo-300 font-medium">管理后台</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            导航菜单
          </p>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                className={cn(
                  "w-full justify-start gap-3 mb-0.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-600 hover:text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Link href={item.href}>
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              </Button>
            );
          })}

          <Separator className="my-4 mx-3 bg-slate-700/60" />

          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="w-full justify-start gap-3 text-sm font-medium text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>退出登录</span>
          </Button>
        </nav>

        <div className="shrink-0 border-t border-slate-700/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {userName.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
            </div>
            <span className="ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
              管理员
            </span>
          </div>
        </div>
      </aside>

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden -ml-1"
            aria-label="切换侧边栏"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <div className="flex items-center gap-2 text-sm min-w-0">
            <Link
              href="/admin"
              className="text-slate-400 hover:text-indigo-500 transition-colors shrink-0"
            >
              管理后台
            </Link>
            {pathname !== "/admin" && (
              <>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                  {ADMIN_NAV.find((item) => pathname.startsWith(item.href) && item.href !== "/admin")
                    ?.label || ""}
                </span>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="lg:ml-0 px-4 lg:px-6 py-4 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-600">
            &copy; {new Date().getFullYear()} 智学AI 管理后台 | Licensed under AGPL-3.0
          </p>
        </footer>
      </div>
    </div>
  );
}
