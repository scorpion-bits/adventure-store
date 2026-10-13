import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { DATA } from '../../src/data/index.js';
import { repParaNivel } from '../../src/core/economy.js';
import { ofertas, comprar, maxCompravel, deposito, fornecedorDisponivel, liberacaoAgora, LIBERACOES, URGENTE } from '../../src/core/market.js';

const dia = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const novo = (data = [2026, 10, 12], mexer) => {
  const clock = createClock(dia(...data));
  const state = defaultState(clock.now());
  mexer?.(state);
  return { game: createGame({ state, clock, rng: createRng(1) }), clock };
};
const minerio = DATA.fornecedores.mineradora_pedra;

test('ofertas do dia: iguais para a mesma data, diferentes em outra, dentro da variação', () => {
  const a = novo([2026, 10, 12]).game;
  const b = novo([2026, 10, 12]).game;
  b.rng.next(); b.rng.next();                                  // o estado do jogo não interfere
  assert.deepEqual(ofertas(a, minerio), ofertas(b, minerio));
  const outroDia = novo([2026, 10, 13]).game;
  assert.notDeepEqual(ofertas(a, minerio).map((o) => [o.preco, o.total]), ofertas(outroDia, minerio).map((o) => [o.preco, o.total]));
  for (const o of ofertas(a, minerio)) {
    assert.ok(o.preco >= 1 && o.total >= 1);
    assert.ok(o.preco >= Math.floor(o.base * (1 - minerio.variacao)) - 1 && o.preco <= Math.ceil(o.base * (1 + minerio.variacao)) + 1);
  }
});

test('os preços variam de verdade ao longo dos dias, mas a média fica perto do preço-base', () => {
  const g = novo().game;
  const precos = [];
  for (let d = 1; d <= 28; d++) {
    g.state.dia.data = `2026-11-${String(d).padStart(2, '0')}`;
    precos.push(ofertas(g, minerio)[0].preco);
  }
  assert.ok(new Set(precos).size >= 3, 'preço muda de um dia para o outro');
  const media = precos.reduce((a, b) => a + b, 0) / precos.length;
  assert.ok(Math.abs(media - minerio.vende[0].preco) < minerio.vende[0].preco * 0.12, `média ${media}`);
});

test('comprar: gasta ouro, soma no depósito e reduz o estoque do fornecedor', () => {
  const { game } = novo();
  const o = ofertas(game, minerio)[0];
  const r = comprar(game, minerio.id, o.material, 3);
  assert.equal(r.ok, true);
  assert.equal(r.qtd, 3);
  assert.equal(game.state.ouro, 100 - 3 * o.preco);
  assert.equal(game.state.materiais[o.material], 3);
  assert.equal(ofertas(game, minerio)[0].restante, o.liberado - 3);
  assert.equal(game.state.stats.comprados, 3);
});

test('comprar: sem ouro não leva nada; pedir mais que o estoque leva só o que sobra', () => {
  const { game } = novo([2026, 10, 12], (s) => { s.ouro = 5; });
  const o = ofertas(game, minerio)[0];
  assert.equal(comprar(game, minerio.id, o.material, 10).motivo, 'sem-ouro');
  assert.equal(game.state.ouro, 5);
  assert.equal(game.state.materiais[o.material] ?? 0, 0);

  const rico = novo([2026, 10, 12], (s) => { s.ouro = 1e6; }).game;
  const o2 = ofertas(rico, minerio)[0];
  const r = comprar(rico, minerio.id, o2.material, 1000);
  assert.equal(r.qtd, o2.liberado);
  assert.equal(comprar(rico, minerio.id, o2.material, 1).motivo, 'sem-estoque');
});

test('maxCompravel respeita ouro e estoque', () => {
  const { game } = novo([2026, 10, 12], (s) => { s.ouro = 30; });
  const o = ofertas(game, minerio)[0];
  assert.equal(maxCompravel(game, o), Math.min(o.restante, Math.floor(30 / o.preco)));
  game.state.ouro = 1e6;
  assert.equal(maxCompravel(game, o), o.restante);
  game.state.ouro = 0;
  assert.equal(maxCompravel(game, o), 0);
});

test('o estoque do fornecedor volta no dia seguinte', () => {
  const { game, clock } = novo([2026, 10, 12], (s) => { s.ouro = 1e6; });
  const o = ofertas(game, minerio)[0];
  comprar(game, minerio.id, o.material, o.liberado);
  assert.equal(ofertas(game, minerio)[0].restante, 0);
  clock.set(dia(2026, 10, 13));
  game.verificarDia();
  assert.ok(ofertas(game, minerio)[0].restante > 0);
});

test('fornecedor bloqueado por reputação ou região não vende', () => {
  const g = novo().game;
  const bloqueado = { id: 'forn_teste', nome: 'Teste', regiao: 'floresta', nivelRep: 1, vende: [{ material: 'pele_lobo', preco: 9, estoque: 5 }] };
  g.data.fornecedores[bloqueado.id] = bloqueado;
  assert.equal(fornecedorDisponivel(g, bloqueado), false);              // floresta abre no nível 5
  assert.equal(comprar(g, bloqueado.id, 'pele_lobo', 1).motivo, 'indisponivel');
  g.state.rep = repParaNivel(5);
  assert.equal(fornecedorDisponivel(g, bloqueado), true);
  delete g.data.fornecedores[bloqueado.id];
  assert.equal(comprar(g, 'nao_existe', 'x', 1).motivo, 'indisponivel');
  assert.equal(comprar(g, minerio.id, 'cristal_mana', 1).motivo, 'nao-vende');
});

test('depósito lista só o que tem, em ordem alfabética', () => {
  const g = novo().game;
  g.state.materiais = { madeira: 2, carvao: 0, barra_ferro: 5 };
  assert.deepEqual(deposito(g).map((d) => d.id), ['barra_ferro', 'madeira']);
});

test('um fornecedor que vende item pronto põe na prateleira', () => {
  const g = novo([2026, 10, 12], (s) => { s.ouro = 1000; s.estoque = {}; }).game;
  g.data.fornecedores.forn_item = { id: 'forn_item', nome: 'X', regiao: 'vila', nivelRep: 1, vende: [{ material: 'pao_aventureiro', preco: 3, estoque: 20 }] };
  const r = comprar(g, 'forn_item', 'pao_aventureiro', 4);
  assert.equal(r.ok, true);
  assert.equal(g.state.estoque['pao_aventureiro:1'], 4);
  delete g.data.fornecedores.forn_item;
});

// ---------- estoque que chega aos poucos e compra urgente ----------
test('o estoque do dia é liberado em partes ao longo do dia e nunca passa do total', () => {
  const horas = LIBERACOES.map((l) => l.hora);
  assert.deepEqual(horas, [0, 3, 6, 9, 12, 15, 18, 21], 'a cada 3 horas');
  assert.equal(LIBERACOES[0].f, 0.3);
  assert.equal(LIBERACOES.at(-1).f, 1);
  assert.deepEqual(LIBERACOES.map((l) => l.f), [...LIBERACOES.map((l) => l.f)].sort((a, b) => a - b), 'só cresce');
  let antes = 0;
  for (const h of [1, 4, 9, 15, 21]) {
    const { game } = novo([2026, 10, 12], undefined);
    game.clock.set(dia(2026, 10, 12, h));
    const o = ofertas(game, minerio)[0];
    assert.ok(o.liberado >= antes, `às ${h}h: ${o.liberado}`);
    assert.ok(o.liberado <= o.total);
    antes = o.liberado;
    if (h === 21) assert.equal(o.liberado, o.total);
  }
  const cedo = novo().game;
  cedo.clock.set(dia(2026, 10, 12, 1));
  assert.deepEqual(liberacaoAgora(cedo), { f: 0.3, proximaHora: 3 });
  const noite = novo().game;
  noite.clock.set(dia(2026, 10, 12, 22));
  assert.deepEqual(liberacaoAgora(noite), { f: 1, proximaHora: null });
  const tarde = novo().game;
  tarde.clock.set(dia(2026, 10, 12, 14));
  assert.deepEqual(liberacaoAgora(tarde), { f: 0.7, proximaHora: 15 });
});

test('quem não comprou guarda o estoque: o liberado soma durante o dia', () => {
  const { game, clock } = novo([2026, 10, 12], (s) => { s.ouro = 1e6; });
  clock.set(dia(2026, 10, 12, 9));
  const o9 = ofertas(game, minerio)[0];
  comprar(game, minerio.id, o9.material, 2);
  clock.set(dia(2026, 10, 12, 15));
  const o15 = ofertas(game, minerio)[0];
  assert.equal(o15.restante, o15.liberado - 2);
  assert.ok(o15.restante > o9.restante - 2, 'chegou mais estoque');
});

test('compra urgente: só depois de acabar o estoque normal, por mais caro e com limite', () => {
  const { game, clock } = novo([2026, 10, 12], (s) => { s.ouro = 1e6; });
  clock.set(dia(2026, 10, 12, 9));
  const o = ofertas(game, minerio)[0];
  assert.ok(o.precoUrgente >= o.preco * 1.9 && o.precoUrgente > o.preco);
  assert.equal(comprar(game, minerio.id, o.material, 1, { urgente: true }).motivo, 'use-estoque-normal');
  comprar(game, minerio.id, o.material, o.restante);
  const sem = ofertas(game, minerio)[0];
  assert.equal(sem.restante, 0);
  assert.ok(sem.urgente >= 1);
  const ouro = game.state.ouro;
  const r = comprar(game, minerio.id, o.material, 1, { urgente: true });
  assert.equal(r.ok, true);
  assert.equal(r.custo, sem.precoUrgente);
  assert.equal(game.state.ouro, ouro - sem.precoUrgente);
  // a reserva urgente é limitada
  const todos = comprar(game, minerio.id, o.material, 1000, { urgente: true });
  assert.equal(todos.qtd, sem.urgente - 1);
  assert.equal(comprar(game, minerio.id, o.material, 1, { urgente: true }).motivo, 'sem-estoque');
  assert.ok(sem.urgente <= Math.max(1, Math.round(o.total * URGENTE.fracao)));
  assert.equal(maxCompravel(game, ofertas(game, minerio)[0], true), 0);
});

test('o estoque urgente também volta no dia seguinte', () => {
  const { game, clock } = novo([2026, 10, 12], (s) => { s.ouro = 1e6; });
  clock.set(dia(2026, 10, 12, 21));
  const o = ofertas(game, minerio)[0];
  comprar(game, minerio.id, o.material, o.total);
  comprar(game, minerio.id, o.material, 1000, { urgente: true });
  assert.equal(ofertas(game, minerio)[0].urgente, 0);
  clock.set(dia(2026, 10, 13, 9));
  game.verificarDia();
  assert.ok(ofertas(game, minerio)[0].urgente > 0);
});
