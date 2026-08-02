import { fetchWithTimeout } from '../utils/fetchUtils.js';

document.addEventListener('DOMContentLoaded', () => {
  setupDocentesPinProtection();
});

export function setupDocentesPinProtection() {
  const btnDrive = document.getElementById('btn-docente-drive');
  const btnManual = document.getElementById('btn-docente-manual');
  
  const modal = document.getElementById('overlayPinDocente');
  const form = document.getElementById('formPinDocente');
  const inputPin = document.getElementById('inputPinDocente');
  const errorBox = document.getElementById('errorPinDocente');
  const btnSubmit = document.getElementById('btnSubmitPinDocente');
  const btnCancelar = document.getElementById('btnCancelarPinDocente');
  const btnCerrar = document.getElementById('btnCerrarPinDocente');

  let targetUrl = '';
  let targetBlank = false;

  function abrirModal(url, openInNewTab = false) {
    targetUrl = url;
    targetBlank = openInNewTab;

    if (errorBox) errorBox.classList.add('hidden');
    if (inputPin) inputPin.value = '';
    if (modal) modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    if (inputPin) inputPin.focus();
  }

  function cerrarModal() {
    if (modal) modal.classList.remove('visible');
    document.body.style.overflow = '';
    targetUrl = '';
    targetBlank = false;
  }

  function handleResourceAccess(e, url, openInNewTab = false) {
    e.preventDefault();
    const validUntil = Number(sessionStorage.getItem('docente_pin_valid_until'));
    const isAlreadyValid = Number.isFinite(validUntil) && Date.now() < validUntil;
    if (isAlreadyValid) {
      if (openInNewTab) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = url;
      }
    } else {
      abrirModal(url, openInNewTab);
    }
  }

  if (btnDrive) {
    btnDrive.addEventListener('click', (e) => {
      const url = btnDrive.dataset.url || '';
      const openBlank = btnDrive.dataset.blank === 'true';
      handleResourceAccess(e, url, openBlank);
    });
  }

  if (btnManual) {
    btnManual.addEventListener('click', (e) => {
      const url = btnManual.dataset.url || '';
      const openBlank = btnManual.dataset.blank === 'true';
      handleResourceAccess(e, url, openBlank);
    });
  }

  if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);
  if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'overlayPinDocente') cerrarModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('visible')) {
      cerrarModal();
    }
  });

  if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const pinValue = inputPin
            ? inputPin.value.trim()
            : '';

        if (!pinValue) {
            if (errorBox) {
                errorBox.textContent =
                    '⚠️ Ingrese un PIN docente.';
                errorBox.classList.remove('hidden');
            }

            return;
        }

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Validando...';
        }

        if (errorBox) {
            errorBox.classList.add('hidden');
        }

        try {
            const response = await fetchWithTimeout(
                '/api/validar-pin-docente',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        pin: pinValue
                    })
                },
                10000
            );

            const data = await response.json();

            if (data?.valid === true) {
                const expiresAt =
                    Date.now() + 30 * 60 * 1000;

                sessionStorage.setItem(
                    'docente_pin_valid_until',
                    String(expiresAt)
                );

                const destinationUrl = targetUrl;
                const openInNewTab = targetBlank;

                cerrarModal();

                if (destinationUrl) {
                    if (openInNewTab) {
                        window.open(
                            destinationUrl,
                            '_blank',
                            'noopener,noreferrer'
                        );
                    } else {
                        window.location.href =
                            destinationUrl;
                    }
                }
            } else {
                if (errorBox) {
                    errorBox.textContent =
                        '⚠️ PIN incorrecto. Intenta de nuevo.';
                    errorBox.classList.remove('hidden');
                }

                if (inputPin) {
                    inputPin.focus();
                    inputPin.select();
                }
            }
        } catch (error) {
            console.error(
                'Error al validar PIN docente:',
                error
            );

            if (errorBox) {
                errorBox.textContent =
                    '⚠️ Error al validar el PIN. Intenta de nuevo.';
                errorBox.classList.remove('hidden');
            }
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Ingresar';
                 }
            }
        });
    }
}