import './config/globals.js';
import './data/materiasData.js';
import { renderNiveles } from './components/materias.js';
import './components/buscador.js';
import './components/overlays.js';

import { fetchWithTimeout } from './utils/fetchUtils.js';

// Reseteo TOTAL del contenido: borra localStorage, sessionStorage y,
// crucialmente, el Cache Storage del Service Worker (que "Actualizar
// contenido" antes NO tocaba, por lo que el JS/CSS viejo seguía sirviéndose).
window.actualizarContenidoTotal = async function (btn) {
    if (btn) {
        btn.disabled = true;
        btn.classList.add('is-loading');
    }
    if (window.Toast) window.Toast.show('Actualizando contenido…', 'info');

    try {
        localStorage.clear();
        sessionStorage.clear();

        if ('caches' in window) {
            const nombres = await caches.keys();
            await Promise.all(nombres.map((nombre) => caches.delete(nombre)));
        }

        if ('serviceWorker' in navigator) {
            const registros = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registros.map((reg) => reg.unregister()));
        }
    } catch (error) {
        console.error('❌ Error al limpiar caché/Service Worker:', error);
    } finally {
        // Recarga forzada desde el servidor (bypassa la caché HTTP del navegador)
        window.location.reload(true);
    }
};

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('✅ ServiceWorker registrado con éxito:', registration.scope);
                
                // Detectar actualización silenciosa del Service Worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        // Si hay un nuevo SW instalado y ya había un controlador previo
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 Nueva versión del portal disponible. Actualizando...');
                            if (window.Toast) {
                                window.Toast.show('Actualizando a la nueva versión...', 'info');
                            }
                            // Recargar automáticamente una vez para aplicar cambios
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('❌ Error al registrar el ServiceWorker:', error);
            });
    });
}

// Conexión asíncrona a Supabase (vía Vercel Proxy) con Caché (Fase 3: Optimización)
async function fetchMateriasFromDB(forceRefresh = false) {
    const CACHE_KEY = 'materias_cache_v1';
    // Se redujo el TTL a 15 mins para desarrollo/producción dinámica
    const CACHE_TTL = 15 * 60 * 1000;

    try {
        // Fase 3: Verificar caché primero (si no es forceRefresh)
        const cachedStr = localStorage.getItem(CACHE_KEY);
        if (cachedStr && !forceRefresh) {
            const cached = JSON.parse(cachedStr);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                console.log("⚡ Usando datos de materias desde caché local.");
                aplicarDatosMaterias(cached.data);
                
                // Actualización en segundo plano
                if (window.AppConfig.USAR_APPS_SCRIPT && window.AppConfig.APPS_SCRIPT_URL) {
                    fetchWithTimeout(window.AppConfig.APPS_SCRIPT_URL, {}, 10000)
                        .then(res => res.json())
                        .then(asData => procesarDatosAppsScript(asData, CACHE_KEY))
                        .catch(() => fallbackBackgroundSupabase(CACHE_KEY));
                } else {
                    fallbackBackgroundSupabase(CACHE_KEY);
                }
                return;
            } else {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        // Si no hay caché, intentamos obtener los datos
        if (window.AppConfig.USAR_APPS_SCRIPT && window.AppConfig.APPS_SCRIPT_URL) {
            try {
                const asRes = await fetchWithTimeout(window.AppConfig.APPS_SCRIPT_URL, {}, 30000);
                const asData = await asRes.json();
                
                if (asData && asData.tree) {
                    console.log("✅ Datos frescos cargados desde Apps Script (Drive Dinámico)");
                    procesarDatosAppsScript(asData, CACHE_KEY);
                    return; // Terminamos exitosamente con Apps Script
                }
            } catch (err) {
                console.warn("⚠️ Apps Script falló o tardó demasiado. Ejecutando fallback a Supabase.", err.message);
            }
        }

        const res = await fetchWithTimeout('/api/materias', {}, 8000);
        const dbData = await res.json();
        
        // Si hay datos válidos en la Base de Datos, actualizamos la plataforma
        if (dbData && dbData.niveles && dbData.niveles.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: dbData }));
            aplicarDatosMaterias(dbData);
            console.log("✅ Datos frescos cargados desde Supabase (Base de Datos)");
        } else {
            throw new Error("Supabase devolvió datos inválidos o vacíos (ej. faltan credenciales)");
        }
    } catch (error) {
        // Riesgo Cero: Si falla Supabase o el internet, el portal ya está usando materiasData.js (Fallback local)
        console.warn("⚠️ Aviso: Usando datos locales (Fallback). Razón:", error.message);
        const cachedFallbackStr = localStorage.getItem(CACHE_KEY);
        if (cachedFallbackStr) {
             aplicarDatosMaterias(JSON.parse(cachedFallbackStr).data);
        } else if (window.MATERIAS_DATA && window.MATERIAS_DATA.niveles) {
             aplicarDatosMaterias(window.MATERIAS_DATA);
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

// Exponer función de recarga completa para overlays.js
window.refrescarMenuYArchivos = async function() {
    localStorage.removeItem('materias_cache_v1');
    sessionStorage.removeItem('drive_files_cache');
    await fetchMateriasFromDB(true);
};

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

// -- Funciones auxiliares para la integración de Apps Script --

function procesarDatosAppsScript(asData, cacheKey) {
    if (!asData || !asData.tree) return;
    
    if (asData.warnings && asData.warnings.length > 0) {
        console.warn("⚠️ AVISO DE GOOGLE DRIVE: Se encontraron elementos fuera de jerarquía:");
        asData.warnings.forEach(w => console.warn("- " + w));
    }
    
    const nivelesAdaptados = adaptarAppsScriptASupabase(asData.tree);
    
    // Guardar los archivos de las materias para uso inmediato en overlays.js
    if (asData.filesByFolderId) {
        sessionStorage.setItem('drive_files_cache', JSON.stringify({
            timestamp: Date.now(),
            data: asData.filesByFolderId
        }));
    }
    
    const finalData = { niveles: nivelesAdaptados };
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: finalData }));
    aplicarDatosMaterias(finalData);
}

function fallbackBackgroundSupabase(cacheKey) {
    fetchWithTimeout('/api/materias', {}, 8000).then(res => res.json()).then(dbData => {
        if (dbData && dbData.niveles && dbData.niveles.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: dbData }));
            // Note: En SWR no llamamos a aplicarDatosMaterias para evitar parpadeos,
            // pero si necesitamos pintar, se haría aquí.
        }
    }).catch(() => {});
}

function adaptarAppsScriptASupabase(tree) {
    // 1. Ordenar Niveles por el número inicial (ej. "1-INICIAL" -> 1)
    tree.sort((a, b) => {
        const numA = parseInt(a.nivel.split('-')[0]) || 99;
        const numB = parseInt(b.nivel.split('-')[0]) || 99;
        return numA - numB;
    });

    // 2. Orden lógico de grados
    const ordenGrados = [
        "Inicial", "Parvularia 5 años", "Parvularia 6 años", 
        "Primer Grado - Sección A", "Primer Grado - Sección B", "Primer Grado",
        "Segundo Grado - Sección A", "Segundo Grado - Sección B", "Segundo Grado",
        "Tercer Grado - Sección A", "Tercer Grado - Sección B", "Tercer Grado",
        "Cuarto Grado - Sección A", "Cuarto Grado - Sección B", "Cuarto Grado",
        "Quinto Grado - Sección A", "Quinto Grado - Sección B", "Quinto Grado",
        "Sexto Grado", "Séptimo Grado", "Octavo Grado", "Noveno Grado",
        "Primer Año", "Segundo Año", "Tercer Año"
    ];

    tree.forEach(nivel => {
        // Ordenar grados según el arreglo ordenGrados
        nivel.grados.sort((a, b) => {
            const idxA = ordenGrados.indexOf(a.grado);
            const idxB = ordenGrados.indexOf(b.grado);
            if (idxA === -1 && idxB === -1) return a.grado.localeCompare(b.grado);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

        // 3. Ordenar materias alfabéticamente
        nivel.grados.forEach(grado => {
            if (grado.materias) {
                grado.materias.sort((a, b) => a.materia.localeCompare(b.materia));
            }
        });
    });
    const configNiveles = [
        { name: 'parvularia', icono: '🌱', cls: 'n1' },
        { name: 'primer ciclo', icono: '📗', cls: 'n2' },
        { name: 'segundo ciclo', icono: '📙', cls: 'n3' },
        { name: 'tercer ciclo', icono: '📕', cls: 'n4' },
        { name: 'bachillerato', icono: '🎓', cls: 'n5' }
    ];

    return tree.map((nivel, i) => {
        const confNivel = configNiveles.find(c => nivel.nivel.toLowerCase().includes(c.name)) || { icono: '📁', cls: 'n1' };
        
        return {
            id: `as_n_${i}`,
            nombre: nivel.nivel.replace(/^\d+-\s*/, ''),
            icono: confNivel.icono,
            claseColor: confNivel.cls,
            grados: (nivel.grados || []).map((grado, j) => {
                let gIcon = '📘';
                if(confNivel.icono.includes('🌱')) gIcon = '👶';
                else if(confNivel.icono.includes('📗')) gIcon = '📗';

                // Generar un nombre abreviado heurístico (ej: "1° Grado")
                let abreviado = grado.grado;
                const numMatch = grado.grado.match(/\d+/);
                if (numMatch) abreviado = `${numMatch[0]}°`;

                return {
                    id: `as_g_${i}_${j}`,
                    nombre: grado.grado,
                    nombreAbreviado: abreviado,
                    icono: gIcon,
                    pin: "0000",
                    materias: (grado.materias || []).map((mat, k) => ({
                        id: `as_m_${i}_${j}_${k}`,
                        nombre: mat.materia,
                        folderId: mat.id
                    }))
                };
            })
        };
    });
}
