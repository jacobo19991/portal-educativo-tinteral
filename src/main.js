import './config/globals.js';
import { MATERIAS_DATA } from './data/materiasData.js';
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
        } catch (error) {
            console.warn('Error leyendo localStorage:', error);
            return null;
        }
    },

    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.warn('Error escribiendo localStorage:', error);
            return false;
        }
    },

    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Error eliminando datos de localStorage:', error);
            return false;
        }
    }
};

// Utilidad segura para manipular sessionStorage
const SecureSessionStorage = {
    getItem: (key) => {
        try {
            return sessionStorage.getItem(key);
        } catch (error) {
            console.warn('Error leyendo sessionStorage:', error);
            return null;
        }
    },

    setItem: (key, value) => {
        try {
            sessionStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.warn('Error escribiendo sessionStorage:', error);
            return false;
        }
    },

    removeItem: (key) => {
        try {
            sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Error eliminando datos de sessionStorage:', error);
            return false;
        }
    }
};

function tieneNivelesValidos(contenidoEducativo) {
    return Boolean(
        contenidoEducativo &&
        Array.isArray(contenidoEducativo.niveles) &&
        contenidoEducativo.niveles.length > 0
    );
}

function ocultarEsqueletosCarga() {
    const contenedor = document.getElementById('contenedor-niveles');

    if (!contenedor) {
        return;
    }

    contenedor
        .querySelectorAll('.skeleton-wrap, .skeleton, .skeleton-btn')
        .forEach((elemento) => elemento.remove());

    document.body.classList.remove('is-loading');
}

function mostrarErrorSinContenido() {
    const contenedor = document.getElementById('contenedor-niveles');

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = '';

    const mensaje = document.createElement('div');
    mensaje.className = 'error-banner';
    mensaje.setAttribute('role', 'alert');
    mensaje.textContent =
        'No se pudo cargar el contenido educativo. Pulsa “Actualizar contenido” para intentarlo nuevamente.';

    contenedor.appendChild(mensaje);
}

// Actualizar contenido sin eliminar completamente el Service Worker
window.actualizarContenidoTotal = async function actualizarContenidoTotal(btn) {
    if (btn) {
        btn.disabled = true;
        btn.classList.add('is-loading');
    }

    if (window.Toast) {
        window.Toast.show('Actualizando contenido…', 'info');
    }

    try {
        SecureStorage.removeItem('materias_cache_v2');
        SecureStorage.removeItem('materias_cache_v1');
        SecureSessionStorage.removeItem('drive_files_cache');

        await cargarContenidoEducativo(true);

        if (window.Toast) {
            window.Toast.show('Contenido actualizado.', 'success');
        }
    } catch (error) {
        console.error('Error al actualizar contenido:', error);

        if (window.Toast) {
            window.Toast.show(
                'No se pudo actualizar desde Google Drive.',
                'error'
            );
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('is-loading');
        }

        ocultarEsqueletosCarga();
    }
};

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./sw.js')
            .then((registration) => {
                console.log(
                    'Service Worker registrado correctamente:',
                    registration.scope
                );

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;

                    if (!newWorker) {
                        return;
                    }

                    newWorker.addEventListener('statechange', () => {
                        if (
                            newWorker.state === 'installed' &&
                            navigator.serviceWorker.controller
                        ) {
                            console.log(
                                'Nueva versión del portal disponible.'
                            );

                            mostrarAvisoActualizacionSW();
                        }
                    });
                });
            })
            .catch((error) => {
                console.error(
                    'Error al registrar el Service Worker:',
                    error
                );
            });
    });
}

// Carga de contenido educativo desde caché, archivo local y Apps Script
async function cargarContenidoEducativo(forceRefresh = false) {
    const CACHE_KEY = 'materias_cache_v2';
    const CACHE_TTL = 15 * 60 * 1000;

    let contenidoMostrado = false;

    try {
        const cachedStr = SecureStorage.getItem(CACHE_KEY);

        if (cachedStr && !forceRefresh) {
            try {
                const cached = JSON.parse(cachedStr);

                const cacheEsValida =
                    cached &&
                    typeof cached.timestamp === 'number' &&
                    Date.now() - cached.timestamp < CACHE_TTL &&
                    tieneNivelesValidos(cached.data);

                if (cacheEsValida) {
                    console.log(
                        'Usando contenido reciente almacenado en caché.'
                    );

                    contenidoMostrado = aplicarDatosMaterias(
                        cached.data
                    );
                } else {
                    SecureStorage.removeItem(CACHE_KEY);
                }
            } catch (parseError) {
                console.warn(
                    'La caché de materias no es válida:',
                    parseError
                );

                SecureStorage.removeItem(CACHE_KEY);
            }
        }

        // Mostrar inmediatamente el contenido local
        if (
            !contenidoMostrado &&
            tieneNivelesValidos(MATERIAS_DATA)
        ) {
            contenidoMostrado =
                aplicarDatosMaterias(MATERIAS_DATA);
        }

        // Si Apps Script no está configurado, mantener el contenido local
        if (
            !window.AppConfig?.USAR_APPS_SCRIPT ||
            !window.AppConfig?.APPS_SCRIPT_URL
        ) {
            if (contenidoMostrado) {
                mostrarAvisoFallback();
            } else {
                mostrarErrorSinContenido();
            }

            return;
        }

        console.info(
            'Consultando actualización desde Google Drive mediante Apps Script...'
        );

        // Un solo intento y máximo 10 segundos
        const respuesta = await fetchWithTimeout(
            window.AppConfig.APPS_SCRIPT_URL,
            {
                method: 'GET',
                cache: 'no-store'
            },
            10000
        );

        if (!respuesta.ok) {
            throw new Error(
                `Apps Script respondió con estado ${respuesta.status}`
            );
        }

        const datosAppsScript = await respuesta.json();

        if (
            !datosAppsScript ||
            !Array.isArray(datosAppsScript.tree)
        ) {
            throw new Error(
                'La respuesta de Apps Script no contiene un arreglo tree válido.'
            );
        }

        if (datosAppsScript.tree.length === 0) {
            throw new Error(
                'Apps Script devolvió una estructura vacía.'
            );
        }

        procesarDatosAppsScript(
            datosAppsScript,
            CACHE_KEY
        );

        eliminarAvisoFallback();

        console.info(
            'Contenido actualizado correctamente desde Google Drive.'
        );
    } catch (error) {
        console.warn(
            'No fue posible actualizar desde Google Drive:',
            error.message
        );

        // Usar el contenido importado, no window.MATERIAS_DATA
        if (
            !contenidoMostrado &&
            tieneNivelesValidos(MATERIAS_DATA)
        ) {
            contenidoMostrado =
                aplicarDatosMaterias(MATERIAS_DATA);
        }

        if (contenidoMostrado) {
            mostrarAvisoFallback();
        } else {
            mostrarErrorSinContenido();
        }
    } finally {
        ocultarEsqueletosCarga();
    }
}

function mostrarAvisoFallback() {
    const contenedor =
        document.getElementById('contenedor-niveles');

    if (
        !contenedor ||
        !contenedor.parentNode ||
        document.getElementById('aviso-fallback')
    ) {
        return;
    }

    const aviso = document.createElement('div');
    aviso.id = 'aviso-fallback';
    aviso.setAttribute('role', 'status');

    aviso.style.backgroundColor = '#fdf2f8';
    aviso.style.color = '#be185d';
    aviso.style.padding = '12px 16px';
    aviso.style.borderRadius = '8px';
    aviso.style.marginBottom = '15px';
    aviso.style.fontSize = '0.9rem';
    aviso.style.display = 'flex';
    aviso.style.alignItems = 'center';
    aviso.style.justifyContent = 'center';
    aviso.style.flexWrap = 'wrap';
    aviso.style.gap = '8px';
    aviso.style.border = '1px solid #fbcfe8';

    const icono = document.createElement('span');
    icono.textContent = '⚠️';
    icono.setAttribute('aria-hidden', 'true');

    const texto = document.createElement('span');
    texto.textContent =
        'Mostrando contenido guardado. No fue posible actualizar desde Google Drive.';

    const botonActualizar =
        document.createElement('button');

    botonActualizar.type = 'button';
    botonActualizar.textContent = 'Actualizar contenido';
    botonActualizar.style.border = 'none';
    botonActualizar.style.background = 'transparent';
    botonActualizar.style.color = 'inherit';
    botonActualizar.style.fontWeight = '700';
    botonActualizar.style.textDecoration = 'underline';
    botonActualizar.style.cursor = 'pointer';

    botonActualizar.addEventListener('click', () => {
        if (
            typeof window.actualizarContenidoTotal ===
            'function'
        ) {
            window.actualizarContenidoTotal(
                botonActualizar
            );
        }
    });

    aviso.append(icono, texto, botonActualizar);

    contenedor.parentNode.insertBefore(
        aviso,
        contenedor
    );
}

function eliminarAvisoFallback() {
    const aviso =
        document.getElementById('aviso-fallback');

    if (aviso) {
        aviso.remove();
    }
}

function aplicarDatosMaterias(contenidoEducativo) {
    if (!tieneNivelesValidos(contenidoEducativo)) {
        console.warn(
            'El contenido educativo no contiene niveles válidos.'
        );

        ocultarEsqueletosCarga();
        return false;
    }

    const contenedor =
        document.getElementById('contenedor-niveles');

    if (!contenedor) {
        console.error(
            'No se encontró el contenedor de niveles.'
        );

        return false;
    }

    try {
        // Mantener disponibles los datos para otros componentes
        window.MATERIAS_DATA = contenidoEducativo;
        window.materiasDataCompleta =
            contenidoEducativo.niveles;

        contenedor.innerHTML = '';

        renderNiveles(
            contenidoEducativo.niveles,
            contenedor
        );

        ocultarEsqueletosCarga();

        const fechaActualizacion =
            document.getElementById(
                'fecha-actualizacion'
            );

        if (fechaActualizacion) {
            fechaActualizacion.textContent =
                new Date().toLocaleString('es-SV', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
        }

        return true;
    } catch (error) {
        console.error(
            'Error al renderizar el contenido educativo:',
            error
        );

        ocultarEsqueletosCarga();
        return false;
    }
}

// Cargar contenido local inmediatamente y actualizar en segundo plano
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (window.lucide) {
            window.lucide.createIcons();
        }

        if (tieneNivelesValidos(MATERIAS_DATA)) {
            aplicarDatosMaterias(MATERIAS_DATA);
        } else {
            console.error(
                'MATERIAS_DATA no contiene niveles locales válidos.'
            );

            mostrarErrorSinContenido();
        }

        cargarContenidoEducativo().catch((error) => {
            console.error(
                'Error durante la actualización en segundo plano:',
                error
            );

            ocultarEsqueletosCarga();
        });

        const btnReportar =
            document.getElementById(
                'btn-reportar-problema'
            );

        if (btnReportar) {
            btnReportar.href =
                window.AppConfig
                    ?.FORMULARIO_REPORTES_URL ||
                'https://forms.gle/eDrth5nJ2drQSfUC7';
        }
    } catch (error) {
        console.error(
            'Error al iniciar el portal:',
            error
        );

        if (tieneNivelesValidos(MATERIAS_DATA)) {
            aplicarDatosMaterias(MATERIAS_DATA);
        } else {
            mostrarErrorSinContenido();
        }
    }
});

// Función utilizada por overlays.js
window.refrescarMenuYArchivos =
    async function refrescarMenuYArchivos() {
        SecureStorage.removeItem(
            'materias_cache_v1'
        );

        SecureSessionStorage.removeItem(
            'drive_files_cache'
        );

        await cargarContenidoEducativo(true);
    };

// Detectar cambios de conexión
window.addEventListener('offline', () => {
    if (window.Toast) {
        window.Toast.show(
            'Sin conexión. Mostrando contenido guardado.',
            'warning'
        );
    }

    console.warn(
        'Sin conexión: usando contenido local.'
    );
});

window.addEventListener('online', () => {
    if (window.Toast) {
        window.Toast.show(
            'Conexión restaurada.',
            'success'
        );
    }

    console.log(
        'Conexión recuperada. Actualizando contenido.'
    );

    cargarContenidoEducativo(true).catch(
        (error) => {
            console.warn(
                'No se pudo actualizar al recuperar la conexión:',
                error
            );
        }
    );
});

// Procesar respuesta de Google Apps Script
function procesarDatosAppsScript(
    datosAppsScript,
    cacheKey
) {
    if (
        !datosAppsScript ||
        !Array.isArray(datosAppsScript.tree)
    ) {
        throw new Error(
            'Los datos de Apps Script son inválidos.'
        );
    }

    if (
        Array.isArray(datosAppsScript.warnings) &&
        datosAppsScript.warnings.length > 0
    ) {
        console.warn(
            'Google Drive devolvió advertencias de estructura:'
        );

        datosAppsScript.warnings.forEach(
            (advertencia) => {
                console.warn(
                    String(
                        advertencia ||
                        'Advertencia desconocida'
                    )
                );
            }
        );
    }

    const nivelesAdaptados =
        normalizarDatosAppsScript(
            datosAppsScript.tree
        );

    const contenidoEducativo = {
        niveles: nivelesAdaptados
    };

    if (!tieneNivelesValidos(contenidoEducativo)) {
        throw new Error(
            'No fue posible convertir la estructura de Google Drive.'
        );
    }

    if (datosAppsScript.filesByFolderId) {
        SecureSessionStorage.setItem(
            'drive_files_cache',
            JSON.stringify({
                timestamp: Date.now(),
                data:
                    datosAppsScript.filesByFolderId
            })
        );
    }

    SecureStorage.setItem(
        cacheKey,
        JSON.stringify({
            timestamp: Date.now(),
            data: contenidoEducativo
        })
    );

    aplicarDatosMaterias(contenidoEducativo);
}

function normalizarDatosAppsScript(tree) {
    if (!Array.isArray(tree)) {
        return [];
    }

    const copiaTree = [...tree];

    copiaTree.sort((nivelA, nivelB) => {
        const numeroA =
            nivelA?.nivel
                ? Number.parseInt(
                    nivelA.nivel.split('-')[0],
                    10
                ) || 99
                : 99;

        const numeroB =
            nivelB?.nivel
                ? Number.parseInt(
                    nivelB.nivel.split('-')[0],
                    10
                ) || 99
                : 99;

        return numeroA - numeroB;
    });

    const ordenGrados = [
        'Inicial',
        'Parvularia 5 años',
        'Parvularia 6 años',
        'Primer Grado - Sección A',
        'Primer Grado - Sección B',
        'Primer Grado',
        'Segundo Grado - Sección A',
        'Segundo Grado - Sección B',
        'Segundo Grado',
        'Tercer Grado - Sección A',
        'Tercer Grado - Sección B',
        'Tercer Grado',
        'Cuarto Grado - Sección A',
        'Cuarto Grado - Sección B',
        'Cuarto Grado',
        'Quinto Grado - Sección A',
        'Quinto Grado - Sección B',
        'Quinto Grado',
        'Sexto Grado',
        'Séptimo Grado',
        'Octavo Grado',
        'Noveno Grado',
        'Primer Año',
        'Segundo Año',
        'Tercer Año'
    ];

    const configuracionNiveles = [
        {
            nombre: 'inicial',
            icono: '🌱',
            claseColor: 'n1'
        },
        {
            nombre: 'primer ciclo',
            icono: '📗',
            claseColor: 'n2'
        },
        {
            nombre: 'segundo ciclo',
            icono: '📙',
            claseColor: 'n3'
        },
        {
            nombre: 'tercer ciclo',
            icono: '📕',
            claseColor: 'n4'
        },
        {
            nombre: 'bachillerato',
            icono: '🎓',
            claseColor: 'n5'
        }
    ];

    return copiaTree
        .map((nivel, indiceNivel) => {
            if (!nivel?.nivel) {
                return null;
            }

            const nombreNivel =
                String(nivel.nivel);

            const configuracion =
                configuracionNiveles.find(
                    (item) =>
                        nombreNivel
                            .toLowerCase()
                            .includes(item.nombre)
                ) || {
                    icono: '📁',
                    claseColor: 'n1'
                };

            const grados = Array.isArray(
                nivel.grados
            )
                ? [...nivel.grados]
                : [];

            grados.sort((gradoA, gradoB) => {
                const indiceA =
                    ordenGrados.indexOf(
                        gradoA?.grado
                    );

                const indiceB =
                    ordenGrados.indexOf(
                        gradoB?.grado
                    );

                if (
                    indiceA === -1 &&
                    indiceB === -1
                ) {
                    return String(
                        gradoA?.grado || ''
                    ).localeCompare(
                        String(
                            gradoB?.grado || ''
                        ),
                        'es'
                    );
                }

                if (indiceA === -1) {
                    return 1;
                }

                if (indiceB === -1) {
                    return -1;
                }

                return indiceA - indiceB;
            });

            const gradosNormalizados =
                grados
                    .map(
                        (
                            grado,
                            indiceGrado
                        ) => {
                            if (!grado?.grado) {
                                return null;
                            }

                            const materias =
                                Array.isArray(
                                    grado.materias
                                )
                                    ? [
                                        ...grado.materias
                                    ]
                                    : [];

                            materias.sort(
                                (
                                    materiaA,
                                    materiaB
                                ) =>
                                    String(
                                        materiaA?.materia ||
                                        ''
                                    ).localeCompare(
                                        String(
                                            materiaB
                                                ?.materia ||
                                            ''
                                        ),
                                        'es'
                                    )
                            );

                            let iconoGrado = '📘';

                            if (
                                configuracion.icono ===
                                '🌱'
                            ) {
                                iconoGrado = '👶';
                            } else if (
                                configuracion.icono ===
                                '📗'
                            ) {
                                iconoGrado = '📗';
                            }

                            const coincidenciaNumero =
                                String(
                                    grado.grado
                                ).match(/\d+/);

                            const nombreAbreviado =
                                coincidenciaNumero
                                    ? `${coincidenciaNumero[0]}°`
                                    : String(
                                        grado.grado
                                    );

                            const materiasNormalizadas =
                                materias
                                    .map(
                                        (
                                            materia,
                                            indiceMateria
                                        ) => {
                                            if (
                                                !materia?.materia
                                            ) {
                                                return null;
                                            }

                                            return {
                                                id:
                                                    materia.id ||
                                                    `as_m_${indiceNivel}_${indiceGrado}_${indiceMateria}`,
                                                nombre:
                                                    String(
                                                        materia.materia
                                                    ),
                                                folderId:
                                                    materia.folderId ||
                                                    materia.folder_id ||
                                                    materia.idCarpeta ||
                                                    materia.id ||
                                                    ''
                                            };
                                        }
                                    )
                                    .filter(Boolean);

                            return {
                                id:
                                    grado.id ||
                                    `as_g_${indiceNivel}_${indiceGrado}`,
                                nombre: String(
                                    grado.grado
                                ),
                                nombreAbreviado,
                                icono:
                                    iconoGrado,
                                pin: '',
                                materias:
                                    materiasNormalizadas
                            };
                        }
                    )
                    .filter(Boolean);

            return {
                id:
                    nivel.id ||
                    `as_n_${indiceNivel}`,
                nombre:
                    nombreNivel.replace(
                        /^\d+-\s*/,
                        ''
                    ),
                icono:
                    configuracion.icono,
                claseColor:
                    configuracion.claseColor,
                grados:
                    gradosNormalizados
            };
        })
        .filter(Boolean);
}

function mostrarAvisoActualizacionSW() {
    if (
        document.getElementById(
            'sw-update-banner'
        )
    ) {
        return;
    }

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
    banner.style.boxShadow =
        '0 10px 25px rgba(0,0,0,0.2)';
    banner.style.zIndex = '99999';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '12px';
    banner.style.fontSize = '13px';
    banner.style.fontWeight = '500';

    const texto = document.createElement('span');
    texto.textContent =
        'Nueva versión disponible.';

    const botonActualizar =
        document.createElement('button');

    botonActualizar.id = 'sw-update-btn';
    botonActualizar.type = 'button';
    botonActualizar.textContent = 'Actualizar';
    botonActualizar.style.background =
        '#3b82f6';
    botonActualizar.style.color = 'white';
    botonActualizar.style.border = 'none';
    botonActualizar.style.padding =
        '6px 12px';
    botonActualizar.style.borderRadius =
        '20px';
    botonActualizar.style.cursor = 'pointer';
    botonActualizar.style.fontWeight = '600';
    botonActualizar.style.fontSize = '12px';

    banner.append(texto, botonActualizar);
    document.body.appendChild(banner);

    botonActualizar.addEventListener(
        'click',
        async () => {
            botonActualizar.textContent =
                'Actualizando...';

            botonActualizar.disabled = true;
            botonActualizar.style.opacity =
                '0.7';
            botonActualizar.style.cursor =
                'wait';

            try {
                const registro =
                    await navigator.serviceWorker.getRegistration();

                if (registro?.waiting) {
                    registro.waiting.postMessage({
                        type: 'SKIP_WAITING'
                    });
                }
            } catch (error) {
                console.warn(
                    'Error al actualizar el Service Worker:',
                    error
                );
            }

            SecureStorage.removeItem(
                'materias_cache_v2'
            );

            SecureStorage.removeItem(
                'materias_cache_v1'
            );

            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    );
}