// ==========================================
// MODO PRESENTACIÓN / DEMO (Para capacitaciones)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Detectar si el modo demo está activo en la URL (?demo=true)
    const urlParams = new URLSearchParams(window.location.search);
    const isDemo = urlParams.get('demo') === 'true';

    if (!isDemo) return; // Si no es demo, no hacer nada para no afectar a los usuarios normales

    console.log("🚀 MODO DEMOSTRACIÓN ACTIVADO");

    // 2. Crear una barra visual para indicar que estamos en modo demo
    const demoBar = document.createElement('div');
    demoBar.style.position = 'fixed';
    demoBar.style.bottom = '0';
    demoBar.style.left = '0';
    demoBar.style.width = '100%';
    demoBar.style.background = '#f5a623';
    demoBar.style.color = '#fff';
    demoBar.style.textAlign = 'center';
    demoBar.style.padding = '8px';
    demoBar.style.fontSize = '12px';
    demoBar.style.fontWeight = 'bold';
    demoBar.style.zIndex = '9999';
    demoBar.style.boxShadow = '0 -4px 10px rgba(0,0,0,0.1)';
    demoBar.innerText = 'MODO PRESENTACIÓN ACTIVO - Los niveles se abrirán automáticamente';
    document.body.appendChild(demoBar);

    // 3. Simular clics automáticos para que el capacitador no tenga que hacer todo a mano
    // Esperamos 1 segundo para que cargue la UI principal
    setTimeout(() => {
        // Encontrar el botón de "II Ciclo" (o el primer nivel disponible)
        const botonesNivel = document.querySelectorAll('.nivel-btn');
        if (botonesNivel.length > 1) {
            console.log("Abriendo nivel:", botonesNivel[1].innerText);
            botonesNivel[1].click(); // Abrimos el segundo nivel de ejemplo
            
            // Esperamos medio segundo para que termine la animación
            setTimeout(() => {
                // Encontrar el panel adyacente y hacer clic en el primer grado
                const panel = botonesNivel[1].nextElementSibling;
                if (panel) {
                    const botonesGrado = panel.querySelectorAll('.grado-btn');
                    if (botonesGrado.length > 0) {
                        console.log("Abriendo grado:", botonesGrado[0].innerText);
                        botonesGrado[0].click();
                        
                        // Añadir un mensaje flotante (Tooltip) simulado
                        mostrarTooltip(botonesGrado[0], "Al hacer clic aquí, se despliegan las materias del grado.");
                    }
                }
            }, 500);
        }
    }, 1000);

    // 4. Función de ayuda para crear Tooltips temporales
    function mostrarTooltip(elemento, mensaje) {
        const rect = elemento.getBoundingClientRect();
        const tooltip = document.createElement('div');
        tooltip.innerText = mensaje;
        tooltip.style.position = 'absolute';
        tooltip.style.top = (rect.top + window.scrollY - 40) + 'px';
        tooltip.style.left = '20px';
        tooltip.style.background = '#2d3a52';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '8px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '10000';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        tooltip.style.animation = 'fadeIn 0.3s ease';
        
        // Flechita del tooltip
        const arrow = document.createElement('div');
        arrow.style.position = 'absolute';
        arrow.style.bottom = '-5px';
        arrow.style.left = '20px';
        arrow.style.width = '10px';
        arrow.style.height = '10px';
        arrow.style.background = '#2d3a52';
        arrow.style.transform = 'rotate(45deg)';
        tooltip.appendChild(arrow);

        document.body.appendChild(tooltip);

        // Desaparecer después de 5 segundos
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.3s ease';
            setTimeout(() => tooltip.remove(), 300);
        }, 5000);
    }
});
