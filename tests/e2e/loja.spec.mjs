import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath } from './helpers.mjs';

// prepara uma loja sem clientes aleatórios e com um cliente conhecido na fila
async function prepararLoja(page, { pedido, advId = 'aprendiz_guerreiro', aceitar } = {}) {
  await page.evaluate(({ advId, pedido, aceitar }) => {
    const L = window.__loja;
    L.clearQueue();
    if (aceitar !== undefined) L.game.rng.chance = () => aceitar;
    L.addClient(advId, pedido);
    L.loja.renderAgora();
  }, { advId, pedido, aceitar });
  await page.waitForFunction(() => window.__loja.loja.pronta(), null, { timeout: 10_000 });
}

// espera a tela terminar de redesenhar antes e depois do clique (os quadros são lentos com GL por software)
const pronta = (page) => page.waitForFunction(() => window.__loja.loja.pronta(), null, { timeout: 10_000 });
const clicar = async (page, p) => { expect(p, 'ponto de clique existe').toBeTruthy(); await page.mouse.click(p.x, p.y); await pronta(page); };

test.describe('retrato', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('um cliente chega sozinho em poucos segundos', async ({ page }) => {
    const errors = await openGame(page);
    await page.waitForFunction(() => window.__loja.state().fila.length >= 1, null, { timeout: 8000 });
    expect(errors).toEqual([]);
  });

  test('vender tocando no preço: ouro sobe, estoque desce, cliente sai', async ({ page }) => {
    const errors = await openGame(page);
    await prepararLoja(page, { pedido: { tipo: 'item', item: 'adaga_bronze' }, aceitar: true });
    const antes = await page.evaluate(() => ({ ouro: window.__loja.state().ouro, adagas: window.__loja.state().estoque['adaga_bronze:1'] }));
    await page.screenshot({ path: shotPath('portrait-atendimento') });
    expect(await page.evaluate(() => window.__loja.loja.selecionada())).toBe('adaga_bronze:1');
    await clicar(page, await page.evaluate(() => window.__loja.loja.precoCentro('justo')));
    const depois = await page.evaluate(() => ({ ouro: window.__loja.state().ouro, adagas: window.__loja.state().estoque['adaga_bronze:1'], fila: window.__loja.state().fila.length, vendas: window.__loja.state().stats.vendas, res: window.__loja.loja.resultado() }));
    expect(depois.ouro).toBe(antes.ouro + 25);
    expect(depois.adagas).toBe(antes.adagas - 1);
    expect(depois.fila).toBe(0);
    expect(depois.vendas).toBe(1);
    expect(depois.res.ok).toBe(true);
    await page.waitForTimeout(300);
    await page.screenshot({ path: shotPath('portrait-vendeu') });
    expect(errors).toEqual([]);
  });

  test('cliente que recusa o preço sai e a reputação cai', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => window.__loja.addRep(10));
    await prepararLoja(page, { pedido: { tipo: 'item', item: 'adaga_bronze' }, aceitar: false });
    await clicar(page, await page.evaluate(() => window.__loja.loja.precoCentro('caro')));
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.stats.vendas).toBe(0);
    expect(s.stats.recusas).toBe(1);
    expect(s.estoque['adaga_bronze:1']).toBe(2);
    expect(s.rep).toBe(9);
    expect(s.fila.length).toBe(0);
    expect((await page.evaluate(() => window.__loja.loja.resultado())).ok).toBe(false);
    expect(errors).toEqual([]);
  });

  test('escolher outro item da lista muda o que será vendido', async ({ page }) => {
    const errors = await openGame(page);
    await prepararLoja(page, { advId: 'clerigo_viajante', pedido: { tipo: 'surpresa' }, aceitar: true });
    const n = await page.evaluate(() => Object.keys(window.__loja.state().estoque).length);
    expect(n).toBeGreaterThan(2);
    const primeira = await page.evaluate(() => window.__loja.loja.selecionada());
    await clicar(page, await page.evaluate(() => window.__loja.loja.opcaoCentro(1)));
    await pronta(page);
    const segunda = await page.evaluate(() => window.__loja.loja.selecionada());
    expect(segunda).not.toBe(primeira);
    await clicar(page, await page.evaluate(() => window.__loja.loja.precoCentro('justo')));
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.stats.vendas).toBe(1);
    expect(s.estoque[primeira]).toBe(({ 'pao_aventureiro:1': 4, 'pocao_cura:1': 3, 'adaga_bronze:1': 2, 'escudo_madeira:1': 1, 'ensopado:1': 2, 'anel_cobre:1': 1, 'arco_curto:1': 1 })[primeira]);   // o primeiro não foi vendido
    expect(errors).toEqual([]);
  });

  test('cliente sem nada no estoque que sirva: dá para dispensar', async ({ page }) => {
    const errors = await openGame(page);
    await prepararLoja(page, { advId: 'maga_estudante', pedido: { tipo: 'categoria', cat: 'magia' } });   // não há magia no estoque inicial
    expect(await page.evaluate(() => window.__loja.loja.precoCentro('justo'))).toBeNull();
    await page.screenshot({ path: shotPath('portrait-sem-estoque') });
    await clicar(page, await page.evaluate(() => window.__loja.loja.dispensarCentro()));
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.fila.length).toBe(0);
    expect(s.stats.recusas).toBe(1);
    expect(errors).toEqual([]);
  });

  test('tocar num cliente da fila o coloca na frente', async ({ page }) => {
    const errors = await openGame(page);
    await prepararLoja(page, { advId: 'aprendiz_guerreiro', pedido: { tipo: 'surpresa' } });
    await page.evaluate(() => { window.__loja.addClient('bardo_cantor'); window.__loja.loja.renderAgora(); });
    await page.waitForTimeout(100);
    const antes = await page.evaluate(() => window.__loja.state().fila.map((c) => c.adv));
    expect(antes).toEqual(['aprendiz_guerreiro', 'bardo_cantor']);
    await clicar(page, await page.evaluate(() => window.__loja.loja.filaCentro(1)));
    expect(await page.evaluate(() => window.__loja.state().fila.map((c) => c.adv))).toEqual(['bardo_cantor', 'aprendiz_guerreiro']);
    expect(errors).toEqual([]);
  });
});

test.describe('paisagem', () => {
  test.use({ viewport: VIEWPORTS.landscape });

  test('duas colunas: cena à esquerda, atendimento à direita, e dá para vender', async ({ page }) => {
    const errors = await openGame(page);
    await prepararLoja(page, { advId: 'arqueira_novata', pedido: { tipo: 'item', item: 'arco_curto' }, aceitar: true });
    await page.screenshot({ path: shotPath('landscape-atendimento') });
    const p = await page.evaluate(() => window.__loja.loja.precoCentro('barato'));
    expect(p).toBeTruthy();
    await clicar(page, p);
    expect((await page.evaluate(() => window.__loja.state().stats.vendas))).toBe(1);
    expect(errors).toEqual([]);
  });
});

test.describe('desktop', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('layout largo com cliente e fila', async ({ page }) => {
    const errors = await openGame(page);
    await prepararLoja(page, { advId: 'bardo_cantor', pedido: { tipo: 'categoria', cat: 'acessorios' } });
    await page.evaluate(() => { window.__loja.addClient('ladino_sorrateiro'); window.__loja.addClient('maga_estudante'); window.__loja.loja.renderAgora(); });
    await page.waitForTimeout(150);
    await page.screenshot({ path: shotPath('desktop-atendimento') });
    expect(errors).toEqual([]);
  });
});
