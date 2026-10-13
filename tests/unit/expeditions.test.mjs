import { DATA as DADOS } from '../../src/data/index.js';
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
  iniciarExpedicao, coletarExpedicao, custoExpedicao, valorMedio, slotsExpedicao, regiaoAberta, emAndamento, prontas, unidadesDe, tierDe,
} from '../../src/core/expeditions.js';
import { totalEstoque } from '../../src/core/estoque.js';
import { tickExpedicoes } from '../../src/core/expeditions.js';

const T0 = new Date(2026, 7, 4, 12).getTime();
const novo = (nivel = 40, mexer, seed = 1) => {
  const clock = createClock(T0);
  const state = defaultState(T0);
  state.rep = repParaNivel(nivel);
  state.ouro = 1e6;
  state.tutorial.feito = true;
  mexer?.(state);
  return { game: createGame({ state, clock, rng: createRng(seed) }), clock };
};

test('o custo vale a pena: o material trazido vale mais que o ouro gasto, e mais ainda nas viagens longas', () => {
  const { game } = novo();
  for (const r of DATA.listas.regioes) {
    let anterior = 0;
    for (const t of DATA.meta.expedicoes.tiers) {
      const custo = custoExpedicao(game, r.id, t.id);
      const valor = valorMedio(game, r.id) * t.unidades;
      const razao = valor / custo;
      assert.ok(Math.abs(razao - t.eficiencia) < 0.05, `${r.id}/${t.id}: ${razao.toFixed(2)} vs ${t.eficiencia}`);
      assert.ok(razao > anterior, 'quanto mais longa, mais vantajosa');
      anterior = razao;
    }
  }
});

test('o custo acompanha o valor dos materiais da região: a vila é a mais barata e o dragão a mais cara', () => {
  const { game } = novo();
  const custos = Object.fromEntries(DATA.listas.regioes.map((r) => [r.id, custoExpedicao(game, r.id, 'curta')]));
  assert.ok(custos.vila >= 10 && custos.vila <= 100, `a primeira expedição custa ${custos.vila}`);
  for (const [id, c] of Object.entries(custos)) {
    if (id !== 'vila') assert.ok(c > custos.vila, `${id} mais cara que a vila`);
    if (id !== 'dragao') assert.ok(c < custos.dragao, `${id} mais barata que o dragão`);
  }
});

test('região fechada, sem ouro e sem vaga bloqueiam a expedição sem gastar nada', () => {
  const { game } = novo(1, (s) => { s.ouro = 1000; });
  assert.equal(regiaoAberta(game, 'floresta'), false);
  assert.equal(iniciarExpedicao(game, 'floresta', 'curta').motivo, 'regiao-fechada');
  assert.equal(game.state.ouro, 1000);
  game.state.ouro = 1;
  assert.equal(iniciarExpedicao(game, 'vila', 'curta').motivo, 'sem-ouro');
  game.state.ouro = 1000;
  assert.equal(iniciarExpedicao(game, 'vila', 'curta').ok, true);
  assert.equal(iniciarExpedicao(game, 'vila', 'curta').motivo, 'sem-vaga');
  assert.equal(iniciarExpedicao(game, 'nao_existe', 'curta').motivo, 'inexistente');
  assert.equal(iniciarExpedicao(game, 'vila', 'imensa').motivo, 'inexistente');
  assert.equal(game.state.expedicoes.length, 1);
});

test('iniciar gasta o custo e só dá para coletar quando os batedores voltam', () => {
  const { game, clock } = novo();
  const custo = custoExpedicao(game, 'vila', 'curta');
  const r = iniciarExpedicao(game, 'vila', 'curta');
  assert.equal(game.state.ouro, 1e6 - custo);
  assert.equal(r.expedicao.fim - r.expedicao.inicio, 5 * 60000);
  assert.equal(coletarExpedicao(game, r.expedicao.uid).motivo, 'em-andamento');
  assert.equal(emAndamento(game).length, 1);
  clock.advance(4 * 60000 + 59000);
  assert.equal(coletarExpedicao(game, r.expedicao.uid).motivo, 'em-andamento');
  clock.advance(1000);
  assert.equal(prontas(game).length, 1);
  assert.equal(coletarExpedicao(game, r.expedicao.uid).ok, true);
  assert.equal(game.state.expedicoes.length, 0);
  assert.equal(coletarExpedicao(game, r.expedicao.uid).motivo, 'inexistente');
});

test('o que trazem são materiais da região, na quantidade da viagem, e os baratos aparecem mais', () => {
  const { game, clock } = novo(40, (s) => { s.materiais = {}; });
  const total = {};
  for (let i = 0; i < 60; i++) {
    iniciarExpedicao(game, 'montanhas', 'longa');
    clock.advance(121 * 60000);
    const r = coletarExpedicao(game, game.state.expedicoes[0].uid);
    assert.equal(Object.values(r.materiais).reduce((a, b) => a + b, 0), 130);
    for (const [id, q] of Object.entries(r.materiais)) { assert.equal(DATA.materiais[id].regiao, 'montanhas'); total[id] = (total[id] ?? 0) + q; }
  }
  assert.ok(total.quartzo > total.mithril * 1.5, `quartzo ${total.quartzo} vs mithril ${total.mithril}`);
  assert.ok(total.mithril > 0, 'os raros também aparecem');
  assert.equal(Object.values(game.state.materiais).reduce((a, b) => a + b, 0), 130 * 60);
});

test('expedições longas rendem melhor por ouro gasto do que várias curtas', () => {
  const { game } = novo();
  const longa = custoExpedicao(game, 'vila', 'longa') / tierDe(game, 'longa').unidades;
  const curta = custoExpedicao(game, 'vila', 'curta') / tierDe(game, 'curta').unidades;
  assert.ok(longa < curta * 0.7, `por unidade: longa ${longa.toFixed(2)} x curta ${curta.toFixed(2)}`);
});

test('curiosidades raras: a chance segue o tipo de viagem e vão para as prateleiras', () => {
  const contar = (tier, N = 500) => {
    let achados = 0;
    for (let i = 0; i < N; i++) {
      const { game, clock } = novo(40, (s) => { s.estoque = {}; }, i + 1);
      iniciarExpedicao(game, 'vila', tier);
      clock.advance(3 * 3600e3);
      const r = coletarExpedicao(game, game.state.expedicoes[0].uid);
      if (r.itens.dente_lobo) { achados++; assert.equal(game.state.estoque['dente_lobo:1'], r.itens.dente_lobo); }
    }
    return achados / N;
  };
  const curta = contar('curta');
  const longa = contar('longa');
  assert.ok(Math.abs(curta - 0.125) < 0.05, `curta ${curta}`);
  assert.ok(longa > curta * 2, `longa ${longa} x curta ${curta}`);
});

test('com as prateleiras cheias o material vem, mas o achado raro não cabe', () => {
  const { game, clock } = novo(40, (s) => { s.estoque = { 'pao_aventureiro:1': 24 }; });
  iniciarExpedicao(game, 'vila', 'longa');
  clock.advance(3 * 3600e3);
  const r = coletarExpedicao(game, game.state.expedicoes[0].uid);
  assert.equal(r.ok, true);
  assert.deepEqual(r.itens, {});
  assert.equal(totalEstoque(game), 24);
});

test('melhorias dão mais vagas e mais material', () => {
  const { game } = novo(40);
  assert.equal(slotsExpedicao(game), 1);
  assert.equal(comprarMelhoria(game, 'mapa_regiao').ok, true);
  assert.equal(slotsExpedicao(game), 2);
  assert.equal(iniciarExpedicao(game, 'vila', 'curta').ok, true);
  assert.equal(iniciarExpedicao(game, 'floresta', 'curta').ok, true);
  assert.equal(iniciarExpedicao(game, 'vila', 'curta').motivo, 'sem-vaga');
  const base = unidadesDe(game, tierDe(game, 'media'));
  comprarMelhoria(game, 'guia_batedores');
  assert.equal(unidadesDe(game, tierDe(game, 'media')), Math.round(base * 1.2));
  assert.equal(comprarMelhoria(game, 'posto_avancado').ok, true);
  assert.equal(slotsExpedicao(game), 3);
  assert.equal(comprarMelhoria(game, 'caravana_propria').ok, true);
  assert.equal(slotsExpedicao(game), 4);
});

test('o segundo grupo de batedores chega cedo e barato; o quarto só bem mais tarde', () => {
  const mapa = DADOS.melhorias.mapa_regiao;
  assert.ok(mapa.nivelRep <= 4 && mapa.custo <= 300);
  const slots = ['mapa_regiao', 'posto_avancado', 'caravana_propria'].map((id) => DADOS.melhorias[id].nivelRep);
  assert.deepEqual([...slots].sort((a, b) => a - b), slots, 'cada grupo novo exige mais reputação');
});

test('com o jogo fechado a expedição termina; o save guarda tudo', () => {
  const { game, clock } = novo();
  const r = iniciarExpedicao(game, 'deserto', 'media');
  const mem = {};
  const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  saveState(st, game.state, clock.now());
  clock.advance(5 * 3600e3);
  const g2 = createGame({ state: loadState(st).state, clock, rng: createRng(5) });
  assert.equal(prontas(g2).length, 1);
  assert.equal(coletarExpedicao(g2, r.expedicao.uid).ok, true);
});

test('save de uma região que deixou de existir não quebra a coleta: o custo é devolvido', () => {
  const { game, clock } = novo(40, (s) => { s.ouro = 0; });
  game.state.expedicoes.push({ uid: 9, regiao: 'regiao_removida', tier: 'curta', inicio: T0 - 1e6, fim: T0 - 1, custo: 77 });
  clock.advance(1);
  const r = coletarExpedicao(game, 9);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'regiao-removida');
  assert.equal(game.state.ouro, 77);
  assert.equal(game.state.expedicoes.length, 0);
});

test('os batedores avisam uma vez quando voltam, inclusive depois do jogo fechado', () => {
  const { game, clock } = novo();
  const avisos = [];
  game.on('expedicaoPronta', (e) => avisos.push(e.uid));
  const r = iniciarExpedicao(game, 'vila', 'curta');
  tickExpedicoes(game);
  assert.deepEqual(avisos, []);
  clock.advance(5 * 60000);
  tickExpedicoes(game); tickExpedicoes(game);
  assert.deepEqual(avisos, [r.expedicao.uid], 'só uma vez');
  // carregada do save já vencida: o aviso sai no primeiro quadro
  const { game: g2, clock: c2 } = novo();
  g2.state.expedicoes.push({ uid: 5, regiao: 'vila', tier: 'curta', inicio: 0, fim: 1, custo: 10 });
  const av2 = [];
  g2.on('expedicaoPronta', (e) => av2.push(e.uid));
  g2.tick(16);
  assert.deepEqual(av2, [5]);
  void c2;
});
