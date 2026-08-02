# 🏫 Portal Educativo - C.E. El Tinteral

Una plataforma web de alto rendimiento, escalable y segura, diseñada para gestionar recursos educativos mediante una interfaz amigable y un backend serverless robusto.

## 🎯 Descripción General

El portal es completamente público para estudiantes y padres de familia, permitiendo consultar niveles, grados, materias, guías y horarios de forma libre y rápida. 

Unicamente las opciones de la sección **“Herramientas Docentes”** (*Abrir Drive* y *Manual de uso*) están protegidas por un PIN docente validado exclusivamente en el backend (`/api/validar-pin-docente.js`). El botón *"Reportar problema"* redirige directamente al formulario de Google Forms sin solicitar PIN. Las funciones administrativas para cambiar el PIN docente están protegidas mediante Supabase Auth, tokens JWT y verificación de rol `admin`.

## 🏗️ Arquitectura del Proyecto

La plataforma utiliza una arquitectura distribuida que separa el contenido de la seguridad:

**Contenido y Estructura Académica (Fuente Principal):**
```text
Google Drive / Apps Script
        ↓
Carpetas, materias, archivos y recursos educativos
        ↓
Portal web
```
*Google Drive es la fuente principal de contenido y estructura académica.* Todos los niveles, grados, materias y archivos PDF/Guías se gestionan directamente a través de las carpetas en Drive. La estructura se sincroniza mediante Apps Script y se cachea en el portal para alta velocidad, con un archivo local estático como única alternativa de respaldo (Fallback) en caso de fallo total.

**Seguridad y Administración:**
```text
Supabase
        ↓
Autenticación administrativa, roles y configuración del PIN
```
Supabase se utiliza **exclusivamente** para el panel administrativo, el manejo de roles (`admin`) y el almacenamiento encriptado de la configuración (el hash del PIN docente). No se utiliza para almacenar materias ni recursos académicos.

## ✨ Funciones e Implementaciones Clave

*   **Acceso Público para Alumnos:** Todo el catálogo académico, materias, asignaturas y recursos semanales son de acceso libre sin barreras ni credenciales.
*   **Protección de Herramientas Docentes (`/api/validar-pin-docente.js`):** Las opciones "Abrir Drive" y "Manual de uso" requieren ingresar el PIN docente. La validación se realiza exclusivamente en el servidor consultando el hash seguro mediante Scrypt (con fallback temporal a la variable encriptada), manteniendo una sesión temporal de 30 minutos.
*   **Cambio Seguro del PIN Docente (`/api/cambiar-pin-docente.js`):** Los administradores autenticados pueden actualizar el PIN docente. El PIN se procesa utilizando `scrypt` contra ataques de hardware, con rate-limiting en memoria.
*   **Formulario de Reporte Centralizado:** El enlace de reportes apunta directamente al formulario oficial de Google Forms.
*   **Control Estricto de Orígenes (CORS) y Seguridad HTTP:** Todos los endpoints filtran peticiones aplicando `Vary: Origin`, cabeceras de seguridad estrictas (HSTS, CSP, X-Content-Type-Options) y protección contra fuerza bruta.
*   **Pruebas Automatizadas con Playwright:** Suite de pruebas end-to-end e integración CI/CD mediante GitHub Actions.

## 🗄️ Esquema de Seguridad en Supabase (`configuracion_portal`)

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
│   ├── cambiar-pin-docente.js   # Endpoint seguro con Scrypt y rate-limiting
│   ├── drive.js                 # Proxy seguro de consulta a Google Drive
│   ├── usuarios.js              # Creación de usuarios administrativos
│   ├── validar-pin-docente.js   # Validador serverless de PIN para herramientas docentes
│   └── utils/
│       ├── cryptoUtils.js       # Utilidades criptográficas (Scrypt + PBKDF2 compat)
│       ├── docentesPinService.js# Servicio centralizado de PIN
│       └── rateLimiter.js       # Limitador de tasa en memoria
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
