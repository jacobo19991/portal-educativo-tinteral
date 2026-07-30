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
    const { gradoId, pin } = req.body;

    if (!gradoId || !pin) {
      return res.status(200).json({ valid: false });
    }

    if (typeof gradoId !== 'string' && typeof gradoId !== 'number') {
        return res.status(200).json({ valid: false });
    }

    if (typeof pin !== 'string' || pin.length > 20) {
        return res.status(200).json({ valid: false });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error("Configuración incompleta de Supabase en validar-pin.");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    const headers = {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    };

    const query = `/rest/v1/grados?id=eq.${gradoId}&select=pin`;
    
    const dbRes = await fetch(`${url}${query}`, { headers });
    
    if (!dbRes.ok) {
        console.error("Error interno al consultar DB.");
        return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }
    
    const data = await dbRes.json();
    
    if (!data || data.length === 0) {
        return res.status(200).json({ valid: false });
    }

    const correctPin = data[0].pin;
    
    if (!correctPin || correctPin === pin) {
        return res.status(200).json({ valid: true });
    } else {
        return res.status(200).json({ valid: false });
    }

  } catch (error) {
    console.error("Error inesperado en validar-pin.");
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}
