import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * ServiceWorkerRegister - Registers the service worker on mount.
 * Handles registration lifecycle and auto-updates when a new SW is detected.
 * In native Capacitor environments the SW is skipped; in web/PWA it is registered
 * and relies on the CacheFirst strategy defined in /sw.js.
 */
export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      console.log("[PWA] Native Capacitor platform detected, skipping Service Worker registration");
      return;
    }

    const handleControllerChange = () => setUpdateAvailable(true);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    const timer = setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);

          if (registration.waiting) {
            setUpdateAvailable(true);
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

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
      <span>🔄 发现新版本，点击刷新</span>
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
