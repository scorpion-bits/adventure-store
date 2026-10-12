import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { DATA } from '../../src/data/index.js';
import { recalcularMods, modsBase, EFEITOS, descreverEfeito } from '../../src/core/mods.js';
import {
  comprarMelhoria, estadoMelhoria, contratar, proximoNivel, nivelFuncionario, comprarDecoracao, usarDecoracao, melhoriasDoGrupo,
} from '../../src/core/upgrades.js';
import { capacidadeEstoque, totalEstoque, espacoLivre } from '../../src/core/estoque.js';
import { capacidadeFila } from '../../src/core/shop.js';
import { slotsDe, duracaoDe } from '../../src/core/craft.js';

const novo = (mexer) => {
  const clock = createClock(new Date(2026, 9, 12, 12).getTime());
  const state = defaultState(clock.now());
  state.ouro = 1e6;
  state.rep = repParaNivel(30);
  mexer?.(state);
  return createGame({ state, clock, rng: createRng(1) });
};

test('recalcularMods parte do zero: sem melhorias, tudo no padrão', () => {
  const g = novo();
  assert.deepEqual(g.mods, modsBase());
  assert.equal(capacidadeFila(g), 3);
  assert.equal(capacidadeEstoque(g), 24);
});

test('comprar melhoria: gasta ouro, aplica o efeito e não deixa comprar duas vezes', () => {
  const g = novo();
  const avisos = [];
  g.on('melhoria', (m) => avisos.push(m.id));
  const antes = g.state.ouro;
  assert.equal(comprarMelhoria(g, 'ampliar_1').ok, true);
  assert.equal(g.state.ouro, antes - DATA.melhorias.ampliar_1.custo);
  assert.equal(capacidadeFila(g), 4);
  assert.equal(comprarMelhoria(g, 'ampliar_1').motivo, 'ja-comprada');
  assert.equal(g.state.ouro, antes - DATA.melhorias.ampliar_1.custo);
  assert.deepEqual(avisos, ['ampliar_1']);
});

test('requisitos, reputação e ouro bloqueiam a compra sem gastar nada', () => {
  const g = novo((s) => { s.rep = 0; s.ouro = 50; });
  assert.equal(comprarMelhoria(g, 'ampliar_2').motivo, 'requisito');
  assert.deepEqual(estadoMelhoria(g, DATA.melhorias.ampliar_2).faltam, ['ampliar_1']);
  assert.equal(comprarMelhoria(g, 'ampliar_1').motivo, 'sem-ouro');
  g.state.ouro = 1e6;
  g.state.melhorias.ampliar_1 = true;
  assert.equal(comprarMelhoria(g, 'ampliar_2').motivo, 'reputacao');
  assert.equal(g.state.ouro, 1e6);
  assert.equal(comprarMelhoria(g, 'nao_existe').motivo, 'inexistente');
});

test('efeitos de várias melhorias se combinam (soma, produto e por ofício)', () => {
  const g = novo();
  for (const id of ['ampliar_1', 'ampliar_2', 'ampliar_3', 'ampliar_4']) assert.equal(comprarMelhoria(g, id).ok, true, id);
  assert.equal(capacidadeFila(g), 3 + 1 + 1 + 1 + 2);
  assert.ok(Math.abs(g.mods.chegada - 1.1) < 1e-9);
  assert.equal(comprarMelhoria(g, 'sino_porta').ok, true);
  assert.ok(Math.abs(g.mods.chegada - 1.1 * 1.1) < 1e-9, 'multiplicadores se multiplicam');

  assert.equal(slotsDe(g, 'ferraria'), 1);
  comprarMelhoria(g, 'ferraria_bancada'); comprarMelhoria(g, 'ferraria_ferramentas');
  assert.equal(slotsDe(g, 'ferraria'), 2);
  assert.equal(slotsDe(g, 'alquimia'), 1, 'não vaza para outro ofício');
  assert.equal(duracaoDe(g, DATA.receitas.r_espada_ferro), Math.round(90000 / 1.15));
  assert.equal(duracaoDe(g, DATA.receitas.r_pocao_cura), 40000);
});

test('capacidade das prateleiras cresce com as melhorias', () => {
  const g = novo((s) => { s.estoque = { 'pao_aventureiro:1': 20 }; });
  assert.equal(totalEstoque(g), 20);
  assert.equal(espacoLivre(g), 4);
  comprarMelhoria(g, 'prateleiras_1');
  assert.equal(capacidadeEstoque(g), 34);
  assert.equal(espacoLivre(g), 14);
});

test('recalcular é idempotente e refaz tudo (sem acumular)', () => {
  const g = novo();
  comprarMelhoria(g, 'ampliar_1');
  const a = JSON.stringify(g.mods);
  recalcularMods(g); recalcularMods(g);
  assert.equal(JSON.stringify(g.mods), a);
  delete g.state.melhorias.ampliar_1;
  recalcularMods(g);
  assert.equal(g.mods.fila, 0, 'removeu a melhoria: o efeito some');
});

test('equipe: contratar e promover, com custo, reputação e nível máximo', () => {
  const g = novo((s) => { s.ouro = 1e6; });
  assert.equal(nivelFuncionario(g, 'atendente'), 0);
  assert.equal(g.mods.atendente, 0);
  assert.equal(contratar(g, 'atendente').nivel, 1);
  assert.equal(g.mods.atendente, 30);
  contratar(g, 'atendente');
  assert.equal(g.mods.atendente, 24, 'o nível novo substitui o anterior');
  while (proximoNivel(g, 'atendente')) contratar(g, 'atendente');
  assert.equal(nivelFuncionario(g, 'atendente'), 5);
  assert.equal(g.mods.atendente, 9);
  assert.equal(contratar(g, 'atendente').motivo, 'maximo');
  assert.equal(contratar(g, 'ninguem').motivo, 'inexistente');

  const pobre = novo((s) => { s.ouro = 10; s.rep = 0; });
  assert.equal(contratar(pobre, 'atendente').motivo, 'reputacao');
  pobre.state.rep = repParaNivel(10);
  assert.equal(contratar(pobre, 'atendente').motivo, 'sem-ouro');
  assert.equal(pobre.state.ouro, 10);
});

test('artesão liga coleta automática e repetir; vendedor liga vendas offline', () => {
  const g = novo();
  contratar(g, 'artesao'); contratar(g, 'vendedor');
  assert.equal(g.mods.autoColetar, true);
  assert.equal(g.mods.repetir, true);
  assert.equal(g.mods.vendasOffline, 0.3);
  assert.equal(g.mods.offlineHoras, 2);
});

test('decoração: comprar já passa a usar; trocar de volta; bônus só enquanto está em uso', () => {
  const g = novo();
  assert.equal(g.state.loja.tema, 'rustico');
  assert.equal(usarDecoracao(g, 'taverna').motivo, 'nao-comprada');
  assert.equal(comprarDecoracao(g, 'taverna').ok, true);
  assert.equal(g.state.loja.tema, 'taverna');
  assert.ok(Math.abs(g.mods.chegada - 1.08) < 1e-9);
  assert.equal(comprarDecoracao(g, 'taverna').motivo, 'ja-comprada');
  usarDecoracao(g, 'rustico');
  assert.equal(g.mods.chegada, 1);
  usarDecoracao(g, 'taverna');
  assert.ok(g.mods.chegada > 1);
  const pobre = novo((s) => { s.ouro = 5; });
  assert.equal(comprarDecoracao(pobre, 'taverna').motivo, 'sem-ouro');
  pobre.state.rep = 0;
  assert.equal(comprarDecoracao(pobre, 'real').motivo, 'reputacao');
});

test('todo efeito dos dados é conhecido e tem texto legível', () => {
  const g = novo();
  const todos = [
    ...DATA.listas.melhorias.flatMap((m) => m.efeitos),
    ...DATA.listas.equipe.flatMap((f) => f.niveis.flatMap((n) => n.efeitos)),
    ...DATA.listas.decoracoes.flatMap((d) => d.efeitos),
  ];
  for (const e of todos) {
    assert.ok(EFEITOS[e.tipo], e.tipo);
    const t = descreverEfeito(e, g);
    assert.ok(typeof t === 'string' && t.length > 5 && !t.includes('undefined') && !t.includes('NaN'), `${e.tipo}: "${t}"`);
  }
});

test('cada ofício tem suas melhorias e as dependências formam uma cadeia sem ciclos', () => {
  for (const o of DATA.meta.oficios) assert.ok(melhoriasDoGrupo(novo(), o.id).length >= 3, o.id);
  const visita = (id, pilha = []) => {
    assert.ok(!pilha.includes(id), `ciclo em ${[...pilha, id].join(' > ')}`);
    for (const r of DATA.melhorias[id].requer ?? []) visita(r, [...pilha, id]);
  };
  for (const m of DATA.listas.melhorias) visita(m.id);
});

test('save e recarga: melhorias, equipe e decoração voltam aplicadas', async () => {
  const { saveState, loadState } = await import('../../src/core/save.js');
  const g = novo();
  comprarMelhoria(g, 'ampliar_1'); contratar(g, 'atendente'); comprarDecoracao(g, 'taverna');
  const mem = {};
  const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  saveState(st, g.state);
  const g2 = createGame({ state: loadState(st).state, clock: createClock(0), rng: createRng(2) });
  assert.equal(capacidadeFila(g2), 4);
  assert.equal(g2.mods.atendente, 30);
  assert.equal(g2.state.loja.tema, 'taverna');
  assert.ok(g2.mods.chegada > 1);
});
