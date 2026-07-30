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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // Fase 4: Optimización Extrema de Caché Edge (Vercel CDN) - Reducido a 1 minuto
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error("Faltan variables de entorno en materias.js");
      return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }

    const headers = {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    };

    // Hacemos un JOIN directo en Supabase usando select relacional de PostgREST
    const query = '/rest/v1/niveles?select=id,nombre,icono,clase_color,orden,grados(id,nombre,nombre_abreviado,icono,orden,materias(id,nombre,folder_id,orden))&order=orden.asc&grados.order=orden.asc&grados.materias.order=orden.asc';
    
    const dbRes = await fetch(`${url}${query}`, { headers });
    
    if (!dbRes.ok) {
        console.error("Error consultando BD en materias.js");
        return res.status(500).json({ error: "El servicio no está disponible temporalmente." });
    }
    
    const data = await dbRes.json();
    
    // Mapear al formato exacto que espera el frontend (mismo de materiasData.js)
    const niveles = data.map(nivel => ({
        id: nivel.id,
        nombre: nivel.nombre,
        icono: nivel.icono,
        claseColor: nivel.clase_color,
        grados: (nivel.grados || []).map(grado => ({
            id: grado.id,
            nombre: grado.nombre,
            nombreAbreviado: grado.nombre_abreviado,
            icono: grado.icono,
            materias: (grado.materias || []).map(mat => ({
                id: mat.id,
                nombre: mat.nombre,
                folderId: mat.folder_id
            }))
        }))
    }));

    res.status(200).json({ niveles });
  } catch (error) {
    console.error("Error inesperado en materias.js:", error);
    res.status(500).json({ error: "El servicio no está disponible temporalmente." });
  }
}
