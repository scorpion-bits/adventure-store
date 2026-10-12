import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { DATA } from '../../src/data/index.js';
import { repParaNivel } from '../../src/core/economy.js';
import {
  gerarCliente, chegar, opcoes, avaliar, vender, dispensar, passarNaFrente, tickLoja,
  capacidadeFila, pedidoTexto, intervaloChegada,
} from '../../src/core/shop.js';

const novo = (seed = 1, mexer) => {
  const state = defaultState(0);
  mexer?.(state);
  return createGame({ state, rng: createRng(seed), clock: createClock(new Date(2026, 7, 4, 12).getTime()) });
};

// põe um cliente específico na fila, com o pedido que o teste quiser
const cliente = (game, adv, pedido) => {
  game.state.loja.uid += 1;
  const cli = { uid: game.state.loja.uid, adv, pedido, paciencia: 70000, pacienciaMax: 70000, fala: '' };
  game.state.fila.push(cli);
  return cli;
};

test('gerarCliente: aventureiro e pedido válidos, só do nível de reputação atual', () => {
  const g = novo(3);
  for (let i = 0; i < 300; i++) {
    const c = gerarCliente(g);
    const adv = DATA.aventureiros[c.adv];
    assert.ok(adv, 'aventureiro existe');
    assert.ok((adv.nivelRep ?? 1) <= g.nivel());
    assert.ok(['item', 'categoria', 'surpresa'].includes(c.pedido.tipo));
    if (c.pedido.tipo === 'item') {
      const it = DATA.itens[c.pedido.item];
      assert.ok(it && adv.prefere.includes(it.cat), 'item pedido é de uma categoria que ele prefere');
      assert.ok((it.nivelRep ?? 1) <= g.nivel(), 'não pede item que a loja ainda não vende');
    }
    if (c.pedido.tipo === 'categoria') assert.ok(adv.prefere.includes(c.pedido.cat));
    assert.ok(c.pacienciaMax > 0);
  }
});

test('os três tipos de pedido aparecem', () => {
  const g = novo(4);
  const tipos = new Set(Array.from({ length: 200 }, () => gerarCliente(g).pedido.tipo));
  assert.deepEqual([...tipos].sort(), ['categoria', 'item', 'surpresa']);
});

test('opcoes: item pedido primeiro, substitutos da mesma categoria depois, nada de outra categoria', () => {
  const g = novo(1, (s) => { s.estoque = { 'espada_ferro:1': 1, 'adaga_bronze:1': 2, 'pao_aventureiro:1': 5, 'pocao_cura:1': 0 }; });
  const c = cliente(g, 'aprendiz_guerreiro', { tipo: 'item', item: 'espada_ferro' });
  const o = opcoes(g, c);
  assert.deepEqual(o.map((x) => [x.item.id, x.substituto]), [['espada_ferro', false], ['adaga_bronze', true]]);
  assert.match(pedidoTexto(g, c), /Espada de ferro/);

  const porCat = cliente(g, 'aprendiz_guerreiro', { tipo: 'categoria', cat: 'comida' });
  assert.deepEqual(opcoes(g, porCat).map((x) => x.item.id), ['pao_aventureiro']);

  const surpresa = cliente(g, 'aprendiz_guerreiro', { tipo: 'surpresa' });
  assert.equal(opcoes(g, surpresa).length, 3);          // tudo que tem quantidade > 0
  assert.match(pedidoTexto(g, surpresa), /surpreenda/);
});

test('avaliar: pechincheiro prefere barato e esnobe prefere caro', () => {
  const g = novo();
  const pao = { item: DATA.itens.ensopado, qualidade: 1, substituto: false };
  const pech = cliente(g, 'aprendiz_guerreiro', { tipo: 'surpresa' });           // pechincheiro, orçamento 1,05
  assert.ok(avaliar(g, pech, { ...pao, item: DATA.itens.espada_ferro }, 'barato').chance
    > avaliar(g, pech, { ...pao, item: DATA.itens.espada_ferro }, 'justo').chance);
  const esn = cliente(g, 'bardo_cantor', { tipo: 'surpresa' });                   // esnobe, orçamento 1,5
  const anel = { item: DATA.itens.anel_cobre, qualidade: 1, substituto: false };
  assert.ok(avaliar(g, esn, anel, 'caro').chance > avaliar(g, esn, anel, 'barato').chance);
});

test('avaliar: passou do orçamento, quase nunca compra; substituto vende menos', () => {
  const g = novo();
  const c = cliente(g, 'aprendiz_guerreiro', { tipo: 'item', item: 'espada_ferro' });   // orçamento 1,05
  const espada = { item: DATA.itens.espada_ferro, qualidade: 1, substituto: false };
  assert.ok(avaliar(g, c, espada, 'caro').chance <= DATA.meta.loja.semOrcamento + 1e-9);
  assert.ok(avaliar(g, c, { ...espada, qualidade: 2 }, 'justo').chance <= DATA.meta.loja.semOrcamento + 1e-9, 'item fino a preço justo passa de 1,05');
  assert.ok(avaliar(g, c, { ...espada, qualidade: 2 }, 'barato').chance > 0.5, 'item fino mais barato cabe no bolso');
  assert.ok(avaliar(g, c, { ...espada, substituto: true }, 'justo').chance < avaliar(g, c, espada, 'justo').chance);
  for (const nivel of ['barato', 'justo', 'caro']) {
    const a = avaliar(g, c, espada, nivel);
    assert.ok(a.chance >= 0 && a.chance <= 0.99);
    assert.ok(a.preco >= 1);
  }
});

test('avaliar: preços barato < justo < caro e reação coerente com a chance', () => {
  const g = novo();
  const c = cliente(g, 'clerigo_viajante', { tipo: 'surpresa' });
  const e = { item: DATA.itens.pocao_cura, qualidade: 1, substituto: false };
  const b = avaliar(g, c, e, 'barato');
  const j = avaliar(g, c, e, 'justo');
  const k = avaliar(g, c, e, 'caro');
  assert.ok(b.preco < j.preco && j.preco < k.preco);
  assert.equal(avaliar(g, c, e, 'justo').reacao.id, j.chance >= 0.85 ? 'adora' : j.chance >= 0.6 ? 'aceita' : j.chance >= 0.3 ? 'hesita' : 'recusa');
});

test('vender: a frequência de compra bate com a chance calculada', () => {
  let vendas = 0;
  let chance = 0;
  const N = 1500;
  for (let i = 0; i < N; i++) {
    const g = novo(100 + i, (s) => { s.estoque = { 'pocao_cura:1': 1 }; });
    const c = cliente(g, 'maga_estudante', { tipo: 'item', item: 'pocao_cura' });
    chance = avaliar(g, c, opcoes(g, c)[0], 'justo').chance;
    if (vender(g, c.uid, 'pocao_cura:1', 'justo').ok) vendas++;
  }
  assert.ok(Math.abs(vendas / N - chance) < 0.05, `esperado ~${chance}, obtido ${vendas / N}`);
});

test('vender com sucesso: estoque, ouro, reputação e estatísticas', () => {
  const g = novo(1, (s) => { s.estoque = { 'pocao_cura:1': 2 }; });
  const c = cliente(g, 'clerigo_viajante', { tipo: 'item', item: 'pocao_cura' });
  g.rng = { ...g.rng, chance: () => true };                       // força a compra
  const eventos = [];
  g.on('venda', (v) => eventos.push(v));
  const r = vender(g, c.uid, 'pocao_cura:1', 'justo');
  assert.equal(r.ok, true);
  assert.equal(g.state.estoque['pocao_cura:1'], 1);
  assert.equal(g.state.ouro, 100 + 20);
  assert.equal(g.state.stats.vendas, 1);
  assert.equal(g.state.fila.length, 0);
  assert.ok(g.state.rep > 0);
  assert.equal(eventos.length, 1);
  vender(g, cliente(g, 'clerigo_viajante', { tipo: 'surpresa' }).uid, 'pocao_cura:1', 'justo');
  assert.ok(!('pocao_cura:1' in g.state.estoque), 'chave some quando zera');
});

test('vender com recusa: cliente sai, estoque intacto, reputação cai conforme o temperamento', () => {
  const g = novo(1, (s) => { s.estoque = { 'espada_ferro:1': 1 }; s.rep = 10; });
  const c = cliente(g, 'aprendiz_guerreiro', { tipo: 'item', item: 'espada_ferro' });
  g.rng = { ...g.rng, chance: () => false };
  const r = vender(g, c.uid, 'espada_ferro:1', 'caro');
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'recusou');
  assert.equal(g.state.estoque['espada_ferro:1'], 1);
  assert.equal(g.state.ouro, 100);
  assert.equal(g.state.rep, 9);
  assert.equal(g.state.stats.recusas, 1);
  assert.equal(g.state.fila.length, 0);
});

test('vender: casos inválidos não mexem em nada', () => {
  const g = novo(1, (s) => { s.estoque = { 'pao_aventureiro:1': 1 }; });
  const c = cliente(g, 'aprendiz_guerreiro', { tipo: 'item', item: 'espada_ferro' });
  assert.equal(vender(g, 999, 'pao_aventureiro:1', 'justo').motivo, 'cliente-ausente');
  assert.equal(vender(g, c.uid, 'pao_aventureiro:1', 'justo').motivo, 'sem-estoque');   // pão não serve para quem quer espada
  assert.equal(g.state.fila.length, 1);
  assert.equal(g.state.estoque['pao_aventureiro:1'], 1);
});

test('dispensar: não custa reputação, o cliente sai da fila e conta como recusa', () => {
  const g = novo(1, (s) => { s.rep = 20; });
  const imp = cliente(g, 'cacador_lobos', { tipo: 'surpresa' });      // impaciente (recusa -2): dispensar é escolha do jogador
  assert.equal(dispensar(g, imp.uid).rep, 0);
  assert.equal(g.state.rep, 20);
  assert.equal(g.state.stats.recusas, 1);
  const pech = cliente(g, 'aprendiz_guerreiro', { tipo: 'surpresa' });
  assert.equal(dispensar(g, pech.uid).rep, 0);
  assert.equal(g.state.rep, 20);
  assert.equal(dispensar(g, 12345), null);
});

test('passarNaFrente reordena a fila', () => {
  const g = novo();
  const a = cliente(g, 'aprendiz_guerreiro', { tipo: 'surpresa' });
  const b = cliente(g, 'bardo_cantor', { tipo: 'surpresa' });
  const c = cliente(g, 'maga_estudante', { tipo: 'surpresa' });
  assert.equal(passarNaFrente(g, c.uid), true);
  assert.deepEqual(g.state.fila.map((x) => x.uid), [c.uid, a.uid, b.uid]);
  assert.equal(passarNaFrente(g, c.uid), false);           // já é o primeiro
});

test('tick: o primeiro cliente chega logo e a fila respeita a capacidade', () => {
  const g = novo(2);
  tickLoja(g, 2000);
  assert.equal(g.state.fila.length, 1);
  for (let i = 0; i < 60; i++) tickLoja(g, 3000);
  assert.ok(g.state.fila.length <= capacidadeFila(g));
  g.mods.fila = 2;
  assert.equal(capacidadeFila(g), 5);
});

test('tick: cliente que espera demais vai embora e a reputação cai (metade da recusa)', () => {
  const g = novo(1, (s) => { s.rep = 50; s.loja.proximaChegada = 1e9; });
  cliente(g, 'cacador_lobos', { tipo: 'surpresa' });           // impaciente
  const saidas = [];
  g.on('saiu', (e) => saidas.push(e));
  tickLoja(g, 40000);
  assert.equal(g.state.fila.length, 1);
  tickLoja(g, 40000);                                           // passou de 75s * 0,55
  assert.equal(g.state.fila.length, 0);
  assert.equal(saidas.length, 1);
  assert.equal(g.state.rep, 49);       // recusa -2, metade = -1
  assert.equal(g.state.stats.recusas, 1);
});

test('intervalo entre chegadas diminui com a reputação, mas respeita o mínimo', () => {
  const media = (nivel) => {
    const g = novo(9, (s) => { s.rep = repParaNivel(nivel); });
    return Array.from({ length: 400 }, () => intervaloChegada(g)).reduce((a, b) => a + b, 0) / 400;
  };
  assert.ok(media(1) > media(10));
  assert.ok(media(50) >= DATA.meta.loja.intervaloMin * 0.5);
});

test('chegar não passa da capacidade e avisa a interface', () => {
  const g = novo(5);
  const avisos = [];
  g.on('chegou', (c) => avisos.push(c.uid));
  for (let i = 0; i < 10; i++) chegar(g);
  assert.equal(g.state.fila.length, 3);
  assert.equal(avisos.length, 3);
});

test('save com cliente de aventureiro removido: o jogo carrega e descarta o cliente', () => {
  const state = defaultState(0);
  state.fila = [{ uid: 1, adv: 'nao_existe_mais', pedido: { tipo: 'surpresa' }, paciencia: 5, pacienciaMax: 70000 }, { uid: 2, adv: 'bardo_cantor', pedido: { tipo: 'surpresa' }, paciencia: 5, pacienciaMax: 70000 }];
  const g = createGame({ state });
  assert.equal(g.state.fila.length, 1);
  assert.equal(g.state.fila[0].paciencia, 70000, 'paciência volta ao máximo ao carregar');
});

test('ninguém pede pelo nome um item que só existe como achado raro de expedição', async () => {
  const { itensPedidos } = await import('../../src/core/shop.js');
  const { obtivel } = await import('../../src/core/obtivel.js');
  assert.equal(obtivel(novo(), 'ovo_dragao'), false);
  assert.equal(obtivel(novo(), 'espada_ferro'), true);
  const g = novo(1, (s) => { s.rep = repParaNivel(40); });
  for (const adv of g.data.listas.aventureiros) {
    for (const it of itensPedidos(g, adv)) assert.ok(obtivel(g, it.id), `${adv.id} pediria ${it.id}`);
  }
});
