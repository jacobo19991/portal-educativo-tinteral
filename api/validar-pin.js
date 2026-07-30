export default async function handler(req, res) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : ['https://portal-educativo-tinteral.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:5500'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(200).json({ valid: false });
    }

    const { gradoId, pin } = req.body;

    if (!gradoId || (typeof gradoId !== 'string' && typeof gradoId !== 'number')) {
      return res.status(200).json({ valid: false });
    }

    if (!pin || typeof pin !== 'string' || pin.trim() === '' || pin.length > 20) {
      return res.status(200).json({ valid: false });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.error("Configuración incompleta de Supabase en validar-pin.");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    const headers = {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    };

    const query = `/rest/v1/grados?id=eq.${encodeURIComponent(gradoId)}&select=pin`;
    
    let data = [];
    try {
      const dbRes = await fetch(`${url}${query}`, { headers });
      if (dbRes.ok) {
        data = await dbRes.json();
      }
    } catch (dbErr) {
      console.error("Error al consultar la base de datos en validar-pin:", dbErr);
    }
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(200).json({ valid: false });
    }

    const correctPin = data?.[0]?.pin;

    if (
      typeof correctPin !== "string" ||
      correctPin.length === 0
    ) {
      return res.status(200).json({ valid: false });
    }

    return res.status(200).json({
      valid: correctPin === pin
    });

  } catch (error) {
    console.error("Error inesperado en validar-pin:", error);
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}
