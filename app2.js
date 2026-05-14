// Configuración global y estado de la app
window.AppConfig = {
  SEMANA_ACTIVA: 4,
  LINK_PORTAL: 'https://jacobo19991.github.io/portal-tinteral-v4/ACTUALIZACIONportal_tinteral_v4%20(1).html',
  NUMERO_WHATSAPP: '50363097679',
  DRIVE_API_KEY: 'AIzaSyCwSR5_wwGBlvb3vyH7CkXnIOq6swvxP34',
  SHEET_AVISOS_ID: '1wv5lCCkaB0NvHUDdHh5qNkpD3T6Q2ovmnT5T30hiMDs'
};

window.AppState = {
  folderId: "",
  materia: "",
  grado: "",
  gradoAbreviada: "", // Propiedad agregada para compatibilidad
  materiaAbreviada: "",
  currentFileId: ""
};

window.Toast = {
  show: function (message, type = 'info') {
    const container = document.getElementById('toast-container') || this.createContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'info';
    if (type === 'error') icon = 'alert-circle';
    if (type === 'success') icon = 'check-circle';

    toast.innerHTML = `<i data-lucide="${icon}" class="icon-xl"></i> <span>${message}</span>`;
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons({ root: toast });

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
  },
  createContainer: function () {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  }
};

// Utilidad para escapar HTML y prevenir XSS
window.escapeHtml = function (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  cargarAvisosDirector();
});

function setupTheme() {
  const themeSwitch = document.getElementById('checkbox-theme');
  if (!themeSwitch) return;
  const currentTheme = localStorage.getItem('theme') || 'light';
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeSwitch.checked = true;
  }

  themeSwitch.addEventListener('change', function (e) {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  });
}

async function cargarAvisosDirector() {
  const url = `https://docs.google.com/spreadsheets/d/${window.AppConfig.SHEET_AVISOS_ID}/gviz/tq?tqx=out:json`;
  try {
    const response = await fetch(url);
    let text = await response.text();
    text = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const data = JSON.parse(text);

    if (data && data.table && data.table.rows && data.table.rows.length > 0) {
      const row = data.table.rows[0];
      if (row.c && row.c.length > 0 && row.c[0] && row.c[0].v) {
        const mensaje = String(row.c[0].v).trim();
        const banner = document.getElementById('bannerAvisos');
        if (mensaje !== "" && banner) {
          banner.textContent = `⚠️ ${mensaje}`;
          banner.style.display = 'block';
        }
      }
    }
  } catch (error) {
    console.error('Error cargando avisos:', error);
  }
}
