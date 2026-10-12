import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { DATA } from '../../src/data/index.js';
import { loadState, saveState } from '../../src/core/save.js';
import { comprarMelhoria } from '../../src/core/upgrades.js';
import {
  herancaPendente, estadoExpansao, expandir, comprarHeranca, nivelHeranca, custoHeranca, nomeDaCidade, ouroDestaCidade,
} from '../../src/core/prestige.js';
import { validar } from '../../scripts/validate-data.mjs';

const T0 = new Date(2026, 7, 4, 12).getTime();
const novo = ({ nivel = 25, ouroTotal = 200000, mexer } = {}) => {
  const clock = createClock(T0);
  const state = defaultState(clock.now());
  state.tutorial.feito = true;
  state.loja.proximaChegada = 1e12;
  state.eventos.proximo = 1e12;
  state.rep = repParaNivel(nivel);
  state.stats.ouroTotal = ouroTotal;
  mexer?.(state);
  return createGame({ state, clock, rng: createRng(1) });
};

test('os dados de herança passam no validador e há 10+ bônus', () => {
  assert.deepEqual(validar(DATA).erros, []);
  assert.ok(DATA.listas.heranca.length >= 10);
});

test('a herança sobe com o ouro ganho e só vale com a reputação mínima', () => {
  assert.equal(herancaPendente(novo({ nivel: 10, ouroTotal: 1e9 })), 0);
  assert.equal(herancaPendente(novo({ ouroTotal: 10000 })), 0);
  assert.equal(herancaPendente(novo({ ouroTotal: 50000 })), 1);
  assert.equal(herancaPendente(novo({ ouroTotal: 200000 })), 2);
  assert.equal(herancaPendente(novo({ ouroTotal: 5e6 })), 10);
  const e = estadoExpansao(novo({ nivel: 3 }));
  assert.equal(e.ok, false);
  assert.equal(e.motivo, 'reputacao');
  assert.equal(estadoExpansao(novo({ ouroTotal: 100 })).motivo, 'ouro');
});

test('expandir recusa quando ainda não dá', () => {
  const g = novo({ nivel: 3 });
  assert.deepEqual(expandir(g), { ok: false, motivo: 'reputacao' });
  assert.equal(g.state.prestigio.cidade, 1);
});

test('expandir reinicia a loja e mantém coleção, conquistas, estatísticas e lendas', () => {
  const g = novo({
    mexer: (s) => {
      s.ouro = 99999; s.materiais.carvao = 7; s.melhorias.loja_ampliar_1 = true; s.decoracoes.jardim = true; s.loja.tema = 'jardim';
      s.colecao.itens.espada_ferro = 5; s.conquistas.vendas_1 = 1; s.stats.vendas = 300; s.lendarios.ser_aldric = { cap: 2, visita: 0 };
      s.oficios.alquimia = { nivel: 4, xp: 10 }; s.sequencia.dias = 6; s.sequencia.ultimoDia = '2026-08-04'; s.equipe.atendente = { nivel: 2 };
    },
  });
  const e = expandir(g);
  assert.equal(e.ok, true);
  assert.equal(e.ganho, 2);
  const s = g.state;
  assert.equal(s.ouro, 100, 'ouro inicial de jogo novo');
  assert.deepEqual(s.materiais, {});
  assert.deepEqual(s.melhorias, {});
  assert.equal(s.loja.tema, 'rustico');
  assert.deepEqual(Object.keys(s.oficios), ['ferraria']);
  assert.equal(s.equipe.atendente.nivel, 0);
  assert.equal(s.rep, 0);
  assert.equal(g.nivel(), 1);
  assert.deepEqual(s.estoque, DATA.meta.inicio.estoque.constructor === Object ? { ...DATA.meta.inicio.estoque } : {});
  assert.equal(s.colecao.itens.espada_ferro, 5);
  assert.ok(s.conquistas.vendas_1);
  assert.equal(s.stats.vendas, 300);
  assert.equal(s.lendarios.ser_aldric.cap, 2);
  assert.equal(s.sequencia.dias, 6);
  assert.equal(s.prestigio.cidade, 2);
  assert.equal(s.prestigio.heranca, 2);
  assert.equal(s.prestigio.base, 200000);
  assert.equal(ouroDestaCidade(g), 0);
  assert.equal(herancaPendente(g), 0, 'a cidade nova começa do zero');
  assert.equal(g.state.diario.data, g.state.dia.data, 'o dia foi refeito');
});

test('a cidade seguinte exige ganhar ouro de novo, e a herança acumula', () => {
  const g = novo();
  expandir(g);
  g.state.rep = repParaNivel(25);
  assert.equal(estadoExpansao(g).motivo, 'ouro');
  g.state.stats.ouroTotal += 50000;
  const e = expandir(g);
  assert.equal(e.ok, true);
  assert.equal(g.state.prestigio.heranca, 3);
  assert.equal(g.state.prestigio.herancaTotal, 3);
  assert.equal(g.state.prestigio.cidade, 3);
});

test('comprar herança gasta, sobe o nível e vale nos mods; o máximo para', () => {
  const g = novo();
  g.state.prestigio.heranca = 50;
  assert.equal(g.mods.repGanho, 1);
  assert.deepEqual(comprarHeranca(g, 'fama'), { ok: true, nivel: 1 });
  assert.equal(g.state.prestigio.heranca, 49);
  assert.ok(Math.abs(g.mods.repGanho - 1.05) < 1e-9);
  for (let i = 0; i < 4; i++) assert.equal(comprarHeranca(g, 'fama').ok, true);
  assert.equal(nivelHeranca(g, 'fama'), 5);
  assert.ok(Math.abs(g.mods.repGanho - 1.25) < 1e-9);
  assert.equal(custoHeranca(g, 'fama'), null);
  assert.deepEqual(comprarHeranca(g, 'fama'), { ok: false, motivo: 'maximo' });
  assert.equal(comprarHeranca(g, 'nada').motivo, 'inexistente');
  g.state.prestigio.heranca = 0;
  assert.equal(comprarHeranca(g, 'contatos').motivo, 'sem-heranca');
});

test('os bônus de herança sobrevivem à expansão e "reserva" dá ouro inicial', () => {
  const g = novo({ mexer: (s) => { s.prestigio.bonus = { reserva: 2, contatos: 1, aprendizado: 3 }; } });
  expandir(g);
  assert.equal(g.state.ouro, 100 + 250);
  assert.ok(Math.abs(g.mods.compra - 0.97) < 1e-9);
  assert.ok(Math.abs(g.mods.xpOficio - 1.3) < 1e-9);
  assert.equal(g.state.stats.ouroTotal, 200000, 'o pé-de-meia não conta como ouro ganho');
});

test('xpOficio multiplica a experiência dos ofícios', async () => {
  const { ganharXp } = await import('../../src/core/craft.js');
  const g = novo({ mexer: (s) => { s.prestigio.bonus = { aprendizado: 5 }; } });
  const antes = g.state.oficios.ferraria.xp;
  ganharXp(g, 'ferraria', 10);
  assert.equal(g.state.oficios.ferraria.xp - antes, 15);
});

test('nomes de cidade passam do fim da lista com número romano', () => {
  const g = novo();
  assert.equal(nomeDaCidade(g, 1), DATA.cidades[0]);
  assert.equal(nomeDaCidade(g, DATA.cidades.length + 1), `${DATA.cidades[0]} II`);
});

test('save antigo sem prestígio carrega com o padrão; o prestígio salvo volta igual', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const velho = defaultState(T0);
  delete velho.prestigio;
  saveState(storage, velho);
  assert.equal(loadState(storage).state.prestigio.cidade, 1);
  const g = novo();
  g.state.prestigio.bonus = { fama: 2 };
  g.state.prestigio.heranca = 4;
  saveState(storage, g.state);
  const { state } = loadState(storage);
  assert.deepEqual(state.prestigio.bonus, { fama: 2 });
  assert.equal(state.prestigio.heranca, 4);
});
