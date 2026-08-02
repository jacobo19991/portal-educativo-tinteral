import { hashPin } from './utils/cryptoUtils.js';
import { validateDocentesPin } from './utils/docentesPinService.js';
import { rateLimit } from './utils/rateLimiter.js';

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const limitRes = rateLimit(ip, 5, 60000);
  if (!limitRes.success) {
    return res.status(429).json({ error: `Demasiados intentos. Intenta de nuevo en ${limitRes.retryAfter} segundos.` });
  }

  try {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let isMockMode = url && url.includes('fake-supabase');

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: "Datos de solicitud inválidos." });
    }

    const { pinActual, pinNuevo, confirmacionPin } = req.body;

    if (
      typeof pinActual !== 'string' ||
      typeof pinNuevo !== 'string' ||
      typeof confirmacionPin !== 'string'
    ) {
      return res.status(400).json({ success: false, error: "Formato de PIN incorrecto." });
    }

    const cleanActual = pinActual.trim();
    const cleanNuevo = pinNuevo.trim();
    const cleanConf = confirmacionPin.trim();

    if (!cleanActual || !cleanNuevo || !cleanConf) {
      return res.status(400).json({ success: false, error: "Todos los campos son obligatorios." });
    }

    if (cleanNuevo !== cleanConf) {
      return res.status(400).json({ success: false, error: "El nuevo PIN y la confirmación no coinciden." });
    }

    if (cleanNuevo.length < 4 || cleanNuevo.length > 20) {
      return res.status(400).json({ success: false, error: "El PIN nuevo debe tener entre 4 y 20 caracteres." });
    }

    if (cleanNuevo === cleanActual) {
      return res.status(409).json({ success: false, error: "El nuevo PIN debe ser diferente al actual." });
    }

    const { valid } = await validateDocentesPin(cleanActual, url, serviceRoleKey);
    if (!valid) {
      return res.status(401).json({ success: false, error: "El PIN actual es incorrecto." });
    }

    const newHash = hashPin(cleanNuevo);
    const updatedAt = new Date().toISOString();

    if (isMockMode) {
      global.__MOCK_CONFIGURACION_PORTAL__ = {
        clave: "docentes_pin",
        valor_hash: newHash,
        updated_at: updatedAt,
        updated_by: null
      };
      return res.status(200).json({ success: true });
    }

    const saveRes = await fetch(`${url}/rest/v1/configuracion_portal`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        clave: "docentes_pin",
        valor_hash: newHash,
        updated_at: updatedAt,
        updated_by: null
      })
    });

    if (!saveRes.ok) {
      console.error("Error al guardar en configuracion_portal Supabase:", saveRes.status);
      return res.status(500).json({ success: false, error: "Error interno al guardar el nuevo PIN." });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error inesperado en cambiar-pin-docente:", error);
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}
