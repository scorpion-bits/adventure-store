// Tela Aventureiros: Hoje (retenção, M8), Coleção (M9) e Lendários (histórias em capítulos).
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, createScroll, labelButton, wasDragged } from './ui.js';
import { portraitSprite } from '../assets.js';
import { progressoLenda, capituloAtual, lendaConcluida, nivelNecessario, qualidadeMinima } from '../core/legends.js';
import { conteudoCapitulo } from './lendas.js';
import { sfx } from '../audio/sfx.js';

const SUBS = [
  { id: 'hoje', nome: 'Hoje' },
  { id: 'colecao', nome: 'Coleção' },
  { id: 'lendarios', nome: 'Lendários' },
];

export function createAventureirosScreen({ game, modal }) {
  const root = new Container();
  const scroll = createScroll(300);
  root.addChild(scroll.root);

  let R = { x: 0, y: 0, w: 360, h: 600 };
  let sub = 'lendarios';
  let dirty = true;
  let quadros = 0;
  const refs = {};
  const marcar = () => { dirty = true; };
  for (const ev of ['lenda', 'rep', 'chegou']) game.on(ev, marcar);
  const reg = (nome, c, w, h) => { refs[nome] = { c, w, h }; };

  function barraSub(w) {
    const c = new Container();
    const gap = 6;
    const cw = (w - gap * (SUBS.length - 1)) / SUBS.length;
    SUBS.forEach((s, i) => {
      const b = new Container();
      const bg = new Graphics();
      const on = s.id === sub;
      bg.roundRect(0, 0, cw, 38, 12).fill({ color: on ? C.accent : C.card, alpha: on ? 0.22 : 1 }).stroke({ width: 1, color: on ? C.accent : 0xffffff, alpha: on ? 0.8 : 0.1 });
      const t = txt(s.nome, on ? C.text : C.dim, 12, true);
      t.position.set((cw - t.width) / 2, (38 - t.height) / 2);
      b.addChild(bg, t);
      b.position.set(i * (cw + gap), 0);
      b.eventMode = 'static';
      b.cursor = 'pointer';
      b.hitArea = new Rectangle(0, 0, cw, 38);
      b.on('pointertap', () => { if (!wasDragged() && sub !== s.id) { sub = s.id; sfx.tap(); marcar(); } });
      reg(`sub:${s.id}`, b, cw, 38);
      c.addChild(b);
    });
    return { c, h: 38 };
  }

  function cartaEmBreve(w, titulo, texto, etapa) {
    const c = new Container();
    const bg = new Graphics();
    const t = txt(titulo, C.text, 17, true);
    t.position.set(14, 12);
    const p = para(texto, C.dim, 13, w - 28);
    p.position.set(14, t.y + t.height + 4);
    const e = txt(`chega na etapa ${etapa}`, C.accent, 12, true);
    e.position.set(14, p.y + p.height + 8);
    const h = e.y + e.height + 14;
    drawCard(bg, w, h, { fill: C.card, accent: C.faint });
    c.addChild(bg, t, p, e);
    return { c, h };
  }

  function lerCapitulo(def, i) {
    modal.open({
      title: def.titulo,
      build: (sc, w) => { conteudoCapitulo(sc, w, { def, capitulo: def.capitulos[i], indice: i, fechar: () => modal.close(true) }); },
    });
  }

  function cartaoLenda(w, def) {
    const adv = game.data.aventureiros[def.id];
    const prog = progressoLenda(game, def.id);
    const concluida = lendaConcluida(game, def.id);
    const necessario = nivelNecessario(game, def.id);
    const bloqueada = !concluida && game.nivel() < necessario;
    const c = new Container();
    const bg = new Graphics();
    const retrato = portraitSprite(def.id, 56);
    retrato.position.set(12, 12);
    if (bloqueada) retrato.alpha = 0.4;
    const nome = txt(bloqueada ? '???' : adv.nome, bloqueada ? C.dim : C.text, 16, true);
    nome.position.set(80, 12);
    const titulo = txt(def.titulo, bloqueada ? C.faint : C.gold, 12, true);
    titulo.position.set(80, 12 + nome.height + 1);
    c.addChild(bg, retrato, nome, titulo);
    let y = Math.max(12 + 56 + 8, titulo.y + titulo.height + 6);

    const resumo = para(bloqueada ? 'Uma lenda que ainda não chegou à sua loja.' : def.resumo, C.dim, 12, w - 28);
    resumo.position.set(14, y);
    c.addChild(resumo);
    y += resumo.height + 8;

    // pontinhos de capítulos
    const pips = new Graphics();
    def.capitulos.forEach((_, i) => pips.circle(i * 16, 0, 5).fill(i < prog.cap ? C.gold : 0x000000).stroke({ width: 1, color: C.gold, alpha: i < prog.cap ? 1 : 0.4 }));
    pips.position.set(19, y + 6);
    c.addChild(pips);
    const cont = txt(`${Math.min(prog.cap, def.capitulos.length)}/${def.capitulos.length} capítulos`, C.dim, 11);
    cont.position.set(19 + def.capitulos.length * 16 + 4, y);
    c.addChild(cont);
    y += 20;

    if (bloqueada) {
      const t = txt(`Aparece com reputação ${necessario}`, C.warn, 12, true);
      t.position.set(14, y);
      c.addChild(t);
      y += t.height + 12;
    } else if (concluida) {
      const t = txt('✦ Lenda completa', C.gold, 13, true);
      t.position.set(14, y);
      c.addChild(t);
      y += t.height + 8;
    } else {
      const cap = capituloAtual(game, def.id);
      const item = game.data.itens[cap.pedido.item];
      const min = qualidadeMinima(cap);
      const t = para(`Próximo pedido: ${item.nome}${min > 0 ? ` (${game.data.meta.qualidades[min].nome} ou melhor)` : ''}`, C.accent, 13, w - 28, { bold: true });
      t.position.set(14, y);
      c.addChild(t);
      y += t.height + 2;
      const dica = para('Ela aparece de vez em quando. Deixe o item pronto nas prateleiras!', C.faint, 11, w - 28);
      dica.position.set(14, y);
      c.addChild(dica);
      y += dica.height + 8;
    }

    // capítulos já lidos
    for (let i = 0; i < Math.min(prog.cap, def.capitulos.length); i++) {
      const b = labelButton(`Reler: ${def.capitulos[i].titulo}`, w - 28, 34, { tint: C.dim, size: 12 });
      b.position.set(14, y);
      b.tap(() => lerCapitulo(def, i));
      c.addChild(b);
      reg(`ler:${def.id}:${i}`, b, w - 28, 34);
      y += 40;
    }
    drawCard(bg, w, y + 6, { fill: concluida ? C.cardHi : C.card, fillAlpha: bloqueada ? 0.6 : 1, accent: concluida ? C.gold : bloqueada ? null : C.accent });
    return { c, h: y + 6 };
  }

  function render() {
    dirty = false;
    quadros = 0;
    for (const k of Object.keys(refs)) delete refs[k];
    const keepY = scroll.scrollY;
    scroll.clear();
    const w = R.w;
    const add = (it) => scroll.add(it.c, it.h);
    add(barraSub(w));
    if (sub === 'lendarios') {
      const concl = game.data.listas.lendarios.filter((l) => lendaConcluida(game, l.id)).length;
      const cab = txt(`Lendas completas: ${concl}/${game.data.listas.lendarios.length}`, C.dim, 12, true);
      scroll.add(cab, cab.height);
      const ordem = [...game.data.listas.lendarios].sort((a, b) => nivelNecessario(game, a.id) - nivelNecessario(game, b.id));
      for (const def of ordem) add(cartaoLenda(w, def));
    } else if (sub === 'hoje') {
      add(cartaEmBreve(w, 'Hoje', 'O aventureiro especial do dia, as encomendas diárias, a sequência de dias e o baú semanal.', 'M8'));
    } else {
      add(cartaEmBreve(w, 'Coleção', 'A enciclopédia de itens e de aventureiros que você já descobriu.', 'M9'));
    }
    scroll.resize(R.h, w);
    scroll.scrollBy(keepY);
  }

  const global = (ref) => (ref ? ref.c.toGlobal({ x: ref.w / 2, y: ref.h / 2 }) : null);

  return {
    root,
    scroll,
    resize(rect) { R = rect; root.position.set(rect.x, rect.y); render(); },
    show() { marcar(); },
    update() { if (!root.visible) return; if (dirty) render(); else quadros += 1; },
    hooks: {
      pronta: () => !dirty && quadros >= 2,
      sub: () => sub,
      centro: (nome) => global(refs[nome]),
      ver: (nome) => {
        const p = global(refs[nome]);
        if (!p) return false;
        const topo = scroll.root.getGlobalPosition().y;
        if (p.y < topo + 30 || p.y > topo + R.h - 30) scroll.scrollBy(p.y - (topo + R.h / 2));
        return true;
      },
    },
  };
}
