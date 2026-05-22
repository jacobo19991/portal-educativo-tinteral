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

    if (window.userRole !== 'admin') {
        document.getElementById('modalTitle').textContent = 'Cambiar Carpeta de Tareas';
        document.getElementById('fgNombre').classList.add('d-none');
        document.getElementById('fgOrden').classList.add('d-none');
        document.getElementById('fgFolderAdmin').classList.add('d-none');
        document.getElementById('fgFolderDocente').classList.remove('d-none');
        document.getElementById('matNombre').removeAttribute('required');
        document.getElementById('btnGuardarMateria').innerHTML = '<i data-lucide="check"></i> Guardar Cambios';
    } else {
        document.getElementById('fgNombre').classList.remove('d-none');
        document.getElementById('fgOrden').classList.remove('d-none');
        document.getElementById('fgFolderAdmin').classList.remove('d-none');
        document.getElementById('fgFolderDocente').classList.add('d-none');
        document.getElementById('matNombre').setAttribute('required', 'true');
        document.getElementById('btnGuardarMateria').innerHTML = '<i data-lucide="save"></i> Guardar Cambios';
    }

    // Setup para Google Picker
    const btnGooglePicker = document.getElementById('btnGooglePicker');
    if (btnGooglePicker) {
        // Para evitar múltiples event listeners, lo clonamos
        const newBtn = btnGooglePicker.cloneNode(true);
        btnGooglePicker.parentNode.replaceChild(newBtn, btnGooglePicker);
        
        newBtn.addEventListener('click', async () => {
            newBtn.innerHTML = '<i data-lucide="loader" class="spinning"></i> Abriendo Drive...';
            if (window.lucide) lucide.createIcons();
            
            const { openGooglePicker } = await import('../services/googlePicker.js');
            openGooglePicker((folderId, folderName) => {
                // Callback cuando se selecciona una carpeta
                document.getElementById('matFolder').value = folderId; // Oculto o visible
                
                // Mostrar éxito visual
                newBtn.innerHTML = '<i data-lucide="check-circle"></i> Carpeta Seleccionada';
                newBtn.style.background = '#22c55e'; // Verde éxito
                document.getElementById('selectedFolderName').textContent = folderName;
                document.getElementById('selectedFolderName').style.color = '#22c55e';
                document.getElementById('selectedFolderName').style.fontWeight = 'bold';
                
                if (window.lucide) lucide.createIcons();
            });
        });
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
