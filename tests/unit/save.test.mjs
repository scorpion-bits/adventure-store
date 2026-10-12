import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, withDefaults, SAVE_KEY } from '../../src/core/save.js';
import { defaultState } from '../../src/core/state.js';

const memoria = (inicial = {}) => {
  const d = { ...inicial };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, dados: d };
};

test('sem save: começa um jogo novo com os valores iniciais', () => {
  const { state, origem } = loadState(memoria(), 1000);
  assert.equal(origem, 'novo');
  assert.equal(state.ouro, 100);
  assert.equal(state.criadoEm, 1000);
});

test('salvar e carregar devolve o mesmo estado', () => {
  const st = memoria();
  const s = defaultState(1000);
  s.ouro = 555;
  s.estoque['espada_ferro:1'] = 3;
  s.materiais.carvao = 7;
  assert.ok(saveState(st, s, 2000));
  const { state, origem } = loadState(st, 3000);
  assert.equal(origem, 'carregado');
  assert.equal(state.ouro, 555);
  assert.equal(state.estoque['espada_ferro:1'], 3);
  assert.equal(state.materiais.carvao, 7);
  assert.equal(state.salvoEm, 2000);
});

test('save antigo, sem campos novos, é completado com os padrões', () => {
  const antigo = { versao: 1, ouro: 42, rep: 10 };           // faltam estoque, stats, tutorial, dia...
  const { state, origem } = loadState(memoria({ [SAVE_KEY]: JSON.stringify(antigo) }), 5000);
  assert.equal(origem, 'carregado');
  assert.equal(state.ouro, 42);
  assert.equal(state.rep, 10);
  assert.deepEqual(state.estoque, defaultState(5000).estoque);   // sem o campo: recebe o estoque inicial
  assert.equal(state.stats.vendas, 0);
  assert.equal(state.tutorial.feito, false);
  assert.ok(typeof state.dia.data === 'string');
});

test('save sem campo "versao" também carrega', () => {
  const { state } = loadState(memoria({ [SAVE_KEY]: JSON.stringify({ ouro: 9 }) }));
  assert.equal(state.ouro, 9);
});

test('campos inválidos viram o padrão e campos desconhecidos são preservados', () => {
  const sujo = { ouro: 'muito', rep: NaN, estoque: { a: 2, b: 'x', c: NaN }, stats: { vendas: 'n' }, futuro: { novo: true } };
  const { state } = loadState(memoria({ [SAVE_KEY]: JSON.stringify(sujo) }));
  assert.equal(state.ouro, 100);
  assert.equal(state.rep, 0);
  assert.equal(state.estoque.a, 2);
  assert.ok(!('b' in state.estoque) && !('c' in state.estoque), 'estoque só guarda números válidos');
  assert.equal(state.stats.vendas, 0);
  assert.deepEqual(state.futuro, { novo: true });
});

test('JSON corrompido não derruba o jogo e o texto original é guardado', () => {
  const st = memoria({ [SAVE_KEY]: '{isso não é json' });
  const { state, origem } = loadState(st);
  assert.equal(origem, 'corrompido');
  assert.equal(state.ouro, 100);
  assert.equal(st.dados[`${SAVE_KEY}-corrompido`], '{isso não é json');
});

test('storage bloqueado: lê como jogo novo e salvar devolve falso sem lançar erro', () => {
  const bloqueado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('cheio'); } };
  assert.equal(loadState(bloqueado).origem, 'novo');
  assert.equal(saveState(bloqueado, defaultState()), false);
  assert.equal(loadState(null).origem, 'novo');
});

test('withDefaults não altera os padrões recebidos', () => {
  const padrao = { a: 1, d: {}, n: { x: 1 } };
  const copia = structuredClone(padrao);
  const r = withDefaults({ d: { k: 1 } }, padrao);
  r.n.x = 99;
  assert.deepEqual(padrao, copia);
});

test('o estoque inicial só vale para jogo novo: itens vendidos não "voltam" ao carregar', () => {
  const st = memoria();
  const s = defaultState(0);
  assert.ok(s.estoque['pao_aventureiro:1'] > 0, 'jogo novo começa com estoque');
  delete s.estoque['pao_aventureiro:1'];            // o jogador vendeu tudo
  s.estoque['pocao_cura:1'] = 0;
  saveState(st, s);
  const { state } = loadState(st);
  assert.ok(!('pao_aventureiro:1' in state.estoque));
  assert.equal(state.estoque['pocao_cura:1'], 0);
  // save antigo sem o campo estoque recebe o estoque inicial
  const { state: antigo } = loadState(memoria({ [SAVE_KEY]: JSON.stringify({ ouro: 5 }) }));
  assert.ok(antigo.estoque['pao_aventureiro:1'] > 0);
});
