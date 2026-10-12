// Tutorial guiado: um balão com o texto do passo (e botão, quando o passo pede), mudança de aba automática e um anel
// pulsante em volta do botão a tocar. Nunca bloqueia o jogo: dá para tocar em qualquer lugar ou pular.
import { Container, Graphics } from 'pixi.js';
import { C, txt, para, drawCard, labelButton } from './ui.js';
import { tween } from './anim.js';
import { settings } from '../settings.js';
import { TUTORIAL } from '../data/tutorial.js';
import { faltando, adiantarProducao } from '../core/craft.js';
import { TABS } from './tabbar.js';
import { sfx } from '../audio/sfx.js';

const ATRASO_NAVEGAR = 650;          // ms entre o passo aparecer e a tela mudar sozinha (dá tempo de ler o fim do passo anterior)
const ATRASO_ACELERAR = 2500;        // ms até o tutorial acelerar a produção do primeiro item

export function createTutorial({ game, tabbar, onFinish, irParaAba, telas }) {
  const root = new Container();
  root.visible = false;
  const halo = new Graphics();           // anel que destaca o botão a tocar
  const cartao = new Container();        // o balão
  root.addChild(halo, cartao);
  const state = game.state.tutorial;
  let L = null;
  let tela = null;          // última aba mostrada na tela (para não pedir uma aba em que já estamos)
  let relogio = 0;
  let passoNavegado = -1;   // passo cuja mudança de aba já foi feita
  let passoAcelerado = -1;  // passo em que a aceleração já foi agendada
  let vistoAlvo = '';       // alvo que já foi rolado para a tela neste passo
  const timers = new Set();
  const refs = {};

  const passo = () => (state.feito ? null : TUTORIAL[state.passo] ?? null);
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const limparTimers = () => { for (const t of timers) clearTimeout(t); timers.clear(); };

  function avancar() {
    limparTimers();
    state.passo += 1;
    if (state.passo >= TUTORIAL.length) { state.feito = true; onFinish?.(); }
    sfx.tap();
    desenhar();
  }

  function pular() {
    limparTimers();
    state.feito = true;
    onFinish?.();
    desenhar();
  }

  function reiniciar() {
    limparTimers();
    state.passo = 0;
    state.feito = false;
    passoNavegado = -1;
    desenhar();
  }

  // a receita guiada já tem todos os materiais? (então o passo de compra já está cumprido)
  const compraFeita = (p) => !p.compra || Object.keys(faltando(game, game.data.receitas[p.compra])).length === 0;

  // ---------- alvo do anel ----------
  function nomeDoAlvo(p, hooks) {
    if (!p.alvo || !hooks?.nomes) return null;
    const nomes = hooks.nomes();
    if (typeof p.alvo === 'string') return nomes.find((n) => n === p.alvo) ?? nomes.find((n) => n.startsWith(p.alvo)) ?? null;
    if (p.alvo.material && p.compra) {
      const falta = Object.keys(faltando(game, game.data.receitas[p.compra]))[0];
      return falta ? nomes.find((n) => n.includes(`:${falta}:x1`)) ?? null : null;
    }
    return null;
  }

  function atualizarHalo(dt) {
    const p = passo();
    halo.clear();
    if (!p || !L || !p.alvo || !root.visible) return;
    const hooks = telas()[tela];
    if (!hooks || tela !== p.aba) return;
    if (p.sub && hooks.sub && hooks.sub() !== p.sub) return;
    const nome = nomeDoAlvo(p, hooks);
    if (!nome) return;
    const r = hooks.retangulo?.(nome);
    if (!r) return;
    // fora da área visível: rola uma vez até o botão (depois o jogador pode rolar à vontade)
    // (e também não pode ficar escondido atrás do próprio balão)
    const balao = cartao.children[0] ? { x: cartao.children[0].x, y: cartao.children[0].y, w: cartao.children[0].width, h: cartao.children[0].height } : null;
    const coberto = balao && r.x < balao.x + balao.w && r.x + r.w > balao.x && r.y < balao.y + balao.h + 6 && r.y + r.h > balao.y - 6;
    const dentro = !coberto && r.y >= L.content.y - 4 && r.y + r.h <= L.content.y + L.content.h + 4 && r.x >= -4 && r.x + r.w <= L.w + 4;
    const chave = `${state.passo}:${nome}`;
    if (!dentro && vistoAlvo !== chave) { vistoAlvo = chave; hooks.ver?.(nome); return; }
    if (!dentro) return;
    relogio += dt;
    const pulso = settings.motion ? (Math.sin(relogio / 260) + 1) / 2 : 0.5;
    const grow = 3 + pulso * 4;
    halo.roundRect(r.x - grow, r.y - grow, r.w + grow * 2, r.h + grow * 2, 14)
      .stroke({ width: 3, color: C.gold, alpha: 0.55 + pulso * 0.45 });
    halo.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 12).fill({ color: C.gold, alpha: 0.05 + pulso * 0.07 });
  }

  // ---------- balão ----------
  function desenhar() {
    cartao.removeChildren().forEach((c) => c.destroy({ children: true }));
    tabbar && TABS.forEach((_, i) => tabbar.setBadge(i, false, 'tutorial'));
    for (const k of Object.keys(refs)) delete refs[k];
    halo.clear();
    const p = passo();
    root.visible = !!p && !!L;
    if (!p || !L) return;

    // passo de compra já cumprido (jogo antigo, ou a receita já tem material): pula sem pedir nada
    if (p.compra && compraFeita(p)) { later(avancar, 0); return; }

    const aba = TABS.findIndex((t) => t.id === p.aba);
    if (tabbar && aba >= 0 && TABS[aba].id !== tela) tabbar.setBadge(aba, true, 'tutorial');

    // muda de tela sozinho quando o passo começa (uma vez por passo)
    if (passoNavegado !== state.passo) {
      passoNavegado = state.passo;
      if (aba >= 0 && TABS[aba].id !== tela && irParaAba) later(() => { if (passo() === p) irParaAba(aba); }, ATRASO_NAVEGAR);
      if (p.sub) later(() => { if (passo() === p) telas()[p.aba]?.irParaSub?.(p.sub); }, ATRASO_NAVEGAR + 60);
    }
    if (p.acelerar && passoAcelerado !== state.passo) { passoAcelerado = state.passo; later(() => { if (passo() === p) adiantarProducao(game, 3600); }, ATRASO_ACELERAR); }

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
    cartao.addChild(c);
    c.alpha = 0;
    tween(c, { alpha: 1 }, 220);
  }

  // avança sozinho quando o jogador faz o que o passo pede
  const eventos = new Set(TUTORIAL.flatMap((p) => p.espera ?? []));
  for (const ev of eventos) {
    game.on(ev, () => {
      const p = passo();
      if (!p?.espera?.includes(ev)) return;
      if (!compraFeita(p)) return;       // falta comprar mais um material: continua no passo (o anel vai para o próximo)
      avancar();
    });
  }

  const global = (ref) => (ref ? ref.c.toGlobal({ x: ref.w / 2, y: ref.h / 2 }) : null);

  return {
    root,
    layout(layout) { L = layout; desenhar(); },
    // a aba da tela mudou: o aviso some se já estamos na aba pedida
    abaAtual(id) { tela = id; desenhar(); },
    update(dt = 16) { atualizarHalo(dt); },
    pular, reiniciar,
    ativo: () => !!passo(),
    hooks: {
      passo: () => (state.feito ? -1 : state.passo),
      id: () => passo()?.id ?? null,
      visivel: () => root.visible,
      centro: (nome) => global(refs[nome]),
      alvo: () => {
        const p = passo();
        const hooks = p && telas()[tela];
        return p && hooks ? nomeDoAlvo(p, hooks) : null;
      },
      avancar,
    },
  };
}
