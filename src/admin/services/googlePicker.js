import { GOOGLE_CONFIG } from '../config.js';

// Scopes necesarios para ver y seleccionar carpetas de Drive
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
let tokenClient;
let accessToken = null;
let pickerInited = false;
let gisInited = false;

// 1. Cargar y preparar las librerías de Google
export function initGoogleApis() {
    // Cargar GAPI (Picker)
    gapi.load('picker', () => {
        pickerInited = true;
    });

    // Inicializar Google Identity Services (GIS) para OAuth 2.0
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                createPicker();
            }
        },
    });
    gisInited = true;
}

// 2. Disparador principal (Llamado desde el botón)
let currentCallback = null;

export function openGooglePicker(onFolderSelectedCallback) {
    currentCallback = onFolderSelectedCallback;

    if (GOOGLE_CONFIG.CLIENT_ID === 'TU_GOOGLE_CLIENT_ID_AQUI') {
        alert("Falta configurar el Google Client ID en src/admin/config.js");
        return;
    }

    if (!pickerInited || !gisInited) {
        alert("Las librerías de Google aún se están cargando. Intenta en un segundo.");
        return;
    }

    // Pedir token a Google. Si ya tenemos uno válido, lo reusará o pedirá uno nuevo silenciosamente si no requiere login interactivo
    if (!accessToken) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

// 3. Crear y mostrar la ventana flotante del Picker
function createPicker() {
    // Configuramos la vista para SOLO mostrar carpetas
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setMimeTypes('application/vnd.google-apps.folder')
        .setSelectFolderEnabled(true);

    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED) // Opcional, pero dejémoslo simple, sin multiselect
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_CONFIG.API_KEY)
        .addView(view)
        .setCallback(pickerCallback)
        .setTitle('Selecciona la carpeta para esta materia')
        .build();

    picker.setVisible(true);
}

// 4. Recibir el resultado
function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const document = data.docs[0];
        const folderId = document.id;
        const folderName = document.name;
        
        if (currentCallback) {
            currentCallback(folderId, folderName);
        }
    } else if (data.action === google.picker.Action.CANCEL) {
        // Usuario cerró el modal sin seleccionar nada
        console.log("Selección cancelada por el usuario");
    }
}
