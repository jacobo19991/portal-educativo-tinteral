window.OverlaysApp = (function() {
  function abrirSheet() {
    document.getElementById('sTitulo').textContent = window.AppState.materia;
    document.getElementById('sSub').textContent = window.AppState.gradoAbreviada;
    document.getElementById('overlay').classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function cerrarSheet() {
    document.getElementById('overlay').classList.remove('visible');
    document.body.style.overflow = '';
  }

  function abrirSubTareas() {
    document.getElementById('sSub2').textContent = window.AppState.gradoAbreviada + ' · ' + window.AppState.materia;
    
    const preview = document.getElementById('waPreviewText');
    if (preview) {
      preview.innerHTML = `<strong>*Portal C.E. El Tinteral*</strong><br>Revisa los recursos de<br><strong>*${window.AppState.materia}* - *${window.AppState.gradoAbreviada}*</strong>`;
    }

    renderizarTareas();
    document.getElementById('overlay2').classList.add('visible');
  }

  function cerrarSheet2() {
    document.getElementById('overlay2').classList.remove('visible');
  }

  function abrirDrive(tipo) {
    if (!window.AppState.folderId) return;
    const folderUrl = `https://drive.google.com/drive/folders/${window.AppState.folderId}`;
    window.open(folderUrl, '_blank', 'noopener,noreferrer');
  }

  async function renderizarTareas() {
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

    const CACHE_MINUTES = 5;
    const cacheKey = 'drive_cache_' + folderId;
    const cached = sessionStorage.getItem(cacheKey);

    let data = null;
    let usedCache = false;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_MINUTES * 60 * 1000) {
          data = parsed.data;
          usedCache = true;
        }
      } catch (e) { sessionStorage.removeItem(cacheKey); }
    }

    if (!usedCache) {
      try {
        const url = `${window.AppConfig.DRIVE_API_ENDPOINT}?folderId=${encodeURIComponent(folderId)}`;

        const resp = await fetch(url);
        data = await resp.json();

        if (!resp.ok) {
          listaSemana.innerHTML = `<div class="error-banner">❌ Error ${resp.status}: ${window.escapeHtml(data?.error?.message || 'Error desconocido')}</div>`;
          if(window.Toast) window.Toast.show("Error de conexión con Google Drive", "error");
          return;
        }

        sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: data }));
      } catch (error) {
        listaSemana.innerHTML = `<div class="error-banner">❌ Error de conexión con Google Drive.</div>`;
        if(window.Toast) window.Toast.show("Error de red cargando recursos", "error");
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
      semanaHist.forEach(f => listaHist.appendChild(crearItemArchivo(f, false)));
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

    const div = document.createElement('div');
    div.className = 'pdf-item';
    div.innerHTML = `
      <span class="pdf-item-icono" aria-hidden="true"><i data-lucide="${icono}" class="icon-3xl"></i></span>
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

  function abrirVisor(nombre, fileId) {
    if(window.Toast) window.Toast.show(`Abriendo documento...`, 'info');
    
    window.AppState.currentFileId = fileId;
    document.getElementById('pdfNombre').textContent = nombre;
    document.getElementById('pdf-iframe').src = `${window.AppConfig.LINK_PORTAL}/api/pdf?fileId=${fileId}`;
    
    const btn = document.getElementById('pdfDescargarBtn');
    btn.href = `https://drive.google.com/uc?export=download&id=${fileId}`;
    btn.setAttribute('download', `${nombre}.pdf`);

    const loader = document.getElementById('pdfLoader');
    loader.classList.remove('oculto');
    document.getElementById('pdf-iframe').onload = () => loader.classList.add('oculto');

    document.getElementById('pdfOverlay').classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function cerrarVisor() {
    document.getElementById('pdfOverlay').classList.remove('visible');
    document.getElementById('pdf-iframe').src = '';
    document.body.style.overflow = '';
    window.AppState.currentFileId = "";
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
  });

  return { abrirSheet };
})();
