import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DATA } from '../../src/data/index.js';
import { lerPng, gravarPng } from '../../scripts/lib/png.mjs';

const atlas = JSON.parse(readFileSync(new URL('../../src/assets/atlas/icones.json', import.meta.url), 'utf8'));
const png = (nome) => lerPng(readFileSync(new URL(`../../src/assets/atlas/${nome}`, import.meta.url)));

test('o atlas tem exatamente os ícones usados em data/icones.js (rode `npm run pack:icons` se falhar)', () => {
  const usados = new Set(Object.values(DATA.icones));
  assert.deepEqual([...usados].sort(), Object.keys(atlas.quadros).sort());
});

test('todo item e todo material tem ícone, e nenhum ícone se repete', () => {
  for (const id of [...Object.keys(DATA.itens), ...Object.keys(DATA.materiais)]) assert.ok(DATA.icones[id], id);
  const vistos = new Set();
  for (const q of Object.values(DATA.icones)) { assert.ok(!vistos.has(q), `ícone repetido ${q}`); vistos.add(q); }
});

test('as imagens do atlas têm o tamanho das células e nenhum quadro está vazio', () => {
  for (const tam of atlas.tamanhos) {
    const { w, h, px } = png(`icones-${tam}.png`);
    assert.equal(w, atlas.colunas * tam);
    assert.equal(h, atlas.linhas * tam);
    for (const [nome, [cx, cy]] of Object.entries(atlas.quadros)) {
      let opacos = 0;
      for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (px[((cy * tam + y) * w + cx * tam + x) * 4 + 3] > 0) opacos++;
      assert.ok(opacos > tam * tam * 0.1, `${nome} (${tam}px) parece vazio: ${opacos} pixels`);
    }
  }
});

test('o leitor e o gravador de PNG são inversos', () => {
  const px = Buffer.alloc(8 * 5 * 4);
  for (let i = 0; i < px.length; i++) px[i] = (i * 37) % 256;
  const volta = lerPng(gravarPng({ w: 8, h: 5, px }));
  assert.equal(volta.w, 8); assert.equal(volta.h, 5);
  assert.ok(volta.px.equals(px));
});
