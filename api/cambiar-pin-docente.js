import { hashPin, verifyPin } from './utils/cryptoUtils.js';

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

    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${token}`
      }
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    const userData = await userRes.json();
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

    if (!req.body || typeof req.body !== 'object') {
      return res.status(200).json({ success: false, error: "No fue posible cambiar el PIN." });
    }

    const { pinActual, pinNuevo, confirmacionPin } = req.body;

    if (
      typeof pinActual !== 'string' ||
      typeof pinNuevo !== 'string' ||
      typeof confirmacionPin !== 'string'
    ) {
      return res.status(200).json({ success: false, error: "No fue posible cambiar el PIN." });
    }

    const cleanActual = pinActual.trim();
    const cleanNuevo = pinNuevo.trim();
    const cleanConf = confirmacionPin.trim();

    if (!cleanActual || !cleanNuevo || !cleanConf) {
      return res.status(200).json({ success: false, error: "No fue posible cambiar el PIN." });
    }

    if (cleanNuevo !== cleanConf) {
      return res.status(200).json({ success: false, error: "No fue posible cambiar el PIN." });
    }

    if (cleanNuevo.length < 4 || cleanNuevo.length > 20) {
      return res.status(200).json({ success: false, error: "No fue posible cambiar el PIN." });
    }

    if (cleanNuevo === cleanActual) {
      return res.status(200).json({ success: false, error: "No fue posible cambiar el PIN." });
    }

    let dbRow = null;
    try {
      const getRes = await fetch(`${url}/rest/v1/configuracion_portal?clave=eq.docentes_pin&select=valor_hash`, {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        }
      });
      if (getRes.ok) {
        const data = await getRes.json();
        if (Array.isArray(data) && data.length > 0) {
          dbRow = data[0];
        }
      }
    } catch (dbGetErr) {
      console.error("Error al consultar configuracion_portal:", dbGetErr);
    }

    let isActualValid = false;
    if (dbRow && dbRow.valor_hash) {
      isActualValid = verifyPin(cleanActual, dbRow.valor_hash);
    } else {
      const fallbackPin = process.env.DOCENTES_PIN;
      if (fallbackPin) {
        isActualValid = (fallbackPin === cleanActual);
      }
    }

    if (!isActualValid) {
      return res.status(200).json({ success: false, error: "No fue posible cambiar el PIN." });
    }

    const newHash = hashPin(cleanNuevo);
    const updatedAt = new Date().toISOString();

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
      return res.status(200).json({ success: false, error: "No fue posible cambiar el PIN." });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error inesperado en cambiar-pin-docente:", error);
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}
