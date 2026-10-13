import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros } from './helpers.mjs';

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
  await page.waitForFunction(() => window.__loja.mercado.mundo.pronto(), null, { timeout: 10_000 });
  await quadros(page, 3);
}
const centro = (page, nome) => page.evaluate((n) => window.__loja.mercado.centro(n), nome);
// põe a região no meio da tela e toca nela: abre a janela da região
async function tocarRegiao(page, id) {
  await page.evaluate((r) => window.__loja.mercado.mundo.centralizarEm(r), id);
  await quadros(page, 3);
  const p = await page.evaluate((r) => window.__loja.mercado.mundo.centroDe(r), id);
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.modalOpen());
  await quadros(page, 4);
}
const clicar = async (page, nome) => {
  const p = await centro(page, nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await quadros(page, 3);
};
const fechar = async (page) => { await page.evaluate(() => window.__loja.closeModal()); await page.waitForFunction(() => !window.__loja.modalOpen()); await quadros(page, 2); };

test.describe('mapa (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('mandar uma expedição, ver os batedores andando, esperar e coletar os materiais', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMapa(page);
    await page.screenshot({ path: shotPath('portrait-mapa') });
    await tocarRegiao(page, 'vila');
    await page.screenshot({ path: shotPath('portrait-mapa-regiao') });
    const antes = await page.evaluate(() => window.__loja.state().ouro);
    await clicar(page, 'exp:vila:curta');
    await page.waitForFunction(() => !window.__loja.modalOpen());      // a janela fecha ao partir
    let s = await page.evaluate(() => window.__loja.state());
    expect(s.expedicoes).toHaveLength(1);
    expect(s.ouro).toBeLessThan(antes);
    await page.waitForFunction(() => window.__loja.mercado.mundo.batedores() === 1);
    await page.screenshot({ path: shotPath('portrait-mapa-andando') });
    // só uma vaga e a região já tem batedores: a janela dela não oferece outra expedição
    await tocarRegiao(page, 'vila');
    expect(await centro(page, 'exp:vila:media')).toBeNull();
    await fechar(page);

    await page.evaluate(() => window.__loja.skip(6 * 60000));
    await page.waitForFunction(() => window.__loja.mercado.mundo.aviso('vila'));      // "!" sobre a região: voltaram
    await page.screenshot({ path: shotPath('portrait-mapa-voltaram') });
    await tocarRegiao(page, 'vila');
    await clicar(page, `coletarExp:${s.expedicoes[0].uid}`);
    s = await page.evaluate(() => window.__loja.state());
    expect(s.expedicoes).toHaveLength(0);
    expect(Object.values(s.materiais).reduce((a, b) => a + b, 0)).toBe(6);
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
    await page.screenshot({ path: shotPath('portrait-mapa-resultado') });
    await fechar(page);
    await page.waitForFunction(() => window.__loja.mercado.mundo.batedores() === 0);
    expect(errors).toEqual([]);
  });

  test('região fechada fica sob névoa, sem botões; abre com a reputação', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMapa(page);
    await tocarRegiao(page, 'floresta');
    await page.screenshot({ path: shotPath('portrait-mapa-fechada') });
    expect(await centro(page, 'exp:floresta:curta')).toBeNull();
    await fechar(page);
    await page.evaluate(() => window.__loja.addRep(1e6));
    await page.waitForFunction(() => window.__loja.mercado.pronta());
    await quadros(page, 3);
    await tocarRegiao(page, 'floresta');
    expect(await centro(page, 'exp:floresta:curta')).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('arrastar o mapa move a câmera, dentro dos limites, e arrastar não abre região', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMapa(page);
    const antes = await page.evaluate(() => window.__loja.mercado.mundo.camera());
    expect(antes.mundoW).toBeGreaterThan(antes.w);
    expect(antes.mundoH).toBeGreaterThan(antes.h);
    const c = await page.evaluate((r) => window.__loja.mercado.mundo.centroDe(r), 'vila');
    // arrasta de cima para baixo e da direita para a esquerda, passando pela vila
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x - 60, c.y + 120, { steps: 6 });
    await page.mouse.up();
    await quadros(page, 4);
    const depois = await page.evaluate(() => window.__loja.mercado.mundo.camera());
    expect(depois.x).toBeGreaterThan(antes.x);       // o mapa andou para a esquerda: a câmera foi para a direita
    expect(depois.y).toBeLessThan(antes.y);          // e para baixo: a câmera subiu
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(false);
    // arrasta muito além: a câmera para na borda
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(200, 700, { steps: 4 });
      await page.mouse.up();
    }
    await quadros(page, 12);
    const topo = await page.evaluate(() => window.__loja.mercado.mundo.camera());
    expect(topo.y).toBeGreaterThanOrEqual(0);
    expect(topo.y).toBeLessThanOrEqual(topo.mundoH - topo.h);
    expect(errors).toEqual([]);
  });

  test('sem ouro suficiente a expedição não parte', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.state().ouro = 3; });
    await abrirMapa(page);
    await tocarRegiao(page, 'vila');
    await clicar(page, 'exp:vila:curta');
    expect((await page.evaluate(() => window.__loja.state())).expedicoes).toHaveLength(0);
    expect(errors).toEqual([]);
  });

  test('a expedição continua com o jogo fechado', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMapa(page);
    await tocarRegiao(page, 'vila');
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
      await tocarRegiao(page, 'vila');
      await clicar(page, 'exp:vila:curta');
      expect((await page.evaluate(() => window.__loja.state())).expedicoes).toHaveLength(1);
      expect(errors).toEqual([]);
    });
  });
}
