import { test, expect } from '@playwright/test';

const URL_PORTAL = 'http://127.0.0.1:5500/';

test('1. carga inicial correcta', async ({ page }) => {

  await page.goto(URL_PORTAL);

  await expect(page.locator('body')).toBeVisible();

});

test('2. existen enlaces en el portal', async ({ page }) => {

  await page.goto(URL_PORTAL);

  const links = await page.locator('a').evaluateAll(links =>
    links.map(link => ({
      texto: link.innerText,
      href: link.href
    }))
  );

  console.log('LINKS DEL PORTAL:');
  console.log(links);

  expect(links.length).toBeGreaterThan(0);

});

test('3. existe enlace de Google Drive', async ({ page }) => {

  await page.goto(URL_PORTAL);

  const driveLink = page.locator('a[href*="drive.google.com"]');

  await expect(driveLink.first()).toBeVisible();

});

test('4. el buscador existe', async ({ page }) => {

  await page.goto(URL_PORTAL);

  await expect(page.locator('#buscadorMaterias')).toBeVisible();

});

test('5. el buscador permite escribir', async ({ page }) => {

  await page.goto(URL_PORTAL);

  const buscador = page.locator('#buscadorMaterias');

  await buscador.fill('matematica');

  await expect(buscador).toHaveValue('matematica');

});

test('6. no hay errores graves de JavaScript', async ({ page }) => {

  const errores = [];

  page.on('pageerror', error => {
    errores.push(error.message);
  });

  await page.goto(URL_PORTAL);

  console.log('ERRORES JS:', errores);

  expect(errores).toEqual([]);

});

test('7. vista móvil correcta', async ({ page }) => {

  await page.setViewportSize({
    width: 390,
    height: 844
  });

  await page.goto(URL_PORTAL);

  await expect(page.locator('body')).toBeVisible();

});

test('8. imágenes cargan correctamente', async ({ page }) => {

  await page.goto(URL_PORTAL);

  const imagenesRotas = await page.locator('img').evaluateAll(imgs =>
    imgs
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.src)
  );

  console.log('IMAGENES ROTAS:', imagenesRotas);

  expect(imagenesRotas).toEqual([]);

});

test('9. links válidos del portal', async ({ page }) => {

  await page.goto(URL_PORTAL);

  const links = await page.locator('a').evaluateAll(links =>
    links.map(link => link.href)
  );

  console.log('LINKS:', links);

  expect(links.length).toBeGreaterThan(0);

});

test('10. captura del portal completo', async ({ page }) => {

  await page.goto(URL_PORTAL);

  await page.screenshot({
    path: 'test-results/portal-completo.png',
    fullPage: true
  });

  await expect(page.locator('body')).toBeVisible();

});