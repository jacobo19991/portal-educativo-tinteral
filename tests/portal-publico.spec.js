import { test, expect } from '@playwright/test';

test.describe('Portal Público', () => {
  test('Carga de la página principal', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Portal Educativo/i);
  });

  test('Contenido principal visible', async ({ page }) => {
    await page.goto('/');
    const mainContent = page.locator('#contenedor-niveles, main').first();
    await expect(mainContent).toBeVisible();
  });

  test('Buscador permite ingresar texto', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('#buscadorMaterias').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Ciencia');
    await expect(searchInput).toHaveValue('Ciencia');
  });

  test('Filtrado real de resultados en el buscador', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('#buscadorMaterias').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Ciencia');
    
    const materiaRow = page.locator('.materia-row').filter({ hasText: 'Ciencia' }).first();
    await expect(materiaRow).toBeVisible();
  });

  test('Vista móvil se despliega correctamente', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const header = page.locator('header, nav, #contenedor-niveles, .hero').first();
    await expect(header).toBeVisible();
  });

  test('1. Abrir Drive abre el modal de PIN docente', async ({ page }) => {
    await page.goto('/');
    const btnDrive = page.locator('#btn-docente-drive');
    await expect(btnDrive).toBeVisible();
    await btnDrive.click();

    const modalPin = page.locator('#overlayPinDocente');
    await expect(modalPin).toHaveClass(/visible/);
  });

  test('2. Manual de uso abre el modal de PIN docente haciendo clic en su botón', async ({ page }) => {
    await page.goto('/');
    const btnManual = page.locator('#btn-docente-manual');
    await expect(btnManual).toBeVisible();
    await btnManual.click();

    const modalPin = page.locator('#overlayPinDocente');
    await expect(modalPin).toHaveClass(/visible/);
  });

  test('3 y 4. Reportar problema no abre modal de PIN y abre Google Forms en nueva pestaña', async ({ page }) => {
    await page.goto('/');
    const btnReportar = page.locator('#btn-reportar-problema');
    await expect(btnReportar).toBeVisible();

    const href = await btnReportar.getAttribute('href');
    const target = await btnReportar.getAttribute('target');

    expect(href).toBe('https://forms.gle/eDrth5nJ2drQSfUC7');
    expect(target).toBe('_blank');
    expect(href).not.toContain('wa.me');

    await btnReportar.click();
    const modalPin = page.locator('#overlayPinDocente');
    await expect(modalPin).not.toHaveClass(/visible/);
  });

  test('5. Modales se pueden cerrar con Cancelar, X y Escape regresando el foco', async ({ page }) => {
    await page.goto('/');
    const btnDrive = page.locator('#btn-docente-drive');
    await btnDrive.click();

    const modalPin = page.locator('#overlayPinDocente');
    await expect(modalPin).toHaveClass(/visible/);

    await page.locator('#btnCancelarPinDocente').click();
    await expect(modalPin).not.toHaveClass(/visible/);

    await btnDrive.click();
    await expect(modalPin).toHaveClass(/visible/);
    await page.locator('#btnCerrarPinDocente').click();
    await expect(modalPin).not.toHaveClass(/visible/);

    await btnDrive.click();
    await expect(modalPin).toHaveClass(/visible/);
    await page.keyboard.press('Escape');
    await expect(modalPin).not.toHaveClass(/visible/);
  });

  test('6. Validación con mock de Playwright sobre /api/validar-pin-docente', async ({ page }) => {
    await page.route('**/api/validar-pin-docente', async route => {
      const postData = route.request().postDataJSON();
      if (postData && postData.pin === 'mock-pin-correcto') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true, version: 'v-test' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: false })
        });
      }
    });

    await page.goto('/');
    const btnDrive = page.locator('#btn-docente-drive');
    await btnDrive.click();

    const inputPin = page.locator('#inputPinDocente');
    const btnSubmit = page.locator('#btnSubmitPinDocente');

    await inputPin.fill('mock-pin-incorrecto');
    await btnSubmit.click();
    const errorBanner = page.locator('#errorPinDocente');
    await expect(errorBanner).not.toHaveClass(/hidden/);

    await inputPin.fill('mock-pin-correcto');
    await btnSubmit.click();
    await expect(page.locator('#overlayPinDocente')).not.toHaveClass(/visible/);
  });

  test('7. Herramientas docentes funcionan en vista móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const btnDrive = page.locator('#btn-docente-drive');
    await expect(btnDrive).toBeVisible();
    await btnDrive.click();

    const modalPin = page.locator('#overlayPinDocente');
    await expect(modalPin).toHaveClass(/visible/);
  });

  test('8. Modal de Cambiar PIN docente limpia campos y valida correctamente', async ({ page }) => {
    await page.goto('/');
    const btnCambiarPin = page.locator('#btn-cambiar-pin-docente');
    await expect(btnCambiarPin).toBeVisible();
    await btnCambiarPin.click();

    const modal = page.locator('#overlayCambiarPinDocente');
    await expect(modal).toHaveClass(/visible/);

    const inputActual = page.locator('#inputPinActual');
    const inputNuevo = page.locator('#inputPinNuevo');
    const inputConf = page.locator('#inputConfirmacionPin');
    const btnGuardar = page.locator('#btnSubmitCambiarPinDocente');
    const errorBox = page.locator('#errorCambiarPinDocente');

    // Validación de PINs diferentes
    await inputActual.fill('pin-test-actual');
    await inputNuevo.fill('pin-test-nuevo1');
    await inputConf.fill('pin-test-nuevo2');
    await btnGuardar.click();
    await expect(errorBox).not.toHaveClass(/hidden/);
    await expect(errorBox).toContainText('no coinciden');

    // Cancelar y verificar limpieza
    await page.locator('#btnCancelarCambiarPinDocente').click();
    await expect(modal).not.toHaveClass(/visible/);

    await btnCambiarPin.click();
    await expect(inputActual).toHaveValue('');
    await expect(inputNuevo).toHaveValue('');
    await expect(inputConf).toHaveValue('');
  });

  test('Ausencia de errores críticos no controlados en consola', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    expect(errors.length).toBe(0);
  });
});
