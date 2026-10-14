// Tela de Melhorias: Loja (ampliar, prateleiras, balcão, decoração), Equipe, árvores dos Ofícios,
// e as abas que chegam depois (Conquistas, Expandir). A lógica está em core/upgrades.js.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, createScroll, labelButton, wasDragged, retanguloGlobal } from './ui.js';
import { descreverEfeito } from '../core/mods.js';
import {
  comprarMelhoria, estadoMelhoria, melhoriasDoGrupo, contratar, proximoNivel, nivelFuncionario,
  comprarDecoracao, usarDecoracao, possuiDecoracao,
} from '../core/upgrades.js';
import { progressoConquista, ganha, totalGanhas } from '../core/achievements.js';
import {
  estadoExpansao, expandir, comprarHeranca, nivelHeranca, custoHeranca, nomeDaCidade, ouroDestaCidade,
} from '../core/prestige.js';
import { fmt } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const SUBS = [
  { id: 'loja', nome: 'Loja' },
  { id: 'equipe', nome: 'Equipe' },
  { id: 'oficios', nome: 'Ofícios' },
  { id: 'conquistas', nome: 'Conquistas' },
  { id: 'expandir', nome: 'Expandir' },
];
const ORDEM = { disponivel: 0, requisito: 1, reputacao: 2, comprada: 3 };
const MOTIVOS = {
  'sem-ouro': 'Ouro insuficiente', reputacao: 'Reputação insuficiente', requisito: 'Compre antes a melhoria anterior',
  'ja-comprada': 'Você já tem esta melhoria',
};

export function createMelhoriasScreen({ game, toast, modal, abrirApoio }) {
  const root = new Container();
  const scroll = createScroll(300);
  root.addChild(scroll.root);

  let R = { x: 0, y: 0, w: 360, h: 600 };
  let sub = 'loja';
  let oficioSel = 'ferraria';
  let dirty = true;
  let quadros = 0;
  const refs = {};
  const marcar = () => { dirty = true; };
  for (const ev of ['ouro', 'rep', 'melhoria', 'equipe', 'decoracao', 'conquista', 'heranca', 'expandiu']) game.on(ev, marcar);
  game.on('melhoria', (m) => toast(`${m.nome} comprada!`, C.accent));
  game.on('equipe', ({ id, nivel }) => toast(`${game.data.equipe[id].nome}: nível ${nivel}`, C.accent));

  const reg = (nome, c, w, h) => { refs[nome] = { c, w, h }; };

  // ---------- barra de abas internas ----------
  function barraSub(w) {
    const c = new Container();
    const gap = 6;
    const cw = (w - gap * (SUBS.length - 1)) / SUBS.length;
    SUBS.forEach((s, i) => {
      const b = new Container();
      const bg = new Graphics();
      const on = s.id === sub;
      bg.roundRect(0, 0, cw, 38, 12).fill({ color: on ? C.accent : C.card, alpha: on ? 0.22 : 1 }).stroke({ width: 1, color: on ? C.accent : 0xffffff, alpha: on ? 0.8 : 0.1 });
      const t = txt(s.nome, on ? C.text : C.dim, cw < 66 ? 10 : 12, true);
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

  // ---------- cartão de melhoria ----------
  function cartaoMelhoria(w, m) {
    const e = estadoMelhoria(game, m);
    const comprada = e.estado === 'comprada';
    const c = new Container();
    const bg = new Graphics();
    const bw = 96;
    const tw = w - bw - 36;
    const nome = txt(m.nome, comprada ? C.dim : C.text, 14, true);
    nome.position.set(14, 10);
    const desc = para(m.desc, C.dim, 12, tw);
    desc.position.set(14, nome.y + nome.height + 1);
    c.addChild(bg, nome, desc);
    let y = desc.y + desc.height + 4;
    for (const ef of m.efeitos) {
      const t = para(`• ${descreverEfeito(ef, game)}`, comprada ? C.faint : C.accent, 12, tw, { bold: true });
      t.position.set(14, y);
      c.addChild(t);
      y += t.height + 1;
    }
    let aviso = null;
    if (e.estado === 'requisito') aviso = `Requer: ${e.faltam.map((id) => game.data.melhorias[id].nome).join(', ')}`;
    else if (e.estado === 'reputacao') aviso = `Reputação ${e.nivel}`;
    if (aviso) {
      const t = para(aviso, C.warn, 11, tw);
      t.position.set(14, y + 2);
      c.addChild(t);
      y += t.height + 2;
    }
    const h = Math.max(y + 12, 66);

    if (comprada) {
      const ok = txt('✓ Comprada', C.good, 12, true);
      ok.position.set(w - ok.width - 14, 12);
      c.addChild(ok);
    } else {
      const pode = e.estado === 'disponivel' && game.state.ouro >= m.custo;
      const b = labelButton(`${fmt(m.custo)}`, bw, 40, { tint: pode ? C.gold : C.dim, size: 14 });
      b.position.set(w - bw - 12, 12);
      if (!pode) { b.paint({ alpha: 0.05 }); b.label.style.fill = C.faint; }
      b.tap(() => {
        const r = comprarMelhoria(game, m.id);
        if (r.ok) { sfx.levelUp(); haptic(10); } else { sfx.deny(); toast(MOTIVOS[r.motivo] ?? 'Não foi possível comprar', C.bad); }
      });
      c.addChild(b);
      reg(`comprar:${m.id}`, b, bw, 40);
      const rot = txt('ouro', C.dim, 10);
      rot.position.set(w - bw - 12 + (bw - rot.width) / 2, 54);
      c.addChild(rot);
    }
    drawCard(bg, w, h, { fill: comprada ? C.card : C.cardHi, fillAlpha: comprada ? 0.6 : 1, accent: comprada ? C.good : e.estado === 'disponivel' ? C.accent : null });
    return { c, h };
  }

  function listaMelhorias(w, grupo) {
    const lista = melhoriasDoGrupo(game, grupo)
      .map((m, i) => ({ m, i, e: estadoMelhoria(game, m).estado }))
      .sort((a, b) => ORDEM[a.e] - ORDEM[b.e] || a.i - b.i);
    return lista.map(({ m }) => cartaoMelhoria(w, m));
  }

  // ---------- decoração ----------
  function cartaoDecoracao(w, d) {
    const dono = possuiDecoracao(game, d.id);
    const emUso = game.state.loja.tema === d.id;
    const c = new Container();
    const bg = new Graphics();
    const bw = 96;
    const tw = w - bw - 36 - 70;
    // amostra das cores
    const am = new Graphics();
    am.roundRect(0, 0, 54, 54, 8).fill(d.cores.parede);
    am.rect(0, 34, 54, 20).fill(d.cores.piso);
    am.rect(4, 26, 46, 6).fill(d.cores.balcao);
    am.rect(6, 10, 42, 3).fill(d.cores.prateleira);
    am.roundRect(0, 0, 54, 54, 8).stroke({ width: 1, color: 0xffffff, alpha: 0.25 });
    am.position.set(12, 12);
    const nome = txt(d.nome, C.text, 14, true);
    nome.position.set(76, 10);
    const desc = para(d.desc, C.dim, 12, tw);
    desc.position.set(76, nome.y + nome.height + 1);
    c.addChild(bg, am, nome, desc);
    let y = desc.y + desc.height + 4;
    for (const ef of d.efeitos) {
      const t = para(`• ${descreverEfeito(ef, game)}`, C.accent, 12, tw, { bold: true });
      t.position.set(76, y);
      c.addChild(t);
      y += t.height + 1;
    }
    const nivelOk = game.nivel() >= (d.nivelRep ?? 1);
    if (!dono && d.premium) {
      const t = txt('Tema da loja de apoio', C.info, 11, true);
      t.position.set(76, y + 2);
      c.addChild(t);
      y += t.height + 2;
    } else if (!dono && !nivelOk) {
      const t = txt(`Reputação ${d.nivelRep}`, C.warn, 11);
      t.position.set(76, y + 2);
      c.addChild(t);
      y += t.height + 2;
    }
    const h = Math.max(y + 12, 78);
    if (emUso) {
      const t = txt('Em uso', C.good, 12, true);
      t.position.set(w - t.width - 14, 12);
      c.addChild(t);
    } else if (dono) {
      const b = labelButton('Usar', bw, 40, { tint: C.good, size: 14 });
      b.position.set(w - bw - 12, 12);
      b.tap(() => { usarDecoracao(game, d.id); sfx.tap(); });
      c.addChild(b);
      reg(`usar:${d.id}`, b, bw, 40);
    } else if (d.premium) {
      // tema da loja de apoio: não se compra com ouro
      const b = labelButton('Loja de apoio', bw, 40, { tint: C.info, size: 12 });
      b.position.set(w - bw - 12, 12);
      b.tap(() => { sfx.tap(); abrirApoio?.(); });
      c.addChild(b);
      reg(`apoio-tema:${d.id}`, b, bw, 40);
    } else {
      const pode = nivelOk && game.state.ouro >= d.custo;
      const b = labelButton(`${fmt(d.custo)}`, bw, 40, { tint: pode ? C.gold : C.dim, size: 14 });
      b.position.set(w - bw - 12, 12);
      if (!pode) { b.paint({ alpha: 0.05 }); b.label.style.fill = C.faint; }
      b.tap(() => {
        const r = comprarDecoracao(game, d.id);
        if (r.ok) { sfx.levelUp(); toast(`Decoração ${d.nome} em uso`, C.accent); } else { sfx.deny(); toast(MOTIVOS[r.motivo] ?? 'Não foi possível comprar', C.bad); }
      });
      c.addChild(b);
      reg(`comprar-tema:${d.id}`, b, bw, 40);
    }
    drawCard(bg, w, h, { fill: C.cardHi, accent: emUso ? C.good : null });
    return { c, h };
  }

  // ---------- equipe ----------
  function cartaoFuncionario(w, f) {
    const nivel = nivelFuncionario(game, f.id);
    const prox = proximoNivel(game, f.id);
    const c = new Container();
    const bg = new Graphics();
    const nome = txt(f.nome, C.text, 16, true);
    nome.position.set(14, 12);
    // pontinhos de nível
    const pips = new Graphics();
    f.niveis.forEach((_, i) => pips.circle(i * 14, 0, 4.5).fill(i < nivel ? C.accent : 0x000000).stroke({ width: 1, color: C.accent, alpha: i < nivel ? 1 : 0.4 }));
    pips.position.set(w - 14 - (f.niveis.length - 1) * 14 - 4, 21);
    const desc = para(f.desc, C.dim, 12, w - 28);
    desc.position.set(14, nome.y + nome.height + 2);
    c.addChild(bg, nome, pips, desc);
    let y = desc.y + desc.height + 6;
    if (nivel > 0) {
      const t = txt('Agora:', C.dim, 11, true);
      t.position.set(14, y);
      c.addChild(t);
      y += t.height + 1;
      for (const ef of f.niveis[nivel - 1].efeitos) {
        const p = para(`• ${descreverEfeito(ef, game)}`, C.good, 12, w - 28, { bold: true });
        p.position.set(14, y);
        c.addChild(p);
        y += p.height + 1;
      }
      y += 4;
    }
    if (prox) {
      const t = txt(nivel === 0 ? 'Ao contratar:' : `Promoção para o nível ${prox.nivel}:`, C.dim, 11, true);
      t.position.set(14, y);
      c.addChild(t);
      y += t.height + 1;
      for (const ef of prox.efeitos) {
        const p = para(`• ${descreverEfeito(ef, game)}`, C.accent, 12, w - 28, { bold: true });
        p.position.set(14, y);
        c.addChild(p);
        y += p.height + 1;
      }
      y += 6;
      const nivelOk = game.nivel() >= prox.nivelRep;
      const pode = nivelOk && game.state.ouro >= prox.custo;
      const rot = nivel === 0 ? `Contratar · ${fmt(prox.custo)}` : `Promover · ${fmt(prox.custo)}`;
      const b = labelButton(nivelOk ? rot : `Precisa de reputação ${prox.nivelRep}`, w - 28, 42, { tint: pode ? C.gold : C.dim, size: 14 });
      b.position.set(14, y);
      if (!pode) { b.paint({ alpha: 0.05 }); b.label.style.fill = C.faint; }
      b.tap(() => {
        const r = contratar(game, f.id);
        if (r.ok) { sfx.levelUp(); haptic(10); } else { sfx.deny(); toast(MOTIVOS[r.motivo] ?? 'Não foi possível', C.bad); }
      });
      c.addChild(b);
      reg(`contratar:${f.id}`, b, w - 28, 42);
      y += 42;
    } else {
      const t = txt('Nível máximo', C.good, 13, true);
      t.position.set(14, y);
      c.addChild(t);
      y += t.height;
    }
    const h = y + 14;
    drawCard(bg, w, h, { fill: C.cardHi, accent: nivel > 0 ? C.accent : C.faint });
    return { c, h };
  }

  // ---------- seletor de ofício (aba Ofícios) ----------
  function gradeOficios(w) {
    const out = new Container();
    const lista = game.data.meta.oficios;
    const gap = 6;
    const cols = w >= 560 ? 8 : 4;
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = 36;
    lista.forEach((o, i) => {
      const b = new Container();
      const bg = new Graphics();
      const on = o.id === oficioSel;
      const compradas = melhoriasDoGrupo(game, o.id).filter((m) => game.state.melhorias[m.id]).length;
      bg.roundRect(0, 0, cw, ch, 10).fill({ color: on ? C.accent : C.card, alpha: on ? 0.22 : 1 }).stroke({ width: 1, color: on ? C.accent : 0xffffff, alpha: on ? 0.8 : 0.1 });
      const t = txt(o.nome, on ? C.text : C.dim, cw < 90 ? 10 : 11, true);
      t.position.set((cw - t.width) / 2, 4);
      const n = txt(`${compradas}/${melhoriasDoGrupo(game, o.id).length}`, C.faint, 10);
      n.position.set((cw - n.width) / 2, ch - n.height - 3);
      b.addChild(bg, t, n);
      b.position.set((i % cols) * (cw + gap), Math.floor(i / cols) * (ch + gap));
      b.eventMode = 'static';
      b.cursor = 'pointer';
      b.hitArea = new Rectangle(0, 0, cw, ch);
      b.on('pointertap', () => { if (!wasDragged() && oficioSel !== o.id) { oficioSel = o.id; sfx.tap(); marcar(); } });
      reg(`oficio:${o.id}`, b, cw, ch);
      out.addChild(b);
    });
    const linhas = Math.ceil(lista.length / cols);
    return { c: out, h: linhas * ch + (linhas - 1) * gap };
  }

  // ---------- conquistas ----------
  function barra(w, frac, cor) {
    const g = new Graphics();
    g.roundRect(0, 0, w, 8, 4).fill({ color: 0x000000, alpha: 0.25 });
    if (frac > 0) g.roundRect(0, 0, Math.max(8, w * frac), 8, 4).fill(cor);
    return g;
  }

  function premioTexto(c) {
    return [c.ouro ? `${fmt(c.ouro)} ouro` : null, c.rep ? `${c.rep} rep.` : null].filter(Boolean).join(' + ');
  }

  function cartaoConquista(w, c) {
    const p = progressoConquista(game, c);
    const feita = ganha(game, c.id);
    const cont = new Container();
    const bg = new Graphics();
    cont.addChild(bg);
    const nome = txt(c.nome, feita ? C.dim : C.text, 14, true);
    nome.position.set(14, 10);
    const premio = txt(feita ? '✓' : premioTexto(c), feita ? C.good : C.gold, feita ? 16 : 12, true);
    premio.position.set(w - premio.width - 14, feita ? 8 : 11);
    const desc = para(c.desc, C.dim, 12, w - 28);
    desc.position.set(14, nome.y + nome.height + 1);
    cont.addChild(nome, premio, desc);
    let h = desc.y + desc.height + 10;
    if (!feita) {
      const b = barra(w - 28 - 70, p.atual / p.meta, C.accent);
      b.position.set(14, h + 2);
      const n = txt(`${fmt(p.atual)}/${fmt(p.meta)}`, C.dim, 11, true);
      n.position.set(w - 14 - n.width, h - 2);
      cont.addChild(b, n);
      h += 20;
    }
    drawCard(bg, w, h, { fill: feita ? C.card : C.cardHi, fillAlpha: feita ? 0.6 : 1, accent: feita ? C.good : C.accent });
    return { c: cont, h };
  }

  function listaConquistas(w) {
    const todas = game.data.listas.conquistas;
    const total = todas.length;
    const ganhas = totalGanhas(game);
    const cab = new Container();
    const t = txt(`Conquistas: ${ganhas}/${total}`, C.text, 16, true);
    const b = barra(w, ganhas / total, C.gold);
    b.position.set(0, t.height + 6);
    cab.addChild(t, b);
    const itens = [{ c: cab, h: t.height + 6 + 8 }];
    const pendentes = todas.filter((c) => !ganha(game, c.id))
      .map((c) => ({ c, f: progressoConquista(game, c) }))
      .sort((a, b2) => (b2.f.atual / b2.f.meta) - (a.f.atual / a.f.meta));
    if (pendentes.length) {
      itens.push(secao('Em andamento (as mais próximas primeiro)'));
      for (const { c } of pendentes) itens.push(cartaoConquista(w, c));
    }
    const feitas = todas.filter((c) => ganha(game, c.id)).sort((a, b2) => game.state.conquistas[b2.id] - game.state.conquistas[a.id]);
    if (feitas.length) {
      itens.push(secao('Conquistadas'));
      for (const c of feitas) itens.push(cartaoConquista(w, c));
    }
    return itens;
  }

  // ---------- expandir (prestígio) ----------
  function cartaoCidade(w) {
    const p = game.state.prestigio;
    const c = new Container();
    const bg = new Graphics();
    c.addChild(bg);
    const t = txt(nomeDaCidade(game), C.text, 18, true);
    t.position.set(14, 12);
    const n = txt(`Cidade nº ${p.cidade}`, C.dim, 12, true);
    n.position.set(w - 14 - n.width, 16);
    const l1 = txt(`Ouro ganho nesta cidade: ${fmt(ouroDestaCidade(game))}`, C.dim, 13);
    l1.position.set(14, t.y + t.height + 6);
    const l2 = txt(`Herança: ${fmt(p.heranca)} para gastar · ${fmt(p.herancaTotal)} já ganha`, C.gold, 13, true);
    l2.position.set(14, l1.y + l1.height + 4);
    c.addChild(t, n, l1, l2);
    const h = l2.y + l2.height + 14;
    drawCard(bg, w, h, { fill: C.cardHi, accent: C.gold });
    return { c, h };
  }

  function confirmarExpansao() {
    const ganho = estadoExpansao(game).ganho;
    const proxima = nomeDaCidade(game, game.state.prestigio.cidade + 1);
    modal.open({
      title: 'Nova cidade',
      build: (sc, w) => {
        const a = para(`Você vai fundar a loja em ${proxima} e ganhar ${fmt(ganho)} de Herança.`, C.text, 15, w, { bold: true });
        sc.add(a, a.height);
        const b = para('Recomeça do zero: ouro, estoque, materiais, melhorias, equipe, decoração, ofícios, expedições e reputação.', C.bad, 13, w);
        sc.add(b, b.height);
        const c = para('Fica com você: Herança e seus bônus, conquistas, coleção, histórias das lendas, sequência de dias e estatísticas.', C.good, 13, w);
        sc.add(c, c.height);
        const ok = labelButton(`Expandir para ${proxima}`, w, 46, { tint: C.good });
        ok.tap(() => {
          modal.close(true);
          const r = expandir(game);
          if (r.ok) {
            sfx.achievement();
            haptic(20);
            toast(`Bem-vindo a ${nomeDaCidade(game)}! +${fmt(r.ganho)} Herança`, C.gold);
          }
        });
        sc.add(ok, 46);
        reg('confirmar', ok, w, 46);
        const no = labelButton('Agora não', w, 40, { tint: C.dim });
        no.tap(() => modal.close(true));
        sc.add(no, 40);
      },
    });
  }

  function cartaoExpandir(w) {
    const e = estadoExpansao(game);
    const proxima = nomeDaCidade(game, game.state.prestigio.cidade + 1);
    const c = new Container();
    const bg = new Graphics();
    c.addChild(bg);
    const t = txt(`Expandir para ${proxima}`, C.text, 16, true);
    t.position.set(14, 12);
    const d = para('Recomece em uma cidade nova. A loja volta ao começo, mas a Herança que você ganha fica para sempre e deixa as próximas cidades mais fáceis.', C.dim, 12, w - 28);
    d.position.set(14, t.y + t.height + 4);
    c.addChild(t, d);
    let y = d.y + d.height + 8;
    let msg;
    if (e.ok) msg = `Rende ${fmt(e.ganho)} de Herança agora.`;
    else if (e.motivo === 'reputacao') msg = `Chegue à reputação ${e.nivelMin} para poder expandir.`;
    else msg = `Ganhe mais ${fmt(e.falta)} de ouro nesta cidade para render Herança.`;
    const m = para(msg, e.ok ? C.good : C.warn, 13, w - 28, { bold: true });
    m.position.set(14, y);
    c.addChild(m);
    y += m.height + 10;
    const b = labelButton('Expandir', w - 28, 44, { tint: e.ok ? C.good : C.dim, size: 15 });
    b.position.set(14, y);
    if (!e.ok) { b.paint({ alpha: 0.05 }); b.label.style.fill = C.faint; }
    b.tap(() => { if (e.ok) confirmarExpansao(); else { sfx.deny(); toast(msg, C.warn); } });
    c.addChild(b);
    reg('expandir', b, w - 28, 44);
    const h = y + 44 + 14;
    drawCard(bg, w, h, { fill: C.cardHi, accent: e.ok ? C.good : C.faint });
    return { c, h };
  }

  function cartaoHeranca(w, def) {
    const nivel = nivelHeranca(game, def.id);
    const max = def.niveis.length;
    const custo = custoHeranca(game, def.id);
    const c = new Container();
    const bg = new Graphics();
    const bw = 84;
    const tw = w - bw - 36;
    const nome = txt(def.nome, C.text, 14, true);
    nome.position.set(14, 10);
    const desc = para(def.desc, C.dim, 12, tw);
    desc.position.set(14, nome.y + nome.height + 1);
    c.addChild(bg, nome, desc);
    let y = desc.y + desc.height + 4;
    if (nivel > 0) {
      const t = para(`Agora: ${def.niveis[nivel - 1].efeitos.map((e) => descreverEfeito(e, game)).join(' · ')}`, C.good, 12, tw, { bold: true });
      t.position.set(14, y);
      c.addChild(t);
      y += t.height + 2;
    }
    if (custo !== null) {
      const t = para(`Próximo: ${def.niveis[nivel].efeitos.map((e) => descreverEfeito(e, game)).join(' · ')}`, C.accent, 12, tw, { bold: true });
      t.position.set(14, y);
      c.addChild(t);
      y += t.height + 2;
    }
    const pips = new Graphics();
    for (let i = 0; i < max; i++) pips.circle(i * 14, 0, 4.5).fill(i < nivel ? C.gold : 0x000000).stroke({ width: 1, color: C.gold, alpha: i < nivel ? 1 : 0.4 });
    pips.position.set(19, y + 8);
    c.addChild(pips);
    const h = Math.max(y + 22, 70);
    if (custo === null) {
      const ok = txt('Máximo', C.good, 12, true);
      ok.position.set(w - ok.width - 14, 12);
      c.addChild(ok);
    } else {
      const pode = game.state.prestigio.heranca >= custo;
      const b = labelButton(`${custo}`, bw, 40, { tint: pode ? C.gold : C.dim, size: 15 });
      b.position.set(w - bw - 12, 12);
      if (!pode) { b.paint({ alpha: 0.05 }); b.label.style.fill = C.faint; }
      b.tap(() => {
        const r = comprarHeranca(game, def.id);
        if (r.ok) { sfx.levelUp(); haptic(10); } else { sfx.deny(); toast('Herança insuficiente', C.bad); }
      });
      c.addChild(b);
      reg(`heranca:${def.id}`, b, bw, 40);
      const rot = txt('Herança', C.dim, 10);
      rot.position.set(w - bw - 12 + (bw - rot.width) / 2, 54);
      c.addChild(rot);
    }
    drawCard(bg, w, h, { fill: nivel >= max ? C.card : C.cardHi, fillAlpha: nivel >= max ? 0.6 : 1, accent: nivel >= max ? C.good : custo !== null && game.state.prestigio.heranca >= custo ? C.gold : null });
    return { c, h };
  }

  const secao = (texto) => { const t = txt(texto, C.dim, 12, true); return { c: t, h: t.height }; };

  // ---------- montagem ----------
  function render() {
    dirty = false;
    quadros = 0;
    for (const k of Object.keys(refs)) delete refs[k];
    const keepY = scroll.scrollY;
    scroll.clear();
    const w = R.w;
    const add = (it) => scroll.add(it.c, it.h);

    add(barraSub(w));
    if (sub === 'loja') {
      add(secao('Melhorias da loja'));
      listaMelhorias(w, 'loja').forEach(add);
      add(secao('Decoração'));
      game.data.listas.decoracoes.forEach((d) => add(cartaoDecoracao(w, d)));
    } else if (sub === 'equipe') {
      game.data.listas.equipe.forEach((f) => add(cartaoFuncionario(w, f)));
    } else if (sub === 'oficios') {
      add(gradeOficios(w));
      listaMelhorias(w, oficioSel).forEach(add);
    } else if (sub === 'conquistas') {
      listaConquistas(w).forEach(add);
    } else {
      add(cartaoCidade(w));
      add(cartaoExpandir(w));
      add(secao('Bônus de Herança (valem em todas as cidades)'));
      game.data.listas.heranca.forEach((h) => add(cartaoHeranca(w, h)));
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
    update() {
      if (!root.visible) return;
      if (dirty) render(); else quadros += 1;
    },
    hooks: {
      pronta: () => !dirty && quadros >= 2,
      sub: () => sub,
      nomes: () => Object.keys(refs),
      retangulo: (nome) => retanguloGlobal(refs[nome]),
      irParaSub: (id) => { if (sub !== id) { sub = id; marcar(); } },
      selecionarOficio: (id) => { if (oficioSel !== id) { oficioSel = id; marcar(); } },

      centro: (nome) => global(refs[nome]),
      renderAgora: render,
      // rola a lista até o item ficar à vista (usado pelos testes: com muito conteúdo, nem tudo cabe na tela)
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
