import crypto from 'crypto';

/**
 * Valida el PIN docente contra la variable de entorno DOCENTES_PIN de Vercel.
 * El PIN se guarda y administra directamente desde el panel de Vercel (Settings → Environment Variables).
 */
export async function validateDocentesPin(pin) {
  if (!pin || typeof pin !== 'string') return { valid: false };

  const storedPin = process.env.DOCENTES_PIN;
  if (!storedPin) {
    console.error('DOCENTES_PIN no está configurado en las variables de entorno.');
    return { valid: false };
  }

  const cleanPin = pin.trim();
  const cleanStored = storedPin.trim();

  // Comparación segura que previene timing attacks
  let isValid = false;
  if (cleanPin.length === cleanStored.length) {
    isValid = crypto.timingSafeEqual(
      Buffer.from(cleanPin),
      Buffer.from(cleanStored)
    );
  }

  return { valid: isValid };
}
