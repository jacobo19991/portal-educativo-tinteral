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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ valid: false });
    }

    const { pin } = req.body;

    if (!pin || typeof pin !== 'string' || pin.trim() === '' || pin.length > 20) {
      return res.status(400).json({ valid: false });
    }

    // El PIN se valida directamente contra la variable de entorno DOCENTES_PIN de Vercel
    const { valid } = await validateDocentesPin(pin);

    return res.status(200).json({ valid });

  } catch (error) {
    console.error("Error inesperado en validar-pin-docente:", error);
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}
