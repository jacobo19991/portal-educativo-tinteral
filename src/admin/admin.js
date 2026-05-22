import { checkSession, loginAdmin, logoutAdmin } from './services/auth.js';
import { fetchCatalogo, peticionAdmin } from './services/api.js';
import { renderizarCatalogo, generarSkeletonHTML } from './components/catalog.js';
import { abrirModalMateria, cerrarModal, getModalFormData } from './components/modal.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    
    // 1. Verificación Inicial de Sesión
    const session = await checkSession();
    if (session) {
        mostrarDashboard();
    }

    // 2. Manejo de Login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        const btn = document.getElementById('btnIngresar');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Autenticando...`;
        if (window.lucide) lucide.createIcons();
        document.getElementById('loginError').classList.add('d-none');

        try {
            await loginAdmin(email, password);
            btn.innerHTML = originalText;
            if (window.lucide) lucide.createIcons();
            mostrarDashboard();
        } catch (error) {
            btn.innerHTML = originalText;
            if (window.lucide) lucide.createIcons();
            document.getElementById('loginError').textContent = error.message;
            document.getElementById('loginError').classList.remove('d-none');
        }
    });

    // 3. Manejo de Logout
    document.getElementById('btnSalir').addEventListener('click', async () => {
        await logoutAdmin();
        document.getElementById('adminDashboard').classList.remove('visible');
        document.getElementById('adminDashboard').classList.add('d-none');
        document.getElementById('loginScreen').classList.remove('d-none');
        document.getElementById('loginScreen').classList.add('visible');
    });

    // 4. Recargar Datos
    document.getElementById('btnRefresh').addEventListener('click', () => {
        cargarYRenderizarCatalogo();
    });

    // 5. Manejo de Modal
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);
    
    document.getElementById('materiaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = getModalFormData();
        
        const action = data.id ? 'EDIT_MATERIA' : 'ADD_MATERIA';
        const payload = { nombre: data.nombre, folder_id: data.folderId, orden: data.orden };
        
        if (data.id) payload.id = data.id;
        if (!data.id) payload.grado_id = data.gradoId;

        const btn = document.getElementById('btnGuardarMateria');
        btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Guardando...`;
        if (window.lucide) lucide.createIcons();

        try {
            await peticionAdmin(action, payload);
            cerrarModal();
            await cargarYRenderizarCatalogo();
        } catch (error) {
            manejarErrorSesion(error);
        } finally {
            btn.innerHTML = `<i data-lucide="save"></i> Guardar Cambios`;
            if (window.lucide) lucide.createIcons();
        }
    });
});

function mostrarDashboard() {
    document.getElementById('loginScreen').classList.remove('visible');
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('adminDashboard').classList.remove('d-none');
    document.getElementById('adminDashboard').classList.add('visible');
    
    // Adaptación UI según el rol
    const badge = document.getElementById('roleBadge');
    if (window.userRole === 'admin') {
        badge.innerHTML = `<i data-lucide="shield-alert" style="width:14px;height:14px;"></i> Administrador`;
        badge.style.background = 'rgba(239, 68, 68, 0.2)';
        badge.style.color = '#fca5a5';
    } else {
        badge.innerHTML = `<i data-lucide="user" style="width:14px;height:14px;"></i> Perfil Docente`;
        badge.style.background = 'rgba(59, 130, 246, 0.2)';
        badge.style.color = '#93c5fd';
    }
    if (window.lucide) lucide.createIcons();

    cargarYRenderizarCatalogo();
}

async function cargarYRenderizarCatalogo() {
    const container = document.getElementById('catalogoContainer');
    container.innerHTML = generarSkeletonHTML(); // UX Moderna: Skeleton Loader
    
    try {
        const data = await fetchCatalogo();
        
        renderizarCatalogo(data, 
            (matEdit) => abrirModalMateria(null, matEdit), 
            async (idDelete) => {
                // UX Moderna: Edición Optimista
                const cardFisica = document.getElementById(`materia-${idDelete}`);
                if (cardFisica) {
                    cardFisica.classList.add('optimistic-hide'); // Animación de desaparición instantánea
                }

                try {
                    await peticionAdmin('DELETE_MATERIA', { id: idDelete });
                    if (cardFisica) cardFisica.remove(); // Borrado real silencioso
                } catch(err) {
                    // Si falla, revertimos el cambio visual (Fallback seguro)
                    if (cardFisica) cardFisica.classList.remove('optimistic-hide');
                    manejarErrorSesion(err);
                }
            }
        );
    } catch (error) {
        container.innerHTML = `<div class="error-msg">Error de conexión. ¿Está configurado Supabase en Vercel?</div>`;
    }
}

function manejarErrorSesion(error) {
    alert('Error: ' + error.message);
    if (error.message.includes('JWT') || error.message.includes('PGRST301')) {
        document.getElementById('btnSalir').click();
    }
}
