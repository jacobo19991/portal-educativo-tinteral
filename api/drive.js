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
      return res.status(500).json({ error: "DRIVE_API_KEY no está configurada en Vercel" });
    }

    // =========================================================================
    // PASO 1: PASO INTELIGENTE - Buscar la subcarpeta "Tareas y Actividades"
    // =========================================================================
    const buscaSubcarpetaQuery = `'${folderId}' in parents and name = 'Tareas y Actividades' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const subcarpetaParams = new URLSearchParams({
      q: buscaSubcarpetaQuery,
      fields: "files(id)",
      key: apiKey
    });

    const subcarpetaRes = await fetch(`https://www.googleapis.com/drive/v3/files?${subcarpetaParams.toString()}`);
    const subcarpetaData = await subcarpetaRes.json();

    // Por defecto usaremos el ID que mandó el frontend
    let idFinalParaBuscar = folderId;

    // Si el código encontró la subcarpeta "Tareas y Actividades", extrae su ID automáticamente
    if (subcarpetaData.files && subcarpetaData.files.length > 0) {
      idFinalParaBuscar = subcarpetaData.files[0].id;
    }

    // =========================================================================
    // PASO 2: Traer los archivos reales (PDFs) dentro de esa carpeta destino
    // =========================================================================
    // Filtramos para que NO traiga carpetas (mimeType != 'application/vnd.google-apps.folder')
    const queryArchivos = `'${idFinalParaBuscar}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;

    const params = new URLSearchParams({
      q: queryArchivos,
      fields: "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,thumbnailLink,webContentLink)",
      orderBy: "modifiedTime desc",
      pageSize: "100",
      key: apiKey
    });

    const driveUrl = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;

    const response = await fetch(driveUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Google Drive API rechazó la petición",
        googleStatus: response.status,
        googleError: data
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Error interno real en api/drive.js",
      message: error.message
    });
  }
}