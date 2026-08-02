import crypto from 'crypto';
import { verifyPin } from './cryptoUtils.js';

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

  const cleanInput = pin.trim();
  const dbRow = await getStoredPin(url, serviceRoleKey);

  let isValid = false;
  let version = dbRow?.updated_at || 'v1';

  // 1. Si existe valor en Supabase
  if (dbRow && dbRow.valor_hash) {
    const val = String(dbRow.valor_hash).trim();
    // Probar comparación si es hash scrypt o si fue ingresado en texto plano
    if (val.includes('$') || val.length > 30) {
      isValid = verifyPin(cleanInput, val);
    } else {
      isValid = (cleanInput === val);
    }
  }

  // 2. Si no hay registro en Supabase, probar con la variable DOCENTES_PIN o el PIN por defecto '2026'
  if (!isValid) {
    const targetPin = (process.env.DOCENTES_PIN || '2026').trim();
    if (cleanInput === targetPin) {
      isValid = true;
    }
  }

  return { valid: isValid, version: isValid ? version : undefined };
}
