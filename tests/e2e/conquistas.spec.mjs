import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

async function irPara(page, aba, tela, sub) {
  const p = await page.evaluate((i) => window.__loja.tabCenter(i), aba);
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction((t) => window.__loja.tab() === t, tela);
  await page.waitForFunction((t) => window.__loja[t].pronta(), tela, { timeout: 10_000 });
  await quadros(page, 3);
  const s = await page.evaluate(([t, n]) => window.__loja[t].centro(n), [tela, `sub:${sub}`]);
  await page.mouse.click(s.x, s.y);
  await page.waitForFunction(([t, n]) => window.__loja[t].sub() === n, [tela, sub]);
  await page.waitForFunction((t) => window.__loja[t].pronta(), tela, { timeout: 10_000 });
  await quadros(page, 3);
}
const tocar = async (page, tela, nome) => {
  await ver(page, tela, nome);
  const p = await page.evaluate(([t, n]) => window.__loja[t].centro(n), [tela, nome]);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await quadros(page, 4);
};

test.describe('conquistas e coleção (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('uma conquista ganha aparece em Melhorias → Conquistas e dá o prêmio', async ({ page }) => {
    const errors = await openGame(page, { conquistas: true });
    const ouro = await page.evaluate(() => window.__loja.state().ouro);
    await page.evaluate(() => { window.__loja.state().stats.vendas = 12; window.__loja.conquistas.verificar(); });
    expect(await page.evaluate(() => window.__loja.conquistas.ganhas())).toBe(2);
    expect(await page.evaluate(() => window.__loja.state().ouro)).toBeGreaterThan(ouro);
    await irPara(page, 4, 'melhorias', 'conquistas');
    await page.screenshot({ path: shotPath('portrait-conquistas') });
    expect(errors).toEqual([]);
  });

  test('a coleção mostra o que foi descoberto e "?" no resto; tocar abre os detalhes', async ({ page }) => {
    const errors = await openGame(page, { conquistas: true });
    await irPara(page, 3, 'aventureiros', 'colecao');
    await page.screenshot({ path: shotPath('portrait-colecao') });
    await tocar(page, 'aventureiros', 'item:pao_aventureiro');
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
    await page.screenshot({ path: shotPath('portrait-colecao-item') });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__loja.modalOpen());
    await tocar(page, 'aventureiros', 'item:espada_ferro');
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
    await page.screenshot({ path: shotPath('portrait-colecao-item-oculto') });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__loja.modalOpen());
    await tocar(page, 'aventureiros', 'adv:aprendiz_guerreiro');
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
    await page.screenshot({ path: shotPath('portrait-colecao-adv') });
    expect(errors).toEqual([]);
  });

  test('ter o item passa a descobri-lo', async ({ page }) => {
    const errors = await openGame(page, { conquistas: true });
    expect(await page.evaluate(() => window.__loja.state().colecao.itens.espada_ferro)).toBeUndefined();
    await page.evaluate(() => window.__loja.giveItem('espada_ferro', 1, 1));
    expect(await page.evaluate(() => window.__loja.state().colecao.itens.espada_ferro)).toBe(0);
    expect(errors).toEqual([]);
  });
});

for (const vp of ['landscape', 'desktop']) {
  test.describe(`conquistas e coleção (${vp})`, () => {
    test.use({ viewport: VIEWPORTS[vp] });
    test('abrem sem erro', async ({ page }) => {
      const errors = await openGame(page, { conquistas: true });
      await irPara(page, 4, 'melhorias', 'conquistas');
      await page.screenshot({ path: shotPath(`${vp}-conquistas`) });
      await irPara(page, 3, 'aventureiros', 'colecao');
      await page.screenshot({ path: shotPath(`${vp}-colecao`) });
      expect(errors).toEqual([]);
    });
  });
}
