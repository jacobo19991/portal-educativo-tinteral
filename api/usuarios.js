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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: "Solicitud inválida." });
    }

    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: "Datos de usuario inválidos." });
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey || !process.env.SUPABASE_ANON_KEY) {
      console.error("Configuración incompleta de Supabase en usuarios.js.");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    // 1. Verificar que quien hace la petición es administrador real en la BD
    const userJwt = authHeader.split(' ')[1]; // Sacar JWT del admin
    
    // Obtener info del usuario usando su propio token
    const userRes = await fetch(`${url}/auth/v1/user`, {
        headers: {
            "apikey": process.env.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${userJwt}`
        }
    });
    
    const userData = await userRes.json();
    if (!userRes.ok || !userData?.id) {
        return res.status(401).json({ error: "Sesión inválida o expirada." });
    }
    
    // Validar su rol en la tabla perfiles usando Service Key
    const roleRes = await fetch(`${url}/rest/v1/perfiles?id=eq.${userData.id}&select=rol`, {
        headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
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

    // 2. Si llegamos aquí, ES ADMIN. Procedemos a crear el usuario en Auth.
    const createRes = await fetch(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password,
            email_confirm: true // Confirmar correo automáticamente
        })
    });

    if (!createRes.ok) {
        console.error("Error al crear usuario en Supabase.");
        return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    return res.status(200).json({ message: "Usuario creado exitosamente" });

  } catch (error) {
    console.error("Error inesperado en API usuarios.");
    return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}
