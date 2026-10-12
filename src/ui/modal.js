// Janela modal centralizada, com título, botão de fechar e conteúdo rolável.
// `open({ title, build })`: `build(scroll, innerWidth)` adiciona cartões à lista com `scroll.add(c, altura)`.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, drawCard, createScroll, makeButton, wasDragged } from './ui.js';
import { drawIcon } from './icons.js';
import { guiPronto, guiPainel } from '../assets.js';
import { tween, ease } from './anim.js';
import { sfx } from '../audio/sfx.js';

export function createModal() {
  const root = new Container();
  root.visible = false;
  const dim = new Graphics();
  dim.eventMode = 'static';
  const panel = new Container();
  const panelBg = new Graphics();
  let moldura = null;        // moldura de madeira (Cryo's), recriada a cada tamanho
  const title = txt('', C.text, 20, true);
  const closeBtn = makeButton(40, 40, { tint: C.dim, radius: 20, alpha: 0.08 });
  const closeIcon = new Graphics();
  closeBtn.addChild(closeIcon);
  drawIcon(closeIcon, 'fechar', 20, C.text);
  closeIcon.position.set(20, 20);
  root.addChild(dim, panel);
  panel.addChild(panelBg, title, closeBtn);

  const m = { root, spec: null, scroll: null, L: null, onClose: null };

  // `force`: fecha mesmo as janelas que não podem ser dispensadas (eventos que pedem uma escolha)
  const close = (force = false) => {
    if (!m.spec) return;
    if (m.spec.fechavel === false && force !== true) return;
    m.spec = null;
    sfx.close();
    tween(panel, { alpha: 0, y: panel.y + 14 }, 160, { onDone: () => { if (!m.spec) root.visible = false; } });
    tween(dim, { alpha: 0 }, 160);
    m.onClose?.();
  };
  closeBtn.tap(() => close());
  dim.on('pointertap', () => { if (!wasDragged()) close(); });

  const build = (animate) => {
    const L = m.L;
    if (!L || !m.spec) return;
    if (m.scroll) { m.scroll.root.destroy({ children: true }); m.scroll = null; }
    const w = Math.min(L.w - 24, 460);
    const pad = guiPronto() ? 30 : 20;       // a moldura de madeira ocupa a borda
    const innerW = w - pad * 2;
    const scroll = createScroll(innerW);
    m.spec.build(scroll, innerW);
    scroll.relayout();
    const head = guiPronto() ? 70 : 64;
    const h = Math.min(L.h - 32, head + scroll.contentH + pad + 4);
    scroll.resize(h - head - pad, innerW);
    scroll.root.position.set(pad, head);
    panel.addChild(scroll.root);
    m.scroll = scroll;

    if (guiPronto()) {
      moldura?.destroy();
      panelBg.clear().rect(6, 6, w - 12, h - 12).fill(C.panel);
      moldura = guiPainel('moldura', w, h, 2, { repetir: true });
      moldura.tint = 0xd9bfa6;      // madeira um pouco mais escura, para combinar com o tema
      panel.addChildAt(moldura, 1);
    } else {
      drawCard(panelBg, w, h, { fill: C.panel, radius: 20, borderAlpha: 0.14 });
    }
    title.text = m.spec.title;
    title.position.set(pad, guiPronto() ? 24 : 18);
    closeBtn.position.set(w - (guiPronto() ? 62 : 52), guiPronto() ? 18 : 12);
    closeBtn.visible = m.spec.fechavel !== false;

    dim.clear().rect(0, 0, L.w, L.h).fill({ color: 0x000000, alpha: 0.62 });
    dim.hitArea = new Rectangle(0, 0, L.w, L.h);
    const x = (L.w - w) / 2;
    const y = (L.h - h) / 2;
    panel.position.set(x, y);
    if (animate) {
      panel.alpha = 0;
      panel.y = y + 16;
      dim.alpha = 0;
      tween(panel, { alpha: 1, y }, 220, { ease: ease.out });
      tween(dim, { alpha: 1 }, 200);
    } else {
      panel.alpha = 1;
      dim.alpha = 1;
    }
  };

  m.open = (spec) => {
    m.spec = spec;
    root.visible = true;
    sfx.open();
    build(true);
  };
  m.close = close;
  m.spec_ = () => m.spec;
  m.isOpen = () => !!m.spec;
  m.layout = (L) => { m.L = L; build(false); };
  return m;
}
