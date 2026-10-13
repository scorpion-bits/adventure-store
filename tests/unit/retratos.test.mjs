import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { RETRATOS, retratoDe } from '../../src/data/retratos.js';
import { DATA } from '../../src/data/index.js';

const atlas = JSON.parse(readFileSync(new URL('../../src/assets/retratos/retratos.json', import.meta.url), 'utf8'));
const disponiveis = Object.keys(atlas.quadros).sort();

test('todo retrato mapeado existe no atlas e todo mapeamento aponta para um aventureiro real', () => {
  for (const [id, n] of Object.entries(RETRATOS)) {
    assert.ok(DATA.aventureiros[id], `${id} não é um aventureiro`);
    assert.match(n, /^[cmba]_[A-Za-z0-9]+$/, `${id}: chave de retrato inválida`);
    assert.ok(atlas.quadros[n], `retrato ${n} (${id}) não está no atlas: rode npm run pack:ninja`);
  }
  for (const [n, [cx, cy]] of Object.entries(atlas.quadros)) {
    assert.ok(cx < atlas.colunas && cy < atlas.linhas, `quadro ${n} fora da grade`);
  }
});

test('todos os aventureiros do jogo têm retrato do pack', () => {
  for (const a of DATA.listas.aventureiros) assert.ok(RETRATOS[a.id], `${a.id} sem retrato`);
});

test('aventureiro sem retrato mapeado recebe um do pack, sempre o mesmo, e a escolha se espalha', () => {
  const ids = Array.from({ length: 60 }, (_, i) => `aventureiro_novo_${i}`);
  const escolhas = ids.map((id) => retratoDe(id, disponiveis));
  for (const n of escolhas) assert.ok(disponiveis.includes(n));
  assert.deepEqual(escolhas, ids.map((id) => retratoDe(id, disponiveis)), 'determinístico');
  assert.ok(new Set(escolhas).size >= 15, `os retratos variam (${new Set(escolhas).size})`);
  assert.equal(retratoDe('ser_aldric', disponiveis), RETRATOS.ser_aldric, 'o mapeado vence');
  assert.equal(retratoDe('qualquer', []), null);
});

test('o código não depende mais dos retratos desenhados por código', async () => {
  const { existsSync } = await import('node:fs');
  assert.equal(existsSync(new URL('../../src/ui/portrait-art.js', import.meta.url)), false);
});

test('todos os personagens usam só o pack Ninja Adventure: o atlas tem 38 px, sem fundo, e não há retrato por código', () => {
  assert.equal(atlas.tamanho, 38);
  assert.ok(Object.keys(atlas.quadros).length >= 140, 'o elenco usa uns 150 retratos');
  assert.ok(existsSync(new URL('../../src/assets/emotes/emotes.png', import.meta.url)), 'o atlas de emotes existe');
  const emotes = JSON.parse(readFileSync(new URL('../../src/assets/emotes/emotes.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(emotes.quadros).length, 30);
  assert.equal(emotes.largura, 14);
  // a CraftPix saiu de vez
  assert.equal(existsSync(new URL('../../scripts/pack-retratos.mjs', import.meta.url)), false);
  assert.equal(existsSync(new URL('../../src/ui/portrait-art.js', import.meta.url)), false);
});
