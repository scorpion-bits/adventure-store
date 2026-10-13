import test from 'node:test';
import assert from 'node:assert/strict';
import { exportarCodigo, lerCodigo, resumoDoSave } from '../../src/core/backup.js';
import { defaultState, SAVE_VERSION } from '../../src/core/state.js';
import { repParaNivel } from '../../src/core/economy.js';

const T0 = new Date(2026, 7, 4, 12).getTime();
const jogado = () => {
  const s = defaultState(T0 - 5 * 86400000);
  s.ouro = 12345; s.rep = repParaNivel(9);
  s.estoque['espada_ferro:1'] = 7; s.materiais.barra_ferro = 40;
  s.melhorias.mapa_regiao = true;
  s.lendarios.merlindo = { cap: 2, visita: T0 };
  s.tutorial = { ...(s.tutorial ?? {}), feito: true };
  return s;
};

test('o código vai e volta sem perder nada, e fica curto para mandar por mensagem', async () => {
  const s = jogado();
  const codigo = await exportarCodigo(s, T0);
  assert.match(codigo, /^LOJA1-[0-9a-f]{8}-[A-Za-z0-9_-]+$/);
  assert.ok(codigo.length < JSON.stringify(s).length, 'menor que o JSON');
  const r = await lerCodigo(codigo, T0);
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, { ...s, salvoEm: T0 });
  assert.deepEqual(r.resumo, { nivel: 9, ouro: 12345, dias: 6, salvoEm: T0 });
});

test('tolera quebras de linha, espaços e texto em volta (copiado de uma conversa)', async () => {
  const codigo = await exportarCodigo(jogado(), T0);
  const quebrado = codigo.match(/.{1,40}/g).join('\n');
  const r1 = await lerCodigo(`  Meu save:\n${quebrado}\n  `, T0);
  assert.equal(r1.ok, true);
  assert.equal(r1.state.ouro, 12345);
  const r2 = await lerCodigo(`"${codigo}"`, T0);
  assert.equal(r2.ok, true);
});

test('código cortado, alterado ou de outra coisa é recusado com o motivo certo', async () => {
  const codigo = await exportarCodigo(jogado(), T0);
  assert.equal((await lerCodigo('', T0)).motivo, 'vazio');
  assert.equal((await lerCodigo('   \n ', T0)).motivo, 'vazio');
  assert.equal((await lerCodigo('olá, tudo bem?', T0)).motivo, 'formato');
  assert.equal((await lerCodigo(codigo.slice(0, -20), T0)).motivo, 'incompleto', 'cortado');
  const trocado = codigo.slice(0, -5) + (codigo.endsWith('AAAAA') ? 'BBBBB' : 'AAAAA');
  assert.equal((await lerCodigo(trocado, T0)).motivo, 'incompleto', 'alterado');
  assert.equal((await lerCodigo('{ "x": 1 }', T0)).motivo, 'invalido');
  assert.equal((await lerCodigo('{ não é json', T0)).motivo, 'incompleto');
  assert.equal((await lerCodigo('[1,2,3]', T0)).motivo, 'formato');
});

test('um save de uma versão mais nova do jogo não é aberto às cegas', async () => {
  const futuro = { ...jogado(), versao: SAVE_VERSION + 1 };
  const r = await lerCodigo(JSON.stringify(futuro), T0);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'versao-nova');
});

test('aceita o JSON cru de um save (arquivo) e completa o que faltar de um save antigo', async () => {
  const antigo = { versao: 1, ouro: 50, rep: 10, estoque: { 'pao_aventureiro:1': 2 }, criadoEm: T0, salvoEm: T0 };
  const r = await lerCodigo(JSON.stringify(antigo), T0);
  assert.equal(r.ok, true);
  assert.equal(r.state.ouro, 50);
  assert.ok(r.state.equipe && r.state.melhorias && r.state.oficios, 'campos novos recebem o padrão');
  assert.deepEqual(Object.keys(defaultState(T0)).filter((k) => !(k in r.state)), []);
});

test('o resumo mostra nível, ouro e dias jogados', () => {
  const s = jogado();
  s.salvoEm = T0;
  assert.deepEqual(resumoDoSave(s), { nivel: 9, ouro: 12345, dias: 6, salvoEm: T0 });
  assert.equal(resumoDoSave(defaultState(T0)).dias, 1);
});
