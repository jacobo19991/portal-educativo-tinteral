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
        // Eliminar solo las cachés de datos, preservando el tema (dark mode) y el historial de búsqueda
        localStorage.removeItem('materias_cache_v2');
        localStorage.removeItem('materias_cache_v1');
        sessionStorage.removeItem('drive_files_cache');

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
                            console.log('🔄 Nueva versión del portal disponible.');
                            mostrarAvisoActualizacionSW();
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
    const CACHE_KEY = 'materias_cache_v2';
    // Se redujo el TTL a 15 mins para desarrollo/producción dinámica
    const CACHE_TTL = 15 * 60 * 1000;

    try {
        // Fase 3: Verificar caché primero (si no es forceRefresh)
        const cachedStr = localStorage.getItem(CACHE_KEY);
        if (cachedStr && !forceRefresh) {
            const cached = JSON.parse(cachedStr);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                console.log("⚡ Usando caché reciente generada desde Apps Script.");
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

        console.info("Cargando datos desde Apps Script...");

        // Si no hay caché, intentamos obtener los datos con REINTENTOS
        if (window.AppConfig.USAR_APPS_SCRIPT && window.AppConfig.APPS_SCRIPT_URL) {
            let success = false;
            let asData = null;
            const maxRetries = 3;
            for (let i = 1; i <= maxRetries; i++) {
                try {
                    console.log(`[Intento ${i}/${maxRetries}] Consultando Apps Script...`);
                    const asRes = await fetchWithTimeout(window.AppConfig.APPS_SCRIPT_URL, {}, 20000);
                    asData = await asRes.json();
                    
                    if (asData && asData.tree) {
                        console.info("✅ Apps Script respondió correctamente");
                        success = true;
                        break;
                    }
                } catch (err) {
                    console.warn(`⚠️ Intento ${i} de Apps Script falló: ${err.message}`);
                    if (i < maxRetries) {
                        await new Promise(res => setTimeout(res, 2000));
                    }
                }
            }

            if (success && asData) {
                procesarDatosAppsScript(asData, CACHE_KEY);
                return; // Terminamos exitosamente con Apps Script
            }
        }

        console.warn("⚠️ Apps Script falló completamente.");
        /*
        // [MEJORA FUTURA] Supabase desactivado temporalmente para eliminar espera inútil de 8s.
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
        */
        throw new Error("Saltando directamente a Fallback local (Supabase deshabilitado)");
    } catch (error) {
        // Riesgo Cero: Si falla Supabase o el internet, el portal ya está usando materiasData.js (Fallback local)
        console.warn("⚠️ Fallo total: Usando Fallback local. Razón:", error.message);
        mostrarAvisoFallback();
        
        const cachedFallbackStr = localStorage.getItem(CACHE_KEY);
        if (cachedFallbackStr) {
             aplicarDatosMaterias(JSON.parse(cachedFallbackStr).data);
        } else if (window.MATERIAS_DATA && window.MATERIAS_DATA.niveles) {
             aplicarDatosMaterias(window.MATERIAS_DATA);
        }
    }
}

function mostrarAvisoFallback() {
    const contenedor = document.getElementById('contenedor-niveles');
    // Prevenir duplicados
    if (document.getElementById('aviso-fallback')) return;
    
    if (contenedor) {
        const aviso = document.createElement('div');
        aviso.id = 'aviso-fallback';
        aviso.style.backgroundColor = '#fdf2f8'; // Rosa tenue/profesional
        aviso.style.color = '#be185d';
        aviso.style.padding = '12px 16px';
        aviso.style.borderRadius = '8px';
        aviso.style.marginBottom = '15px';
        aviso.style.fontSize = '0.9rem';
        aviso.style.display = 'flex';
        aviso.style.alignItems = 'center';
        aviso.style.justifyContent = 'center';
        aviso.style.gap = '8px';
        aviso.style.border = '1px solid #fbcfe8';
        aviso.innerHTML = '<i>⚠️</i> <span>Mostrando estructura temporal. Pulsa <strong style="cursor:pointer; text-decoration:underline;" onclick="window.actualizarContenidoTotal && window.actualizarContenidoTotal(this)">Actualizar contenido</strong> para intentar cargar los datos desde Drive.</span>';
        contenedor.parentNode.insertBefore(aviso, contenedor);
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
        
        // Actualizar la fecha visual
        const lblFecha = document.getElementById('fecha-actualizacion');
        if (lblFecha) {
            lblFecha.innerText = new Date().toLocaleString('es-ES', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });
        }
    }
}

// Iniciar búsqueda en la base de datos inmediatamente después de pintar la página
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }
    fetchMateriasFromDB();
    
    // Configurar enlace dinámico de WhatsApp
    const btnReportar = document.getElementById('btn-reportar-problema');
    if (btnReportar && window.AppConfig && window.AppConfig.NUMERO_WHATSAPP) {
        const mensaje = encodeURIComponent("Hola, estoy usando el Portal Educativo del C.E. El Tinteral y necesito reportar el siguiente problema: ");
        btnReportar.href = `https://wa.me/${window.AppConfig.NUMERO_WHATSAPP}?text=${mensaje}`;
    }
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
        { name: 'inicial', icono: '🌱', cls: 'n1' },
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

function mostrarAvisoActualizacionSW() {
    if (document.getElementById('sw-update-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.style.position = 'fixed';
    banner.style.bottom = '20px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.backgroundColor = '#1e293b'; 
    banner.style.color = '#f8fafc';
    banner.style.padding = '10px 16px';
    banner.style.borderRadius = '30px';
    banner.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    banner.style.zIndex = '99999';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '12px';
    banner.style.fontSize = '13px';
    banner.style.fontWeight = '500';
    
    banner.innerHTML = `
        <span>Nueva versión disponible.</span>
        <button id="sw-update-btn" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:20px; cursor:pointer; font-weight:600; font-size:12px; transition: background 0.2s;">
            Actualizar
        </button>
    `;
    
    document.body.appendChild(banner);
    
    document.getElementById('sw-update-btn').addEventListener('click', () => {
        const btn = document.getElementById('sw-update-btn');
        btn.innerText = 'Actualizando...';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'wait';
        
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg && reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        }
        
        setTimeout(() => {
            localStorage.removeItem('materias_cache_v2');
            localStorage.removeItem('materias_cache_v1');
            window.location.reload(true);
        }, 300);
    });
}
