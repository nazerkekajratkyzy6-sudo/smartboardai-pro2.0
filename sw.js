// =====================================================
// SmartBoardAI PRO —  Service Worker
// Офлайн режим + кэш стратегиясы
// =====================================================

const CACHE_NAME    = "smartboard-v1";
const CACHE_STATIC  = "smartboard-static-v1";
const CACHE_DYNAMIC = "smartboard-dynamic-v1";

// Кэштелетін статикалық файлдар
const STATIC_ASSETS = [
  "/",
  "/teacher.html",
  "/teacher.js",
  "/main.css",
  "/student.html",
  "/student.js",
  "/hub.html",
  "/firebaseConfig.js",
  "/lessonCabinet.js",
  "/extras.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
];

// ── Install ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(
        STATIC_ASSETS.filter(url => !url.startsWith("http"))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
            .map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API сұраныстары —  network first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Firebase —  тікелей желі
  if (request.url.includes("firebaseio.com") ||
      request.url.includes("googleapis.com/v1/projects") ||
      request.url.includes("firebase")) {
    return; // SW-дан өтпейді
  }

  // Навигация (HTML) —  network first + fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  // Статикалық файлдар —  cache first
  if (request.method === "GET") {
    event.respondWith(cacheFirstStatic(request));
  }
});

// ── Cache first (статика үшін) ───────────────────────
async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Офлайн режим —  ресурс қолжетімді емес", {
      status: 503,
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
  }
}

// ── Network first (HTML үшін) ────────────────────────
async function networkFirstHTML(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Офлайн fallback
    return new Response(`<!DOCTYPE html>
<html lang="kk">
<head><meta charset="UTF-8"><title>Офлайн —  SmartBoardAI PRO</title>
<style>
  body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f2f8;}
  .box{background:white;border-radius:20px;padding:40px;text-align:center;max-width:360px;box-shadow:0 10px 40px rgba(15,23,42,0.12);}
  h1{font-size:48px;margin-bottom:12px;}
  h2{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:8px;}
  p{color:#64748b;font-size:14px;line-height:1.6;}
  button{margin-top:16px;padding:12px 24px;border:none;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:14px;font-weight:700;cursor:pointer;}
</style></head>
<body>
  <div class="box">
    <h1>📡</h1>
    <h2>Офлайн режим</h2>
    <p>Интернет байланысы жоқ.<br>Кэштелген сабақтар қолжетімді.</p>
    <button onclick="location.reload()">🔄 Қайталау</button>
  </div>
</body></html>`, {
      status: 200,
      headers: { "Content-Type": "text/html;charset=utf-8" }
    });
  }
}

// ── Network first (API үшін) ─────────────────────────
async function networkFirstAPI(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    return new Response(JSON.stringify({
      error: "Офлайн режим —  API қолжетімді емес",
      answer: "Интернет байланысын тексеріңіз"
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// ── Background Sync ──────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-data") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Clients-ке sync сигналы жіберу
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: "SYNC_NEEDED" });
  });
}

// ── Push notifications ───────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || "SmartBoardAI PRO", {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge.png",
    data: { url: data.url || "/" }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
