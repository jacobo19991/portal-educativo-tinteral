export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // Fase 4: Optimización Extrema de Caché Edge (Vercel CDN) - Reducido a 1 minuto
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const url = process.env.SUPABASE_URL || 'https://zsfimkuvapbyssjdhddh.supabase.co';
    const key = process.env.SUPABASE_ANON_KEY || 'sb_publishable_Kpkr1tKPJ1xPnoXtLM8H_w_xKvng6y_';

    if (!url || !key) {
      return res.status(500).json({ error: "Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY" });
    }

    const headers = {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    };

    // Hacemos un JOIN directo en Supabase usando select relacional de PostgREST
    const query = '/rest/v1/niveles?select=id,nombre,icono,clase_color,orden,grados(id,nombre,nombre_abreviado,icono,pin,orden,materias(id,nombre,folder_id,orden))&order=orden.asc&grados.order=orden.asc&grados.materias.order=orden.asc';
    
    const dbRes = await fetch(`${url}${query}`, { headers });
    
    if (!dbRes.ok) {
        throw new Error(await dbRes.text());
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
            pin: grado.pin,
            materias: (grado.materias || []).map(mat => ({
                id: mat.id,
                nombre: mat.nombre,
                folderId: mat.folder_id
            }))
        }))
    }));

    res.status(200).json({ niveles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
