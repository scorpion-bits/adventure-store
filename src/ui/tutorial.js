// Tutorial guiado: um balão com o texto do passo (e botão, quando o passo pede), mudança de sub-aba automática e um anel
// pulsante em volta do botão a tocar. Nunca bloqueia o jogo: dá para tocar em qualquer lugar ou pular.
// Há uma sequência inicial (a Loja) e uma por aba, que começa na primeira visita (veja data/tutorial.js).
import { Container, Graphics } from 'pixi.js';
import { C, txt, para, drawCard, labelButton } from './ui.js';
import { tween } from './anim.js';
import { settings } from '../settings.js';
import { SEQUENCIAS, ABAS_COM_TUTORIAL } from '../data/tutorial.js';
import { adiantarProducao } from '../core/craft.js';
import { TABS } from './tabbar.js';
import { sfx } from '../audio/sfx.js';

const ATRASO_SUB = 450;              // ms entre o passo aparecer e a sub-aba mudar sozinha
const ATRASO_ABRIR = 500;            // ms entre entrar numa aba pela primeira vez e o tutorial dela começar
const ATRASO_ACELERAR = 2500;        // ms até o tutorial acelerar a produção do primeiro item

export function createTutorial({ game, tabbar, onFinish, telas }) {
  const root = new Container();
  root.visible = false;
  const halo = new Graphics();           // anel que destaca o botão a tocar
  const cartao = new Container();        // o balão
  root.addChild(halo, cartao);
  const state = game.state.tutorial;
  let L = null;
  let tela = null;          // aba mostrada agora
  let relogio = 0;
  let passoFeito = '';      // passo cujos efeitos de entrada (sub-aba, presente, aceleração) já foram feitos
  let vistoAlvo = '';       // alvo que já foi rolado para a tela neste passo
  const timers = new Set();
  const refs = {};

  // qual sequência está ativa: a inicial até ser concluída; depois, a da aba em andamento
  const seqAtiva = () => (!state.feito ? 'inicio' : state.seq || null);
  const passo = () => { const s = seqAtiva(); return s ? SEQUENCIAS[s]?.[state.passo] ?? null : null; };
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const limparTimers = () => { for (const t of timers) clearTimeout(t); timers.clear(); };
  const naoVistas = () => ABAS_COM_TUTORIAL.filter((a) => !state.abas[a]);

  function terminarSequencia() {
    const s = seqAtiva();
    if (s === 'inicio') state.feito = true;
    else if (s) state.abas[s] = true;
    state.seq = '';
    state.passo = 0;
    onFinish?.();
    // acabou a sequência inicial: se o jogador já está numa aba com tutorial, ele começa
    if (s === 'inicio' && tela) later(() => abrirAba(tela), ATRASO_ABRIR);
  }

  function avancar() {
    limparTimers();
    state.passo += 1;
    if (state.passo >= SEQUENCIAS[seqAtiva()].length) terminarSequencia();
    sfx.tap();
    desenhar();
  }

  // "Pular tutorial" encerra tudo: a sequência inicial e as das abas
  function pular() {
    limparTimers();
    state.feito = true;
    state.seq = '';
    state.passo = 0;
    for (const a of ABAS_COM_TUTORIAL) state.abas[a] = true;
    onFinish?.();
    desenhar();
  }

  function reiniciar() {
    limparTimers();
    state.passo = 0;
    state.feito = false;
    state.seq = '';
    state.abas = {};
    passoFeito = '';
    desenhar();
  }

  // começa a sequência de uma aba na primeira visita (depois da sequência inicial)
  function abrirAba(id) {
    if (!state.feito || state.abas[id] || !SEQUENCIAS[id] || id === 'inicio') return;
    if (state.seq === id) return;
    state.seq = id;
    state.passo = 0;
    passoFeito = '';
    desenhar();
  }

  // ---------- alvo do anel ----------
  function nomeDoAlvo(p, hooks) {
    if (!p.alvo || !hooks?.nomes) return null;
    const nomes = hooks.nomes();
    if (typeof p.alvo === 'string') return nomes.find((n) => n === p.alvo) ?? nomes.find((n) => n.startsWith(p.alvo)) ?? null;
    if (p.alvo.termina) return nomes.find((n) => n.endsWith(p.alvo.termina)) ?? null;
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
    // fora da área visível (ou escondido atrás do balão): rola uma vez até o botão; depois o jogador rola à vontade
    const balao = cartao.children[0] ? { x: cartao.children[0].x, y: cartao.children[0].y, w: cartao.children[0].width, h: cartao.children[0].height } : null;
    const coberto = balao && r.x < balao.x + balao.w && r.x + r.w > balao.x && r.y < balao.y + balao.h + 6 && r.y + r.h > balao.y - 6;
    const dentro = !coberto && r.y >= L.content.y - 4 && r.y + r.h <= L.content.y + L.content.h + 4 && r.x >= -4 && r.x + r.w <= L.w + 4;
    const chave = `${seqAtiva()}:${state.passo}:${nome}`;
    if (!dentro && vistoAlvo !== chave) { vistoAlvo = chave; hooks.ver?.(nome); return; }
    if (!dentro) return;
    relogio += dt;
    const pulso = settings.motion ? (Math.sin(relogio / 260) + 1) / 2 : 0.5;
    const grow = 3 + pulso * 4;
    halo.roundRect(r.x - grow, r.y - grow, r.w + grow * 2, r.h + grow * 2, 14)
      .stroke({ width: 3, color: C.gold, alpha: 0.55 + pulso * 0.45 });
    halo.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 12).fill({ color: C.gold, alpha: 0.05 + pulso * 0.07 });
  }

  // ---------- avisos nas abas e balão ----------
  function pintarAvisos(p) {
    if (!tabbar) return;
    TABS.forEach((t, i) => {
      const naoVista = state.feito && !state.abas[t.id] && !!SEQUENCIAS[t.id] && t.id !== 'inicio';
      const pedida = !!p && p.aba === t.id && t.id !== tela;
      tabbar.setBadge(i, (naoVista && t.id !== tela) || pedida, 'tutorial');
    });
  }

  function desenhar() {
    cartao.removeChildren().forEach((c) => c.destroy({ children: true }));
    for (const k of Object.keys(refs)) delete refs[k];
    halo.clear();
    const p = passo();
    pintarAvisos(p);
    // o tutorial de uma aba só aparece nela (se o jogador sai, ele espera a volta)
    root.visible = !!p && !!L && (seqAtiva() === 'inicio' || tela === p.aba);
    if (!root.visible) return;

    // efeitos de entrada do passo (uma vez): sub-aba, materiais de presente, aceleração
    const marca = `${seqAtiva()}:${state.passo}`;
    if (passoFeito !== marca) {
      passoFeito = marca;
      if (p.presente) darMateriais(p.presente);
      if (p.sub) later(() => { if (passo() === p) telas()[p.aba]?.irParaSub?.(p.sub); }, ATRASO_SUB);
      if (p.acelerar) later(() => { if (passo() === p) adiantarProducao(game, 3600); }, ATRASO_ACELERAR);
    }

    const landscape = L.mode === 'landscape';
    const w = landscape ? Math.min(L.content.w * 0.46, 360) : Math.min(L.content.w, 560);
    const c = new Container();
    const bg = new Graphics();
    const lista = SEQUENCIAS[seqAtiva()];
    const num = txt(`Dica ${state.passo + 1}/${lista.length}`, C.accent, 11, true);
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

  // completa os materiais de uma receita (o presente do tutorial), só o que faltar
  function darMateriais(receitaId) {
    const r = game.data.receitas[receitaId];
    if (!r) return;
    for (const [m, q] of Object.entries(r.materiais)) {
      const tem = game.state.materiais[m] ?? 0;
      if (tem < q) game.state.materiais[m] = q;
    }
    game.emit('materiais', game.state.materiais);
  }

  // avança sozinho quando o jogador faz o que o passo pede
  const eventos = new Set(Object.values(SEQUENCIAS).flat().flatMap((p) => p.espera ?? []));
  for (const ev of eventos) {
    game.on(ev, () => {
      const p = passo();
      if (p?.espera?.includes(ev) && root.visible) avancar();
    });
  }

  const global = (ref) => (ref ? ref.c.toGlobal({ x: ref.w / 2, y: ref.h / 2 }) : null);

  return {
    root,
    layout(layout) { L = layout; desenhar(); },
    // a aba da tela mudou: abre o tutorial dela, se for a primeira vez
    abaAtual(id) {
      tela = id;
      desenhar();
      if (state.feito && !state.abas[id] && SEQUENCIAS[id] && id !== 'inicio') later(() => { if (tela === id) abrirAba(id); }, ATRASO_ABRIR);
    },
    update(dt = 16) { atualizarHalo(dt); },
    pular, reiniciar,
    ativo: () => !!passo(),
    hooks: {
      passo: () => (passo() ? state.passo : -1),
      sequencia: () => seqAtiva(),
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
