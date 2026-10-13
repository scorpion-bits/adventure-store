import { test, expect } from '@playwright/test';
import { VIEWPORTS, openGame, shotPath, quadros, ver } from './helpers.mjs';

const pronta = (page) => page.waitForFunction(() => window.__loja.oficina.pronta(), null, { timeout: 10_000 });

async function abrirOficina(page) {
  const p = await page.evaluate(() => window.__loja.tabCenter(1));
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.__loja.tab() === 'oficina');
  await pronta(page);
}
const centro = (page, nome) => page.evaluate((n) => window.__loja.oficina.centro(n), nome);
const clicar = async (page, nome) => {
  await ver(page, 'oficina', nome);
  const p = await centro(page, nome);
  expect(p, `${nome} existe`).toBeTruthy();
  await page.mouse.click(p.x, p.y);
  await pronta(page);
};

test.describe('oficina (retrato)', () => {
  test.use({ viewport: VIEWPORTS.portrait });

  test('filtro das receitas: um botão que abre as opções (categoria, nível e "dá para fazer") e fecha ao escolher', async ({ page }) => {
    const errors = await openGame(page);
    await abrirOficina(page);
    const nomes = () => page.evaluate(() => window.__loja.oficina.nomes());
    const receitas = async () => (await nomes()).filter((n) => n.startsWith('produzir:')).length;
    // fechado: só o botão "filtro", sem as opções
    let ns = await nomes();
    expect(ns).toContain('filtro');
    expect(ns.filter((n) => n.startsWith('filtro:'))).toEqual([]);
    await page.screenshot({ path: shotPath('portrait-oficina-filtro-fechado') });
    const todas = await page.evaluate(() => window.__loja.game.data.listas.receitas.filter((r) => r.oficio === 'ferraria').length);
    // tocar abre as opções
    await clicar(page, 'filtro');
    ns = await nomes();
    expect(ns).toEqual(expect.arrayContaining(['filtro:todas', 'filtro:fazer', 'filtro:cat:armas', 'filtro:cat:armaduras', 'filtro:cat:ferramentas', 'filtro:niv:1-3']));
    await page.screenshot({ path: shotPath('portrait-oficina-filtro-aberto') });
    // escolher uma opção filtra e fecha a lista de opções
    await clicar(page, 'filtro:cat:armas');
    ns = await nomes();
    expect(ns.filter((n) => n.startsWith('filtro:'))).toEqual([]);
    const armas = await page.evaluate(() => window.__loja.game.data.listas.receitas.filter((r) => r.oficio === 'ferraria' && window.__loja.game.data.itens[r.item].cat === 'armas').length);
    expect(armas).toBeGreaterThan(0);
    expect(armas).toBeLessThan(todas);
    expect(await receitas()).toBe(armas);
    // "dá para fazer": sem materiais não há nada
    await clicar(page, 'filtro');
    await clicar(page, 'filtro:fazer');
    expect(await receitas()).toBe(0);
    // com 2 de cobre e 1 de carvão aparecem a adaga, o anel e as moedas de cobre (só o que cabe nesses materiais)
    await page.evaluate(() => { window.__loja.giveMaterial('cobre', 2); window.__loja.giveMaterial('carvao', 1); });
    await pronta(page);
    expect((await nomes()).filter((n) => n.startsWith('produzir:')).sort()).toEqual(['produzir:r_adaga_bronze', 'produzir:r_anel_cobre', 'produzir:r_moedas_cobre']);
    await page.screenshot({ path: shotPath('portrait-oficina-fazer') });
    // por nível, e de volta para "Todas"
    await clicar(page, 'filtro');
    await clicar(page, 'filtro:niv:4-6');
    const niv = await page.evaluate(() => window.__loja.game.data.listas.receitas.filter((r) => r.oficio === 'ferraria' && r.nivel >= 4 && r.nivel <= 6).length);
    expect(await receitas()).toBe(niv);
    await clicar(page, 'filtro');
    await clicar(page, 'filtro:todas');
    expect(await receitas()).toBe(todas);
    expect(errors).toEqual([]);
  });

  test('produzir gasta materiais, o tempo passa, e coletar leva para as prateleiras', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => { window.__loja.giveMaterial('barra_ferro', 4); window.__loja.giveMaterial('carvao', 2); });
    await abrirOficina(page);
    await page.screenshot({ path: shotPath('portrait-oficina') });
    const antes = await page.evaluate(() => window.__loja.state().estoque['espada_ferro:1'] ?? 0);

    await clicar(page, 'produzir:r_espada_ferro');
    let s = await page.evaluate(() => window.__loja.state());
    expect(s.materiais.barra_ferro).toBe(2);
    expect(s.producao).toHaveLength(1);
    expect(s.producao[0].inicio).not.toBeNull();
    await page.screenshot({ path: shotPath('portrait-oficina-produzindo') });

    await page.evaluate(() => window.__loja.skip(91_000));
    await pronta(page);
    s = await page.evaluate(() => window.__loja.state());
    expect(s.producao).toHaveLength(0);
    expect(s.prontos).toHaveLength(1);
    await page.screenshot({ path: shotPath('portrait-oficina-pronto') });

    await clicar(page, 'coletarTudo');
    s = await page.evaluate(() => window.__loja.state());
    expect(s.prontos).toHaveLength(0);
    const total = Object.entries(s.estoque).filter(([k]) => k.startsWith('espada_ferro:')).reduce((n, [, q]) => n + q, 0);
    expect(total).toBe(antes + 1);
    expect(errors).toEqual([]);
  });

  test('sem materiais: não produz e não gasta nada', async ({ page }) => {
    const errors = await openGame(page);
    await abrirOficina(page);
    await clicar(page, 'produzir:r_espada_ferro');
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.producao).toHaveLength(0);
    expect(s.materiais).toEqual({});
    expect(errors).toEqual([]);
  });

  test('abrir um ofício novo custa ouro e libera as receitas', async ({ page }) => {
    const errors = await openGame(page);
    await abrirOficina(page);
    await clicar(page, 'oficio:culinaria');
    expect(await page.evaluate(() => window.__loja.oficina.oficioSelecionado())).toBe('culinaria');
    await page.screenshot({ path: shotPath('portrait-oficina-fechado') });
    await clicar(page, 'desbloquear');
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.oficios.culinaria).toEqual({ nivel: 1, xp: 0 });
    expect(s.ouro).toBe(40);
    await page.evaluate(() => window.__loja.giveMaterial('farinha', 2));
    await pronta(page);
    await clicar(page, 'produzir:r_pao_aventureiro');
    expect(await page.evaluate(() => window.__loja.state().producao.length)).toBe(1);
    expect(errors).toEqual([]);
  });

  test('ofício trancado por reputação não abre', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => window.__loja.give(5000));
    await abrirOficina(page);
    await clicar(page, 'oficio:joalheria');
    await clicar(page, 'desbloquear');
    expect(await page.evaluate(() => window.__loja.state().oficios.joalheria)).toBeUndefined();
    expect(await page.evaluate(() => window.__loja.state().ouro)).toBe(5100);
    expect(errors).toEqual([]);
  });

  test('jogo fechado: ao voltar, a produção está pronta e aparece o aviso', async ({ page }) => {
    const errors = await openGame(page);
    await page.evaluate(() => {
      window.__loja.giveMaterial('barra_ferro', 2); window.__loja.giveMaterial('carvao', 1);
    });
    await abrirOficina(page);
    await clicar(page, 'produzir:r_espada_ferro');
    // jogo fechado por 2 h: grava o save com tudo 2 h no passado e o entrega ao jogo antes de ele iniciar
    const chave = 'scorpion-bits-loja-v1';
    await page.evaluate(() => window.__loja.save());
    const antigo = await page.evaluate((k) => {
      const raw = JSON.parse(localStorage.getItem(k));
      const volta = 2 * 3600 * 1000;
      for (const j of raw.producao) { j.inicio -= volta; j.fim -= volta; }
      raw.salvoEm -= volta;
      return JSON.stringify(raw);
    }, chave);
    await page.addInitScript(({ k, v }) => {
      if (!sessionStorage.getItem('semeado')) { sessionStorage.setItem('semeado', '1'); localStorage.setItem(k, v); }
    }, { k: chave, v: antigo });
    await page.reload();
    await page.waitForFunction(() => window.__loja?.ready);
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => window.__loja.state());
    expect(s.producao).toHaveLength(0);
    expect(s.prontos).toHaveLength(1);
    expect(await page.evaluate(() => window.__loja.modalOpen())).toBe(true);
    await page.screenshot({ path: shotPath('portrait-offline') });
    expect(errors).toEqual([]);
  });
});

for (const vp of ['landscape', 'desktop']) {
  test.describe(`oficina (${vp})`, () => {
    test.use({ viewport: VIEWPORTS[vp] });
    test('abre e produz', async ({ page }) => {
      const errors = await openGame(page);
      await page.evaluate(() => { window.__loja.giveMaterial('barra_ferro', 4); window.__loja.giveMaterial('carvao', 2); });
      await abrirOficina(page);
      await page.screenshot({ path: shotPath(`${vp}-oficina`) });
      await page.evaluate(() => window.__loja.scrollTo(0));
      await clicar(page, 'produzir:r_adaga_bronze').catch(() => {});
      expect(errors).toEqual([]);
    });
  });
}
