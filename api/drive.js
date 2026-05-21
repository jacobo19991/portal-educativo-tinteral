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
      return res.status(400).json({
        error: "Falta folderId"
      });
    }

    const apiKey = process.env.DRIVE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "DRIVE_API_KEY no está configurada en Vercel"
      });
    }

    const query = `'${folderId}' in parents and trashed = false`;

    // AQUI ESTA LA MAGIA: Se agregó thumbnailLink y webContentLink
    const params = new URLSearchParams({
      q: query,
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