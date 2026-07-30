export default async function handler(req, res) {
  const allowedOrigins = ['https://portal-educativo-tinteral.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:5500'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
      res.setHeader("Access-Control-Allow-Origin", "https://portal-educativo-tinteral.vercel.app"); // Default fallback
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Sesión inválida o expirada." });
    }
    const userJwt = authHeader.split(' ')[1];

    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: "Solicitud inválida." });
    }

    const { action, payload } = req.body;
    
    if (typeof action !== 'string') {
        return res.status(400).json({ error: "Acción inválida." });
    }
    
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !secretKey || !anonKey) {
      console.error("Configuración incompleta de Supabase.");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    // 1. Verificar Token
    const userRes = await fetch(`${url}/auth/v1/user`, {
        headers: {
            "apikey": anonKey,
            "Authorization": `Bearer ${userJwt}`
        }
    });
    const userData = await userRes.json();
    if (!userRes.ok || !userData?.id) {
        return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    // 2. Verificar Rol Admin
    const roleRes = await fetch(`${url}/rest/v1/perfiles?id=eq.${userData.id}&select=rol`, {
        headers: {
            "apikey": secretKey,
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/json"
        }
    });
    if (!roleRes.ok) {
        return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }
    const roles = await roleRes.json();
    if (!roles || roles.length === 0 || roles[0].rol !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado." });
    }

    const supabaseHeaders = {
      "apikey": secretKey,
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };

    let endpoint = "";
    let method = "POST";
    let body = JSON.stringify(payload);

    switch (action) {
      case "ADD_MATERIA":
        endpoint = "/materias";
        method = "POST";
        break;
      case "EDIT_MATERIA":
        endpoint = `/materias?id=eq.${payload.id}`;
        method = "PATCH";
        // Remove ID from payload to avoid updating primary key
        const { id: _, ...editPayload } = payload;
        body = JSON.stringify(editPayload);
        break;
      case "DELETE_MATERIA":
        endpoint = `/materias?id=eq.${payload.id}`;
        method = "DELETE";
        body = null;
        break;
      case "ADD_GRADO":
        endpoint = "/grados";
        method = "POST";
        break;
      case "DELETE_GRADO":
        endpoint = `/grados?id=eq.${payload.id}`;
        method = "DELETE";
        body = null;
        break;
      default:
        return res.status(400).json({ error: "Acción no reconocida." });
    }

    const fetchOptions = {
      method,
      headers: supabaseHeaders
    };
    if (body) fetchOptions.body = body;

    const dbRes = await fetch(`${url}${endpoint}`, fetchOptions);
    
    if (!dbRes.ok) {
        throw new Error(await dbRes.text());
    }
    
    // Si la request no devuelve JSON en DELETE, manejarlo
    let data = null;
    try {
        data = await dbRes.json();
    } catch(e) { }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
