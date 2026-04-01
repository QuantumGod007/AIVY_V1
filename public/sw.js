/**
 * AIVY Service Worker — Phase 7: PWA Offline Support
 *
 * Strategy:
 *  - App Shell (HTML, CSS, JS bundles): Cache First
 *  - Gemini API + Firebase calls: Network First (never cached — always fresh)
 *  - Static assets (fonts, icons): Stale While Revalidate
 *  - Offline fallback: show offline.html if network unavailable
 */

const CACHE_VERSION = 'aivy-v4'   // ← bumped: forces all old caches to clear
const SHELL_CACHE    = `${CACHE_VERSION}-shell`
const ASSET_CACHE    = `${CACHE_VERSION}-assets`
const OFFLINE_URL    = '/offline.html'

// App Shell files — cached on install
const SHELL_FILES = [
    '/',
    '/offline.html',
    '/manifest.json'
]

// External domains that should NEVER be cached
const NEVER_CACHE = [
    'generativelanguage.googleapis.com', // Gemini API
    'firestore.googleapis.com',           // Firestore
    'identitytoolkit.googleapis.com',     // Firebase Auth
    'securetoken.googleapis.com',         // Firebase tokens
    'firebase.googleapis.com'
]

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then(cache => cache.addAll(SHELL_FILES))
            .then(() => self.skipWaiting())
    )
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k.startsWith('aivy-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Skip non-GET requests
    if (request.method !== 'GET') return

    // Skip cross-origin API calls — always network
    if (NEVER_CACHE.some(domain => url.hostname.includes(domain))) return

    // Skip chrome-extension / non-http(s)
    if (!url.protocol.startsWith('http')) return

    // Navigation requests → Network First, fall back to offline page
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match(OFFLINE_URL))
        )
        return
    }

    // Static assets (fonts, images, icons) → Stale While Revalidate
    if (
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        request.destination === 'image' ||
        request.destination === 'font'
    ) {
        event.respondWith(staleWhileRevalidate(ASSET_CACHE, request))
        return
    }

    // JS / CSS → Network First (ALWAYS fetch fresh — never serve stale code)
    if (request.destination === 'script' || request.destination === 'style') {
        event.respondWith(networkFirst(request))
        return
    }

    // Everything else → Network First
    event.respondWith(networkFirst(request))
})

// ─── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(cacheName, request) {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
        const res = await fetch(request)
        if (res.ok) {
            const cache = await caches.open(cacheName)
            cache.put(request, res.clone())
        }
        return res
    } catch {
        return new Response('Offline', { status: 503 })
    }
}

async function networkFirst(request) {
    try {
        const res = await fetch(request)
        return res
    } catch {
        const cached = await caches.match(request)
        return cached || new Response('Offline', { status: 503 })
    }
}

async function staleWhileRevalidate(cacheName, request) {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    const fetchPromise = fetch(request).then(res => {
        if (res.ok) cache.put(request, res.clone())
        return res
    })
    return cached || await fetchPromise
}

// ─── Background Sync — Offline Queue ─────────────────────────────────────────

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
