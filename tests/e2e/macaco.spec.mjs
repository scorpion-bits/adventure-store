import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame } from './helpers.mjs';

// "Macaco": toca e arrasta em lugares aleatórios por um tempo (com o jogo já avançado, para aparecer mais tela)
// e confere que nada quebra (erros de console/página) e que o estado continua coerente.
function sorteador(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// no CI (GL por software, bem mais lento) só rodam duas sementes; as outras ficam para a máquina local
const CASOS = [['retrato', 'portrait', 11], ['retrato (outra)', 'portrait', 29], ['retrato (3)', 'portrait', 101], ['retrato (4)', 'portrait', 77], ['paisagem', 'landscape', 5], ['desktop', 'desktop', 7]];
for (const [nome, vp, semente] of process.env.CI ? [CASOS[0], CASOS[4]] : CASOS) {
  test(`macaco: ${nome}, ${semente}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(VIEWPORTS[vp]);
    const errors = await openGame(page);
    await page.evaluate(() => {
      const L = window.__loja;
      L.addRep(1500);
      L.state().ouro = 50000;
      for (const m of Object.keys(L.game.data.materiais)) L.giveMaterial(m, 6);
      for (const i of L.game.data.listas.itens.slice(0, 40)) L.giveItem(i.id, 1, 2);
    });
    const rnd = sorteador(semente);
    const { width, height } = VIEWPORTS[vp];
    for (let i = 0; i < 160; i++) {
      let x = Math.floor(rnd() * width);
      let y = Math.floor(rnd() * height);
      if (x < 56 && y < 56) y += 60;          // o canto do botão "voltar ao site" sai do jogo de propósito
      const r = rnd();
      if (r < 0.7) await page.mouse.click(x, y);
      else if (r < 0.9) {      // arrasta (rolar listas)
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x, Math.max(0, Math.min(height - 1, y + (rnd() - 0.5) * 300)), { steps: 4 });
        await page.mouse.up();
      } else await page.keyboard.press('Escape');
      if (i % 40 === 0) await page.evaluate(() => window.__loja.skip(120_000));       // deixa o tempo passar (produção, expedições, eventos)
    }
    const s = await page.evaluate(() => window.__loja.state());
    expect(Number.isFinite(s.ouro) && s.ouro >= 0, `ouro ${s.ouro}`).toBe(true);
    expect(Number.isFinite(s.rep) && s.rep >= 0).toBe(true);
    for (const [k, q] of Object.entries(s.estoque)) expect(q > 0 && Number.isInteger(q), `estoque ${k}=${q}`).toBe(true);
    for (const [k, q] of Object.entries(s.materiais)) expect(q > 0 && Number.isInteger(q), `material ${k}=${q}`).toBe(true);
    expect(errors).toEqual([]);
  });
}
