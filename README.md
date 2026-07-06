# 🏫 Portal Educativo - C.E. El Tinteral

![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n-success?style=for-the-badge)
![Arquitectura](https://img.shields.io/badge/Arquitectura-Serverless-blue?style=for-the-badge)
![UI](https://img.shields.io/badge/UI-Vanilla_JS_%2B_CSS3-orange?style=for-the-badge)

Una plataforma web de alto rendimiento, escalable y segura, diseñada específicamente para gestionar recursos educativos. Construida bajo el paradigma "Mobile-First" y arquitectura Serverless, enfocada en la simplicidad máxima para los docentes y la excelencia técnica interna.

## 🎯 Filosofía del Proyecto: "Simple para Docentes, Profesional Internamente"

Después de un exhaustivo análisis UX, se determinó que la mejor interfaz para los docentes es la que ya conocen. Por ello, el portal elimina cualquier complejidad administrativa (paneles, logins, tokens) y actúa como un **puente directo hacia Google Drive**, permitiendo a los profesores subir tareas en sus carpetas habituales, las cuales se reflejan automáticamente en el portal de los estudiantes.

## ✨ Características Principales

*   **📱 Diseño Mobile-First & Glassmorphism:** Interfaz de usuario premium optimizada para teléfonos móviles, con efectos translúcidos, animaciones fluidas y modales tipo "Bottom Sheet".
*   **🚀 Carga Ultrarrápida (Zero-Config):** Sin empaquetadores complejos. HTML semántico, CSS puro y módulos ES6 nativos, respaldados por la caché de Vercel Edge Network.
*   **♿ Accesibilidad (WCAG):** Navegación completa por teclado, etiquetas ARIA, Focus Traps para ventanas emergentes y cierre con `ESC`.
*   **☁️ Edge Computing & Backend Seguro:** Las consultas a la base de datos están protegidas por funciones *Serverless* en Vercel (`api/materias.js`), blindando las API Keys de Supabase.
*   **🔄 Sincronización Automática:** Integración transparente con Google Drive para visualización de PDFs sin descargas forzadas en móviles.
    *   *Nota de Rendimiento:* La acción de actualizar recursos puede tomar alrededor de 15 segundos en reflejar cambios nuevos, ya que el sistema realiza un escaneo exhaustivo y en tiempo real de toda la estructura de Google Drive para asegurar precisión.

## 🛠️ Stack Tecnológico

*   **Frontend:** Vanilla JavaScript (ES Modules), CSS3 Puro, HTML5 Semántico.
*   **Backend / API:** Vercel Edge Functions (Serverless Node.js).
*   **Base de Datos:** Supabase (PostgreSQL + PostgREST).
*   **Iconografía:** Lucide Icons.
*   **Almacenamiento:** Google Drive.

## 📂 Arquitectura del Proyecto

El código está estructurado en módulos bajo el Principio de Responsabilidad Única (SOLID) y Clean Code:

```text
/
├── api/                   # Backend Serverless (Vercel)
│   ├── drive.js           # Proxy seguro de lectura de Google Drive
│   └── materias.js        # Endpoint de carga del catálogo desde Supabase
├── src/                   # Frontend Modular
│   ├── components/        # Componentes UI (Buscador, Modales, Catálogo)
│   ├── config/            # Variables globales (AppState)
│   ├── data/              # Datos locales de fallback
│   ├── utils/             # Funciones de ayuda (Debounce, Fetchers)
│   └── main.js            # Orquestador público principal
├── index.html             # Punto de entrada único del portal
└── main.css               # Sistema de diseño, tokens y animaciones
```

## 👩‍🏫 Guía Rápida para Docentes

El proceso de actualización del portal es extremadamente sencillo:

1. Ingresar a `https://portal-educativo-tinteral.vercel.app`.
2. Bajar hasta el final de la página y presionar el botón **"Acceso para Docentes"**.
3. Se abrirá la carpeta institucional en Google Drive.
4. Navegar al grado y materia correspondiente.
5. Subir o modificar los archivos PDF.
6. **¡Listo!** El portal de los alumnos se actualizará automáticamente.

## 🚀 Instalación y Despliegue Local

Al usar Vanilla JS y Serverless, no requieres un proceso de "build" complejo.

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/jacobo19991/portal-educativo-tinteral.git
   cd portal-educativo-tinteral
   ```
2. **Ejecución Local:**
   Puedes usar la CLI de Vercel para simular el backend localmente y cargar los datos de Supabase:
   ```bash
   npm i -g vercel
   vercel dev
   ```

### 🐳 Alternativa: Contenedor Docker (Solo Frontend)
Para entornos de nube privada o VPS, puedes containerizar la interfaz gráfica usando Nginx:

```bash
docker build -t portal-tinteral .
docker run -p 8080:80 -d portal-tinteral
```
*El frontend estará disponible en `http://localhost:8080`.*

## 👨‍💻 Autor y Mantenimiento

Desarrollado y consolidado mediante refactorización incremental segura.
El proyecto ha sido despojado de cualquier sobreingeniería, resultando en una base de código limpia, robusta y fácil de mantener a largo plazo por cualquier desarrollador Frontend.
