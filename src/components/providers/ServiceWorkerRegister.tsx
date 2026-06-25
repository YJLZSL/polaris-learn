"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegister - Registers the service worker on mount.
 * Handles registration lifecycle and auto-updates when a new SW is detected.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Small delay to not block initial render
    const timer = setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);

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

    return () => clearTimeout(timer);
  }, []);

  return null;
}
