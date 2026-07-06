/**
 * Realiza una petición fetch con un tiempo de espera (timeout) y un manejo de errores robusto.
 * @param {string} url La URL a consultar.
 * @param {object} options Opciones de fetch (method, headers, etc.).
 * @param {number} timeoutMs Tiempo máximo de espera en milisegundos.
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('La petición ha tardado demasiado (Timeout). Verifica tu conexión a internet.');
        }
        throw error;
    }
}
