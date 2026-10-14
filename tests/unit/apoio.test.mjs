import test from 'node:test';
import assert from 'node:assert/strict';
import { crc16, pixCopiaECola, reais } from '../../src/core/pix.js';
import { criarApoio, conferirCodigo, assinarCodigo, CHAVE_ARMAZENAMENTO } from '../../src/core/apoio.js';
import { createGame } from '../../src/core/game.js';
import { defaultState } from '../../src/core/state.js';
import { createRng } from '../../src/core/rng.js';
import { createClock } from '../../src/core/time.js';
import { DATA } from '../../src/data/index.js';
import { APOIO } from '../../src/data/apoio.js';
import { comprarDecoracao, usarDecoracao, possuiDecoracao, temaAtual } from '../../src/core/upgrades.js';
import { progressoConquista } from '../../src/core/achievements.js';

// ---------- Pix ----------
// lê o texto do BR Code como lista de campos (id, tamanho, valor)
const campos = (t) => { const out = {}; for (let i = 0; i < t.length;) { const id = t.slice(i, i + 2); const n = Number(t.slice(i + 2, i + 4)); out[id] = t.slice(i + 4, i + 4 + n); i += 4 + n; } return out; };

test('o CRC16 do BR Code é o CCITT-FALSE (vetor conhecido)', () => {
  assert.equal(crc16('123456789'), '29B1');
});

test('Pix copia e cola: campos, valor, nome limpo e CRC conferem', () => {
  const t = pixCopiaECola({ ...APOIO.pix, valor: 4.9, txid: 'LOJATEMAGELO' });
  const c = campos(t.slice(0, -8));
  assert.equal(c['00'], '01');
  assert.equal(c['01'], '11');
  assert.equal(campos(c['26'])['00'], 'br.gov.bcb.pix');
  assert.equal(campos(c['26'])['01'], '60345144000101');
  assert.equal(c['53'], '986');
  assert.equal(c['54'], '4.90');
  assert.equal(c['58'], 'BR');
  assert.equal(c['59'], 'SCORPION BITS');
  assert.equal(campos(c['62'])['05'], 'LOJATEMAGELO');
  assert.ok(t.endsWith(crc16(t.slice(0, -4))), 'o CRC cobre o texto até "6304"');
  assert.match(t, /6304[0-9A-F]{4}$/);
  // sem valor (o jogador escolhe) e com nome acentuado
  const livre = pixCopiaECola({ chave: 'a@b.com', nome: 'Açaí Ltda & Cia', cidade: 'São Paulo' });
  const cl = campos(livre.slice(0, -8));
  assert.equal(cl['54'], undefined);
  assert.equal(cl['59'], 'ACAI LTDA  CIA');
  assert.equal(cl['60'], 'SAO PAULO');
  assert.throws(() => pixCopiaECola({ chave: 'x', nome: 'a', cidade: 'b', valor: 0 }));
  assert.equal(reais(19.9), 'R$ 19,90');
});

// ---------- códigos ----------
const par = async () => {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { pub: await crypto.subtle.exportKey('jwk', k.publicKey), priv: await crypto.subtle.exportKey('jwk', k.privateKey) };
};
const armazem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; };

test('um código assinado confere; texto mexido, outra chave ou produto desconhecido não', async () => {
  const { pub, priv } = await par();
  const outra = await par();
  const codigo = await assinarCodigo('tema_gelo', 'pedido-1', priv);
  assert.match(codigo, /^LOJAP1-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(await conferirCodigo(codigo, { chavePublica: pub }), { ok: true, produto: 'tema_gelo', pedido: 'pedido-1' });
  assert.deepEqual(await conferirCodigo(`  ${codigo.slice(0, 20)}\n${codigo.slice(20)} `, { chavePublica: pub }), { ok: true, produto: 'tema_gelo', pedido: 'pedido-1' }, 'espaços e quebras de linha da colagem não atrapalham');
  assert.equal((await conferirCodigo(codigo, { chavePublica: outra.pub })).motivo, 'assinatura');
  // trocar o produto no texto (para ganhar outro) invalida a assinatura
  const falso = codigo.replace(codigo.split('.')[0], `LOJAP1-${btoa(JSON.stringify({ p: 'pacote_apoiador', n: 'pedido-1' })).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}`);
  assert.equal((await conferirCodigo(falso, { chavePublica: pub })).motivo, 'assinatura');
  assert.equal((await conferirCodigo('LOJAP1-abc', { chavePublica: pub })).motivo, 'formato');
  assert.equal((await conferirCodigo('qualquer coisa', { chavePublica: pub })).motivo, 'formato');
  assert.equal((await conferirCodigo('', { chavePublica: pub })).motivo, 'vazio');
  const desconhecido = await assinarCodigo('produto_que_nao_existe', 'x', priv);
  assert.equal((await conferirCodigo(desconhecido, { chavePublica: pub, produtos: { tema_gelo: {} } })).motivo, 'produto');
});

test('resgatar guarda o produto à parte do save; pacote inclui os produtos; o mesmo pedido não vale duas vezes', async () => {
  const { pub, priv } = await par();
  const storage = armazem();
  const apoio = criarApoio({ storage, chavePublica: pub });
  assert.equal(apoio.semAnuncios(), false);
  assert.equal(apoio.apoiador(), false);
  let avisos = 0;
  apoio.aoMudar(() => { avisos += 1; });
  const gelo = await assinarCodigo('tema_gelo', 'a1', priv);
  assert.equal((await apoio.resgatar(gelo)).ok, true);
  assert.equal((await apoio.resgatar(gelo)).motivo, 'repetido');
  assert.equal(apoio.tem('tema_gelo'), true);
  assert.equal(apoio.tem('tema_sakura'), false);
  assert.equal(apoio.apoiador(), true);
  assert.equal(avisos, 1);
  const pacote = await assinarCodigo('pacote_apoiador', 'a2', priv);
  assert.equal((await apoio.resgatar(pacote)).ok, true);
  assert.equal(apoio.semAnuncios(), true);
  for (const id of ['tema_noturno', 'tema_sakura', 'tema_vulcanico', 'tema_gelo', 'sem_anuncios']) assert.ok(apoio.tem(id), id);
  // outro aparelho / outra abertura do jogo: os códigos voltam do armazenamento
  assert.ok(storage.m.get(CHAVE_ARMAZENAMENTO));
  const volta = criarApoio({ storage, chavePublica: pub });
  assert.equal(volta.semAnuncios(), true);
  // a chave de conferência mudou (ou o texto foi mexido): na reconferência os códigos inválidos saem
  const trocada = criarApoio({ storage, chavePublica: (await par()).pub });
  assert.equal(trocada.semAnuncios(), true, 'até conferir de novo, vale o que estava guardado (sem piscar anúncio)');
  await trocada.reconferir();
  assert.equal(trocada.semAnuncios(), false);
  assert.equal(trocada.apoiador(), false);
  // storage quebrado não derruba
  assert.doesNotThrow(() => criarApoio({ storage: { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } } }));
  storage.m.set(CHAVE_ARMAZENAMENTO, '{lixo');
  assert.equal(criarApoio({ storage }).apoiador(), false);
});

// ---------- temas pagos no jogo ----------
const novoJogo = (apoio) => createGame({ state: defaultState(0), rng: createRng(1), clock: createClock(new Date(2026, 9, 14, 12).getTime()), apoio });

test('tema pago não se compra com ouro, só vale com o código, e sem ele a loja volta ao rústico', async () => {
  const { pub, priv } = await par();
  const apoio = criarApoio({ storage: armazem(), chavePublica: pub });
  const g = novoJogo(apoio);
  g.state.ouro = 1e9;
  g.state.rep = 1e9;
  assert.equal(comprarDecoracao(g, 'sakura').motivo, 'loja-de-apoio');
  assert.equal(usarDecoracao(g, 'sakura').motivo, 'nao-comprada');
  assert.equal(possuiDecoracao(g, 'sakura'), false);
  await apoio.resgatar(await assinarCodigo('tema_sakura', 'p1', priv));
  assert.equal(possuiDecoracao(g, 'sakura'), true);
  assert.equal(usarDecoracao(g, 'sakura').ok, true);
  assert.equal(temaAtual(g).id, 'sakura');
  assert.deepEqual(g.mods.chegada, novoJogo(apoio).mods.chegada, 'sem efeito no jogo');
  // sem o código (outro apoio vazio), o save que tinha o tema em uso cai no rústico
  const sem = novoJogo(criarApoio({ storage: armazem(), chavePublica: pub }));
  sem.state.loja.tema = 'sakura';
  assert.equal(temaAtual(sem).id, 'rustico');
  // "todas as decorações" nas conquistas não exige comprar os temas pagos
  const meta = DATA.conquistas.decoracoes_todos;
  if (meta) assert.equal(progressoConquista(g, meta).meta, DATA.listas.decoracoes.filter((d) => !d.premium).length);
});

test('os produtos da loja de apoio são coerentes com as decorações', () => {
  for (const p of APOIO.produtos) {
    assert.ok(p.preco > 0, p.id);
    if (p.tipo === 'tema') assert.equal(DATA.decoracoes[p.decoracao].premium, p.id);
    if (p.tipo === 'pacote') for (const i of p.inclui) assert.ok(APOIO.produtos.some((x) => x.id === i && x.tipo !== 'pacote'), i);
  }
  const preco = (id) => APOIO.produtos.find((p) => p.id === id).preco;
  const soma = APOIO.produtos.find((p) => p.id === 'pacote_apoiador').inclui.reduce((s, i) => s + preco(i), 0);
  assert.ok(preco('pacote_apoiador') < soma, 'o pacote sai mais barato que comprar tudo separado');
});
