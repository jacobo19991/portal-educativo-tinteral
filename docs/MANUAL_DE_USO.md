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
   > ![Paso 1: Abrir navegador](../assets/images/manual-paso1.png)
2. Accede a la URL de administración secreta proporcionada por el equipo técnico.
   > ![Paso 2: Ingresar al panel de administración](../assets/images/manual-paso2.png)
3. Verás una pantalla oscura pidiendo una contraseña.
   > ![Paso 3: Pantalla de bloqueo](../assets/images/manual-paso3.png)
4. Escribe tu **Contraseña Maestra** (la que configuraste en Vercel) y haz clic en "Desbloquear Sistema".
   > ![Paso 4: Ingreso de contraseña](../assets/images/manual-paso4.png)

### Paso a paso para agregar una Materia Nueva:
1. Una vez dentro del panel, busca el Grado donde quieres agregar la materia (Por ejemplo: "Primer Grado").
   > ![Paso 1: Buscar grado](../assets/images/manual-paso5.png)
2. Haz clic en el botón azul que dice **"+ Añadir Materia"**.
   > ![Paso 2: Botón Añadir Materia](../assets/images/manual-paso6.png)
3. Se abrirá una pequeña ventana. Escribe el nombre de la materia (Ej: "Ciencias Naturales").
   > ![Paso 3: Escribir nombre](../assets/images/manual-paso7.png)
4. En la casilla "ID de Carpeta", debes pegar el código secreto de la carpeta de Google Drive donde el maestro subirá las tareas. *(En la siguiente sección te enseñamos cómo obtener ese código)*.
   > ![Paso 4: Pegar ID de Carpeta](../assets/images/manual-paso8.png)
5. Haz clic en **"Guardar Cambios"**. ¡Listo! En menos de 1 minuto, todos los alumnos verán la materia nueva en sus celulares.
   > ![Paso 5: Guardar cambios](../assets/images/manual-paso9.png)

### Paso a paso para Eliminar o Editar una Materia:
1. En el panel, busca la materia que quieres modificar.
   > ![Paso 1: Seleccionar materia a editar](../assets/images/manual-paso10.png)
2. Al lado derecho de la materia verás dos íconos: un **Lápiz** (para editar el nombre o la carpeta) y un **Basurero** (para eliminarla).
   > ![Paso 2: Iconos de Lápiz y Basurero](../assets/images/manual-paso11.png)
3. Haz clic en el basurero y confirma si deseas borrarla. ¡Ojo, esto no borra los archivos de Google Drive, solo borra la materia del portal!
   > ![Paso 3: Confirmación de borrado](../assets/images/manual-paso12.png)

---

## 3. ¿Cómo obtener el "ID de Carpeta" de Google Drive?

Para que el portal sepa de dónde sacar las tareas, necesita el "ID" (el código de identidad) de la carpeta de Google Drive.

1. Entra a tu Google Drive.
   > ![Paso 1: Google Drive](../assets/images/manual-paso13.png)
2. Haz doble clic en la carpeta de la materia (Ej: la carpeta "Matemáticas 1er Grado").
   > ![Paso 2: Abrir carpeta](../assets/images/manual-paso14.png)
3. Mira la barra de direcciones de arriba en tu navegador web. Verás un enlace parecido a este:
   `https://drive.google.com/drive/folders/1A2b3c4D5e6F7g8H9i0J`
   > ![Paso 3: URL en el navegador](../assets/images/manual-paso15.png)
4. El **ID de la Carpeta** es **SOLAMENTE** el texto largo y raro que está al final, después de la palabra `folders/`. 
   *(En el ejemplo de arriba, el ID es `1A2b3c4D5e6F7g8H9i0J`)*.
   > ![Paso 4: Identificar ID](../assets/images/manual-paso16.png)
5. Copia ese código largo y pégalo en tu Panel Administrativo cuando crees la materia.
   > ![Paso 5: Copiar y pegar](../assets/images/manual-paso17.png)

---

## 4. Preguntas Frecuentes

*   **¿Qué pasa si me equivoco y borro una materia?**
    Puedes volver a crearla usando el mismo botón de "Añadir Materia" y pegando el ID de Google Drive. No perderás ningún archivo porque todos siguen seguros en Google.
*   **Agregué una materia pero los alumnos dicen que no les aparece.**
    Por seguridad y velocidad, la plataforma guarda la información en "Caché" por 1 minuto. Diles a los alumnos que esperen 60 segundos, refresquen la página y la materia aparecerá mágicamente.
*   **¿Puedo entrar al panel desde mi celular?**
    ¡Sí! El panel se adapta perfectamente a la pantalla de un celular o de una computadora.
