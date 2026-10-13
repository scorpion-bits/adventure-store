import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DATA } from '../../src/data/index.js';
import { lerPng } from '../../scripts/lib/png.mjs';

const dados = JSON.parse(readFileSync(new URL('../../src/assets/mapa/mapa.json', import.meta.url), 'utf8'));
const png = (nome) => lerPng(readFileSync(new URL(`../../src/assets/mapa/${nome}`, import.meta.url)));

test('o mapa-múndi tem uma ilha e um pino para cada região do jogo, com o pino dentro da ilha e a ilha dentro da imagem', () => {
  assert.deepEqual(Object.keys(dados.regioes).sort(), DATA.listas.regioes.map((r) => r.id).sort());
  for (const [id, { ilha: [x, y, w, h], hub: [hx, hy] }] of Object.entries(dados.regioes)) {
    assert.ok(hx > x && hx < x + w && hy > y && hy < y + h, `${id}: o pino fica fora da ilha`);
    assert.ok(x >= 0 && y >= 0 && x + w <= dados.largura && y + h <= dados.altura, `${id}: ilha fora da imagem`);
  }
});

test('a imagem do mapa tem o tamanho do json, e as regiões seguem a ordem do caminho (de baixo para cima)', () => {
  const { w, h } = png('mapa.png');
  assert.equal(w, dados.largura);
  assert.equal(h, dados.altura);
  const ys = DATA.listas.regioes.map((r) => dados.regioes[r.id].hub[1]);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] < ys[i - 1], `${DATA.listas.regioes[i].id} deveria ficar acima de ${DATA.listas.regioes[i - 1].id}`);
});

test('o atlas dos batedores tem 4 direções x 4 passos por personagem', () => {
  const bat = JSON.parse(readFileSync(new URL('../../src/assets/mapa/batedores.json', import.meta.url), 'utf8'));
  const { w, h } = png('batedores.png');
  assert.equal(bat.tamanho, 16);
  assert.equal(w, 4 * bat.tamanho);
  assert.equal(h, bat.personagens.length * 4 * bat.tamanho);
  assert.ok(bat.personagens.length >= 4);
});
