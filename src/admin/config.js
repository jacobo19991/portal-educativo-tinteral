// Configuración pública para integraciones de Frontend (Ej: Google Picker)
// IMPORTANTE: Estas llaves son PÚBLICAS. Su seguridad no depende de ocultarlas,
// sino de bloquearlas en Google Cloud Console mediante "Authorized JavaScript origins".

export const GOOGLE_CONFIG = {
    // 1. Reemplaza esto con tu Client ID (Ej: 123456789-abcde.apps.googleusercontent.com)
    CLIENT_ID: 'TU_GOOGLE_CLIENT_ID_AQUI',
    
    // 2. Reemplaza esto con tu API Key (Ej: AIzaSyB_1234567890abcdef)
    API_KEY: 'TU_GOOGLE_API_KEY_AQUI',
    
    // ID del proyecto en Google Cloud (Opcional pero recomendado para Picker)
    APP_ID: 'TU_PROJECT_NUMBER_AQUI'
};
