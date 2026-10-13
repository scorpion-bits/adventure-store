import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.loja.pronta(), null, { timeout: 15_000 });
const vida = (page) => page.evaluate(() => window.__loja.loja.vida());
const parado = (page) => page.waitForFunction(() => { const v = window.__loja.loja.vida(); return !v.andando && !v.saindo && !v.bolhas && !v.moedas; }, null, { timeout: 15_000 });

for (const [nome, vp] of Object.entries(VIEWPORTS)) {
  test.describe(nome, () => {
    test.use({ viewport: vp });

    test('quem chega entra andando; ao vender, o cliente sai com um balão e moedinhas voam para o ouro', async ({ page }) => {
      const errors = await openGame(page);
      await page.evaluate(() => { const L = window.__loja; L.clearQueue(); L.addClient('aprendiz_guerreiro', { tipo: 'surpresa' }); L.addClient('arqueira_novata', { tipo: 'surpresa' }); L.loja.renderAgora(); });
      expect((await vida(page)).andando, 'entram andando pela direita').toBe(2);
      await page.waitForTimeout(250);
      await page.screenshot({ path: shotPath(`vida-entrando-${nome}`) });
      await pronta(page);
      expect((await vida(page)).andando).toBe(0);

      // vende: o cliente sai andando com balão, moedas voam
      await page.evaluate(() => { window.__loja.game.rng.chance = () => true; });
      const c = await page.evaluate(() => window.__loja.loja.precoCentro('justo'));
      await page.mouse.click(c.x, c.y);
      await expect.poll(async () => { const v = await vida(page); return v.saindo >= 1 && v.bolhas >= 1; }, { timeout: 5_000 }).toBe(true);
      const v = await vida(page);
      expect(v.moedas, 'moedinhas voando').toBeGreaterThanOrEqual(2);
      await page.waitForTimeout(220);
      await page.screenshot({ path: shotPath(`vida-saindo-${nome}`) });
      // o próximo da fila vem para a frente andando e tudo acaba parando
      await parado(page);
      await pronta(page);
      expect((await page.evaluate(() => window.__loja.state().fila.length))).toBe(1);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('animações desligadas', () => {
  test.use({ viewport: VIEWPORTS.portrait });
  test('sem "Animações" tudo é instantâneo: ninguém anda, sem balões nem moedas', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(async () => { (await import('/src/settings.js')).setSetting('motion', false); });
    await page.evaluate(() => { const L = window.__loja; L.clearQueue(); L.addClient('aprendiz_guerreiro', { tipo: 'surpresa' }); L.loja.renderAgora(); });
    expect(await vida(page)).toEqual({ andando: 0, saindo: 0, bolhas: 0, moedas: 0 });
    await pronta(page);
    await page.evaluate(() => { window.__loja.game.rng.chance = () => true; });
    const c = await page.evaluate(() => window.__loja.loja.precoCentro('justo'));
    await page.mouse.click(c.x, c.y);
    await page.waitForFunction(() => window.__loja.state().fila.length === 0, null, { timeout: 5_000 });
    expect(await vida(page)).toEqual({ andando: 0, saindo: 0, bolhas: 0, moedas: 0 });
    expect(errors).toEqual([]);
  });
});
