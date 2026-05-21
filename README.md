# 🏫 Portal Educativo - C.E. El Tinteral

![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n-success?style=for-the-badge)
![Arquitectura](https://img.shields.io/badge/Arquitectura-Serverless-blue?style=for-the-badge)
![Seguridad](https://img.shields.io/badge/Seguridad-Supabase%20Auth%20%2B%20RLS-orange?style=for-the-badge)

Una plataforma web de alto rendimiento, escalable y segura, diseñada específicamente para gestionar recursos educativos integrados con Google Drive. Construida bajo el paradigma "Mobile-First" y arquitectura Serverless.

## ✨ Características Principales

*   **📱 Diseño Mobile-First & Glassmorphism:** Interfaz de usuario premium optimizada para teléfonos móviles, con efectos translúcidos, animaciones fluidas y modales tipo "Bottom Sheet".
*   **⚡ Edición Optimista & Skeleton Loaders:** El panel administrativo responde al instante. Los Skeleton Loaders reemplazan los aburridos *spinners* mejorando drásticamente la percepción de velocidad.
*   **🔒 Seguridad de Grado Empresarial (Zero-Trust):** Autenticación basada en JSON Web Tokens (JWT) con Supabase Auth y Políticas de Seguridad a Nivel de Fila (RLS) que blindan la base de datos contra accesos no autorizados.
*   **☁️ Edge Computing & Proxy Seguro:** Integración con Google Drive protegida por funciones *Serverless* en Vercel, manteniendo las API Keys invisibles para el cliente.
*   **♿ Accesibilidad (WCAG):** Navegación completa por teclado, Focus Traps para ventanas emergentes, cierre con `ESC` y *Debouncing* para cuidar los recursos del dispositivo.

## 🛠️ Stack Tecnológico

*   **Frontend:** Vanilla JavaScript (ES Modules), CSS3 Puro, HTML5 Semántico.
*   **Backend / API:** Vercel Edge Functions (Serverless Node.js).
*   **Base de Datos & Auth:** Supabase (PostgreSQL + PostgREST + Supabase Auth).
*   **Iconografía:** Lucide Icons.
*   **Almacenamiento de Archivos:** Google Drive API.

## 📂 Arquitectura del Proyecto

El código está estructurado en módulos bajo el Principio de Responsabilidad Única (SOLID):

```text
/
├── api/                   # Backend Serverless (Vercel)
│   ├── admin.js           # Endpoint administrativo (Legacy)
│   ├── drive.js           # Proxy seguro de Google Drive
│   └── materias.js        # Endpoint de lectura pública (Con Caché Edge)
├── src/                   # Frontend Público
│   ├── components/        # Componentes visuales (Buscador, Modales)
│   ├── config/            # Variables globales
│   └── main.js            # Orquestador público
├── src/admin/             # Panel Administrativo (Módulo Protegido)
│   ├── components/        # UI (Catálogo, Formulario Modal)
│   ├── services/          # Conectores (Supabase API, Auth JWT)
│   ├── admin.css          # Estilos exclusivos del panel
│   └── admin.js           # Orquestador administrativo
├── _credenciales/         # [IGNORADO POR GIT] Accesos locales seguros
├── index.html             # Punto de entrada de alumnos
├── admin.html             # Punto de entrada de directores
├── main.css               # Estilos globales y Mobile-First
└── schema_auth.sql        # Políticas SQL para seguridad RLS
```

## 🚀 Instalación y Despliegue Local

Al usar Vanilla JS y Serverless, no requieres un proceso de "build" complejo (`npm run build`).

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/jacobo19991/portal-educativo-tinteral.git
   cd portal-educativo-tinteral
   ```
2. **Ejecución Local:**
   Puedes usar la CLI de Vercel para simular el backend localmente:
   ```bash
   npm i -g vercel
   vercel dev
   ```
   *(Nota: Alternativamente, puedes usar la extensión "Live Server" de VS Code, pero las funciones `/api` no funcionarán).*

## 🔐 Configuración de Variables de Entorno (Vercel)
Para que la integración con Drive y Supabase funcione en producción, debes configurar las siguientes variables en Vercel:

*   `DRIVE_API_KEY`: Clave pública de la API de Google Drive.
*   `SUPABASE_URL`: URL del proyecto Supabase.
*   `SUPABASE_ANON_KEY`: Llave pública de Supabase.
*   `SUPABASE_SECRET_KEY`: Llave de servicio (Solo si se usan funciones backend que requieran sobreescribir RLS).

## 👨‍💻 Autor y Mantenimiento

Desarrollado y modernizado mediante refactorización incremental segura (Fases A-D).
Aplicando patrones de Ingeniería de Software para garantizar la sostenibilidad del portal a largo plazo.
