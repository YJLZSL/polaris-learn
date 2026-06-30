import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { AndroidUpdateBanner } from '@/components/providers/AndroidUpdateBanner';
import FloatingCompanion from '@/components/common/FloatingCompanion';
import { useSession } from '@/components/providers/SessionProvider';
import { pageTransitionProps } from '@/lib/motion';
import { useUserStore } from '@/stores/useUserStore';
import { useSafeMotion } from "@/hooks/useSafeMotion";

export default function ProtectedRoute() {
  const { status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const learningMode = useUserStore((s) => s.learningMode);
  const safeMotion = useSafeMotion();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        加载中...
      </div>
    );
  }
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;

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
            {...safeMotion(pageTransitionProps)}
            className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Task 13.7: 右下角常驻学习伙伴小灵 */}
      <FloatingCompanion />
    </div>
  );
}
