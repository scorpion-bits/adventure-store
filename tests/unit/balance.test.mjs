import test from 'node:test';
import assert from 'node:assert/strict';
import { simular, PERFIS } from '../../scripts/balance-sim.mjs';

// Guarda de ritmo: o bot "regular" (2 sessões de 20 min por dia) precisa chegar a certos pontos em certos prazos.
// Os limites são largos de propósito (o simulador tem sorte e escolhas do bot); se um ajuste de balanceamento quebrar isto,
// rode `npm run sim` para ver o quanto o ritmo mudou. Metas de referência: ver "Ritmo de jogo" no README.
test('ritmo do primeiro dia e do segundo dia (perfil regular)', () => {
  const { linhas } = simular({ perfil: PERFIS.regular, dias: 2, semente: 1 });
  const dia1 = linhas.find((l) => l.quando === '1 d');
  assert.ok(dia1.nivel >= 4 && dia1.nivel <= 9, `reputação no fim do dia 1: ${dia1.nivel}`);
  assert.ok(dia1.vendas >= 60, `vendas no dia 1: ${dia1.vendas}`);
  const fim = linhas[linhas.length - 1];
  assert.ok(fim.nivel >= 5, `reputação no dia 2: ${fim.nivel}`);
  assert.ok(fim.ouroTotal > dia1.ouroTotal);
});

test('o simulador é determinístico (mesma semente, mesmo resultado)', () => {
  const a = simular({ perfil: PERFIS.casual, dias: 1, semente: 5 }).linhas;
  const b = simular({ perfil: PERFIS.casual, dias: 1, semente: 5 }).linhas;
  assert.deepEqual(a, b);
});

// depois de dias de jogo (todas as telas e sistemas mexidos pelo bot), o estado precisa continuar são e sobreviver a salvar/carregar
test('estado após 3 dias de jogo: sem números quebrados e com save/load idêntico', async () => {
  const { loadState, saveState } = await import('../../src/core/save.js');
  const { game } = simular({ perfil: PERFIS.dedicado, dias: 3, semente: 3, prestigio: true });
  const ruins = [];
  const olhar = (v, caminho) => {
    if (typeof v === 'number' && !Number.isFinite(v)) ruins.push(`${caminho} = ${v}`);
    else if (v === undefined) ruins.push(`${caminho} indefinido`);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) olhar(x, `${caminho}.${k}`);
  };
  olhar(game.state, 'state');
  assert.deepEqual(ruins, []);
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  saveState(storage, game.state);
  const { state, origem } = loadState(storage);
  assert.equal(origem, 'carregado');
  assert.deepEqual(JSON.parse(JSON.stringify(state)), JSON.parse(JSON.stringify(game.state)));
});
