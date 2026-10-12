// Balão do tutorial: texto curto, botão (quando o passo pede) e "Pular". Nunca bloqueia o jogo.
import { Container, Graphics } from 'pixi.js';
import { C, txt, para, drawCard, labelButton } from './ui.js';
import { tween } from './anim.js';
import { TUTORIAL } from '../data/tutorial.js';
import { TABS } from './tabbar.js';
import { sfx } from '../audio/sfx.js';

export function createTutorial({ game, tabbar, onFinish }) {
  const root = new Container();
  root.visible = false;
  const state = game.state.tutorial;
  let L = null;
  let tela = null;          // última aba mostrada na tela (para não pedir uma aba em que já estamos)
  const refs = {};

  const passo = () => (state.feito ? null : TUTORIAL[state.passo] ?? null);

  function avancar() {
    state.passo += 1;
    if (state.passo >= TUTORIAL.length) { state.feito = true; onFinish?.(); }
    sfx.tap();
    desenhar();
  }

  function pular() {
    state.feito = true;
    onFinish?.();
    desenhar();
  }

  function reiniciar() {
    state.passo = 0;
    state.feito = false;
    desenhar();
  }

  function desenhar() {
    root.removeChildren().forEach((c) => c.destroy({ children: true }));
    tabbar && TABS.forEach((_, i) => tabbar.setBadge(i, false));
    for (const k of Object.keys(refs)) delete refs[k];
    const p = passo();
    root.visible = !!p && !!L;
    if (!p || !L) return;

    const aba = TABS.findIndex((t) => t.id === p.aba);
    if (tabbar && aba >= 0 && TABS[aba].id !== tela) tabbar.setBadge(aba, true);

    const landscape = L.mode === 'landscape';
    const w = landscape ? Math.min(L.content.w * 0.46, 360) : Math.min(L.content.w, 560);
    const c = new Container();
    const bg = new Graphics();
    const num = txt(`Dica ${state.passo + 1}/${TUTORIAL.length}`, C.accent, 11, true);
    num.position.set(14, 10);
    const t = para(p.texto, C.text, 13, w - 28);
    t.position.set(14, num.y + num.height + 3);
    c.addChild(bg, num, t);
    let y = t.y + t.height + 10;

    const pularB = labelButton('Pular tutorial', p.botao ? 110 : w - 28, 32, { tint: C.dim, size: 11 });
    pularB.position.set(14, y);
    pularB.tap(pular);
    refs.pular = { c: pularB, w: pularB.btn.w, h: 32 };
    c.addChild(pularB);
    if (p.botao) {
      const ok = labelButton(p.botao, w - 28 - 110 - 8, 32, { tint: C.good, size: 12 });
      ok.position.set(14 + 110 + 8, y);
      ok.tap(avancar);
      refs.ok = { c: ok, w: ok.btn.w, h: 32 };
      c.addChild(ok);
    }
    y += 32 + 12;
    drawCard(bg, w, y, { fill: C.cardHi, border: C.accent, borderAlpha: 0.7, accent: C.accent });
    const x = landscape ? L.content.x : L.content.x + (L.content.w - w) / 2;
    const yy = landscape ? L.content.y + L.content.h - y : (L.tabs.rect.y - y - 8);
    c.position.set(x, yy);
    root.addChild(c);
    c.alpha = 0;
    tween(c, { alpha: 1 }, 220);
  }

  // avança sozinho quando o jogador faz o que o passo pede
  const eventos = new Set(TUTORIAL.flatMap((p) => p.espera ?? []));
  for (const ev of eventos) {
    game.on(ev, () => {
      const p = passo();
      if (p?.espera?.includes(ev)) avancar();
    });
  }

  const global = (ref) => (ref ? ref.c.toGlobal({ x: ref.w / 2, y: ref.h / 2 }) : null);

  return {
    root,
    layout(layout) { L = layout; desenhar(); },
    // a aba da tela mudou: o aviso some se já estamos na aba pedida
    abaAtual(id) { tela = id; desenhar(); },
    pular, reiniciar,
    ativo: () => !!passo(),
    hooks: {
      passo: () => (state.feito ? -1 : state.passo),
      visivel: () => root.visible,
      centro: (nome) => global(refs[nome]),
      avancar,
    },
  };
}
