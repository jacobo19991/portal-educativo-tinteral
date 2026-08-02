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
      handleResourceAccess(e, btnDrive.href, true);
    });
  }

  if (btnManual) {
    btnManual.addEventListener('click', (e) => {
      handleResourceAccess(e, btnManual.href, false);
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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pinValue = inputPin ? inputPin.value.trim() : '';

      if (!pinValue) {
        if (errorBox) {
          errorBox.textContent = '⚠️ Ingrese un PIN docente.';
          errorBox.classList.remove('hidden');
        }
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Validando...';
      }
      if (errorBox) errorBox.classList.add('hidden');

      try {
        const res = await fetchWithTimeout('/api/validar-pin-docente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinValue })
        }, 10000);

        const data = await res.json();

        if (data && data.valid === true) {
          sessionStorage.setItem('docente_pin_valid_until', String(Date.now() + 30 * 60 * 1000));
          const destUrl = targetUrl;
          const openTab = targetBlank;
          cerrarModal();

          if (destUrl) {
            if (openTab) {
              window.open(destUrl, '_blank', 'noopener,noreferrer');
            } else {
              window.location.href = destUrl;
            }
          }
        } else {
          if (errorBox) {
            errorBox.textContent = '⚠️ PIN incorrecto. Intenta de nuevo.';
            errorBox.classList.remove('hidden');
          }
          if (inputPin) {
            inputPin.focus();
            inputPin.select();
          }
        }
      } catch (err) {
        console.error('Error al validar PIN docente:', err);
        if (errorBox) {
          errorBox.textContent = '⚠️ Error al validar el PIN. Intenta de nuevo.';
          errorBox.classList.remove('hidden');
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerText = 'Ingresar';
        }
      }
    });
  }
}
