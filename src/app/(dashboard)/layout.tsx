"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { AndroidUpdateBanner } from "@/components/providers/AndroidUpdateBanner";
import { pageTransitionProps } from "@/lib/motion";
import { useUserStore } from "@/stores/useUserStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const learningMode = useUserStore((s) => s.learningMode);

  return (
    <div className="flex min-h-screen bg-background" data-mode={learningMode}>
      {/* Android update banner (only renders on Capacitor native platforms) */}
      <AndroidUpdateBanner />

      {/* Sidebar (desktop + mobile Sheet) */}
      <Sidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 lg:pl-64">
        {/* Header */}
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Mobile bottom navigation (<lg only) */}
        <MobileNav />

        {/* Page content with animated route transitions */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            {...pageTransitionProps}
            className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
