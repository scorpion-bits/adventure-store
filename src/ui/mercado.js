// Tela do Mercado: o depósito (o que você tem) e os fornecedores do dia, com preço e estoque que mudam à meia-noite.
// A lógica está em core/market.js; aqui só desenho e toques.
import { Container, Graphics } from 'pixi.js';
import { C, txt, para, drawCard, createScroll, labelButton } from './ui.js';
import { iconSprite } from '../assets.js';
import { ofertas, comprar, maxCompravel, deposito, fornecedorDisponivel } from '../core/market.js';
import { fmt } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const ROW_H = 78;

export function createMercadoScreen({ game, toast }) {
  const root = new Container();
  const scroll = createScroll(300);
  root.addChild(scroll.root);

  let R = { x: 0, y: 0, w: 360, h: 600 };
  let dirty = true;
  let quadros = 0;
  const refs = {};     // `${fornecedor}:${material}:${tipo}` -> { c, w, h }
  const marcar = () => { dirty = true; };
  for (const ev of ['ouro', 'materiais', 'estoque', 'dia', 'rep']) game.on(ev, marcar);

  function cartaoDeposito(w) {
    const c = new Container();
    const bg = new Graphics();
    const lista = deposito(game);
    const titulo = txt('Depósito', C.text, 16, true);
    titulo.position.set(14, 12);
    c.addChild(bg, titulo);
    let y = 12 + titulo.height + 8;
    if (!lista.length) {
      const t = para('Vazio. Compre materiais dos fornecedores abaixo para produzir na Oficina.', C.dim, 13, w - 28);
      t.position.set(14, y);
      c.addChild(t);
      y += t.height;
    } else {
      const cell = 62;
      const per = Math.max(1, Math.floor((w - 20) / cell));
      lista.forEach((m, i) => {
        const x = 12 + (i % per) * cell;
        const yy = y + Math.floor(i / per) * 60;
        const ic = iconSprite('material', m.id, 32);
        ic.position.set(x + (cell - 32) / 2 - 2, yy);
        const n = txt(`${fmt(m.qtd)}`, C.text, 12, true);
        n.position.set(x + (cell - n.width) / 2 - 2, yy + 34);
        c.addChild(ic, n);
      });
      y += Math.ceil(lista.length / per) * 60;
    }
    const h = y + 12;
    drawCard(bg, w, h, { fill: C.cardHi, accent: C.accent });
    return { c, h };
  }

  function botaoCompra(rotulo, w, o, f, tipo) {
    const n = tipo === 'x1' ? 1 : tipo === 'x5' ? 5 : maxCompravel(game, o);
    const pode = tipo === 'max' ? n > 0 : o.restante > 0;
    const b = labelButton(tipo === 'max' && n > 0 ? `${rotulo} (${n})` : rotulo, w, 32, { size: 12, tint: pode ? C.accent : C.dim });
    if (!pode) b.setDisabled(true);
    b.tap(() => {
      const r = comprar(game, f.id, o.material, n);
      if (r.ok) {
        sfx.buy();
        haptic(8);
        toast(`−${fmt(r.custo)} ouro · +${r.qtd} ${o.nome}`, C.accent);
      } else {
        sfx.deny();
        toast(r.motivo === 'sem-ouro' ? 'Ouro insuficiente' : 'Sem estoque no fornecedor', C.bad);
      }
    });
    return b;
  }

  function linha(w, f, o) {
    const c = new Container();
    const bg = new Graphics();
    drawCard(bg, w, ROW_H, { fill: C.card, radius: 12 });
    const ic = iconSprite('material', o.material, 36);
    ic.position.set(10, 10);
    const nome = txt(o.nome, C.text, 14, true);
    nome.position.set(54, 9);
    const preco = txt(`${fmt(o.preco)} ouro`, o.tendencia < 0 ? C.good : o.tendencia > 0 ? C.warn : C.gold, 14, true);
    preco.position.set(w - preco.width - 12, 9);
    const sub = txt(`${o.restante > 0 ? `Estoque ${fmt(o.restante)}` : 'Esgotado hoje'} · você tem ${fmt(game.state.materiais[o.material] ?? 0)}`, o.restante > 0 ? C.dim : C.bad, 11);
    sub.position.set(54, 9 + nome.height + 1);
    c.addChild(bg, ic, nome, preco, sub);
    if (o.tendencia !== 0) {
      const tag = txt(o.tendencia < 0 ? 'promoção' : 'em alta', o.tendencia < 0 ? C.good : C.warn, 10, true);
      tag.position.set(w - tag.width - 12, 9 + preco.height);
      c.addChild(tag);
    }
    const bw = Math.min(70, (w - 54 - 12 - 12) / 3);
    [['+1', 'x1'], ['+5', 'x5'], ['Máx', 'max']].forEach(([rot, tipo], i) => {
      const b = botaoCompra(rot, bw, o, f, tipo);
      b.position.set(w - 12 - (3 - i) * bw - (2 - i) * 6, ROW_H - 38);
      c.addChild(b);
      refs[`${f.id}:${o.material}:${tipo}`] = { c: b, w: bw, h: 32 };
    });
    return { c, h: ROW_H };
  }

  function cartaoFornecedor(w, f) {
    const out = [];
    const c = new Container();
    const t = txt(f.nome, C.text, 15, true);
    t.position.set(2, 0);
    const d = para(f.desc, C.dim, 12, w - 4);
    d.position.set(2, t.height + 1);
    c.addChild(t, d);
    out.push({ c, h: t.height + d.height + 5 });
    for (const o of ofertas(game, f)) out.push(linha(w, f, o));
    return out;
  }

  function cartaoBloqueado(w, f) {
    const c = new Container();
    const bg = new Graphics();
    const regiao = game.data.regioes[f.regiao];
    const nivel = Math.max(f.nivelRep ?? 1, regiao?.nivelRep ?? 1);
    const t = txt(f.nome, C.dim, 14, true);
    t.position.set(14, 10);
    const s = txt(`Abre com reputação ${nivel}${regiao && regiao.id !== 'vila' ? ` · ${regiao.nome}` : ''}`, C.faint, 12);
    s.position.set(14, 10 + t.height + 2);
    const h = s.y + s.height + 10;
    drawCard(bg, w, h, { fill: C.card, fillAlpha: 0.55, shadow: false });
    c.addChild(bg, t, s);
    c.alpha = 0.85;
    return { c, h };
  }

  function render() {
    dirty = false;
    quadros = 0;
    for (const k of Object.keys(refs)) delete refs[k];
    const keepY = scroll.scrollY;
    scroll.clear();
    const w = R.w;

    const dep = cartaoDeposito(w);
    scroll.add(dep.c, dep.h);
    const aviso = txt('Preços e estoques mudam à meia-noite (horário do seu aparelho).', C.faint, 11);
    scroll.add(aviso, aviso.height);

    const todos = game.data.listas.fornecedores;
    for (const f of todos.filter((x) => fornecedorDisponivel(game, x))) {
      for (const it of cartaoFornecedor(w, f)) scroll.add(it.c, it.h);
    }
    const trancados = todos.filter((x) => !fornecedorDisponivel(game, x));
    if (trancados.length) {
      const h = txt('Em breve', C.dim, 12, true);
      scroll.add(h, h.height);
      for (const f of trancados) { const b = cartaoBloqueado(w, f); scroll.add(b.c, b.h); }
    }
    scroll.resize(R.h, w);
    scroll.scrollBy(keepY);
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
    update() {
      if (!root.visible) return;
      if (dirty) render();
      else quadros += 1;
    },
    hooks: {
      pronta: () => !dirty && quadros >= 2,
      botaoCentro: (fornecedor, material, tipo) => global(refs[`${fornecedor}:${material}:${tipo}`]),
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
