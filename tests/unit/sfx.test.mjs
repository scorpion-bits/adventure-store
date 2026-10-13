import test from 'node:test';
import assert from 'node:assert/strict';

// no Node não há AudioContext: os sons ficam mudos (ready() é falso), e chamar qualquer um deles não pode dar erro
test('todos os sons do jogo existem e ficam mudos sem áudio, sem erro', async () => {
  globalThis.window ??= globalThis;
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };
  const { sfx } = await import('../../src/audio/sfx.js');
  for (const nome of ['tap', 'sell', 'buy', 'deny', 'levelUp', 'achievement', 'bell', 'ready', 'event', 'prestige', 'open', 'close', 'tick', 'partida', 'volta', 'coleta']) {
    assert.equal(typeof sfx[nome], 'function', nome);
    assert.doesNotThrow(() => sfx[nome](), nome);
  }
});
