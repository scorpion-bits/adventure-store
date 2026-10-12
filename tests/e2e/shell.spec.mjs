import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath } from './helpers.mjs';

for (const [mode, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`layout ${mode}`, () => {
    test.use({ viewport });

    test('abre sem erros, no modo certo, e a tela de carregamento some', async ({ page }) => {
      const errors = await openGame(page);
      expect(await page.evaluate(() => window.__loja.mode())).toBe(mode);
      await expect(page.locator('#boot')).toHaveCount(0, { timeout: 3000 });
      await expect(page.locator('canvas')).toHaveCount(1);
      await page.screenshot({ path: shotPath(`${mode}-loja`) });
      expect(errors).toEqual([]);
    });

    test('as cinco abas respondem ao clique', async ({ page }) => {
      const errors = await openGame(page);
      const ids = ['loja', 'oficina', 'mercado', 'aventureiros', 'melhorias'];
      for (let i = 4; i >= 0; i--) {
        const p = await page.evaluate((n) => window.__loja.tabCenter(n), i);
        await page.mouse.click(p.x, p.y);
        await page.waitForTimeout(150);
        expect(await page.evaluate(() => window.__loja.tab())).toBe(ids[i]);
      }
      await page.screenshot({ path: shotPath(`${mode}-abas`) });
      expect(errors).toEqual([]);
    });

    test('configurações abrem pela engrenagem e fecham tocando fora', async ({ page }) => {
      const errors = await openGame(page);
      const g = await page.evaluate(() => window.__loja.gearCenter());
      await page.mouse.click(g.x, g.y);
      await page.waitForTimeout(350);
      expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
      await page.screenshot({ path: shotPath(`${mode}-config`) });
      await page.mouse.click(4, viewport.height - 4);
      await page.waitForTimeout(250);
      expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(false);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('toque no celular', () => {
  test.use({ viewport: VIEWPORTS.portrait, hasTouch: true, isMobile: true });

  test('tocar numa aba troca de tela e arrastar a lista rola sem acionar botões', async ({ page }) => {
    const errors = await openGame(page);
    const p = await page.evaluate(() => window.__loja.tabCenter(3));
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__loja.tab())).toBe('aventureiros');
    expect(errors).toEqual([]);
  });
});

test('lista rola com a roda do mouse quando o conteúdo é maior que a tela', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 300 });   // bem baixa: a lista precisa rolar
  const errors = await openGame(page);
  const before = await page.evaluate(() => window.__loja.scroll());
  expect(before.contentH).toBeGreaterThan(before.viewH);
  const c = await page.evaluate(() => window.__loja.layout().content);
  await page.mouse.move(c.x + c.w / 2, c.y + c.h / 2);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(150);
  expect((await page.evaluate(() => window.__loja.scroll())).y).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
