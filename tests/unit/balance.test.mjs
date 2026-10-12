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
