// Tela da Loja: a cena (prateleiras com o estoque de verdade e a fila no balcão) e o atendimento
// (cliente, o que oferecer, os três preços). A lógica está em core/shop.js; aqui só desenho e toques.
import { Container, Graphics } from 'pixi.js';
import { C, txt, para, drawCard, createScroll, labelButton, makeButton, wasDragged, lighten } from './ui.js';
import { iconSprite, portraitSprite } from '../assets.js';
import { opcoes, avaliar, vender, dispensar, passarNaFrente, pedidoTexto, adventureiro, temperamentoDe } from '../core/shop.js';
import { classe } from '../data/index.js';
import { fmt } from '../format.js';
import { temaAtual } from '../core/upgrades.js';
import { capacidadeEstoque, totalEstoque } from '../core/estoque.js';
import { descreverEfeito } from '../core/mods.js';
import { sazonaisAtivos } from '../core/seasons.js';
import { fmtTime } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const NIVEIS = [
  { id: 'barato', nome: 'Barato', cor: C.info },
  { id: 'justo', nome: 'Justo', cor: C.good },
  { id: 'caro', nome: 'Caro', cor: C.gold },
];
const COR_REACAO = { adora: C.good, aceita: 0xb7d68a, hesita: C.warn, recusa: C.bad };
const sinal = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');

export function createLojaScreen({ game, toast }) {
  const root = new Container();
  const sceneHolder = new Container();
  const scroll = createScroll(300);
  root.addChild(sceneHolder, scroll.root);

  let R = { x: 0, y: 0, w: 360, h: 600 };
  let sel = null;            // chave do estoque escolhida para oferecer
  let resultado = null;      // última venda/recusa (aparece no topo do atendimento)
  let dirty = true;
  let quadros = 0;           // quadros desenhados desde o último render() (o Pixi só atualiza as posições de toque ao desenhar)
  let bars = [];             // barras de paciência atualizadas a cada quadro
  let tempos = [];           // textos de tempo restante dos bônus
  const refs = { precos: {}, fila: [], opcoes: [], frente: null, dispensar: null };
  const marcar = () => { dirty = true; };

  for (const ev of ['fila', 'estoque', 'venda', 'recusa', 'dispensou', 'saiu', 'bonus']) game.on(ev, marcar);
  game.on('chegou', () => { sfx.bell(); marcar(); });
  game.on('atendente', (r) => {
    const nome = adventureiro(game, r.cli).nome;
    if (r.ok) toast(`Atendente: ${nome} comprou por ${fmt(r.preco)}`, C.good);
    else if (r.ok === false && r.motivo === 'recusou') toast(`Atendente: ${nome} recusou`, C.warn);
    else toast(`Atendente dispensou ${nome} (sem estoque)`, C.warn);
    marcar();
  });
  game.on('saiu', ({ cli }) => {
    toast(`${adventureiro(game, cli).nome} cansou de esperar`, C.bad);
    sfx.deny();
  });

  // ---------- cena ----------
  function buildScene(w, h) {
    const c = new Container();
    const bg = new Graphics();
    const cor = temaAtual(game).cores;
    const floorY = Math.round(h * 0.5);
    bg.roundRect(0, 0, w, h, 14).fill(cor.parede);
    bg.rect(0, floorY, w, h - floorY - 14).fill(cor.piso);
    bg.roundRect(0, h - 30, w, 30, 14).fill(cor.piso);
    bg.roundRect(0, 0, w, h, 14).stroke({ width: 1, color: 0xffffff, alpha: 0.09 });
    c.addChild(bg);

    // prateleiras
    const slots = Object.entries(game.state.estoque).filter(([, q]) => q > 0);
    const rows = floorY >= 110 ? 2 : 1;
    const rowH = (floorY - 14) / rows;
    const cols = Math.max(1, Math.floor((w - 24) / 36));
    const cap = rows * cols;
    const lista = slots.length > cap ? slots.slice(0, cap - 1) : slots;
    for (let r = 0; r < rows; r++) {
      const boardY = 10 + rowH * (r + 1) - 4;
      const g = new Graphics();
      g.roundRect(8, boardY, w - 16, 5, 2).fill(cor.prateleira);
      g.rect(8, boardY + 4, w - 16, 2).fill({ color: 0x000000, alpha: 0.25 });
      c.addChild(g);
    }
    lista.forEach(([chave, qtd], i) => {
      const r = Math.floor(i / cols);
      const col = i % cols;
      const ic = iconSprite('item', chave.split(':')[0], 28);
      ic.position.set(12 + col * 36, 10 + rowH * (r + 1) - 4 - 28);
      c.addChild(ic);
      if (qtd > 1) {
        const q = txt(`${qtd}`, C.text, 10, true);
        q.position.set(ic.x + 28 - q.width, ic.y + 28 - q.height + 1);
        const qb = new Graphics().roundRect(q.x - 2, q.y, q.width + 4, q.height, 3).fill({ color: 0x000000, alpha: 0.6 });
        c.addChild(qb, q);
      }
    });
    if (slots.length > lista.length) {
      const more = txt(`+${slots.length - lista.length}`, C.dim, 12, true);
      more.position.set(12 + (cap - 1) % cols * 36 + 4, 10 + rowH * rows - 4 - 22);
      c.addChild(more);
    }
    const capTxt = txt(`Prateleiras ${totalEstoque(game)}/${capacidadeEstoque(game)}`, totalEstoque(game) >= capacidadeEstoque(game) ? C.warn : C.faint, 10, true);
    capTxt.position.set(w - capTxt.width - 12, 4);
    c.addChild(capTxt);
    if (!slots.length) {
      const vazio = txt('Prateleiras vazias!', C.warn, 13, true);
      vazio.position.set((w - vazio.width) / 2, floorY / 2 - vazio.height / 2);
      c.addChild(vazio);
    }

    // fila no balcão: o primeiro (maior) é atendido
    const fila = game.state.fila;
    refs.fila = [];
    const counterY = h - 34;
    const n = fila.length;
    const big = Math.min(64, h - floorY - 20);
    const small = Math.round(big * 0.75);
    const step = n > 1 ? Math.min(small + 4, (w - 24 - big - 8) / (n - 1)) : 0;
    fila.forEach((cli, i) => {
      const size = i === 0 ? big : small;
      const x = i === 0 ? 14 : 14 + big + 8 + (i - 1) * step;
      const y = counterY - size + 14;
      const p = new Container();
      const spr = portraitSprite(cli.adv, size);
      p.addChild(spr);
      p.position.set(x, y);
      p.eventMode = 'static';
      p.cursor = i === 0 ? 'default' : 'pointer';
      p.hitArea = { contains: (px, py) => px >= 0 && py >= 0 && px <= size && py <= size };
      if (i > 0) p.on('pointertap', () => { if (!wasDragged()) { passarNaFrente(game, cli.uid); sfx.tap(); } });
      const bar = new Graphics();
      bar.position.set(x, y - 7);
      c.addChild(p, bar);
      bars.push({ g: bar, cli, w: size });
      refs.fila.push({ cli, c: p, size });
    });
    // balcão (cobre os pés dos clientes)
    const counter = new Graphics();
    counter.roundRect(6, counterY, w - 12, 20, 4).fill(cor.balcao);
    counter.roundRect(6, counterY, w - 12, 4, 2).fill(lighten(cor.balcao, 0.3));
    c.addChild(counter);
    if (!n) {
      const vazio = txt('Nenhum cliente por enquanto…', C.dim, 13);
      vazio.position.set((w - vazio.width) / 2, floorY + (counterY - floorY) / 2 - vazio.height / 2);
      c.addChild(vazio);
    } else if (n > 1) {
      const dica = txt('toque num cliente para atendê-lo primeiro', C.faint, 10);
      dica.position.set(w - dica.width - 10, h - 15);
      c.addChild(dica);
    }
    return c;
  }

  // resumo da loja (aparece embaixo da cena quando a tela é larga)
  function buildStats(w) {
    const c = new Container();
    const bg = new Graphics();
    const st = game.state.stats;
    const linhas = [
      ['Vendas', fmt(st.vendas)],
      ['Clientes que foram embora', fmt(st.recusas)],
      ['Ouro ganho no total', fmt(st.ouroTotal)],
    ];
    let y = 12;
    c.addChild(bg);
    for (const [nome, valor] of linhas) {
      const a = txt(nome, C.dim, 13);
      const b = txt(valor, C.text, 14, true);
      a.position.set(14, y);
      b.position.set(w - 14 - b.width, y - 1);
      c.addChild(a, b);
      y += 26;
    }
    drawCard(bg, w, y + 4, { fill: C.card });
    return c;
  }

  // ---------- atendimento ----------
  function barraPaciencia(w, cli, y) {
    const g = new Graphics();
    g.position.set(12, y);
    bars.push({ g, cli, w: w - 24, alta: true });
    return g;
  }

  function cartaoResultado(w) {
    const c = new Container();
    const bg = new Graphics();
    const cor = resultado.ok === true ? C.good : resultado.ok === false ? C.bad : C.dim;
    const t = para(resultado.texto, cor, 14, w - 28, { bold: true });
    t.position.set(14, 10);
    let y = 10 + t.height + 4;
    c.addChild(bg, t);
    if (resultado.fala) {
      const f = para(`“${resultado.fala}”`, C.dim, 13, w - 28);
      f.position.set(14, y);
      c.addChild(f);
      y += f.height + 4;
    }
    const h = y + 8;
    drawCard(bg, w, h, { fill: C.cardHi, accent: cor });
    return { c, h };
  }

  function cartaoCliente(w, cli) {
    const adv = adventureiro(game, cli);
    const temp = temperamentoDe(game, cli);
    const cls = classe(adv.classe);
    const c = new Container();
    const bg = new Graphics();
    const p = portraitSprite(cli.adv, 64);
    p.position.set(12, 12);
    const nome = txt(adv.nome, C.text, 16, true);
    nome.position.set(88, 12);
    const lendaTxt = cli.lenda ? ` · Lenda, capítulo ${cli.lenda.cap + 1}` : '';
    const sub = txt(`${cls.nome} · ${temp.nome}${lendaTxt}`, cli.lenda ? C.gold : C.dim, 12);
    sub.position.set(88, 12 + nome.height + 1);
    c.addChild(bg, p, nome, sub);
    let y = Math.max(sub.y + sub.height + 6, 12 + 64 + 6);
    if (cli.fala) {
      const f = para(`“${cli.fala}”`, C.dim, 13, w - 24);
      f.position.set(12, y);
      c.addChild(f);
      y += f.height + 6;
    }
    const pedido = para(pedidoTexto(game, cli), C.accent, 15, w - 24, { bold: true });
    pedido.position.set(12, y);
    c.addChild(pedido);
    y += pedido.height + 8;
    c.addChild(barraPaciencia(w, cli, y));
    y += 5 + 12;
    drawCard(bg, w, y, { fill: C.card, accent: cls.cor });
    return { c, h: y };
  }

  function linhasOpcoes(w, ops) {
    const out = [];
    const cliLenda = !!game.state.fila[0]?.lenda;
    refs.opcoes = [];
    ops.forEach((o) => {
      const h = 54;
      const row = new Container();
      const bg = new Graphics();
      const on = o.chave === sel;
      drawCard(bg, w, h, { fill: on ? C.cardHi : C.card, border: on ? C.accent : 0xffffff, borderAlpha: on ? 0.9 : 0.09, radius: 12 });
      const ic = iconSprite('item', o.item.id, 34);
      ic.position.set(10, (h - 34) / 2);
      const q = game.data.meta.qualidades[o.qualidade];
      const nome = txt(o.item.nome, C.text, 14, true);
      nome.position.set(54, 9);
      const motivo = o.fraco ? ' · qualidade baixa: não avança a história' : o.substituto ? (cliLenda ? ' · substituto: não avança a história' : ' · substituto') : '';
      const sub = txt(`${q.nome}${motivo}`, o.substituto ? C.warn : C.dim, 11);
      sub.position.set(54, 9 + nome.height + 1);
      const qtd = txt(`×${o.qtd}`, C.dim, 13, true);
      qtd.position.set(w - qtd.width - 14, (h - qtd.height) / 2);
      row.addChild(bg, ic, nome, sub, qtd);
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointertap', () => { if (!wasDragged() && sel !== o.chave) { sel = o.chave; sfx.tick(); marcar(); } });
      refs.opcoes.push({ chave: o.chave, c: row, w, h });
      out.push({ c: row, h });
    });
    return out;
  }

  function linhaPrecos(w, cli, ops) {
    const entrada = ops.find((o) => o.chave === sel);
    const gap = 8;
    const bw = (w - gap * 2) / 3;
    const bh = 88;
    const row = new Container();
    refs.precos = {};
    NIVEIS.forEach((nv, i) => {
      const b = makeButton(bw, bh, { tint: nv.cor, radius: 12, alpha: entrada ? 0.16 : 0.05 });
      b.position.set(i * (bw + gap), 0);
      const t1 = txt(nv.nome, nv.cor, 14, true);
      t1.position.set((bw - t1.width) / 2, 8);
      b.addChild(t1);
      if (entrada) {
        const av = avaliar(game, cli, entrada, nv.id);
        const t2 = txt(`${fmt(av.preco)} ouro`, C.gold, 15, true);
        t2.position.set((bw - t2.width) / 2, 30);
        const t3 = txt(av.reacao.texto, COR_REACAO[av.reacao.id], 11, true);
        t3.position.set((bw - t3.width) / 2, 52);
        const t4 = txt(`${sinal(av.rep)} reputação`, C.dim, 10);
        t4.position.set((bw - t4.width) / 2, 68);
        b.addChild(t2, t3, t4);
        b.tap(() => vendeu(nv.id));
      } else {
        b.setDisabled(true);
      }
      row.addChild(b);
      refs.precos[nv.id] = { c: b, w: bw, h: bh };
    });
    return { c: row, h: bh };
  }

  function vendeu(nivel) {
    const cli = game.state.fila[0];
    if (!cli || !sel) return;
    const adv = adventureiro(game, cli);
    const r = vender(game, cli.uid, sel, nivel);
    if (r.ok) {
      resultado = { ok: true, texto: `${adv.nome} comprou ${r.item.nome} por ${fmt(r.preco)} ouro (${sinal(r.rep)} reputação)`, fala: r.fala };
      toast(`+${fmt(r.preco)} ouro`, C.gold);
      sfx.sell();
      haptic(12);
    } else if (r.motivo === 'recusou') {
      resultado = { ok: false, texto: `${adv.nome} recusou o preço (${sinal(r.rep)} reputação)`, fala: r.fala };
      sfx.deny();
    } else {
      return;
    }
    sel = null;
    marcar();
  }

  function dispensou() {
    const cli = game.state.fila[0];
    if (!cli) return;
    const adv = adventureiro(game, cli);
    const r = dispensar(game, cli.uid);
    resultado = { ok: null, texto: `Você dispensou ${adv.nome}${r.rep ? ` (${sinal(r.rep)} reputação)` : ''}`, fala: '' };
    sfx.tap();
    marcar();
  }

  // faixa de efeitos ativos (bônus de eventos): nome, o que faz e quanto tempo falta
  function faixaBonus(w) {
    const lista = game.state.bonus.filter((b) => b.ate > game.clock.now());
    const sazonais = sazonaisAtivos(game);
    if (!lista.length && !sazonais.length) return null;
    const c = new Container();
    const bg = new Graphics();
    let y = 8;
    for (const sz of sazonais) {
      const t = para(`${sz.nome}: ${sz.efeitos.map((e) => descreverEfeito(e, game)).join(' · ')}`, C.gold, 12, w - 24, { bold: true });
      t.position.set(12, y);
      c.addChild(t);
      y += t.height + 4;
    }
    for (const b of lista.slice(0, 4)) {
      const t = txt(`${b.rotulo}: ${descreverEfeito(b.efeito, game)}`, C.accent, 12, true);
      t.position.set(12, y);
      const r = txt('', C.dim, 11);
      c.addChild(t, r);
      tempos.push({ r, b, x: w - 12, y: y + 1 });
      y += 20;
    }
    const h = y + 4;
    drawCard(bg, w, h, { fill: C.card, accent: C.accent, radius: 10 });
    c.addChildAt(bg, 0);
    return { c, h };
  }

  function atendimento(w) {
    const itens = [];
    const faixa = faixaBonus(w);
    if (faixa) itens.push(faixa);
    if (resultado) itens.push(cartaoResultado(w));
    const cli = game.state.fila[0];
    refs.frente = cli ?? null;
    if (!cli) {
      const c = new Container();
      const bg = new Graphics();
      const t = para('Sem clientes na fila. Eles chegam sozinhos; enquanto isso, confira o Mercado e a Oficina.', C.dim, 14, w - 28);
      t.position.set(14, 14);
      drawCard(bg, w, t.height + 28, { fill: C.card });
      c.addChild(bg, t);
      itens.push({ c, h: t.height + 28 });
      refs.precos = {};
      refs.opcoes = [];
      refs.dispensar = null;
      return itens;
    }

    itens.push(cartaoCliente(w, cli));
    const ops = opcoes(game, cli);
    if (!ops.find((o) => o.chave === sel)) sel = ops[0]?.chave ?? null;

    if (ops.length) {
      // os preços vêm logo abaixo do cliente (ao alcance do polegar); a lista para trocar o item fica depois
      const atual = ops.find((o) => o.chave === sel);
      const t = txt(`Oferecendo: ${atual.item.nome} (${game.data.meta.qualidades[atual.qualidade].nome})`, C.dim, 12, true);
      itens.push({ c: t, h: t.height });
      itens.push(linhaPrecos(w, cli, ops));
      refs.opcoes = [];
      if (ops.length > 1) {
        const t2 = txt('Trocar o item oferecido', C.dim, 12, true);
        itens.push({ c: t2, h: t2.height });
        itens.push(...linhasOpcoes(w, ops));
      }
    } else {
      refs.precos = {};
      refs.opcoes = [];
      const c = new Container();
      const bg = new Graphics();
      const t = para('Não há nada no estoque que sirva para este cliente. Reponha na Oficina ou no Mercado, ou dispense-o.', C.warn, 13, w - 28);
      t.position.set(14, 12);
      drawCard(bg, w, t.height + 24, { fill: C.card, border: C.warn, borderAlpha: 0.5 });
      c.addChild(bg, t);
      itens.push({ c, h: t.height + 24 });
    }

    const b = labelButton(game.state.fila.length > 1 ? 'Dispensar e chamar o próximo' : 'Dispensar cliente', w, 44, { tint: C.dim, size: 13 });
    b.tap(dispensou);
    refs.dispensar = { c: b, w, h: 44 };
    itens.push({ c: b, h: 44 });
    return itens;
  }

  // ---------- montagem ----------
  function render() {
    dirty = false;
    quadros = 0;
    bars = [];
    tempos = [];
    const keepY = scroll.scrollY;
    const wide = R.w >= 640;
    sceneHolder.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    scroll.clear();

    if (wide) {
      const wl = Math.floor(R.w * 0.46);
      const gap = 12;
      const wr = R.w - wl - gap;
      const sceneH = Math.min(R.h, 400);
      sceneHolder.addChild(buildScene(wl, sceneH));
      if (R.h - sceneH >= 96) {            // sobra espaço embaixo da cena (desktop): estatísticas
        const st = buildStats(wl);
        st.position.set(0, sceneH + 12);
        sceneHolder.addChild(st);
      }
      scroll.root.position.set(wl + gap, 0);
      for (const it of atendimento(wr)) scroll.add(it.c, it.h);
      scroll.resize(R.h, wr);
    } else {
      scroll.root.position.set(0, 0);
      const sceneH = Math.min(240, Math.max(190, Math.round(R.h * 0.32)));
      scroll.add(buildScene(R.w, sceneH), sceneH);
      for (const it of atendimento(R.w)) scroll.add(it.c, it.h);
      scroll.resize(R.h, R.w);
    }
    scroll.scrollBy(keepY);
    paintBars();
    paintTempos();
  }

  function paintTempos() {
    const agora = game.clock.now();
    for (const x of tempos) {
      x.r.text = fmtTime((x.b.ate - agora) / 1000);
      x.r.position.set(x.x - x.r.width, x.y);
    }
  }

  function paintBars() {
    for (const b of bars) {
      const f = Math.max(0, Math.min(1, b.cli.paciencia / b.cli.pacienciaMax));
      const cor = f > 0.55 ? C.good : f > 0.25 ? C.warn : C.bad;
      const h = b.alta ? 5 : 4;
      b.g.clear().roundRect(0, 0, b.w, h, h / 2).fill({ color: 0x000000, alpha: 0.45 });
      if (f > 0) b.g.roundRect(0, 0, Math.max(h, b.w * f), h, h / 2).fill(cor);
    }
  }

  const global = (ref) => ref.c.toGlobal({ x: ref.w / 2, y: ref.h / 2 });

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
      else { quadros += 1; paintBars(); if (tempos.length && (quadros % 15 === 0)) paintTempos(); }
    },
    // atalhos para os testes e para depurar
    hooks: {
      // false enquanto há um redesenho pendente ou o Pixi ainda não desenhou um quadro depois dele (toques errariam o alvo)
      pronta: () => !dirty && quadros >= 2,
      selecionada: () => sel,
      resultado: () => resultado,
      precoCentro: (nivel) => (refs.precos[nivel] ? global(refs.precos[nivel]) : null),
      dispensarCentro: () => (refs.dispensar ? global(refs.dispensar) : null),
      opcaoCentro: (i) => (refs.opcoes[i] ? global(refs.opcoes[i]) : null),
      filaCentro: (i) => { const f = refs.fila[i]; return f ? f.c.toGlobal({ x: f.size / 2, y: f.size / 2 }) : null; },
      renderAgora: render,
    },
  };
}
