// Tela da Oficina: escolha do ofício, fila de produção com barras de progresso em tempo real, receitas e coleta.
// A lógica está em core/craft.js; aqui só desenho e toques.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, createScroll, labelButton, wasDragged } from './ui.js';
import { drawIcon } from './icons.js';
import { iconSprite } from '../assets.js';
import {
  produzir, podeProduzir, coletar, desbloquearOficio, oficioAberto, nivelOficio, progressoOficio, xpParaNivel,
  slotsDe, filaMaxDe, emProducao, naFila, chancesQualidade, duracaoDe, faltando, totalProntos,
} from '../core/craft.js';
import { fmt, fmtTime } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const MOTIVOS = {
  materiais: 'Faltam materiais',
  'fila-cheia': 'A fila deste ofício está cheia',
  nivel: 'Nível do ofício insuficiente',
  'oficio-fechado': 'Ofício fechado',
};

export function createOficinaScreen({ game, toast }) {
  const root = new Container();
  const scroll = createScroll(300);
  root.addChild(scroll.root);

  let R = { x: 0, y: 0, w: 360, h: 600 };
  let sel = 'ferraria';
  let dirty = true;
  let quadros = 0;
  let barras = [];            // barras de progresso atualizadas a cada quadro: { g, w, job }
  let tempos = [];            // textos de tempo restante: { t, job }
  let relogio = 0;
  const refs = {};
  const marcar = () => { dirty = true; };

  for (const ev of ['producao', 'materiais', 'ouro', 'rep', 'oficio', 'estoque']) game.on(ev, marcar);
  game.on('pronto', ({ receita }) => {
    sfx.ready();
    toast(`Pronto: ${game.data.itens[receita.item]?.nome ?? receita.item}`, C.good);
  });
  game.on('nivelOficio', ({ id, nivel }) => {
    sfx.levelUp();
    toast(`${game.data.meta.oficios.find((o) => o.id === id).nome} chegou ao nível ${nivel}!`, C.rep);
  });
  game.on('coletou', (itens) => {
    const n = itens.reduce((a, i) => a + i.qtd, 0);
    sfx.buy();
    toast(`${n} ${n === 1 ? 'item foi' : 'itens foram'} para as prateleiras`, C.good);
  });

  const reg = (nome, c, w, h) => { refs[nome] = { c, w, h }; };

  // ---------- peças ----------
  function cartaoProntos(w) {
    const c = new Container();
    const bg = new Graphics();
    const t = txt('Prontos para coletar', C.text, 15, true);
    t.position.set(14, 12);
    c.addChild(bg, t);
    let y = 12 + t.height + 8;
    const itens = [];
    for (const p of game.state.prontos) {
      const rec = game.data.receitas[p.receita];
      for (const [q, n] of Object.entries(p.resultado)) itens.push({ id: rec.item, q: Number(q), n });
    }
    const cell = 46;
    const per = Math.max(1, Math.floor((w - 20) / cell));
    const mostrar = itens.slice(0, per * 2);
    mostrar.forEach((it, i) => {
      const x = 12 + (i % per) * cell;
      const yy = y + Math.floor(i / per) * (cell + 2);
      const ic = iconSprite('item', it.id, 34);
      ic.position.set(x, yy);
      const n = txt(`×${it.n}`, C.text, 11, true);
      n.position.set(x + 34 - n.width + 4, yy + 26);
      const nb = new Graphics().roundRect(n.x - 2, n.y, n.width + 4, n.height, 3).fill({ color: 0x000000, alpha: 0.6 });
      c.addChild(ic, nb, n);
    });
    y += Math.ceil(mostrar.length / per) * (cell + 2) + 4;
    const b = labelButton(`Coletar tudo (${totalProntos(game)})`, w - 28, 42, { tint: C.good, size: 14 });
    b.position.set(14, y);
    b.tap(() => coletar(game));
    reg('coletarTudo', b, w - 28, 42);
    c.addChild(b);
    const h = y + 42 + 12;
    drawCard(bg, w, h, { fill: C.cardHi, accent: C.good });
    return { c, h };
  }

  function gradeOficios(w) {
    const out = new Container();
    const lista = game.data.meta.oficios;
    const gap = 6;
    const cols = w >= 560 ? 8 : 4;
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = 46;
    lista.forEach((o, i) => {
      const b = new Container();
      const bg = new Graphics();
      const aberto = oficioAberto(game, o.id);
      const on = o.id === sel;
      bg.roundRect(0, 0, cw, ch, 12)
        .fill({ color: on ? C.accent : C.card, alpha: on ? 0.22 : aberto ? 1 : 0.6 })
        .stroke({ width: 1, color: on ? C.accent : 0xffffff, alpha: on ? 0.8 : 0.1 });
      const t = txt(o.nome, aberto ? (on ? C.text : C.dim) : C.faint, cw < 90 ? 11 : 12, true);
      t.position.set((cw - t.width) / 2, aberto ? 8 : 6);
      b.addChild(bg, t);
      if (!aberto) {
        const lock = new Graphics();
        drawIcon(lock, 'cadeado', 16, C.faint);
        lock.position.set(cw / 2, ch - 13);
        b.addChild(lock);
      } else {
        const n = emProducao(game, o.id).length + naFila(game, o.id).length;
        const sub = txt(`nível ${nivelOficio(game, o.id)}${n ? ` · ${n}▸` : ''}`, n ? C.accent : C.faint, 10);
        sub.position.set((cw - sub.width) / 2, ch - 6 - sub.height);
        b.addChild(sub);
      }
      b.position.set((i % cols) * (cw + gap), Math.floor(i / cols) * (ch + gap));
      b.eventMode = 'static';
      b.cursor = 'pointer';
      b.hitArea = new Rectangle(0, 0, cw, ch);
      b.on('pointertap', () => { if (!wasDragged() && sel !== o.id) { sel = o.id; sfx.tap(); marcar(); } });
      reg(`oficio:${o.id}`, b, cw, ch);
      out.addChild(b);
    });
    const linhas = Math.ceil(lista.length / cols);
    return { c: out, h: linhas * ch + (linhas - 1) * gap };
  }

  function painelFechado(w, def) {
    const c = new Container();
    const bg = new Graphics();
    const t = txt(def.nome, C.text, 17, true);
    t.position.set(14, 12);
    const d = para(def.desc, C.dim, 13, w - 28);
    d.position.set(14, 12 + t.height + 2);
    let y = d.y + d.height + 10;
    const nivelOk = game.nivel() >= (def.nivelRep ?? 1);
    const req = txt(`Custo: ${fmt(def.custo)} ouro · Reputação ${def.nivelRep}`, nivelOk ? C.dim : C.warn, 13, true);
    req.position.set(14, y);
    y += req.height + 10;
    const b = labelButton(nivelOk ? 'Abrir ofício' : `Precisa de reputação ${def.nivelRep}`, w - 28, 44, { tint: C.accent });
    if (!nivelOk || game.state.ouro < def.custo) b.setDisabled(true);
    b.position.set(14, y);
    b.tap(() => {
      const r = desbloquearOficio(game, def.id);
      if (r.ok) { sfx.levelUp(); toast(`${def.nome} aberta!`, C.accent); } else { sfx.deny(); toast(r.motivo === 'sem-ouro' ? 'Ouro insuficiente' : 'Reputação insuficiente', C.bad); }
    });
    reg('desbloquear', b, w - 28, 44);
    c.addChild(bg, t, d, req, b);
    const h = y + 44 + 14;
    drawCard(bg, w, h, { fill: C.card, accent: C.faint });
    return { c, h };
  }

  function barra(w, job, y) {
    const g = new Graphics();
    g.position.set(0, y);
    barras.push({ g, w, job });
    return g;
  }

  function cartaoStatus(w, def) {
    const c = new Container();
    const bg = new Graphics();
    const nivel = nivelOficio(game, def.id);
    const t = txt(`${def.nome} · nível ${nivel}`, C.text, 16, true);
    t.position.set(14, 12);
    const e = game.state.oficios[def.id];
    const max = game.data.meta.oficina.nivelMax;
    const xpTxt = nivel >= max ? 'nível máximo' : `${fmt(e.xp)} / ${fmt(xpParaNivel(game, nivel + 1))} xp`;
    const x = txt(xpTxt, C.dim, 11);
    x.position.set(w - 14 - x.width, 15);
    const xb = new Graphics();
    xb.position.set(14, 12 + t.height + 6);
    xb.roundRect(0, 0, w - 28, 5, 2.5).fill({ color: 0x000000, alpha: 0.4 }).roundRect(0, 0, Math.max(5, (w - 28) * progressoOficio(game, def.id)), 5, 2.5).fill(C.rep);
    const rod = emProducao(game, def.id).length;
    const fila = naFila(game, def.id).length;
    const info = txt(`Produzindo ${rod}/${slotsDe(game, def.id)} · na fila ${fila}/${filaMaxDe(game, def.id)}`, C.dim, 12);
    info.position.set(14, xb.y + 14);
    const p = chancesQualidade(game, nivel);
    const nomes = game.data.meta.qualidades.map((q) => q.nome);
    const qual = txt(`Qualidade: ${p.map((v, i) => (v > 0 ? `${nomes[i]} ${Math.round(v * 100)}%` : null)).filter(Boolean).join(' · ')}`, C.faint, 11);
    qual.position.set(14, info.y + info.height + 3);
    c.addChild(bg, t, x, xb, info, qual);
    const h = qual.y + qual.height + 12;
    drawCard(bg, w, h, { fill: C.cardHi, accent: C.accent });
    return { c, h };
  }

  function linhaProducao(w, job) {
    const rec = game.data.receitas[job.receita];
    const item = game.data.itens[rec.item];
    const c = new Container();
    const bg = new Graphics();
    const h = 54;
    drawCard(bg, w, h, { fill: C.card, radius: 12 });
    const ic = iconSprite('item', rec.item, 32);
    ic.position.set(10, 11);
    const nome = txt(`${item.nome}${(rec.qtd ?? 1) > 1 ? ` ×${rec.qtd}` : ''}`, C.text, 13, true);
    nome.position.set(52, 8);
    const t = txt('', C.dim, 11);
    c.addChild(bg, ic, nome, t);
    tempos.push({ t, job, x: w - 12 });
    if (job.inicio !== null) {
      const b = barra(w - 64 - 12, job, 0);
      b.position.set(52, h - 15);
      c.addChild(b);
    }
    return { c, h };
  }

  function receitaCard(w, r) {
    const c = new Container();
    const bg = new Graphics();
    const item = game.data.itens[r.item];
    const chk = podeProduzir(game, r.id);
    const nivelFalta = nivelOficio(game, r.oficio) < r.nivel;
    const falta = faltando(game, r);
    const bw = 84;
    const tw = w - bw - 24;
    const ic = iconSprite('item', r.item, 36);
    ic.position.set(12, 12);
    const nome = txt(`${item.nome}${(r.qtd ?? 1) > 1 ? ` ×${r.qtd}` : ''}`, nivelFalta ? C.faint : C.text, 14, true);
    nome.position.set(56, 10);
    const tempo = txt(fmtTime(duracaoDe(game, r) / 1000), C.dim, 11);
    tempo.position.set(56, 10 + nome.height + 1);
    c.addChild(bg, ic, nome, tempo);
    if (nivelFalta) {
      const n = txt(`Precisa de nível ${r.nivel}`, C.warn, 11, true);
      n.position.set(56 + tempo.width + 10, tempo.y);
      c.addChild(n);
    }
    // materiais: ícone + tem/precisa
    let x = 12;
    let y = 58;
    const chip = 66;
    for (const [m, q] of Object.entries(r.materiais)) {
      if (x + chip > tw + 12 && x > 12) { x = 12; y += 24; }
      const tem = game.state.materiais[m] ?? 0;
      const ic2 = iconSprite('material', m, 20);
      ic2.position.set(x, y);
      const tt = txt(`${fmt(tem)}/${q}`, tem >= q ? C.dim : C.bad, 12, tem < q);
      tt.position.set(x + 24, y + 2);
      c.addChild(ic2, tt);
      x += chip;
    }
    const h = y + 24 + 10;
    const b = labelButton('Produzir', bw, 40, { tint: chk.ok ? C.good : C.dim, size: 13 });
    b.position.set(w - bw - 12, 12);
    if (!chk.ok) {
      // continua tocável para explicar o motivo, mas visualmente apagado
      b.paint({ tint: C.dim, alpha: 0.06 });
      b.label.style.fill = C.faint;
    }
    b.tap(() => {
      const r2 = produzir(game, r.id);
      if (r2.ok) { sfx.tap(); haptic(8); } else { sfx.deny(); toast(MOTIVOS[r2.motivo] ?? 'Não foi possível produzir', C.bad); }
    });
    reg(`produzir:${r.id}`, b, bw, 40);
    c.addChild(b);
    if (!chk.ok && chk.motivo === 'materiais') {
      const n = Object.keys(falta).length;
      const f = txt(`faltam ${n} material${n > 1 ? 'is' : ''}`, C.bad, 10);
      f.position.set(w - bw - 12 + (bw - f.width) / 2, 56);
      c.addChild(f);
    }
    drawCard(bg, w, h, { fill: C.card, radius: 12, accent: chk.ok ? C.good : null });
    return { c, h };
  }

  // ---------- montagem ----------
  function render() {
    dirty = false;
    quadros = 0;
    barras = [];
    tempos = [];
    for (const k of Object.keys(refs)) delete refs[k];
    const keepY = scroll.scrollY;
    scroll.clear();
    const w = R.w;

    if (game.state.prontos.length) { const p = cartaoProntos(w); scroll.add(p.c, p.h); }
    const g = gradeOficios(w);
    scroll.add(g.c, g.h);

    const def = game.data.meta.oficios.find((o) => o.id === sel);
    if (!oficioAberto(game, sel)) {
      const p = painelFechado(w, def);
      scroll.add(p.c, p.h);
      const receitas = game.data.listas.receitas.filter((r) => r.oficio === sel);
      if (receitas.length) {
        const t = txt(`Receitas (${receitas.length}): abra o ofício para produzir`, C.dim, 12, true);
        scroll.add(t, t.height);
        for (const r of receitas) {
          const it = game.data.itens[r.item];
          const row = new Container();
          const bg = new Graphics();
          const ic = iconSprite('item', r.item, 28);
          ic.position.set(12, 9);
          ic.alpha = 0.6;
          const n = txt(it.nome, C.faint, 13, true);
          n.position.set(50, 14);
          drawCard(bg, w, 46, { fill: C.card, fillAlpha: 0.55, shadow: false, radius: 10 });
          row.addChild(bg, ic, n);
          scroll.add(row, 46);
        }
      }
    } else {
      const s = cartaoStatus(w, def);
      scroll.add(s.c, s.h);
      const jobs = [...emProducao(game, sel), ...naFila(game, sel)];
      if (jobs.length) {
        const t = txt('Em produção', C.dim, 12, true);
        scroll.add(t, t.height);
        for (const j of jobs) { const l = linhaProducao(w, j); scroll.add(l.c, l.h); }
      }
      const t = txt('Receitas', C.dim, 12, true);
      scroll.add(t, t.height);
      for (const r of game.data.listas.receitas.filter((x) => x.oficio === sel)) {
        const cardR = receitaCard(w, r);
        scroll.add(cardR.c, cardR.h);
      }
    }
    scroll.resize(R.h, w);
    scroll.scrollBy(keepY);
    pintar();
  }

  const agora = () => game.clock.now();
  function pintar() {
    const t = agora();
    for (const b of barras) {
      const f = Math.max(0, Math.min(1, (t - b.job.inicio) / (b.job.fim - b.job.inicio)));
      b.g.clear().roundRect(0, 0, b.w, 5, 2.5).fill({ color: 0x000000, alpha: 0.45 });
      if (f > 0) b.g.roundRect(0, 0, Math.max(5, b.w * f), 5, 2.5).fill(C.accent);
    }
    for (const x of tempos) {
      const job = x.job;
      x.t.text = job.inicio === null ? 'na fila' : fmtTime((job.fim - t) / 1000);
      x.t.position.set(x.x - x.t.width, 10);
    }
  }

  const global = (ref) => (ref ? ref.c.toGlobal({ x: ref.w / 2, y: ref.h / 2 }) : null);

  return {
    root,
    scroll,
    resize(rect) {
      R = rect;
      root.position.set(rect.x, rect.y);
      render();
    },
    show() { marcar(); },
    update(dt) {
      if (!root.visible) return;
      if (dirty) { render(); return; }
      quadros += 1;
      relogio += dt;
      if (relogio >= 250) { relogio = 0; pintar(); }
    },
    hooks: {
      pronta: () => !dirty && quadros >= 2,
      selecionar: (id) => { sel = id; marcar(); },
      oficioSelecionado: () => sel,
      centro: (nome) => global(refs[nome]),
      renderAgora: render,
    },
  };
}
