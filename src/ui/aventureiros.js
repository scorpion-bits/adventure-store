// Tela Aventureiros: Hoje (retenção, M8), Coleção (M9) e Lendários (histórias em capítulos).
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, createScroll, labelButton, wasDragged, retanguloGlobal } from './ui.js';
import { portraitSprite, iconSprite } from '../assets.js';
import { sazonaisAtivos } from '../core/seasons.js';
import { descreverEfeito } from '../core/mods.js';
import {
  bonusDoDia, coletarBonus, entregarEncomenda, podeEntregar, unidadesParaEncomenda, metasCumpridas, progressoMeta, metaCumprida, textoMeta, abrirBau,
} from '../core/daily.js';
import { raridade, categoria, temperamento, classe } from '../data/index.js';
import { fmt } from '../format.js';
import { progressoLenda, capituloAtual, lendaConcluida, nivelNecessario, qualidadeMinima } from '../core/legends.js';
import { conteudoCapitulo } from './lendas.js';
import { sfx } from '../audio/sfx.js';

const SUBS = [
  { id: 'hoje', nome: 'Hoje' },
  { id: 'colecao', nome: 'Coleção' },
  { id: 'lendarios', nome: 'Lendários' },
];

export function createAventureirosScreen({ game, modal, toast }) {
  const root = new Container();
  const scroll = createScroll(300);
  root.addChild(scroll.root);

  let R = { x: 0, y: 0, w: 360, h: 600 };
  let sub = 'hoje';
  let dirty = true;
  let quadros = 0;
  const refs = {};
  const marcar = () => { dirty = true; };
  for (const ev of ['lenda', 'rep', 'chegou', 'diario', 'estoque', 'encomenda', 'bonusDiario', 'bau', 'especialAtendido', 'ouro', 'venda']) game.on(ev, marcar);
  game.on('especialAtendido', (r) => { sfx.achievement(); toast?.(`${game.data.aventureiros[r.adv].nome} adorou! +${fmt(r.ouro)} ouro de bônus`, C.gold); });
  game.on('encomenda', ({ enc }) => { sfx.sell(); toast?.(`Encomenda entregue: +${fmt(enc.ouro)} ouro`, C.good); });
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

  // ---------- Hoje ----------
  const secao = (texto) => { const t = txt(texto, C.dim, 12, true); return { c: t, h: t.height }; };

  function cartaoSazonal(w, sz) {
    const c = new Container();
    const bg = new Graphics();
    const t = txt(`✦ ${sz.nome}`, C.gold, 15, true);
    t.position.set(14, 12);
    const d = para(sz.desc, C.dim, 12, w - 28);
    d.position.set(14, t.y + t.height + 2);
    c.addChild(bg, t, d);
    let y = d.y + d.height + 4;
    for (const e of sz.efeitos) {
      const p = para(`• ${descreverEfeito(e, game)}`, C.accent, 12, w - 28, { bold: true });
      p.position.set(14, y);
      c.addChild(p);
      y += p.height + 1;
    }
    const h = y + 12;
    drawCard(bg, w, h, { fill: C.cardHi, accent: C.gold });
    return { c, h };
  }

  function cartaoBonus(w) {
    const c = new Container();
    const bg = new Graphics();
    const seq = game.state.sequencia.dias;
    const b = bonusDoDia(game);
    const t = txt(`Dia ${seq} da sequência`, C.text, 16, true);
    t.position.set(14, 12);
    c.addChild(bg, t);
    // os últimos 7 dias da sequência
    const pips = new Graphics();
    const naSemana = ((seq - 1) % 7) + 1;
    for (let i = 0; i < 7; i++) pips.circle(i * 18, 0, 6).fill(i < naSemana ? C.gold : 0x000000).stroke({ width: 1, color: C.gold, alpha: i < naSemana ? 1 : 0.4 });
    pips.position.set(20, 12 + t.height + 14);
    c.addChild(pips);
    const faltam = 7 - naSemana;
    const dica = txt(b.pacote ? 'Hoje tem pacote de materiais!' : faltam === 0 ? 'Amanhã a sequência reinicia o ciclo' : `Pacote de materiais em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`, b.pacote ? C.good : C.dim, 11);
    dica.position.set(14, pips.y + 14);
    c.addChild(dica);
    const y = dica.y + dica.height + 8;
    const coletado = game.state.diario.bonusColetado;
    const btn = labelButton(coletado ? '✓ Bônus de hoje coletado' : `Coletar bônus: ${fmt(b.ouro)} ouro`, w - 28, 44, { tint: coletado ? C.dim : C.gold, size: 14 });
    btn.position.set(14, y);
    if (coletado) btn.setDisabled(true);
    btn.tap(() => {
      const r = coletarBonus(game);
      if (r.ok) { sfx.levelUp(); toast?.(r.linhas.join(' · '), C.gold); }
    });
    c.addChild(btn);
    reg('bonus', btn, w - 28, 44);
    const h = y + 44 + 14;
    drawCard(bg, w, h, { fill: C.cardHi, accent: coletado ? C.faint : C.gold });
    return { c, h };
  }

  function cartaoEspecial(w) {
    const e = game.state.diario.especial;
    if (!e || !game.data.aventureiros[e.adv]) return null;
    const adv = game.data.aventureiros[e.adv];
    const item = game.data.itens[e.item];
    const c = new Container();
    const bg = new Graphics();
    const p = portraitSprite(e.adv, 48);
    p.position.set(12, 12);
    const t = txt('Aventureiro especial do dia', C.dim, 11, true);
    t.position.set(70, 12);
    const n = txt(adv.nome, C.text, 15, true);
    n.position.set(70, 12 + t.height + 1);
    const status = e.atendido ? '✓ Atendido hoje' : e.visitou ? 'Já passou por aqui hoje' : 'Vai aparecer em algum momento do dia';
    const pedido = para(`Pede: ${item.nome}. Atenda bem e ele paga a mais.`, C.accent, 12, w - 84, { bold: true });
    pedido.position.set(70, n.y + n.height + 3);
    const s = txt(status, e.atendido ? C.good : C.dim, 11);
    s.position.set(70, pedido.y + pedido.height + 3);
    c.addChild(bg, p, t, n, pedido, s);
    const h = Math.max(72, s.y + s.height + 12);
    drawCard(bg, w, h, { fill: C.card, accent: e.atendido ? C.good : C.accent });
    return { c, h };
  }

  function linhaEncomenda(w, enc, i) {
    const item = game.data.itens[enc.item];
    const c = new Container();
    const bg = new Graphics();
    const ic = iconSprite('item', enc.item, 36);
    ic.position.set(12, 14);
    const min = enc.qualidadeMin > 0 ? ` (${game.data.meta.qualidades[enc.qualidadeMin].nome}+)` : '';
    const nome = txt(`${item.nome} ×${enc.qtd}${min}`, enc.entregue ? C.faint : C.text, 14, true);
    nome.position.set(58, 10);
    const tem = unidadesParaEncomenda(game, enc);
    const sub = txt(enc.entregue ? 'Entregue ✓' : `Você tem ${Math.min(tem, 99)}/${enc.qtd} · +${fmt(enc.ouro)} ouro · +${enc.rep} reputação`, enc.entregue ? C.good : tem >= enc.qtd ? C.good : C.dim, 11);
    sub.position.set(58, 10 + nome.height + 2);
    c.addChild(bg, ic, nome, sub);
    const bw = 84;
    if (!enc.entregue) {
      const pode = podeEntregar(game, enc);
      const b = labelButton('Entregar', bw, 34, { tint: pode ? C.good : C.dim, size: 12 });
      b.position.set(w - bw - 12, 38);
      if (!pode) { b.paint({ alpha: 0.05 }); b.label.style.fill = C.faint; }
      b.tap(() => { const r = entregarEncomenda(game, i); if (!r.ok) { sfx.deny(); toast?.('Faltam itens (ou qualidade) nas prateleiras', C.bad); } });
      c.addChild(b);
      reg(`entregar:${i}`, b, bw, 34);
    }
    const h = 78;
    drawCard(bg, w, h, { fill: C.card, fillAlpha: enc.entregue ? 0.55 : 1, radius: 12 });
    return { c, h };
  }

  function cartaoSemana(w) {
    const s = game.state.semanal;
    const c = new Container();
    const bg = new Graphics();
    const t = txt(`Metas da semana (${metasCumpridas(game)}/${s.metas.length})`, C.text, 15, true);
    t.position.set(14, 12);
    c.addChild(bg, t);
    let y = 12 + t.height + 8;
    for (const m of s.metas) {
      const p = progressoMeta(game, m);
      const ok = metaCumprida(game, m);
      const x = txt(`${ok ? '✓ ' : ''}${textoMeta(game, m)}`, ok ? C.good : C.text, 12, true);
      x.position.set(14, y);
      const n = txt(`${fmt(Math.min(p, m.alvo))}/${fmt(m.alvo)}`, C.dim, 11);
      n.position.set(w - 14 - n.width, y + 1);
      const barra = new Graphics();
      barra.position.set(14, y + x.height + 3);
      barra.roundRect(0, 0, w - 28, 5, 2.5).fill({ color: 0x000000, alpha: 0.45 });
      if (p > 0) barra.roundRect(0, 0, Math.max(5, (w - 28) * Math.min(1, p / m.alvo)), 5, 2.5).fill(ok ? C.good : C.accent);
      c.addChild(x, n, barra);
      y += x.height + 16;
    }
    const n = metasCumpridas(game);
    const aberto = s.bauAberto;
    const btn = labelButton(aberto ? '✓ Baú da semana aberto' : n > 0 ? `Abrir o baú (${n} ${n === 1 ? 'meta' : 'metas'})` : 'Cumpra uma meta para abrir o baú', w - 28, 44, { tint: aberto || n === 0 ? C.dim : C.gold, size: 13 });
    btn.position.set(14, y + 2);
    if (aberto || n === 0) btn.setDisabled(true);
    btn.tap(() => {
      const r = abrirBau(game);
      if (r.ok) {
        sfx.levelUp();
        modal.open({ title: 'Baú da semana', build: (sc, ww) => { const l = para(r.linhas.join('\n'), C.text, 15, ww); sc.add(l, l.height); } });
      }
    });
    c.addChild(btn);
    reg('bau', btn, w - 28, 44);
    const h = y + 2 + 44 + 14;
    drawCard(bg, w, h, { fill: C.cardHi, accent: aberto ? C.faint : C.accent });
    return { c, h };
  }

  // ---------- coleção ----------
  const CELULA = 52;
  const espaco = 8;

  function barraFina(w, frac, cor) {
    const g = new Graphics();
    g.roundRect(0, 0, w, 8, 4).fill({ color: 0x000000, alpha: 0.25 });
    if (frac > 0) g.roundRect(0, 0, Math.max(8, w * frac), 8, 4).fill(cor);
    return g;
  }

  function cartaoResumoColecao(w) {
    const itens = game.data.listas.itens;
    const advs = game.data.listas.aventureiros.filter((a) => !a.lendario);
    const col = game.state.colecao;
    const a = itens.filter((i) => col.itens[i.id] !== undefined).length;
    const b = advs.filter((x) => col.aventureiros[x.id] !== undefined).length;
    const c = new Container();
    const bg = new Graphics();
    c.addChild(bg);
    let y = 12;
    for (const [nome, n, total, cor] of [['Itens descobertos', a, itens.length, C.accent], ['Aventureiros conhecidos', b, advs.length, C.gold]]) {
      const t = txt(nome, C.text, 14, true);
      t.position.set(14, y);
      const q = txt(`${n}/${total}`, C.dim, 13, true);
      q.position.set(w - 14 - q.width, y + 1);
      const barra = barraFina(w - 28, n / total, cor);
      barra.position.set(14, y + t.height + 5);
      c.addChild(t, q, barra);
      y += t.height + 5 + 8 + 12;
    }
    drawCard(bg, w, y + 2, { fill: C.cardHi });
    return { c, h: y + 2 };
  }

  // grade de células tocáveis: `celulas` = [{ chave, desenhar(container, tam), descoberto, ao tocar }]
  function grade(w, celulas) {
    const cols = Math.max(1, Math.floor((w + espaco) / (CELULA + espaco)));
    const folga = (w - (cols * CELULA + (cols - 1) * espaco)) / 2;
    const c = new Container();
    celulas.forEach((cel, i) => {
      const x = folga + (i % cols) * (CELULA + espaco);
      const y = Math.floor(i / cols) * (CELULA + espaco);
      const b = new Container();
      const bg = new Graphics();
      bg.roundRect(0, 0, CELULA, CELULA, 10).fill({ color: cel.descoberto ? C.cardHi : C.card, alpha: cel.descoberto ? 1 : 0.6 })
        .stroke({ width: 1, color: cel.cor ?? 0xffffff, alpha: cel.descoberto ? 0.55 : 0.08 });
      b.addChild(bg);
      cel.desenhar(b, CELULA);
      b.position.set(x, y);
      b.eventMode = 'static';
      b.cursor = 'pointer';
      b.hitArea = new Rectangle(0, 0, CELULA, CELULA);
      b.on('pointertap', () => { if (!wasDragged()) { sfx.tap(); cel.aoTocar(); } });
      reg(cel.chave, b, CELULA, CELULA);
      c.addChild(b);
    });
    const linhas = Math.ceil(celulas.length / cols);
    return { c, h: linhas * CELULA + Math.max(0, linhas - 1) * espaco };
  }

  const misterio = (b, tam) => {
    const q = txt('?', C.faint, 22, true);
    q.position.set((tam - q.width) / 2, (tam - q.height) / 2);
    b.addChild(q);
  };

  function detalheItem(item) {
    const col = game.state.colecao;
    const visto = col.itens[item.id] !== undefined;
    const rar = raridade(item.raridade);
    modal.open({
      title: visto ? item.nome : '???',
      build: (sc, w) => {
        if (!visto) {
          const p = para(`Ainda não descoberto. Tenha este item na loja (produzido, comprado ou recebido) para ver os detalhes. Categoria: ${categoria(item.cat).nome}.`, C.dim, 14, w);
          sc.add(p, p.height);
          return;
        }
        const topo = new Container();
        const ic = iconSprite('item', item.id, 64);
        const nome = txt(categoria(item.cat).nome, C.dim, 13, true);
        nome.position.set(80, 6);
        const rr = txt(rar.nome, rar.cor, 14, true);
        rr.position.set(80, 6 + nome.height + 2);
        const v = txt(`Valor de referência: ${fmt(item.valor)} ouro`, C.text, 13, true);
        v.position.set(80, rr.y + rr.height + 4);
        topo.addChild(ic, nome, rr, v);
        sc.add(topo, 72);
        const vendidos = para(`Vendido ${fmt(col.itens[item.id])} ${col.itens[item.id] === 1 ? 'vez' : 'vezes'}.`, C.dim, 13, w);
        sc.add(vendidos, vendidos.height);
        const receitas = game.data.listas.receitas.filter((r) => r.item === item.id);
        for (const r of receitas) {
          const of = game.data.meta.oficios.find((o) => o.id === r.oficio);
          const mats = Object.entries(r.materiais).map(([m, q]) => `${q} ${game.data.materiais[m].nome}`).join(', ');
          const p = para(`Receita (${of.nome}, nível ${r.nivel}): ${mats}`, C.text, 13, w);
          sc.add(p, p.height);
        }
        if ((item.nivelRep ?? 1) > 1) {
          const p = para(`Passa a ser pedido com reputação ${item.nivelRep}.`, C.faint, 12, w);
          sc.add(p, p.height);
        }
      },
    });
  }

  function detalheAventureiro(adv) {
    const col = game.state.colecao;
    const visto = col.aventureiros[adv.id] !== undefined;
    modal.open({
      title: visto ? adv.nome : '???',
      build: (sc, w) => {
        if (!visto) {
          const p = para(`Ainda não visitou a sua loja. Ele aparece com reputação ${adv.nivelRep ?? 1}, vindo de ${game.data.regioes[adv.regiao].nome}.`, C.dim, 14, w);
          sc.add(p, p.height);
          return;
        }
        const cl = classe(adv.classe);
        const topo = new Container();
        const ret = portraitSprite(adv.id, 64);
        const k = txt(cl.nome, cl.cor, 14, true);
        k.position.set(80, 6);
        const t = txt(`Temperamento: ${temperamento(adv.temperamento).nome}`, C.text, 13, true);
        t.position.set(80, 6 + k.height + 4);
        const rg = txt(`Vem de: ${game.data.regioes[adv.regiao].nome}`, C.dim, 12);
        rg.position.set(80, t.y + t.height + 3);
        topo.addChild(ret, k, t, rg);
        sc.add(topo, 72);
        const gosta = para(`Costuma procurar: ${adv.prefere.map((c) => categoria(c).nome.toLowerCase()).join(', ')}.`, C.text, 13, w);
        sc.add(gosta, gosta.height);
        const n = col.aventureiros[adv.id];
        const at = para(`Atendido ${fmt(n)} ${n === 1 ? 'vez' : 'vezes'}.`, C.dim, 13, w);
        sc.add(at, at.height);
        const fala = adv.falas?.chega?.[0];
        if (fala) {
          const f = para(`"${fala}"`, C.accent, 13, w);
          sc.add(f, f.height);
        }
      },
    });
  }

  function colecao(w, add) {
    const col = game.state.colecao;
    add(cartaoResumoColecao(w));
    add(secao('Itens'));
    for (const cat of game.data.meta.categorias) {
      const lista = game.data.listas.itens.filter((i) => i.cat === cat.id);
      const n = lista.filter((i) => col.itens[i.id] !== undefined).length;
      add(secao(`${cat.nome} · ${n}/${lista.length}`));
      add(grade(w, lista.map((item) => {
        const visto = col.itens[item.id] !== undefined;
        return {
          chave: `item:${item.id}`, descoberto: visto, cor: raridade(item.raridade).cor,
          desenhar: (b, tam) => {
            if (!visto) return misterio(b, tam);
            const ic = iconSprite('item', item.id, 36);
            ic.position.set((tam - 36) / 2, (tam - 36) / 2);
            b.addChild(ic);
          },
          aoTocar: () => detalheItem(item),
        };
      })));
    }
    add(secao('Aventureiros'));
    for (const cl of game.data.meta.classes) {
      const lista = game.data.listas.aventureiros.filter((a) => !a.lendario && a.classe === cl.id);
      const n = lista.filter((a) => col.aventureiros[a.id] !== undefined).length;
      add(secao(`${cl.nome} · ${n}/${lista.length}`));
      add(grade(w, lista.map((adv) => {
        const visto = col.aventureiros[adv.id] !== undefined;
        return {
          chave: `adv:${adv.id}`, descoberto: visto, cor: cl.cor,
          desenhar: (b, tam) => {
            if (!visto) return misterio(b, tam);
            const r = portraitSprite(adv.id, 40);
            r.position.set((tam - 40) / 2, (tam - 40) / 2);
            b.addChild(r);
          },
          aoTocar: () => detalheAventureiro(adv),
        };
      })));
    }
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
      for (const sz of sazonaisAtivos(game)) add(cartaoSazonal(w, sz));
      add(cartaoBonus(w));
      const esp = cartaoEspecial(w);
      if (esp) add(esp);
      add(secao('Encomendas de hoje (novas à meia-noite)'));
      game.state.diario.encomendas.forEach((enc, i) => add(linhaEncomenda(w, enc, i)));
      add(cartaoSemana(w));
    } else {
      colecao(w, add);
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
      nomes: () => Object.keys(refs),
      retangulo: (nome) => retanguloGlobal(refs[nome]),
      irParaSub: (id) => { if (sub !== id) { sub = id; marcar(); } },

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
