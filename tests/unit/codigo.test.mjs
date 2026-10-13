import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { dicas, marcas, iniciarPartida, finalizarPartida, cofreDe, cargasAgora, msParaProxima, unidadesPorEspaco } from '../../src/core/codigo.js';

const T0 = new Date(2026, 7, 4, 12).getTime();
const novo = (nivel = 1, seed = 1) => {
  const clock = createClock(T0);
  const state = defaultState(T0);
  state.rep = repParaNivel(nivel);
  return { game: createGame({ state, clock, rng: createRng(seed) }), clock };
};

test('dicas: lugar certo e material certo no lugar errado, contando cada material do segredo uma vez', () => {
  assert.deepEqual(dicas(['a', 'b', 'c'], ['a', 'b', 'c']), { certos: 3, quase: 0 });
  assert.deepEqual(dicas(['a', 'b', 'c'], ['c', 'a', 'b']), { certos: 0, quase: 3 });
  assert.deepEqual(dicas(['a', 'b', 'c'], ['a', 'c', 'b']), { certos: 1, quase: 2 });
  assert.deepEqual(dicas(['a', 'b', 'c'], ['d', 'd', 'd']), { certos: 0, quase: 0 });
  // repetições: o segredo tem um "a" só, então só um "a" do palpite conta
  assert.deepEqual(dicas(['a', 'b', 'c', 'd'], ['a', 'a', 'a', 'a']), { certos: 1, quase: 0 });
  assert.deepEqual(dicas(['a', 'a', 'b', 'c'], ['b', 'a', 'a', 'a']), { certos: 1, quase: 2 });
  assert.deepEqual(dicas(['a', 'a', 'b', 'b'], ['b', 'b', 'a', 'a']), { certos: 0, quase: 4 });
});

test('o cofre cresce com a reputação e o primeiro não repete materiais', () => {
  assert.deepEqual(cofreDe(novo(1).game), { ate: 7, espacos: 3, cores: 4, repete: false });
  assert.equal(cofreDe(novo(10).game).espacos, 4);
  assert.equal(cofreDe(novo(10).game).repete, true);
  assert.equal(cofreDe(novo(25).game).espacos, 5);
});

test('iniciar gasta uma partida e sorteia um segredo só com materiais da paleta (sem repetir no cofre simples)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { game } = novo(1, seed);
    const p = iniciarPartida(game);
    assert.equal(p.ok, true);
    assert.equal(cargasAgora(game), 2);
    assert.equal(p.segredo.length, p.espacos);
    assert.ok(p.segredo.every((m) => p.paleta.includes(m)));
    assert.ok(game.data.materiais[p.paleta[0]]);
    if (!p.repete) assert.equal(new Set(p.segredo).size, p.segredo.length, 'sem repetição');
    assert.equal(new Set(p.paleta).size, p.paleta.length, 'paleta sem repetidos');
  }
  const { game } = novo(12);
  const p = iniciarPartida(game);
  assert.equal(p.espacos, 4);
  assert.equal(p.repete, true);
});

test('as partidas acabam, voltam com o tempo e cada uma tem o seu relógio', () => {
  const { game, clock } = novo(1);
  for (let i = 0; i < 3; i++) assert.equal(iniciarPartida(game).ok, true);
  assert.equal(iniciarPartida(game).motivo, 'sem-partidas');
  assert.equal(game.state.codigo.cargas, 0);
  assert.ok(msParaProxima(game) > 0);
  clock.advance(150 * 60_000);
  assert.equal(cargasAgora(game), 1);
  assert.equal(iniciarPartida(game).ok, true);
  // o jogo da memória tem as partidas dele: não foram gastas
  assert.equal(game.state.minijogo.cargas, 3);
});

test('abrir o cofre rende os materiais do segredo; abrir rápido dobra', () => {
  const { game } = novo(1);
  const p = iniciarPartida(game);
  const errado = p.paleta.map((m) => m).reverse().slice(0, p.espacos);
  // rápido: o certo no 2º palpite
  const antes = { ...game.state.materiais };
  const r = finalizarPartida(game, p, { palpites: [errado, p.segredo] });
  assert.equal(r.aberto, true);
  assert.equal(r.tentativas, 2);
  assert.equal(r.rapido, true);
  assert.equal(r.total, p.espacos * p.unidades * 2);
  for (const m of p.segredo) assert.ok((game.state.materiais[m] ?? 0) > (antes[m] ?? 0));
  assert.equal(game.state.codigo.vitorias, 1);
  assert.equal(game.state.codigo.rapidas, 1);
  assert.equal(game.state.codigo.partidas, 1);
});

test('abrir devagar rende o prêmio simples, e quem não abre ganha só um consolo', () => {
  const { game } = novo(1);
  const p = iniciarPartida(game);
  const e = (i) => p.paleta.filter((m) => m !== p.segredo[i]).slice(0, 1)[0];
  const ruim = p.segredo.map((_, i) => e(i));
  // abre no 7º palpite: não é rápido
  const lento = finalizarPartida(game, p, { palpites: [...Array(6).fill(ruim), p.segredo] });
  assert.equal(lento.aberto, true);
  assert.equal(lento.rapido, false);
  assert.equal(lento.total, p.espacos * p.unidades);

  const q = iniciarPartida(game);
  // não abre, mas o último palpite acerta o primeiro espaço
  const parcial = q.segredo.map((m, i) => (i === 0 ? m : q.paleta.find((x) => x !== q.segredo[i])));
  const f = finalizarPartida(game, q, { palpites: [parcial] });
  assert.equal(f.aberto, false);
  assert.equal(f.total, 1);
  assert.deepEqual(Object.keys(f.ganhou), [q.segredo[0]]);

  const z = iniciarPartida(game);
  const nada = finalizarPartida(game, z, { palpites: [] });
  assert.equal(nada.total, 0);
});

test('a conferência não aceita palpites inventados, nem mais tentativas que o limite', () => {
  const { game } = novo(1);
  const p = iniciarPartida(game);
  const invalido = finalizarPartida(game, p, { palpites: [['inexistente', 'x', 'y'], p.segredo.slice(0, 1), 'oi', null] });
  assert.equal(invalido.aberto, false);
  assert.equal(invalido.total, 0);
  const q = iniciarPartida(game);
  const ruim = q.segredo.map((_, i) => q.paleta.find((m) => m !== q.segredo[i]));
  // o certo só depois do limite de tentativas: não vale
  const tarde = finalizarPartida(game, q, { palpites: [...Array(game.data.meta.codigo.tentativas).fill(ruim), q.segredo] });
  assert.equal(tarde.aberto, false);
});

test('o prêmio por espaço sobe com a reputação', () => {
  assert.equal(unidadesPorEspaco(novo(1).game), 1);
  assert.equal(unidadesPorEspaco(novo(15).game), 2);
  assert.equal(unidadesPorEspaco(novo(30).game), 3);
});

test('marcas: cada peça do palpite fica certa, quase ou nada, e bate com as dicas em números', () => {
  assert.deepEqual(marcas(['a', 'b', 'c'], ['a', 'c', 'd']), ['certo', 'quase', 'nada']);
  assert.deepEqual(marcas(['a', 'b', 'c'], ['a', 'b', 'c']), ['certo', 'certo', 'certo']);
  // o segredo tem um "a" só: o primeiro "a" fora do lugar conta, os outros não
  assert.deepEqual(marcas(['x', 'a', 'y'], ['a', 'a', 'a']), ['nada', 'certo', 'nada']);
  assert.deepEqual(marcas(['a', 'x', 'y'], ['z', 'a', 'a']), ['nada', 'quase', 'nada']);
  assert.deepEqual(marcas(['a', 'a', 'b', 'b'], ['b', 'b', 'a', 'a']), ['quase', 'quase', 'quase', 'quase']);
  // com sorteios: as marcas e as dicas sempre concordam
  const rng = createRng(11);
  for (let i = 0; i < 300; i++) {
    const n = 3 + (i % 3);
    const mats = ['a', 'b', 'c', 'd', 'e'];
    const seg = Array.from({ length: n }, () => rng.pick(mats));
    const pal = Array.from({ length: n }, () => rng.pick(mats));
    const m = marcas(seg, pal);
    const d = dicas(seg, pal);
    assert.equal(m.filter((x) => x === 'certo').length, d.certos);
    assert.equal(m.filter((x) => x === 'quase').length, d.quase);
    pal.forEach((x, k) => { if (m[k] === 'certo') assert.equal(seg[k], x); });
  }
});
