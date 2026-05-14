document.addEventListener("DOMContentLoaded", function () {
  var buscador = document.getElementById("buscadorMaterias");
  var spinner = document.getElementById("search-spinner");
  var dropdown = document.getElementById("search-dropdown");

  var timeoutId;

  if (!buscador) return;

  buscador.addEventListener("input", function (e) {
    var term = normalizarBusqueda(e.target.value);

    if (spinner) spinner.classList.remove("hidden");
    if (dropdown) dropdown.classList.add("hidden");

    clearTimeout(timeoutId);

    timeoutId = setTimeout(function () {
      filtrarMaterias(term);

      if (spinner) spinner.classList.add("hidden");
    }, 220);
  });

  buscador.addEventListener("click", function () {
    if (!buscador.value.trim()) {
      if (dropdown && !dropdown.classList.contains("hidden")) {
        dropdown.classList.add("hidden");
      } else {
        renderRecentSearches();
      }
    }
  });

  buscador.addEventListener("focus", function () {
    if (
      !buscador.value.trim() &&
      dropdown &&
      dropdown.classList.contains("hidden")
    ) {
      renderRecentSearches();
    }
  });

  document.addEventListener("click", function (e) {
    if (
      dropdown &&
      !buscador.contains(e.target) &&
      !dropdown.contains(e.target)
    ) {
      dropdown.classList.add("hidden");
    }
  });
});

function normalizarBusqueda(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeRegExp(texto) {
  return String(texto || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRecents() {
  try {
    return JSON.parse(localStorage.getItem("recents_v2") || "[]");
  } catch (e) {
    return [];
  }
}

function saveRecents(data) {
  localStorage.setItem("recents_v2", JSON.stringify(data));
}

window.BuscadorApp = {
  addRecent: function (grado, materia, folderId) {
    var recents = getRecents();

    recents = recents.filter(function (r) {
      return r.folderId !== folderId;
    });

    recents.unshift({
      grado: grado,
      materia: materia,
      folderId: folderId
    });

    if (recents.length > 5) recents.pop();

    saveRecents(recents);
  }
};

function renderRecentSearches() {
  var recents = getRecents();
  var dropdown = document.getElementById("search-dropdown");
  var list = document.getElementById("recent-searches");

  if (!dropdown || !list) return;

  if (recents.length === 0) {
    dropdown.classList.add("hidden");
    return;
  }

  list.innerHTML = "";

  recents.forEach(function (r) {
    var div = document.createElement("div");
    div.className = "recent-item";

    var icon = document.createElement("i");
    icon.setAttribute("data-lucide", "history");
    icon.className = "icon-md icon-muted";

    var span = document.createElement("span");

    var bold = document.createElement("b");
    bold.textContent = r.materia;

    var grado = document.createElement("span");
    grado.className = "recent-grado";
    grado.textContent = " (" + r.grado + ")";

    span.appendChild(bold);
    span.appendChild(grado);

    div.append(icon, span);

    div.addEventListener("click", function () {
      dropdown.classList.add("hidden");

      if (window.AppState) {
        window.AppState.gradoAbreviada = r.grado || "";
        window.AppState.grado = r.grado || "";
        window.AppState.materia = r.materia || "";
        window.AppState.folderId = r.folderId || "";
      }

      if (
        window.OverlaysApp &&
        typeof window.OverlaysApp.abrirSheet === "function"
      ) {
        window.OverlaysApp.abrirSheet();
      }
    });

    list.appendChild(div);
  });

  if (window.lucide) window.lucide.createIcons({ root: list });

  dropdown.classList.remove("hidden");
}

function filtrarMaterias(term) {
  var nivelWraps = document.querySelectorAll(".nivel-wrap");

  if (term === "") {
    document.querySelectorAll(".materia-row").forEach(function (row) {
      row.style.display = "flex";

      var nombre = row.querySelector(".mat-nombre");

      if (nombre && row.dataset.materiaOriginal) {
        nombre.innerHTML = row.dataset.materiaOriginal;
      }
    });

    document.querySelectorAll(".grado-wrap,.nivel-wrap").forEach(function (el) {
      el.style.display = "block";
    });

    document.querySelectorAll(".nivel-panel,.materias-panel").forEach(function (panel) {
      panel.classList.remove("visible");
    });

    document.querySelectorAll(".nivel-btn,.grado-btn").forEach(function (btn) {
      btn.classList.remove("abierto");
    });

    return;
  }

  nivelWraps.forEach(function (nivelWrap) {
    var nivelVisible = false;
    var nivelBtn = nivelWrap.querySelector(".nivel-btn");

    var nombreNivel = nivelBtn
      ? normalizarBusqueda(nivelBtn.textContent)
      : "";

    var matchNivel = nombreNivel.indexOf(term) !== -1;
    var gradoWraps = nivelWrap.querySelectorAll(".grado-wrap");

    gradoWraps.forEach(function (gradoWrap) {
      var gradoVisible = false;
      var gradoBtn = gradoWrap.querySelector(".grado-btn");

      var nombreGrado = gradoBtn
        ? normalizarBusqueda(gradoBtn.textContent)
        : "";

      var matchGrado = matchNivel || nombreGrado.indexOf(term) !== -1;
      var materias = gradoWrap.querySelectorAll(".materia-row");

      materias.forEach(function (materia) {
        var nombreEl = materia.querySelector(".mat-nombre");
        if (!nombreEl) return;

        var original = materia.dataset.materiaOriginal || nombreEl.textContent;

        if (!materia.dataset.materiaOriginal) {
          materia.dataset.materiaOriginal = original;
        }

        var normalizado = normalizarBusqueda(original);

        if (matchGrado || normalizado.indexOf(term) !== -1) {
          materia.style.display = "flex";
          gradoVisible = true;
          nivelVisible = true;

          nombreEl.innerHTML = original;

          if (term && normalizado.indexOf(term) !== -1) {
            var regex = new RegExp("(" + escapeRegExp(term) + ")", "gi");

            nombreEl.innerHTML = original.replace(
              regex,
              '<mark class="highlight">$1</mark>'
            );
          }
        } else {
          materia.style.display = "none";
          nombreEl.innerHTML = original;
        }
      });

      var panel = gradoWrap.querySelector(".materias-panel");

      if (gradoVisible) {
        gradoWrap.style.display = "block";
        if (panel) panel.classList.add("visible");
        if (gradoBtn) gradoBtn.classList.add("abierto");
      } else {
        gradoWrap.style.display = "none";
        if (panel) panel.classList.remove("visible");
        if (gradoBtn) gradoBtn.classList.remove("abierto");
      }
    });

    var nivelPanel = nivelWrap.querySelector(".nivel-panel");

    if (nivelVisible) {
      nivelWrap.style.display = "block";
      if (nivelPanel) nivelPanel.classList.add("visible");
      if (nivelBtn) nivelBtn.classList.add("abierto");
    } else {
      nivelWrap.style.display = "none";
      if (nivelPanel) nivelPanel.classList.remove("visible");
      if (nivelBtn) nivelBtn.classList.remove("abierto");
    }
  });
}