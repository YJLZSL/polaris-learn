// Service Worker for Polaris - 北极星学习平台
// Cache strategy: CacheFirst for static assets; index.html fallback for navigation.

const CACHE_NAME = "polaris-v1";

// Core shell resources to pre-cache on install.
// Only actual files are listed here — no SPA route URLs like /home or /offline.
const SHELL_RESOURCES = [
  "/",
  "/index.html",
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

// ===== Fetch Event: Cache First =====
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Let browser handle non-HTTP schemes
  if (!url.protocol.startsWith("http")) return;

  // Only cache same-origin resources (skip CDN, external APIs, etc.)
  if (url.origin !== self.location.origin) return;

  // Navigation requests always fallback to index.html so the SPA can route.
  if (request.mode === "navigate") {
    event.respondWith(cacheFirstWithIndexFallback(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_error) {
    console.log("[SW] Network failed and no cache available:", request.url);
    throw _error;
  }
}

async function cacheFirstWithIndexFallback(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const cachedIndex = await caches.match("/index.html");
  if (cachedIndex) {
    return cachedIndex;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_error) {
    return new Response(
      '<html lang="zh-CN"><head><meta charset="utf-8"><title>离线 - Polaris</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0B0F19;color:#f8fafc"><div style="text-align:center"><div style="font-size:48px;margin-bottom:16px">🌟</div><h1 style="margin:0 0 8px;font-size:20px">Polaris 离线了</h1><p style="margin:0;color:#94a3b8">请检查网络连接后重试</p></div></body></html>',
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

// Listen for SKIP_WAITING messages from the client to activate immediately.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
