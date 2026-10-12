// Avisos curtos que aparecem sob a barra do topo e somem sozinhos.
import { Container, Graphics } from 'pixi.js';
import { C, txt, drawCard } from './ui.js';
import { tween } from './anim.js';

export function createToasts() {
  const root = new Container();
  let anchor = { x: 0, y: 70, w: 360 };

  const show = (text, color = C.accent) => {
    const t = txt(text, C.text, 14, true);
    const w = Math.min(anchor.w, t.width + 36);
    const h = 36;
    const c = new Container();
    const bg = new Graphics();
    drawCard(bg, w, h, { fill: C.deep, radius: 18, border: color, borderAlpha: 0.7, shadow: true });
    t.position.set((w - t.width) / 2, (h - t.height) / 2);
    c.addChild(bg, t);
    c.position.set(anchor.x + (anchor.w - w) / 2, anchor.y - 10);
    c.alpha = 0;
    root.addChild(c);
    // empilha para baixo os avisos que já estavam na tela
    for (const other of root.children) if (other !== c) tween(other, { y: other.y + h + 6 }, 160);
    tween(c, { alpha: 1, y: anchor.y }, 200);
    setTimeout(() => tween(c, { alpha: 0 }, 300, { onDone: () => c.destroy({ children: true }) }), 1900);
  };

  return {
    root,
    show,
    layout(L) { anchor = { x: L.content.x, y: L.topH + 8, w: L.content.w }; },
  };
}
