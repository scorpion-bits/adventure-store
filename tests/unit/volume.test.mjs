import test from 'node:test';
import assert from 'node:assert/strict';
import { ganhoDaMusica, GANHO_MAXIMO_MUSICA } from '../../src/audio/volume.js';

test('o volume da música segue uma curva: 10% soa baixinho e 100% vale o teto', () => {
  assert.equal(ganhoDaMusica(0), 0);
  assert.equal(ganhoDaMusica(1), GANHO_MAXIMO_MUSICA);
  assert.ok(ganhoDaMusica(0.1) < GANHO_MAXIMO_MUSICA * 0.02, '10% é menos de 2% do teto');
  assert.ok(ganhoDaMusica(0.5) < GANHO_MAXIMO_MUSICA * 0.3);
  const db = (g) => 20 * Math.log10(g);
  assert.ok(db(ganhoDaMusica(0.1)) < -45, 'a 10% fica abaixo de -45 dB');
});

test('cada passo da barra aumenta o volume, e valores fora da faixa ou inválidos não quebram', () => {
  let anterior = -1;
  for (let v = 0; v <= 1.0001; v += 0.1) {
    const g = ganhoDaMusica(v);
    assert.ok(g > anterior, `${v.toFixed(1)}`);
    anterior = g;
  }
  assert.equal(ganhoDaMusica(2), GANHO_MAXIMO_MUSICA);
  assert.equal(ganhoDaMusica(-1), 0);
  assert.equal(ganhoDaMusica(NaN), 0);
  assert.equal(ganhoDaMusica(undefined), 0);
});
