import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

const prontaAv = (page) => page.waitForFunction(() => window.__loja.aventureiros.pronta(), null, { timeout: 10_000 });
async function abrirHoje(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(3));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'aventureiros');
  await prontaAv(page);
  await quadros(page, 3);
}
const clicar = async (page, nome) => {
  await ver(page, 'aventureiros', nome);
  const p = await page.evaluate((n) => window.__loja.aventureiros.centro(n), nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await prontaAv(page);
  await quadros(page, 3);
};

test.describe('hoje (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('a aba abre em "Hoje" com sequência, especial, encomendas e metas; o aviso some ao coletar o bônus', async ({ page }) => {
    const errors = await openGame(page);
    expect(await page.evaluate(() => window.__loja.avisoAventureiros())).toBe(true);      // bônus do dia esperando
    await abrirHoje(page);
    expect(await page.evaluate(() => window.__loja.aventureiros.sub())).toBe('hoje');
    await page.screenshot({ path: shotPath('portrait-hoje') });
    const ouro = await page.evaluate(() => window.__loja.state().ouro);
    await clicar(page, 'bonus');
    expect(await page.evaluate(() => window.__loja.state().ouro)).toBeGreaterThan(ouro);
    expect(await page.evaluate(() => window.__loja.state().diario.bonusColetado)).toBe(true);
    expect(await page.evaluate(() => window.__loja.avisoAventureiros())).toBe(false);
    await page.screenshot({ path: shotPath('portrait-hoje-coletado') });
    expect(errors).toEqual([]);
  });

  test('entregar uma encomenda gasta os itens e paga', async ({ page }) => {
    const errors = await openGame(page);
    const enc = await page.evaluate(() => window.__loja.state().diario.encomendas[0]);
    await page.evaluate((e) => { window.__loja.state().estoque = {}; window.__loja.giveItem(e.item, Math.max(1, e.qualidadeMin), e.qtd); }, enc);
    await abrirHoje(page);
    const ouro = await page.evaluate(() => window.__loja.state().ouro);
    await clicar(page, 'entregar:0');
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.diario.encomendas[0].entregue).toBe(true);
    expect(s.ouro).toBe(ouro + enc.ouro);
    expect(s.stats.encomendas).toBe(1);
    await page.screenshot({ path: shotPath('portrait-hoje-entregue') });
    expect(errors).toEqual([]);
  });

  test('sem os itens, entregar não faz nada', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.state().estoque = {}; });
    await abrirHoje(page);
    await clicar(page, 'entregar:1');
    expect(await page.evaluate(() => window.__loja.state().diario.encomendas[1].entregue)).toBe(false);
    expect(errors).toEqual([]);
  });

  test('cumprir uma meta da semana libera o baú, que abre uma vez', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      const L = window.__loja;
      const m = L.state().semanal.metas[0];
      const stat = { vender: 'vendas', produzir: 'produzidos', ganhar: 'ouroTotal', encomendas: 'encomendas', comprar: 'comprados', expedicoes: 'expedicoes' }[m.id];
      L.state().stats[stat] = (L.state().stats[stat] ?? 0) + m.alvo;
      L.game.emit('estoque');
    });
    await abrirHoje(page);
    await page.waitForTimeout(300);
    await ver(page, 'aventureiros', 'bau');
    await page.screenshot({ path: shotPath('portrait-hoje-meta') });
    const ouro = await page.evaluate(() => window.__loja.state().ouro);
    await clicar(page, 'bau');
    expect(await page.evaluate(() => window.__loja.state().semanal.bauAberto)).toBe(true);
    expect(await page.evaluate(() => window.__loja.state().ouro)).toBeGreaterThan(ouro);
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
    await page.screenshot({ path: shotPath('portrait-bau') });
    expect(errors).toEqual([]);
  });

  test('virar o dia traz encomendas novas e renova o bônus; faltar um dia mantém a sequência (perdão)', async ({ page }) => {
    const errors = await openGame(page);
    const antes = await page.evaluate(() => window.__loja.state().diario.encomendas.map((e) => e.item).join());
    await page.evaluate(() => window.__loja.setDay('2026-08-06'));        // pulou o dia 5
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.sequencia.dias).toBe(2);
    expect(s.sequencia.perdao.usados).toBe(1);
    expect(s.diario.data).toBe('2026-08-06');
    expect(s.diario.bonusColetado).toBe(false);
    expect(s.diario.encomendas.map((e) => e.item).join()).not.toBe(antes);
    expect(errors).toEqual([]);
  });
});

test.describe('sazonal', () => {
  test.use({ viewport: VIEWPORTS.portrait });
  test('no Inverno Festivo aparece o banner e o efeito vale', async ({ page }) => {
    const errors = await openGame(page, { hoje: '2026-12-25' });
    expect(await page.evaluate(() => window.__loja.game.mods.chegada)).toBeCloseTo(1.2, 5);
    await abrirHoje(page);
    await page.screenshot({ path: shotPath('portrait-hoje-sazonal') });
    await page.evaluate(() => window.__loja.loja.renderAgora());
    expect(errors).toEqual([]);
  });
});

for (const vp of ['landscape', 'desktop']) {
  test.describe(`hoje (${vp})`, () => {
    test.use({ viewport: VIEWPORTS[vp] });
    test('abre e coleta o bônus', async ({ page }) => {
      const errors = await openGame(page);
      await abrirHoje(page);
      await page.screenshot({ path: shotPath(`${vp}-hoje`) });
      await clicar(page, 'bonus');
      expect(await page.evaluate(() => window.__loja.state().diario.bonusColetado)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}
