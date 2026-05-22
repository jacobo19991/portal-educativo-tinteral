export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
    if (!authHeader) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: "Servidor no configurado para gestión de usuarios (Falta Service Key)" });
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
    
    if (!userRes.ok) return res.status(401).json({ error: "Token inválido" });
    const userData = await userRes.json();
    
    // Validar su rol en la tabla perfiles usando Service Key
    const roleRes = await fetch(`${url}/rest/v1/perfiles?id=eq.${userData.id}&select=rol`, {
        headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json"
        }
    });
    const roles = await roleRes.json();
    if (!roles || roles.length === 0 || roles[0].rol !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado: Se requiere rol de Administrador." });
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
        const createErr = await createRes.json();
        throw new Error(createErr.message || "Error al crear usuario en Supabase");
    }

    return res.status(200).json({ message: "Usuario creado exitosamente" });

  } catch (error) {
    console.error("Error en API usuarios:", error);
    return res.status(500).json({ error: error.message });
  }
}
