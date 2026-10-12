import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock, dayKey, daysBetween, weekKey } from '../../src/core/time.js';

test('dayKey usa o dia do calendário local', () => {
  assert.equal(dayKey(new Date(2026, 9, 12, 23, 59).getTime()), '2026-10-12');
  assert.equal(dayKey(new Date(2026, 9, 13, 0, 1).getTime()), '2026-10-13');
  assert.equal(dayKey(new Date(2026, 0, 5, 12).getTime()), '2026-01-05');
});

test('daysBetween conta dias de calendário', () => {
  assert.equal(daysBetween('2026-10-12', '2026-10-12'), 0);
  assert.equal(daysBetween('2026-10-12', '2026-10-13'), 1);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetween('2026-10-12', '2026-10-05'), -7);
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
});

test('weekKey: segunda a domingo caem na mesma semana', () => {
  const seg = weekKey(new Date(2026, 9, 12, 8).getTime());   // 12/10/2026 é segunda
  const dom = weekKey(new Date(2026, 9, 18, 22).getTime());
  const prox = weekKey(new Date(2026, 9, 19, 1).getTime());
  assert.equal(seg, dom);
  assert.notEqual(dom, prox);
});

test('relógio injetável avança sem esperar', () => {
  const c = createClock(1000);
  assert.equal(c.now(), 1000);
  c.advance(500);
  assert.equal(c.now(), 1500);
  c.set(9000);
  assert.equal(c.now(), 9000);
});

test('relógio que corre: começa na data pedida e segue andando em tempo real', async () => {
  const inicio = new Date(2026, 7, 4, 12).getTime();
  const c = createClock(inicio, { correr: true });
  const a = c.now();
  assert.ok(Math.abs(a - inicio) < 1000);
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(c.now() - a >= 25, 'andou');
  c.advance(60000);
  assert.ok(c.now() - a >= 60000);
});
