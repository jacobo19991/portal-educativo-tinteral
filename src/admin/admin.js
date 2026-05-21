let adminPassword = sessionStorage.getItem('adminPassword') || '';
let catalogoData = [];

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    if (adminPassword) {
        mostrarDashboard();
    }

    // Login Form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        adminPassword = document.getElementById('adminPassword').value;
        sessionStorage.setItem('adminPassword', adminPassword);
        mostrarDashboard();
    });

    // Logout
    document.getElementById('btnSalir').addEventListener('click', () => {
        sessionStorage.removeItem('adminPassword');
        adminPassword = '';
        document.getElementById('adminDashboard').classList.remove('visible');
        document.getElementById('adminDashboard').classList.add('d-none');
        document.getElementById('loginScreen').classList.remove('d-none');
        document.getElementById('loginScreen').classList.add('visible');
    });

    // Refresh
    document.getElementById('btnRefresh').addEventListener('click', () => {
        cargarCatalogo();
    });

    // Modal behavior
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);
    
    // Form Materia
    document.getElementById('materiaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('matId').value;
        const gradoId = document.getElementById('matGradoId').value;
        const nombre = document.getElementById('matNombre').value;
        const folderId = document.getElementById('matFolder').value;
        const orden = document.getElementById('matOrden').value;

        const action = id ? 'EDIT_MATERIA' : 'ADD_MATERIA';
        const payload = { nombre, folder_id: folderId, orden: parseInt(orden) };
        
        if (id) payload.id = id;
        if (!id) payload.grado_id = gradoId;

        const btn = document.getElementById('btnGuardarMateria');
        btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Guardando...`;
        lucide.createIcons();

        try {
            await peticionAdmin(action, payload);
            cerrarModal();
            await cargarCatalogo();
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            btn.innerHTML = `<i data-lucide="save"></i> Guardar Cambios`;
            lucide.createIcons();
        }
    });
});

function mostrarDashboard() {
    document.getElementById('loginScreen').classList.remove('visible');
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('adminDashboard').classList.remove('d-none');
    document.getElementById('adminDashboard').classList.add('visible');
    cargarCatalogo();
}

async function cargarCatalogo() {
    const container = document.getElementById('catalogoContainer');
    container.innerHTML = '<div class="spinner-center"><i data-lucide="loader" class="spinning" style="width:32px; height:32px; margin-bottom: 10px;"></i><br>Cargando catálogo...</div>';
    lucide.createIcons();
    
    try {
        const res = await fetch('/api/materias');
        if (!res.ok) throw new Error('Error al cargar la base de datos');
        const data = await res.json();
        catalogoData = data.niveles || [];
        renderizarCatalogo();
    } catch (error) {
        container.innerHTML = `<div class="error-msg">Error de conexión. ¿Está configurado Supabase en Vercel?</div>`;
    }
}

function renderizarCatalogo() {
    const container = document.getElementById('catalogoContainer');
    container.innerHTML = '';

    catalogoData.forEach(nivel => {
        const nivelCard = document.createElement('div');
        nivelCard.className = 'nivel-card';

        const nHeader = document.createElement('div');
        nHeader.className = 'nivel-header';
        nHeader.innerHTML = `
            <h2>${nivel.nombre}</h2>
        `;
        nivelCard.appendChild(nHeader);

        (nivel.grados || []).forEach(grado => {
            const gradoSec = document.createElement('div');
            gradoSec.className = 'grado-section';

            const gHeader = document.createElement('div');
            gHeader.className = 'grado-header';
            gHeader.innerHTML = `
                <h3><i data-lucide="folder-open"></i> ${grado.nombre}</h3>
                <button class="btn-sm btn-add-materia" data-gradoid="${grado.id}">
                    <i data-lucide="plus"></i> Añadir Materia
                </button>
            `;
            gradoSec.appendChild(gHeader);

            const matList = document.createElement('div');
            matList.className = 'materias-list';

            (grado.materias || []).forEach(mat => {
                const matItem = document.createElement('div');
                matItem.className = 'materia-item';
                matItem.innerHTML = `
                    <div class="mat-info">
                        <span class="mat-nombre">${mat.nombre}</span>
                        <span class="mat-folder">${mat.folderId}</span>
                    </div>
                    <div class="mat-actions">
                        <button class="btn-action edit btn-edit-mat" data-id="${mat.id || ''}" data-nombre="${mat.nombre}" data-folder="${mat.folderId}" aria-label="Editar">
                            <i data-lucide="edit-2"></i>
                        </button>
                        <button class="btn-action delete btn-del-mat" data-id="${mat.id || ''}" data-nombre="${mat.nombre}" aria-label="Eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                `;
                matList.appendChild(matItem);
            });

            gradoSec.appendChild(matList);
            nivelCard.appendChild(gradoSec);
        });

        container.appendChild(nivelCard);
    });

    lucide.createIcons();

    // Event Listeners Dinámicos
    document.querySelectorAll('.btn-add-materia').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const gradoId = e.currentTarget.dataset.gradoid;
            abrirModalMateria(gradoId);
        });
    });

    document.querySelectorAll('.btn-edit-mat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const b = e.currentTarget;
            if(!b.dataset.id) return alert('No se puede editar: Falta ID (Base de datos sin migrar completamente)');
            abrirModalMateria(null, {
                id: b.dataset.id,
                nombre: b.dataset.nombre,
                folderId: b.dataset.folder
            });
        });
    });

    document.querySelectorAll('.btn-del-mat').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const b = e.currentTarget;
            const id = b.dataset.id;
            if(!id) return alert('No se puede eliminar: Falta ID');
            
            if (confirm(`¿Estás seguro de eliminar la materia "${b.dataset.nombre}"?`)) {
                try {
                    await peticionAdmin('DELETE_MATERIA', { id });
                    await cargarCatalogo();
                } catch(err) { alert('Error: ' + err.message); }
            }
        });
    });
}

function abrirModalMateria(gradoId, mat = null) {
    const modal = document.getElementById('materiaModal');
    modal.classList.remove('d-none');
    
    if (mat) {
        document.getElementById('modalTitle').textContent = 'Editar Materia';
        document.getElementById('matId').value = mat.id;
        document.getElementById('matGradoId').value = '';
        document.getElementById('matNombre').value = mat.nombre;
        document.getElementById('matFolder').value = mat.folderId;
    } else {
        document.getElementById('modalTitle').textContent = 'Nueva Materia';
        document.getElementById('matId').value = '';
        document.getElementById('matGradoId').value = gradoId;
        document.getElementById('matNombre').value = '';
        document.getElementById('matFolder').value = '';
    }
}

function cerrarModal() {
    document.getElementById('materiaModal').classList.add('d-none');
}

async function peticionAdmin(action, payload) {
    const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, action, payload })
    });
    
    const data = await res.json();
    if (!res.ok) {
        if(res.status === 401) {
            document.getElementById('btnSalir').click(); // Logout
        }
        throw new Error(data.error || 'Error desconocido');
    }
    return data;
}
