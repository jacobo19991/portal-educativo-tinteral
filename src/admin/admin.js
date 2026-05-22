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

    // 2. Manejo de Login por PIN (Docentes)
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = document.getElementById('adminPin').value;
        
        const btn = document.getElementById('btnIngresar');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span><i data-lucide="loader" class="spinning"></i> Validando...</span>`;
        if (window.lucide) lucide.createIcons();
        document.getElementById('loginError').classList.add('d-none');

        try {
            const res = await fetch('/api/login-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Error de conexión.');
            
            // Inyectar sesión en el cliente local (import dynamic para evitar ciclos si es posible, o directo si auth lo permite)
            const { setSessionFromData } = await import('./services/auth.js');
            await setSessionFromData(data.session);

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

    // 3. Manejo de Formulario Oculto de Administrador
    document.getElementById('linkAdminMode').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('adminLoginForm').classList.toggle('d-none');
    });

    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const btn = document.getElementById('btnIngresarAdmin');
        
        btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Entrando...`;
        if (window.lucide) lucide.createIcons();
        document.getElementById('loginError').classList.add('d-none');
        try {
            await loginAdmin(email, password);
            mostrarDashboard();
        } catch (error) {
            btn.innerHTML = `Entrar <i data-lucide="shield"></i>`;
            if (window.lucide) lucide.createIcons();
            document.getElementById('loginError').textContent = error.message;
            document.getElementById('loginError').classList.remove('d-none');
        }
    });

    // 4. Manejo de Logout
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

async function mostrarDashboard() {
    document.getElementById('loginScreen').classList.remove('visible');
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('adminDashboard').classList.remove('d-none');
    document.getElementById('adminDashboard').classList.add('visible');
    
    // Si es docente (o admin), inicializamos Google Picker API en el fondo
    try {
        const { initGoogleApis } = await import('./services/googlePicker.js');
        initGoogleApis();
    } catch (e) {
        console.error("No se pudo cargar Google Picker", e);
    }
    
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
        document.getElementById('btnGestionarUsuarios').classList.add('d-none');
    }
    if (window.lucide) lucide.createIcons();

    cargarYRenderizarCatalogo();
}

// 6. Lógica de Gestión de Usuarios
document.getElementById('btnGestionarUsuarios').addEventListener('click', () => {
    document.getElementById('usuariosModal').classList.remove('d-none');
});

document.getElementById('btnCerrarUsuariosModal').addEventListener('click', () => {
    document.getElementById('usuariosModal').classList.add('d-none');
});

document.getElementById('btnCancelarUsuariosModal').addEventListener('click', () => {
    document.getElementById('usuariosModal').classList.add('d-none');
});

document.getElementById('usuarioForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPass').value;
    
    const btn = document.getElementById('btnCrearUsuario');
    btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Creando...`;
    if (window.lucide) lucide.createIcons();

    try {
        const { data: { session } } = await import('./services/supabase.js').then(m => m.supabase.auth.getSession());
        if (!session) throw new Error("No hay sesión activa");

        const res = await fetch('/api/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ email, password })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error desconocido');

        alert(`¡Éxito! Docente creado. Ya puede iniciar sesión con:\nCorreo: ${email}\nClave: ${password}`);
        document.getElementById('usuarioForm').reset();
        document.getElementById('usuariosModal').classList.add('d-none');
    } catch (err) {
        alert("Error al crear usuario: " + err.message);
    } finally {
        btn.innerHTML = `<i data-lucide="user-plus"></i> Crear Docente`;
        if (window.lucide) lucide.createIcons();
    }
});

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
