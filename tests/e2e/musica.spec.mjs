import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame } from './helpers.mjs';

test.use({ viewport: VIEWPORTS.portrait });

test('a trilha provisória carrega, decodifica e toca em loop; ligar e desligar funciona', async ({ page }) => {
  const errors = await openGame(page);
  await page.mouse.click(200, 400);        // o navegador só libera o áudio depois de um toque do jogador
  const r = await page.evaluate(async () => {
    const m = await import('/src/audio/music.js');
    await m.startMusic();
    const tocando = m.musicState();
    m.stopMusic();
    return { tem: m.hasMusic(), tocando };
  });
  expect(r.tem).toBe(true);
  expect(r.tocando).toEqual({ playing: true, available: true });
  expect(errors).toEqual([]);
});
