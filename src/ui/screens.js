// Telas das 5 abas. Por enquanto são provisórias (M0): mostram o que a tela vai ter.
// Cada tela é `{ root, resize(rect), show() }`; as telas reais vão substituindo as provisórias.
import { Container, Graphics } from 'pixi.js';
import { C, txt, para, drawCard, createScroll } from './ui.js';
import { TELAS } from '../data/strings.js';
import { TABS } from './tabbar.js';
import { createLojaScreen } from './loja.js';
import { createMercadoScreen } from './mercado.js';

function stubScreen(id, { toast }) {
  const info = TELAS[id];
  const root = new Container();
  const scroll = createScroll(300);
  root.addChild(scroll.root);

  const build = (w) => {
    scroll.clear();
    const fs = w < 380 ? 14 : 15;

    const head = new Container();
    const hb = new Graphics();
    const t = txt(info.titulo, C.text, 22, true);
    const sub = para(info.resumo, C.dim, fs, w - 36);
    const tag = txt(`chega na etapa ${info.etapa}`, C.accent, 12, true);
    t.position.set(18, 14);
    sub.position.set(18, 14 + t.height + 4);
    tag.position.set(18, sub.y + sub.height + 8);
    const h = tag.y + tag.height + 16;
    drawCard(hb, w, h, { fill: C.cardHi, accent: C.accent });
    head.addChild(hb, t, sub, tag);
    scroll.add(head, h);

    for (const line of info.itens) {
      const row = new Container();
      const rb = new Graphics();
      const p = para(line, C.text, fs, w - 56);
      p.position.set(36, 12);
      const rh = p.height + 24;
      drawCard(rb, w, rh, { fill: C.card });
      rb.circle(18, rh / 2, 4).fill(C.accent);
      row.addChild(rb, p);
      scroll.add(row, rh);
    }

    scroll.relayout();
  };

  return {
    root,
    scroll,
    resize(rect) {
      root.position.set(rect.x, rect.y);
      scroll.width = rect.w;
      build(rect.w);
      scroll.resize(rect.h, rect.w);
    },
    show() { scroll.playIn(); },
  };
}

export function createScreens(ctx) {
  const reais = { loja: createLojaScreen, mercado: createMercadoScreen };
  return TABS.map((tab) => (reais[tab.id] ?? ((c) => stubScreen(tab.id, c)))(ctx));
}
