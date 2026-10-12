import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { contratar } from '../../src/core/upgrades.js';
import { tickEquipe, simularOffline } from '../../src/core/staff.js';
import { melhorOpcao, fecharVenda, opcoes } from '../../src/core/shop.js';
import { produzir, avancarProducao, alternarRepetir, coletar, totalProntos } from '../../src/core/craft.js';
import { comprar, ofertas } from '../../src/core/market.js';
import { espacoLivre, totalEstoque } from '../../src/core/estoque.js';

const T0 = new Date(2026, 9, 12, 12).getTime();
const novo = (mexer, seed = 1) => {
  const clock = createClock(T0);
  const state = defaultState(clock.now());
  state.ouro = 1e6; state.rep = repParaNivel(20);
  state.materiais = { barra_ferro: 100, carvao: 100, cobre: 100, madeira: 100, farinha: 100, erva_curativa: 100 };
  mexer?.(state);
  return { game: createGame({ state, clock, rng: createRng(seed) }), clock };
};
const cli = (game, adv, pedido = { tipo: 'surpresa' }, paciencia = 75000) => {
  game.state.loja.uid += 1;
  const c = { uid: game.state.loja.uid, adv, pedido, paciencia, pacienciaMax: 75000, fala: '' };
  game.state.fila.push(c);
  return c;
};

test('melhorOpcao escolhe a melhor oferta e devolve null sem estoque', () => {
  const { game } = novo((s) => { s.estoque = { 'pocao_cura:1': 2, 'ensopado:1': 1 }; });
  const c = cli(game, 'clerigo_viajante');
  const o = melhorOpcao(game, c);
  assert.ok(['pocao_cura', 'ensopado'].includes(o.item.id));
  game.state.estoque = {};
  assert.equal(melhorOpcao(game, c), null);
});

test('atendente: só atende quem já esperou, o que esperou mais primeiro, no intervalo certo', () => {
  const { game } = novo((s) => { s.estoque = { 'pocao_cura:1': 5 }; s.loja.proximaChegada = 1e9; });
  contratar(game, 'atendente');                                     // a cada 30 s
  game.rng.chance = () => true;
  const novato = cli(game, 'clerigo_viajante', { tipo: 'surpresa' }, 70000);        // quase intacto: não atende
  tickEquipe(game, 31000);
  assert.equal(game.state.fila.length, 1, 'cliente recém-chegado fica para o jogador');
  novato.paciencia = 30000;                                          // já esperou bastante
  const outro = cli(game, 'bardo_cantor', { tipo: 'surpresa' }, 10000);
  const avisos = [];
  game.on('atendente', (a) => avisos.push(a));
  tickEquipe(game, 31000);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].cli.uid, outro.uid, 'atendeu quem esperou mais');
  assert.equal(game.state.fila.length, 1);
  tickEquipe(game, 10000);                                           // intervalo ainda não passou
  assert.equal(avisos.length, 1);
});

test('atendente sem opção no estoque dispensa o cliente', () => {
  const { game } = novo((s) => { s.estoque = {}; s.loja.proximaChegada = 1e9; });
  contratar(game, 'atendente');
  cli(game, 'clerigo_viajante', { tipo: 'surpresa' }, 5000);
  const avisos = [];
  game.on('atendente', (a) => avisos.push(a));
  tickEquipe(game, 31000);
  assert.equal(game.state.fila.length, 0);
  assert.equal(avisos[0].ok, false);
});

test('sem atendente contratado nada acontece', () => {
  const { game } = novo((s) => { s.loja.proximaChegada = 1e9; });
  cli(game, 'clerigo_viajante', { tipo: 'surpresa' }, 1000);
  tickEquipe(game, 1e6);
  assert.equal(game.state.fila.length, 1);
});

test('vendas offline: sem vendedor não vende; com vendedor vende o estoque e paga', () => {
  const estoque = { 'pao_aventureiro:1': 50, 'pocao_cura:1': 30, 'adaga_bronze:1': 20, 'ensopado:1': 20, 'anel_cobre:1': 10 };
  const sem = novo((s) => { s.estoque = { ...estoque }; }).game;
  assert.deepEqual(simularOffline(sem, 8 * 3600e3), { vendas: 0, perdidas: 0, ouro: 0, rep: 0, horas: 0 });

  const { game } = novo((s) => { s.estoque = { ...estoque }; });
  contratar(game, 'vendedor');                                       // 2 h, 30%
  const ouro0 = game.state.ouro;
  const r = simularOffline(game, 8 * 3600e3);
  assert.equal(r.horas, 2, 'teto de horas do nível');
  assert.ok(r.vendas > 0, 'vendeu algo');
  assert.equal(game.state.ouro - ouro0, r.ouro);
  assert.ok(r.ouro > 0);
  assert.ok(totalEstoque(game) < 130, 'estoque diminuiu');
  assert.equal(game.state.stats.vendas, r.vendas);
});

test('vendas offline: mais horas e nível maior vendem mais; ausência curta não conta', () => {
  const estoque = () => ({ 'pao_aventureiro:1': 500, 'pocao_cura:1': 500, 'adaga_bronze:1': 500, 'ensopado:1': 500, 'anel_cobre:1': 500, 'arco_curto:1': 500, 'escudo_madeira:1': 500 });
  const venda = (nivel, horas, seed = 7) => {
    const { game } = novo((s) => { s.estoque = estoque(); }, seed);
    for (let i = 0; i < nivel; i++) contratar(game, 'vendedor');
    return simularOffline(game, horas * 3600e3).vendas;
  };
  assert.ok(venda(1, 2) > 0);
  assert.ok(venda(5, 8) > venda(1, 2) * 2, 'nível 5 por 8 h vende bem mais que nível 1 por 2 h');
  assert.equal(venda(1, 0.01), 0, 'menos de 1 min não conta');
  assert.ok(venda(1, 100) <= venda(1, 2) * 1.3, 'o teto de horas limita (100 h rende como 2 h)');
});

test('vendas offline sem estoque: clientes perdidos, nada vendido', () => {
  const { game } = novo((s) => { s.estoque = {}; });
  contratar(game, 'vendedor');
  const r = simularOffline(game, 2 * 3600e3);
  assert.equal(r.vendas, 0);
  assert.ok(r.perdidas > 0);
});

test('repetir: o artesão refaz a receita sozinho até acabar o material, inclusive com o jogo fechado', () => {
  const { game, clock } = novo((s) => { s.estoque = {}; s.materiais = { barra_ferro: 6, carvao: 3 }; });
  assert.equal(alternarRepetir(game, 'r_espada_ferro').motivo, 'sem-artesao');
  contratar(game, 'artesao');                                        // repetir + coleta automática
  assert.equal(alternarRepetir(game, 'r_espada_ferro').ligado, true);
  produzir(game, 'r_espada_ferro');
  clock.advance(10 * 3600e3);                                        // 10 h fechado
  avancarProducao(game);
  assert.equal(game.state.materiais.barra_ferro ?? 0, 0, 'gastou todo o ferro (3 espadas)');
  const espadas = Object.entries(game.state.estoque).filter(([k]) => k.startsWith('espada_ferro:')).reduce((n, [, q]) => n + q, 0);
  assert.equal(espadas, 3);
  assert.equal(game.state.producao.length, 0);
  assert.equal(totalProntos(game), 0, 'coleta automática');
  assert.equal(alternarRepetir(game, 'r_espada_ferro').ligado, false);
});

test('repetir respeita os tempos: cada repetição começa quando a anterior terminou', () => {
  const { game, clock } = novo((s) => { s.materiais = { barra_ferro: 6, carvao: 3 }; s.estoque = {}; });
  contratar(game, 'artesao');
  alternarRepetir(game, 'r_espada_ferro');
  produzir(game, 'r_espada_ferro');
  clock.advance(100 * 1000);
  avancarProducao(game);
  const rodando = game.state.producao[0];
  assert.ok(rodando, 'a repetição já está em andamento');
  assert.equal(rodando.inicio, T0 + 90 * 1000, 'começou quando a primeira terminou (artesão nível 1 não acelera)');
});

test('prateleiras cheias: coletar leva só o que cabe e o resto fica pronto', () => {
  const { game, clock } = novo((s) => { s.estoque = { 'pao_aventureiro:1': 22 }; });
  produzir(game, 'r_pocao_cura');                                    // alquimia fechada
  game.state.oficios.alquimia = { nivel: 1, xp: 0 };
  produzir(game, 'r_pocao_cura'); produzir(game, 'r_pocao_cura');
  clock.advance(200 * 1000); avancarProducao(game);
  assert.equal(totalProntos(game), 4);                               // 2 receitas x 2 poções
  assert.equal(espacoLivre(game), 2);
  const avisos = [];
  game.on('cheio', () => avisos.push(1));
  const r = coletar(game);
  assert.equal(r.itens.reduce((n, i) => n + i.qtd, 0), 2);
  assert.equal(r.cheio, true);
  assert.equal(totalProntos(game), 2, 'o que não coube continua pronto');
  assert.equal(totalEstoque(game), 24);
  assert.equal(avisos.length, 1);
  game.state.estoque = {};
  coletar(game);
  assert.equal(totalProntos(game), 0);
});

test('comprar item pronto no mercado também respeita a capacidade', () => {
  const { game } = novo((s) => { s.estoque = { 'pao_aventureiro:1': 23 }; });
  game.data.fornecedores.forn_item = { id: 'forn_item', nome: 'X', regiao: 'vila', nivelRep: 1, vende: [{ material: 'pao_aventureiro', preco: 3, estoque: 50 }] };
  assert.equal(ofertas(game, game.data.fornecedores.forn_item).length, 1);
  assert.equal(comprar(game, 'forn_item', 'pao_aventureiro', 10).qtd, 1, 'só coube 1');
  assert.equal(comprar(game, 'forn_item', 'pao_aventureiro', 1).motivo, 'prateleiras-cheias');
  delete game.data.fornecedores.forn_item;
});

test('fecharVenda aplica o bônus de reputação das melhorias', () => {
  const { game } = novo((s) => { s.estoque = { 'pocao_cura:1': 5 }; s.rep = 0; });
  game.mods.repGanho = 2;
  game.rng.chance = () => true;
  const c = cli(game, 'clerigo_viajante', { tipo: 'item', item: 'pocao_cura' });
  const o = opcoes(game, c)[0];
  game.state.fila.length = 0;
  const r = fecharVenda(game, c, o, 'justo');
  assert.equal(r.rep, 4);                                            // generoso: +2 no justo, dobrado
  assert.equal(game.state.rep, 4);
});
