/**
 * Endpoint deshabilitado.
 * El PIN docente se administra directamente desde el panel de Vercel:
 * Settings → Environment Variables → DOCENTES_PIN
 *
 * Para cambiar el PIN:
 * 1. Ir a https://vercel.com → tu proyecto → Settings → Environment Variables
 * 2. Editar el valor de DOCENTES_PIN
 * 3. El cambio toma efecto en el próximo despliegue automático (push a main)
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(503).json({
    success: false,
    error: 'El cambio de PIN se gestiona desde el panel de Vercel (Settings → Environment Variables → DOCENTES_PIN).'
  });
}
