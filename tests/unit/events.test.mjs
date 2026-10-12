import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { DATA } from '../../src/data/index.js';
import { loadState, saveState } from '../../src/core/save.js';
import { produzir } from '../../src/core/craft.js';
import { elegiveis, disparar, escolher, tickEventos, aplicarEfeitosEvento, eventoPendente, TIPOS_DE_EFEITO } from '../../src/core/events.js';

const T0 = new Date(2026, 7, 4, 12).getTime();
const novo = (nivel = 1, mexer, seed = 1) => {
  const clock = createClock(T0);
  const state = defaultState(T0);
  state.rep = repParaNivel(nivel);
  state.tutorial.feito = true;
  mexer?.(state);
  return { game: createGame({ state, clock, rng: createRng(seed) }), clock };
};

test('são 30+ eventos, todos com texto, escolhas e efeitos conhecidos', () => {
  assert.ok(DATA.listas.eventos.length >= 30);
  for (const e of DATA.listas.eventos) {
    assert.ok(e.escolhas.length >= 1 && e.escolhas.length <= 3, e.id);
    for (const c of e.escolhas) for (const r of c.resultados) for (const ef of r.efeitos ?? []) assert.ok(TIPOS_DE_EFEITO.includes(ef.tipo), `${e.id}: ${ef.tipo}`);
  }
});

test('elegíveis: nível, região e intervalo mínimo entre repetições', () => {
  const { game, clock } = novo(1);
  const ids = () => elegiveis(game).map((e) => e.id);
  assert.ok(ids().includes('feira_cidade'));
  assert.ok(!ids().includes('dragao_cidade'), 'nível 5');
  assert.ok(!ids().includes('lobos_floresta'), 'região trancada');
  game.state.rep = repParaNivel(5);
  assert.ok(ids().includes('dragao_cidade') && ids().includes('lobos_floresta'));
  disparar(game, 'feira_cidade');
  game.state.eventos.pendente = null;
  assert.ok(!ids().includes('feira_cidade'), 'acabou de acontecer');
  clock.advance(46 * 60000);
  assert.ok(ids().includes('feira_cidade'), 'passou o intervalo');
  game.state.rep = repParaNivel(40);
  assert.ok(ids().includes('visita_real') && ids().includes('tesouro_dragao'));
});

test('disparar guarda o evento pendente (e só um por vez); escolher resolve e agenda o próximo', () => {
  const { game } = novo(1);
  const avisos = [];
  game.on('evento', (e) => avisos.push(e.id));
  assert.equal(disparar(game, 'feira_cidade').id, 'feira_cidade');
  assert.equal(disparar(game, 'ladrao_loja'), null, 'já há um pendente');
  assert.equal(eventoPendente(game).id, 'feira_cidade');
  const antes = game.state.eventos.proximo;
  const r = escolher(game, 1);                                   // deixar como está
  assert.equal(r.ok, true);
  assert.equal(eventoPendente(game), null);
  assert.ok(game.state.eventos.proximo >= 240000 && game.state.eventos.proximo <= 540000);
  assert.deepEqual(avisos, ['feira_cidade']);
  assert.equal(escolher(game, 0).motivo, 'sem-evento');
  void antes;
});

test('escolha com custo: sem ouro não resolve; com ouro desconta antes do resultado', () => {
  const { game } = novo(1, (s) => { s.ouro = 10; });
  disparar(game, 'feira_cidade');
  const r = escolher(game, 0);                                   // montar barraca: 30
  assert.deepEqual([r.ok, r.motivo], [false, 'sem-ouro']);
  assert.equal(game.state.ouro, 10);
  assert.ok(eventoPendente(game), 'continua esperando');
  game.state.ouro = 100;
  const r2 = escolher(game, 0);
  assert.equal(r2.ok, true);
  assert.equal(game.state.ouro, 70);
  assert.ok(r2.resumo[0].includes('30'));
  assert.equal(escolher(game, 9).motivo, 'sem-evento');
});

test('escolha inválida não resolve', () => {
  const { game } = novo(1);
  disparar(game, 'feira_cidade');
  assert.equal(escolher(game, 7).motivo, 'escolha-invalida');
  assert.ok(eventoPendente(game));
});

test('resultados sorteados seguem os pesos', () => {
  let bons = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const { game } = novo(1, null, 100 + i);
    disparar(game, 'ladrao_loja');
    const r = escolher(game, 0);                                 // 6 de 10 pegam o ladrão (+rep)
    if (r.texto.includes('guarda o prende')) bons++;
  }
  assert.ok(Math.abs(bons / N - 0.6) < 0.07, `${bons / N}`);
});

test('efeitos: ouro, reputação, materiais e itens', () => {
  const { game } = novo(1, (s) => { s.ouro = 100; s.estoque = { 'pao_aventureiro:1': 3 }; s.materiais = { madeira: 5 }; });
  const linhas = aplicarEfeitosEvento(game, [
    { tipo: 'ouro', valor: 50 }, { tipo: 'ouro', valor: -500 }, { tipo: 'rep', valor: 3 },
    { tipo: 'material', id: 'madeira', qtd: -9 }, { tipo: 'material', id: 'carvao', qtd: 4 }, { tipo: 'item', id: 'espada_ferro', qtd: 2, qualidade: 2 },
  ]);
  assert.equal(game.state.ouro, 0, 'ouro não fica negativo');
  assert.equal(game.state.rep, 3);
  assert.equal(game.state.materiais.madeira, undefined, 'não tira mais do que tem');
  assert.equal(game.state.materiais.carvao, 4);
  assert.equal(game.state.estoque['espada_ferro:2'], 2);
  assert.ok(linhas.some((l) => l.includes('ouro')) && linhas.some((l) => l.includes('reputação')));
});

test('efeitos: porcentagem do ouro, itens aleatórios e materiais da região', () => {
  const { game } = novo(5, (s) => { s.ouro = 1000; s.estoque = {}; });
  aplicarEfeitosEvento(game, [{ tipo: 'ouroPct', valor: -0.1 }]);
  assert.equal(game.state.ouro, 900);
  aplicarEfeitosEvento(game, [{ tipo: 'itemAleatorio', cat: 'armas', qtd: 3 }]);
  const itens = Object.entries(game.state.estoque);
  assert.equal(itens.reduce((n, [, q]) => n + q, 0), 3);
  for (const [k] of itens) assert.equal(DATA.itens[k.split(':')[0]].cat, 'armas');
  aplicarEfeitosEvento(game, [{ tipo: 'materialAleatorio', regiao: 'vila', qtd: 10 }]);
  assert.equal(Object.values(game.state.materiais).reduce((a, b) => a + b, 0), 10);
  for (const id of Object.keys(game.state.materiais)) assert.equal(DATA.materiais[id].regiao, 'vila');
});

test('efeitos: perder itens e materiais tira só o que existe', () => {
  const { game } = novo(1, (s) => { s.estoque = { 'pao_aventureiro:1': 2 }; s.materiais = { madeira: 1 }; });
  aplicarEfeitosEvento(game, [{ tipo: 'perderItens', qtd: 5 }, { tipo: 'perderMateriais', qtd: 5 }]);
  assert.deepEqual(game.state.estoque, {});
  assert.deepEqual(game.state.materiais, {});
  assert.deepEqual(aplicarEfeitosEvento(game, [{ tipo: 'perderItens', qtd: 2 }]), [], 'sem nada, sem resumo');
});

test('itens do evento respeitam a capacidade das prateleiras', () => {
  const { game } = novo(1, (s) => { s.estoque = { 'pao_aventureiro:1': 23 }; });
  const linhas = aplicarEfeitosEvento(game, [{ tipo: 'item', id: 'espada_ferro', qtd: 5 }]);
  assert.equal(game.state.estoque['espada_ferro:1'], 1);
  assert.ok(linhas[0].includes('+1'));
  assert.ok(aplicarEfeitosEvento(game, [{ tipo: 'item', id: 'espada_ferro', qtd: 5 }])[0].includes('cheias'));
});

test('clientes de evento entram na fila, mesmo passando da capacidade', () => {
  const { game } = novo(5, (s) => { s.loja.proximaChegada = 1e9; });
  aplicarEfeitosEvento(game, [{ tipo: 'cliente', adv: 'soldado_guarda' }]);
  assert.equal(game.state.fila[0].adv, 'soldado_guarda');
  aplicarEfeitosEvento(game, [{ tipo: 'clientes', qtd: 4 }]);
  assert.equal(game.state.fila.length, 5);
  assert.ok(game.state.fila.length > 3, 'passou da capacidade normal');
  const antes = game.state.fila.length;
  aplicarEfeitosEvento(game, [{ tipo: 'clienteRico' }]);
  assert.equal(game.state.fila.length, antes + 1);
  const rico = DATA.aventureiros[game.state.fila.at(-1).adv];
  assert.ok(rico.orcamento >= 1.5, `o cliente "rico" é ${rico.id} com orçamento ${rico.orcamento}`);
  assert.equal(new Set(game.state.fila.map((c) => c.uid)).size, game.state.fila.length, 'uids únicos');
});

test('bônus por tempo: aplica, renova sem acumular, expira e volta ao normal', () => {
  const { game, clock } = novo(1);
  const chegada = () => game.mods.chegada;
  aplicarEfeitosEvento(game, [{ tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.5 }, minutos: 6, rotulo: 'Feira' }]);
  assert.equal(chegada(), 1.5);
  clock.advance(3 * 60000);
  aplicarEfeitosEvento(game, [{ tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.5 }, minutos: 6, rotulo: 'Feira' }]);
  assert.equal(chegada(), 1.5, 'mesmo bônus renovado não soma');
  assert.equal(game.state.bonus.length, 1);
  clock.advance(5 * 60000); tickEventos(game, 16);
  assert.equal(chegada(), 1.5, 'ainda vale (renovado há 5 min, dura 6)');
  clock.advance(2 * 60000); tickEventos(game, 16);
  assert.equal(chegada(), 1);
  assert.equal(game.state.bonus.length, 0);
  // bônus diferentes se combinam
  aplicarEfeitosEvento(game, [
    { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.5 }, minutos: 6, rotulo: 'Feira' },
    { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.2 }, minutos: 6, rotulo: 'Música' },
  ]);
  assert.ok(Math.abs(chegada() - 1.8) < 1e-9);
});

test('bônus por tempo sobrevive ao save e expira com o jogo fechado', () => {
  const { game, clock } = novo(1);
  aplicarEfeitosEvento(game, [{ tipo: 'bonus', efeito: { tipo: 'preco', valor: 1.2 }, minutos: 10, rotulo: 'Selo' }]);
  const mem = {};
  const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  saveState(st, game.state, clock.now());
  const g2 = createGame({ state: loadState(st).state, clock, rng: createRng(2) });
  assert.equal(g2.mods.preco, 1.2);
  clock.advance(11 * 60000);
  g2.tick(16);
  assert.equal(g2.mods.preco, 1);
});

test('oficina: o evento adianta o trabalho e dá experiência só em ofício aberto', () => {
  const { game } = novo(1, (s) => { s.materiais = { barra_ferro: 4, carvao: 2 }; });
  produzir(game, 'r_espada_ferro');
  const fim = game.state.producao[0].fim;
  aplicarEfeitosEvento(game, [{ tipo: 'oficinaAvanca', segundos: 30 }]);
  assert.equal(game.state.producao[0].fim, fim - 30000);
  aplicarEfeitosEvento(game, [{ tipo: 'oficinaAvanca', segundos: 600 }]);
  assert.equal(game.state.prontos.length, 1, 'adiantou o bastante para terminar');
  assert.deepEqual(aplicarEfeitosEvento(game, [{ tipo: 'oficinaAvanca', segundos: 60 }]), [], 'nada em andamento: sem efeito');
  assert.deepEqual(aplicarEfeitosEvento(game, [{ tipo: 'xpOficio', oficio: 'joalheria', xp: 50 }]), [], 'ofício fechado');
  const antes = game.state.oficios.ferraria.xp;
  aplicarEfeitosEvento(game, [{ tipo: 'xpOficio', oficio: 'ferraria', xp: 50 }]);
  assert.equal(game.state.oficios.ferraria.xp, antes + 50);
});

test('tick: dispara no tempo certo, nunca no tutorial e nunca com outro evento pendente', () => {
  const { game } = novo(1, (s) => { s.tutorial.feito = false; });
  tickEventos(game, 1e7);
  assert.equal(game.state.eventos.pendente, null, 'tutorial em andamento');
  game.state.tutorial.feito = true;
  game.state.eventos.proximo = 5000;
  tickEventos(game, 4000);
  assert.equal(game.state.eventos.pendente, null);
  tickEventos(game, 2000);
  assert.ok(game.state.eventos.pendente, 'disparou');
  const id = game.state.eventos.pendente.id;
  tickEventos(game, 1e7);
  assert.equal(game.state.eventos.pendente.id, id, 'não troca o evento pendente');
});

test('o evento pendente é salvo e volta ao reabrir o jogo', () => {
  const { game, clock } = novo(1);
  disparar(game, 'ladrao_loja');
  const mem = {};
  const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  saveState(st, game.state, clock.now());
  const g2 = createGame({ state: loadState(st).state, clock, rng: createRng(2) });
  assert.equal(eventoPendente(g2).id, 'ladrao_loja');
});

test('save com evento removido dos dados não quebra', () => {
  const { game } = novo(1);
  game.state.eventos.pendente = { id: 'evento_que_nao_existe_mais' };
  assert.equal(eventoPendente(game), null);
  assert.equal(escolher(game, 0).motivo, 'sem-evento');
});

test('todos os eventos, escolhas e resultados se resolvem sem quebrar o estado (várias sementes)', () => {
  for (const ev of DATA.listas.eventos) {
    for (let ci = 0; ci < ev.escolhas.length; ci++) {
      for (let seed = 0; seed < 12; seed++) {
        const { game } = novo(35, (s) => {
          s.ouro = 5000; s.estoque = { 'pao_aventureiro:1': 3, 'espada_ferro:1': 2 }; s.materiais = { madeira: 4, carvao: 2 };
          s.oficios.culinaria = { nivel: 1, xp: 0 }; s.oficios.encantamento = { nivel: 1, xp: 0 }; s.oficios.ferraria = { nivel: 1, xp: 0 };
        }, seed * 7 + ci);
        disparar(game, ev.id);
        const r = escolher(game, ci);
        assert.equal(r.ok, true, `${ev.id}/${ci}`);
        assert.ok(typeof r.texto === 'string' && r.texto.length > 5);
        const s = game.state;
        assert.ok(Number.isFinite(s.ouro) && s.ouro >= 0, `${ev.id}: ouro ${s.ouro}`);
        assert.ok(Number.isFinite(s.rep) && s.rep >= 0, `${ev.id}: rep ${s.rep}`);
        for (const dic of [s.estoque, s.materiais]) for (const [k, q] of Object.entries(dic)) assert.ok(Number.isInteger(q) && q > 0, `${ev.id}: ${k}=${q}`);
        assert.equal(new Set(s.fila.map((c) => c.uid)).size, s.fila.length, `${ev.id}: uids repetidos`);
        for (const l of r.resumo) assert.ok(!/NaN|undefined/.test(l), `${ev.id}: resumo "${l}"`);
      }
    }
  }
});

test('o sorteio por peso dá variedade: com tempo e níveis, todos os eventos já apareceram', () => {
  const { game, clock } = novo(40, null, 3);
  const vistos = new Set();
  for (let i = 0; i < 4000 && vistos.size < DATA.listas.eventos.length; i++) {
    clock.advance(60 * 60000);
    game.state.eventos.proximo = 0;
    tickEventos(game, 1);
    const p = game.state.eventos.pendente;
    if (p) { vistos.add(p.id); game.state.eventos.pendente = null; }
  }
  assert.equal(vistos.size, DATA.listas.eventos.length, `faltaram: ${DATA.listas.eventos.filter((e) => !vistos.has(e.id)).map((e) => e.id).join(', ')}`);
});
