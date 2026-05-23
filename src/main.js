import './config/globals.js';
import './data/materiasData.js';
import { renderNiveles } from './components/materias.js';
import './components/buscador.js';
import './components/overlays.js';

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('✅ ServiceWorker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.error('❌ Error al registrar el ServiceWorker:', error);
            });
    });
}

// Conexión asíncrona a Supabase (vía Vercel Proxy)
async function fetchMateriasFromDB() {
    try {
        const res = await fetch('/api/materias');
        if (!res.ok) throw new Error('Error al conectar con la base de datos');
        
        const dbData = await res.json();
        
        // Si hay datos válidos en la Base de Datos, actualizamos la plataforma
        if (dbData && dbData.niveles && dbData.niveles.length > 0) {
            window.MATERIAS_DATA = dbData;
            window.materiasDataCompleta = dbData.niveles;
            
            const contenedor = document.getElementById('contenedor-niveles');
            if (contenedor) {
                renderNiveles(dbData.niveles, contenedor);
                console.log("✅ Datos frescos cargados desde Supabase (Base de Datos)");
            }
        }
    } catch (error) {
        // Riesgo Cero: Si falla Supabase o el internet, el portal ya está usando materiasData.js (Fallback local)
        console.warn("⚠️ Aviso: Usando datos locales (Fallback). Razón:", error.message);
    }
}

// Iniciar búsqueda en la base de datos inmediatamente después de pintar la página
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }
    fetchMateriasFromDB();
});

// Detectar cambios en la conexión de red (Caché Offline Sólido)
window.addEventListener('offline', () => {
    if (window.Toast) {
        window.Toast.show('Sin conexión. Mostrando datos guardados en caché.', 'warning');
    }
    console.warn('[Network] Offline: Usando caché local.');
});

window.addEventListener('online', () => {
    if (window.Toast) {
        window.Toast.show('Conexión restaurada.', 'success');
    }
    console.log('[Network] Online: Conexión recuperada.');
});
