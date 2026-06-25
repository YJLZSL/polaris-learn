"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { AndroidUpdateBanner } from "@/components/providers/AndroidUpdateBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Android update banner (only renders on Capacitor native platforms) */}
      <AndroidUpdateBanner />

      {/* Sidebar (desktop + mobile Sheet) */}
      <Sidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 lg:pl-64">
        {/* Header */}
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
