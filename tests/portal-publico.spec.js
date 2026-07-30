import { test, expect } from '@playwright/test';

test.describe('Portal Público', () => {
  test('La página principal carga', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Portal Educativo/i);
  });

  test('Existe el contenido principal', async ({ page }) => {
    await page.goto('/');
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('El buscador permite escribir', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('matemáticas');
    await expect(searchInput).toHaveValue('matemáticas');
  });

  test('No existen errores críticos en consola', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    expect(errors.length).toBe(0);
  });
});
