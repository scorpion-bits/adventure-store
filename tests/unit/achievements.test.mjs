import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { DATA } from '../../src/data/index.js';
import { loadState, saveState } from '../../src/core/save.js';
import { receberCliente, criarCliente, opcoes, vender } from '../../src/core/shop.js';
import {
  MEDIDAS, metaDe, progressoConquista, verificarConquistas, registrarDescobertas, totalGanhas, ganha,
} from '../../src/core/achievements.js';
import { validar } from '../../scripts/validate-data.mjs';

const T0 = new Date(2026, 7, 4, 12).getTime();
const novo = (mexer, seed = 3) => {
  const clock = createClock(T0);
  const state = defaultState(clock.now());
  state.tutorial.feito = true;
  state.loja.proximaChegada = 1e12;
  state.eventos.proximo = 1e12;
  mexer?.(state);
  return createGame({ state, clock, rng: createRng(seed) });
};

test('há 80+ conquistas e todas passam no validador', () => {
  assert.ok(DATA.listas.conquistas.length >= 80);
  assert.deepEqual(validar(DATA).erros, []);
  assert.ok(!validar(DATA).faltas.some((f) => f.startsWith('conquistas')));
});

test('o validador pega medida e argumento inexistentes', () => {
  const ruim = structuredClone(DATA);
  ruim.listas.conquistas.push({ id: 'x1', nome: 'X', desc: 'x', medida: 'nada', meta: 1, ouro: 1 });
  ruim.listas.conquistas.push({ id: 'x2', nome: 'X', desc: 'x', medida: 'categoria', arg: 'xx', meta: 1, ouro: 1 });
  const { erros } = validar(ruim);
  assert.ok(erros.some((e) => e.includes('medida "nada"')));
  assert.ok(erros.some((e) => e.includes('argumento "xx"')));
});

test('metas "todos" acompanham o conteúdo', () => {
  const g = novo();
  const todos = DATA.listas.conquistas.filter((c) => c.meta === 'todos');
  assert.ok(todos.length >= 5);
  for (const c of todos) assert.ok(metaDe(g, c) > 0, c.id);
  assert.equal(metaDe(g, DATA.conquistas.itens_todos), DATA.listas.itens.length);
});

test('o estoque inicial já conta como itens descobertos', () => {
  const g = novo();
  assert.equal(MEDIDAS.itens(g), Object.keys(g.state.estoque).length);
  g.state.estoque['espada_ferro:1'] = 1;
  const n = registrarDescobertas(g);
  assert.deepEqual(n.itens, ['espada_ferro']);
});

test('uma venda registra coleção, recordes e dá a conquista com prêmio', () => {
  const g = novo();
  let venda = null;
  for (let i = 0; i < 40 && !venda; i++) {
    const cli = criarCliente(g, 'aprendiz_guerreiro');
    receberCliente(g, cli);
    if (i === 0) assert.ok(g.state.colecao.aventureiros.aprendiz_guerreiro !== undefined, 'descobriu o aventureiro ao chegar');
    const op = opcoes(g, cli)[0];
    if (!op) { g.state.estoque['espada_ferro:1'] = 5; continue; }
    const r = vender(g, cli.uid, op.chave, 'justo');
    if (r.ok) venda = r;
  }
  assert.ok(venda, 'vendeu');
  g.conquistasTick();
  assert.ok(ganha(g, 'vendas_1'));
  assert.equal(g.state.colecao.itens[venda.item.id], 1);
  assert.equal(g.state.colecao.classes.guerreiro, 1);
  assert.equal(g.state.stats.maiorVenda, Math.floor(venda.preco));
  assert.equal(MEDIDAS.categoria(g, venda.item.cat), 1);
});

test('verificarConquistas entrega o prêmio uma única vez e avisa', () => {
  const g = novo();
  const vistos = [];
  g.on('conquista', (c) => vistos.push(c.id));
  g.state.stats.vendas = 12;
  const ouro = g.state.ouro;
  const novas = verificarConquistas(g);
  assert.deepEqual(novas.map((c) => c.id).sort(), ['vendas_1', 'vendas_10']);
  assert.equal(g.state.ouro, ouro + DATA.conquistas.vendas_1.ouro + DATA.conquistas.vendas_10.ouro);
  assert.deepEqual(verificarConquistas(g), [], 'não repete');
  assert.deepEqual(vistos.sort(), ['vendas_1', 'vendas_10']);
  assert.equal(totalGanhas(g), 2);
});

test('progresso nunca passa da meta e conquista ganha continua ganha', () => {
  const g = novo();
  g.state.stats.ouroTotal = 10 ** 9;
  const c = DATA.conquistas.ouroTotal_500;
  assert.deepEqual(progressoConquista(g, c), { atual: 500, meta: 500, feita: true });
  verificarConquistas(g);
  g.state.stats.ouroTotal = 0;
  assert.equal(progressoConquista(g, c).feita, true);
});

test('cada medida funciona num jogo novo (sem estourar) e nas conquistas com argumento', () => {
  const g = novo();
  for (const c of DATA.listas.conquistas) {
    const p = progressoConquista(g, c);
    assert.ok(Number.isFinite(p.atual) && p.atual >= 0 && p.meta > 0, c.id);
  }
});

test('o tick verifica sozinho depois de um evento', () => {
  const g = novo();
  g.state.stats.vendas = 1;
  g.emit('venda', { cli: { adv: 'aprendiz_guerreiro' }, item: 'espada_ferro', preco: 10, qualidade: 1, nivelPreco: 'justo' });
  g.tick(16);
  assert.ok(ganha(g, 'vendas_1'));
  assert.equal(g.state.stats.maiorVenda, 10);
});

test('save antigo sem conquistas nem coleção carrega, ganha as conquistas e a coleção do que já tem', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const velho = defaultState(T0);
  velho.stats.vendas = 60;
  velho.tutorial.feito = true;
  delete velho.conquistas;
  delete velho.colecao;
  saveState(storage, velho);
  const { state } = loadState(storage);
  assert.deepEqual(state.conquistas, {});
  assert.ok(state.colecao.itens);
  const g = createGame({ state, clock: createClock(T0), rng: createRng(1) });
  g.tick(16);
  assert.ok(ganha(g, 'vendas_50'));
  assert.ok(MEDIDAS.itens(g) > 0);
});
