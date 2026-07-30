import { test, expect } from '@playwright/test';

test.describe('Pruebas de Seguridad y Endpoints', () => {
  test('/api/materias no incluye ninguna propiedad pin, ni siquiera de forma anidada', async ({ request }) => {
    const res = await request.get('/api/materias');
    const data = await res.json();
    
    const checkNoPin = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      expect(obj).not.toHaveProperty('pin');
      Object.values(obj).forEach(checkNoPin);
    };
    
    checkNoPin(data);
  });

  test('1. /api/admin sin Authorization devuelve 401', async ({ request }) => {
    const res = await request.post('/api/admin', {
      data: { action: 'createMateria', payload: { nombre: 'Test', grado_id: 1 } }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Sesión inválida o expirada.');
  });

  test('2. /api/admin con token inválido y acción válida devuelve 401', async ({ request }) => {
    const res = await request.post('/api/admin', {
      headers: { Authorization: 'Bearer token-falso-123' },
      data: { action: 'createMateria', payload: { nombre: 'Test', grado_id: 1 } }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Sesión inválida o expirada.');
  });

  test('3. /api/admin con token inválido y acción desconocida devuelve 401', async ({ request }) => {
    const res = await request.post('/api/admin', {
      headers: { Authorization: 'Bearer token-falso' },
      data: { action: 'ACCION_DESCONOCIDA', payload: {} }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Sesión inválida o expirada.');
  });

  test('/api/validar-pin-docente valida PIN docente en servidor de forma segura', async ({ request }) => {
    const resBad = await request.post('/api/validar-pin-docente', {
      data: { pin: 'pin-totalmente-incorrecto' }
    });
    expect(resBad.status()).toBe(200);
    const dataBad = await resBad.json();
    expect(dataBad.valid).toBe(false);
    expect(Object.keys(dataBad)).toEqual(['valid']);
  });

  test('1. /api/cambiar-pin-docente sin Authorization devuelve 401', async ({ request }) => {
    const res = await request.post('/api/cambiar-pin-docente', {
      data: { pinActual: 'a', pinNuevo: 'b', confirmacionPin: 'b' }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Sesión inválida o expirada.');
  });

  test('2. /api/cambiar-pin-docente con token inválido devuelve 401', async ({ request }) => {
    const res = await request.post('/api/cambiar-pin-docente', {
      headers: { Authorization: 'Bearer token-falso-admin' },
      data: { pinActual: 'a', pinNuevo: 'b', confirmacionPin: 'b' }
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Sesión inválida o expirada.');
  });

  test('3. /api/cambiar-pin-docente respuesta opaca sin exponer PINs ni hashes', async ({ request }) => {
    const res = await request.post('/api/cambiar-pin-docente', {
      headers: { Authorization: 'Bearer token-falso' },
      data: { pinActual: 'p1', pinNuevo: 'p2', confirmacionPin: 'p3' }
    });
    const text = await res.text();
    expect(text).not.toContain('pinActual');
    expect(text).not.toContain('pinNuevo');
    expect(text).not.toContain('confirmacionPin');
    expect(text).not.toContain('valor_hash');
  });

  test('Los endpoints administrativos y de PIN no usan CORS abierto (*)', async ({ request }) => {
    const resAdmin = await request.fetch('/api/admin', {
      method: 'OPTIONS',
      headers: { Origin: 'http://sitio-malicioso.com' }
    });
    const corsAdmin = resAdmin.headers()['access-control-allow-origin'];
    expect(corsAdmin).not.toBe('*');
    expect(corsAdmin).not.toBe('http://sitio-malicioso.com');

    const resPin = await request.fetch('/api/validar-pin-docente', {
      method: 'OPTIONS',
      headers: { Origin: 'http://sitio-malicioso.com' }
    });
    const corsPin = resPin.headers()['access-control-allow-origin'];
    expect(corsPin).not.toBe('*');
    expect(corsPin).not.toBe('http://sitio-malicioso.com');

    const resCambiarPin = await request.fetch('/api/cambiar-pin-docente', {
      method: 'OPTIONS',
      headers: { Origin: 'http://sitio-malicioso.com' }
    });
    const corsCambiarPin = resCambiarPin.headers()['access-control-allow-origin'];
    expect(corsCambiarPin).not.toBe('*');
    expect(corsCambiarPin).not.toBe('http://sitio-malicioso.com');
  });

  test('Los errores no exponen detalles internos técnicos', async ({ request }) => {
    const res = await request.post('/api/admin', {
      headers: { Authorization: 'Bearer token-invalid' },
      data: { action: 'createMateria', payload: { nombre: 'Test', grado_id: 1 } }
    });
    const text = await res.text();
    expect(text).not.toContain('stack');
    expect(text).not.toContain('PostgREST');
    expect(text).not.toContain('TypeError');
    expect(text).not.toContain('SUPABASE_');
  });
});
