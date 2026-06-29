"use client";

import { useEffect, useState } from "react";

/**
 * ServiceWorkerRegister - Registers the service worker on mount.
 * Handles registration lifecycle and auto-updates when a new SW is detected.
 */
export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // 检测 Capacitor 原生环境
    const isCapacitorNative =
      typeof window !== "undefined" &&
      (window as any).Capacitor?.isNativePlatform === true;

    if (isCapacitorNative) {
      // 原生 App 环境不需要 Service Worker
      return;
    }

    // 检测新 Service Worker 接管 (PWA 更新)
    const handleControllerChange = () => setUpdateAvailable(true);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Small delay to not block initial render
    const timer = setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);

          // 若已有新的 SW 等待接管,提示更新并加速激活
          if (registration.waiting) {
            setUpdateAvailable(true);
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          // Check for updates on page navigation
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("[PWA] New content available, please refresh.");
                setUpdateAvailable(true);
                // You could show a toast here, but for now we rely on the
                // automatic skipWaiting() in the SW's install event.
              }
            });
          });
        })
        .catch((error) => {
          console.warn("[PWA] Service Worker registration failed:", error);
        });
    }, 1000);

    return () => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#0891b2",
        color: "white",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "14px",
      }}
    >
      <span>🔄 发现新版本,点击刷新</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: "white",
          color: "#0891b2",
          padding: "4px 12px",
          borderRadius: "6px",
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
        }}
      >
        刷新
      </button>
    </div>
  );
}
