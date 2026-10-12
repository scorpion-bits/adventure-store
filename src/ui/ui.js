// Componentes de interface (Pixi): textos, cartões, botões, listas roláveis com toque e inércia,
// interruptores. Tudo desenhado por código; a skin com arte (Cryo's Mini GUI) entra depois pelo assets.js.
import { Container, Graphics, Text, Rectangle } from 'pixi.js';
import { C, FONT_BODY, FONT_DISPLAY } from './theme.js';
import { tween, ease } from './anim.js';

export { C, T, hex, darken, lighten } from './theme.js';

export const txt = (text, fill, size, bold = false) => new Text({
  text,
  style: { fill, fontSize: size, fontFamily: bold ? FONT_DISPLAY : FONT_BODY, fontWeight: bold ? '600' : '400' },
});

// Texto com quebra de linha dentro de `width`.
export const para = (text, fill, size, width, { bold = false, align = 'left', lineHeight } = {}) => new Text({
  text,
  style: {
    fill, fontSize: size, fontFamily: bold ? FONT_DISPLAY : FONT_BODY, fontWeight: bold ? '600' : '400',
    wordWrap: true, wordWrapWidth: width, align, lineHeight: lineHeight ?? Math.round(size * 1.35),
  },
});

// Cartão arredondado com sombra suave e borda discreta.
export function drawCard(g, w, h, {
  fill = C.card, fillAlpha = 1, radius = 14, borderAlpha = 0.09, shadow = true, accent = null, border = 0xffffff,
} = {}) {
  g.clear();
  if (shadow) {
    for (let i = 3; i >= 1; i--) {
      g.roundRect(-i, i * 2.4, w + i * 2, h + i, radius + i).fill({ color: 0x000000, alpha: 0.07 });
    }
  }
  g.roundRect(0, 0, w, h, radius).fill({ color: fill, alpha: fillAlpha })
    .stroke({ width: 1, color: border, alpha: borderAlpha });
  if (accent !== null) g.roundRect(0, 12, 3, Math.max(8, h - 24), 1.5).fill(accent);
  return g;
}

// ---------- Toque x arrasto ----------
// Depois de arrastar uma lista, o "toque" que o Pixi dispara ao soltar não deve acionar botões.
let dragged = false;
export const wasDragged = () => dragged;

// ---------- Botão: cor de destaque, realce ao passar o mouse, "afunda" ao apertar ----------
export function makeButton(w, h, { tint = C.accent, radius = 12, alpha = 0.14 } = {}) {
  const c = new Container();
  const inner = new Container();
  const bg = new Graphics();
  const hi = new Graphics();
  inner.addChild(bg, hi);
  Container.prototype.addChild.call(c, inner);
  // todo conteúdo adicionado ao botão vai para `inner`, para escalar junto
  c.addChild = (...children) => inner.addChild(...children);

  c.eventMode = 'static';
  c.cursor = 'pointer';
  const st = { w, h, tint, radius, alpha, active: false, disabled: false };
  c.btn = st;

  c.paint = (over = {}) => {
    Object.assign(st, over);
    const a = st.disabled ? 0.05 : st.active ? 0.34 : st.alpha;
    bg.clear()
      .roundRect(0, 0, st.w, st.h, st.radius)
      .fill({ color: st.tint, alpha: a })
      .stroke({ width: 1, color: st.tint, alpha: st.disabled ? 0.15 : st.active ? 0.85 : 0.4 });
    hi.clear().roundRect(0, 0, st.w, st.h, st.radius).fill({ color: 0xffffff, alpha: 1 });
    inner.pivot.set(st.w / 2, st.h / 2);
    inner.position.set(st.w / 2, st.h / 2);
    c.hitArea = new Rectangle(0, 0, st.w, st.h);
    c.alpha = st.disabled ? 0.55 : 1;
    c.cursor = st.disabled ? 'default' : 'pointer';
  };
  c.setActive = (on) => c.paint({ active: on });
  c.setDisabled = (on) => c.paint({ disabled: on });
  c.paint();
  hi.alpha = 0;

  // `fn` roda num toque/clique (e não depois de arrastar uma lista)
  c.tap = (fn) => {
    c.on('pointertap', (e) => { if (!dragged && !st.disabled) fn(e); });
    return c;
  };

  c.on('pointerover', () => {
    tween(hi, { alpha: 0.07 }, 140);
    tween(inner, { scale: 1.02 }, 160);
  });
  c.on('pointerout', () => {
    tween(hi, { alpha: 0 }, 160);
    tween(inner, { scale: 1 }, 180);
  });
  c.on('pointerdown', () => tween(inner, { scale: 0.96 }, 90));
  c.on('pointerup', () => tween(inner, { scale: 1.02 }, 160, { ease: ease.back }));
  c.on('pointerupoutside', () => tween(inner, { scale: 1 }, 160));

  c.inner = inner;
  return c;
}

// Botão com um rótulo centralizado.
export function labelButton(label, w, h, { size = 15, ...opts } = {}) {
  const b = makeButton(w, h, opts);
  const t = txt(label, C.text, size, true);
  t.anchor.set(0.5);
  t.position.set(w / 2, h / 2);
  b.addChild(t);
  b.label = t;
  return b;
}

// ---------- Interruptor liga/desliga ----------
export function makeToggle(on, onChange) {
  const c = new Container();
  const track = new Graphics();
  const knob = new Graphics();
  c.addChild(track, knob);
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.hitArea = new Rectangle(-6, -6, 62, 40);
  const state = { on };
  const paint = (animate) => {
    track.clear().roundRect(0, 0, 50, 28, 14)
      .fill({ color: state.on ? C.accent : C.deep, alpha: state.on ? 0.9 : 1 })
      .stroke({ width: 1, color: state.on ? C.accent : 0xffffff, alpha: state.on ? 1 : 0.15 });
    knob.clear().circle(0, 0, 10).fill(state.on ? 0x2a1e17 : C.dim);
    knob.y = 14;
    const x = state.on ? 36 : 14;
    if (animate) tween(knob, { x }, 140); else knob.x = x;
  };
  paint(false);
  c.set = (v) => { state.on = v; paint(true); };
  c.on('pointertap', () => {
    if (dragged) return;
    state.on = !state.on;
    paint(true);
    onChange?.(state.on);
  });
  return c;
}

// ---------- Área rolável: arrasto com o dedo/mouse, inércia, roda do mouse, máscara e barra ----------
const scrolls = new Set();

export function createScroll(width) {
  const root = new Container();
  const content = new Container();
  const maskG = new Graphics();
  const bar = new Graphics();
  root.addChild(content, maskG, bar);
  content.mask = maskG;
  root.eventMode = 'static';

  const s = { root, content, width, viewH: 300, scrollY: 0, contentH: 0, items: [], vel: 0 };

  s.add = (c, h) => {
    content.addChild(c);
    s.items.push({ c, h });
    return c;
  };

  s.clear = () => {
    for (const it of s.items) it.c.destroy({ children: true });
    s.items = [];
    s.scrollY = 0;
    s.relayout();
  };

  s.relayout = () => {
    let y = 0;
    for (const it of s.items) {
      if (!it.c.visible) continue;
      it.c.y = y;
      y += it.h + 8;
    }
    s.contentH = Math.max(0, y - 8);
    s.scrollBy(0);
  };

  s.scrollBy = (dy) => {
    const max = Math.max(0, s.contentH - s.viewH);
    s.scrollY = Math.min(max, Math.max(0, s.scrollY + dy));
    content.y = -s.scrollY;
    bar.clear();
    if (max > 0) {
      const thumbH = Math.max(30, (s.viewH * s.viewH) / s.contentH);
      const thumbY = (s.scrollY / max) * (s.viewH - thumbH);
      bar.roundRect(s.width + 2, thumbY, 3, thumbH, 1.5).fill({ color: 0xffffff, alpha: 0.2 });
    }
  };

  s.resize = (viewH, w = s.width) => {
    s.viewH = viewH;
    s.width = w;
    maskG.clear().rect(-6, -6, w + 14, viewH + 12).fill(0xffffff);
    root.hitArea = new Rectangle(-6, -6, w + 14, viewH + 12);
    s.relayout();
  };

  // arrasto
  let down = null;
  root.on('pointerdown', (e) => {
    down = { y: e.global.y, last: e.global.y, t: performance.now(), moved: false };
    s.vel = 0;
    dragged = false;
  });
  root.on('globalpointermove', (e) => {
    if (!down) return;
    const dy = down.last - e.global.y;
    if (!down.moved && Math.abs(e.global.y - down.y) > 8) { down.moved = true; dragged = true; }
    if (down.moved) {
      s.scrollBy(dy);
      const now = performance.now();
      const dt = Math.max(1, now - down.t);
      s.vel = s.vel * 0.6 + (dy / dt) * 0.4;
      down.t = now;
    }
    down.last = e.global.y;
  });
  const end = () => {
    if (!down) return;
    if (!down.moved) s.vel = 0;
    down = null;
    setTimeout(() => { dragged = false; }, 0);   // o "toque" do Pixi chega logo depois do soltar
  };
  root.on('pointerup', end);
  root.on('pointerupoutside', end);
  root.on('wheel', (e) => { s.scrollBy(e.deltaY); s.vel = 0; });

  // inércia
  s.update = (dt) => {
    if (down || Math.abs(s.vel) < 0.01) return;
    s.scrollBy(s.vel * dt);
    s.vel *= 0.94 ** (dt / 16);
  };
  scrolls.add(s);
  const destroy = root.destroy.bind(root);
  root.destroy = (o) => { scrolls.delete(s); destroy(o); };

  // entrada em cascata: cada item aparece e desliza um pouco depois do anterior
  s.playIn = (dir = 1) => {
    let i = 0;
    for (const it of s.items) {
      if (!it.c.visible) continue;
      if (i > 10) { it.c.alpha = 1; it.c.x = 0; continue; }
      it.c.alpha = 0;
      it.c.x = 18 * dir;
      tween(it.c, { alpha: 1, x: 0 }, 340, { delay: 30 + i * 35 });
      i++;
    }
  };

  return s;
}

// chamar uma vez por quadro (inércia das listas)
export function updateScrolls(dt) {
  for (const s of scrolls) s.update(dt);
}
