// Layout responsivo (função pura: recebe o tamanho da tela e devolve retângulos).
// Três modos:
//  - portrait : celular em pé (e tablet em pé). Barra do topo + abas embaixo.
//  - landscape: celular deitado (pouca altura). Abas viram um trilho na esquerda.
//  - desktop  : tela larga. Mesmo layout do retrato, só que mais largo e centralizado.

export const TAB_COUNT = 5;
const MAX_W = { portrait: 560, landscape: 760, desktop: 880 };

export function layoutMode(w, h) {
  if (w > h && h < 520) return 'landscape';
  if (w < 700 || h > w) return 'portrait';
  return 'desktop';
}

const rect = (x, y, w, h) => ({ x, y, w, h });

export function computeLayout(w, h, safe = {}) {
  const sa = { top: safe.top ?? 0, right: safe.right ?? 0, bottom: safe.bottom ?? 0, left: safe.left ?? 0 };
  const mode = layoutMode(w, h);
  const landscape = mode === 'landscape';
  const topH = (landscape ? 44 : 56) + sa.top;
  const tabH = 64 + sa.bottom;
  const railW = 76 + sa.left;

  // área de jogo
  const areaX = landscape ? railW : sa.left;
  const areaW = w - areaX - sa.right;
  const contentW = Math.min(areaW - 16, MAX_W[mode]);
  const contentX = areaX + (areaW - contentW) / 2;
  const contentY = topH + 6;
  const contentH = landscape ? h - contentY - 6 - sa.bottom : h - contentY - tabH - 6;

  // abas
  let tabs;
  if (landscape) {
    const cellH = Math.min(64, (h - topH - 8 - sa.bottom) / TAB_COUNT);
    tabs = {
      orientation: 'rail',
      rect: rect(0, 0, railW, h),
      cells: Array.from({ length: TAB_COUNT }, (_, i) => rect(sa.left + 6, topH + 6 + i * cellH, railW - sa.left - 12, cellH - 4)),
    };
  } else {
    const barW = Math.min(w - sa.left - sa.right, MAX_W[mode] + 80);
    const barX = sa.left + (w - sa.left - sa.right - barW) / 2;
    const cellW = barW / TAB_COUNT;
    tabs = {
      orientation: 'bottom',
      rect: rect(0, h - tabH, w, tabH),
      cells: Array.from({ length: TAB_COUNT }, (_, i) => rect(barX + i * cellW + 3, h - tabH + 6, cellW - 6, tabH - sa.bottom - 10)),
    };
  }

  return {
    mode, w, h, safe: sa, topH, tabH, railW,
    top: rect(landscape ? railW : 0, 0, landscape ? w - railW : w, topH),
    content: rect(contentX, contentY, contentW, Math.max(120, contentH)),
    tabs,
    font: mode === 'desktop' ? 1.08 : 1,
  };
}
