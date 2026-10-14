import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { repParaNivel } from '../../src/core/economy.js';
import { criarApoio, assinarCodigo } from '../../src/core/apoio.js';
import { ofertaAtual, resgatarOferta, esperaDaOferta } from '../../src/core/anuncios.js';
import { estadoMelhoria, comprarMelhoria } from '../../src/core/upgrades.js';
import { DATA } from '../../src/data/index.js';

const novo = (nivel = 5, ouro = 400, apoio) => {
  const clock = createClock(new Date(2026, 9, 14, 12).getTime());
  const state = defaultState(clock.now());
  state.rep = repParaNivel(nivel);
  state.ouro = ouro;
  return createGame({ state, rng: createRng(1), clock, apoio });
};
const horas = (g, h) => g.clock.advance(h * 3600e3);

test('a oferta é uma melhoria disponível que pesa no bolso, fica a mesma até ser resgatada e não aparece antes da reputação mínima', () => {
  assert.equal(ofertaAtual(novo(DATA.anuncios.oferta.nivelMin - 1)), null);
  const g = novo(5, 400);
  const m = ofertaAtual(g);
  assert.ok(m, 'há uma oferta');
  assert.equal(estadoMelhoria(g, m).estado, 'disponivel');
  const disponiveis = DATA.listas.melhorias.filter((x) => estadoMelhoria(g, x).estado === 'disponivel');
  const alvo = g.state.ouro * DATA.anuncios.oferta.fracaoOuro;
  assert.ok(m.custo >= alvo || m === disponiveis.sort((a, b) => a.custo - b.custo).at(-1), 'custa pelo menos a fração do ouro (ou é a mais cara que existe)');
  assert.equal(ofertaAtual(g).id, m.id, 'a oferta não muda sozinha');
  assert.equal(g.state.anuncios.oferta, m.id);
});

test('resgatar entrega a melhoria sem cobrar ouro, respeita o intervalo e o limite do dia', () => {
  const g = novo(8, 5000);
  const ouro = g.state.ouro;
  const c = DATA.anuncios.oferta;
  let ganhas = 0;
  for (let i = 0; i < c.maxPorDia; i++) {
    const m = ofertaAtual(g);
    assert.ok(m, `oferta ${i + 1}`);
    const r = resgatarOferta(g);
    assert.equal(r.ok, true);
    assert.equal(g.state.melhorias[m.id], true);
    ganhas += 1;
    assert.equal(ofertaAtual(g), null, 'depois de resgatar, só no próximo intervalo');
    assert.ok(esperaDaOferta(g) > 0);
    horas(g, c.cooldownH + 0.1);
    if (g.clock.now() > new Date(2026, 9, 14, 23).getTime()) break;         // virou o dia: a contagem zera
  }
  assert.equal(g.state.ouro, ouro, 'não gastou ouro');
  assert.ok(ganhas >= 1);
  // sem oferta fora de hora
  assert.equal(resgatarOferta(novo(1)).motivo, 'sem-oferta');
});

test('o limite por dia vale e zera no dia seguinte', () => {
  const g = novo(9, 20000);
  const c = DATA.anuncios.oferta;
  g.state.anuncios.dia = '2026-10-14';
  g.state.anuncios.hoje = c.maxPorDia;
  g.state.anuncios.ultimo = 0;
  assert.equal(esperaDaOferta(g), null, 'acabou por hoje');
  assert.equal(ofertaAtual(g), null);
  g.clock.advance(24 * 3600e3);
  assert.equal(esperaDaOferta(g), 0, 'dia novo: zera a contagem');
  assert.ok(ofertaAtual(g));
});

test('se a melhoria oferecida for comprada por fora, a oferta troca; sem melhorias disponíveis não há oferta', () => {
  const g = novo(6, 600);
  const m = ofertaAtual(g);
  g.state.ouro = 1e9;
  assert.equal(comprarMelhoria(g, m.id).ok, true);
  const outra = ofertaAtual(g);
  assert.ok(!outra || outra.id !== m.id);
  // tudo comprado ou bloqueado: sem oferta
  const g2 = novo(6, 600);
  for (const x of DATA.listas.melhorias) g2.state.melhorias[x.id] = true;
  assert.equal(ofertaAtual(g2), null);
});

test('quem tem "Sem anúncios" também recebe a oferta (a janela só deixa de pedir o anúncio) e não conta como anúncio visto', async () => {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const apoio = criarApoio({ chavePublica: await crypto.subtle.exportKey('jwk', k.publicKey) });
  await apoio.resgatar(await assinarCodigo('sem_anuncios', 'x1', await crypto.subtle.exportKey('jwk', k.privateKey)));
  const g = novo(6, 600, apoio);
  assert.equal(g.apoio.semAnuncios(), true);
  assert.ok(resgatarOferta(g).ok);
  assert.equal(g.state.anuncios.vistos, 0);
  const g2 = novo(6, 600);
  assert.ok(resgatarOferta(g2).ok);
  assert.equal(g2.state.anuncios.vistos, 1);
});
