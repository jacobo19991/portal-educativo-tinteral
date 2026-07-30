import { verifyPin } from './utils/cryptoUtils.js';

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

    const { pin } = req.body;

    if (!pin || typeof pin !== 'string' || pin.trim() === '' || pin.length > 20) {
      return res.status(200).json({ valid: false });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let dbRow = null;

    if (url && key) {
      try {
        const dbRes = await fetch(`${url}/rest/v1/configuracion_portal?clave=eq.docentes_pin&select=valor_hash,updated_at`, {
          headers: {
            "apikey": key,
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          }
        });

        if (dbRes.ok) {
          const data = await dbRes.json();
          if (Array.isArray(data) && data.length > 0) {
            dbRow = data[0];
          }
        }
      } catch (dbErr) {
        console.error("Error al consultar configuracion_portal en Supabase:", dbErr);
      }
    }

    let isValid = false;
    let version = dbRow?.updated_at || 'v1';

    if (dbRow && dbRow.valor_hash) {
      isValid = verifyPin(pin, dbRow.valor_hash);
    } else {
      const docentesPin = process.env.DOCENTES_PIN;
      if (docentesPin) {
        isValid = (docentesPin === pin);
      } else {
        console.error("Configuración incompleta: Ni configuracion_portal ni DOCENTES_PIN están configurados.");
      }
    }

    return res.status(200).json({
      valid: isValid,
      version: isValid ? version : undefined
    });

  } catch (error) {
    console.error("Error inesperado en validar-pin-docente:", error);
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}
