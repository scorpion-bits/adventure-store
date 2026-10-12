import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function abrir(page) {
  const erros = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(`console: ${m.text()}`); });
  await page.goto('/');
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
  return erros;
}

test('o manifesto e os ícones existem e descrevem um app que abre em tela cheia', async ({ page, request }) => {
  const erros = await abrir(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const m = await (await request.get(new URL(href, page.url()).href)).json();
  expect(m.display).toBe('standalone');
  expect(m.name).toBe('Loja do Aventureiro');
  expect(m.lang).toBe('pt-BR');
  const tamanhos = m.icons.map((i) => i.sizes);
  expect(tamanhos).toContain('192x192');
  expect(tamanhos).toContain('512x512');
  expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const icone of m.icons) {
    const r = await request.get(new URL(icone.src, page.url()).href);
    expect(r.status(), icone.src).toBe(200);
    expect(r.headers()['content-type']).toContain('image/png');
  }
  expect(await page.locator('link[rel="apple-touch-icon"]').count()).toBe(1);
  expect(erros).toEqual([]);
});

test('o service worker instala, guarda o jogo e ele abre sem internet', async ({ page, context }) => {
  const erros = await abrir(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // espera o cache terminar de guardar tudo
  await page.waitForFunction(async () => {
    const nomes = await caches.keys();
    if (!nomes.some((n) => n.startsWith('loja-'))) return false;
    const c = await caches.open(nomes.find((n) => n.startsWith('loja-')));
    return (await c.keys()).length >= 8;
  }, null, { timeout: 20_000 });
  // recarrega para o service worker controlar a página, e então corta a rede
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
  expect(await page.locator('canvas').count()).toBe(1);
  await context.setOffline(false);
  expect(erros.filter((e) => !/Failed to load resource|net::ERR/.test(e))).toEqual([]);
});

test('o progresso salvo continua depois de fechar e abrir de novo, também offline', async ({ page, context }) => {
  await abrir(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
  await page.evaluate(() => localStorage.setItem('scorpion-bits-loja-teste', 'ok'));
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
  expect(await page.evaluate(() => localStorage.getItem('scorpion-bits-loja-teste'))).toBe('ok');
  await context.setOffline(false);
});
