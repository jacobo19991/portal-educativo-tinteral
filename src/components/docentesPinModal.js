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

      let isApproved = false;

      try {
        const res = await fetchWithTimeout('/api/validar-pin-docente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinValue })
        }, 10000);

        if (res.ok) {
          const data = await res.json();
          if (data && data.valid === true) isApproved = true;
        }
      } catch (err) {
        console.warn('Backend API inaccesible, intentando verificación local:', err);
        // Fallback para servidor de desarrollo local estático o sin Vercel Functions
        if (pinValue === '2026') {
          isApproved = true;
        }
      }

      if (isApproved) {
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
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerText = 'Ingresar';
        }
      }
    });
  }
}
