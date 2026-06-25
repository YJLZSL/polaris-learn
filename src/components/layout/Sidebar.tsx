"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/stores/useUserStore";
import { getLevelInfo } from "@/lib/game";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Home,
  MessageSquare,
  BookOpen,
  Network,
  FileQuestion,
  BarChart3,
  Trophy,
  GraduationCap,
  Camera,
  Zap,
  Users,
  ClipboardList,
  Layers,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/home", label: "首页", icon: Home },
  { href: "/ai-tutor", label: "AI老师", icon: MessageSquare },
  { href: "/practice", label: "练习", icon: BookOpen },
  { href: "/knowledge-graph", label: "知识图谱", icon: Network },
  { href: "/error-notes", label: "错题本", icon: FileQuestion },
  { href: "/progress", label: "学习报告", icon: BarChart3 },
  { href: "/leaderboard", label: "排行榜", icon: Trophy },
  { href: "/courses", label: "课程", icon: GraduationCap },
  { href: "/photo-search", label: "拍题", icon: Camera },
  { href: "/badges", label: "徽章", icon: Layers },
  { href: "/study-group", label: "学习小组", icon: Users },
  { href: "/pk", label: "PK挑战", icon: Zap },
  { href: "/plans", label: "学习计划", icon: ClipboardList },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function NavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <motion.div
      whileHover={{ x: collapsed ? 0 : 4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-10 px-3 font-medium transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground",
          collapsed && "justify-center px-0"
        )}
        onClick={onClick}
      >
        <Link href={item.href}>
          <Icon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </Button>
    </motion.div>
  );
}

export default function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { name, xp, level: _level, streak, avatar } = useUserStore();

  // Sync display name/avatar with session (same as Header) when store is empty
  const userName = session?.user?.name || name || "用户";
  const userAvatar = session?.user?.image || avatar;

  const levelInfo = getLevelInfo(xp);
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? "w-16" : "w-64";

  return (
    <>
      {/* ====== Desktop Sidebar ====== */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r z-30 transition-all duration-300",
          sidebarWidth
        )}
      >
        {/* Logo / Brand */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={cn("flex items-center h-16 shrink-0 border-b px-4", collapsed ? "justify-center" : "gap-3")}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-lg font-bold tracking-wide">Polaris</span>
              <p className="text-xs text-muted-foreground">北极星学习平台</p>
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <div className={cn("px-2 space-y-0.5", collapsed && "px-1.5")}>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        {/* User info area */}
        <div
          className={cn(
            "shrink-0 p-3 space-y-2",
            collapsed && "flex flex-col items-center p-2"
          )}
        >
          <div className={cn("flex items-center gap-2", collapsed && "flex-col gap-1")}>
            <Avatar className="h-8 w-8 shrink-0">
              {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {userName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{userName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    Lv.{levelInfo.level}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{levelInfo.title}</span>
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-foreground">{xp}</span>
                  <span>XP</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="font-bold text-amber-500">{streak}</span>
                  <span>天</span>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                距下一级还需 {levelInfo.xpToNextLevel} XP
              </p>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <div className="shrink-0 border-t p-1.5 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* ====== Mobile Sidebar (Sheet) ====== */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0 bg-card">
          <SheetHeader className="h-16 flex flex-row items-center gap-3 px-5 border-b">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <SheetTitle className="text-lg font-bold">Polaris</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 h-[calc(100vh-8rem)]">
            <div className="px-2 py-2 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    collapsed={false}
                    onClick={() => onMobileOpenChange(false)}
                  />
                );
              })}
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 border-t p-3 space-y-2 bg-card">
            <Separator className="my-1" />
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {userName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{userName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    Lv.{levelInfo.level}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{levelInfo.title}</span>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
