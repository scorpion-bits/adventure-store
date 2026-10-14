import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros } from './helpers.mjs';

test.use({ viewport: VIEWPORTS.portrait });

async function irParaMelhorias(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(4));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'melhorias');
  await quadros(page, 4);
}
const preparar = (page) => page.evaluate(() => {
  const g = window.__loja.game;
  g.state.rep = 6000;      // reputação alta o bastante para as ofertas
  g.state.ouro = 800;
  g.emit('rep');
  window.__loja.anuncios.duracao(0.4);      // anúncio curto nos testes
});

test('oferta de melhoria: assistir ao anúncio da casa entrega a melhoria de graça, e a próxima só depois do intervalo', async ({ page }) => {
  const errors = await openGame(page);
  await preparar(page);
  await irParaMelhorias(page);
  const id = await page.evaluate(() => window.__loja.anuncios.oferta());
  expect(id).toBeTruthy();
  await page.waitForFunction(() => window.__loja.melhorias.nomes().includes('oferta-anuncio'));
  await page.screenshot({ path: shotPath('anuncio-oferta') });
  const ouro = await page.evaluate(() => window.__loja.state().ouro);
  const c = await page.evaluate(() => window.__loja.melhorias.centro('oferta-anuncio'));
  await page.mouse.click(c.x, c.y);
  await expect(page.getByTestId('anuncio')).toBeVisible();
  await expect(page.getByTestId('anuncio-pegar')).toBeDisabled();
  await page.screenshot({ path: shotPath('anuncio-janela') });
  await expect(page.getByTestId('anuncio-pegar')).toBeEnabled({ timeout: 5000 });
  await page.getByTestId('anuncio-pegar').click();
  await expect(page.getByTestId('anuncio')).toHaveCount(0);
  await page.waitForFunction((m) => window.__loja.state().melhorias[m] === true, id);
  expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(ouro);      // de graça
  await page.waitForFunction(() => !window.__loja.melhorias.nomes().includes('oferta-anuncio'));
  expect(await page.evaluate(() => window.__loja.anuncios.oferta())).toBeNull();
  expect(errors).toEqual([]);
});

test('desistir do anúncio não entrega nada; com "Sem anúncios" a oferta é resgatada direto', async ({ page }) => {
  const errors = await openGame(page);
  await preparar(page);
  await irParaMelhorias(page);
  await page.waitForFunction(() => window.__loja.melhorias.nomes().includes('oferta-anuncio'));
  const id = await page.evaluate(() => window.__loja.anuncios.oferta());
  let c = await page.evaluate(() => window.__loja.melhorias.centro('oferta-anuncio'));
  await page.mouse.click(c.x, c.y);
  await expect(page.getByTestId('anuncio')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('anuncio')).toHaveCount(0);
  expect(await page.evaluate((m) => window.__loja.state().melhorias[m] === true, id)).toBe(false);
  expect(await page.evaluate(() => window.__loja.anuncios.oferta())).toBe(id);

  // apoiador sem anúncios: a janela do anúncio nem abre
  await page.evaluate(async () => {
    const { assinarCodigo } = await import('/src/core/apoio.js');
    const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    window.__loja.apoio.usarChavePublica(await crypto.subtle.exportKey('jwk', k.publicKey));
    await window.__loja.apoio.resgatar(await assinarCodigo('sem_anuncios', 'e2e-sem-anuncios', await crypto.subtle.exportKey('jwk', k.privateKey)));
  });
  expect(await page.evaluate(() => document.documentElement.dataset.semAnuncios)).toBe('true');
  await quadros(page, 4);
  c = await page.evaluate(() => window.__loja.melhorias.centro('oferta-anuncio'));
  await page.mouse.click(c.x, c.y);
  await page.waitForFunction((m) => window.__loja.state().melhorias[m] === true, id);
  await expect(page.getByTestId('anuncio')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('o site pode trazer o próprio anúncio: window.scorpionbitsAds.recompensado() no lugar do anúncio da casa', async ({ page }) => {
  const errors = await openGame(page);
  await preparar(page);
  await page.evaluate(() => { window.__chamadas = 0; window.scorpionbitsAds = { recompensado: async () => { window.__chamadas += 1; return true; } }; });
  await irParaMelhorias(page);
  await page.waitForFunction(() => window.__loja.melhorias.nomes().includes('oferta-anuncio'));
  const id = await page.evaluate(() => window.__loja.anuncios.oferta());
  const c = await page.evaluate(() => window.__loja.melhorias.centro('oferta-anuncio'));
  await page.mouse.click(c.x, c.y);
  await page.waitForFunction((m) => window.__loja.state().melhorias[m] === true, id);
  expect(await page.evaluate(() => window.__chamadas)).toBe(1);
  await expect(page.getByTestId('anuncio')).toHaveCount(0);
  expect(errors).toEqual([]);
});
