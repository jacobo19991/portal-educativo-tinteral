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

  // Nota: Probar la respuesta HTTP 400 por acción desconocida requiere un token de sesión
  // administrativa real en Supabase Auth con rol 'admin' asignado en la tabla perfiles.

  test('/api/validar-pin rechaza solicitudes inválidas', async ({ request }) => {
    const res = await request.post('/api/validar-pin', {
      data: { gradoId: 'g1' }
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(false);

    const resPinLargo = await request.post('/api/validar-pin', {
      data: { gradoId: 'g1', pin: '123456789012345678901' }
    });
    expect(resPinLargo.status()).toBe(200);
    const dataPinLargo = await resPinLargo.json();
    expect(dataPinLargo.valid).toBe(false);
  });

  test('/api/validar-pin: grado inexistente devuelve valid: false', async ({ request }) => {
    const res = await request.post('/api/validar-pin', {
      data: { gradoId: 'grado-inexistente-9999', pin: '1234' }
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  test('/api/validar-pin: respuesta sin PIN almacenado o PIN incorrecto devuelve valid: false y respuestas opacas', async ({ request }) => {
    const res = await request.post('/api/validar-pin', {
      data: { gradoId: 'grado-sin-pin', pin: '0000' }
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data).toHaveProperty('valid');
    expect(data).not.toHaveProperty('pin');
    expect(data).not.toHaveProperty('correctPin');
    expect(data.valid).not.toBe('0000');
    expect(Object.keys(data)).toEqual(['valid']);
  });

  test('/api/validar-pin-docente valida PIN docente en servidor de forma segura', async ({ request }) => {
    const resBad = await request.post('/api/validar-pin-docente', {
      data: { pin: '0000' }
    });
    expect(resBad.status()).toBe(200);
    const dataBad = await resBad.json();
    expect(dataBad.valid).toBe(false);
    expect(Object.keys(dataBad)).toEqual(['valid']);

    const resGood = await request.post('/api/validar-pin-docente', {
      data: { pin: '1234' }
    });
    expect(resGood.status()).toBe(200);
    const dataGood = await resGood.json();
    expect(dataGood.valid).toBe(true);
    expect(Object.keys(dataGood)).toEqual(['valid']);
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
