import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { fileId } = req.query;
    if (!fileId) {
      return res.status(400).json({ error: "Falta fileId" });
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !privateKey) {
      return res.status(500).json({ error: "Faltan credenciales de Service Account en Vercel" });
    }

    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: formattedPrivateKey
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="documento.pdf"');

    // Pipe the response stream directly to the client
    response.data.pipe(res);
  } catch (error) {
    return res.status(500).json({
      error: "Error descargando PDF en api/pdf.js",
      message: error.message
    });
  }
}
