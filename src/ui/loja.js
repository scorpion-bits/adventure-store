// Tela da Loja: a cena (prateleiras com o estoque de verdade e a fila no balcão) e o atendimento
// (cliente, o que oferecer, os três preços). A lógica está em core/shop.js; aqui só desenho e toques.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, createScroll, labelButton, makeButton, wasDragged, lighten, retanguloGlobal } from './ui.js';
import { iconSprite, portraitSprite, guiPronto, guiSprite } from '../assets.js';
import { tween, ease } from './anim.js';
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
  const fx = new Container();         // efeitos que sobem da cena (ouro ganho); sobrevive às reconstruções da tela
  fx.eventMode = 'none';
  root.addChild(sceneHolder, scroll.root, fx);

  let R = { x: 0, y: 0, w: 360, h: 600 };
  let sel = null;            // chave do estoque escolhida para oferecer
  let resultado = null;      // última venda/recusa (aparece no topo do atendimento)
  let dirty = true;
  let quadros = 0;           // quadros desenhados desde o último render() (o Pixi só atualiza as posições de toque ao desenhar)
  let bars = [];             // barras de paciência atualizadas a cada quadro
  let tempos = [];           // textos de tempo restante dos bônus
  let prateleiraX = 0;       // rolagem horizontal da prateleira (sobrevive aos redesenhos)
  let prateleiraVel = 0;
  let prateleiraSegurada = false;   // dedo na prateleira: sem inércia
  let ultimoQuadro = 0;
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

  // "+N" que sobe do balcão quando uma venda fecha
  function flutuar(texto, cor) {
    const cena = refs.cena;
    if (!cena || cena.c.destroyed || !root.visible) return;
    const p = root.toLocal(cena.c.toGlobal({ x: cena.w / 2, y: cena.h * 0.62 }));
    const f = new Container();
    const t = txt(texto, cor, 16, true);
    let x = 0;
    if (guiPronto()) { const m = guiSprite('moeda', 2); m.position.set(0, 0); f.addChild(m); x = m.width + 4; }
    t.position.set(x, 0);
    f.addChild(t);
    f.position.set(p.x - f.width / 2, p.y);
    fx.addChild(f);
    tween(f, { y: p.y - 46, alpha: 0 }, 900, { ease: ease.out, onDone: () => f.destroy({ children: true }) });
  }
  game.on('venda', (v) => { if (v.preco > 0) flutuar(`+${fmt(v.preco)}`, C.gold); });

  // ---------- cena ----------
  function buildScene(w, h) {
    const c = new Container();
    refs.cena = { c, w, h };
    const bg = new Graphics();
    const cor = temaAtual(game).cores;
    const floorY = 62;                     // a parede só tem a prateleira; o resto é palco dos clientes
    bg.roundRect(0, 0, w, h, 14).fill(cor.parede);
    bg.rect(0, floorY, w, h - floorY - 14).fill(cor.piso);
    bg.roundRect(0, h - 30, w, 30, 14).fill(cor.piso);
    bg.roundRect(0, 0, w, h, 14).stroke({ width: 1, color: 0xffffff, alpha: 0.09 });
    c.addChild(bg);

    // prateleira: uma fileira fina no alto; quando enche, arrasta-se para o lado (o cenário fica para os clientes)
    const slots = Object.entries(game.state.estoque).filter(([, q]) => q > 0);
    const PASSO = 36;
    const topo = 18;                       // abaixo do contador "Prateleiras x/y"
    const tabuaY = topo + 28 + 4;
    const larg = w - 16;                   // largura visível da prateleira
    const total = 8 + slots.length * PASSO;
    const maxX = Math.max(0, total - larg);
    prateleiraX = Math.min(maxX, Math.max(0, prateleiraX));
    const tabua = new Graphics();
    c.addChild(tabua);
    const itens = new Container();
    const faixa = new Container();         // recebe o arrasto
    faixa.eventMode = 'static';
    faixa.hitArea = new Rectangle(8, 0, larg, tabuaY + 6);
    faixa.cursor = maxX > 0 ? 'ew-resize' : 'default';
    const mascara = new Graphics().rect(8, 0, larg, tabuaY + 6).fill(0xffffff);
    itens.mask = mascara;
    faixa.addChild(itens);
    slots.forEach(([chave, qtd], i) => {
      const ic = iconSprite('item', chave.split(':')[0], 28);
      ic.position.set(12 + i * PASSO, topo);
      itens.addChild(ic);
      if (qtd > 1) {
        const q = txt(`${qtd}`, C.text, 10, true);
        q.position.set(ic.x + 28 - q.width, ic.y + 28 - q.height + 1);
        const qb = new Graphics().roundRect(q.x - 2, q.y, q.width + 4, q.height, 3).fill({ color: 0x000000, alpha: 0.6 });
        itens.addChild(qb, q);
      }
    });
    const pintarTabua = () => {
      itens.x = -prateleiraX;
      tabua.clear().roundRect(8, tabuaY, larg, 5, 2).fill(cor.prateleira);
      tabua.rect(8, tabuaY + 4, larg, 2).fill({ color: 0x000000, alpha: 0.25 });
      if (maxX > 0) {                      // a própria tábua é a barra de rolagem
        const polegar = Math.max(24, larg * (larg / total));
        const px = 8 + (prateleiraX / maxX) * (larg - polegar);
        tabua.roundRect(px, tabuaY, polegar, 5, 2).fill(lighten(cor.prateleira, 0.45));
      }
    };
    pintarTabua();
    refs.prateleira = { maxX, mover: (dx) => { prateleiraX = Math.min(maxX, Math.max(0, prateleiraX + dx)); pintarTabua(); } };
    if (maxX > 0) {
      let toque = null;
      faixa.on('pointerdown', (e) => { toque = { x: e.global.x, last: e.global.x, t: performance.now(), moveu: false }; prateleiraVel = 0; prateleiraSegurada = true; });
      faixa.on('globalpointermove', (e) => {
        if (!toque) return;
        if (!toque.moveu && Math.abs(e.global.x - toque.x) > 6) toque.moveu = true;
        if (!toque.moveu) return;
        const dx = toque.last - e.global.x;
        const agora = performance.now();
        refs.prateleira.mover(dx);
        prateleiraVel = prateleiraVel * 0.6 + (dx / Math.max(1, agora - toque.t)) * 0.4;
        toque.t = agora;
        toque.last = e.global.x;
      });
      const soltar = () => { if (toque && !toque.moveu) prateleiraVel = 0; toque = null; prateleiraSegurada = false; };
      faixa.on('pointerup', soltar);
      faixa.on('pointerupoutside', soltar);
      faixa.on('wheel', (e) => { refs.prateleira.mover(e.deltaX || e.deltaY); prateleiraVel = 0; e.stopPropagation?.(); });
    }
    c.addChild(faixa, mascara);
    const capTxt = txt(`Prateleiras ${totalEstoque(game)}/${capacidadeEstoque(game)}`, totalEstoque(game) >= capacidadeEstoque(game) ? C.warn : C.faint, 10, true);
    capTxt.position.set(w - capTxt.width - 12, 3);
    c.addChild(capTxt);
    if (maxX > 0) {
      const dica = txt('arraste para ver mais', C.faint, 10);
      dica.position.set(12, 3);
      c.addChild(dica);
    }
    if (!slots.length) {
      const vazio = txt('Prateleiras vazias!', C.warn, 13, true);
      vazio.position.set((w - vazio.width) / 2, topo + 14 - vazio.height / 2);
      c.addChild(vazio);
    }

    // fila no balcão: o primeiro (maior) é atendido
    const fila = game.state.fila;
    refs.fila = [];
    const counterY = h - 34;
    const n = fila.length;
    // os retratos de 32 px ficam nítidos em múltiplos inteiros: o cliente da vez é grande (96 ou 128) e os de trás têm 32
    const big = Math.max(32, Math.floor(Math.min(h >= 280 ? 128 : 96, h - floorY - 20) / 32) * 32);
    const small = 32;
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
        // chance de o cliente aceitar, em %, junto da reação (cabe no botão: o texto diminui se precisar)
        const t3 = txt(`${Math.round(av.chance * 100)}% · ${av.reacao.texto}`, COR_REACAO[av.reacao.id], 11, true);
        for (let tam = 11; t3.width > bw - 8 && tam > 8; tam--) t3.style.fontSize = tam;
        t3.position.set((bw - t3.width) / 2, 52 + (11 - t3.style.fontSize) / 2);
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
      const qual = game.data.meta.qualidades[atual.qualidade].nome;
      const pediu = cli.pedido.tipo === 'item' ? game.data.itens[cli.pedido.item]?.nome : null;
      // oferecer outra coisa que não o pedido funciona (com menos chance), mas a tela precisa deixar isso claro
      const t = atual.substituto && pediu && atual.item.id !== cli.pedido.item
        ? para(`Oferecendo ${atual.item.nome} (${qual}) no lugar de ${pediu}: ele pode não gostar`, C.warn, 12, w, { bold: true })
        : txt(`Oferecendo: ${atual.item.nome} (${qual})`, C.dim, 12, true);
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
    prateleiraSegurada = false;
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
      const sceneH = Math.min(R.h, 300);
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
      const agora = performance.now();
      const dt = Math.min(64, agora - (ultimoQuadro || agora));
      ultimoQuadro = agora;
      if (!prateleiraSegurada && Math.abs(prateleiraVel) > 0.01 && refs.prateleira) {   // inércia depois de soltar a prateleira
        refs.prateleira.mover(prateleiraVel * dt);
        prateleiraVel *= 0.94 ** (dt / 16);
      }
      if (dirty) render();
      else { quadros += 1; paintBars(); if (tempos.length && (quadros % 15 === 0)) paintTempos(); }
    },
    // atalhos para os testes e para depurar
    hooks: {
      // false enquanto há um redesenho pendente ou o Pixi ainda não desenhou um quadro depois dele (toques errariam o alvo)
      pronta: () => !dirty && quadros >= 2,
      selecionada: () => sel,
      resultado: () => resultado,
      nomes: () => Object.keys(refs.precos).map((n) => `preco:${n}`),
      retangulo: (nome) => (nome.startsWith('preco:') ? retanguloGlobal(refs.precos[nome.slice(6)]) : null),
      precoCentro: (nivel) => (refs.precos[nivel] ? global(refs.precos[nivel]) : null),
      dispensarCentro: () => (refs.dispensar ? global(refs.dispensar) : null),
      opcaoCentro: (i) => (refs.opcoes[i] ? global(refs.opcoes[i]) : null),
      filaCentro: (i) => { const f = refs.fila[i]; return f ? f.c.toGlobal({ x: f.size / 2, y: f.size / 2 }) : null; },
      renderAgora: render,
      // a prateleira: quanto já rolou, quanto dá para rolar e o ponto do meio dela (para arrastar nos testes)
      prateleira: () => (refs.prateleira ? { x: prateleiraX, maxX: refs.prateleira.maxX } : null),
      prateleiraCentro: () => (refs.cena && !refs.cena.c.destroyed ? refs.cena.c.toGlobal({ x: refs.cena.w / 2, y: 34 }) : null),
    },
  };
}
