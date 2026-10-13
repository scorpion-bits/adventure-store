import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.mercado.pronta(), null, { timeout: 10_000 });
const cod = (page, fn, arg) => page.evaluate(([f, a]) => window.__loja.mercado.codigo[f](a), [fn, arg]);

async function abrirCodigo(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(2));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'mercado');
  await pronta(page);
  await quadros(page, 3);
  const c = await page.evaluate(() => window.__loja.mercado.centro('sub:minijogo'));
  await page.mouse.click(c.x, c.y);
  await page.waitForFunction(() => window.__loja.mercado.sub() === 'minijogo');
  await pronta(page);
}
const tocar = async (page, nome) => {
  await ver(page, 'mercado', nome);
  const p = await page.evaluate((n) => window.__loja.mercado.centro(n), nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await quadros(page, 3);
  await pronta(page);
};
const jogar = async (page) => {
  await tocar(page, 'codigo:jogar');
  await page.waitForFunction(() => window.__loja.mercado.codigo.fase() === 'jogando');
  await pronta(page);
};
// monta um palpite tocando nos materiais da paleta
const montar = async (page, materiais) => {
  const paleta = await cod(page, 'paleta');
  for (const m of materiais) await tocar(page, `codigo:paleta:${paleta.indexOf(m)}`);
};

test.describe('Código do Ferreiro (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('os dois jogos aparecem um embaixo do outro na mesma aba, cada um com as suas partidas e o botão Jogar', async ({ page }) => {
    const errors = await openGame(page);
    await abrirCodigo(page);
    await page.screenshot({ path: shotPath('portrait-codigo-saguao') });
    expect(await cod(page, 'fase')).toBe('lobby');
    const nomes = await page.evaluate(() => window.__loja.mercado.nomes());
    expect(nomes).toEqual(expect.arrayContaining(['minijogo:jogar', 'codigo:jogar']));
    expect(nomes.some((n) => n.startsWith('jogo:')), 'não há mais seletor de jogo').toBe(false);
    // a memória vem primeiro; o código fica logo abaixo
    const [m, k] = await Promise.all([page.evaluate(() => window.__loja.mercado.retangulo('minijogo:jogar')), page.evaluate(() => window.__loja.mercado.retangulo('codigo:jogar'))]);
    expect(k.y).toBeGreaterThan(m.y);
    expect(errors).toEqual([]);
  });

  test('uma partida inteira: palpite errado dá dicas certas, o certo abre o cofre e rende os materiais', async ({ page }) => {
    const errors = await openGame(page);
    await abrirCodigo(page);
    await jogar(page);
    expect(await page.evaluate(() => window.__loja.state().codigo.cargas)).toBe(2);
    const segredo = await cod(page, 'segredo');
    const paleta = await cod(page, 'paleta');
    expect(segredo).toHaveLength(3);                                    // cofre do nível 1
    expect(new Set(segredo).size).toBe(3);                              // sem repetir
    const antes = await page.evaluate(() => ({ ...window.__loja.state().materiais }));

    // "Conferir" só vale com todos os espaços cheios
    await tocar(page, 'codigo:paleta:0');
    expect((await cod(page, 'palpite')).filter(Boolean)).toHaveLength(1);
    await tocar(page, 'codigo:conferir');
    expect(await cod(page, 'historico')).toHaveLength(0);
    // tocar na peça colocada tira
    await tocar(page, 'codigo:slot:0');
    expect((await cod(page, 'palpite')).filter(Boolean)).toHaveLength(0);

    // um palpite errado de propósito: o segredo com os dois primeiros trocados
    const errado = [segredo[1], segredo[0], segredo[2]];
    await montar(page, errado);
    expect(await cod(page, 'palpite')).toEqual(errado);
    await page.screenshot({ path: shotPath('portrait-codigo-jogando') });
    await tocar(page, 'codigo:conferir');
    const h = await cod(page, 'historico');
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ certos: 1, quase: 2, marcas: ['quase', 'quase', 'certo'] });
    expect(await cod(page, 'palpite')).toEqual([null, null, null]);
    await page.screenshot({ path: shotPath('portrait-codigo-dicas') });

    // o palpite certo abre o cofre
    await montar(page, segredo);
    await tocar(page, 'codigo:conferir');
    await page.waitForFunction(() => window.__loja.mercado.codigo.fase() === 'fim', null, { timeout: 8000 });
    await pronta(page);
    await page.screenshot({ path: shotPath('portrait-codigo-fim') });
    const r = await cod(page, 'resultado');
    expect(r).toMatchObject({ aberto: true, tentativas: 2, rapido: true });
    const depois = await page.evaluate(() => ({ ...window.__loja.state().materiais }));
    for (const m of segredo) expect(depois[m] ?? 0).toBeGreaterThan(antes[m] ?? 0);
    expect(r.total).toBe(6);                                            // 3 espaços x 1 x2 (rápido)
    expect(await page.evaluate(() => window.__loja.state().codigo.vitorias)).toBe(1);
    expect(paleta.length).toBeGreaterThanOrEqual(3);
    expect(errors).toEqual([]);
  });

  test('só uma partida de cada vez (o outro jogo some da tela); desistir mostra o segredo e dá o consolo', async ({ page }) => {
    const errors = await openGame(page);
    await abrirCodigo(page);
    await jogar(page);
    const segredo = await cod(page, 'segredo');
    // durante a partida do código, a memória some da tela (só uma partida de cada vez) e não gasta nada
    const nomes = await page.evaluate(() => window.__loja.mercado.nomes());
    expect(nomes.includes('minijogo:jogar'), 'a memória não aparece durante a partida').toBe(false);
    expect(await page.evaluate(() => window.__loja.state().minijogo.cargas)).toBe(3);
    expect(await cod(page, 'fase')).toBe('jogando');
    // um palpite com o primeiro espaço certo e o resto errado
    const paleta = await cod(page, 'paleta');
    const outro = (i) => paleta.find((m) => m !== segredo[i]);
    await montar(page, [segredo[0], outro(1), outro(2)]);
    await tocar(page, 'codigo:conferir');
    await tocar(page, 'codigo:desistir');
    await page.waitForFunction(() => window.__loja.mercado.codigo.fase() === 'fim');
    const r = await cod(page, 'resultado');
    expect(r).toMatchObject({ aberto: false, desistiu: true, total: 1 });
    expect(r.segredo).toEqual(segredo);
    // depois do fim a memória já pode começar
    await tocar(page, 'codigo:voltar');
    await tocar(page, 'minijogo:jogar');
    await page.waitForFunction(() => window.__loja.mercado.minijogo.fase() === 'jogando');
    expect(errors).toEqual([]);
  });
});

for (const nome of ['landscape', 'desktop']) {
  test.describe(`Código do Ferreiro (${nome})`, () => {
    test.use({ viewport: VIEWPORTS[nome] });
    test('abre o cofre também nessa tela', async ({ page }) => {
      const errors = await openGame(page);
      await abrirCodigo(page);
      await jogar(page);
      const segredo = await cod(page, 'segredo');
      await montar(page, segredo);
      await page.screenshot({ path: shotPath(`${nome}-codigo-jogando`) });
      await tocar(page, 'codigo:conferir');
      await page.waitForFunction(() => window.__loja.mercado.codigo.fase() === 'fim', null, { timeout: 8000 });
      expect((await cod(page, 'resultado')).aberto).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}
