import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { loadState, saveState } from '../../src/core/save.js';
import { repParaNivel } from '../../src/core/economy.js';
import {
  produzir, podeProduzir, avancarProducao, coletar, desbloquearOficio, chancesQualidade, xpParaNivel,
  slotsDe, emProducao, naFila, totalProntos, faltando, progressoOficio, duracaoDe,
} from '../../src/core/craft.js';

const T0 = new Date(2026, 9, 12, 12).getTime();
const novo = (mexer, seed = 1) => {
  const clock = createClock(T0);
  const state = defaultState(clock.now());
  state.materiais = { barra_ferro: 20, carvao: 20, cobre: 20, madeira: 20, farinha: 20, erva_curativa: 20 };
  mexer?.(state);
  return { game: createGame({ state, clock, rng: createRng(seed) }), clock };
};
const espada = 'r_espada_ferro';          // ferraria, 90 s, 2 barras de ferro + 1 carvão
const SEG = 1000;

test('produzir gasta os materiais na hora e começa se houver slot livre', () => {
  const { game } = novo();
  const r = produzir(game, espada);
  assert.equal(r.ok, true);
  assert.equal(game.state.materiais.barra_ferro, 18);
  assert.equal(game.state.materiais.carvao, 19);
  assert.equal(emProducao(game, 'ferraria').length, 1);
  assert.equal(r.job.fim - r.job.inicio, 90 * SEG);
});

test('sem materiais não produz e diz o que falta; nada é gasto', () => {
  const { game } = novo((s) => { s.materiais = { barra_ferro: 1 }; });
  const r = produzir(game, espada);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'materiais');
  assert.deepEqual(r.falta, { barra_ferro: 1, carvao: 1 });
  assert.deepEqual(faltando(game, game.data.receitas[espada]), { barra_ferro: 1, carvao: 1 });
  assert.equal(game.state.materiais.barra_ferro, 1);
  assert.equal(game.state.producao.length, 0);
});

test('ofício fechado, nível insuficiente e receita inexistente', () => {
  const { game } = novo();
  assert.equal(podeProduzir(game, 'r_pocao_cura').motivo, 'oficio-fechado');
  game.state.oficios.alquimia = { nivel: 1, xp: 0 };
  assert.equal(podeProduzir(game, 'r_pocao_cura').ok, true);
  game.data.receitas.r_teste = { id: 'r_teste', item: 'espada_ferro', oficio: 'ferraria', nivel: 3, tempo: 10, materiais: { carvao: 1 } };
  assert.equal(podeProduzir(game, 'r_teste').motivo, 'nivel');
  delete game.data.receitas.r_teste;
  assert.equal(podeProduzir(game, 'nao_existe').motivo, 'inexistente');
});

test('a fila respeita slot + espera: 1 rodando e 2 esperando; a 4ª é recusada', () => {
  const { game } = novo();
  for (let i = 0; i < 3; i++) assert.equal(produzir(game, espada).ok, true, `produção ${i + 1}`);
  assert.equal(emProducao(game, 'ferraria').length, 1);
  assert.equal(naFila(game, 'ferraria').length, 2);
  assert.equal(produzir(game, espada).motivo, 'fila-cheia');
  assert.equal(game.state.materiais.barra_ferro, 14, 'a recusada não gastou material');
  game.mods.slots = { ferraria: 1 };
  assert.equal(slotsDe(game, 'ferraria'), 2);
});

test('o tempo passa: termina na hora certa e o próximo começa quando o anterior acabou', () => {
  const { game, clock } = novo();
  produzir(game, espada); produzir(game, espada); produzir(game, espada);
  clock.advance(89 * SEG); avancarProducao(game);
  assert.equal(game.state.prontos.length, 0);
  clock.advance(1 * SEG); avancarProducao(game);
  assert.equal(game.state.prontos.length, 1);
  const [segundo] = emProducao(game, 'ferraria');
  assert.equal(segundo.inicio, T0 + 90 * SEG, 'começou quando o primeiro terminou');
  assert.equal(segundo.fim, T0 + 180 * SEG);
});

test('jogo fechado: ao voltar, tudo que deu tempo está pronto, mesmo com a fila inteira vencida', () => {
  const { game, clock } = novo();
  produzir(game, espada); produzir(game, espada); produzir(game, espada);
  clock.advance(8 * 3600 * SEG);                     // 8 horas depois
  avancarProducao(game);
  assert.equal(game.state.prontos.length, 3);
  assert.equal(game.state.producao.length, 0);
  assert.deepEqual(game.state.prontos.map((p) => p.fim), [T0 + 90 * SEG, T0 + 180 * SEG, T0 + 270 * SEG]);
  assert.equal(totalProntos(game), 3);
});

test('o save guarda a produção e ela continua depois de recarregar', () => {
  const { game, clock } = novo();
  produzir(game, espada); produzir(game, espada);
  const mem = {};
  const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  saveState(st, game.state, clock.now());
  clock.advance(500 * SEG);
  const { state } = loadState(st, clock.now());
  const g2 = createGame({ state, clock, rng: createRng(2) });
  avancarProducao(g2);
  assert.equal(g2.state.prontos.length, 2);
  assert.equal(g2.state.producao.length, 0);
});

test('coletar leva para a prateleira, com a qualidade sorteada', () => {
  const { game, clock } = novo((s) => { s.estoque = {}; });
  produzir(game, 'r_pocao_cura');                   // alquimia fechada: não produz
  game.state.oficios.alquimia = { nivel: 1, xp: 0 };
  produzir(game, 'r_pocao_cura');
  clock.advance(60 * SEG); avancarProducao(game);
  assert.equal(totalProntos(game), 2);              // a receita rende 2 poções
  const avisos = [];
  game.on('coletou', (l) => avisos.push(l));
  const { itens } = coletar(game);
  assert.equal(itens.reduce((n, i) => n + i.qtd, 0), 2);
  const na = Object.entries(game.state.estoque).filter(([k]) => k.startsWith('pocao_cura:'));
  assert.equal(na.reduce((n, [, q]) => n + q, 0), 2);
  assert.equal(game.state.prontos.length, 0);
  assert.equal(avisos.length, 1);
  assert.equal(coletar(game).itens.length, 0);
});

test('coletar um só pelo uid deixa os outros', () => {
  const { game, clock } = novo((s) => { s.estoque = {}; });
  produzir(game, espada); produzir(game, 'r_picareta_ferro');
  clock.advance(200 * SEG); avancarProducao(game);
  assert.equal(game.state.prontos.length, 2);
  coletar(game, game.state.prontos[0].uid);
  assert.equal(game.state.prontos.length, 1);
});

test('experiência e nível do ofício sobem produzindo', () => {
  const { game, clock } = novo();
  const niveis = [];
  game.on('nivelOficio', (e) => niveis.push(e.nivel));
  assert.equal(progressoOficio(game, 'ferraria'), 0);
  for (let i = 0; i < 12 && !niveis.length; i++) {
    produzir(game, espada);
    clock.advance(90 * SEG); avancarProducao(game);
  }
  assert.deepEqual(niveis, [2]);
  assert.equal(game.state.oficios.ferraria.nivel, 2);
  assert.ok(game.state.oficios.ferraria.xp >= xpParaNivel(game, 2));
});

test('qualidade melhora com o nível do ofício e as chances somam 1', () => {
  const { game } = novo();
  for (let n = 1; n <= 10; n++) {
    const p = chancesQualidade(game, n);
    assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-9, `nível ${n}`);
  }
  assert.equal(chancesQualidade(game, 1)[3], 0);
  assert.ok(chancesQualidade(game, 10)[3] > chancesQualidade(game, 5)[3]);
  assert.ok(chancesQualidade(game, 10)[0] < chancesQualidade(game, 1)[0]);
  game.mods.qualidade = 0.1;
  const comBonus = chancesQualidade(game, 1);
  assert.ok(comBonus[0] < 0.25 && comBonus[1] > 0);
  assert.ok(Math.abs(comBonus.reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test('as qualidades sorteadas seguem as chances (nível 10)', () => {
  const { game, clock } = novo((s) => { s.oficios.ferraria = { nivel: 10, xp: 1e6 }; s.materiais = { cobre: 1e5, carvao: 1e5 }; });
  game.data.receitas.r_lote = { id: 'r_lote', item: 'adaga_bronze', oficio: 'ferraria', nivel: 1, tempo: 1, materiais: { cobre: 1 }, qtd: 3000 };
  produzir(game, 'r_lote');
  clock.advance(5 * SEG); avancarProducao(game);
  const r = game.state.prontos[0].resultado;
  const p = chancesQualidade(game, 10);
  for (let q = 0; q < 4; q++) assert.ok(Math.abs((r[q] ?? 0) / 3000 - p[q]) < 0.04, `qualidade ${q}: ${(r[q] ?? 0) / 3000} vs ${p[q]}`);
  delete game.data.receitas.r_lote;
});

test('desbloquear ofício: custa ouro e exige reputação', () => {
  const { game } = novo();
  assert.equal(desbloquearOficio(game, 'ferraria').motivo, 'ja-aberto');
  game.state.ouro = 10;
  assert.equal(desbloquearOficio(game, 'culinaria').motivo, 'sem-ouro');
  assert.equal(game.state.ouro, 10);
  game.state.ouro = 1000;
  assert.equal(desbloquearOficio(game, 'joalheria').motivo, 'reputacao');
  assert.equal(game.state.ouro, 1000);
  const r = desbloquearOficio(game, 'culinaria');
  assert.equal(r.ok, true);
  assert.equal(game.state.ouro, 940);
  assert.deepEqual(game.state.oficios.culinaria, { nivel: 1, xp: 0 });
  game.state.ouro = 0; game.state.rep = repParaNivel(8);
  assert.equal(desbloquearOficio(game, 'joalheria').motivo, 'sem-ouro');
  assert.equal(desbloquearOficio(game, 'nao_existe').motivo, 'inexistente');
});

test('velocidade e coleta automática vindas de melhorias', () => {
  const { game, clock } = novo((s) => { s.estoque = {}; });
  game.mods.velocidadeOficina = { ferraria: 2 };
  assert.equal(duracaoDe(game, game.data.receitas[espada]), 45 * SEG);
  game.mods.autoColetar = true;
  produzir(game, espada);
  clock.advance(45 * SEG); avancarProducao(game);
  assert.equal(game.state.prontos.length, 0);
  assert.ok(Object.keys(game.state.estoque).some((k) => k.startsWith('espada_ferro:')));
});

test('o jogo avança a produção sozinho a cada tick', () => {
  const { game, clock } = novo();
  produzir(game, espada);
  clock.advance(100 * SEG);
  game.tick(16);
  assert.equal(game.state.prontos.length, 1);
});
