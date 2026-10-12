import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { DATA } from '../../src/data/index.js';
import { loadState, saveState } from '../../src/core/save.js';
import { dentroDoPeriodo, sazonaisAtivos } from '../../src/core/seasons.js';
import { gerarCliente } from '../../src/core/shop.js';
import { vender } from '../../src/core/shop.js';
import {
  gerarDiario, registrarDia, entregarEncomenda, podeEntregar, bonusDoDia, coletarBonus, gerarSemana, progressoMeta, metasCumpridas,
  abrirBau, pendencias, faixaDe, unidadesParaEncomenda, textoMeta,
} from '../../src/core/daily.js';

const em = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const novo = (data = [2026, 8, 4], nivel = 10, mexer, seed = 1) => {
  const clock = createClock(em(...data));
  const state = defaultState(clock.now());
  state.rep = repParaNivel(nivel);
  state.tutorial.feito = true;
  state.loja.proximaChegada = 1e12;
  state.eventos.proximo = 1e12;
  mexer?.(state);
  return { game: createGame({ state, clock, rng: createRng(seed) }), clock };
};
const irPara = (game, clock, data) => { clock.set(em(...data)); game.verificarDia(); };

// ---------- sazonais ----------
test('períodos sazonais, inclusive os que viram o ano', () => {
  assert.equal(dentroDoPeriodo('12-25', '12-18', '01-03'), true);
  assert.equal(dentroDoPeriodo('01-02', '12-18', '01-03'), true);
  assert.equal(dentroDoPeriodo('01-04', '12-18', '01-03'), false);
  assert.equal(dentroDoPeriodo('12-17', '12-18', '01-03'), false);
  assert.equal(dentroDoPeriodo('06-15', '06-10', '06-30'), true);
  assert.equal(dentroDoPeriodo('07-01', '06-10', '06-30'), false);
  assert.equal(dentroDoPeriodo('06-10', '06-10', '06-30'), true);
  assert.equal(dentroDoPeriodo('06-30', '06-10', '06-30'), true);
});

test('os eventos sazonais ligam e desligam sozinhos pela data e mexem nos modificadores', () => {
  const { game, clock } = novo([2026, 8, 4]);
  assert.deepEqual(sazonaisAtivos(game), []);
  assert.equal(game.mods.chegada, 1);
  irPara(game, clock, [2026, 12, 25]);
  assert.deepEqual(sazonaisAtivos(game).map((s) => s.id), ['inverno_festivo']);
  assert.ok(Math.abs(game.mods.chegada - 1.2) < 1e-9 && Math.abs(game.mods.preco - 1.1) < 1e-9);
  irPara(game, clock, [2027, 1, 2]);
  assert.equal(sazonaisAtivos(game).length, 1, 'virou o ano e continua');
  irPara(game, clock, [2027, 1, 4]);
  assert.equal(game.mods.chegada, 1, 'terminou');
});

test('as datas dos sazonais são válidas e não se sobrepõem de forma confusa', () => {
  for (const s of DATA.listas.sazonais) {
    assert.match(s.de, /^\d\d-\d\d$/); assert.match(s.ate, /^\d\d-\d\d$/);
    assert.ok(s.efeitos.length >= 1 && s.desc.length > 20, s.id);
  }
  // no máximo 2 sazonais ao mesmo tempo em qualquer dia do ano
  const { game, clock } = novo([2026, 1, 1]);
  for (let d = 0; d < 366; d++) {
    clock.set(em(2026, 1, 1) + d * 86400000);
    assert.ok(sazonaisAtivos(game).length <= 2, `dia ${d}`);
  }
});

// ---------- encomendas diárias ----------
test('encomendas: mesma data e mesma faixa dão as mesmas encomendas, para qualquer jogador', () => {
  const a = novo([2026, 8, 4], 10, null, 1).game;
  const b = novo([2026, 8, 4], 12, null, 99).game;                // outro nível da mesma faixa (10-15) e outra semente
  assert.equal(faixaDe(a), faixaDe(b));
  assert.deepEqual(a.state.diario.encomendas, b.state.diario.encomendas, 'níveis 10 e 12 estão na mesma faixa');
  assert.deepEqual(a.state.diario.especial, b.state.diario.especial);
  const c = novo([2026, 8, 5], 10).game;
  assert.notDeepEqual(a.state.diario.encomendas.map((e) => e.item), c.state.diario.encomendas.map((e) => e.item), 'outro dia, outras encomendas');
  const novato = novo([2026, 8, 4], 1).game;
  assert.notDeepEqual(a.state.diario.encomendas.map((e) => e.item), novato.state.diario.encomendas.map((e) => e.item), 'outra faixa');
});

test('encomendas são possíveis: itens liberados, obteníveis, na faixa de valor, sem repetir', () => {
  for (const nivel of [1, 3, 6, 12, 18, 25, 35, 50]) {
    for (let d = 1; d <= 20; d++) {
      const { game } = novo([2026, 8, d], nivel);
      const enc = game.state.diario.encomendas;
      assert.equal(enc.length, 3, `nível ${nivel}, dia ${d}`);
      assert.equal(new Set(enc.map((e) => e.item)).size, 3, 'sem repetir');
      for (const e of enc) {
        const it = DATA.itens[e.item];
        assert.ok((it.nivelRep ?? 1) <= nivel, `${e.item} ainda não liberado no nível ${nivel}`);
        assert.ok(it.valor <= 80 + 70 * nivel);
        assert.ok(DATA.listas.receitas.some((r) => r.item === e.item) || DATA.listas.fornecedores.some((f) => f.vende.some((v) => v.material === e.item)), `${e.item} não dá para obter`);
        assert.ok(e.qtd >= 1 && e.qtd <= 4 && e.ouro > it.valor * e.qtd && e.rep >= 1 && e.rep <= 5);
        assert.equal(e.entregue, false);
      }
    }
  }
});

test('entregar: gasta os itens (a pior qualidade que serve primeiro), paga e não repete', () => {
  const { game } = novo([2026, 8, 4], 10);
  const enc = game.state.diario.encomendas[0];
  enc.qualidadeMin = 1; enc.qtd = 3;
  game.state.estoque = {};
  assert.deepEqual(entregarEncomenda(game, 0), { ok: false, motivo: 'faltam-itens' });
  game.state.estoque = { [`${enc.item}:0`]: 5, [`${enc.item}:1`]: 1, [`${enc.item}:3`]: 2 };
  assert.equal(unidadesParaEncomenda(game, enc), 3, 'qualidade 0 não conta');
  assert.equal(podeEntregar(game, enc), true);
  const ouro = game.state.ouro; const rep = game.state.rep;
  const r = entregarEncomenda(game, 0);
  assert.equal(r.ok, true);
  assert.equal(game.state.ouro, ouro + enc.ouro);
  assert.equal(game.state.rep, rep + enc.rep);
  assert.equal(game.state.estoque[`${enc.item}:0`], 5, 'a qualidade que não serve fica');
  assert.ok(!(`${enc.item}:1` in game.state.estoque), 'gastou a qualidade 1 primeiro');
  assert.ok(!(`${enc.item}:3` in game.state.estoque), 'e depois a 3: eram 3 unidades no total (1 + 2)');
  assert.equal(game.state.stats.encomendas, 1);
  assert.equal(entregarEncomenda(game, 0).motivo, 'ja-entregue');
  assert.equal(entregarEncomenda(game, 9).motivo, 'inexistente');
});

test('o dia seguinte traz encomendas novas', () => {
  const { game, clock } = novo([2026, 8, 4], 10);
  const antes = game.state.diario.encomendas.map((e) => e.item).join();
  game.state.diario.encomendas[0].entregue = true;
  irPara(game, clock, [2026, 8, 5]);
  assert.notEqual(game.state.diario.encomendas.map((e) => e.item).join(), antes);
  assert.ok(game.state.diario.encomendas.every((e) => !e.entregue));
  assert.equal(game.state.diario.data, '2026-08-05');
});

// ---------- aventureiro especial ----------
test('o especial do dia é sorteado pela data, pede um item da faixa dele e vem uma vez só', () => {
  const { game } = novo([2026, 8, 4], 12);
  const e = game.state.diario.especial;
  const adv = DATA.aventureiros[e.adv];
  assert.ok(adv && !adv.lendario);
  const reg = DATA.regioes[adv.regiao];
  assert.ok(DATA.itens[e.item].valor >= reg.valorMin && DATA.itens[e.item].valor <= reg.valorMax, 'item na faixa de valor da região dele');
  assert.deepEqual(novo([2026, 8, 4], 12, null, 77).game.state.diario.especial, e, 'igual para todos');
  assert.deepEqual(novo([2026, 8, 4], 14, null, 5).game.state.diario.especial, e, 'e para toda a faixa');
  let viu = 0;
  for (let i = 0; i < 400 && viu < 2; i++) { const c = gerarCliente(game); if (c.especial) { viu++; assert.equal(c.adv, e.adv); assert.deepEqual(c.pedido, { tipo: 'item', item: e.item }); } }
  assert.equal(viu, 1, 'só uma visita por dia');
  assert.equal(game.state.diario.especial.visitou, true);
});

test('atender o especial dá o bônus de ouro e reputação, uma vez', () => {
  const { game } = novo([2026, 8, 4], 12, (s) => { s.ouro = 0; });
  const e = game.state.diario.especial;
  let c = null;
  for (let i = 0; i < 400 && !c; i++) { const x = gerarCliente(game); if (x.especial) c = x; }
  assert.ok(c);
  game.state.estoque = { [`${e.item}:1`]: 1 };
  game.state.fila.push(c);
  game.rng.chance = () => true;
  const avisos = [];
  game.on('especialAtendido', (r) => avisos.push(r));
  const rep0 = game.state.rep;
  const r = vender(game, c.uid, `${e.item}:1`, 'justo');
  assert.equal(r.ok, true);
  assert.equal(avisos.length, 1);
  assert.equal(game.state.ouro, r.preco + Math.round(r.preco * 0.5));
  assert.ok(game.state.rep >= rep0 + 3);
  assert.equal(game.state.diario.especial.atendido, true);
});

test('o especial muda no dia seguinte e pode vir de novo', () => {
  const { game, clock } = novo([2026, 8, 4], 12);
  for (let i = 0; i < 400; i++) gerarCliente(game);
  assert.equal(game.state.diario.especial.visitou, true);
  irPara(game, clock, [2026, 8, 5]);
  assert.equal(game.state.diario.especial.visitou, false);
});

// ---------- sequência e bônus de login ----------
test('sequência: cada dia seguido soma; no mesmo dia nada muda', () => {
  const { game, clock } = novo([2026, 8, 4]);
  assert.equal(game.state.sequencia.dias, 1);
  registrarDia(game);
  assert.equal(game.state.sequencia.dias, 1, 'mesmo dia');
  irPara(game, clock, [2026, 8, 5]);
  irPara(game, clock, [2026, 8, 6]);
  assert.equal(game.state.sequencia.dias, 3);
});

test('perdão: faltar um dia por semana não quebra a sequência; o segundo, sim', () => {
  const { game, clock } = novo([2026, 8, 3]);                      // segunda
  irPara(game, clock, [2026, 8, 4]);
  irPara(game, clock, [2026, 8, 6]);                               // faltou o dia 5: perdão
  assert.equal(game.state.sequencia.dias, 3);
  assert.equal(game.state.sequencia.perdao.usados, 1);
  irPara(game, clock, [2026, 8, 8]);                               // faltou o 7, mesma semana: sem perdão
  assert.equal(game.state.sequencia.dias, 1);
});

test('o perdão volta na semana seguinte', () => {
  const { game, clock } = novo([2026, 8, 3]);
  irPara(game, clock, [2026, 8, 5]);                               // perdão da semana 1
  assert.equal(game.state.sequencia.dias, 2);
  irPara(game, clock, [2026, 8, 11]);                              // semana seguinte, faltou vários dias: quebra
  assert.equal(game.state.sequencia.dias, 1);
  irPara(game, clock, [2026, 8, 13]);                              // faltou 1 dia: perdão novo
  assert.equal(game.state.sequencia.dias, 2);
});

test('faltar vários dias zera a sequência para 1', () => {
  const { game, clock } = novo([2026, 8, 3]);
  for (const d of [4, 5, 6]) irPara(game, clock, [2026, 8, d]);
  assert.equal(game.state.sequencia.dias, 4);
  irPara(game, clock, [2026, 8, 20]);
  assert.equal(game.state.sequencia.dias, 1);
});

test('bônus de login: cresce com a sequência, pacote a cada 7 dias e só uma coleta por dia', () => {
  const { game, clock } = novo([2026, 8, 1], 10, (s) => { s.ouro = 0; });
  const b1 = bonusDoDia(game);
  assert.equal(b1.dias, 1);
  assert.ok(b1.ouro >= 40 + 12 * 10);
  assert.equal(b1.pacote, false);
  const r = coletarBonus(game);
  assert.equal(r.ok, true);
  assert.equal(game.state.ouro, b1.ouro);
  assert.equal(coletarBonus(game).motivo, 'ja-coletado');
  for (const d of [2, 3, 4, 5, 6]) irPara(game, clock, [2026, 8, d]);
  assert.equal(game.state.diario.bonusColetado, false, 'dia novo, bônus novo');
  const b6 = bonusDoDia(game);
  assert.ok(b6.ouro > b1.ouro, 'cresce');
  irPara(game, clock, [2026, 8, 7]);
  const b7 = bonusDoDia(game);
  assert.equal(b7.pacote, true);
  const antes = Object.values(game.state.materiais).reduce((a, b) => a + b, 0);
  const r7 = coletarBonus(game);
  assert.ok(Object.values(game.state.materiais).reduce((a, b) => a + b, 0) >= antes + 12);
  assert.ok(r7.linhas.some((l) => l.includes('reputação')));
});

test('o multiplicador da sequência tem teto', () => {
  const { game } = novo([2026, 8, 1], 10);
  game.state.sequencia.dias = 20;
  const a = bonusDoDia(game).ouro;
  game.state.sequencia.dias = 90;
  assert.equal(bonusDoDia(game).ouro, a);
});

// ---------- metas e baú da semana ----------
test('metas da semana: 4 metas, iguais para quem está na mesma faixa, e trocam na semana seguinte', () => {
  const a = novo([2026, 8, 4], 10).game;
  const b = novo([2026, 8, 6], 12, null, 5).game;                 // mesma semana, mesma faixa
  assert.equal(a.state.semanal.metas.length, 4);
  assert.deepEqual(a.state.semanal.metas, b.state.semanal.metas, 'mesmas metas e mesmos alvos');
  const { game, clock } = novo([2026, 8, 4], 10);
  const antes = game.state.semanal.chave;
  irPara(game, clock, [2026, 8, 10]);
  assert.notEqual(game.state.semanal.chave, antes);
  assert.equal(game.state.semanal.bauAberto, false);
});

test('o progresso conta só o que aconteceu na semana, e o baú exige pelo menos uma meta', () => {
  const { game } = novo([2026, 8, 4], 10, (s) => { s.stats.vendas = 500; s.stats.produzidos = 500; });   // histórico anterior não conta
  const metas = game.state.semanal.metas;
  for (const m of metas) assert.equal(progressoMeta(game, m), 0);
  assert.equal(abrirBau(game).motivo, 'sem-metas');
  const ref = metas[0];
  const stat = DATA.semanal.metas.find((x) => x.id === ref.id).stat;
  game.state.stats[stat] = (game.state.stats[stat] ?? 0) + ref.alvo;
  assert.equal(progressoMeta(game, ref), ref.alvo);
  assert.equal(metasCumpridas(game), 1);
  assert.match(textoMeta(game, ref), /\d/);
  assert.equal(pendencias(game).bau, true);
});

test('o baú paga mais com mais metas, traz item com 3 e materiais com 4, e abre uma vez por semana', () => {
  const recompensa = (n) => {
    const { game } = novo([2026, 8, 4], 10, (s) => { s.ouro = 0; s.estoque = {}; s.materiais = {}; });
    game.state.semanal.metas.slice(0, n).forEach((m) => { const st = DATA.semanal.metas.find((x) => x.id === m.id).stat; game.state.stats[st] = (game.state.stats[st] ?? 0) + m.alvo; });
    const r = abrirBau(game);
    assert.equal(r.ok, true);
    return { game, r };
  };
  const um = recompensa(1); const tres = recompensa(3); const quatro = recompensa(4);
  assert.ok(tres.game.state.ouro > um.game.state.ouro * 2.5);
  assert.equal(Object.keys(um.game.state.estoque).length, 0);
  assert.ok(Object.keys(tres.game.state.estoque).length >= 1, '3 metas: item');
  assert.equal(Object.keys(tres.game.state.materiais).length, 0);
  assert.ok(Object.keys(quatro.game.state.materiais).length >= 1, '4 metas: materiais');
  assert.equal(abrirBau(quatro.game).motivo, 'ja-aberto');
});

// ---------- pendências, save e longo prazo ----------
test('pendências avisam do bônus, das encomendas prontas e do baú', () => {
  const { game, clock } = novo([2026, 8, 4], 10);
  assert.deepEqual(pendencias(game), { bonus: true, encomendas: 0, bau: false });
  coletarBonus(game);
  const enc = game.state.diario.encomendas[0];
  game.state.estoque = { [`${enc.item}:1`]: enc.qtd, [`${enc.item}:2`]: enc.qtd };
  assert.equal(pendencias(game).encomendas, 1);
  irPara(game, clock, [2026, 8, 5]);
  assert.equal(pendencias(game).bonus, true);
});

test('tudo do dia e da semana é salvo e volta igual', () => {
  const { game, clock } = novo([2026, 8, 4], 10);
  coletarBonus(game);
  const mem = {};
  const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  saveState(st, game.state, clock.now());
  const g2 = createGame({ state: loadState(st).state, clock, rng: createRng(8) });
  assert.deepEqual(g2.state.diario, game.state.diario);
  assert.deepEqual(g2.state.sequencia, game.state.sequencia);
  assert.deepEqual(g2.state.semanal, game.state.semanal);
  assert.equal(g2.state.diario.bonusColetado, true, 'o bônus de hoje continua coletado');
});

test('save antigo, sem os campos novos, ganha o conteúdo do dia ao abrir', () => {
  const { state } = loadState({ getItem: () => JSON.stringify({ versao: 1, ouro: 5, rep: repParaNivel(6) }), setItem() {} });
  const g = createGame({ state, clock: createClock(em(2026, 8, 4)), rng: createRng(1) });
  assert.equal(g.state.diario.encomendas.length, 3);
  assert.equal(g.state.sequencia.dias, 1);
  assert.equal(g.state.semanal.metas.length, 4);
});

test('quatro meses de jogo, um dia de cada vez: nada quebra e a sequência acompanha', () => {
  const { game, clock } = novo([2026, 3, 1], 20);
  let esperado = 1;
  const rng = createRng(3);
  let ultimo = 0;
  for (let d = 0; d < 120; d++) {
    clock.set(em(2026, 3, 1) + d * 86400000);
    if (rng.chance(0.15)) continue;                                // faltou neste dia
    game.verificarDia();
    assert.equal(game.state.diario.data, game.state.dia.data);
    assert.ok(game.state.sequencia.dias >= 1);
    assert.equal(game.state.diario.encomendas.length, 3);
    assert.equal(game.state.semanal.metas.length, 4);
    ultimo = d;
  }
  void esperado; void ultimo;
});
