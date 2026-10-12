import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

async function irParaExpandir(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(4));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'melhorias');
  await page.waitForFunction(() => window.__loja.melhorias.pronta(), null, { timeout: 10_000 });
  await quadros(page, 3);
  const s = await page.evaluate(() => window.__loja.melhorias.centro('sub:expandir'));
  await page.mouse.click(s.x, s.y);
  await page.waitForFunction(() => window.__loja.melhorias.sub() === 'expandir');
  await page.waitForFunction(() => window.__loja.melhorias.pronta(), null, { timeout: 10_000 });
  await quadros(page, 3);
}
const tocar = async (page, nome) => {
  await ver(page, 'melhorias', nome);
  const p = await page.evaluate((n) => window.__loja.melhorias.centro(n), nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await quadros(page, 4);
};

test.describe('prestígio (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('sem reputação, expandir avisa e não abre nada', async ({ page }) => {
    const errors = await openGame(page);
    await irParaExpandir(page);
    await page.screenshot({ path: shotPath('portrait-expandir-bloqueado') });
    await tocar(page, 'expandir');
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(false);
    expect(await page.evaluate(() => window.__loja.state().prestigio.cidade)).toBe(1);
    expect(errors).toEqual([]);
  });

  test('expandir: confirma, reinicia a loja, dá Herança e ela compra um bônus', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      const L = window.__loja;
      L.addRep(1e6);
      L.state().stats.ouroTotal = 48000;
      L.state().ouro = 9999;
      L.state().melhorias.loja_ampliar_1 = true;
    });
    await irParaExpandir(page);
    await page.screenshot({ path: shotPath('portrait-expandir') });
    await tocar(page, 'expandir');
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
    await page.screenshot({ path: shotPath('portrait-expandir-confirmar') });
    await tocar(page, 'confirmar');
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.prestigio.cidade).toBe(2);
    expect(s.prestigio.heranca).toBe(2);
    expect(s.ouro).toBe(100);
    expect(s.melhorias).toEqual({});
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(false);
    await page.waitForFunction(() => window.__loja.melhorias.pronta(), null, { timeout: 10_000 });
    await quadros(page, 3);
    await page.screenshot({ path: shotPath('portrait-expandir-depois') });
    await tocar(page, 'heranca:fama');
    expect(await page.evaluate(() => window.__loja.state().prestigio.bonus.fama)).toBe(1);
    expect(await page.evaluate(() => window.__loja.state().prestigio.heranca)).toBe(1);
    expect(await page.evaluate(() => window.__loja.game.mods.repGanho)).toBeCloseTo(1.05, 5);
    expect(errors).toEqual([]);
  });

  test('"Agora não" fecha sem expandir', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.addRep(1e6); window.__loja.state().stats.ouroTotal = 48000; });
    await irParaExpandir(page);
    await tocar(page, 'expandir');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__loja.modalOpen());
    expect(await page.evaluate(() => window.__loja.state().prestigio.cidade)).toBe(1);
    expect(errors).toEqual([]);
  });
});

for (const vp of ['landscape', 'desktop']) {
  test.describe(`prestígio (${vp})`, () => {
    test.use({ viewport: VIEWPORTS[vp] });
    test('a aba Expandir abre e mostra a herança', async ({ page }) => {
      const errors = await openGame(page);
      await irParaExpandir(page);
      await page.screenshot({ path: shotPath(`${vp}-expandir`) });
      expect(errors).toEqual([]);
    });
  });
}
