import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { comprarMelhoria, contratar } from '../../src/core/upgrades.js';
import { desbloquearOficio } from '../../src/core/craft.js';
import { proximoObjetivo } from '../../src/core/objetivo.js';

const T0 = new Date(2026, 7, 4, 12).getTime();
const novo = (nivel = 1, ouro = 0, mexer) => {
  const state = defaultState(T0);
  state.rep = repParaNivel(nivel);
  state.ouro = ouro;
  state.tutorial.feito = true;
  mexer?.(state);
  return createGame({ state, clock: createClock(T0), rng: createRng(1) });
};

test('sem ouro, o objetivo é o que está mais perto de dar para comprar', () => {
  const g = novo(1, 50);
  const o = proximoObjetivo(g);
  assert.ok(o);
  assert.equal(o.pronto, false);
  assert.ok(o.progresso > 0 && o.progresso < 1);
  assert.match(o.detalhe, /de ouro/);
  assert.ok(o.aba && o.alvo, 'sempre diz para onde ir e o que destacar');
});

test('com ouro de sobra a compra mais barata fica pronta e leva à aba certa', () => {
  const g = novo(1, 1000);
  const o = proximoObjetivo(g);
  assert.equal(o.pronto, true);
  assert.equal(o.progresso, 1);
  // é a mais barata das disponíveis agora
  const todos = [...g.data.listas.melhorias.filter((m) => (m.nivelRep ?? 1) <= 1 && !(m.requer ?? []).length).map((m) => m.custo), ...g.data.meta.oficios.filter((x) => x.nivelRep <= 1 && x.custo > 0).map((x) => x.custo)];
  assert.equal(o.custo, Math.min(...todos));
});

test('comprar muda o objetivo para o próximo; nunca sugere o que já foi comprado', () => {
  const g = novo(1, 100000);
  const vistos = new Set();
  for (let i = 0; i < 12; i++) {
    const o = proximoObjetivo(g);
    if (!o || o.tipo === 'nivel') break;
    assert.ok(!vistos.has(o.id), `repetiu ${o.id}`);
    vistos.add(o.id);
    const r = o.tipo === 'melhoria' ? comprarMelhoria(g, o.id) : o.tipo === 'oficio' ? desbloquearOficio(g, o.id) : contratar(g, o.id);
    assert.equal(r.ok, true, `${o.tipo} ${o.id} deveria poder ser comprado: ${r.motivo}`);
  }
  assert.ok(vistos.size >= 5, 'seguiu uma sequência de compras');
});

test('quando só falta reputação, o objetivo é o próximo nível e diz o que ele abre', () => {
  const g = novo(1, 0);
  // tira tudo o que se compra no nível 1 para sobrar só portões de nível
  for (const m of g.data.listas.melhorias) if ((m.nivelRep ?? 1) <= 1) g.state.melhorias[m.id] = true;
  for (const o of g.data.meta.oficios) if (o.nivelRep <= 1) g.state.oficios[o.id] = { nivel: 1, xp: 0 };
  const o = proximoObjetivo(g);
  assert.equal(o.tipo, 'nivel');
  assert.equal(o.nivelRep, 2);
  assert.match(o.titulo, /nível 2/);
  assert.ok(o.detalhe.startsWith('abre '));
  assert.ok(o.progresso >= 0 && o.progresso < 1);
  g.state.rep = Math.floor((repParaNivel(1) + repParaNivel(2)) / 2);
  assert.ok(proximoObjetivo(g).progresso > 0.3, 'a barra anda com a reputação');
});

test('as regiões entram como "abre" no nível certo e a expansão aparece quando não há compra pronta', () => {
  const g = novo(4, 0);
  const o = proximoObjetivo(g);
  assert.ok(o);
  const g2 = novo(15, 0, (s) => { s.stats.ouroTotal = 500000; });
  for (const m of g2.data.listas.melhorias) g2.state.melhorias[m.id] = true;
  for (const f of Object.keys(g2.data.equipe)) g2.state.equipe[f] = { nivel: g2.data.equipe[f].niveis.length };
  for (const x of g2.data.meta.oficios) g2.state.oficios[x.id] = { nivel: 1, xp: 0 };
  const e = proximoObjetivo(g2);
  assert.equal(e.tipo, 'expansao');
  assert.equal(e.pronto, true);
  assert.equal(e.aba, 'melhorias');
});

test('o objetivo é sempre bem formado, em qualquer ponto do jogo', () => {
  for (const nivel of [1, 2, 3, 5, 8, 12, 16, 20, 25, 30]) {
    for (const ouro of [0, 80, 5000, 5e6]) {
      const o = proximoObjetivo(novo(nivel, ouro));
      if (!o) continue;
      assert.ok(o.titulo && o.detalhe && (o.aba || o.dica), `${nivel}/${ouro}`);
      assert.ok(o.progresso >= 0 && o.progresso <= 1, `${nivel}/${ouro} progresso ${o.progresso}`);
      assert.equal(typeof o.pronto, 'boolean');
    }
  }
});

test('cada objetivo aponta o botão exato: melhoria da loja, da árvore de um ofício, ofício, funcionário e expansão', () => {
  const g = novo(30, 1e9);
  const vistos = new Map();
  for (let i = 0; i < 400; i++) {
    const o = proximoObjetivo(g);
    if (!o || o.tipo === 'nivel' || o.tipo === 'expansao') break;
    vistos.set(o.tipo === 'melhoria' && o.oficio ? 'melhoria-oficio' : o.tipo, o);
    const r = o.tipo === 'melhoria' ? comprarMelhoria(g, o.id) : o.tipo === 'oficio' ? desbloquearOficio(g, o.id) : contratar(g, o.id);
    assert.equal(r.ok, true);
  }
  const loja = vistos.get('melhoria');
  assert.ok(loja, 'viu uma melhoria da loja');
  assert.equal(loja.aba, 'melhorias');
  assert.equal(loja.sub, 'loja');
  assert.equal(loja.alvo, `comprar:${loja.id}`);
  const arvore = vistos.get('melhoria-oficio');
  assert.ok(arvore, 'viu uma melhoria da árvore de um ofício');
  assert.equal(arvore.sub, 'oficios');
  assert.ok(g.data.meta.oficios.some((x) => x.id === arvore.oficio), 'diz de qual ofício');
  assert.equal(arvore.alvo, `comprar:${arvore.id}`);
  const of = vistos.get('oficio');
  assert.equal(of.aba, 'oficina');
  assert.equal(of.oficio, of.id);
  assert.equal(of.alvo, 'desbloquear');
  const eq = vistos.get('equipe');
  assert.equal(eq.sub, 'equipe');
  assert.equal(eq.alvo, `contratar:${eq.id}`);
});

test('o objetivo de nível não leva a lugar nenhum, mas explica quanto falta', () => {
  const g = novo(1, 0);
  for (const m of g.data.listas.melhorias) if ((m.nivelRep ?? 1) <= 1) g.state.melhorias[m.id] = true;
  for (const o of g.data.meta.oficios) if (o.nivelRep <= 1) g.state.oficios[o.id] = { nivel: 1, xp: 0 };
  const o = proximoObjetivo(g);
  assert.equal(o.tipo, 'nivel');
  assert.equal(o.aba, undefined);
  assert.match(o.dica, /Faltam [\d.,]+ pontos de reputação para o nível 2/);
});
