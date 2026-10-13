import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.loja.pronta(), null, { timeout: 10_000 });

for (const [nome, vp] of Object.entries(VIEWPORTS)) {
  test.describe(nome, () => {
    test.use({ viewport: vp });

    test('o cartão de objetivo aparece discreto, mostra o progresso e leva à aba certa ao tocar', async ({ page }) => {
      const errors = await openGame(page);
      await page.evaluate(() => { window.__loja.clearQueue(); window.__loja.state().ouro = 50; window.__loja.loja.renderAgora(); });
      await pronta(page);
      const o = await page.evaluate(() => window.__loja.loja.objetivo());
      expect(o, 'há um objetivo').toBeTruthy();
      expect(o.pronto).toBe(false);
      await page.screenshot({ path: shotPath(`objetivo-${nome}`) });

      // com ouro de sobra fica "Pronto!" e tocar leva à aba da compra
      await page.evaluate(() => { window.__loja.state().ouro = 5000; window.__loja.loja.renderAgora(); });
      await pronta(page);
      const pronto = await page.evaluate(() => window.__loja.loja.objetivo());
      expect(pronto.pronto).toBe(true);
      await page.screenshot({ path: shotPath(`objetivo-pronto-${nome}`) });
      const c = await page.evaluate(() => window.__loja.loja.objetivoCentro());
      expect(c).toBeTruthy();
      await page.mouse.click(c.x, c.y);
      await expect.poll(() => page.evaluate(() => window.__loja.tab())).toBe(pronto.aba);
      expect(errors).toEqual([]);
    });
  });
}

test('o cartão não aparece durante a introdução do tutorial', async ({ page }) => {
  await page.goto('/?semconquistas&hoje=2026-08-04');
  await page.waitForFunction(() => window.__loja?.ready, null, { timeout: 20_000 });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__loja.loja.objetivo())).toBeNull();
  await quadros(page, 2);
});

// o botão do objetivo tem que estar inteiro à vista, dentro da área da tela, e destacado
async function conferirDestaque(page, tela) {
  await expect.poll(() => page.evaluate(() => window.__loja.destaque.alvo()), { timeout: 5_000, message: 'o destaque liga' }).toBeTruthy();
  const alvo = await page.evaluate(() => window.__loja.destaque.alvo());
  await expect.poll(async () => page.evaluate(([t, n]) => {
    const r = window.__loja[t].retangulo(n);
    const topo = 60;                                  // abaixo da barra do topo
    const base = window.innerHeight - 80;             // acima das abas
    return !!r && r.y >= topo && r.y + r.h <= base;
  }, [tela, alvo]), { timeout: 8_000, message: `o botão ${alvo} fica à vista` }).toBe(true);
  return alvo;
}

test.describe('o toque abre exatamente onde está o que dá para comprar', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('ofício: abre a Oficina no ofício certo e destaca o botão de desbloquear', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.clearQueue(); window.__loja.state().ouro = 5000; window.__loja.loja.renderAgora(); });
    await pronta(page);
    const o = await page.evaluate(() => window.__loja.loja.objetivo());
    expect(o.tipo).toBe('oficio');
    const c = await page.evaluate(() => window.__loja.loja.objetivoCentro());
    await page.mouse.click(c.x, c.y);
    await expect.poll(() => page.evaluate(() => window.__loja.tab())).toBe('oficina');
    await expect.poll(() => page.evaluate(() => window.__loja.oficina.oficioSelecionado())).toBe(o.oficio);
    expect(await conferirDestaque(page, 'oficina')).toBe('desbloquear');
    await page.screenshot({ path: shotPath('objetivo-destaque-oficio') });
    expect(errors).toEqual([]);
  });

  test('melhoria no fundo da lista: abre a sub-aba, rola até ela e destaca o botão de compra', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      const L = window.__loja;
      const g = L.game;
      L.clearQueue();
      g.state.ouro = 1e7;
      L.addRep(1e6);
      for (const m of g.data.listas.melhorias) if (m.grupo === 'loja' && m.id !== 'ampliar_4') g.state.melhorias[m.id] = true;
      for (const x of g.data.meta.oficios) g.state.oficios[x.id] = { nivel: 1, xp: 0 };
      for (const f of Object.keys(g.data.equipe)) g.state.equipe[f] = { nivel: g.data.equipe[f].niveis.length };
      g.state.melhorias.ampliar_4 = false;
      L.loja.renderAgora();
    });
    await pronta(page);
    const o = await page.evaluate(() => window.__loja.loja.objetivo());
    expect(o.tipo).toBe('melhoria');
    const c = await page.evaluate(() => window.__loja.loja.objetivoCentro());
    await page.mouse.click(c.x, c.y);
    await expect.poll(() => page.evaluate(() => window.__loja.tab())).toBe('melhorias');
    const alvo = await conferirDestaque(page, 'melhorias');
    expect(alvo).toBe(o.alvo);
    await page.screenshot({ path: shotPath('objetivo-destaque-melhoria') });
    expect(errors).toEqual([]);
  });

  test('funcionário: abre a Equipe e destaca o botão de contratar', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      const L = window.__loja; const g = L.game;
      L.clearQueue(); g.state.ouro = 1e7; L.addRep(1e6);
      for (const m of g.data.listas.melhorias) g.state.melhorias[m.id] = true;
      for (const x of g.data.meta.oficios) g.state.oficios[x.id] = { nivel: 1, xp: 0 };
      L.loja.renderAgora();
    });
    await pronta(page);
    const o = await page.evaluate(() => window.__loja.loja.objetivo());
    expect(o.tipo).toBe('equipe');
    const c = await page.evaluate(() => window.__loja.loja.objetivoCentro());
    await page.mouse.click(c.x, c.y);
    await expect.poll(() => page.evaluate(() => window.__loja.tab())).toBe('melhorias');
    await expect.poll(() => page.evaluate(() => window.__loja.melhorias.sub())).toBe('equipe');
    expect(await conferirDestaque(page, 'melhorias')).toBe(o.alvo);
    expect(errors).toEqual([]);
  });

  test('objetivo de reputação: não troca de aba, só explica quanto falta', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      const L = window.__loja; const g = L.game;
      L.clearQueue(); g.state.ouro = 0;
      for (const m of g.data.listas.melhorias) if ((m.nivelRep ?? 1) <= 1) g.state.melhorias[m.id] = true;
      for (const x of g.data.meta.oficios) if (x.nivelRep <= 1) g.state.oficios[x.id] = { nivel: 1, xp: 0 };
      L.loja.renderAgora();
    });
    await pronta(page);
    expect((await page.evaluate(() => window.__loja.loja.objetivo())).tipo).toBe('nivel');
    const c = await page.evaluate(() => window.__loja.loja.objetivoCentro());
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__loja.tab())).toBe('loja');
    expect(await page.evaluate(() => window.__loja.destaque.alvo())).toBeNull();
    expect(errors).toEqual([]);
  });
});
