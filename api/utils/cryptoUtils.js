import crypto from 'crypto';

/**
 * Generates a salted PBKDF2 hash for a PIN string.
 * Format: "salt:hash"
 */
export function hashPin(pin) {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN inválido para hash');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a PIN string against a stored "salt:hash" string.
 */
export function verifyPin(pin, storedHash) {
  if (!pin || typeof pin !== 'string' || !storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    
    const hash = crypto.pbkdf2Sync(pin, salt, 10000, 64, 'sha512').toString('hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    const originalBuffer = Buffer.from(originalHash, 'hex');
    
    if (hashBuffer.length !== originalBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, originalBuffer);
  } catch (err) {
    return false;
  }
}
