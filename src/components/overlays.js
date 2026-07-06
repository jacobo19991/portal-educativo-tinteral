import { fetchWithTimeout } from '../utils/fetchUtils.js';

window.OverlaysApp = (function() {
  let elementBeforeModal; // Para guardar el foco anterior (Accesibilidad)

  function abrirSheet() {
    elementBeforeModal = document.activeElement;
    document.getElementById('sTitulo').textContent = window.AppState.materia;
    document.getElementById('sSub').textContent = window.AppState.gradoAbreviada;
    const overlay = document.getElementById('overlay');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    
    // Mover foco al modal
    const btnCerrar = overlay.querySelector('.btn-cerrar-sheet');
    if (btnCerrar) btnCerrar.focus();
  }

  function cerrarSheet() {
    document.getElementById('overlay').classList.remove('visible');
    document.body.style.overflow = '';
    // Restaurar foco (Accesibilidad)
    if (elementBeforeModal) elementBeforeModal.focus();
  }

  function abrirSubTareas() {
    document.getElementById('sSub2').textContent = window.AppState.gradoAbreviada + ' · ' + window.AppState.materia;
    
    const preview = document.getElementById('waPreviewText');
    if (preview) {
      preview.innerHTML = `<strong>*Portal C.E. El Tinteral*</strong><br>Revisa los recursos de<br><strong>*${window.AppState.materia}* - *${window.AppState.gradoAbreviada}*</strong>`;
    }

    renderizarTareas();
    const overlay2 = document.getElementById('overlay2');
    overlay2.classList.add('visible');
    // Mover foco
    const btnCerrar2 = overlay2.querySelector('.btn-cerrar-sheet2');
    if (btnCerrar2) btnCerrar2.focus();
  }

  function cerrarSheet2() {
    document.getElementById('overlay2').classList.remove('visible');
    // El foco regresa al botón de abrir tareas
    const btnAbrir = document.getElementById('btnAbrirTareas');
    if (btnAbrir) btnAbrir.focus();
  }

  function abrirDrive(tipo) {
    if (!window.AppState.folderId) return;
    const folderUrl = `https://drive.google.com/drive/folders/${window.AppState.folderId}`;
    window.open(folderUrl, '_blank', 'noopener,noreferrer');
  }

  async function renderizarTareas(forzarFresco = false) {
    const listaSemana = document.getElementById('lista-semana-actual');
    const listaHist = document.getElementById('lista-historico');
    const histToggle = document.getElementById('histToggle');
    const folderId = window.AppState.folderId;

    listaSemana.innerHTML = '<div class="spinner-wrap"><div class="spinner spinner-sm"></div><span class="spinner-text">Buscando archivos en Drive…</span></div>';
    listaHist.innerHTML = '';
    histToggle.style.display = 'none';

    if (!folderId) {
      listaSemana.innerHTML = '<p class="warning-text">⚠️ No se detectó carpeta para esta materia.</p>';
      return;
    }

    const CACHE_MINUTES = 15; // Aumentado a 15 mins para mejor rendimiento (Fase 3)
    const cacheKey = 'drive_cache_' + folderId;
    const cached = sessionStorage.getItem(cacheKey);

    let data = null;
    let usedCache = false;

    // 1. Intentar buscar en la memoria pre-cargada de Apps Script (Prioridad 1)
    if (window.AppConfig.USAR_APPS_SCRIPT && !forzarFresco) {
      try {
        const preloadedStr = sessionStorage.getItem('drive_files_cache');
        if (preloadedStr) {
          const preloaded = JSON.parse(preloadedStr);
          if (preloaded.data && Array.isArray(preloaded.data[folderId])) {
            data = { files: preloaded.data[folderId] };
            usedCache = true;
            console.log("📂 Usando archivos pre-cargados por Apps Script");
          }
        }
      } catch (e) {}
    }

    // 2. Si no hay Apps Script, intentar caché individual de /api/drive (Prioridad 2)
    if (!usedCache && cached && !forzarFresco) {
      try {
        const parsed = JSON.parse(cached);
        // Validar caché (Fase 4)
        if (parsed && parsed.data && Array.isArray(parsed.data.files) && Date.now() - parsed.timestamp < CACHE_MINUTES * 60 * 1000) {
          data = parsed.data;
          usedCache = true;
          console.log("📂 Usando datos cacheados de Drive");
        } else {
          sessionStorage.removeItem(cacheKey);
        }
      } catch (e) { sessionStorage.removeItem(cacheKey); }
    }

    if (!usedCache) {
      try {
        const url = (window.AppConfig.USAR_APPS_SCRIPT && window.AppConfig.APPS_SCRIPT_URL)
            ? `${window.AppConfig.APPS_SCRIPT_URL}?folderId=${encodeURIComponent(folderId)}`
            : `${window.AppConfig.DRIVE_API_ENDPOINT}?folderId=${encodeURIComponent(folderId)}${forzarFresco ? '&refresh=true' : ''}`;

        // Usar fetchWithTimeout con 30s max
        const resp = await fetchWithTimeout(url, {}, 30000); 
        data = await resp.json();

        if (!data || !Array.isArray(data.files)) {
           throw new Error("Estructura de datos de Drive no válida");
        }

        sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: data }));
      } catch (error) {
        console.error("Error cargando recursos:", error);
        listaSemana.innerHTML = `<div class="error-banner">❌ No pudimos cargar los recursos en este momento. Revisa tu conexión o intenta de nuevo en unos segundos.</div>`;
        if(window.Toast) window.Toast.show("No pudimos cargar los recursos en este momento. Revisa tu conexión o intenta de nuevo en unos segundos.", "error");
        return;
      }
    }

    const files = data.files || [];
    if (files.length === 0) {
      listaSemana.innerHTML = '<p class="empty-text">📂 La carpeta está vacía.<br><span class="empty-subtext">El maestro aún no ha subido materiales aquí.</span></p>';
      return;
    }

    const DIAS_RECIENTE = 14;
    const ahora = Date.now();
    const msReciente = DIAS_RECIENTE * 24 * 60 * 60 * 1000;
    
    const recientes = files.filter(f => (ahora - new Date(f.modifiedTime).getTime()) <= msReciente);
    const historico = files.filter(f => (ahora - new Date(f.modifiedTime).getTime()) > msReciente);
    const semanaActual = recientes.length > 0 ? recientes : files;
    const semanaHist = recientes.length > 0 ? historico : [];

    listaSemana.innerHTML = '';
    semanaActual.forEach(f => listaSemana.appendChild(crearItemArchivo(f, true)));

    if (semanaHist.length > 0) {
      histToggle.style.display = 'flex';
      listaHist.innerHTML = '';
      
      const PAGE_SIZE = 15;
      let currentIndexHist = 0;
      
      const centinela = document.createElement('div');
      centinela.className = 'centinela-scroll';
      centinela.innerHTML = '<div class="spinner-wrap" style="padding: 10px 0;"><div class="spinner spinner-sm"></div><span class="spinner-text">Cargando más...</span></div>';
      
      const renderizarLote = () => {
         const lote = semanaHist.slice(currentIndexHist, currentIndexHist + PAGE_SIZE);
         if (lote.length === 0) {
             centinela.style.display = 'none';
             return;
         }
         
         lote.forEach(f => {
             listaHist.insertBefore(crearItemArchivo(f, false), centinela);
         });
         
         currentIndexHist += PAGE_SIZE;
         if (currentIndexHist >= semanaHist.length) {
             centinela.style.display = 'none';
         }
      };

      listaHist.appendChild(centinela);
      renderizarLote();

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && currentIndexHist < semanaHist.length) {
                // Pequeño timeout para fluidez de UI
                setTimeout(renderizarLote, 200);
            }
        }, { rootMargin: '100px' });
        observer.observe(centinela);
      } else {
        while(currentIndexHist < semanaHist.length) renderizarLote();
      }
    }
    
    if (window.lucide) window.lucide.createIcons();
  }

  function crearItemArchivo(file, esReciente) {
    const esPDF = file.mimeType === 'application/pdf';
    const esDoc = file.mimeType === 'application/vnd.google-apps.document';
    
    let icono = 'paperclip';
    if (esPDF) icono = 'file-text';
    else if (esDoc) icono = 'file-edit';
    else if (file.mimeType.includes('image')) icono = 'image';
    else if (file.mimeType.includes('video')) icono = 'video';
    else if (file.mimeType.includes('spreadsheet') || file.mimeType.includes('excel')) icono = 'table';
    else if (file.mimeType.includes('presentation') || file.mimeType.includes('powerpoint')) icono = 'monitor-play';
    
    const fechaStr = new Date(file.modifiedTime).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });

    const urlImagen = file.thumbnailLink ? file.thumbnailLink : '';
    const iconoHTML = urlImagen 
      ? `<img src="${urlImagen}" alt="Miniatura" loading="lazy" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" />` 
      : `<i data-lucide="${icono}" class="icon-3xl"></i>`;

    const div = document.createElement('div');
    div.className = 'pdf-item';
    div.innerHTML = `
      <span class="pdf-item-icono" aria-hidden="true">${iconoHTML}</span>
      <div class="pdf-item-info">
        <span class="pdf-item-nombre">${window.escapeHtml(file.name)}</span>
        <span class="pdf-item-semana">Modificado: ${fechaStr} ${esReciente ? '<span class="semana-tag">RECIENTE</span>' : ''}</span>
      </div>
      <span class="pdf-item-ver">Ver <i data-lucide="arrow-right" class="icon-md icon-align"></i></span>`;

    div.addEventListener('click', () => {
      if (esPDF) abrirVisor(file.name, file.id);
      else window.open(file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`, '_blank', 'noopener,noreferrer');
    });
    return div;
  }

  let pdfLoadTimeout;

  function abrirVisor(nombre, fileId) {
    if(window.Toast) window.Toast.show(`Abriendo documento...`, 'info');
    
    window.AppState.currentFileId = fileId;
    document.getElementById('pdfNombre').textContent = nombre;
    
    const btn = document.getElementById('pdfDescargarBtn');
    btn.href = `https://drive.google.com/uc?export=download&id=${fileId}`;
    btn.setAttribute('download', `${nombre}.pdf`);

    const btnDrive = document.getElementById('pdfAbrirDriveBtn');
    const btnFallback = document.getElementById('pdfFallbackBtn');
    const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
    
    if (btnDrive) btnDrive.href = driveUrl;
    if (btnFallback) btnFallback.href = driveUrl;

    const loader = document.getElementById('pdfLoader');
    const warning = document.getElementById('pdfTimeoutWarning');
    const iframe = document.getElementById('pdf-iframe');
    
    loader.classList.remove('oculto');
    if (warning) warning.style.display = 'none';

    document.getElementById('pdfOverlay').classList.add('visible');
    document.body.style.overflow = 'hidden';

    // Mostrar modal primero, luego inyectar iframe para que sea instantáneo
    setTimeout(() => {
        iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
        
        iframe.onload = () => {
            loader.classList.add('oculto');
            clearTimeout(pdfLoadTimeout);
        };

        // Timeout de seguridad si el PDF tarda mucho (revertido a 3s para evitar falsos positivos)
        pdfLoadTimeout = setTimeout(() => {
            if (warning) {
              warning.style.display = 'block';
              if (btnFallback) btnFallback.focus(); // Accesibilidad: Mover foco al fallback
            }
        }, 3000);
    }, 100);
  }

  function cerrarVisor() {
    document.getElementById('pdfOverlay').classList.remove('visible');
    const iframe = document.getElementById('pdf-iframe');
    
    // Fase 5: Evitar consumo de RAM y liberar memoria efectivamente
    iframe.src = 'about:blank';
    setTimeout(() => {
        iframe.removeAttribute('src'); 
    }, 100);

    document.body.style.overflow = '';
    window.AppState.currentFileId = "";
    clearTimeout(pdfLoadTimeout); // Cancelar timers si se cierra rápido
  }

  function refrescarCache() {
    const folderId = window.AppState.folderId;
    if (folderId) {
      sessionStorage.removeItem('drive_cache_' + folderId);
      
      if (window.AppConfig.USAR_APPS_SCRIPT && window.refrescarMenuYArchivos) {
        if (window.Toast) window.Toast.show("Reconstruyendo menú y archivos desde Drive...", "info");
        window.refrescarMenuYArchivos().then(() => {
            renderizarTareas(true);
        });
      } else {
        // Fase 3: Limpiar también el caché global de materias al pedir recarga manual
        localStorage.removeItem('materias_cache_v1');
        if (window.Toast) window.Toast.show("Actualizando...", "info");
        renderizarTareas(true);
      }
    }
  }

  function compartirWhatsApp() {
    const msg = encodeURIComponent(`*Portal C.E. El Tinteral*\nRevisa los recursos de *${window.AppState.materia}* - *${window.AppState.gradoAbreviada}*:\n${window.AppConfig.LINK_PORTAL}`);
    window.open(`https://wa.me/${window.AppConfig.NUMERO_WHATSAPP}?text=${msg}`, '_blank', 'noopener,noreferrer');
  }

  function crearTarjetaRecurso(icono, titulo, desc, folder, isFullWidth = false) {
    const btn = document.createElement('button');
    btn.className = `rec-card btn-abrir-drive ${isFullWidth ? 'full-width' : ''}`;
    btn.dataset.folder = folder;
    btn.innerHTML = `
      <span class="ri" aria-hidden="true"><i data-lucide="${icono}"></i></span>
      <span class="rn">${titulo}</span>
      <span class="rd">${desc}</span>
    `;
    btn.addEventListener('click', () => abrirDrive(folder));
    return btn;
  }

  function inicializarTarjetas() {
    const gridTop = document.getElementById('grid-recursos-top');
    const gridBottom = document.getElementById('grid-recursos-bottom');
    if (!gridTop || !gridBottom) return;

    gridTop.innerHTML = '';
    gridTop.appendChild(crearTarjetaRecurso('clipboard-list', 'Guías de Aprendizaje', 'Instrucciones semanales', 'guias'));
    gridTop.appendChild(crearTarjetaRecurso('calendar', 'Horarios y Avisos', 'Fechas importantes', 'horarios'));

    gridBottom.innerHTML = '';
    gridBottom.appendChild(crearTarjetaRecurso('book', 'Libros de Texto', 'Material de consulta principal', 'libros', true));
  }

  document.addEventListener('DOMContentLoaded', () => {
    inicializarTarjetas();
    
    // Cerrar modales con botones X
    document.querySelector('.btn-cerrar-sheet')?.addEventListener('click', cerrarSheet);
    document.querySelector('.btn-cerrar-sheet2')?.addEventListener('click', cerrarSheet2);
    document.querySelector('.btn-cerrar-visor')?.addEventListener('click', cerrarVisor);
    
    // Cerrar al clickear fuera
    document.getElementById('overlay')?.addEventListener('click', e => { if (e.target.id === 'overlay') cerrarSheet(); });
    document.getElementById('overlay2')?.addEventListener('click', e => { if (e.target.id === 'overlay2') cerrarSheet2(); });
    
    // Accesibilidad: Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('overlay');
        const overlay2 = document.getElementById('overlay2');
        const pdfOverlay = document.getElementById('pdfOverlay');
        
        if (pdfOverlay && pdfOverlay.classList.contains('visible')) cerrarVisor();
        else if (overlay2 && overlay2.classList.contains('visible')) cerrarSheet2();
        else if (overlay && overlay.classList.contains('visible')) cerrarSheet();
      }
    });
    
    // Abrir tareas
    document.getElementById('btnAbrirTareas')?.addEventListener('click', abrirSubTareas);
    
    // Toggle Historico
    document.getElementById('histToggle')?.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !isExpanded);
      document.getElementById('histPanel').classList.toggle('visible');
    });

    // WhatsApp
    document.getElementById('waBtnTareas')?.addEventListener('click', compartirWhatsApp);
    
    // Refrescar caché
    document.getElementById('btnRefrescarCache')?.addEventListener('click', refrescarCache);
  });

  return { abrirSheet };
})();
