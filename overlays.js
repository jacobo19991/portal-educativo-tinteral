window.OverlaysApp = (function () {
  var DIAS_RECIENTE = 14;

  function escapeHTML(texto) {
    if (window.escapeHtml) return window.escapeHtml(texto || "");

    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizar(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function mostrarToast(msg, tipo) {
    if (window.Toast) window.Toast.show(msg, tipo || "info");
  }

  function setScrollBloqueado(bloquear) {
    document.body.style.overflow = bloquear ? "hidden" : "";
  }

  function abrirSheet() {
    var titulo = document.getElementById("sTitulo");
    var sub = document.getElementById("sSub");
    var overlay = document.getElementById("overlay");

    if (titulo) titulo.textContent = window.AppState.materia || "Materia";

    if (sub) {
      sub.textContent =
        window.AppState.gradoAbreviada || window.AppState.grado || "";
    }

    if (overlay) overlay.classList.add("visible");

    setScrollBloqueado(true);
  }

  function cerrarSheet() {
    var overlay = document.getElementById("overlay");

    if (overlay) overlay.classList.remove("visible");

    setScrollBloqueado(false);
  }

  function abrirSubTareas() {
    var sub2 = document.getElementById("sSub2");

    if (sub2) {
      sub2.textContent =
        (window.AppState.gradoAbreviada || "") +
        " · " +
        (window.AppState.materia || "");
    }

    var preview = document.getElementById("waPreviewText");

    if (preview) {
      preview.innerHTML =
        "<strong>*Portal C.E. El Tinteral*</strong><br>" +
        "Revisa los recursos de<br>" +
        "<strong>*" +
        escapeHTML(window.AppState.materia || "") +
        "* - *" +
        escapeHTML(window.AppState.gradoAbreviada || "") +
        "*</strong>";
    }

    renderizarTareas();

    var overlay2 = document.getElementById("overlay2");
    if (overlay2) overlay2.classList.add("visible");

    setScrollBloqueado(true);
  }

  function cerrarSheet2() {
    var overlay2 = document.getElementById("overlay2");
    if (overlay2) overlay2.classList.remove("visible");

    var overlay1 = document.getElementById("overlay");

    if (!overlay1 || !overlay1.classList.contains("visible")) {
      setScrollBloqueado(false);
    }
  }

  function abrirDrive() {
    if (!window.AppState.folderId) {
      mostrarToast("No se encontró carpeta.", "error");
      return;
    }

    window.open(
      "https://drive.google.com/drive/folders/" + window.AppState.folderId,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function obtenerSubcarpetas(folderId) {
    var query = encodeURIComponent(
      "'" +
        folderId +
        "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    );

    var url =
      "https://www.googleapis.com/drive/v3/files?q=" +
      query +
      "&fields=files(id,name)" +
      "&key=" +
      window.AppConfig.DRIVE_API_KEY +
      "&pageSize=100";

    var resp = await fetch(url);
    var data = await resp.json();

    if (!resp.ok) return [];

    return data.files || [];
  }

  async function buscarRutaTareas(folderId) {
    var actual = folderId;

    var sub1 = await obtenerSubcarpetas(actual);

    var carpetaTareas = sub1.find(function (f) {
      var n = normalizar(f.name);
      return n.indexOf("tarea") !== -1 || n.indexOf("actividad") !== -1;
    });

    if (carpetaTareas) actual = carpetaTareas.id;

    var sub2 = await obtenerSubcarpetas(actual);

    var carpetaSemana = sub2.find(function (f) {
      var n = normalizar(f.name);
      return (
        n.indexOf("tarea de la semana") !== -1 ||
        n.indexOf("semana") !== -1 ||
        n.indexOf("actual") !== -1
      );
    });

    if (carpetaSemana) actual = carpetaSemana.id;

    return actual;
  }

  async function obtenerArchivos(folderId) {
    var query = encodeURIComponent(
      "'" +
        folderId +
        "' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false"
    );

    var fields = encodeURIComponent(
      "files(id,name,mimeType,modifiedTime,webViewLink)"
    );

    var url =
      "https://www.googleapis.com/drive/v3/files?q=" +
      query +
      "&fields=" +
      fields +
      "&orderBy=modifiedTime desc" +
      "&key=" +
      window.AppConfig.DRIVE_API_KEY +
      "&pageSize=100";

    var resp = await fetch(url);
    var data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error ? data.error.message : "Error de Drive");
    }

    return data.files || [];
  }

  function esReciente(file) {
    if (!file.modifiedTime) return false;

    var ahora = Date.now();
    var fecha = new Date(file.modifiedTime).getTime();
    var limite = DIAS_RECIENTE * 24 * 60 * 60 * 1000;

    return ahora - fecha <= limite;
  }

  async function renderizarTareas() {
    var listaSemana = document.getElementById("lista-semana-actual");
    var listaHist = document.getElementById("lista-historico");
    var histToggle = document.getElementById("histToggle");
    var histPanel = document.getElementById("histPanel");

    if (!listaSemana || !listaHist || !histToggle) return;

    listaSemana.innerHTML =
      '<div class="spinner-wrap">' +
      '<div class="spinner spinner-sm"></div>' +
      '<span class="spinner-text">Buscando archivos en Drive...</span>' +
      "</div>";

    listaHist.innerHTML = "";
    histToggle.style.display = "none";
    histToggle.setAttribute("aria-expanded", "false");

    if (histPanel) histPanel.classList.remove("visible");

    var folderId = window.AppState.folderId;

    if (!folderId) {
      listaSemana.innerHTML =
        '<p class="warning-text">⚠️ No se encontró carpeta para esta materia.</p>';
      return;
    }

    try {
      var targetFolderId = await buscarRutaTareas(folderId);
      var files = await obtenerArchivos(targetFolderId);

      if (files.length === 0) {
        listaSemana.innerHTML =
          '<p class="empty-text">📂 No hay archivos disponibles.<br>' +
          '<span class="empty-subtext">Revisa que la carpeta y el PDF estén compartidos como lector.</span></p>';
        return;
      }

      var recientes = files.filter(esReciente);
      var historicos = files.filter(function (f) {
        return !esReciente(f);
      });

      var mostrarActual = recientes.length > 0 ? recientes : files;

      listaSemana.innerHTML = "";

      mostrarActual.forEach(function (file) {
        listaSemana.appendChild(crearItemArchivo(file, esReciente(file)));
      });

      if (recientes.length > 0 && historicos.length > 0) {
        histToggle.style.display = "flex";

        historicos.forEach(function (file) {
          listaHist.appendChild(crearItemArchivo(file, false));
        });
      }

      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      console.error("ERROR DRIVE:", error);

      listaSemana.innerHTML =
        '<div class="error-banner">❌ Error cargando archivos de Drive: ' +
        escapeHTML(error.message || "Error desconocido") +
        "</div>";

      mostrarToast("Error cargando Drive", "error");
    }
  }

  function obtenerIconoArchivo(file) {
    var mime = file.mimeType || "";

    if (mime === "application/pdf") return "file-text";
    if (mime.indexOf("image") !== -1) return "image";
    if (mime.indexOf("video") !== -1) return "video";
    if (mime.indexOf("document") !== -1) return "file-edit";
    if (mime.indexOf("spreadsheet") !== -1) return "table";
    if (mime.indexOf("presentation") !== -1) return "monitor-play";

    return "paperclip";
  }

  function formatearFecha(file) {
    if (!file.modifiedTime) return "Disponible";

    return (
      "Modificado: " +
      new Date(file.modifiedTime).toLocaleDateString("es-SV", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    );
  }

  function crearItemArchivo(file, reciente) {
    var icono = obtenerIconoArchivo(file);
    var fecha = formatearFecha(file);

    var div = document.createElement("div");
    div.className = "pdf-item";

    div.innerHTML =
      '<span class="pdf-item-icono">' +
      '<i data-lucide="' +
      icono +
      '" class="icon-3xl"></i>' +
      "</span>" +
      '<div class="pdf-item-info">' +
      '<span class="pdf-item-nombre">' +
      escapeHTML(file.name || "Archivo") +
      "</span>" +
      '<span class="pdf-item-semana">' +
      escapeHTML(fecha) +
      (reciente ? ' <span class="semana-tag">RECIENTE</span>' : "") +
      "</span>" +
      "</div>" +
      '<span class="pdf-item-ver">Ver</span>';

    div.addEventListener("click", function () {
      abrirVisorDrive(file);
    });

    return div;
  }

  function abrirVisorDrive(file) {
    var overlay = document.getElementById("pdfOverlay");
    var iframe = document.getElementById("pdf-iframe");
    var loader = document.getElementById("pdfLoader");
    var titulo = document.getElementById("pdfNombre");
    var btnDescarga = document.getElementById("pdfDescargarBtn");

    if (titulo) titulo.textContent = file.name || "Documento";

    if (iframe) {
      iframe.src = "https://drive.google.com/file/d/" + file.id + "/preview";

      iframe.onload = function () {
        if (loader) loader.classList.add("oculto");
      };
    }

    if (btnDescarga) {
      btnDescarga.href =
        "https://drive.google.com/uc?export=download&id=" + file.id;
    }

    if (loader) loader.classList.remove("oculto");
    if (overlay) overlay.classList.add("visible");

    setScrollBloqueado(true);
  }

  function cerrarVisor() {
    var overlay = document.getElementById("pdfOverlay");
    var iframe = document.getElementById("pdf-iframe");

    if (overlay) overlay.classList.remove("visible");
    if (iframe) iframe.src = "";

    var overlay1 = document.getElementById("overlay");
    var overlay2 = document.getElementById("overlay2");

    if (
      (!overlay1 || !overlay1.classList.contains("visible")) &&
      (!overlay2 || !overlay2.classList.contains("visible"))
    ) {
      setScrollBloqueado(false);
    }
  }

  function compartirWhatsApp() {
    var materia = window.AppState.materia || "Materia";
    var grado = window.AppState.gradoAbreviada || "Grado";

    var msg = encodeURIComponent(
      "*Portal C.E. El Tinteral*\n\n" +
        "Revisa los recursos de:\n*" +
        materia +
        "* - *" +
        grado +
        "*\n\n" +
        window.AppConfig.LINK_PORTAL
    );

    window.open(
      "https://wa.me/" + window.AppConfig.NUMERO_WHATSAPP + "?text=" + msg,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function crearTarjetaRecurso(icono, titulo, desc, fullWidth) {
    var btn = document.createElement("button");

    btn.className = "rec-card" + (fullWidth ? " full-width" : "");

    btn.innerHTML =
      '<span class="ri">' +
      '<i data-lucide="' +
      icono +
      '"></i>' +
      "</span>" +
      '<span class="rn">' +
      escapeHTML(titulo) +
      "</span>" +
      '<span class="rd">' +
      escapeHTML(desc) +
      "</span>";

    btn.addEventListener("click", abrirDrive);

    return btn;
  }

  function inicializarTarjetas() {
    var gridTop = document.getElementById("grid-recursos-top");
    var gridBottom = document.getElementById("grid-recursos-bottom");

    if (!gridTop || !gridBottom) return;

    gridTop.innerHTML = "";
    gridBottom.innerHTML = "";

    gridTop.appendChild(
      crearTarjetaRecurso(
        "clipboard-list",
        "Guías de Aprendizaje",
        "Instrucciones semanales",
        false
      )
    );

    gridTop.appendChild(
      crearTarjetaRecurso(
        "calendar",
        "Horarios y Avisos",
        "Fechas importantes",
        false
      )
    );

    gridBottom.appendChild(
      crearTarjetaRecurso(
        "book",
        "Libros de Texto",
        "Material de consulta principal",
        true
      )
    );

    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener("DOMContentLoaded", function () {
    inicializarTarjetas();

    var btnCerrar1 = document.querySelector(".btn-cerrar-sheet");
    var btnCerrar2 = document.querySelector(".btn-cerrar-sheet2");
    var btnCerrarVisor = document.querySelector(".btn-cerrar-visor");
    var btnTareas = document.getElementById("btnAbrirTareas");
    var btnWhatsapp = document.getElementById("waBtnTareas");
    var histToggle = document.getElementById("histToggle");
    var overlay = document.getElementById("overlay");
    var overlay2 = document.getElementById("overlay2");

    if (btnCerrar1) btnCerrar1.addEventListener("click", cerrarSheet);
    if (btnCerrar2) btnCerrar2.addEventListener("click", cerrarSheet2);
    if (btnCerrarVisor) btnCerrarVisor.addEventListener("click", cerrarVisor);
    if (btnTareas) btnTareas.addEventListener("click", abrirSubTareas);
    if (btnWhatsapp) btnWhatsapp.addEventListener("click", compartirWhatsApp);

    if (histToggle) {
      histToggle.addEventListener("click", function () {
        var panel = document.getElementById("histPanel");
        var expanded = this.getAttribute("aria-expanded") === "true";

        this.setAttribute("aria-expanded", String(!expanded));

        if (panel) panel.classList.toggle("visible");
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target.id === "overlay") cerrarSheet();
      });
    }

    if (overlay2) {
      overlay2.addEventListener("click", function (e) {
        if (e.target.id === "overlay2") cerrarSheet2();
      });
    }
  });

  return {
    abrirSheet: abrirSheet
  };
})();