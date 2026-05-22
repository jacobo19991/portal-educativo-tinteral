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
    // Necesitamos una cuenta genérica en Supabase para todos los docentes.
    const docenteEmail = process.env.DOCENTES_EMAIL || 'maestros@tinteral.edu.sv';
    const docentePassword = process.env.DOCENTES_PASSWORD || 'Tinteral2026_Secreto*';

    // Hacemos login en Supabase usando la API REST (Auth)
    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            "apikey": anonKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: docenteEmail,
            password: docentePassword
        })
    });

    if (!authRes.ok) {
        const authErr = await authRes.json();
        throw new Error("No se pudo iniciar sesión en la cuenta compartida: " + authErr.error_description);
    }

    const sessionData = await authRes.json();
    
    // Devolvemos la sesión completa al frontend para que la inyecte en Supabase local
    return res.status(200).json({ session: sessionData });

  } catch (error) {
    console.error("Error en API PIN:", error);
    return res.status(500).json({ error: error.message });
  }
}
