let lastFocusedElement = null;

export function abrirModalMateria(gradoId, mat = null) {
    const modal = document.getElementById('materiaModal');
    lastFocusedElement = document.activeElement; // Guardar el elemento que tenía el foco
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

    // Accesibilidad: Focus Trap y Escape
    document.addEventListener('keydown', handleModalKeydown);
    const firstInput = modal.querySelector('input');
    if (firstInput) firstInput.focus();
}

export function cerrarModal() {
    document.getElementById('materiaModal').classList.add('d-none');
    document.removeEventListener('keydown', handleModalKeydown);
    if (lastFocusedElement) {
        lastFocusedElement.focus(); // Devolver el foco al cerrar
    }
}

function handleModalKeydown(e) {
    if (e.key === 'Escape') {
        cerrarModal();
        return;
    }

    if (e.key === 'Tab') {
        const modal = document.getElementById('materiaModal');
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
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
