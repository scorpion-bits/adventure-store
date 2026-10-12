import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.mercado.pronta(), null, { timeout: 10_000 });

async function abrirMapa(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(2));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'mercado');
  await pronta(page);
  await quadros(page);
  const s = await page.evaluate(() => window.__loja.mercado.centro('sub:mapa'));
  await page.mouse.click(s.x, s.y);
  await page.waitForFunction(() => window.__loja.mercado.sub() === 'mapa');
  await pronta(page);
}
const centro = (page, nome) => page.evaluate((n) => window.__loja.mercado.centro(n), nome);
const clicar = async (page, nome) => {
  await ver(page, 'mercado', nome);
  const p = await centro(page, nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await pronta(page);
  await quadros(page);
};

test.describe('mapa (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('mandar uma expedição, esperar e coletar os materiais', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMapa(page);
    await page.screenshot({ path: shotPath('portrait-mapa') });
    const antes = await page.evaluate(() => window.__loja.state().ouro);
    await clicar(page, 'exp:vila:curta');
    let s = await page.evaluate(() => window.__loja.state());
    expect(s.expedicoes).toHaveLength(1);
    expect(s.ouro).toBeLessThan(antes);
    // só uma vaga: o botão de outra região não faz nada
    expect(await centro(page, 'exp:vila:media')).toBeNull();
    await page.screenshot({ path: shotPath('portrait-mapa-andando') });

    await page.evaluate(() => window.__loja.skip(6 * 60000));
    await pronta(page);
    await quadros(page);
    await clicar(page, `coletarExp:${s.expedicoes[0].uid}`);
    s = await page.evaluate(() => window.__loja.state());
    expect(s.expedicoes).toHaveLength(0);
    expect(Object.values(s.materiais).reduce((a, b) => a + b, 0)).toBe(6);
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
    await page.screenshot({ path: shotPath('portrait-mapa-resultado') });
    expect(errors).toEqual([]);
  });

  test('região fechada não tem botões; abre com a reputação', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMapa(page);
    expect(await centro(page, 'exp:floresta:curta')).toBeNull();
    await page.evaluate(() => window.__loja.addRep(1e6));
    await pronta(page);
    await ver(page, 'mercado', 'exp:floresta:curta');
    expect(await centro(page, 'exp:floresta:curta')).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('sem ouro suficiente a expedição não parte', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.state().ouro = 3; });
    await abrirMapa(page);
    await clicar(page, 'exp:vila:curta');
    expect((await page.evaluate(() => window.__loja.state())).expedicoes).toHaveLength(0);
    expect(errors).toEqual([]);
  });

  test('a expedição continua com o jogo fechado', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMapa(page);
    await clicar(page, 'exp:vila:media');
    await page.evaluate(() => window.__loja.save());
    const chave = 'scorpion-bits-loja-v1';
    const antigo = await page.evaluate((k) => {
      const raw = JSON.parse(localStorage.getItem(k));
      for (const e of raw.expedicoes) { e.inicio -= 3600e3; e.fim -= 3600e3; }
      raw.salvoEm -= 3600e3;
      return JSON.stringify(raw);
    }, chave);
    await page.addInitScript(({ k, v }) => { if (!sessionStorage.getItem('semeado')) { sessionStorage.setItem('semeado', '1'); localStorage.setItem(k, v); } }, { k: chave, v: antigo });
    await page.reload();
    await page.waitForFunction(() => window.__loja?.ready);
    const exp = await page.evaluate(() => window.__loja.state().expedicoes);
    expect(exp).toHaveLength(1);
    expect(exp[0].fim).toBeLessThan(Date.now());
    expect(errors).toEqual([]);
  });
});

for (const vp of ['landscape', 'desktop']) {
  test.describe(`mapa (${vp})`, () => {
    test.use({ viewport: VIEWPORTS[vp] });
    test('abre e manda uma expedição', async ({ page }) => {
      const errors = await openGame(page);
      await abrirMapa(page);
      await page.screenshot({ path: shotPath(`${vp}-mapa`) });
      await clicar(page, 'exp:vila:curta');
      expect((await page.evaluate(() => window.__loja.state())).expedicoes).toHaveLength(1);
      expect(errors).toEqual([]);
    });
  });
}
