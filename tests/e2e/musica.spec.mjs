import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame } from './helpers.mjs';

test.use({ viewport: VIEWPORTS.portrait });

const tocando = (page) => page.evaluate(async () => (await import('/src/audio/music.js')).musicState().playing);

test('a trilha começa sozinha no primeiro toque, dura o esperado e liga/desliga', async ({ page }) => {
  const errors = await openGame(page);
  expect(await tocando(page)).toBe(false);
  await page.mouse.click(200, 400);        // o navegador só libera o áudio depois de um toque do jogador
  await expect.poll(() => tocando(page), { timeout: 15_000 }).toBe(true);
  const r = await page.evaluate(async () => {
    const m = await import('/src/audio/music.js');
    const ctx = (await import('/src/audio/sfx.js')).getAudioContext();
    const antes = m.musicState();
    m.stopMusic();
    const depois = m.musicState();
    return { antes, depois, estado: ctx.state, tem: m.hasMusic() };
  });
  expect(r.tem).toBe(true);
  expect(r.antes).toEqual({ playing: true, available: true });
  expect(r.depois.playing).toBe(false);
  expect(r.estado).toBe('running');
  expect(errors).toEqual([]);
});

test('o mp3 decodifica inteiro, com a duração da faixa (loop sem pausa no começo)', async ({ page }) => {
  await openGame(page);
  await page.mouse.click(200, 400);
  await expect.poll(() => tocando(page), { timeout: 15_000 }).toBe(true);   // a faixa já foi baixada: dá para achá-la nos recursos da página
  const r = await page.evaluate(async () => {
    const ctx = (await import('/src/audio/sfx.js')).getAudioContext();
    const lista = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /taverna.*\.mp3$/.test(n));
    const buf = await ctx.decodeAudioData(await (await fetch(lista[0])).arrayBuffer());
    const d = buf.getChannelData(0);
    let primeiro = 0;
    while (primeiro < d.length && Math.abs(d[primeiro]) < 0.002) primeiro++;
    return { dur: buf.duration, silencioInicial: primeiro / buf.sampleRate };
  });
  expect(r.dur).toBeGreaterThan(114.5);
  expect(r.dur).toBeLessThan(116.5);
  expect(r.silencioInicial, 'quase nada de silêncio antes da primeira nota').toBeLessThan(0.12);
});
