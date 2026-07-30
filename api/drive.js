export default async function handler(req, res) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['https://portal-educativo-tinteral.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:5500'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
      res.setHeader("Access-Control-Allow-Origin", "https://portal-educativo-tinteral.vercel.app");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { folderId, admin, refresh } = req.query;

    // Caché inteligente: Evadir caché si es docente (admin o refresh = true)
    if (admin === "true" || refresh === "true") {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    }

    if (!folderId || typeof folderId !== 'string') {
      return res.status(400).json({ error: "Solicitud inválida." });
    }

    const apiKey = process.env.DRIVE_API_KEY;

    if (!apiKey) {
      console.error("DRIVE_API_KEY no está configurada");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    // ==========================================================
    // SALTO 1: Buscar "Tareas y Actividades" dentro de la Materia
    // ==========================================================
    const queryNivel1 = `'${folderId}' in parents and name contains 'Tareas' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const paramsNivel1 = new URLSearchParams({ q: queryNivel1, fields: "files(id,name)", key: apiKey });

    const resNivel1 = await fetch(`https://www.googleapis.com/drive/v3/files?${paramsNivel1.toString()}`);
    if (!resNivel1.ok) {
        console.error("Error consultando Drive API (Nivel 1)");
        return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }
    const dataNivel1 = await resNivel1.json();

    let idNivel2 = folderId; // Por defecto se queda en la materia
    if (dataNivel1.files && dataNivel1.files.length > 0) {
      idNivel2 = dataNivel1.files[0].id;
    }

    // ==========================================================
    // SALTO 2: Buscar "Tarea de la Semana" dentro de "Tareas y Actividades"
    // ==========================================================
    const queryNivel2 = `'${idNivel2}' in parents and name contains 'Semana' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const paramsNivel2 = new URLSearchParams({ q: queryNivel2, fields: "files(id,name)", key: apiKey });

    const resNivel2 = await fetch(`https://www.googleapis.com/drive/v3/files?${paramsNivel2.toString()}`);
    if (!resNivel2.ok) {
        console.error("Error consultando Drive API (Nivel 2)");
        return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }
    const dataNivel2 = await resNivel2.json();

    let idFinalParaBuscar = idNivel2; // Por defecto se queda en el nivel 2
    if (dataNivel2.files && dataNivel2.files.length > 0) {
      idFinalParaBuscar = dataNivel2.files[0].id;
    }

    // ==========================================================
    // SALTO 3: Traer los PDFs finales (excluyendo subcarpetas)
    // ==========================================================
    const queryArchivos = `'${idFinalParaBuscar}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
    const paramsArchivos = new URLSearchParams({
      q: queryArchivos,
      fields: "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,thumbnailLink,webContentLink)",
      orderBy: "modifiedTime desc",
      pageSize: "100",
      key: apiKey
    });

    const driveUrl = `https://www.googleapis.com/drive/v3/files?${paramsArchivos.toString()}`;
    const response = await fetch(driveUrl);
    
    if (!response.ok) {
      console.error("Error consultando Drive API (Archivos finales)");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }
    
    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    console.error("Error interno en api/drive.js:", error);
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}