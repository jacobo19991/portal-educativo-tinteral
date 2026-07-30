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

  test('Ausencia de errores críticos no controlados en consola', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    expect(errors.length).toBe(0);
  });
});
