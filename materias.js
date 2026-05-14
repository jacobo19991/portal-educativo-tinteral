document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('contenedor-niveles');
  if (!contenedor) return;

  try {
    if (!window.MATERIAS_DATA) {
      throw new Error('No se encontró window.MATERIAS_DATA. Verifica que materiasData.js esté cargado.');
    }
    const niveles = window.MATERIAS_DATA.niveles;
    window.materiasDataCompleta = niveles;
    renderNiveles(niveles, contenedor);
  } catch (error) {
    console.error('Error cargando materias:', error);
    contenedor.innerHTML = '<div class="pin-error-msg d-block text-center">⚠️ Error al inicializar el plan de estudios.</div>';
  }
});

function renderNiveles(niveles, contenedor) {
  contenedor.innerHTML = ''; // Limpiar skeletons

  niveles.forEach(nivel => {
    const nivelWrap = document.createElement('div');
    nivelWrap.className = 'nivel-wrap';

    let iconName = 'folder';
    if(nivel.icono.includes('🌱') || nivel.icono.includes('👶')) iconName = 'baby';
    else if(nivel.icono.includes('📗')) iconName = 'book-open';
    else if(nivel.icono.includes('📘')) iconName = 'library';
    else if(nivel.icono.includes('🎓')) iconName = 'graduation-cap';

    const btnNivel = document.createElement('button');
    btnNivel.className = `nivel-btn ${nivel.claseColor}`;
    btnNivel.innerHTML = `<span><i data-lucide="${iconName}" class="icon-2xl icon-align"></i></span> ${nivel.nombre} <span class="flecha" aria-hidden="true"><i data-lucide="chevron-down" class="icon-xl"></i></span>`;

    // Panel de Nivel
    const panelNivel = document.createElement('div');
    panelNivel.className = 'nivel-panel';
    panelNivel.id = `panel-${nivel.id}`;

    // Lógica para renderizar grados
    nivel.grados.forEach(grado => {
      const gradoWrap = document.createElement('div');
      gradoWrap.className = 'grado-wrap';

      let gIcon = 'file-text';
      if(grado.icono.includes('👶')) gIcon = 'smile';
      else if(grado.icono.includes('📗')) gIcon = 'edit-2';
      else if(grado.icono.includes('📘')) gIcon = 'edit-3';

      const btnGrado = document.createElement('button');
      btnGrado.className = 'grado-btn';
      btnGrado.innerHTML = `<span><i data-lucide="${gIcon}" class="icon-lg icon-align"></i></span> ${grado.nombre} <span class="gf" aria-hidden="true"><i data-lucide="chevron-down" class="icon-md"></i></span>`;

      const panelMaterias = document.createElement('div');
      panelMaterias.className = 'materias-panel';
      panelMaterias.id = `g-${grado.id}`;
      panelMaterias.innerHTML = '<p class="mat-titulo"><i data-lucide="folder-open" class="icon-md icon-align icon-mr"></i> Materias</p>';

      grado.materias.forEach(mat => {
        const row = document.createElement('div');
        row.className = 'materia-row';
        row.dataset.folderId = mat.folderId;
        row.dataset.materia = mat.nombre;
        row.dataset.grado = grado.nombre;
        row.dataset.gradoAbreviado = grado.nombreAbreviado;

        row.innerHTML = `<span class="mat-nombre">${mat.nombre}</span><span class="mat-ver ${nivel.claseColor}">Ver <i data-lucide="arrow-right" class="icon-md icon-align"></i></span>`;

        row.addEventListener('click', () => {
          window.AppState.gradoAbreviada = grado.nombreAbreviado;
          window.AppState.grado = grado.nombreAbreviado;
          window.AppState.materia = mat.nombre;
          window.AppState.folderId = mat.folderId;
          
          if(window.BuscadorApp) window.BuscadorApp.addRecent(grado.nombreAbreviado, mat.nombre, mat.folderId);
          if (window.OverlaysApp) window.OverlaysApp.abrirSheet();
        });

        panelMaterias.appendChild(row);
      });

      // Toggle Grado
      btnGrado.addEventListener('click', () => {
        const abierto = panelMaterias.classList.contains('visible');
        panelNivel.querySelectorAll('.materias-panel').forEach(p => p.classList.remove('visible'));
        panelNivel.querySelectorAll('.grado-btn').forEach(b => b.classList.remove('abierto'));
        if (!abierto) {
          panelMaterias.classList.add('visible');
          btnGrado.classList.add('abierto');
        }
      });

      gradoWrap.appendChild(btnGrado);
      gradoWrap.appendChild(panelMaterias);
      panelNivel.appendChild(gradoWrap);
    });

    // Toggle Nivel
    btnNivel.addEventListener('click', () => {
      document.querySelectorAll('.nivel-panel').forEach(p => { if (p !== panelNivel) p.classList.remove('visible'); });
      document.querySelectorAll('.nivel-btn').forEach(b => { if (b !== btnNivel) b.classList.remove('abierto'); });
      panelNivel.classList.toggle('visible');
      btnNivel.classList.toggle('abierto');
    });

    nivelWrap.appendChild(btnNivel);
    nivelWrap.appendChild(panelNivel);
    contenedor.appendChild(nivelWrap);
  });
  
  if (window.lucide) window.lucide.createIcons();
}
