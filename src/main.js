import './config/globals.js';
import './data/materiasData.js';
import { renderNiveles } from './components/materias.js';
import './components/buscador.js';
import './components/overlays.js';

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
document.addEventListener('DOMContentLoaded', fetchMateriasFromDB);
