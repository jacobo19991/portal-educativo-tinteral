export default async function handler(req, res) {
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

    const query = encodeURIComponent(
      `'${folderId}' in parents and trashed = false`
    );

    const fields = encodeURIComponent(
      "files(id,name,mimeType,createdTime,modifiedTime,webViewLink)"
    );

    const url =
      `https://www.googleapis.com/drive/v3/files?q=${query}` +
      `&fields=${fields}` +
      `&orderBy=modifiedTime desc` +
      `&pageSize=100` +
      `&key=${apiKey}`;

    const driveResponse = await fetch(url);
    const driveData = await driveResponse.json();

    if (!driveResponse.ok) {
      return res.status(driveResponse.status).json({
        error: "Google Drive API devolvió un error",
        status: driveResponse.status,
        details: driveData
      });
    }

    return res.status(200).json(driveData);

  } catch (error) {
    return res.status(500).json({
      error: "Error interno en api/drive.js",
      message: error.message,
      stack: error.stack
    });
  }
}
