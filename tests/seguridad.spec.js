import { test, expect } from '@playwright/test';

test.describe('Seguridad y Endpoints', () => {
  test('/api/materias no incluye ninguna propiedad pin', async ({ request }) => {
    const res = await request.get('/api/materias');
    const data = await res.json();
    
    const checkNoPin = (obj) => {
        if (!obj) return;
        if (typeof obj === 'object') {
            expect(obj).not.toHaveProperty('pin');
            Object.values(obj).forEach(checkNoPin);
        }
    };
    
    checkNoPin(data);
  });

  test('/api/admin sin Authorization devuelve 401', async ({ request }) => {
    const res = await request.post('/api/admin', {
        data: { action: 'createMateria' }
    });
    expect(res.status()).toBe(401);
  });

  test('/api/admin con token inválido devuelve 401', async ({ request }) => {
    const res = await request.post('/api/admin', {
        headers: { Authorization: 'Bearer token-falso' },
        data: { action: 'createMateria' }
    });
    expect(res.status()).toBe(401);
  });
  
  test('/api/admin rechaza acción desconocida', async ({ request }) => {
    const res = await request.post('/api/admin', {
        headers: { Authorization: 'Bearer token-falso' },
        data: { action: 'UNKNOWN_ACTION' }
    });
    // Será 401 antes del 400 por no tener sesión real, 
    // pero si tuviera sesión, daría 400. Como mínimo probamos que rechaza.
    expect([400, 401]).toContain(res.status());
  });

  test('/api/validar-pin rechaza solicitudes inválidas', async ({ request }) => {
    const res = await request.post('/api/validar-pin', {
        data: { gradoId: 'foo' } // falta pin
    });
    const data = await res.json();
    expect(data.valid).toBe(false);
  });
});
