export function abrirModalMateria(gradoId, mat = null) {
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

export function cerrarModal() {
    document.getElementById('materiaModal').classList.add('d-none');
}

export function getModalFormData() {
    return {
        id: document.getElementById('matId').value,
        gradoId: document.getElementById('matGradoId').value,
        nombre: document.getElementById('matNombre').value,
        folderId: document.getElementById('matFolder').value,
        orden: parseInt(document.getElementById('matOrden').value) || 99
    };
}
