import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL } from '../../src/data/tutorial.js';

const ABAS = ['loja', 'oficina', 'mercado', 'aventureiros', 'melhorias'];
const EVENTOS_DO_JOGO = ['venda', 'recusa', 'compra', 'produziu', 'coletou'];

test('o tutorial é curto, cada passo tem texto, aba válida e uma saída (botão ou ação)', () => {
  assert.ok(TUTORIAL.length >= 4 && TUTORIAL.length <= 8, 'curto: sem textão');
  const ids = new Set();
  for (const p of TUTORIAL) {
    assert.ok(!ids.has(p.id), `id repetido ${p.id}`);
    ids.add(p.id);
    assert.ok(ABAS.includes(p.aba), `${p.id}: aba inválida`);
    assert.ok(p.texto.length > 20 && p.texto.length <= 170, `${p.id}: texto curto (${p.texto.length} caracteres)`);
    assert.ok(p.botao || p.espera?.length, `${p.id}: sem como avançar`);
    for (const ev of p.espera ?? []) assert.ok(EVENTOS_DO_JOGO.includes(ev), `${p.id}: evento desconhecido "${ev}"`);
  }
  assert.ok(TUTORIAL.at(-1).botao, 'o último passo se encerra com um botão');
});
