import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../../src/data/index.js';

// Coerência dos crafts: os clientes só pedem (nivelRep do item) o que o jogador já consegue obter naquela reputação.
const { listas, meta } = DATA;

// reputação mínima para comprar um material: a do fornecedor e a da região dele (vale o fornecedor mais fácil de alcançar)
const repDeCompra = (id) => Math.min(...listas.fornecedores.filter((f) => f.vende.some((v) => v.material === id))
  .map((f) => Math.max(f.nivelRep ?? 1, DATA.regioes[f.regiao]?.nivelRep ?? 1)));
const repDoOficio = (id) => meta.oficios.find((o) => o.id === id).nivelRep;

// Exceções deliberadas à regra "nivelRep do item >= ofício e >= região dos materiais" (id do item: motivo). Hoje não há nenhuma;
// se algum dia for preciso abrir uma, ela precisa de um motivo escrito aqui.
const EXCECOES_CRAFT = {};

// Itens que o Mercador Errante (reputação 8) vende prontos mas que também saem como achado das expedições desde a vila e da floresta:
// continuam pedidos cedo de propósito (a regra dos fornecedores abaixo não vale para eles).
const EXCECOES_FORNECEDOR = new Set(['dente_lobo', 'osso_antigo', 'pena_grifo', 'cranio_antigo', 'moeda_antiga']);

test('item craftável só é pedido quando o ofício está aberto e os materiais podem ser comprados (nivelRep do item)', () => {
  const erros = [];
  for (const r of listas.receitas) {
    if (EXCECOES_CRAFT[r.item]) continue;
    const item = DATA.itens[r.item];
    const nivel = item.nivelRep ?? 1;
    const ofic = repDoOficio(r.oficio);
    if (nivel < ofic) erros.push(`${r.item}: nivelRep ${nivel} < ofício ${r.oficio} (${ofic})`);
    for (const m of Object.keys(r.materiais)) {
      const rep = repDeCompra(m);
      if (nivel < rep) erros.push(`${r.item}: nivelRep ${nivel} < reputação para comprar "${m}" (${rep})`);
    }
  }
  assert.deepEqual(erros, []);
  for (const id of Object.keys(EXCECOES_CRAFT)) assert.ok(DATA.itens[id] && EXCECOES_CRAFT[id], `exceção inválida: ${id}`);
});

test('item vendido pronto por um fornecedor só é pedido depois da reputação do fornecedor', () => {
  const erros = [];
  for (const f of listas.fornecedores) {
    const rep = Math.max(f.nivelRep ?? 1, DATA.regioes[f.regiao]?.nivelRep ?? 1);
    for (const v of f.vende) {
      const item = DATA.itens[v.material];
      if (!item || EXCECOES_FORNECEDOR.has(item.id)) continue;
      if (listas.receitas.some((r) => r.item === item.id)) continue;        // quem tem receita já é conferido acima
      if ((item.nivelRep ?? 1) < rep) erros.push(`${item.id}: nivelRep ${item.nivelRep ?? 1} < fornecedor ${f.id} (${rep})`);
    }
  }
  assert.deepEqual(erros, []);
});

test('o capítulo de um lendário só pede o item depois da reputação em que o item é pedido', () => {
  const erros = [];
  for (const l of listas.lendarios) {
    for (const [i, c] of l.capitulos.entries()) {
      const nivel = DATA.itens[c.pedido.item].nivelRep ?? 1;
      if (c.nivelRep < nivel) erros.push(`${l.id} cap ${i + 1}: reputação ${c.nivelRep} < nivelRep de ${c.pedido.item} (${nivel})`);
    }
  }
  assert.deepEqual(erros, []);
});

test('todo material é vendido e usado em alguma receita', () => {
  const usados = new Set(listas.receitas.flatMap((r) => Object.keys(r.materiais)));
  const vendidos = new Set(listas.fornecedores.flatMap((f) => f.vende.map((v) => v.material)));
  for (const m of listas.materiais) {
    assert.ok(usados.has(m.id), `"${m.id}" não é usado em nenhuma receita`);
    assert.ok(vendidos.has(m.id), `"${m.id}" não é vendido por ninguém`);
  }
});

test('cada região tem uma boa variedade de materiais', () => {
  for (const r of listas.regioes) {
    const n = listas.materiais.filter((m) => m.regiao === r.id).length;
    assert.ok(n >= 9, `${r.id}: só ${n} materiais`);
  }
});

test('duas receitas não usam exatamente os mesmos materiais nas mesmas quantidades', () => {
  const vistos = new Map();
  for (const r of listas.receitas) {
    const chave = JSON.stringify(Object.entries(r.materiais).sort(([a], [b]) => a.localeCompare(b)));
    assert.ok(!vistos.has(chave), `${r.item} repete os materiais de ${vistos.get(chave)}`);
    vistos.set(chave, r.item);
  }
});

test('razão entre o que a receita rende e o que custa: nunca abaixo de 1,2x e mediana por volta de 2,8x', () => {
  const razoes = listas.receitas.map((r) => {
    const custo = Object.entries(r.materiais).reduce((s, [m, q]) => s + DATA.materiais[m].valor * q, 0);
    const razao = (DATA.itens[r.item].valor * (r.qtd ?? 1)) / custo;
    assert.ok(razao > 1.2, `${r.id}: razão ${razao.toFixed(2)}`);
    return razao;
  }).sort((a, b) => a - b);
  const mediana = razoes[Math.floor(razoes.length / 2)];
  assert.ok(mediana >= 2.4 && mediana <= 3.2, `mediana ${mediana.toFixed(2)}`);
});

test('todo ofício tem receita de nível 1 (senão não dá para começar a ganhar experiência nele)', () => {
  for (const o of meta.oficios) assert.ok(listas.receitas.some((r) => r.oficio === o.id && r.nivel === 1), `${o.id} sem receita de nível 1`);
});
