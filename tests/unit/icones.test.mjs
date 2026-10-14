import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DATA } from '../../src/data/index.js';
import { lerPng, gravarPng } from '../../scripts/lib/png.mjs';

const atlas = JSON.parse(readFileSync(new URL('../../src/assets/itens/itens.json', import.meta.url), 'utf8'));
const png = lerPng(readFileSync(new URL('../../src/assets/itens/itens.png', import.meta.url)));
const credits = readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8');

test('o atlas tem exatamente os ícones usados em data/icones.js (rode `npm run pack:itens` se falhar)', () => {
  const usados = new Set(Object.values(DATA.icones));
  assert.deepEqual([...usados].sort(), Object.keys(atlas.quadros).sort());
});

test('todo item e todo material tem ícone, e nenhum ícone se repete', () => {
  for (const id of [...Object.keys(DATA.itens), ...Object.keys(DATA.materiais)]) assert.ok(DATA.icones[id], id);
  const vistos = new Set();
  for (const q of Object.values(DATA.icones)) { assert.ok(!vistos.has(q), `ícone repetido ${q}`); vistos.add(q); }
});

test('as imagens do atlas têm o tamanho das células e nenhum quadro está vazio', () => {
  const T = atlas.tamanho;
  assert.equal(png.w, atlas.colunas * T);
  assert.equal(png.h, atlas.linhas * T);
  for (const [nome, [cx, cy]] of Object.entries(atlas.quadros)) {
    let opacos = 0;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (png.px[((cy * T + y) * png.w + cx * T + x) * 4 + 3] > 0) opacos++;
    assert.ok(opacos >= 20, `${nome} parece vazio: ${opacos} pixels`);
  }
});

test('todo ícone vem de um pack de licença livre registrado no CREDITS.md (nenhum ícone de pack gratuito com restrição entra de novo)', () => {
  const esquema = /^(cc_[A-Za-z0-9_.+-]+__[A-Za-z0-9_.+-]+|nj_[A-Za-z0-9]+_[A-Za-z0-9]+|ns_[A-Za-z0-9]+_[A-Za-z0-9]+)(~[HVT][-+0-9.,]+)*$/;
  for (const q of Object.values(DATA.icones)) assert.match(q, esquema, `quadro "${q}" fora do padrão de data/icones.js`);
  const pacotes = new Set(Object.values(DATA.icones).filter((q) => q.startsWith('cc_')).map((q) => q.slice(3).split('__')[0]));
  assert.ok(pacotes.size >= 10, `são ${pacotes.size} pacotes CC0`);
  for (const pacote of pacotes) assert.ok(credits.includes(pacote), `o pacote ${pacote} não está no CREDITS.md`);
  assert.ok(credits.includes('CC0'), 'o CREDITS.md registra a licença CC0');
});

test('o leitor e o gravador de PNG são inversos', () => {
  const px = Buffer.alloc(8 * 5 * 4);
  for (let i = 0; i < px.length; i++) px[i] = (i * 37) % 256;
  const volta = lerPng(gravarPng({ w: 8, h: 5, px }));
  assert.equal(volta.w, 8); assert.equal(volta.h, 5);
  assert.ok(volta.px.equals(px));
});
