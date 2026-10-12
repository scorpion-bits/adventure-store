import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { DATA } from '../../src/data/index.js';
import { gerarCliente, falasDe, opcoes } from '../../src/core/shop.js';

const jogoNoNivel = (nivel, seed = 1) => {
  const state = defaultState(0);
  state.rep = repParaNivel(nivel);
  return createGame({ state, clock: createClock(0), rng: createRng(seed) });
};

test('são 40+ tipos em 8 classes e 6 regiões, com variedade mínima', () => {
  const lista = DATA.listas.aventureiros.filter((a) => !a.lendario);
  assert.ok(lista.length >= 40);
  for (const c of DATA.meta.classes) assert.ok(lista.filter((a) => a.classe === c.id).length >= 5, c.id);
  for (const r of DATA.listas.regioes) assert.ok(lista.filter((a) => a.regiao === r.id).length >= 6, r.id);
  for (const t of DATA.meta.temperamentos) assert.ok(lista.filter((a) => a.temperamento === t.id).length >= 3, t.id);
});

test('cada aventureiro tem frases para todas as situações (próprias ou do temperamento)', () => {
  const g = jogoNoNivel(1);
  for (const a of DATA.listas.aventureiros) {
    for (const k of ['chega', 'compra', 'recusa', 'barato', 'caro']) {
      const f = falasDe(g, a, k);
      assert.ok(f.length >= 1 && f.every((x) => typeof x === 'string' && x.length > 3), `${a.id}.${k}`);
    }
  }
  const a = DATA.aventureiros.aprendiz_guerreiro;
  assert.deepEqual(falasDe(g, a, 'compra'), a.falas.compra, 'a fala própria vence');
  assert.ok(falasDe(g, DATA.aventureiros.soldado_guarda, 'compra').length >= 2, 'sem fala própria, usa a do temperamento');
});

test('o orçamento e o nível de reputação crescem de região em região', () => {
  const por = (r) => DATA.listas.aventureiros.filter((a) => a.regiao === r);
  const regs = DATA.listas.regioes;
  for (let i = 1; i < regs.length; i++) {
    const antes = por(regs[i - 1].id);
    const agora = por(regs[i].id);
    const media = (l) => l.reduce((n, a) => n + a.orcamento, 0) / l.length;
    assert.ok(media(agora) > media(antes), `${regs[i].id} é mais rica que ${regs[i - 1].id}`);
    for (const a of agora) assert.ok(a.nivelRep >= regs[i].nivelRep, `${a.id} só vem depois de a região abrir`);
  }
});

test('todo aventureiro comum consegue pedir algo no nível em que aparece', () => {
  for (const a of DATA.listas.aventureiros.filter((x) => !x.lendario)) {
    const g = jogoNoNivel(Math.max(a.nivelRep, DATA.regioes[a.regiao].nivelRep));
    let pediu = false;
    for (let i = 0; i < 400 && !pediu; i++) {
      const c = gerarCliente(g);
      if (c.adv === a.id && c.pedido.tipo === 'item') pediu = true;
    }
    assert.ok(pediu, `${a.id} nunca pede um item pelo nome`);
  }
});

test('no começo só aparecem clientes da vila; ao subir de nível chegam os de outras regiões', () => {
  const g1 = jogoNoNivel(1);
  const regioes1 = new Set(Array.from({ length: 400 }, () => DATA.aventureiros[gerarCliente(g1).adv].regiao));
  assert.deepEqual([...regioes1], ['vila']);
  const g30 = jogoNoNivel(30);
  const regioes30 = new Set(Array.from({ length: 1500 }, () => DATA.aventureiros[gerarCliente(g30).adv].regiao));
  assert.equal(regioes30.size, 6);
});

test('clientes pedem por nome só itens da faixa de valor da região deles', () => {
  const g = jogoNoNivel(30);
  for (let i = 0; i < 3000; i++) {
    const c = gerarCliente(g);
    if (c.pedido.tipo !== 'item') continue;
    const adv = DATA.aventureiros[c.adv];
    const reg = DATA.regioes[adv.regiao];
    const v = DATA.itens[c.pedido.item].valor;
    // se a categoria dele não tiver nada na faixa, o jogo relaxa a regra; fora isso a faixa vale
    const algumNaFaixa = DATA.listas.itens.some((it) => adv.prefere.includes(it.cat) && it.valor >= reg.valorMin && it.valor <= reg.valorMax);
    if (algumNaFaixa) assert.ok(v >= reg.valorMin && v <= reg.valorMax, `${adv.id} (${adv.regiao}) pediu ${c.pedido.item} de valor ${v}`);
  }
});

test('os temperamentos aparecem em proporções razoáveis (nenhum domina)', () => {
  const g = jogoNoNivel(30);
  const cont = {};
  for (let i = 0; i < 4000; i++) { const t = DATA.aventureiros[gerarCliente(g).adv].temperamento; cont[t] = (cont[t] ?? 0) + 1; }
  for (const t of DATA.meta.temperamentos) {
    const f = (cont[t.id] ?? 0) / 4000;
    assert.ok(f > 0.04 && f < 0.28, `${t.id}: ${(f * 100).toFixed(1)}%`);
  }
});

test('o estoque inicial atende pelo menos metade dos clientes novatos', () => {
  const g = jogoNoNivel(1);
  let atendidos = 0;
  for (let i = 0; i < 300; i++) {
    const c = gerarCliente(g);
    if (opcoes(g, c).length > 0) atendidos++;
  }
  assert.ok(atendidos / 300 > 0.5, `${atendidos}/300`);
});
