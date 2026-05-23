export default async function handler(req, res) {
  const allowedOrigins = ['https://portal-educativo-tinteral.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:5500'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
      res.setHeader("Access-Control-Allow-Origin", "https://portal-educativo-tinteral.vercel.app"); // Default fallback
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password, action, payload } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Validación de seguridad (Riesgo Cero)
    if (!adminPassword || password !== adminPassword) {
      return res.status(401).json({ error: "No autorizado. Contraseña incorrecta." });
    }

    const url = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!url || !secretKey) {
      return res.status(500).json({ error: "Faltan llaves de Supabase en Vercel (SUPABASE_SECRET_KEY)." });
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
