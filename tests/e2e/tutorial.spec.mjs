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

const esperarAba = (page, id) => page.waitForFunction((t) => window.__loja.tab() === t, id, { timeout: 8000 });
const esperarPasso = (page, id) => page.waitForFunction((t) => window.__loja.tutorial.id() === t, id, { timeout: 8000 });
const botaoOk = async (page) => { await quadros(page, 4); await clicarEm(page, await tutCentro(page, 'ok')); };

test('um jogo novo começa com o tutorial; ele muda de tela sozinho e o jogo todo se completa seguindo os destaques', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openGame(page, { tutorial: true });
  expect(await passo(page)).toBe(0);
  expect(await page.evaluate(() => window.__loja.tutorial.visivel())).toBe(true);
  await page.screenshot({ path: shotPath('portrait-tutorial') });

  await botaoOk(page);                      // boas-vindas
  expect(await page.evaluate(() => window.__loja.tutorial.id())).toBe('cliente');
  await botaoOk(page);                      // cliente

  // vender: o anel aponta para o preço Justo
  expect(await page.evaluate(() => window.__loja.tutorial.id())).toBe('vender');
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
  await botaoOk(page);                      // estoque
  await botaoOk(page);                      // reputação

  // mercado: o tutorial leva para a aba sozinho e destaca os materiais que faltam, um de cada vez
  await esperarPasso(page, 'mercado');
  await esperarAba(page, 'mercado');
  await prontaDe(page, 'mercado');
  for (let i = 0; i < 6; i++) {
    if ((await page.evaluate(() => window.__loja.tutorial.id())) !== 'mercado') break;
    await quadros(page, 4);
    const alvo = await page.evaluate(() => window.__loja.tutorial.alvo());
    expect(alvo, 'o anel aponta para um botão +1').toMatch(/:x1$/);
    if (i === 0) await page.screenshot({ path: shotPath('portrait-tutorial-mercado') });
    await ver(page, 'mercado', alvo);
    await clicarEm(page, await page.evaluate((n) => window.__loja.mercado.centro(n), alvo));
    await prontaDe(page, 'mercado');
  }
  await esperarPasso(page, 'oficina');

  // oficina: de novo a aba muda sozinha; o anel aponta para Produzir
  await esperarAba(page, 'oficina');
  await prontaDe(page, 'oficina');
  await quadros(page, 4);
  expect(await page.evaluate(() => window.__loja.tutorial.alvo())).toBe('produzir:r_adaga_bronze');
  await ver(page, 'oficina', 'produzir:r_adaga_bronze');
  await clicarEm(page, await page.evaluate(() => window.__loja.oficina.centro('produzir:r_adaga_bronze')));
  await esperarPasso(page, 'coletar');

  // coletar: o tutorial acelera a produção sozinho
  await page.waitForFunction(() => window.__loja.state().prontos.length > 0, null, { timeout: 12_000 });
  await prontaDe(page, 'oficina');
  await quadros(page, 4);
  expect(await page.evaluate(() => window.__loja.tutorial.alvo())).toBe('coletarTudo');
  await ver(page, 'oficina', 'coletarTudo');
  await clicarEm(page, await page.evaluate(() => window.__loja.oficina.centro('coletarTudo')));
  await esperarPasso(page, 'niveis');
  await botaoOk(page);

  // mapa (sub-aba do mercado), melhorias e aventureiros: só botões, com a tela mudando sozinha
  await esperarPasso(page, 'mapa');
  await esperarAba(page, 'mercado');
  await page.waitForFunction(() => window.__loja.mercado.sub() === 'mapa', null, { timeout: 5000 });
  await botaoOk(page);
  await esperarPasso(page, 'melhorias');
  await esperarAba(page, 'melhorias');
  await botaoOk(page);
  await esperarPasso(page, 'hoje');
  await esperarAba(page, 'aventureiros');
  await botaoOk(page);

  // fim: volta para a loja
  await esperarPasso(page, 'fim');
  await esperarAba(page, 'loja');
  await page.screenshot({ path: shotPath('portrait-tutorial-fim') });
  await botaoOk(page);
  expect(await passo(page)).toBe(-1);
  expect(await page.evaluate(() => window.__loja.tutorial.visivel())).toBe(false);
  expect(await page.evaluate(() => window.__loja.state().tutorial.feito)).toBe(true);
  expect(await page.evaluate(() => window.__loja.state().stats.produzidos)).toBeGreaterThanOrEqual(1);
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
