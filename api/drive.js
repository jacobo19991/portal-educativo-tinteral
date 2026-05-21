export default async function handler(req, res) {
  // Manejo de CORS (Opcional pero recomendado para llamadas desde GitHub Pages)
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { folderId } = req.query;

  if (!folderId) {
    return res.status(400).json({
      error: "Falta folderId"
    });
  }

  const apiKey = process.env.DRIVE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "No existe DRIVE_API_KEY"
    });
  }

  try {
    const query = encodeURIComponent(
      `'${folderId}' in parents and trashed = false`
    );

    const fields = encodeURIComponent(
      'files(id,name,mimeType,createdTime,modifiedTime,webViewLink)'
    );

    const url =
      `https://www.googleapis.com/drive/v3/files?q=${query}` +
      `&fields=${fields}` +
      `&orderBy=modifiedTime desc` +
      `&pageSize=100` +
      `&key=${apiKey}`;

    const response = await fetch(url);

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {

    return res.status(500).json({
      error: "Error consultando Google Drive",
      details: error.message
    });

  }
}
