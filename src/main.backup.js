import './config/globals.js';
import './data/materiasData.js';
import { renderNiveles } from './components/materias.js';
import './components/buscador.js';
import './components/overlays.js';

import { fetchWithTimeout } from './utils/fetchUtils.js';

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('✅ ServiceWorker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.error('❌ Error al registrar el ServiceWorker:', error);
            });
    });
}

// Conexión asíncrona a Supabase (vía Vercel Proxy) con Caché (Fase 3: Optimización)
async function fetchMateriasFromDB() {
    const CACHE_KEY = 'materias_cache_v1';
    const CACHE_TTL = 60 * 60 * 1000; // 1 hora en milisegundos

    try {
        // Fase 3: Verificar caché primero
        const cachedStr = localStorage.getItem(CACHE_KEY);
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                console.log("⚡ Usando datos de materias desde caché local.");
                aplicarDatosMaterias(cached.data);
                
                // Actualización en segundo plano (SWR: Stale-While-Revalidate) para siempre tener lo último
                fetchWithTimeout('/api/materias', {}, 8000).then(res => res.json()).then(dbData => {
                    if (dbData && dbData.niveles && dbData.niveles.length > 0) {
                        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: dbData }));
                    }
                }).catch(() => {});
                return;
            } else {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        const res = await fetchWithTimeout('/api/materias', {}, 8000);
        const dbData = await res.json();
        
        // Si hay datos válidos en la Base de Datos, actualizamos la plataforma
        if (dbData && dbData.niveles && dbData.niveles.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: dbData }));
            aplicarDatosMaterias(dbData);
            console.log("✅ Datos frescos cargados desde Supabase (Base de Datos)");
        }
    } catch (error) {
        // Riesgo Cero: Si falla Supabase o el internet, el portal ya está usando materiasData.js (Fallback local)
        console.warn("⚠️ Aviso: Usando datos locales (Fallback). Razón:", error.message);
        const cachedFallbackStr = localStorage.getItem(CACHE_KEY);
        if (cachedFallbackStr) {
             aplicarDatosMaterias(JSON.parse(cachedFallbackStr).data);
        }
    }
}

function aplicarDatosMaterias(dbData) {
    if (dbData && dbData.niveles && dbData.niveles.length > 0) {
        window.MATERIAS_DATA = dbData;
        window.materiasDataCompleta = dbData.niveles;
        
        const contenedor = document.getElementById('contenedor-niveles');
        if (contenedor) {
            renderNiveles(dbData.niveles, contenedor);
        }
    }
}

// Iniciar búsqueda en la base de datos inmediatamente después de pintar la página
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }
    fetchMateriasFromDB();
});

// Detectar cambios en la conexión de red (Caché Offline Sólido)
window.addEventListener('offline', () => {
    if (window.Toast) {
        window.Toast.show('Sin conexión. Mostrando datos guardados en caché.', 'warning');
    }
    console.warn('[Network] Offline: Usando caché local.');
});

window.addEventListener('online', () => {
    if (window.Toast) {
        window.Toast.show('Conexión restaurada.', 'success');
    }
    console.log('[Network] Online: Conexión recuperada.');
});
