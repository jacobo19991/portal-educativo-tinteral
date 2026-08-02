import crypto from 'crypto';

/**
 * Genera un hash scrypt salteado para un PIN.
 * Formato: "scrypt:salt:hash"
 */
export function hashPin(pin) {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN inválido para hash');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verifica un PIN string contra un hash almacenado con comparación constante en tiempo.
 */
export function verifyPin(pin, storedHash) {
  if (!pin || typeof pin !== 'string' || !storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }
  try {
    const parts = storedHash.split(':');
    let salt = '';
    let originalHash = '';
    let isScrypt = false;
    let iterations = 100000;

    if (parts[0] === 'scrypt' && parts.length === 3) {
      isScrypt = true;
      salt = parts[1];
      originalHash = parts[2];
    } else if (parts.length === 3) {
      iterations = parseInt(parts[0], 10) || 100000;
      salt = parts[1];
      originalHash = parts[2];
    } else if (parts.length === 2) {
      salt = parts[0];
      originalHash = parts[1];
      iterations = 10000;
    } else {
      return false;
    }

    if (!salt || !originalHash) return false;

    let hashBuffer;
    if (isScrypt) {
      const scryptBuf = crypto.scryptSync(pin, salt, 64);
      hashBuffer = Buffer.from(scryptBuf.toString('hex'), 'hex');
    } else {
      const hashHex = crypto.pbkdf2Sync(pin, salt, iterations, 64, 'sha512').toString('hex');
      hashBuffer = Buffer.from(hashHex, 'hex');
    }

    let originalBuffer = Buffer.from(originalHash, 'hex');

    if (hashBuffer.length !== originalBuffer.length) {
      return false;
    }
    if (crypto.timingSafeEqual(hashBuffer, originalBuffer)) {
      return true;
    }

    if (!isScrypt && parts.length === 2) {
      const hashHex2 = crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
      const hashBuffer2 = Buffer.from(hashHex2, 'hex');
      if (hashBuffer2.length === originalBuffer.length && crypto.timingSafeEqual(hashBuffer2, originalBuffer)) {
        return true;
      }
    }

    return false;
  } catch (err) {
    return false;
  }
}

