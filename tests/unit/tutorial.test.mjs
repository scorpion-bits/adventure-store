import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL, RECEITA_GUIADA } from '../../src/data/tutorial.js';
import { DATA } from '../../src/data/index.js';
import { META } from '../../src/data/meta.js';

const ABAS = ['loja', 'oficina', 'mercado', 'aventureiros', 'melhorias'];
const SUBS = { mercado: ['fornecedores', 'mapa'], aventureiros: ['hoje', 'colecao', 'lendarios'], melhorias: ['loja', 'equipe', 'oficios', 'conquistas', 'expandir'] };
const EVENTOS_DO_JOGO = ['venda', 'recusa', 'compra', 'produziu', 'coletou'];

test('o tutorial é guiado e enxuto: cada passo tem texto, aba válida e uma saída (botão ou ação)', () => {
  assert.ok(TUTORIAL.length >= 8 && TUTORIAL.length <= 16, `${TUTORIAL.length} passos`);
  const ids = new Set();
  for (const p of TUTORIAL) {
    assert.ok(!ids.has(p.id), `id repetido ${p.id}`);
    ids.add(p.id);
    assert.ok(ABAS.includes(p.aba), `${p.id}: aba inválida`);
    if (p.sub) assert.ok(SUBS[p.aba]?.includes(p.sub), `${p.id}: sub-aba inválida`);
    assert.ok(p.texto.length > 20 && p.texto.length <= 200, `${p.id}: texto curto (${p.texto.length} caracteres)`);
    assert.ok(p.botao || p.espera?.length, `${p.id}: sem como avançar`);
    for (const ev of p.espera ?? []) assert.ok(EVENTOS_DO_JOGO.includes(ev), `${p.id}: evento desconhecido "${ev}"`);
    if (p.compra) assert.ok(DATA.receitas[p.compra], `${p.id}: receita guiada inexistente`);
  }
  assert.ok(TUTORIAL.at(-1).botao, 'o último passo se encerra com um botão');
});

test('o tutorial passa por todas as telas principais e ensina a conseguir itens (mercado, oficina e mapa)', () => {
  const abas = new Set(TUTORIAL.map((p) => p.aba));
  for (const a of ABAS) assert.ok(abas.has(a), `nenhum passo na aba ${a}`);
  assert.ok(TUTORIAL.some((p) => p.aba === 'mercado' && p.sub === 'mapa'), 'fala das expedições');
  const ordem = TUTORIAL.map((p) => p.id);
  assert.ok(ordem.indexOf('mercado') < ordem.indexOf('oficina') && ordem.indexOf('oficina') < ordem.indexOf('coletar'), 'comprar, produzir, coletar');
});

test('a receita guiada cabe no ouro inicial e é do ofício que já vem aberto', () => {
  const r = DATA.receitas[RECEITA_GUIADA];
  assert.equal(r.oficio, META.oficios[0].id);
  assert.ok(r.nivel <= 1);
  const custo = Object.entries(r.materiais).reduce((n, [m, q]) => n + DATA.materiais[m].valor * 1.5 * q, 0);
  assert.ok(custo < META.inicio.ouro / 2, `custa ${custo}`);
  // todo material dela é vendido por algum fornecedor da primeira região
  for (const m of Object.keys(r.materiais)) {
    assert.ok(DATA.listas.fornecedores.some((f) => (f.nivelRep ?? 1) <= 1 && f.vende.some((v) => v.material === m)), `${m} não é vendido de início`);
  }
});

test('os alvos destacados existem como nomes de botões das telas', () => {
  const nomesConhecidos = ['preco:justo', 'coletarTudo', `produzir:${RECEITA_GUIADA}`];
  for (const p of TUTORIAL) if (typeof p.alvo === 'string') assert.ok(nomesConhecidos.includes(p.alvo), `${p.id}: alvo ${p.alvo}`);
});
