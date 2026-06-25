import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "@/components/providers/SessionProvider";
import ServiceWorkerRegister from "@/components/providers/ServiceWorkerRegister";
import ElectronDetector from "@/components/providers/ElectronDetector";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polaris - 北极星学习平台",
  description:
    "Polaris 北极星学习平台——智能辅助学习，拍照搜题、AI对话、课程学习，让每个孩子都能获得个性化教育",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
        {/* PWA Service Worker Registration */}
        <ServiceWorkerRegister />
        {/* Electron environment detection */}
        <ElectronDetector />
      </body>
    </html>
  );
}
