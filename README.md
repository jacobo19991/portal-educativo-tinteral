# 🏫 Portal Educativo - C.E. El Tinteral

Una plataforma web de alto rendimiento, escalable y segura, diseñada para gestionar recursos educativos mediante una interfaz amigable y un backend serverless robusto.

## 🎯 Descripción General

Los estudiantes y docentes acceden a los recursos mediante una interfaz sencilla. Las funciones internas de gestión están protegidas mediante Supabase Auth, tokens JWT y validación de roles administrativos. El portal integra Google Drive para la consulta y visualización de recursos educativos de forma eficiente.

## ✨ Funciones e Implementaciones Clave

*   **Autenticación y Autorización:** Implementada mediante Supabase Auth y JSON Web Tokens (JWT). Validación estricta de rol `admin` consultando la tabla `perfiles` en el servidor.
*   **Endpoints Administrativos Protégetes (`/api/admin.js`):** Requiere encabezado `Authorization: Bearer <TOKEN>`, valida usuario y rol antes de realizar operaciones de administración del catálogo (materias y grados).
*   **Validación Segura de PIN (`/api/validar-pin.js`):** Endpoint serverless que recibe `gradoId` y `pin`, valida los datos en servidor con `SUPABASE_SERVICE_ROLE_KEY` y devuelve respuestas opacas (`{ "valid": true }` o `{ "valid": false }`), sin retornar jamás el PIN.
*   **Control Estricto de Orígenes (CORS):** Todos los endpoints filtran peticiones mediante la variable de entorno `ALLOWED_ORIGINS`, aplicando encabezados `Vary: Origin` y rechazando el uso de `Access-Control-Allow-Origin: *`.
*   **Manejo de Errores e Inocuidad:** Los errores técnicos se registran únicamente con `console.error` en el servidor y nunca devuelven detalles o trazas al cliente, entregando mensajes genéricos y seguros.
*   **Pruebas Automatizadas con Playwright:** Suite completa de pruebas end-to-end e integración (`tests/portal-publico.spec.js` y `tests/seguridad.spec.js`) para verificar carga pública, filtrado en buscador, vista móvil y barreras de seguridad en endpoints.
*   **Caché Optimizado:** Encabezados `Cache-Control` adaptados por endpoint (no-store en peticiones sensibles y s-maxage en recursos públicos).

## 🛠️ Variables de Entorno

El backend utiliza las siguientes variables de entorno:

*   `SUPABASE_URL`: URL principal de Supabase.
*   `SUPABASE_ANON_KEY`: Clave pública de Supabase para consultas anónimas.
*   `SUPABASE_SERVICE_ROLE_KEY`: Clave del servidor (Service Role) para operaciones privilegiadas.
*   `ALLOWED_ORIGINS`: Lista separada por comas de dominios autorizados para CORS.
*   `GOOGLE_DRIVE_FOLDER_ID`: Identificador de la carpeta raíz en Google Drive.
*   `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Email de la cuenta de servicio de Google.
*   `GOOGLE_PRIVATE_KEY`: Clave privada de la cuenta de servicio.

## 📜 Scripts Disponibles (`package.json`)

*   `npm test`: Ejecuta las pruebas de Playwright (`playwright test`).
*   `npm run test:ui`: Ejecuta Playwright en modo UI interactivo.
*   `npm run test:headed`: Ejecuta las pruebas con navegador visible.
*   `npm run test:report`: Muestra el reporte HTML de Playwright.

## 📂 Estructura del Proyecto

```text
/
├── api/
│   ├── admin.js           # Endpoint administrativo protegido por JWT y rol admin
│   ├── drive.js           # Proxy seguro de consulta a Google Drive
│   ├── materias.js        # Consulta del catálogo de materias y niveles
│   ├── usuarios.js        # Creación de usuarios administrativos
│   └── validar-pin.js     # Validador serverless de PIN para grados
├── src/                   # Módulos frontend Vanilla JS
│   ├── components/        # Buscador, catálogo y modales
│   ├── config/            # Configuración y estado global
│   ├── data/              # Fallback local de datos
│   ├── utils/             # Utilidades de red
│   └── main.js            # Orquestador del cliente
├── tests/
│   ├── portal-publico.spec.js # Pruebas e2e de interfaz pública
│   └── seguridad.spec.js      # Pruebas de seguridad y endpoints
├── index.html             # Interfaz principal
├── package.json           # Dependencias y scripts de prueba
└── README.md              # Documentación del proyecto
```
