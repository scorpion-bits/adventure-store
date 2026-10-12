import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { DATA } from '../../src/data/index.js';
import { loadState, saveState } from '../../src/core/save.js';
import { contratar } from '../../src/core/upgrades.js';
import { simularOffline } from '../../src/core/staff.js';
import { gerarCliente, criarCliente, opcoes, vender, dispensar, tickLoja, pedidoTexto } from '../../src/core/shop.js';
import { candidatos, capituloAtual, lendaConcluida, nivelNecessario } from '../../src/core/legends.js';

const T0 = new Date(2026, 7, 4, 12).getTime();
const novo = (nivel = 40, mexer, seed = 1) => {
  const clock = createClock(T0);
  const state = defaultState(T0);
  state.rep = repParaNivel(nivel);
  state.tutorial.feito = true;
  state.loja.proximaChegada = 1e12;
  state.eventos.proximo = 1e12;
  mexer?.(state);
  return { game: createGame({ state, clock, rng: createRng(seed) }), clock };
};
const entregar = (game, id, item, qualidade) => {
  game.state.estoque = { [`${item}:${qualidade}`]: 2 };
  const cli = criarCliente(game, id);
  game.state.fila.push(cli);
  game.rng.chance = () => true;                               // o lendário aceita o preço
  return { cli, r: vender(game, cli.uid, `${item}:${qualidade}`, 'justo') };
};

test('são 10 lendários com 3 a 4 capítulos cada, todos com um aventureiro próprio', () => {
  assert.equal(DATA.listas.lendarios.length, 10);
  for (const l of DATA.listas.lendarios) {
    assert.ok(l.capitulos.length >= 3 && l.capitulos.length <= 4, l.id);
    const adv = DATA.aventureiros[l.id];
    assert.ok(adv && adv.lendario && adv.peso === 0, l.id);
  }
});

test('os lendários não aparecem como clientes comuns', () => {
  const { game } = novo(50);
  const vistos = new Set();
  for (let i = 0; i < 3000; i++) { const c = gerarCliente(game, { semLendas: true }); vistos.add(c.adv); }
  for (const id of vistos) assert.ok(!DATA.aventureiros[id].lendario, id);
});

test('elegibilidade: nível, intervalo entre visitas, lenda terminada e já estar na fila', () => {
  const { game, clock } = novo(1);
  assert.deepEqual(candidatos(game).map((l) => l.id), [], 'nível 1: ninguém');
  game.state.rep = repParaNivel(3);
  assert.deepEqual(candidatos(game).map((l) => l.id), ['ser_aldric']);
  game.state.rep = repParaNivel(40);
  assert.ok(candidatos(game).length >= 8);
  const c = criarCliente(game, 'ser_aldric');
  game.state.fila.push(c);
  assert.ok(!candidatos(game).some((l) => l.id === 'ser_aldric'), 'já na fila');
  game.state.fila.length = 0;
  assert.ok(!candidatos(game).some((l) => l.id === 'ser_aldric'), 'acabou de visitar');
  clock.advance(9 * 60000);
  assert.ok(candidatos(game).some((l) => l.id === 'ser_aldric'), 'passou o intervalo');
  game.state.lendarios.ser_aldric = { cap: 3, visita: 0 };
  assert.ok(!candidatos(game).some((l) => l.id === 'ser_aldric'), 'lenda terminada');
  assert.equal(lendaConcluida(game, 'ser_aldric'), true);
});

test('cada capítulo exige reputação crescente; o nível necessário é o maior entre aventureiro, região e capítulo', () => {
  const { game } = novo(1);
  assert.equal(nivelNecessario(game, 'kael'), 30);
  assert.equal(nivelNecessario(game, 'merlindo'), 6);
  game.state.lendarios.merlindo = { cap: 3, visita: 0 };
  assert.equal(nivelNecessario(game, 'merlindo'), 16);
  game.state.lendarios.merlindo = { cap: 4, visita: 0 };
  assert.equal(nivelNecessario(game, 'merlindo'), Infinity);
});

test('a chance de aparecer é a combinada em data/meta.js', () => {
  let lendas = 0;
  const N = 4000;
  const { game } = novo(40, null, 7);
  for (let i = 0; i < N; i++) {
    game.state.lendarios = {};                                  // sempre elegíveis
    game.state.fila = [];
    const c = gerarCliente(game);
    if (c.lenda) lendas++;
  }
  assert.ok(Math.abs(lendas / N - DATA.meta.lendarios.chance) < 0.025, `${lendas / N}`);
});

test('o cliente lendário pede o item do capítulo, espera mais e guarda a visita', () => {
  const { game } = novo(40);
  const c = criarCliente(game, 'ser_aldric');
  assert.deepEqual(c.pedido, { tipo: 'item', item: 'escudo_madeira' });
  assert.deepEqual(c.lenda, { id: 'ser_aldric', cap: 0 });
  const comum = criarCliente(game, 'soldado_guarda');
  assert.ok(c.pacienciaMax > comum.pacienciaMax * 1.4);
  assert.equal(game.state.lendarios.ser_aldric.visita, T0);
  assert.equal(criarCliente(game, 'lyra_seda').lenda.cap, 0);
  game.state.lendarios.kael = { cap: 3, visita: 0 };
  assert.equal(criarCliente(game, 'kael'), null, 'lenda terminada não gera cliente');
});

test('o texto do pedido mostra a qualidade mínima do capítulo', () => {
  const { game } = novo(40, (s) => { s.lendarios.ser_aldric = { cap: 1, visita: 0 }; });
  const c = criarCliente(game, 'ser_aldric');
  assert.match(pedidoTexto(game, c), /Escudo de ferro \(Comum ou melhor\)/);
});

test('qualidade abaixo da mínima vira "substituto" e não conclui o capítulo', () => {
  const { game } = novo(40, (s) => { s.lendarios.ser_aldric = { cap: 2, visita: 0 }; });   // escudo-torre, Fino ou melhor
  game.state.estoque = { 'escudo_torre:1': 1, 'escudo_torre:2': 1 };
  const c = criarCliente(game, 'ser_aldric');
  const ops = opcoes(game, c);
  assert.deepEqual(ops.map((o) => [o.qualidade, o.substituto]).sort(), [[1, true], [2, false]]);
  game.state.fila.push(c);
  game.rng.chance = () => true;
  const r = vender(game, c.uid, 'escudo_torre:1', 'justo');
  assert.equal(r.ok, true);
  assert.equal(game.state.lendarios.ser_aldric.cap, 2, 'o capítulo não avançou');
});

test('vender o item certo avança a história, paga a recompensa e avisa a interface', () => {
  const { game } = novo(40, (s) => { s.ouro = 0; s.rep = repParaNivel(10); });
  const avisos = [];
  game.on('lenda', (l) => avisos.push(l));
  const { r } = entregar(game, 'ser_aldric', 'escudo_madeira', 1);
  assert.equal(r.ok, true);
  assert.equal(game.state.lendarios.ser_aldric.cap, 1);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].indice, 0);
  assert.equal(avisos[0].final, false);
  assert.ok(avisos[0].resumo.some((l) => l.includes('ouro')));
  assert.ok(game.state.ouro >= 60 + 25, 'a recompensa (60) mais o preço da venda');
  assert.equal(game.state.stats.capitulos, 1);
});

test('comprar outro item não conclui; a lenda espera a próxima visita', () => {
  const { game } = novo(40);
  const erros = [];
  game.on('lendaErrou', (e) => erros.push(e.id));
  game.state.estoque = { 'clava_madeira:1': 1, 'escudo_madeira:1': 1 };
  const c = criarCliente(game, 'ser_aldric');
  game.state.fila.push(c);
  game.rng.chance = () => true;
  vender(game, c.uid, 'clava_madeira:1', 'justo');               // categoria diferente? é "armas": não é substituto de escudo
  // a clava não está nas opções do escudo (categoria armaduras), então a venda é recusada por falta de opção
  assert.equal(game.state.lendarios.ser_aldric.cap, 0);
  void erros;
});

test('recusa por preço, dispensar e esperar demais: sem perda de reputação, sem avançar', () => {
  const { game } = novo(40, (s) => { s.rep = repParaNivel(10); });
  const rep0 = game.state.rep;
  // recusa
  game.state.estoque = { 'escudo_madeira:1': 1 };
  let c = criarCliente(game, 'ser_aldric');
  game.state.fila.push(c);
  game.rng.chance = () => false;
  vender(game, c.uid, 'escudo_madeira:1', 'caro');
  assert.equal(game.state.rep, rep0);
  assert.equal(game.state.lendarios.ser_aldric.cap, 0);
  assert.equal(game.state.stats.recusas, 0, 'não conta como cliente perdido');
  // dispensar
  c = criarCliente(game, 'ser_aldric');
  game.state.fila.push(c);
  assert.equal(dispensar(game, c.uid).rep, 0);
  assert.equal(game.state.rep, rep0);
  // esperar demais
  c = criarCliente(game, 'ser_aldric');
  game.state.fila.push(c);
  const saidas = [];
  game.on('saiu', (e) => saidas.push(e.rep));
  tickLoja(game, c.pacienciaMax + 1000);
  assert.deepEqual(saidas, [0]);
  assert.equal(game.state.rep, rep0);
});

test('uma lenda inteira: todos os capítulos em ordem, o último marca o fim', () => {
  const { game } = novo(50, (s) => { s.ouro = 0; });
  const def = DATA.lendarios.thorin_rubro;
  const finais = [];
  game.on('lenda', (l) => finais.push(l.final));
  for (const [i, cap] of def.capitulos.entries()) {
    assert.equal(capituloAtual(game, 'thorin_rubro').titulo, cap.titulo);
    const { r } = entregar(game, 'thorin_rubro', cap.pedido.item, Math.max(1, cap.pedido.qualidadeMin ?? 0));
    assert.equal(r.ok, true, `capítulo ${i + 1}`);
    assert.equal(game.state.lendarios.thorin_rubro.cap, i + 1);
  }
  assert.deepEqual(finais, [false, false, false, true]);
  assert.equal(capituloAtual(game, 'thorin_rubro'), null);
  assert.equal(lendaConcluida(game, 'thorin_rubro'), true);
});

test('as recompensas de todos os capítulos funcionam sem quebrar o estado', () => {
  for (const def of DATA.listas.lendarios) {
    const { game } = novo(50, (s) => { s.ouro = 100; });
    for (const [i, cap] of def.capitulos.entries()) {
      const { r } = entregar(game, def.id, cap.pedido.item, Math.max(1, cap.pedido.qualidadeMin ?? 0));
      assert.equal(r.ok, true, `${def.id} cap ${i + 1}`);
      const s = game.state;
      assert.ok(Number.isFinite(s.ouro) && s.ouro >= 0 && Number.isFinite(s.rep));
      for (const dic of [s.estoque, s.materiais]) for (const q of Object.values(dic)) assert.ok(Number.isInteger(q) && q > 0);
    }
    assert.equal(lendaConcluida(game, def.id), true, def.id);
  }
});

test('o progresso das lendas é salvo e continua depois', () => {
  const { game, clock } = novo(50);
  entregar(game, 'ser_aldric', 'escudo_madeira', 1);
  const mem = {};
  const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  saveState(st, game.state, clock.now());
  const g2 = createGame({ state: loadState(st).state, clock, rng: createRng(3) });
  assert.equal(capituloAtual(g2, 'ser_aldric').titulo, 'O peso da honra');
});

test('vendas com o jogo fechado nunca chamam lendários', () => {
  const { game } = novo(50, (s) => { s.ouro = 1e6; s.estoque = { 'pao_aventureiro:1': 500, 'pocao_cura:1': 500, 'espada_ferro:1': 500, 'escudo_madeira:1': 500 }; });
  contratar(game, 'vendedor');
  const r = simularOffline(game, 8 * 3600e3);
  assert.ok(r.vendas > 0);
  assert.deepEqual(game.state.lendarios, {}, 'nenhum lendário foi chamado');
});

test('save com lendário removido dos dados não quebra', () => {
  const { game } = novo(50);
  game.state.lendarios.fantasma = { cap: 1, visita: 0 };
  game.state.fila.push({ uid: 99, adv: 'fantasma', pedido: { tipo: 'surpresa' }, paciencia: 5, pacienciaMax: 5, lenda: { id: 'fantasma', cap: 0 } });
  assert.doesNotThrow(() => candidatos(game));
  assert.doesNotThrow(() => game.tick(16));
});
