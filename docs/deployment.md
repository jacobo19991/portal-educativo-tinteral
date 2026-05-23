# Guía de Despliegue y Variables de Entorno

Este documento detalla la configuración requerida para desplegar el Portal Educativo del C.E. El Tinteral en producción.

## 1. Variables de Entorno (Vercel)
Debes configurar las siguientes variables en el dashboard de Vercel (Settings -> Environment Variables) para que la aplicación funcione correctamente y de forma segura:

- `SUPABASE_URL`: La URL base de tu proyecto en Supabase (ej: `https://[ID].supabase.co`).
- `SUPABASE_ANON_KEY`: La llave pública (Publishable) para acceso de lectura del frontend a las materias.
- `SUPABASE_SECRET_KEY`: La llave secreta (Service Role) utilizada **EXCLUSIVAMENTE** por el backend (`api/admin.js`) para ignorar RLS en operaciones administrativas. Jamás se envía al cliente.
- `ADMIN_PASSWORD`: La contraseña configurada para proteger el acceso administrativo de Vercel a través de la API.

## 2. Archivos y Carpetas Restringidas
Las siguientes ubicaciones **JAMÁS** deben subirse a repositorios públicos:
- `_credenciales/` y su contenido (como `accesos.txt`).
- `.env` y `.env.local`
- La llave `Service Role` no debe estar guardada en texto plano en ningún archivo del código fuente.

## 3. Caché y Service Worker
El archivo `sw.js` controla el funcionamiento sin conexión (PWA).
El proyecto cuenta con un `vercel.json` que asigna `must-revalidate` a `sw.js` para evitar que el Service Worker se quede atrapado en un bucle infinito de caché vieja. Siempre que hagas un cambio grande, debes actualizar la versión manual `CACHE_NAME` en la primera línea de `sw.js`.

## 4. Google Drive
Las rutas configuradas de Google Drive ya están apuntando a `/preview` para minimizar los bloqueos de "Permiso Denegado". El Service Worker ignora activamente este tráfico (Network Only) para impedir que se intenten guardar PDFs de varios Megabytes en la RAM del teléfono del estudiante.
