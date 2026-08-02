import { fetchWithTimeout } from '../utils/fetchUtils.js';

document.addEventListener('DOMContentLoaded', () => {
  setupCambiarPinDocenteModal();
});

export function setupCambiarPinDocenteModal() {
  const btnAbrir = document.getElementById('btn-cambiar-pin-docente');
  const modal = document.getElementById('overlayCambiarPinDocente');
  const form = document.getElementById('formCambiarPinDocente');
  
  const inputActual = document.getElementById('inputPinActual');
  const inputNuevo = document.getElementById('inputPinNuevo');
  const inputConf = document.getElementById('inputConfirmacionPin');
  
  const errorBox = document.getElementById('errorCambiarPinDocente');
  const successBox = document.getElementById('successCambiarPinDocente');
  
  const btnSubmit = document.getElementById('btnSubmitCambiarPinDocente');
  const btnCancelar = document.getElementById('btnCancelarCambiarPinDocente');
  const btnCerrar = document.getElementById('btnCerrarCambiarPinDocente');
  const btnTogglePass = document.getElementById('btnToggleMostrarPin');

  function id(name) {
    return document.getElementById(name);
  }

  function limpiarCampos() {
    if (inputActual) inputActual.value = '';
    if (inputNuevo) inputNuevo.value = '';
    if (inputConf) inputConf.value = '';
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
    if (successBox) {
      successBox.textContent = '';
      successBox.classList.add('hidden');
    }
  }

  function abrirModal() {
    limpiarCampos();
    if (modal) modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    if (inputActual) inputActual.focus();
  }

  function cerrarModal() {
    if (modal) modal.classList.remove('visible');
    document.body.style.overflow = '';
    limpiarCampos();
    if (btnAbrir) btnAbrir.focus();
  }

  if (btnAbrir) {
    btnAbrir.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModal();
    });
  }

  if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);
  if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'overlayCambiarPinDocente') cerrarModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('visible')) {
      cerrarModal();
    }
  });

  if (btnTogglePass) {
    btnTogglePass.addEventListener('click', () => {
      const isPass = inputActual && inputActual.type === 'password';
      const newType = isPass ? 'text' : 'password';
      if (inputActual) inputActual.type = newType;
      if (inputNuevo) inputNuevo.type = newType;
      if (inputConf) inputConf.type = newType;
      btnTogglePass.setAttribute('aria-label', isPass ? 'Ocultar contraseñas' : 'Mostrar contraseñas');
      btnTogglePass.textContent = isPass ? '🔒 Ocultar' : '👁️ Mostrar';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const actual = inputActual ? inputActual.value.trim() : '';
      const nuevo = inputNuevo ? inputNuevo.value.trim() : '';
      const conf = inputConf ? inputConf.value.trim() : '';

      if (errorBox) errorBox.classList.add('hidden');
      if (successBox) successBox.classList.add('hidden');

      if (!actual || !nuevo || !conf) {
        if (errorBox) {
          errorBox.textContent = '⚠️ Todos los campos son obligatorios.';
          errorBox.classList.remove('hidden');
        }
        return;
      }

      if (nuevo !== conf) {
        if (errorBox) {
          errorBox.textContent = '⚠️ El nuevo PIN y la confirmación no coinciden.';
          errorBox.classList.remove('hidden');
        }
        return;
      }

      if (nuevo.length < 4 || nuevo.length > 20) {
        if (errorBox) {
          errorBox.textContent = '⚠️ El PIN nuevo debe tener entre 4 y 20 caracteres.';
          errorBox.classList.remove('hidden');
        }
        return;
      }

      if (nuevo === actual) {
        if (errorBox) {
          errorBox.textContent = '⚠️ El nuevo PIN debe ser diferente al PIN actual.';
          errorBox.classList.remove('hidden');
        }
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Guardando...';
      }

        const res = await fetchWithTimeout('/api/cambiar-pin-docente', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pinActual: actual,
            pinNuevo: nuevo,
            confirmacionPin: conf
          })
        }, 10000);

        const data = await res.json();

        if (res.ok && data && data.success === true) {
          sessionStorage.removeItem('docente_pin_valid');
          sessionStorage.removeItem('docente_pin_valid_until');

          if (successBox) {
            successBox.textContent = '✅ PIN docente actualizado correctamente.';
            successBox.classList.remove('hidden');
          }

          setTimeout(() => {
            cerrarModal();
          }, 1200);
        } else {
          const errMsg = data?.error || 'No fue posible cambiar el PIN.';
          if (errorBox) {
            errorBox.textContent = `⚠️ ${errMsg}`;
            errorBox.classList.remove('hidden');
          }
        }
      } catch (err) {
        console.error('Error al cambiar PIN docente:', err);
        if (errorBox) {
          errorBox.textContent = '⚠️ Error al procesar la solicitud. Intenta de nuevo.';
          errorBox.classList.remove('hidden');
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerText = 'Guardar';
        }
      }
    });
  }
}
