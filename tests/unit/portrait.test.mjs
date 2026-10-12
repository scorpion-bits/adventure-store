import test from 'node:test';
import assert from 'node:assert/strict';
import { portraitPixels, GRADE } from '../../src/ui/portrait-art.js';
import { DATA } from '../../src/data/index.js';

const assinatura = (p) => p.pixels.map(([x, y, c]) => `${x},${y},${c}`).sort().join('|');

test('retratos são determinísticos e ficam dentro da grade', () => {
  for (const adv of DATA.listas.aventureiros) {
    const cor = DATA.meta.classes.find((c) => c.id === adv.classe).cor;
    const a = portraitPixels(adv.id, adv.classe, cor);
    const b = portraitPixels(adv.id, adv.classe, cor);
    assert.equal(assinatura(a), assinatura(b), adv.id);
    assert.ok(a.pixels.length > 60, `${adv.id} tem pixels demais ou de menos`);
    for (const [x, y] of a.pixels) assert.ok(x >= 0 && y >= 0 && x < GRADE && y < GRADE, `${adv.id} pixel fora da grade`);
  }
});

test('cada classe tem um visual próprio e aventureiros diferentes têm rostos diferentes', () => {
  const porClasse = new Set(DATA.meta.classes.map((c) => assinatura(portraitPixels('mesmo_id', c.id, c.cor))));
  assert.equal(porClasse.size, DATA.meta.classes.length);
  const rostos = new Set(DATA.listas.aventureiros.map((a) => assinatura(portraitPixels(a.id, a.classe, 0x888888))));
  assert.ok(rostos.size >= DATA.listas.aventureiros.length - 1, 'quase todos os retratos devem ser distintos');
});
