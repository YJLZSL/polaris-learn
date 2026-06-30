import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, MessageSquare, BookOpen, FileQuestion, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/home", label: "首页", icon: Home },
  { href: "/ai-teacher", label: "AI老师", icon: MessageSquare },
  { href: "/practice", label: "练习", icon: BookOpen },
  { href: "/error-notes", label: "错题本", icon: FileQuestion },
  { href: "/profile", label: "我的", icon: User },
];

export default function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 backdrop-blur-md bg-background/80 border-t"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="grid grid-cols-5 h-full">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
