import test from 'node:test';
import assert from 'node:assert/strict';
import { precoBase, precoPedido, repNivel, repParaNivel, repProgresso } from '../../src/core/economy.js';
import { DATA } from '../../src/data/index.js';

const espada = DATA.itens.espada_ferro;

test('preço de referência e os três preços', () => {
  assert.equal(precoBase(espada, 1), 40);
  assert.equal(precoBase(espada, 0), 28);
  assert.equal(precoBase(espada, 3), 72);
  const b = precoPedido(espada, 1, 'barato');
  const j = precoPedido(espada, 1, 'justo');
  const c = precoPedido(espada, 1, 'caro');
  assert.ok(b < j && j < c);
  assert.equal(j, 40);
  assert.equal(precoPedido(espada, 1, 'justo', 1.5), 60);
});

test('nenhum item vale menos de 1 de ouro', () => {
  assert.ok(precoPedido({ valor: 0.2 }, 0, 'barato') >= 1);
});

test('níveis de reputação crescem de forma monotônica', () => {
  assert.equal(repParaNivel(1), 0);
  assert.equal(repNivel(0), 1);
  let anterior = -1;
  for (let n = 1; n <= DATA.meta.reputacao.nivelMax; n++) {
    const v = repParaNivel(n);
    assert.ok(v > anterior, `nível ${n}`);
    assert.equal(repNivel(v), n, `repNivel(repParaNivel(${n}))`);
    anterior = v;
  }
  assert.equal(repNivel(1e9), DATA.meta.reputacao.nivelMax);
});

test('progresso do nível fica entre 0 e 1', () => {
  assert.equal(repProgresso(0), 0);
  const meio = (repParaNivel(2) + repParaNivel(3)) / 2;
  assert.ok(repProgresso(meio) > 0 && repProgresso(meio) < 1);
  assert.equal(repProgresso(1e9), 1);
});
