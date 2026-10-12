import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros } from './helpers.mjs';

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

test('um jogo novo começa com o tutorial; o jogo todo se completa fazendo as ações', async ({ page }) => {
  const errors = await openGame(page, { tutorial: true });
  expect(await passo(page)).toBe(0);
  expect(await page.evaluate(() => window.__loja.tutorial.visivel())).toBe(true);
  await page.screenshot({ path: shotPath('portrait-tutorial') });

  // 0 -> 1: botão
  await clicarEm(page, await tutCentro(page, 'ok'));
  expect(await passo(page)).toBe(1);

  // 1 -> 2: fazer uma venda
  await page.evaluate(() => {
    const L = window.__loja;
    L.clearQueue();
    L.game.rng.chance = () => true;
    L.addClient('aprendiz_guerreiro', { tipo: 'item', item: 'adaga_bronze' });
    L.loja.renderAgora();
  });
  await prontaDe(page, 'loja');
  await clicarEm(page, await page.evaluate(() => window.__loja.loja.precoCentro('justo')));
  expect(await passo(page)).toBe(2);

  // 2 -> 3: comprar no mercado
  await irParaAba(page, 2, 'mercado');
  await prontaDe(page, 'mercado');
  await clicarEm(page, await page.evaluate(() => window.__loja.mercado.botaoCentro('mineradora_pedra', 'barra_ferro', 'x1')));
  await prontaDe(page, 'mercado');
  expect(await passo(page)).toBe(3);
  await clicarEm(page, await page.evaluate(() => window.__loja.mercado.botaoCentro('mineradora_pedra', 'barra_ferro', 'x1')));
  await clicarEm(page, await page.evaluate(() => window.__loja.mercado.botaoCentro('ferreiro_toras', 'carvao', 'x1')));

  // 3 -> 4: produzir
  await irParaAba(page, 1, 'oficina');
  await prontaDe(page, 'oficina');
  await clicarEm(page, await page.evaluate(() => window.__loja.oficina.centro('produzir:r_espada_ferro')));
  expect(await passo(page)).toBe(4);

  // 4 -> 5: coletar
  await page.evaluate(() => window.__loja.skip(120_000));
  await prontaDe(page, 'oficina');
  await clicarEm(page, await page.evaluate(() => window.__loja.oficina.centro('coletarTudo')));
  expect(await passo(page)).toBe(5);

  // 5: botão final encerra
  await page.screenshot({ path: shotPath('portrait-tutorial-fim') });
  await clicarEm(page, await tutCentro(page, 'ok'));
  expect(await passo(page)).toBe(-1);
  expect(await page.evaluate(() => window.__loja.tutorial.visivel())).toBe(false);
  expect(await page.evaluate(() => window.__loja.state().tutorial.feito)).toBe(true);
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
