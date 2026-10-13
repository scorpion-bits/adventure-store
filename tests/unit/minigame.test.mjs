import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { DATA } from '../../src/data/index.js';
import { loadState, saveState } from '../../src/core/save.js';
import {
  atualizarCargas, cargasAgora, msParaProxima, tabuleiroDe, unidadesPorPar, materiaisPossiveis, iniciarPartida, finalizarPartida,
} from '../../src/core/minigame.js';

const T0 = new Date(2026, 7, 4, 12).getTime();
const novo = (nivel = 1, mexer, seed = 4) => {
  const clock = createClock(T0);
  const state = defaultState(clock.now());
  state.tutorial.feito = true;
  state.rep = repParaNivel(nivel);
  state.loja.proximaChegada = 1e12;
  state.eventos.proximo = 1e12;
  mexer?.(state);
  return { game: createGame({ state, clock, rng: createRng(seed) }), clock };
};
const M = DATA.meta.minijogo;

test('a configuração é pequena e coerente: poucas partidas, recarga lenta, tabuleiros crescentes', () => {
  assert.ok(M.max >= 2 && M.max <= 5);
  assert.ok(M.recargaMin >= 60);
  const ns = M.tabuleiros.map((t) => t.n);
  assert.deepEqual(ns, [...ns].sort((a, b) => a - b));
  const ate = M.tabuleiros.map((t) => t.ate);
  assert.deepEqual(ate, [...ate].sort((a, b) => a - b));
  for (const t of M.tabuleiros) assert.ok(t.seg >= 30 && t.seg <= 120);
});

test('o tabuleiro cresce com a reputação e os materiais só vêm de regiões abertas', () => {
  assert.equal(tabuleiroDe(novo(1).game).n, M.tabuleiros[0].n);
  assert.equal(tabuleiroDe(novo(12).game).n, M.tabuleiros[1].n);
  assert.equal(tabuleiroDe(novo(30).game).n, M.tabuleiros[2].n);
  const baixo = novo(1).game;
  assert.ok(materiaisPossiveis(baixo).every((m) => m.regiao === 'vila'));
  assert.ok(materiaisPossiveis(novo(30).game).length > materiaisPossiveis(baixo).length);
  assert.ok(materiaisPossiveis(baixo).length >= M.tabuleiros[0].n, 'dá para formar o primeiro tabuleiro');
});

test('uma partida: cartas em pares, sem repetir material, e gasta uma das partidas guardadas', () => {
  const { game } = novo(1);
  assert.equal(cargasAgora(game), M.max);
  const p = iniciarPartida(game);
  assert.equal(p.ok, true);
  assert.equal(p.cartas.length, p.pares * 2);
  const contagem = {};
  for (const c of p.cartas) contagem[c.material] = (contagem[c.material] ?? 0) + 1;
  assert.ok(Object.values(contagem).every((n) => n === 2), 'cada material aparece em exatamente 2 cartas');
  assert.equal(Object.keys(contagem).length, p.pares);
  assert.equal(game.state.minijogo.cargas, M.max - 1);
});

test('sem partidas guardadas não começa; elas voltam com o tempo, também com o jogo fechado, até o máximo', () => {
  const { game, clock } = novo(1);
  for (let i = 0; i < M.max; i++) assert.equal(iniciarPartida(game).ok, true);
  assert.deepEqual(iniciarPartida(game), { ok: false, motivo: 'sem-partidas' });
  assert.equal(cargasAgora(game), 0);
  assert.ok(msParaProxima(game) > 0 && msParaProxima(game) <= M.recargaMin * 60_000);
  clock.advance(M.recargaMin * 60_000 - 1000);
  assert.equal(cargasAgora(game), 0);
  clock.advance(1500);
  assert.equal(cargasAgora(game), 1);
  clock.advance(M.recargaMin * 60_000 * 10);              // dias fechado: no máximo o teto
  assert.equal(cargasAgora(game), M.max);
  assert.equal(msParaProxima(game), 0);
});

test('a recarga começa quando sai do cheio e não acumula tempo enquanto está cheio', () => {
  const { game, clock } = novo(1);
  clock.advance(M.recargaMin * 60_000 * 5);               // ficou cheio por muito tempo
  iniciarPartida(game);
  assert.ok(msParaProxima(game) > (M.recargaMin * 60_000) * 0.99, 'a contagem recomeça do zero ao sair do cheio');
  clock.advance(M.recargaMin * 60_000 + 1);
  assert.equal(cargasAgora(game), M.max);
});

test('prêmio: 1 unidade por par (mais com reputação), dobrado se acertar tudo com poucos erros; só conta par que existe', () => {
  const { game } = novo(1);
  const p = iniciarPartida(game);
  const materiais = [...new Set(p.cartas.map((c) => c.material))];
  // acertou metade, com erros: sem dobro
  const meio = materiais.slice(0, 3);
  const r = finalizarPartida(game, p, { acertos: [...meio, 'material_que_nao_existe', meio[0]], erros: 9 });
  assert.equal(r.perfeito, false);
  assert.equal(r.total, 3 * p.unidades);
  for (const m of meio) assert.equal(game.state.materiais[m], p.unidades);
  assert.equal(game.state.materiais.material_que_nao_existe, undefined);
  assert.equal(game.state.minijogo.partidas, 1);
  assert.equal(game.state.minijogo.pares, 3);
  // acertou tudo com 2 erros: dobra
  const p2 = iniciarPartida(game);
  const todos = [...new Set(p2.cartas.map((c) => c.material))];
  const antes = { ...game.state.materiais };
  const r2 = finalizarPartida(game, p2, { acertos: todos, erros: M.perfeitoErros });
  assert.equal(r2.perfeito, true);
  assert.equal(r2.total, todos.length * p2.unidades * 2);
  assert.equal(game.state.minijogo.perfeitas, 1);
  for (const m of todos) assert.equal((game.state.materiais[m] ?? 0) - (antes[m] ?? 0), p2.unidades * 2);
  // acertou tudo mas errou demais: sem dobro
  const p3 = iniciarPartida(game);
  const r3 = finalizarPartida(game, p3, { acertos: [...new Set(p3.cartas.map((c) => c.material))], erros: M.perfeitoErros + 1 });
  assert.equal(r3.perfeito, false);
});

test('o prêmio é pequeno: no máximo umas poucas unidades por partida e algumas horas de recarga', () => {
  const { game } = novo(1);
  const p = iniciarPartida(game);
  const r = finalizarPartida(game, p, { acertos: [...new Set(p.cartas.map((c) => c.material))], erros: 0 });
  // uma expedição "curta" traz 6 unidades em 5 minutos; o mini-jogo perfeito rende o dobro do número de pares uma vez a cada 2 h
  assert.ok(r.total <= DATA.meta.expedicoes.tiers[0].unidades * 2 * unidadesPorPar(game));
  assert.equal(unidadesPorPar(novo(1).game), 1);
  assert.equal(unidadesPorPar(novo(15).game), 2);
  assert.equal(unidadesPorPar(novo(45).game), 4);
});

test('save antigo sem o mini-jogo carrega com as partidas cheias; o estado salvo volta igual', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const velho = defaultState(T0);
  delete velho.minijogo;
  saveState(storage, velho);
  assert.equal(loadState(storage).state.minijogo.cargas, M.max);
  const { game } = novo(1);
  iniciarPartida(game);
  saveState(storage, game.state);
  const { state } = loadState(storage);
  assert.equal(state.minijogo.cargas, M.max - 1);
  assert.equal(atualizarCargas({ ...game, state, clock: game.clock, data: game.data }).cargas, M.max - 1);
});
