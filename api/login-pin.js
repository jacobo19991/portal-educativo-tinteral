export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { pin } = req.body;
    
    // Obtener el PIN real guardado en Vercel Env Vars
    const realPin = process.env.DOCENTES_PIN;
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!realPin) {
      return res.status(500).json({ error: "El servidor no tiene un PIN configurado." });
    }

    if (!pin || pin !== realPin) {
      return res.status(401).json({ error: "PIN institucional incorrecto" });
    }

    // El PIN es correcto. Iniciar sesión en la cuenta compartida de docentes.
    // Para simplificarte la vida, programaré el correo y clave maestra aquí mismo.
    const docenteEmail = 'maestros@tinteral.edu.sv';
    const docentePassword = 'Tinteral2026_Secreto*';

    // 1. Intentamos hacer login
    let authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            "apikey": anonKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: docenteEmail, password: docentePassword })
    });

    // 2. Si falla porque el usuario no existe, LO CREAMOS AUTOMÁTICAMENTE por ti
    if (!authRes.ok) {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para auto-crear la cuenta maestra.");
        
        await fetch(`${url}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                "apikey": serviceKey,
                "Authorization": `Bearer ${serviceKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: docenteEmail, password: docentePassword, email_confirm: true })
        });

        // Reintentamos el login ahora que ya existe
        authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                "apikey": anonKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: docenteEmail, password: docentePassword })
        });
    }

    if (!authRes.ok) {
        const authErr = await authRes.json();
        throw new Error("Error interno de autenticación: " + (authErr.error_description || authErr.msg));
    }

    const sessionData = await authRes.json();
    
    // Devolvemos la sesión completa al frontend
    return res.status(200).json({ session: sessionData });

  } catch (error) {
    console.error("Error en API PIN:", error);
    return res.status(500).json({ error: error.message });
  }
}
