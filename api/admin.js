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
    // 1. Validar Token JWT (Authorization header)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }
    const userJwt = authHeader.split(' ')[1];
    if (!userJwt) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey || !anonKey) {
      console.error("Configuración incompleta de Supabase en admin.");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    let userRes;
    try {
      userRes = await fetch(`${url}/auth/v1/user`, {
        headers: {
          "apikey": anonKey,
          "Authorization": `Bearer ${userJwt}`
        }
      });
    } catch (err) {
      console.error("Error al verificar token con Supabase Auth:", err);
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }
    
    if (!userRes.ok) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }
    
    const userData = await userRes.json();
    if (!userData || !userData.id) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    // 2. Consulta de la tabla perfiles para confirmar rol admin
    let roleRes;
    try {
      roleRes = await fetch(`${url}/rest/v1/perfiles?id=eq.${encodeURIComponent(userData.id)}&select=rol`, {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        }
      });
    } catch (err) {
      console.error("Error al consultar rol en base de datos:", err);
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    if (!roleRes.ok) {
      console.error("Error al consultar rol de usuario en la base de datos.");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    const roles = await roleRes.json();
    if (!Array.isArray(roles) || roles.length === 0 || roles[0].rol !== 'admin') {
      return res.status(403).json({ error: "Acceso denegado." });
    }

    // 3. Validar req.body y acción (solo para solicitudes autenticadas y autorizadas)
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: "Solicitud inválida." });
    }

    const { action, payload } = req.body;
    
    if (typeof action !== 'string') {
      return res.status(400).json({ error: "Acción inválida." });
    }
    
    const allowedActions = [
      "createMateria",
      "updateMateria",
      "deleteMateria",
      "createGrado",
      "deleteGrado"
    ];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({ error: "Acción desconocida." });
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: "Payload inválido." });
    }

    // 4. Preparar mutación con payload estrictamente validado
    const supabaseHeaders = {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };

    let endpoint = "";
    let method = "POST";
    let body = null;

    switch (action) {
      case "createMateria":
        if (!payload.nombre || typeof payload.nombre !== 'string' || payload.nombre.trim() === '' || !payload.grado_id) {
          return res.status(400).json({ error: "Payload inválido para createMateria." });
        }
        endpoint = "/rest/v1/materias";
        method = "POST";
        body = JSON.stringify({
          nombre: payload.nombre.trim(),
          grado_id: payload.grado_id,
          folder_id: typeof payload.folder_id === 'string' ? payload.folder_id.trim() : null,
          orden: typeof payload.orden === 'number' ? payload.orden : 0
        });
        break;

      case "updateMateria":
        if (!payload.id) {
          return res.status(400).json({ error: "Payload inválido para updateMateria." });
        }
        endpoint = `/rest/v1/materias?id=eq.${encodeURIComponent(payload.id)}`;
        method = "PATCH";
        const sanitizedMateria = {};
        if (typeof payload.nombre === 'string' && payload.nombre.trim() !== '') sanitizedMateria.nombre = payload.nombre.trim();
        if (payload.grado_id !== undefined) sanitizedMateria.grado_id = payload.grado_id;
        if (payload.folder_id !== undefined) sanitizedMateria.folder_id = payload.folder_id;
        if (typeof payload.orden === 'number') sanitizedMateria.orden = payload.orden;
        body = JSON.stringify(sanitizedMateria);
        break;

      case "deleteMateria":
        if (!payload.id) {
          return res.status(400).json({ error: "Payload inválido para deleteMateria." });
        }
        endpoint = `/rest/v1/materias?id=eq.${encodeURIComponent(payload.id)}`;
        method = "DELETE";
        body = null;
        break;

      case "createGrado":
        if (!payload.nombre || typeof payload.nombre !== 'string' || payload.nombre.trim() === '' || !payload.nivel_id) {
          return res.status(400).json({ error: "Payload inválido para createGrado." });
        }
        endpoint = "/rest/v1/grados";
        method = "POST";
        body = JSON.stringify({
          nombre: payload.nombre.trim(),
          nivel_id: payload.nivel_id,
          nombre_abreviado: typeof payload.nombre_abreviado === 'string' ? payload.nombre_abreviado.trim() : payload.nombre.trim(),
          orden: typeof payload.orden === 'number' ? payload.orden : 0,
          icono: typeof payload.icono === 'string' ? payload.icono : null
        });
        break;

      case "deleteGrado":
        if (!payload.id) {
          return res.status(400).json({ error: "Payload inválido para deleteGrado." });
        }
        endpoint = `/rest/v1/grados?id=eq.${encodeURIComponent(payload.id)}`;
        method = "DELETE";
        body = null;
        break;
    }

    const fetchOptions = { method, headers: supabaseHeaders };
    if (body) fetchOptions.body = body;

    const dbRes = await fetch(`${url}${endpoint}`, fetchOptions);
    
    if (!dbRes.ok) {
      console.error("Error en operación de base de datos durante admin.");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }
    
    let data = null;
    try {
      data = await dbRes.json();
    } catch (e) {}

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error inesperado en api/admin.js:", error);
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}