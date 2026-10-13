// Tela do Mercado: o depósito (o que você tem) e os fornecedores do dia, com preço que muda todo dia e estoque que chega aos poucos.
// A lógica está em core/market.js; aqui só desenho e toques.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, createScroll, labelButton, wasDragged, retanguloGlobal, iconeComNome } from './ui.js';
import { montarMapa, pintarMapa } from './mapa.js';
import { createMinijogo } from './minijogo.js';
import { createCodigo } from './codigo.js';
import { iconSprite } from '../assets.js';
import { ofertas, comprar, maxCompravel, deposito, fornecedorDisponivel, liberacaoAgora, INTERVALO_ESTOQUE_H } from '../core/market.js';
import { fmt } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const ROW_H = 84;

export function createMercadoScreen({ game, toast, modal }) {
  const root = new Container();
  const scroll = createScroll(300);
  root.addChild(scroll.root);

  let R = { x: 0, y: 0, w: 360, h: 600 };
  let dirty = true;
  let quadros = 0;
  const refs = {};     // `${fornecedor}:${material}:${tipo}` -> { c, w, h }
  let sub = 'fornecedores';
  let estoqueVisto = 0;
  let fracaoVista = liberacaoAgora(game).f;
  let barras = [];     // progresso das expedições
  let tempos = [];
  let relogio = 0;
  const marcar = () => { dirty = true; };
  // os dois mini-jogos aparecem um embaixo do outro; só uma partida de cada vez
  const minijogo = createMinijogo({ game, toast, pedirRender: () => marcar(), outroEmJogo: () => codigo.emJogo() });
  const codigo = createCodigo({ game, toast, pedirRender: () => marcar(), outroEmJogo: () => minijogo.emJogo() });
  for (const ev of ['ouro', 'materiais', 'estoque', 'dia', 'rep', 'expedicao', 'expedicaoColetada', 'mods']) game.on(ev, marcar);
  game.on('expedicaoPronta', (e) => {
    sfx.ready();
    toast(`Os batedores voltaram de ${game.data.regioes[e.regiao]?.nome ?? 'viagem'}!`, C.good);
    marcar();
  });

  // abas internas: Fornecedores | Mapa
  function barraSub(w) {
    const c = new Container();
    const gap = 6;
    const itens = [{ id: 'fornecedores', nome: 'Fornecedores' }, { id: 'mapa', nome: 'Mapa' }, { id: 'minijogo', nome: 'Mini-jogos' }];
    const cw = (w - gap * (itens.length - 1)) / itens.length;
    itens.forEach((it, i) => {
      const b = new Container();
      const bg = new Graphics();
      const on = it.id === sub;
      bg.roundRect(0, 0, cw, 38, 12).fill({ color: on ? C.accent : C.card, alpha: on ? 0.22 : 1 }).stroke({ width: 1, color: on ? C.accent : 0xffffff, alpha: on ? 0.8 : 0.1 });
      const t = txt(it.nome, on ? C.text : C.dim, 12, true);
      t.position.set((cw - t.width) / 2, (38 - t.height) / 2);
      b.addChild(bg, t);
      b.position.set(i * (cw + gap), 0);
      b.eventMode = 'static';
      b.cursor = 'pointer';
      b.hitArea = new Rectangle(0, 0, cw, 38);
      b.on('pointertap', () => { if (!wasDragged() && sub !== it.id) { sub = it.id; sfx.tap(); marcar(); } });
      refs[`sub:${it.id}`] = { c: b, w: cw, h: 38 };
      c.addChild(b);
    });
    return { c, h: 38 };
  }

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
        const nomeM = game.data.materiais[m.id]?.nome ?? m.id;
        const ic = iconeComNome('material', m.id, 32, () => toast(`${nomeM}: ${fmt(m.qtd)} no depósito`, C.dim), { w: 40, h: 52 });
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

  // `urgente`: o estoque normal acabou; a reserva urgente custa mais (botões em laranja)
  function botaoCompra(rotulo, w, o, f, tipo, urgente) {
    const n = tipo === 'x1' ? 1 : tipo === 'x5' ? 5 : maxCompravel(game, o, urgente);
    const disp = urgente ? o.urgente : o.restante;
    const pode = tipo === 'max' ? n > 0 : disp > 0;
    const b = labelButton(tipo === 'max' && n > 0 ? `${rotulo} (${n})` : rotulo, w, 38, { size: 12, tint: !pode ? C.dim : urgente ? C.bad : C.accent });
    if (!pode) b.setDisabled(true);
    b.tap(() => {
      const r = comprar(game, f.id, o.material, n, { urgente });
      if (r.ok) {
        sfx.buy();
        haptic(8);
        toast(`−${fmt(r.custo)} ouro · +${r.qtd} ${o.nome}`, urgente ? C.bad : C.accent);
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
    const urgente = o.restante <= 0 && o.urgente > 0;
    drawCard(bg, w, ROW_H, { fill: C.card, radius: 12 });
    const ic = iconSprite('material', o.material, 36);
    ic.position.set(10, 10);
    const nome = txt(o.nome, C.text, 14, true);
    nome.position.set(54, 9);
    const precoMostrado = urgente ? o.precoUrgente : o.preco;
    const preco = txt(`${fmt(precoMostrado)} ouro`, urgente ? C.bad : o.tendencia < 0 ? C.good : o.tendencia > 0 ? C.warn : C.gold, 14, true);
    preco.position.set(w - preco.width - 12, 9);
    const tem = fmt(game.state.materiais[o.material] ?? 0);
    const { proximaHora } = liberacaoAgora(game);
    const estoque = o.restante > 0 ? `Estoque ${fmt(o.restante)}`
      : urgente ? `Acabou${proximaHora !== null ? ` · mais às ${proximaHora}h` : ''}`
        : 'Esgotado hoje';
    const sub = txt(`${estoque} · você tem ${tem}`, o.restante > 0 ? C.dim : urgente ? C.bad : C.bad, 11);
    sub.position.set(54, 9 + nome.height + 1);
    c.addChild(bg, ic, nome, preco, sub);
    if (urgente) {
      const tag = txt(`urgente 2× · ${fmt(o.urgente)} un.`, C.bad, 10, true);
      tag.position.set(w - tag.width - 12, 9 + preco.height);
      c.addChild(tag);
    } else if (o.tendencia !== 0) {
      const tag = txt(o.tendencia < 0 ? 'promoção' : 'em alta', o.tendencia < 0 ? C.good : C.warn, 10, true);
      tag.position.set(w - tag.width - 12, 9 + preco.height);
      c.addChild(tag);
    }
    const bw = Math.min(70, (w - 54 - 12 - 12) / 3);
    [['+1', 'x1'], ['+5', 'x5'], ['Máx', 'max']].forEach(([rot, tipo], i) => {
      const b = botaoCompra(rot, bw, o, f, tipo, urgente);
      b.position.set(w - 12 - (3 - i) * bw - (2 - i) * 6, ROW_H - 44);
      c.addChild(b);
      refs[`${f.id}:${o.material}:${tipo}`] = { c: b, w: bw, h: 38 };
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

    barras = [];
    tempos = [];
    const sb = barraSub(w);
    scroll.add(sb.c, sb.h);

    if (sub === 'minijogo') {
      const reg = (nome, c, ww, hh) => { refs[nome] = { c, w: ww, h: hh }; };
      // os dois jogos ficam um embaixo do outro; enquanto um está em partida (ou mostrando o resultado), só ele aparece
      const emUm = (j) => j.hooks.fase() !== 'lobby';
      if (!emUm(codigo)) minijogo.montar(scroll, w, reg);
      if (!emUm(minijogo)) codigo.montar(scroll, w, reg);
    } else if (sub === 'mapa') {
      montarMapa(scroll, { game, w, reg: (nome, c, ww, hh) => { refs[nome] = { c, w: ww, h: hh }; }, toast, modal, tempos, barras });
    } else {
      const dep = cartaoDeposito(w);
      scroll.add(dep.c, dep.h);
      const aviso = para(`O estoque chega aos poucos, a cada ${INTERVALO_ESTOQUE_H} horas (horário do seu aparelho), e o preço muda à meia-noite. Acabou? A compra urgente custa o dobro.`, C.faint, 11, w);
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
    }
    scroll.resize(R.h, w);
    scroll.scrollBy(keepY);
    pintarMapa(game, barras, tempos);
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
    update(dt = 16) {
      if (!root.visible) return;
      if (dirty) { render(); return; }
      quadros += 1;
      relogio += dt;
      // chegou a hora de mais estoque dos fornecedores: refaz a lista
      estoqueVisto += dt;
      if (estoqueVisto > 5000) { estoqueVisto = 0; const f = liberacaoAgora(game).f; if (f !== fracaoVista) { fracaoVista = f; marcar(); } }
      if (sub === 'minijogo') { minijogo.update(dt); codigo.update(dt); }
      if (relogio >= 250) { relogio = 0; if (barras.length || tempos.length) pintarMapa(game, barras, tempos); }
    },
    hooks: {
      pronta: () => !dirty && quadros >= 2,
      sub: () => sub,
      minijogo: minijogo.hooks,
      codigo: codigo.hooks,
      ofertas: (fornecedorId) => ofertas(game, game.data.fornecedores[fornecedorId]),
      nomes: () => Object.keys(refs),
      retangulo: (nome) => retanguloGlobal(refs[nome]),
      irParaSub: (id) => { if (sub !== id) { sub = id; marcar(); } },

      botaoCentro: (fornecedor, material, tipo) => global(refs[`${fornecedor}:${material}:${tipo}`]),
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
