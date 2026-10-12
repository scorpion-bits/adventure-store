import test from 'node:test';
import assert from 'node:assert/strict';
import { validar } from '../../scripts/validate-data.mjs';
import { DATA } from '../../src/data/index.js';

test('os dados do jogo não têm erros de referência', () => {
  const { erros } = validar(DATA);
  assert.deepEqual(erros, []);
});

test('o validador pega erros de verdade', () => {
  const ruim = structuredClone(DATA);
  ruim.listas.itens.push({ id: 'espada_ferro', nome: 'Repetida', cat: 'armas', raridade: 'comum', valor: 1 });   // id repetido
  ruim.listas.itens.push({ id: 'x1', nome: 'X', cat: 'inexistente', raridade: 'comum', valor: 1 });
  ruim.listas.receitas.push({ id: 'r_x', item: 'nao_existe', oficio: 'ferraria', nivel: 1, tempo: 10, materiais: { carvao: 1 } });
  ruim.listas.receitas.push({ id: 'r_y', item: 'x1', oficio: 'ferraria', nivel: 1, tempo: 10, materiais: { fantasma: 1 } });
  ruim.listas.aventureiros.push({ id: 'adv_x', nome: 'X', classe: 'guerreiro', temperamento: 'xx', orcamento: 1, prefere: ['armas'], regiao: 'vila', falas: {} });
  ruim.icones = { ...ruim.icones, fantasma: 'fb1' };
  const { erros } = validar(ruim);
  const tem = (txt) => assert.ok(erros.some((e) => e.includes(txt)), `esperava erro com "${txt}" em:\n${erros.join('\n')}`);
  tem('id repetido "espada_ferro"');
  tem('categoria inválida "inexistente"');
  tem('item inexistente "nao_existe"');
  tem('material inexistente "fantasma"');
  tem('temperamento inválido "xx"');
  tem('faltam falas "chega"');
  tem('icones: "fantasma"');
});

test('todo item pedido por categoria tem pelo menos um item e toda receita produz algo vendável', () => {
  for (const c of DATA.meta.categorias) assert.ok(DATA.listas.itens.some((i) => i.cat === c.id), c.id);
  for (const r of DATA.listas.receitas) assert.ok(DATA.itens[r.item], r.id);
});

test('receitas dão lucro: o item vale mais que os materiais gastos', () => {
  for (const r of DATA.listas.receitas) {
    const custo = Object.entries(r.materiais).reduce((s, [m, q]) => s + DATA.materiais[m].valor * q, 0);
    const receita = DATA.itens[r.item].valor * (r.qtd ?? 1);
    assert.ok(receita > custo, `${r.id}: vende ${receita}, custa ${custo}`);
  }
});
