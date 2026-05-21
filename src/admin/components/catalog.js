import { abrirModalMateria } from './modal.js';

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
