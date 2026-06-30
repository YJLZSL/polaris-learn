// Service Worker for Polaris - 北极星学习平台
// Cache strategy: Network first, fallback to cache

const CACHE_NAME = "polaris-v1";
const OFFLINE_URL = "/offline";

// Core shell resources to pre-cache on install
const SHELL_RESOURCES = [
  "/home",
  OFFLINE_URL,
  "/manifest.json",
  "/icon.svg",
];

// ===== Install Event =====
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching shell resources");
      return cache.addAll(SHELL_RESOURCES).catch((err) => {
        console.warn("[SW] Partial cache failure:", err);
      });
    })
  );
  // Activate immediately so new SW takes control
  self.skipWaiting();
});

// ===== Activate Event =====
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith("polaris-"))
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ===== Fetch Event: Network First with Cache Fallback =====
self.addEventListener("fetch", (event) => {
  // Only handle navigation and same-origin requests
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Let browser handle non-HTTP schemes
  if (!url.protocol.startsWith("http")) return;

  // Only cache same-origin resources (skip CDN, external APIs, etc.)
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses for future offline use
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      // Clone before putting into cache (response body can only be read once)
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Network failed, try cache
    console.log("[SW] Network failed, falling back to cache:", request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If it's a navigation request, return the offline page
    if (request.mode === "navigate") {
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) {
        return offlinePage;
      }
    }

    // Last resort: return a simple offline response
    return new Response(
      '<html lang="zh-CN"><head><meta charset="utf-8"><title>离线 - Polaris</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#334155"><div style="text-align:center"><div style="font-size:64px;margin-bottom:16px">📡</div><h1 style="margin:0 0 8px;font-size:24px">当前处于离线状态</h1><p style="margin:0;color:#64748b">请检查网络连接后重试</p></div></body></html>',
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
