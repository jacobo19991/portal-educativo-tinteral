const CACHE_NAME = 'portal-educativo-v11';
const STATIC_ASSETS = [
    './',
    './index.html',
    './assets/css/main.css',
    './src/main.js',
    './src/config/globals.js',
    './src/data/materiasData.js',
    './src/components/materias.js',
    './src/components/buscador.js',
    './src/components/overlays.js',
    'https://unpkg.com/lucide@0.468.0',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap'
];

// Extensiones propias del proyecto que cambian con frecuencia durante el
// desarrollo (JS/CSS del portal). Para estos NO usamos "cache first": si lo
// hiciéramos, una vez cacheado un archivo, el navegador seguiría sirviendo
// la versión vieja indefinidamente hasta que cambiara sw.js (y eso solo pasa
// cuando se toca este mismo archivo). Por eso van con Network First.
function esArchivoPropioDelProyecto(url) {
    return url.origin === self.location.origin && /\.(js|css)$/i.test(url.pathname);
}

// Función para limitar el número de elementos en caché dinámica
function limitCacheSize(name, size) {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > size) {
                cache.delete(keys[0]).then(() => limitCacheSize(name, size));
            }
        });
    });
}

// Instalación del Service Worker (Cacheo inicial de assets estáticos)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Cacheando archivos estáticos de forma segura');
            // Usar Promise.allSettled evita que el SW falle completamente si un solo archivo falla
            return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)));
        })
    );
    self.skipWaiting();
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => {
                        console.log('[Service Worker] Limpiando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        })
    );
    self.clients.claim();
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
    // Ignorar peticiones que no sean http o https (ej. extensiones de chrome)
    if (!event.request.url.startsWith('http')) return;

    const url = new URL(event.request.url);

    // Excluir archivos pesados (PDFs, videos, audios) para no inflar la caché accidentalmente
    if (url.pathname.match(/\.(pdf|mp4|webm|avi|mp3|wav|ogg)$/i)) {
        event.respondWith(fetch(event.request));
        return;
    }

    // ESTRATEGIA: NETWORK ONLY para Drive (Evita romper visor PDF y desbordar caché con archivos pesados)
    if (url.hostname.includes('drive.google.com') || url.hostname.includes('docs.google.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // ESTRATEGIA: NETWORK FIRST para llamadas a la API (Base de datos / Supabase)
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (event.request.method === 'GET' && response.status === 200) {
                        const isBypass = url.searchParams.get('refresh') === 'true' || url.searchParams.get('admin') === 'true';
                        
                        if (!isBypass) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone);
                                limitCacheSize(CACHE_NAME, 50); // Limpiar caché si excede 50 items
                            });
                        }
                    }
                    return response;
                })
                .catch(() => {
                    console.warn('[Service Worker] Red falló, intentando servir desde caché la API:', event.request.url);
                    return caches.match(event.request);
                })
        );
        return;
    }

    // ESTRATEGIA: NETWORK FIRST para HTML (Asegura versión más reciente de Vercel)
    if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    console.warn('[Service Worker] Red falló, intentando servir HTML desde caché');
                    return caches.match(event.request).then(cached => cached || caches.match('./index.html'));
                })
        );
        return;
    }

    // ESTRATEGIA: NETWORK FIRST para el JS/CSS propio del portal
    // (Garantiza que un cambio en materias.js, overlays.js, etc. se vea
    // en el siguiente refresco, sin depender de que sw.js también cambie)
    if (esArchivoPropioDelProyecto(url)) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    console.warn('[Service Worker] Red falló, sirviendo JS/CSS desde caché:', event.request.url);
                    return caches.match(event.request);
                })
        );
        return;
    }

    // ESTRATEGIA: CACHE FIRST para recursos verdaderamente estáticos
    // (Fuentes, íconos, imágenes, librerías de terceros con versión fija en la URL)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // No cachear peticiones de Google Fonts indiscriminadamente para evitar fallos
                if (event.request.method === 'GET' && networkResponse.status === 200 && !url.hostname.includes('fonts.googleapis.com')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                        limitCacheSize(CACHE_NAME, 60); // Límite para estáticos dinámicos
                    });
                }
                return networkResponse;
            }).catch(() => {
                console.error('[Service Worker] Fallo al cargar el recurso:', event.request.url);
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// Permitir actualización forzada desde el navegador
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
