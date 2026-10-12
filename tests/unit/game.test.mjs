import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, diaDeJogo } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';

const dia = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();

test('ouro: ganhar, gastar e recusar gasto sem saldo', () => {
  const g = createGame({ state: defaultState(0) });
  const visto = [];
  g.on('ouro', (v) => visto.push(v));
  g.ganharOuro(50);
  assert.equal(g.state.ouro, 150);
  assert.equal(g.state.stats.ouroTotal, 50);
  assert.equal(g.gastarOuro(200), false);
  assert.equal(g.state.ouro, 150);
  assert.equal(g.gastarOuro(150), true);
  assert.equal(g.state.ouro, 0);
  g.ganharOuro(-5);
  g.ganharOuro(0);
  assert.equal(g.state.ouro, 0);
  assert.deepEqual(visto, [150, 0]);
});

test('reputação sobe de nível e avisa; o nível nunca cai', () => {
  const g = createGame({ state: defaultState(0) });
  const niveis = [];
  g.on('nivel', (n) => niveis.push(n));
  g.ganharRep(repParaNivel(3));
  assert.equal(g.nivel(), 3);
  assert.deepEqual(niveis, [3]);
  g.ganharRep(-1e6);
  assert.equal(g.state.rep, repParaNivel(3), 'perde o progresso do nível, não o nível');
  assert.equal(g.nivel(), 3);
  const d = createGame({ state: defaultState(0) });
  d.ganharRep(-50);
  assert.equal(d.state.rep, 0, 'no nível 1 nunca fica negativa');
});

test('virada do dia de calendário dispara "dia" e conta o dia de jogo', () => {
  const clock = createClock(dia(2026, 10, 12));
  const g = createGame({ state: defaultState(clock.now()), clock });
  const avisos = [];
  g.on('dia', (d) => avisos.push(d));
  assert.equal(g.verificarDia(), 0);
  assert.equal(diaDeJogo(g.state), 1);
  clock.set(dia(2026, 10, 12, 23));
  assert.equal(g.verificarDia(), 0);
  clock.set(dia(2026, 10, 13, 1));
  assert.equal(g.verificarDia(), 1);
  clock.set(dia(2026, 10, 16, 9));
  assert.equal(g.verificarDia(), 3);
  assert.equal(diaDeJogo(g.state), 5);
  assert.deepEqual(avisos.map((a) => a.passou), [1, 3]);
});
