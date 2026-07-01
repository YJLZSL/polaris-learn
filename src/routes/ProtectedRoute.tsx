import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { AndroidUpdateBanner } from '@/components/providers/AndroidUpdateBanner';
import { useSession } from '@/components/providers/SessionProvider';
import LoadingScreen from '@/components/shell/LoadingScreen';
import PageTransition from '@/components/shell/PageTransition';
import { useUserStore } from '@/stores/useUserStore';

export default function ProtectedRoute() {
  const { status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const learningMode = useUserStore((s) => s.learningMode);

  if (status === 'loading') {
    return <LoadingScreen message="正在加载你的学习空间..." />;
  }
  // Guest users can browse the dashboard in read-only/demo mode
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

        {/* Page content with platform-aware animated route transitions */}
        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto">
          <PageTransition pageKey={pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
