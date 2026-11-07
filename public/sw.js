/*
 * Service worker de Bien-aimés.
 *
 * - Pages publiques : réseau d'abord, copie en cache pour une consultation hors ligne,
 *   sinon page « hors ligne ».
 * - Fichiers statiques de Next.js (/_next/static, versionnés) et icônes : cache d'abord.
 * - Jamais mis en cache : espace d'administration, connexion, API, requêtes non GET,
 *   requêtes vers d'autres domaines (Supabase, audio) et flux audio (requêtes partielles).
 *
 * Changer VERSION pour forcer le renouvellement des caches.
 */
const VERSION = "v1";
const STATIC_CACHE = `bien-aimes-static-${VERSION}`;
const PAGES_CACHE = `bien-aimes-pages-${VERSION}`;
const OFFLINE_URL = "/hors-ligne";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon.svg"];
const MAX_PAGES = 40;

const PRIVATE_PREFIXES = ["/admin", "/connexion", "/api", "/auth"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("bien-aimes-") && key !== STATIC_CACHE && key !== PAGES_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isPrivate(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(request, response.clone());
      trimCache(PAGES_CACHE, MAX_PAGES);
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? new Response("Hors ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivate(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigations complètes uniquement : les requêtes internes de Next.js (RSC) restent sur le réseau.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});
