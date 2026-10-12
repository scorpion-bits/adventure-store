import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

const prontaLoja = (page) => page.waitForFunction(() => window.__loja.loja.pronta(), null, { timeout: 10_000 });
const prontaAv = (page) => page.waitForFunction(() => window.__loja.aventureiros.pronta(), null, { timeout: 10_000 });

async function irParaAventureiros(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(3));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'aventureiros');
  await prontaAv(page);
  await quadros(page, 3);
  const s = await page.evaluate(() => window.__loja.aventureiros.centro('sub:lendarios'));
  await page.mouse.click(s.x, s.y);
  await page.waitForFunction(() => window.__loja.aventureiros.sub() === 'lendarios');
  await prontaAv(page);
}

test.describe('lendários (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('a lenda chega, o capítulo conclui com a venda e a janela mostra a história', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      const L = window.__loja;
      L.addRep(1e6);
      L.game.rng.chance = () => true;
      L.giveItem('escudo_madeira', 1, 1);
      L.chamarLenda('ser_aldric');
      L.loja.renderAgora();
    });
    await prontaLoja(page);
    await quadros(page, 3);
    expect(await page.evaluate(() => window.__loja.state().fila[0].lenda.id)).toBe('ser_aldric');
    await page.screenshot({ path: shotPath('portrait-lenda-chegou') });

    const p = await page.evaluate(() => window.__loja.loja.precoCentro('justo'));
    await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => window.__loja.lendas.mostrando() && window.__loja.modalOpen());
    await quadros(page, 3);
    expect(await page.evaluate(() => window.__loja.state().lendarios.ser_aldric.cap)).toBe(1);
    await page.screenshot({ path: shotPath('portrait-lenda-capitulo') });
    const ok = await page.evaluate(() => window.__loja.lendas.continuarCentro());
    await page.mouse.click(ok.x, ok.y);
    await quadros(page, 3);
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(false);
    expect(errors).toEqual([]);
  });

  test('a aba Aventureiros mostra as lendas, o próximo pedido e permite reler capítulos', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      window.__loja.addRep(1e6);
      window.__loja.state().lendarios.ser_aldric = { cap: 1, visita: 0 };
      window.__loja.state().lendarios.kael = { cap: 3, visita: 0 };
    });
    await irParaAventureiros(page);
    await quadros(page, 3);
    await page.screenshot({ path: shotPath('portrait-lendarios') });
    await ver(page, 'aventureiros', 'ler:ser_aldric:0');
    const p = await page.evaluate(() => window.__loja.aventureiros.centro('ler:ser_aldric:0'));
    expect(p).toBeTruthy();
    await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => window.__loja.modalOpen());
    await quadros(page, 3);
    await page.screenshot({ path: shotPath('portrait-lenda-reler') });
    expect(errors).toEqual([]);
  });

  test('lenda de nível alto aparece como "???" com a reputação necessária', async ({ page }) => {
    const errors = await openGame(page);
    await irParaAventureiros(page);
    await quadros(page, 3);
    await page.screenshot({ path: shotPath('portrait-lendarios-bloqueados') });
    expect(errors).toEqual([]);
  });

  test('outras sub-abas avisam o que vem', async ({ page }) => {
    const errors = await openGame(page);
    await irParaAventureiros(page);
    const s = await page.evaluate(() => window.__loja.aventureiros.centro('sub:colecao'));
    await page.mouse.click(s.x, s.y);
    await page.waitForFunction(() => window.__loja.aventureiros.sub() === 'colecao');
    expect(errors).toEqual([]);
  });
});

for (const vp of ['landscape', 'desktop']) {
  test.describe(`lendários (${vp})`, () => {
    test.use({ viewport: VIEWPORTS[vp] });
    test('abre a lista de lendas', async ({ page }) => {
      const errors = await openGame(page);
      await page.evaluate(() => window.__loja.addRep(1e6));
      await irParaAventureiros(page);
      await quadros(page, 3);
      await page.screenshot({ path: shotPath(`${vp}-lendarios`) });
      expect(errors).toEqual([]);
    });
  });
}
