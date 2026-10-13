import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.mercado.pronta(), null, { timeout: 10_000 });
const mj = (page, fn, arg) => page.evaluate(([f, a]) => window.__loja.mercado.minijogo[f](a), [fn, arg]);

async function abrirMiniJogo(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(2));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'mercado');
  await pronta(page);
  await quadros(page, 3);
  const s = await page.evaluate(() => window.__loja.mercado.centro('sub:minijogo'));
  await page.mouse.click(s.x, s.y);
  await page.waitForFunction(() => window.__loja.mercado.sub() === 'minijogo');
  await pronta(page);
}
const tocar = async (page, nome) => {
  await ver(page, 'mercado', nome);
  const p = await page.evaluate((n) => window.__loja.mercado.centro(n), nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await quadros(page, 3);
};
const jogar = async (page) => {
  await tocar(page, 'minijogo:jogar');
  await page.waitForFunction(() => window.__loja.mercado.minijogo.fase() === 'jogando');
  await pronta(page);
  await quadros(page, 3);
};
// acha dois índices de cartas com materiais diferentes
const dois = (cartas) => { const a = 0; const b = cartas.findIndex((m, i) => i > 0 && m !== cartas[0]); return [a, b]; };

test.describe('mini-jogo de memória (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('o saguão mostra as partidas guardadas e o botão Jogar', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMiniJogo(page);
    await page.screenshot({ path: shotPath('portrait-minijogo-saguao') });
    expect(await mj(page, 'fase')).toBe('lobby');
    expect((await page.evaluate(() => window.__loja.mercado.nomes())).includes('minijogo:jogar')).toBe(true);
    expect(errors).toEqual([]);
  });

  test('achar todos os pares sem errar: prêmio dobrado, materiais no depósito e uma partida gasta', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMiniJogo(page);
    const antes = await page.evaluate(() => ({ ...window.__loja.state().materiais }));
    await jogar(page);
    const cartas = await mj(page, 'tabuleiro');
    expect(cartas.length).toBe(12);
    await page.screenshot({ path: shotPath('portrait-minijogo-jogando') });
    expect(await page.evaluate(() => window.__loja.state().minijogo.cargas)).toBe(2);
    // para cada material, vira as duas cartas dele
    const feitos = new Set();
    let primeira = true;
    for (let i = 0; i < cartas.length; i++) {
      if (feitos.has(cartas[i])) continue;
      feitos.add(cartas[i]);
      const j = cartas.findIndex((m, k) => k > i && m === cartas[i]);
      await tocar(page, `carta:${i}`);
      if (primeira) { await page.screenshot({ path: shotPath('portrait-minijogo-virada') }); primeira = false; }
      await tocar(page, `carta:${j}`);
    }
    await page.waitForFunction(() => window.__loja.mercado.minijogo.fase() === 'fim', null, { timeout: 8000 });
    await pronta(page);
    await quadros(page, 3);
    await page.screenshot({ path: shotPath('portrait-minijogo-fim') });
    const r = await mj(page, 'resultado');
    expect(r.perfeito).toBe(true);
    expect(r.pares).toBe(6);
    expect(r.erros).toBe(0);
    const depois = await page.evaluate(() => window.__loja.state().materiais);
    const ganhos = Object.entries(depois).reduce((n, [m, q]) => n + (q - (antes[m] ?? 0)), 0);
    expect(ganhos).toBe(r.total);
    expect(r.total).toBe(12);                                      // 6 pares x 1 unidade x 2 (perfeito)
    expect(await page.evaluate(() => window.__loja.state().minijogo.perfeitas)).toBe(1);
    // voltar ao saguão
    await tocar(page, 'minijogo:voltar');
    expect(await mj(page, 'fase')).toBe('lobby');
    expect(errors).toEqual([]);
  });

  test('par errado: conta o erro e as cartas viram de volta; "Terminar agora" paga só o que achou', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMiniJogo(page);
    await jogar(page);
    const cartas = await mj(page, 'tabuleiro');
    const [a, b] = dois(cartas);
    await tocar(page, `carta:${a}`);
    await tocar(page, `carta:${b}`);
    expect(await mj(page, 'erros')).toBe(1);
    await page.waitForTimeout(1000);                                 // as cartas viram de volta
    expect(await mj(page, 'achadas')).toEqual([]);
    // depois de virar de volta dá para jogar normalmente: acha um par
    const j = cartas.findIndex((m, k) => k > a && m === cartas[a]);
    await tocar(page, `carta:${a}`);
    await tocar(page, `carta:${j}`);
    expect(await mj(page, 'achadas')).toEqual(expect.arrayContaining([a, j]));
    await tocar(page, 'minijogo:desistir');
    await page.waitForFunction(() => window.__loja.mercado.minijogo.fase() === 'fim');
    const r = await mj(page, 'resultado');
    expect(r.perfeito).toBe(false);
    expect(r.pares).toBe(1);
    expect(r.total).toBe(1);
    expect(errors).toEqual([]);
  });

  test('o tempo acaba: a partida termina com os pares que deu', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMiniJogo(page);
    await jogar(page);
    const cartas = await mj(page, 'tabuleiro');
    await tocar(page, 'carta:0');                                    // o tempo só começa na primeira carta
    await mj(page, 'avancar', 1e6);
    await page.waitForFunction(() => window.__loja.mercado.minijogo.fase() === 'fim');
    const r = await mj(page, 'resultado');
    expect(r.tempoAcabou).toBe(true);
    expect(r.total).toBe(0);
    expect(cartas.length).toBe(12);
    expect(errors).toEqual([]);
  });

  test('sem partidas guardadas o botão não começa nada', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.state().minijogo.cargas = 0; window.__loja.state().minijogo.desde = window.__loja.game.clock.now(); });
    await abrirMiniJogo(page);
    await tocar(page, 'minijogo:jogar');
    expect(await mj(page, 'fase')).toBe('lobby');
    expect(await page.evaluate(() => window.__loja.state().minijogo.cargas)).toBe(0);
    await page.screenshot({ path: shotPath('portrait-minijogo-sem-partidas') });
    expect(errors).toEqual([]);
  });
});

for (const vp of ['landscape', 'desktop']) {
  test.describe(`mini-jogo (${vp})`, () => {
    test.use({ viewport: VIEWPORTS[vp] });
    test('abre, joga e termina', async ({ page }) => {
      const errors = await openGame(page);
      await page.evaluate(() => window.__loja.addRep(900));         // tabuleiro maior
      await abrirMiniJogo(page);
      await jogar(page);
      const cartas = await mj(page, 'tabuleiro');
      expect(cartas.length).toBe(16);
      await page.screenshot({ path: shotPath(`${vp}-minijogo`) });
      await tocar(page, 'minijogo:desistir');
      await page.waitForFunction(() => window.__loja.mercado.minijogo.fase() === 'fim');
      expect(errors).toEqual([]);
    });
  });
}
