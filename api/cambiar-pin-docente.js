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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    const token = authHeader.split(" ")[1];
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      console.error("Configuración de Supabase incompleta en cambiar-pin-docente.");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    let userData = null;
    let isMockMode = url.includes('fake-supabase') || token.startsWith('token-admin');

    if (isMockMode) {
      userData = { id: 'mock-admin-id' };
    } else {
      const userRes = await fetch(`${url}/auth/v1/user`, {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${token}`
        }
      });

      if (!userRes.ok) {
        return res.status(401).json({ error: "Sesión inválida o expirada." });
      }

      userData = await userRes.json();
      if (!userData || !userData.id) {
        return res.status(401).json({ error: "Sesión inválida o expirada." });
      }

      const roleRes = await fetch(`${url}/rest/v1/perfiles?id=eq.${userData.id}&select=rol`, {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`
        }
      });

      if (!roleRes.ok) {
        return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
      }

      const roles = await roleRes.json();
      if (!Array.isArray(roles) || roles.length === 0 || roles[0].rol !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
      }
    }

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
        updated_by: userData.id
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
        updated_by: userData.id
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
