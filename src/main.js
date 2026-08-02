import './config/globals.js';
import './data/materiasData.js';
import { renderNiveles } from './components/materias.js';
import './components/buscador.js';
import './components/overlays.js';
import './components/docentesPinModal.js';
import './components/adminPinModal.js';

import { fetchWithTimeout } from './utils/fetchUtils.js';

// Utilidad segura para manipular localStorage
const SecureStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Error leyendo localStorage:', e);
      return null;
    }
  },
  
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('Error escribiendo localStorage:', e);
      return false;
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('Error removiendo localStorage:', e);
      return false;
    }
  }
};

// Utilidad segura para manipular sessionStorage
const SecureSessionStorage = {
  getItem: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn('Error leyendo sessionStorage:', e);
      return null;
    }
  },
  
  setItem: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('Error escribiendo sessionStorage:', e);
      return false;
    }
  },
  
  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('Error removiendo sessionStorage:', e);
      return false;
    }
  }
};

window.actualizarContenidoTotal = async function (btn) {
    if (btn) {
        btn.disabled = true;
        btn.classList.add('is-loading');
    }
    if (window.Toast) window.Toast.show('Actualizando contenido…', 'info');

    try {
        SecureStorage.removeItem('materias_cache_v2');
        SecureStorage.removeItem('materias_cache_v1');
        SecureSessionStorage.removeItem('drive_files_cache');

        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }
    } catch (error) {
        console.error('❌ Error al actualizar contenido:', error);
    } finally {
        setTimeout(() => window.location.reload(true), 500);
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

// Carga asíncrona de estructura de Drive vía Apps Script
async function cargarContenidoEducativo(forceRefresh = false) {
    const CACHE_KEY = 'materias_cache_v2';
    // Se redujo el TTL a 15 mins para desarrollo/producción dinámica
    const CACHE_TTL = 15 * 60 * 1000;

    try {
        // Fase 3: Verificar caché primero (si no es forceRefresh)
        const cachedStr = SecureStorage.getItem(CACHE_KEY);
        if (cachedStr && !forceRefresh) {
            try {
                const cached = JSON.parse(cachedStr);
                if (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL)) {
                    console.log("⚡ Usando caché reciente generada desde Apps Script.");
                    aplicarDatosMaterias(cached.data);
                    
                    // Actualización en segundo plano
                    if (window.AppConfig.USAR_APPS_SCRIPT && window.AppConfig.APPS_SCRIPT_URL) {
                        fetchWithTimeout(window.AppConfig.APPS_SCRIPT_URL, {}, 10000)
                            .then(res => res.json())
                            .then(asData => procesarDatosAppsScript(asData, CACHE_KEY))
                            .catch(() => console.warn("Fallo actualización en background de Apps Script"));
                    }
                    return;
                }
            } catch (parseErr) {
                console.warn('Error parseando caché:', parseErr);
                SecureStorage.removeItem(CACHE_KEY);
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

        console.warn("⚠️ Apps Script falló completamente. Saltando a Fallback local.");
        throw new Error("Apps Script inaccesible");
    } catch (error) {
        console.warn("⚠️ Fallo total: Usando Fallback local. Razón:", error.message);
        mostrarAvisoFallback();
        
        try {
            const cachedFallbackStr = SecureStorage.getItem(CACHE_KEY);
            if (cachedFallbackStr) {
                const parsed = JSON.parse(cachedFallbackStr);
                if (parsed && parsed.data) {
                    aplicarDatosMaterias(parsed.data);
                }
            } else if (window.MATERIAS_DATA && window.MATERIAS_DATA.niveles) {
                aplicarDatosMaterias(window.MATERIAS_DATA);
            }
        } catch (fallbackErr) {
            console.error('Error procesando fallback:', fallbackErr);
            // Mostrar mensaje de error crítico
            const contenedor = document.getElementById('contenedor-niveles');
            if (contenedor) {
                contenedor.innerHTML = '<div class="error-banner">⚠️ No se pudo cargar el contenido. Por favor, recarga la página.</div>';
            }
        }
    }
}

function mostrarAvisoFallback() {
    const contenedor = document.getElementById('contenedor-niveles');
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
        
        const icon = document.createElement('i');
        icon.textContent = '⚠️';
        
        const text = document.createElement('span');
        text.textContent = 'Mostrando estructura temporal. Pulsa ';
        
        const actionBtn = document.createElement('strong');
        actionBtn.textContent = 'Actualizar contenido';
        actionBtn.style.cursor = 'pointer';
        actionBtn.style.textDecoration = 'underline';
        actionBtn.addEventListener('click', () => {
            if (window.actualizarContenidoTotal) window.actualizarContenidoTotal(actionBtn);
        });
        
        const afterText = document.createElement('span');
        afterText.textContent = ' para intentar cargar los datos desde Drive.';
        
        text.appendChild(actionBtn);
        text.appendChild(afterText);
        
        aviso.appendChild(icon);
        aviso.appendChild(text);
        
        contenedor.parentNode.insertBefore(aviso, contenedor);
    }
}

function aplicarDatosMaterias(dbData) {
    if (dbData && dbData.niveles && Array.isArray(dbData.niveles) && dbData.niveles.length > 0) {
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

// Cargar la estructura educativa inmediatamente de forma instantánea y actualizar en segundo plano
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }

    // Pintado instantáneo si existen datos locales
    if (window.MATERIAS_DATA && window.MATERIAS_DATA.niveles) {
        aplicarDatosMaterias(window.MATERIAS_DATA);
    }

    cargarContenidoEducativo();
    
    // Configurar enlace de Reportar Problema
    const btnReportar = document.getElementById('btn-reportar-problema');
    if (btnReportar) {
        btnReportar.href = window.AppConfig?.FORMULARIO_REPORTES_URL || 'https://forms.gle/eDrth5nJ2drQSfUC7';
    }
});

// Exponer función de recarga completa para overlays.js
window.refrescarMenuYArchivos = async function() {
    SecureStorage.removeItem('materias_cache_v1');
    SecureSessionStorage.removeItem('drive_files_cache');
    await cargarContenidoEducativo(true);
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
    
    if (asData.warnings && Array.isArray(asData.warnings) && asData.warnings.length > 0) {
        console.warn("⚠️ AVISO DE GOOGLE DRIVE: Se encontraron elementos fuera de jerarquía:");
        asData.warnings.forEach(w => console.warn("- " + (w || 'Advertencia desconocida')));
    }
    
    try {
        const nivelesAdaptados = adaptarAppsScriptASupabase(asData.tree);
        
        // Guardar los archivos de las materias para uso inmediato en overlays.js
        if (asData.filesByFolderId) {
            try {
                SecureSessionStorage.setItem('drive_files_cache', JSON.stringify({
                    timestamp: Date.now(),
                    data: asData.filesByFolderId
                }));
            } catch (e) {
                console.warn('No se pudo guardar caché de archivos:', e);
            }
        }
        
        const finalData = { niveles: nivelesAdaptados };
        SecureStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: finalData }));
        aplicarDatosMaterias(finalData);
    } catch (adaptErr) {
        console.error('Error adaptando datos de Apps Script:', adaptErr);
    }
}



function adaptarAppsScriptASupabase(tree) {
    // 1. Ordenar Niveles por el número inicial (ej. "1-INICIAL" -> 1)
    if (!Array.isArray(tree)) return [];
    
    tree.sort((a, b) => {
        const numA = a && a.nivel ? parseInt(a.nivel.split('-')[0]) || 99 : 99;
        const numB = b && b.nivel ? parseInt(b.nivel.split('-')[0]) || 99 : 99;
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
        if (!nivel.grados || !Array.isArray(nivel.grados)) return;
        // Ordenar grados según el arreglo ordenGrados
        nivel.grados.sort((a, b) => {
            const idxA = ordenGrados.indexOf(a && a.grado);
            const idxB = ordenGrados.indexOf(b && b.grado);
            if (idxA === -1 && idxB === -1) return (a && a.grado || '').localeCompare(b && b.grado || '');
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

        // 3. Ordenar materias alfabéticamente
        nivel.grados.forEach(grado => {
            if (grado.materias && Array.isArray(grado.materias)) {
                grado.materias.sort((a, b) => {
                    const nombreA = a && a.materia ? a.materia.toLowerCase() : '';
                    const nombreB = b && b.materia ? b.materia.toLowerCase() : '';
                    return nombreA.localeCompare(nombreB);
                });
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
        if (!nivel || !nivel.nivel) return null;
        
        const confNivel = configNiveles.find(c => nivel.nivel.toLowerCase().includes(c.name)) || { icono: '📁', cls: 'n1' };
        
        const nivelResult = {
            id: `as_n_${i}`,
            nombre: nivel.nivel.replace(/^\d+-\s*/, ''),
            icono: confNivel.icono,
            claseColor: confNivel.cls,
            grados: (nivel.grados || []).map((grado, j) => {
                if (!grado || !grado.grado) return null;
                
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
                    materias: (grado.materias || []).map((mat, k) => {
                        if (!mat || !mat.materia) return null;
                        return {
                            id: `as_m_${i}_${j}_${k}`,
                            nombre: mat.materia,
                            folderId: mat.id || ''
                        };
                    }).filter(Boolean)
                };
            }).filter(Boolean)
        };
        
        return nivelResult;
    }).filter(Boolean);
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
    
    const updateBtn = document.getElementById('sw-update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            const btn = document.getElementById('sw-update-btn');
            if (btn) {
                btn.innerText = 'Actualizando...';
                btn.style.opacity = '0.7';
                btn.style.cursor = 'wait';
            }
            
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg && reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                }).catch(e => console.warn('Error al obtener registro SW:', e));
            }
            
            setTimeout(() => {
                SecureStorage.removeItem('materias_cache_v2');
                SecureStorage.removeItem('materias_cache_v1');
                window.location.reload(true);
            }, 500);
        });
    }
}