import { test, expect } from '@playwright/test';

test.describe('Seguridad y Validación', () => {
  test('La respuesta de /api/materias no debe incluir PIN en el JSON', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/materias');
    
    if (response.status() === 200) {
      const data = await response.json();
      const niveles = data.niveles || [];
      
      // Validar profundamente que ningún grado contenga 'pin'
      let pinFound = false;
      for (const nivel of niveles) {
        for (const grado of (nivel.grados || [])) {
          if (grado.pin !== undefined) {
            pinFound = true;
          }
        }
      }
      
      expect(pinFound).toBeFalsy();
    }
  });

  test('/api/admin debe denegar acceso sin header Authorization', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/admin', {
      data: {
        action: 'ADD_MATERIA',
        payload: { nombre: 'Test' }
      }
    });
    
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Sesión inválida o expirada.');
  });
  
  test('/api/validar-pin debe rechazar requests sin payload correcto', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/validar-pin', {
      data: {
        gradoId: "123",
        pin: "pin_excesivamente_largo_que_supera_el_limite_de_20_caracteres"
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
  });
});
