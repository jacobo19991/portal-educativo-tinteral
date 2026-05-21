document.addEventListener('DOMContentLoaded', () => {

  const buscador = document.getElementById('buscadorMaterias');
  const spinner = document.getElementById('search-spinner');
  const dropdown = document.getElementById('search-dropdown');

  let timeoutId;

  if (!buscador) return;


  // ======================
  // INPUT BUSCADOR
  // ======================

  buscador.addEventListener('input', (e) => {

    const term = e.target.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (spinner) spinner.classList.remove('hidden');

    if (dropdown)
      dropdown.classList.add('hidden');

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {

      filtrarMaterias(term);

      if (spinner)
        spinner.classList.add('hidden');

    }, 300);

  });


  // ======================
  // CLICK
  // ======================

  buscador.addEventListener('click', () => {

    if (!buscador.value.trim()) {

      if (
        dropdown &&
        !dropdown.classList.contains('hidden')
      ) {

        dropdown.classList.add('hidden');

      } else {

        renderRecentSearches();

      }

    }

  });


  // ======================
  // FOCUS
  // ======================

  buscador.addEventListener('focus', () => {

    if (
      !buscador.value.trim()
      &&
      dropdown
      &&
      dropdown.classList.contains('hidden')
    ) {

      renderRecentSearches();

    }

  });


  // ======================
  // CERRAR AL TOCAR FUERA
  // ======================

  document.addEventListener('click', (e) => {

    if (
      dropdown &&
      !buscador.contains(e.target)
      &&
      !dropdown.contains(e.target)
    ) {

      dropdown.classList.add('hidden');

    }

  });

});




// ==========================
// LOCAL STORAGE HELPERS
// ==========================

function getRecents() {

  return JSON.parse(
    localStorage.getItem('recents_v2')
    || '[]'
  );

}


function saveRecents(data) {

  localStorage.setItem(
    'recents_v2',
    JSON.stringify(data)
  );

}



// ==========================
// APP GLOBAL
// ==========================

window.BuscadorApp = {

  addRecent: function (
    grado,
    materia,
    folderId
  ) {

    let recents = getRecents();

    recents =
      recents.filter(
        r => r.folderId !== folderId
      );

    recents.unshift({
      grado,
      materia,
      folderId
    });

    if (recents.length > 5) {

      recents.pop();

    }

    saveRecents(recents);

  }

};




// ==========================
// RENDER RECIENTES
// ==========================

function renderRecentSearches() {

  const recents = getRecents();

  const dropdown =
    document.getElementById(
      'search-dropdown'
    );

  const list =
    document.getElementById(
      'recent-searches'
    );


  if (
    !dropdown ||
    !list
  ) return;


  if (recents.length === 0) {

    dropdown.classList.add(
      'hidden'
    );

    return;

  }


  list.innerHTML = '';


  recents.forEach(r => {

    const div =
      document.createElement('div');

    div.className =
      'recent-item';



    const icon =
      document.createElement('i');

    icon.setAttribute(
      'data-lucide',
      'history'
    );

    icon.className =
      'icon-md icon-muted';



    const span =
      document.createElement(
        'span'
      );



    const bold =
      document.createElement(
        'b'
      );

    bold.textContent =
      r.materia;



    const grado =
      document.createElement(
        'span'
      );

    grado.className =
      'recent-grado';

    grado.textContent =
      ` (${r.grado})`;



    span.appendChild(
      bold
    );

    span.appendChild(
      grado
    );


    div.append(
      icon,
      span
    );


    div.addEventListener(
      'click',
      () => {

        dropdown.classList.add(
          'hidden'
        );


        if (window.AppState) {

          window.AppState.gradoAbreviada =
            r.grado || "";

          window.AppState.grado =
            r.grado || "";

          window.AppState.materia =
            r.materia || "";

          window.AppState.folderId =
            r.folderId || "";

        }


        if (
          window.OverlaysApp &&
          typeof
          window.OverlaysApp.abrirSheet
          === 'function'
        ) {

          window.OverlaysApp
            .abrirSheet();

        }

      });


    list.appendChild(
      div
    );

  });


  if (window.lucide) {

    window.lucide
      .createIcons({
        root: list
      });

  }

  dropdown.classList.remove(
    'hidden'
  );

}




// ==========================
// FILTRAR
// ==========================

let domCache = null;

function filtrarMaterias(term) {
  if (!domCache || domCache.length === 0) {
    domCache = document.querySelectorAll('.nivel-wrap');
  }
  const nivelWraps = domCache;

  if (term === '') {
    document.querySelectorAll('.materia-row').forEach(row => {

        row.style.display = 'flex';

        const nombre =
          row.querySelector(
            '.mat-nombre'
          );

        if (
          nombre &&
          row.dataset.materiaOriginal
        ) {

          nombre.innerHTML =
            row.dataset.materiaOriginal;

        }

      });



    document
      .querySelectorAll(
        '.grado-wrap,.nivel-wrap'
      )
      .forEach(el => {

        el.style.display = 'block';

      });



    document
      .querySelectorAll(
        '.nivel-panel,.materias-panel'
      )
      .forEach(panel => {

        panel.classList.remove(
          'visible'
        );

      });



    document
      .querySelectorAll(
        '.nivel-btn,.grado-btn'
      )
      .forEach(btn => {

        btn.classList.remove(
          'abierto'
        );

      });

    return;

  }



  nivelWraps.forEach(
    nivelWrap => {

      let nivelVisible = false;


      const nivelBtn =
        nivelWrap.querySelector(
          '.nivel-btn'
        );


      const nombreNivel =
        nivelBtn
          ?
          nivelBtn.textContent
            .toLowerCase()
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              ""
            )
          : "";


      const matchNivel =
        nombreNivel.includes(
          term
        );


      const gradoWraps =
        nivelWrap.querySelectorAll(
          '.grado-wrap'
        );



      gradoWraps.forEach(
        gradoWrap => {

          let gradoVisible = false;


          const gradoBtn =
            gradoWrap.querySelector(
              '.grado-btn'
            );


          const nombreGrado =
            gradoBtn
              ?
              gradoBtn.textContent
                .toLowerCase()
                .normalize("NFD")
                .replace(
                  /[\u0300-\u036f]/g,
                  ""
                )
              : "";



          const matchGrado =
            matchNivel ||
            nombreGrado.includes(
              term
            );


          const materias =
            gradoWrap.querySelectorAll(
              '.materia-row'
            );



          materias.forEach(
            materia => {


              const nombreEl =
                materia.querySelector(
                  '.mat-nombre'
                );


              if (!nombreEl)
                return;



              const original =

                materia.dataset
                  .materiaOriginal ||

                nombreEl.textContent;


              if (
                !materia.dataset
                  .materiaOriginal
              ) {

                materia.dataset
                  .materiaOriginal =
                  original;

              }


              const normalizado =
                original
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(
                    /[\u0300-\u036f]/g,
                    ""
                  );



              if (
                matchGrado ||
                normalizado.includes(
                  term
                )
              ) {

                materia.style.display =
                  'flex';

                gradoVisible = true;

                nivelVisible = true;



                nombreEl.innerHTML =
                  original;


                if (
                  term &&
                  normalizado.includes(
                    term
                  )
                ) {

                  const regex =
                    new RegExp(
                      `(${term})`,
                      'gi'
                    );


                  nombreEl.innerHTML =
                    original.replace(
                      regex,
                      '<mark class="highlight">$1</mark>'
                    );

                }

              } else {

                materia.style.display =
                  'none';

                nombreEl.innerHTML =
                  original;

              }

            });



          const panel =
            gradoWrap.querySelector(
              '.materias-panel'
            );



          if (gradoVisible) {

            gradoWrap.style.display =
              'block';

            panel?.classList.add(
              'visible'
            );

            gradoBtn?.classList.add(
              'abierto'
            );

          } else {

            gradoWrap.style.display =
              'none';

            panel?.classList.remove(
              'visible'
            );

            gradoBtn?.classList.remove(
              'abierto'
            );

          }

        });



      const nivelPanel =
        nivelWrap.querySelector(
          '.nivel-panel'
        );



      if (nivelVisible) {

        nivelWrap.style.display =
          'block';

        nivelPanel?.classList.add(
          'visible'
        );

        nivelBtn?.classList.add(
          'abierto'
        );

      } else {

        nivelWrap.style.display =
          'none';

        nivelPanel?.classList.remove(
          'visible'
        );

        nivelBtn?.classList.remove(
          'abierto'
        );

      }

    });

}