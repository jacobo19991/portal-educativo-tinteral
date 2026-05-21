export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { folderId } = req.query;

    if (!folderId) {
      return res.status(400).json({ error: "Falta folderId" });
    }

    const apiKey = process.env.DRIVE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "DRIVE_API_KEY no está configurada" });
    }

    // ==========================================================
    // SALTO 1: Buscar "Tareas y Actividades" dentro de la Materia
    // ==========================================================
    const queryNivel1 = `'${folderId}' in parents and name contains 'Tareas' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const paramsNivel1 = new URLSearchParams({ q: queryNivel1, fields: "files(id,name)", key: apiKey });

    const resNivel1 = await fetch(`https://www.googleapis.com/drive/v3/files?${paramsNivel1.toString()}`);
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
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Google Drive API rechazó la petición",
        googleError: data
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Error interno en api/drive.js",
      message: error.message
    });
  }
}