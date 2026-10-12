import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.melhorias.pronta(), null, { timeout: 10_000 });

async function abrirMelhorias(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(4));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'melhorias');
  await pronta(page);
}
const clicar = async (page, nome) => {
  await quadros(page);
  const p = await page.evaluate((n) => window.__loja.melhorias.centro(n), nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await pronta(page);
  await quadros(page);
};

test.describe('melhorias (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('comprar uma melhoria gasta ouro, aplica o efeito e marca como comprada', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMelhorias(page);
    await page.screenshot({ path: shotPath('portrait-melhorias') });
    const antes = await page.evaluate(() => window.__loja.state().ouro);
    await clicar(page, 'comprar:prateleiras_1');                // custa 100: é o que dá para pagar no começo
    const s = await page.evaluate(() => ({ ouro: window.__loja.state().ouro, m: window.__loja.state().melhorias, cap: window.__loja.game.mods.capacidade }));
    expect(s.m.prateleiras_1).toBe(true);
    expect(s.ouro).toBe(antes - 100);
    expect(s.cap).toBe(10);
    expect(await page.evaluate(() => window.__loja.melhorias.centro('comprar:prateleiras_1'))).toBeNull();   // some o botão
    await page.screenshot({ path: shotPath('portrait-melhorias-comprou') });
    expect(errors).toEqual([]);
  });

  test('sem ouro suficiente, tocar na melhoria não compra nada', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMelhorias(page);
    await clicar(page, 'comprar:ampliar_1');                    // custa 120 e o jogador tem 100
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.melhorias.ampliar_1).toBeUndefined();
    expect(s.ouro).toBe(100);
    expect(errors).toEqual([]);
  });

  test('melhoria bloqueada por requisito não é comprada mesmo com ouro', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => window.__loja.give(100000));
    await abrirMelhorias(page);
    await page.evaluate(() => window.__loja.scrollTo(1e6));
    await quadros(page);
    const antes = await page.evaluate(() => window.__loja.state().ouro);
    await clicar(page, 'comprar:ampliar_2');                 // requer ampliar_1
    expect(await page.evaluate(() => window.__loja.state().melhorias.ampliar_2)).toBeUndefined();
    expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(antes);
    expect(errors).toEqual([]);
  });

  test('equipe: contratar e promover o atendente', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.give(5000); window.__loja.addRep(1e6); });
    await abrirMelhorias(page);
    await clicar(page, 'sub:equipe');
    await page.screenshot({ path: shotPath('portrait-equipe') });
    await clicar(page, 'contratar:atendente');
    expect(await page.evaluate(() => window.__loja.state().equipe.atendente.nivel)).toBe(1);
    expect(await page.evaluate(() => window.__loja.game.mods.atendente)).toBe(30);
    await clicar(page, 'contratar:atendente');
    expect(await page.evaluate(() => window.__loja.state().equipe.atendente.nivel)).toBe(2);
    expect(await page.evaluate(() => window.__loja.game.mods.atendente)).toBe(24);
    expect(errors).toEqual([]);
  });

  test('decoração: comprar muda o tema da loja', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.give(5000); window.__loja.addRep(1e6); });
    await abrirMelhorias(page);
    await page.evaluate(() => window.__loja.scrollTo(1e6));
    await quadros(page);
    await clicar(page, 'comprar-tema:taverna');
    expect(await page.evaluate(() => window.__loja.state().loja.tema)).toBe('taverna');
    await clicar(page, 'usar:rustico');
    expect(await page.evaluate(() => window.__loja.state().loja.tema)).toBe('rustico');
    const p = await page.evaluate(() => window.__loja.tabCenter(0));
    await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => window.__loja.tab() === 'loja');
    await quadros(page);
    await page.screenshot({ path: shotPath('portrait-loja-tema') });
    expect(errors).toEqual([]);
  });

  test('árvore de ofício: escolher o ofício e comprar a primeira melhoria', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => window.__loja.give(1000));
    await abrirMelhorias(page);
    await clicar(page, 'sub:oficios');
    await clicar(page, 'oficio:culinaria');
    await page.screenshot({ path: shotPath('portrait-oficios-melhorias') });
    await clicar(page, 'comprar:culinaria_vel1');
    expect(await page.evaluate(() => window.__loja.state().melhorias.culinaria_vel1)).toBe(true);
    expect(await page.evaluate(() => window.__loja.game.mods.velocidadeOficina.culinaria)).toBeCloseTo(1.1, 5);
    expect(errors).toEqual([]);
  });

  test('conquistas e expandir mostram o que vem aí', async ({ page }) => {
    const errors = await openGame(page);
    await abrirMelhorias(page);
    await clicar(page, 'sub:conquistas');
    expect(await page.evaluate(() => window.__loja.melhorias.sub())).toBe('conquistas');
    await clicar(page, 'sub:expandir');
    expect(await page.evaluate(() => window.__loja.melhorias.sub())).toBe('expandir');
    expect(errors).toEqual([]);
  });
});

for (const vp of ['landscape', 'desktop']) {
  test.describe(`melhorias (${vp})`, () => {
    test.use({ viewport: VIEWPORTS[vp] });
    test('abre e compra', async ({ page }) => {
      const errors = await openGame(page);
      await abrirMelhorias(page);
      await page.screenshot({ path: shotPath(`${vp}-melhorias`) });
      await clicar(page, 'sub:equipe');
      await page.screenshot({ path: shotPath(`${vp}-equipe`) });
      expect(errors).toEqual([]);
    });
  });
}
