# 📽️ Contexto y Estructura para Video Presentación del Proyecto (20 Minutos)

Este archivo guarda el contexto persistente para la producción del **video explicativo de 20 minutos** sobre el **Portal Educativo C.E. El Tinteral**.

## 📌 Resumen Ejecutivo del Proyecto
- **Nombre**: Portal Educativo - C.E. El Tinteral
- **Filosofía**: "Simple para docentes, profesional y blindado internamente".
- **Tecnologías**: Vanilla JS, CSS3 (Mobile-First & Glassmorphism), Vercel Edge Serverless Functions, Supabase (Postgres + PostgREST + Auth JWT), Google Drive API, Playwright testing.

## 🎬 Guión Estructurado para Video de 20 Minutos

| Bloque | Tiempo | Tema Principal | Puntos Clave a Mostrar |
|---|---|---|---|
| **Sección 1** | `0:00 - 2:30` | **Introducción & Problemática** | Contexto del C.E. El Tinteral, necesidad de acceso rápido a materiales sin saturar teléfonos móviles, filosofía de diseño. |
| **Sección 2** | `2:30 - 6:00` | **Demostración de Interfaz Pública** | Navegación por acordeones de niveles/grados, buscador con resaltado en tiempo real (`mark.highlight`), vista móvil responsiva y accesibilidad. |
| **Sección 3** | `6:00 - 10:00` | **Arquitectura Serverless & Backend** | Explicación de los endpoints `/api/materias`, `/api/drive`, `/api/validar-pin`, y `/api/admin`. Separación de capas y caché Edge. |
| **Sección 4** | `10:00 - 14:00` | **Seguridad & Autenticación** | Supabase Auth JWT, validación de roles en la tabla `perfiles`, validación estricta de PIN en servidor (`api/validar-pin.js`), política de CORS restringida por `ALLOWED_ORIGINS` y mensajes opacos. |
| **Sección 5** | `14:00 - 17:30` | **Pruebas Automatizadas (Playwright)** | Demostración de las 15 pruebas e2e y de seguridad (`tests/portal-publico.spec.js` y `tests/seguridad.spec.js`), modo UI interactivo (`npm run test:ui`). |
| **Sección 6** | `17:30 - 20:00` | **Despliegue & Conclusiones** | Despliegue en Vercel, mantenimiento, integración continua y cierre. |

## 🛠️ Recursos Grabados y Pruebas
- **Pruebas Automatizadas**: 15 de 15 pruebas aprobadas (`15 passed`).
- **Grabaciones de Navegación**: Video interactivo WebP y capturas de pantalla de alta definición en la carpeta de artefactos de la app.
