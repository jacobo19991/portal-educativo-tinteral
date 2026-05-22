const CACHE_NAME = 'tinteral-pwa-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/main.css',
    '/src/main.js',
    '/src/config/globals.js',
    '/src/data/materiasData.js',
    '/src/components/materias.js',
    '/src/components/buscador.js',
    '/src/components/overlays.js',
    '/src/utils/debounce.js',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Instalación del Service Worker (Cacheo inicial de assets estáticos)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Cacheando archivos estáticos');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Limpiando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // ESTRATEGIA: NETWORK FIRST para llamadas a la API (Base de datos) y Drive
    if (url.pathname.startsWith('/api/') || url.hostname.includes('drive.google.com') || url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clonar y guardar la respuesta en caché para acceso offline futuro si es GET
                    if (event.request.method === 'GET' && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Si la red falla, intentar servir desde la caché
                    console.warn('[Service Worker] Red falló, intentando servir desde caché la API:', event.request.url);
                    return caches.match(event.request);
                })
        );
        return;
    }

    // ESTRATEGIA: CACHE FIRST para recursos estáticos (HTML, CSS, JS, Fuentes, Imágenes)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            // Si no está en caché, ir a la red
            return fetch(event.request).then((networkResponse) => {
                if (event.request.method === 'GET' && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Falla absoluta (offline sin caché)
                console.error('[Service Worker] Fallo al cargar el recurso:', event.request.url);
            });
        })
    );
});
