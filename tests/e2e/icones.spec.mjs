import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros } from './helpers.mjs';

async function irPara(page, i, id) {
  const p = await page.evaluate((n) => window.__loja.tabCenter(n), i);
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction((t) => window.__loja.tab() === t, id);
  await quadros(page, 4);
}

for (const dpr of [1, 3]) {
  test.describe(`ícones do pack (densidade ${dpr}x)`, () => {
    test.use({ viewport: VIEWPORTS.portrait, deviceScaleFactor: dpr });

    test('itens e materiais usam a arte do atlas, não os provisórios', async ({ page }) => {
      test.slow();      // 3x de densidade: cada captura é pesada no GL por software
      const errors = await openGame(page);
      expect(await page.evaluate(() => window.__loja.icones.quadros())).toBeGreaterThanOrEqual(160);
      const origens = await page.evaluate(() => ['espada_ferro', 'pocao_cura', 'barra_ferro', 'ovo_dragao', 'banquete', 'katana', 'sushi', 'bau_tesouro'].map((id) => window.__loja.icones.origem(id)));
      expect(origens).toEqual(Array(8).fill('atlas'));
      expect(await page.evaluate(() => window.__loja.icones.origem('id_que_nao_existe'))).toBe('provisorio');
      await page.screenshot({ path: shotPath(`portrait-loja-icones-${dpr}x`) });

      await page.evaluate(() => { window.__loja.giveMaterial('barra_ferro', 9); window.__loja.giveMaterial('carvao', 9); window.__loja.giveMaterial('madeira', 9); window.__loja.giveMaterial('cobre', 9); });
      await irPara(page, 1, 'oficina');
      await page.screenshot({ path: shotPath(`portrait-oficina-icones-${dpr}x`) });
      await irPara(page, 2, 'mercado');
      await page.screenshot({ path: shotPath(`portrait-mercado-icones-${dpr}x`) });
      expect(errors).toEqual([]);
    });
  });
}
