import { abrirModalMateria } from './modal.js';

export function generarSkeletonHTML() {
    return `
        <div class="skeleton-wrapper">
            <div class="skeleton-box"></div>
            <div class="skeleton-box" style="height: 200px; opacity: 0.8"></div>
            <div class="skeleton-box" style="height: 120px; opacity: 0.6"></div>
        </div>
    `;
}

export function renderizarCatalogo(catalogoData, onEdit, onDelete) {
    const container = document.getElementById('catalogoContainer');
    container.innerHTML = '';

    catalogoData.forEach(nivel => {
        const nivelCard = document.createElement('div');
        nivelCard.className = 'nivel-card';

        const nHeader = document.createElement('div');
        nHeader.className = 'nivel-header';
        nHeader.innerHTML = `<h2>${nivel.nombre}</h2>`;
        nivelCard.appendChild(nHeader);

        (nivel.grados || []).forEach(grado => {
            const gradoSec = document.createElement('div');
            gradoSec.className = 'grado-section';

            const gHeader = document.createElement('div');
            gHeader.className = 'grado-header';
            gHeader.innerHTML = `
                <h3><i data-lucide="folder-open"></i> ${grado.nombre}</h3>
                ${window.userRole === 'admin' ? `
                <button class="btn-sm btn-add-materia" data-gradoid="${grado.id}">
                    <i data-lucide="plus"></i> Añadir Materia
                </button>
                ` : ''}
            `;
            gradoSec.appendChild(gHeader);

            const matList = document.createElement('div');
            matList.className = 'materias-list';

            const materias = grado.materias || [];
            if (materias.length === 0) {
                matList.innerHTML = `<div class="empty-state">No hay materias registradas en este grado.</div>`;
            } else {
                materias.forEach(mat => {
                    const matItem = document.createElement('div');
                    matItem.className = 'materia-item';
                    matItem.id = `materia-${mat.id}`; // Agregado ID para edición optimista
                    if (window.userRole === 'admin') {
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
                    } else {
                        // Diseño ultra-simple para docentes (Sin folder ID visual, botón gigante)
                        matItem.innerHTML = `
                            <div class="mat-info" style="flex:1;">
                                <span class="mat-nombre" style="font-size:16px;">${mat.nombre}</span>
                                <span class="mat-folder" style="color:#22c55e; font-weight:600;"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Enlazada</span>
                            </div>
                            <div class="mat-actions">
                                <button class="btn-primary edit btn-edit-mat" data-id="${mat.id || ''}" data-nombre="${mat.nombre}" data-folder="${mat.folderId}" style="padding:10px 20px; font-size:14px; background:var(--bg-surface); border:1px solid rgba(255,255,255,0.2);">
                                    <i data-lucide="folder-open"></i> Seleccionar Carpeta
                                </button>
                            </div>
                        `;
                    }
                    matList.appendChild(matItem);
                });
            }

            gradoSec.appendChild(matList);
            nivelCard.appendChild(gradoSec);
        });

        container.appendChild(nivelCard);
    });

    if (window.lucide) lucide.createIcons();
    attachCatalogEvents(onEdit, onDelete);
}

function attachCatalogEvents(onEdit, onDelete) {
    document.querySelectorAll('.btn-add-materia').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const gradoId = e.currentTarget.dataset.gradoid;
            abrirModalMateria(gradoId);
        });
    });

    document.querySelectorAll('.btn-edit-mat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const b = e.currentTarget;
            if(!b.dataset.id) return alert('No se puede editar: Falta ID');
            onEdit({ id: b.dataset.id, nombre: b.dataset.nombre, folderId: b.dataset.folder });
        });
    });

    document.querySelectorAll('.btn-del-mat').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const b = e.currentTarget;
            const id = b.dataset.id;
            if(!id) return alert('No se puede eliminar: Falta ID');
            if (confirm(`¿Estás seguro de eliminar la materia "${b.dataset.nombre}"?`)) {
                onDelete(id);
            }
        });
    });
}
