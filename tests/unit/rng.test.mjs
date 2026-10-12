import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashString } from '../../src/core/rng.js';

const seq = (rng, n = 8) => Array.from({ length: n }, () => rng.next());

test('mesma semente, mesma sequência; sementes diferentes, sequências diferentes', () => {
  assert.deepEqual(seq(createRng(42)), seq(createRng(42)));
  assert.notDeepEqual(seq(createRng(42)), seq(createRng(43)));
  assert.deepEqual(seq(createRng('2026-10-12:encomendas')), seq(createRng('2026-10-12:encomendas')));
  assert.notDeepEqual(seq(createRng('2026-10-12:encomendas')), seq(createRng('2026-10-13:encomendas')));
  assert.equal(hashString('x'), hashString('x'));
});

test('valores ficam nos limites', () => {
  const r = createRng(7);
  for (let i = 0; i < 2000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    const n = r.int(3, 6);
    assert.ok(Number.isInteger(n) && n >= 3 && n <= 6);
  }
});

test('weighted respeita os pesos e ignora peso zero', () => {
  const r = createRng(1);
  const lista = [{ id: 'a', peso: 0 }, { id: 'b', peso: 1 }, { id: 'c', peso: 9 }];
  const cont = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 5000; i++) cont[r.weighted(lista).id]++;
  assert.equal(cont.a, 0);
  assert.ok(cont.c > cont.b * 5, `c=${cont.c} b=${cont.b}`);
});

test('shuffle devolve uma permutação sem mexer na lista original', () => {
  const r = createRng(5);
  const orig = [1, 2, 3, 4, 5, 6];
  const emb = r.shuffle(orig);
  assert.deepEqual(orig, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...emb].sort(), orig);
});
