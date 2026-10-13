import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

test.use({ viewport: VIEWPORTS.portrait });

const passo = (page) => page.evaluate(() => window.__loja.tutorial.passo());
const clicarEm = async (page, ponto) => { expect(ponto).toBeTruthy(); await page.mouse.click(ponto.x, ponto.y); await quadros(page); };
const tutCentro = (page, n) => page.evaluate((x) => window.__loja.tutorial.centro(x), n);
const irParaAba = async (page, i, id) => {
  const p = await page.evaluate((n) => window.__loja.tabCenter(n), i);
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction((t) => window.__loja.tab() === t, id);
  await quadros(page);
};
const prontaDe = (page, tela) => page.waitForFunction((t) => window.__loja[t].pronta(), tela, { timeout: 10_000 });

const esperarPasso = (page, id) => page.waitForFunction((t) => window.__loja.tutorial.id() === t, id, { timeout: 8000 });
const botaoOk = async (page) => { await quadros(page, 4); await clicarEm(page, await tutCentro(page, 'ok')); };
const alvoTocar = async (page, tela) => {
  await quadros(page, 4);
  const alvo = await page.evaluate(() => window.__loja.tutorial.alvo());
  expect(alvo, 'o anel aponta para um botão').toBeTruthy();
  await ver(page, tela, alvo);
  await clicarEm(page, await page.evaluate(([t, n]) => window.__loja[t].centro(n), [tela, alvo]));
  return alvo;
};

test('o começo é curto (só a Loja) e cada aba ganha o seu tutorial na primeira visita', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await openGame(page, { tutorial: true });
  expect(await passo(page)).toBe(0);
  expect(await page.evaluate(() => window.__loja.tutorial.sequencia())).toBe('inicio');
  await page.screenshot({ path: shotPath('portrait-tutorial') });

  // ---- começo: Loja ----
  await botaoOk(page);                      // boas-vindas
  await botaoOk(page);                      // cliente
  await esperarPasso(page, 'vender');
  await page.evaluate(() => {
    const L = window.__loja;
    L.clearQueue();
    L.game.rng.chance = () => true;
    L.addClient('aprendiz_guerreiro', { tipo: 'item', item: 'adaga_bronze' });
    L.loja.renderAgora();
  });
  await prontaDe(page, 'loja');
  await quadros(page, 4);
  expect(await page.evaluate(() => window.__loja.tutorial.alvo())).toBe('preco:justo');
  await page.screenshot({ path: shotPath('portrait-tutorial-vender') });
  await clicarEm(page, await page.evaluate(() => window.__loja.loja.precoCentro('justo')));
  await esperarPasso(page, 'estoque');
  await botaoOk(page);
  await esperarPasso(page, 'explorar');
  await botaoOk(page);
  expect(await passo(page)).toBe(-1);
  expect(await page.evaluate(() => window.__loja.state().tutorial.feito)).toBe(true);

  // ---- Oficina: ganha os materiais, produz, o tutorial acelera, coleta ----
  await irParaAba(page, 1, 'oficina');
  await esperarPasso(page, 'oficina-intro');
  await prontaDe(page, 'oficina');
  await page.screenshot({ path: shotPath('portrait-tutorial-oficina') });
  await botaoOk(page);
  await esperarPasso(page, 'oficina-produzir');
  expect((await page.evaluate(() => window.__loja.state().materiais)).cobre).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => window.__loja.tutorial.alvo())).toBe('produzir:r_adaga_bronze');
  await alvoTocar(page, 'oficina');
  await esperarPasso(page, 'oficina-coletar');
  await page.waitForFunction(() => window.__loja.state().prontos.length > 0, null, { timeout: 12_000 });
  await prontaDe(page, 'oficina');
  expect(await page.evaluate(() => window.__loja.tutorial.alvo())).toBe('coletarTudo');
  await alvoTocar(page, 'oficina');
  await esperarPasso(page, 'oficina-niveis');
  await botaoOk(page);
  expect(await passo(page)).toBe(-1);

  // ---- Mercado ----
  await irParaAba(page, 2, 'mercado');
  await esperarPasso(page, 'mercado-intro');
  await prontaDe(page, 'mercado');
  await botaoOk(page);
  await esperarPasso(page, 'mercado-comprar');
  expect(await page.evaluate(() => window.__loja.tutorial.alvo())).toMatch(/:x1$/);
  await alvoTocar(page, 'mercado');
  await esperarPasso(page, 'mercado-mapa');
  await page.waitForFunction(() => window.__loja.mercado.sub() === 'mapa', null, { timeout: 5000 });
  await botaoOk(page);
  await esperarPasso(page, 'mercado-minijogo');
  await page.waitForFunction(() => window.__loja.mercado.sub() === 'minijogo', null, { timeout: 5000 });
  await botaoOk(page);
  expect(await passo(page)).toBe(-1);

  // ---- Aventureiros ----
  await irParaAba(page, 3, 'aventureiros');
  await esperarPasso(page, 'aventureiros-bonus');
  await prontaDe(page, 'aventureiros');
  expect(await page.evaluate(() => window.__loja.tutorial.alvo())).toBe('bonus');
  await alvoTocar(page, 'aventureiros');
  await esperarPasso(page, 'aventureiros-hoje');
  await botaoOk(page);
  await esperarPasso(page, 'aventureiros-colecao');
  await page.waitForFunction(() => window.__loja.aventureiros.sub() === 'colecao', null, { timeout: 5000 });
  await botaoOk(page);

  // ---- Melhorias: quatro botões, trocando de sub-aba sozinho ----
  await irParaAba(page, 4, 'melhorias');
  for (const [id, sub] of [['melhorias-loja', 'loja'], ['melhorias-equipe', 'equipe'], ['melhorias-oficios', 'oficios'], ['melhorias-expandir', 'expandir']]) {
    await esperarPasso(page, id);
    await page.waitForFunction((x) => window.__loja.melhorias.sub() === x, sub, { timeout: 5000 });
    await botaoOk(page);
  }
  expect(await passo(page)).toBe(-1);
  const abas = await page.evaluate(() => window.__loja.state().tutorial.abas);
  expect(Object.keys(abas).sort()).toEqual(['aventureiros', 'melhorias', 'mercado', 'oficina']);
  await page.screenshot({ path: shotPath('portrait-tutorial-fim') });
  expect(errors).toEqual([]);
});

test('o tutorial de uma aba só aparece nela, espera o jogador voltar e não repete depois de concluído', async ({ page }) => {
  const errors = await openGame(page, { tutorial: true });
  await clicarEm(page, await tutCentro(page, 'pular'));
  expect(await passo(page)).toBe(-1);
  // "Pular" encerra tudo: nenhuma aba abre tutorial
  await irParaAba(page, 1, 'oficina');
  await page.waitForTimeout(900);
  expect(await passo(page)).toBe(-1);
  expect(Object.keys(await page.evaluate(() => window.__loja.state().tutorial.abas)).length).toBe(4);
  expect(errors).toEqual([]);
});

test('sair da aba no meio do tutorial dela esconde o balão; voltar o retoma', async ({ page }) => {
  const errors = await openGame(page);                     // sem tutorial inicial
  await page.evaluate(() => { const t = window.__loja.state().tutorial; t.abas = {}; });
  await irParaAba(page, 1, 'oficina');
  await esperarPasso(page, 'oficina-intro');
  expect(await page.evaluate(() => window.__loja.tutorial.visivel())).toBe(true);
  await irParaAba(page, 0, 'loja');
  await quadros(page, 3);
  expect(await page.evaluate(() => window.__loja.tutorial.visivel())).toBe(false);
  await irParaAba(page, 1, 'oficina');
  await quadros(page, 3);
  expect(await page.evaluate(() => window.__loja.tutorial.visivel())).toBe(true);
  expect(await page.evaluate(() => window.__loja.tutorial.id())).toBe('oficina-intro');
  expect(errors).toEqual([]);
});

test('"Pular tutorial" encerra na hora e o estado fica salvo', async ({ page }) => {
  const errors = await openGame(page, { tutorial: true });
  await clicarEm(page, await tutCentro(page, 'pular'));
  expect(await passo(page)).toBe(-1);
  await page.evaluate(() => window.__loja.save());
  await page.reload();
  await page.waitForFunction(() => window.__loja?.ready);
  expect(await passo(page)).toBe(-1);
  expect(errors).toEqual([]);
});

test('o passo do tutorial é salvo e continua de onde parou', async ({ page }) => {
  const errors = await openGame(page, { tutorial: true });
  await clicarEm(page, await tutCentro(page, 'ok'));
  expect(await passo(page)).toBe(1);
  await page.evaluate(() => window.__loja.save());
  await page.reload();
  await page.waitForFunction(() => window.__loja?.ready);
  await page.waitForTimeout(400);
  expect(await passo(page)).toBe(1);
  expect(await page.evaluate(() => window.__loja.tutorial.visivel())).toBe(true);
  expect(errors).toEqual([]);
});

test('o tutorial não cobre os botões de preço no celular em pé', async ({ page }) => {
  const errors = await openGame(page, { tutorial: true });
  await clicarEm(page, await tutCentro(page, 'ok'));
  await page.evaluate(() => {
    const L = window.__loja;
    L.clearQueue();
    L.addClient('aprendiz_guerreiro', { tipo: 'item', item: 'adaga_bronze' });
    L.loja.renderAgora();
  });
  await prontaDe(page, 'loja');
  const preco = await page.evaluate(() => window.__loja.loja.precoCentro('justo'));
  const balao = await page.evaluate(() => { const c = window.__loja.tutorial.centro('pular'); return c; });
  expect(preco.y).toBeLessThan(balao.y - 40);
  await page.screenshot({ path: shotPath('portrait-tutorial-venda') });
  expect(errors).toEqual([]);
});
