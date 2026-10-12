import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, fmtTime } from '../../src/format.js';

test('fmt: números em pt-BR', () => {
  assert.equal(fmt(0), '0');
  assert.equal(fmt(950), '950');
  assert.equal(fmt(1234), '1.234');
  assert.equal(fmt(9999.9), '9.999');
  assert.equal(fmt(12345), '12,3 mil');
  assert.equal(fmt(1250000), '1,25 mi');
  assert.equal(fmt(3e9), '3 bi');
  assert.equal(fmt(-1234), '-1.234');
  assert.equal(fmt(NaN), '0');
});

test('fmtTime: durações', () => {
  assert.equal(fmtTime(0), '0s');
  assert.equal(fmtTime(45), '45s');
  assert.equal(fmtTime(185), '3min 05s');
  assert.equal(fmtTime(7800), '2h 10min');
  assert.equal(fmtTime(100800), '1d 4h');
});
