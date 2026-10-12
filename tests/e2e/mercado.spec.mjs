import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.mercado.pronta(), null, { timeout: 10_000 });

async function abrirMercado(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(2));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'mercado');
  await pronta(page);
}

const botao = async (page, f, m, tipo) => {
  await ver(page, 'mercado', `${f}:${m}:${tipo}`);
  return page.evaluate(([a, b, c]) => window.__loja.mercado.botaoCentro(a, b, c), [f, m, tipo]);
};
const clicar = async (page, p) => { expect(p).toBeTruthy(); await page.mouse.click(p.x, p.y); await pronta(page); };

test.describe('mercado (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('comprar +1 e +5 gasta ouro, enche o depósito e reduz o estoque do dia', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMercado(page);
    await page.screenshot({ path: shotPath('portrait-mercado') });
    const antes = await page.evaluate(() => window.__loja.state());
    expect(Object.keys(antes.materiais)).toHaveLength(0);

    await clicar(page, await botao(page, 'ferreiro_toras', 'madeira', 'x1'));
    await clicar(page, await botao(page, 'ferreiro_toras', 'madeira', 'x5'));
    const depois = await page.evaluate(() => window.__loja.state());
    expect(depois.materiais.madeira).toBe(6);
    expect(depois.ouro).toBeLessThan(antes.ouro);
    expect(depois.ouro).toBeGreaterThan(antes.ouro - 6 * 6);          // madeira custa ~4 ±15%
    expect(depois.mercado.comprado['ferreiro_toras:madeira']).toBe(6);
    await page.screenshot({ path: shotPath('portrait-mercado-comprou') });
    expect(errors).toEqual([]);
  });

  test('"Máx" compra o máximo possível e sem ouro não compra nada', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMercado(page);
    await clicar(page, await botao(page, 'mineradora_pedra', 'cobre', 'max'));
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.materiais.cobre).toBeGreaterThan(5);
    expect(s.ouro).toBeLessThan(5);                                   // gastou quase tudo
    const ouro = s.ouro;
    await clicar(page, await botao(page, 'mineradora_pedra', 'cobre', 'x1'));
    expect((await page.evaluate(() => window.__loja.state())).ouro).toBe(ouro);
    expect(errors).toEqual([]);
  });

  test('virar o dia renova o estoque do fornecedor', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => window.__loja.give(100000));
    await abrirMercado(page);
    await clicar(page, await botao(page, 'ferreiro_toras', 'carvao', 'max'));
    const comprado = await page.evaluate(() => window.__loja.state().mercado.comprado['ferreiro_toras:carvao']);
    expect(comprado).toBeGreaterThan(5);
    await page.evaluate(() => window.__loja.setDay('2099-05-06'));
    await pronta(page);
    expect(await page.evaluate(() => window.__loja.state().mercado.data)).not.toBe('');
    // o contador de compras zera no novo dia ao consultar as ofertas
    await clicar(page, await botao(page, 'ferreiro_toras', 'carvao', 'x1'));
    expect(await page.evaluate(() => window.__loja.state().mercado.comprado['ferreiro_toras:carvao'])).toBe(1);
    expect(errors).toEqual([]);
  });

  test('fornecedor de região trancada aparece como "Em breve", sem botões, e abre com a reputação', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      const f = { id: 'forn_teste', nome: 'Caçadores da Floresta', desc: 'Peles.', regiao: 'floresta', nivelRep: 1, vende: [{ material: 'pele_lobo', preco: 9, estoque: 10 }] };
      window.__loja.game.data.fornecedores[f.id] = f;
      window.__loja.game.data.listas.fornecedores.push(f);
    });
    await abrirMercado(page);
    expect(await page.evaluate(() => window.__loja.mercado.botaoCentro('forn_teste', 'pele_lobo', 'x1'))).toBeNull();
    await page.screenshot({ path: shotPath('portrait-mercado-bloqueado') });
    await page.evaluate(() => window.__loja.addRep(1e6));            // nível máximo: tudo abre
    await pronta(page);
    expect(await page.evaluate(() => window.__loja.mercado.botaoCentro('forn_teste', 'pele_lobo', 'x1'))).toBeTruthy();
    expect(errors).toEqual([]);
  });
});

test.describe('mercado (desktop e paisagem)', () => {
  for (const vp of ['landscape', 'desktop']) {
    test.describe(vp, () => {
      test.use({ viewport: VIEWPORTS[vp] });
      test(`abre e compra em ${vp}`, async ({ page }) => {
        const errors = await openGame(page);
        await abrirMercado(page);
        await page.screenshot({ path: shotPath(`${vp}-mercado`) });
        // rola até o botão (em telas baixas ele fica fora da vista) e compra
        const p = await botao(page, 'mineradora_pedra', 'cobre', 'x1');
        const h = page.viewportSize().height;
        expect(p.y, 'botão visível').toBeGreaterThan(0);
        expect(p.y).toBeLessThan(h - 60);
        await clicar(page, p);
        expect(await page.evaluate(() => window.__loja.state().materiais.cobre)).toBe(1);
        expect(errors).toEqual([]);
      });
    });
  }
});
