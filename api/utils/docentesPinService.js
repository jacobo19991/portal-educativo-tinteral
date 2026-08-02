import crypto from 'crypto';
import { verifyPin, hashPin } from './cryptoUtils.js';

export async function getStoredPin(url, serviceRoleKey) {
  let dbRow = null;

  if (url && serviceRoleKey && !url.includes('fake-supabase')) {
    try {
      const dbRes = await fetch(`${url}/rest/v1/configuracion_portal?clave=eq.docentes_pin&select=valor_hash,updated_at`, {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        }
      });

      if (dbRes.ok) {
        const data = await dbRes.json();
        if (Array.isArray(data) && data.length > 0) {
          dbRow = data[0];
        }
      }
    } catch (dbErr) {
      console.error("Error al consultar configuracion_portal en Supabase:", dbErr);
    }
  }

  if (!dbRow && global.__MOCK_CONFIGURACION_PORTAL__ && global.__MOCK_CONFIGURACION_PORTAL__.valor_hash) {
    dbRow = global.__MOCK_CONFIGURACION_PORTAL__;
  }

  return dbRow;
}

export async function validateDocentesPin(pin, url, serviceRoleKey) {
  if (!pin || typeof pin !== 'string') return { valid: false, version: undefined };

  const dbRow = await getStoredPin(url, serviceRoleKey);

  let isValid = false;
  let version = dbRow?.updated_at || 'v1';

  if (dbRow && dbRow.valor_hash) {
    isValid = verifyPin(pin, dbRow.valor_hash);
  } else {
    const fallbackPin = process.env.DOCENTES_PIN;
    if (fallbackPin) {
      const bufFallback = Buffer.from(fallbackPin);
      const bufPin = Buffer.from(pin);
      if (bufFallback.length === bufPin.length) {
        isValid = crypto.timingSafeEqual(bufFallback, bufPin);
      }
    }
  }

  return { valid: isValid, version: isValid ? version : undefined };
}
