const rateLimitMap = new Map();

export function rateLimit(ip, limit = 5, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return { success: true };
  }

  const record = rateLimitMap.get(ip);
  if (now - record.firstRequest > windowMs) {
    record.count = 1;
    record.firstRequest = now;
    return { success: true };
  }

  record.count++;
  if (record.count > limit) {
    return { success: false, retryAfter: Math.ceil((windowMs - (now - record.firstRequest)) / 1000) };
  }

  return { success: true };
}

// Limpiar el mapa cada cierto tiempo para evitar memory leaks en el lambda, 
// aunque en serverless el estado se pierde entre ejecuciones frías, ayuda en ejecuciones cálidas.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.firstRequest > 60000) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);
