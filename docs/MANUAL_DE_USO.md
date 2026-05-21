# Manual de Uso: Portal Educativo "C.E. El Tinteral"

¡Bienvenido al nuevo portal educativo! Este manual está diseñado para explicarte de forma sencilla cómo funciona tu plataforma y cómo puedes administrarla sin necesidad de ser un experto en informática.

---

## 1. Conceptos Básicos (Para entender tu plataforma)

Tu plataforma está construida con tecnología de punta (la misma que usan empresas como Netflix o Google). Aquí te explicamos tres conceptos clave de forma sencilla:

*   **¿Qué es Vercel?**
    Imagina que Vercel es el "terreno" donde está construida tu escuela en internet. Vercel se encarga de que tu página esté siempre encendida, sea rapidísima y soporte a cientos de alumnos conectándose al mismo tiempo sin colapsar.
*   **¿Qué es Supabase?**
    Es el "archivero digital" (Base de Datos) de tu escuela. En lugar de tener listas de papel, Supabase guarda de forma segura los nombres de todas las materias, los grados y los niveles. Cuando agregas una materia nueva, se guarda aquí.
*   **¿Qué es Google Drive (en la plataforma)?**
    Es tu "bodega de libros". El portal no guarda los archivos pesados (PDFs, guías) directamente para no ponerse lento. En su lugar, los maestros suben las tareas a Google Drive, y el portal simplemente los muestra como si fuera una ventana hacia esa bodega.

---

## 2. ¿Cómo funciona el Panel Administrativo?

El Panel Administrativo es la "sala de maestros" secreta. Solo las personas con la **Contraseña Maestra** pueden entrar. Desde aquí puedes crear materias nuevas o borrar las antiguas.

### Paso a paso para entrar:
1. Abre tu navegador web y entra a la dirección normal de tu portal.
2. Al final de la dirección, escribe `/admin.html` (Ejemplo: `tusitio.com/admin.html`) y presiona Enter.
3. Verás una pantalla oscura pidiendo una contraseña.
4. Escribe tu **Contraseña Maestra** (la que configuraste en Vercel) y haz clic en "Desbloquear Sistema".

### Paso a paso para agregar una Materia Nueva:
1. Una vez dentro del panel, busca el Grado donde quieres agregar la materia (Por ejemplo: "Primer Grado").
2. Haz clic en el botón azul que dice **"+ Añadir Materia"**.
3. Se abrirá una pequeña ventana. Escribe el nombre de la materia (Ej: "Ciencias Naturales").
4. En la casilla "ID de Carpeta", debes pegar el código secreto de la carpeta de Google Drive donde el maestro subirá las tareas. *(En la siguiente sección te enseñamos cómo obtener ese código)*.
5. Haz clic en **"Guardar Cambios"**. ¡Listo! En menos de 1 minuto, todos los alumnos verán la materia nueva en sus celulares.

### Paso a paso para Eliminar o Editar una Materia:
1. En el panel, busca la materia que quieres modificar.
2. Al lado derecho de la materia verás dos íconos: un **Lápiz** (para editar el nombre o la carpeta) y un **Basurero** (para eliminarla).
3. Haz clic en el basurero y confirma si deseas borrarla. ¡Ojo, esto no borra los archivos de Google Drive, solo borra la materia del portal!

---

## 3. ¿Cómo obtener el "ID de Carpeta" de Google Drive?

Para que el portal sepa de dónde sacar las tareas, necesita el "ID" (el código de identidad) de la carpeta de Google Drive.

1. Entra a tu Google Drive.
2. Haz doble clic en la carpeta de la materia (Ej: la carpeta "Matemáticas 1er Grado").
3. Mira la barra de direcciones de arriba en tu navegador web. Verás un enlace parecido a este:
   `https://drive.google.com/drive/folders/1A2b3c4D5e6F7g8H9i0J`
4. El **ID de la Carpeta** es **SOLAMENTE** el texto largo y raro que está al final, después de la palabra `folders/`. 
   *(En el ejemplo de arriba, el ID es `1A2b3c4D5e6F7g8H9i0J`)*.
5. Copia ese código largo y pégalo en tu Panel Administrativo cuando crees la materia.

---

## 4. Preguntas Frecuentes

*   **¿Qué pasa si me equivoco y borro una materia?**
    Puedes volver a crearla usando el mismo botón de "Añadir Materia" y pegando el ID de Google Drive. No perderás ningún archivo porque todos siguen seguros en Google.
*   **Agregué una materia pero los alumnos dicen que no les aparece.**
    Por seguridad y velocidad, la plataforma guarda la información en "Caché" por 1 minuto. Diles a los alumnos que esperen 60 segundos, refresquen la página y la materia aparecerá mágicamente.
*   **¿Puedo entrar al panel desde mi celular?**
    ¡Sí! El panel se adapta perfectamente a la pantalla de un celular o de una computadora.
