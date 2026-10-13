import test from 'node:test';
import assert from 'node:assert/strict';
import { SEQUENCIAS, RECEITA_GUIADA, ABAS_COM_TUTORIAL } from '../../src/data/tutorial.js';
import { DATA } from '../../src/data/index.js';
import { defaultState } from '../../src/core/state.js';
import { withDefaults } from '../../src/core/save.js';

const ABAS = ['loja', 'oficina', 'mercado', 'aventureiros', 'melhorias'];
const SUBS = { mercado: ['fornecedores', 'mapa', 'minijogo'], aventureiros: ['hoje', 'colecao', 'lendarios'], melhorias: ['loja', 'equipe', 'oficios', 'conquistas', 'expandir'] };
const EVENTOS_DO_JOGO = ['venda', 'recusa', 'compra', 'produziu', 'coletou', 'bonusDiario'];

test('cada sequência é curta, e cada passo tem texto, aba válida e uma saída (botão ou ação)', () => {
  assert.ok(SEQUENCIAS.inicio.length >= 3 && SEQUENCIAS.inicio.length <= 6, 'o começo é curto');
  const ids = new Set();
  for (const [nome, lista] of Object.entries(SEQUENCIAS)) {
    assert.ok(lista.length >= 2 && lista.length <= 6, `${nome}: ${lista.length} passos`);
    for (const p of lista) {
      assert.ok(!ids.has(p.id), `id repetido ${p.id}`);
      ids.add(p.id);
      assert.ok(ABAS.includes(p.aba), `${p.id}: aba inválida`);
      assert.equal(p.aba, nome === 'inicio' ? 'loja' : nome, `${p.id}: o passo é de outra aba`);
      if (p.sub) assert.ok(SUBS[p.aba]?.includes(p.sub), `${p.id}: sub-aba inválida`);
      assert.ok(p.texto.length > 20 && p.texto.length <= 200, `${p.id}: texto curto (${p.texto.length} caracteres)`);
      assert.ok(p.botao || p.espera?.length, `${p.id}: sem como avançar`);
      for (const ev of p.espera ?? []) assert.ok(EVENTOS_DO_JOGO.includes(ev), `${p.id}: evento desconhecido "${ev}"`);
      if (p.presente) assert.ok(DATA.receitas[p.presente], `${p.id}: receita do presente inexistente`);
    }
    assert.ok(lista.at(-1).botao, `${nome}: termina com um botão`);
  }
});

test('todas as abas fora a Loja têm tutorial próprio, e o começo fica só na Loja', () => {
  assert.deepEqual([...ABAS_COM_TUTORIAL].sort(), ABAS.filter((a) => a !== 'loja').sort());
  assert.ok(SEQUENCIAS.inicio.every((p) => p.aba === 'loja'));
});

test('o tutorial ensina a conseguir itens: oficina (produzir e coletar), mercado (comprar) e mapa', () => {
  const ids = (n) => SEQUENCIAS[n].map((p) => p.id);
  assert.ok(ids('oficina').includes('oficina-produzir') && ids('oficina').includes('oficina-coletar'));
  assert.ok(ids('mercado').includes('mercado-comprar'));
  assert.ok(SEQUENCIAS.mercado.some((p) => p.sub === 'mapa'));
  const o = ids('oficina');
  assert.ok(o.indexOf('oficina-produzir') < o.indexOf('oficina-coletar'));
});

test('a receita guiada é do ofício que já vem aberto, no nível 1, com materiais vendidos desde o começo', () => {
  const r = DATA.receitas[RECEITA_GUIADA];
  assert.equal(r.oficio, DATA.meta.oficios[0].id);
  assert.ok(r.nivel <= 1);
  for (const m of Object.keys(r.materiais)) {
    assert.ok(DATA.listas.fornecedores.some((f) => (f.nivelRep ?? 1) <= 1 && f.vende.some((v) => v.material === m)), `${m} não é vendido de início`);
  }
});

test('os alvos destacados são nomes de botões que as telas registram', () => {
  const nomesConhecidos = ['preco:justo', 'coletarTudo', `produzir:${RECEITA_GUIADA}`, 'bonus'];
  for (const lista of Object.values(SEQUENCIAS)) {
    for (const p of lista) {
      if (typeof p.alvo === 'string') assert.ok(nomesConhecidos.includes(p.alvo), `${p.id}: alvo ${p.alvo}`);
      else if (p.alvo) assert.ok(p.alvo.termina, `${p.id}: alvo desconhecido`);
    }
  }
});

test('save antigo (tutorial só com passo e feito) ganha os campos novos sem perder o que tinha', () => {
  const velho = { tutorial: { passo: 3, feito: true } };
  const novo = withDefaults(velho, defaultState(0));
  assert.equal(novo.tutorial.feito, true);
  assert.equal(novo.tutorial.seq, '');
  assert.deepEqual(novo.tutorial.abas, {});
});
