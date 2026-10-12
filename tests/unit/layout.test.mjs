import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, layoutMode, TAB_COUNT } from '../../src/ui/layout.js';

test('modos de layout por tamanho de tela', () => {
  assert.equal(layoutMode(390, 844), 'portrait');     // celular em pé
  assert.equal(layoutMode(768, 1024), 'portrait');    // tablet em pé
  assert.equal(layoutMode(844, 390), 'landscape');    // celular deitado
  assert.equal(layoutMode(1280, 800), 'desktop');
  assert.equal(layoutMode(1920, 1080), 'desktop');
});

for (const [w, h] of [[360, 640], [390, 844], [844, 390], [667, 375], [768, 1024], [1280, 800], [1920, 1080]]) {
  test(`layout ${w}x${h}: tudo cabe na tela e as abas não se sobrepõem`, () => {
    const L = computeLayout(w, h);
    const c = L.content;
    assert.ok(c.x >= 0 && c.x + c.w <= w, 'conteúdo dentro da largura');
    assert.ok(c.y >= L.topH && c.y + c.h <= h, 'conteúdo dentro da altura');
    assert.equal(L.tabs.cells.length, TAB_COUNT);
    for (const r of L.tabs.cells) {
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h, 'aba dentro da tela');
      assert.ok(r.w >= 44 && r.h >= 40, `alvo de toque grande o bastante (${r.w}x${r.h})`);
    }
    const sorted = [...L.tabs.cells].sort((a, b) => a.x - b.x || a.y - b.y);
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1];
      const b = sorted[i];
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!overlap, 'abas sem sobreposição');
    }
    if (L.tabs.orientation === 'bottom') assert.ok(c.y + c.h <= L.tabs.rect.y, 'conteúdo acima das abas');
    else assert.ok(c.x >= L.railW, 'conteúdo ao lado do trilho');
  });
}

test('áreas seguras empurram barras e conteúdo', () => {
  const plain = computeLayout(390, 844);
  const notch = computeLayout(390, 844, { top: 47, bottom: 34 });
  assert.ok(notch.topH > plain.topH);
  assert.ok(notch.tabH > plain.tabH);
  assert.ok(notch.content.h < plain.content.h);
});
