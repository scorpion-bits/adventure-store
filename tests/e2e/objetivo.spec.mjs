import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.loja.pronta(), null, { timeout: 10_000 });

for (const [nome, vp] of Object.entries(VIEWPORTS)) {
  test.describe(nome, () => {
    test.use({ viewport: vp });

    test('o cartão de objetivo aparece discreto, mostra o progresso e leva à aba certa ao tocar', async ({ page }) => {
      const errors = await openGame(page);
      await page.evaluate(() => { window.__loja.clearQueue(); window.__loja.state().ouro = 50; window.__loja.loja.renderAgora(); });
      await pronta(page);
      const o = await page.evaluate(() => window.__loja.loja.objetivo());
      expect(o, 'há um objetivo').toBeTruthy();
      expect(o.pronto).toBe(false);
      await page.screenshot({ path: shotPath(`objetivo-${nome}`) });

      // com ouro de sobra fica "Pronto!" e tocar leva à aba da compra
      await page.evaluate(() => { window.__loja.state().ouro = 5000; window.__loja.loja.renderAgora(); });
      await pronta(page);
      const pronto = await page.evaluate(() => window.__loja.loja.objetivo());
      expect(pronto.pronto).toBe(true);
      await page.screenshot({ path: shotPath(`objetivo-pronto-${nome}`) });
      const c = await page.evaluate(() => window.__loja.loja.objetivoCentro());
      expect(c).toBeTruthy();
      await page.mouse.click(c.x, c.y);
      await expect.poll(() => page.evaluate(() => window.__loja.tab())).toBe(pronto.aba);
      expect(errors).toEqual([]);
    });
  });
}

test('o cartão não aparece durante a introdução do tutorial', async ({ page }) => {
  await page.goto('/?semconquistas&hoje=2026-08-04');
  await page.waitForFunction(() => window.__loja?.ready, null, { timeout: 20_000 });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__loja.loja.objetivo())).toBeNull();
  await quadros(page, 2);
});
