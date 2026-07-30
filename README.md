# 🏫 Portal Educativo - C.E. El Tinteral

Una plataforma web de alto rendimiento, escalable y segura, diseñada para gestionar recursos educativos mediante una interfaz amigable y un backend serverless robusto.

## 🎯 Descripción General

El portal es completamente público para estudiantes y padres de familia, permitiendo consultar niveles, grados, materias, guías y horarios de forma libre y rápida. 

Unicamente las opciones de la sección **“Herramientas Docentes”** (*Abrir Drive* y *Manual de uso*) están protegidas por un PIN docente validado exclusivamente en el backend (`/api/validar-pin-docente.js`). El botón *"Reportar problema"* redirige directamente al formulario de Google Forms sin solicitar PIN. Las funciones administrativas para cambiar el PIN docente están protegidas mediante Supabase Auth, tokens JWT y verificación de rol `admin`.

## ✨ Funciones e Implementaciones Clave

*   **Acceso Público para Alumnos:** Todo el catálogo académico, materias, asignaturas y recursos semanales son de acceso libre sin barreras ni credenciales.
*   **Protección de Herramientas Docentes (`/api/validar-pin-docente.js`):** Las opciones "Abrir Drive" y "Manual de uso" requieren ingresar el PIN docente. La validación se realiza exclusivamente en el servidor consultando primero el hash seguro en la tabla `configuracion_portal` de Supabase (con fallback a la variable `DOCENTES_PIN`), respondiendo `{ "valid": true, "version": "..." }` o `{ "valid": false }` sin exponer el PIN almacenado ni el hash al cliente.
*   **Cambio Seguro del PIN Docente (`/api/cambiar-pin-docente.js`):** Los administradores autenticados pueden actualizar el PIN docente desde la interfaz de administración. El PIN se procesa únicamente en el servidor utilizando un algoritmo de derivación de claves PBKDF2 con salt criptográfico de 512 bits.
*   **Formulario de Reporte Centralizado:** El enlace de reportes apunta directamente al formulario oficial de Google Forms (`https://forms.gle/eDrth5nJ2drQSfUC7`), centralizado en `src/config/globals.js`.
*   **Control Estricto de Orígenes (CORS):** Todos los endpoints filtran peticiones mediante la variable de entorno `ALLOWED_ORIGINS`, aplicando encabezados `Vary: Origin`, `Cache-Control: no-store` y rechazando el uso de `Access-Control-Allow-Origin: *`.
*   **Pruebas Automatizadas con Playwright:** Suite completa de pruebas end-to-end e integración (`tests/portal-publico.spec.js` y `tests/seguridad.spec.js`) que validan la interfaz pública, el buscador, modales de PIN, cambio de PIN y barreras de seguridad con mocks dinámicos de Playwright sin usar contraseñas fijas.

## 🗄️ Esquema de Base de Datos en Supabase (`configuracion_portal`)

Para almacenar el hash del PIN docente de forma segura y permitir su actualización en caliente, se utiliza la siguiente tabla en Supabase:

```sql
CREATE TABLE IF NOT EXISTS configuracion_portal (
  clave TEXT PRIMARY KEY,
  valor_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Políticas RLS (Acceso exclusivo por Service Role desde Serverless Functions)
ALTER TABLE configuracion_portal ENABLE ROW LEVEL SECURITY;
```

> **Nota de Migración:** El backend intentará leer primero el registro `clave = 'docentes_pin'` en `configuracion_portal`. Si la tabla o el registro aún no existen, utilizará temporalmente la variable de entorno `DOCENTES_PIN` como valor inicial de recuperación.

## 🛠️ Variables de Entorno

El backend utiliza las siguientes variables de entorno:

*   `SUPABASE_URL`: URL principal de Supabase.
*   `SUPABASE_ANON_KEY`: Clave pública de Supabase para consultas anónimas.
*   `SUPABASE_SERVICE_ROLE_KEY`: Clave del servidor (Service Role) para operaciones privilegiadas.
*   `ALLOWED_ORIGINS`: Lista separada por comas de dominios autorizados para CORS.
*   `DOCENTES_PIN`: PIN inicial de seguridad o valor de recuperación temporal para docentes.
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
│   ├── admin.js                 # Endpoint administrativo protegido por JWT y rol admin
│   ├── cambiar-pin-docente.js   # Endpoint seguro para actualizar el PIN docente en Supabase
│   ├── drive.js                 # Proxy seguro de consulta a Google Drive
│   ├── materias.js              # Consulta del catálogo de materias y niveles
│   ├── usuarios.js              # Creación de usuarios administrativos
│   ├── validar-pin-docente.js   # Validador serverless de PIN para herramientas docentes
│   └── utils/
│       └── cryptoUtils.js       # Utilidades criptográficas (PBKDF2 + Salt)
├── src/                         # Módulos frontend Vanilla JS
│   ├── components/              # Buscador, catálogo, modales, PIN docente y cambio de PIN
│   ├── config/                  # Configuración (globals.js) y estado global
│   ├── data/                    # Fallback local de datos
│   ├── utils/                   # Utilidades de red
│   └── main.js                  # Orquestador del cliente
├── tests/
│   ├── portal-publico.spec.js   # Pruebas e2e de interfaz pública y modales
│   └── seguridad.spec.js        # Pruebas de seguridad y endpoints
├── index.html                   # Interfaz principal
├── package.json                 # Dependencias y scripts de prueba
└── README.md                    # Documentación del proyecto
```
