// Abas principais: embaixo (celular em pé/desktop) ou em trilho na esquerda (celular deitado).
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, wasDragged, drawCard } from './ui.js';
import { drawIcon } from './icons.js';
import { tween } from './anim.js';

export const TABS = [
  { id: 'loja', nome: 'Loja', icone: 'loja' },
  { id: 'oficina', nome: 'Oficina', icone: 'oficina' },
  { id: 'mercado', nome: 'Mercado', icone: 'mercado' },
  { id: 'aventureiros', nome: 'Aventureiros', icone: 'aventureiros' },
  { id: 'melhorias', nome: 'Melhorias', icone: 'melhorias' },
];

export function createTabBar({ onSelect }) {
  const root = new Container();
  const bar = new Graphics();
  root.addChild(bar);

  const cells = TABS.map((tab, i) => {
    const c = new Container();
    const bg = new Graphics();
    const icon = new Graphics();
    const label = txt(tab.nome, C.dim, 11, true);
    label.anchor.set(0.5, 0);
    const badge = new Graphics();
    c.addChild(bg, icon, label, badge);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => { if (!wasDragged()) onSelect(i); });
    root.addChild(c);
    return { tab, c, bg, icon, label, badge, w: 0, h: 0, badgeOn: false };
  });

  let active = 0;
  let L = null;

  const paintCell = (cell, i) => {
    const on = i === active;
    const { w, h } = cell;
    cell.bg.clear();
    if (on) {
      cell.bg.roundRect(0, 0, w, h, 12).fill({ color: C.accent, alpha: 0.18 })
        .stroke({ width: 1, color: C.accent, alpha: 0.55 });
    }
    const col = on ? C.accent : C.dim;
    const iconSize = Math.min(28, h * 0.46);
    drawIcon(cell.icon, cell.tab.icone, iconSize, col);
    cell.icon.position.set(w / 2, h * 0.36);
    cell.label.style.fill = on ? C.text : C.dim;
    cell.label.style.fontSize = w < 76 ? 10 : 11;
    cell.label.position.set(w / 2, h * 0.36 + iconSize * 0.62);
    cell.badge.clear();
    if (cell.badgeOn) cell.badge.circle(w / 2 + iconSize * 0.5, h * 0.36 - iconSize * 0.4, 5).fill(C.bad);
    cell.c.hitArea = new Rectangle(0, 0, w, h);
  };

  const paintAll = () => cells.forEach(paintCell);

  return {
    root,
    layout(layout) {
      L = layout.tabs;
      bar.clear();
      if (L.orientation === 'bottom') {
        drawCard(bar, L.rect.w, L.rect.h + 20, { fill: C.panel, radius: 0, shadow: false, borderAlpha: 0.08 });
        bar.position.set(L.rect.x, L.rect.y);
      } else {
        drawCard(bar, L.rect.w, L.rect.h, { fill: C.panel, radius: 0, shadow: false, borderAlpha: 0.08 });
        bar.position.set(L.rect.x, L.rect.y);
      }
      cells.forEach((cell, i) => {
        const r = L.cells[i];
        cell.c.position.set(r.x, r.y);
        cell.w = r.w;
        cell.h = r.h;
      });
      paintAll();
    },
    select(i, animate = true) {
      active = i;
      paintAll();
      if (animate) {
        const c = cells[i].icon;
        c.scale.set(1.25);
        tween(c, { scale: 1 }, 300);
      }
    },
    setBadge(i, on) {
      cells[i].badgeOn = on;
      paintCell(cells[i], i);
    },
    cellCenter(i) {
      const r = L.cells[i];
      return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    },
  };
}
