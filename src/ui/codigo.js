// Código do Ferreiro (Mercado -> Mini-jogos): descubra a sequência secreta de materiais do cofre. A lógica (segredo, dicas, prêmio,
// partidas guardadas) está em core/codigo.js; aqui ficam os toques e o desenho. Sem tempo: é um jogo para pensar.
// O estado da partida mora fora do desenho, porque a tela do Mercado se refaz quando algo muda e o jogo precisa voltar igual.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, labelButton, wasDragged } from './ui.js';
import { iconSprite } from '../assets.js';
import { iniciarPartida, finalizarPartida, marcas, dicas, cofreDe, unidadesPorEspaco, cargasAgora, msParaProxima } from '../core/codigo.js';
import { fmt, fmtTime } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const GAP = 6;

export function createCodigo({ game, toast, pedirRender, outroEmJogo }) {
  const j = {
    fase: 'lobby',                   // 'lobby' | 'jogando' | 'fim'
    partida: null,
    palpites: [],                    // [{ pecas: [material...], certos, quase }]
    atual: [],                       // o palpite em montagem: material ou null em cada espaço
    resultado: null,
  };
  let ui = {};
  let relogioLobby = 0;
  const cfg = () => game.data.meta.codigo;
  const nomeDe = (id) => game.data.materiais[id]?.nome ?? id;

  // ---------- partida ----------
  function comecar() {
    if (outroEmJogo?.()) { sfx.deny(); toast('Termine a outra partida antes de começar esta', C.warn); return; }
    const p = iniciarPartida(game);
    if (!p.ok) {
      sfx.deny();
      toast(p.motivo === 'sem-partidas' ? 'Sem partidas por agora: elas voltam com o tempo' : 'Ainda não há materiais para o cofre', C.warn);
      return;
    }
    Object.assign(j, { fase: 'jogando', partida: p, palpites: [], atual: Array(p.espacos).fill(null), resultado: null });
    sfx.open();
    pedirRender();
  }

  function terminar(desistiu = false) {
    if (j.fase !== 'jogando') return;
    const r = finalizarPartida(game, j.partida, { palpites: j.palpites.map((p) => p.pecas) });
    j.resultado = { ...r, desistiu, segredo: j.partida.segredo.slice() };
    j.fase = 'fim';
    if (r.total > 0) { r.rapido ? sfx.achievement() : sfx.levelUp(); haptic(15); } else sfx.deny();
    pedirRender();
  }

  function colocar(material) {
    if (j.fase !== 'jogando') return;
    const i = j.atual.indexOf(null);
    if (i < 0) { sfx.deny(); return; }
    j.atual[i] = material;
    sfx.tap();
    pedirRender();
  }

  function tirar(i) {
    if (j.fase !== 'jogando' || j.atual[i] === null) return;
    j.atual[i] = null;
    sfx.tick();
    pedirRender();
  }

  function limpar() {
    if (j.fase !== 'jogando') return;
    j.atual = Array(j.partida.espacos).fill(null);
    sfx.tick();
    pedirRender();
  }

  function conferir() {
    if (j.fase !== 'jogando' || j.atual.includes(null)) { sfx.deny(); return; }
    const pecas = j.atual.slice();
    const d = dicas(j.partida.segredo, pecas);
    j.palpites.push({ pecas, marcas: marcas(j.partida.segredo, pecas), ...d });
    j.atual = Array(j.partida.espacos).fill(null);
    if (d.certos === j.partida.espacos) { sfx.sell(); haptic(10); setTimeout(() => terminar(), 500); pedirRender(); return; }
    sfx.tap();
    if (j.palpites.length >= j.partida.tentativas) { setTimeout(() => terminar(), 500); }
    pedirRender();
  }

  // ---------- desenho ----------
  // cores das peças conferidas: verde = lugar certo; amarelo = material certo em outro lugar; cinza = não está no cofre
  const COR = {
    certo: { fundo: 0x2f5a30, borda: C.good, icone: 1 },
    quase: { fundo: 0x5e4a1c, borda: C.gold, icone: 1 },
    nada: { fundo: 0x241a14, borda: 0x6b5a4a, icone: 0.45 },
  };

  function peca(material, tam, { vazio = false, marca = null } = {}) {
    const c = new Container();
    const bg = new Graphics();
    if (vazio) {
      bg.roundRect(0, 0, tam, tam, 10).fill({ color: 0x000000, alpha: 0.25 }).stroke({ width: 2, color: C.accent, alpha: 0.35 });
      c.addChild(bg);
      return c;
    }
    const cor = marca ? COR[marca] : null;
    bg.roundRect(0, 0, tam, tam, 10).fill(cor ? cor.fundo : C.parchment).stroke({ width: marca ? 3 : 2, color: cor ? cor.borda : 0x7a4e2d, alpha: 0.95 });
    const ic = iconSprite('material', material, Math.round(tam * 0.7));
    ic.position.set((tam - ic.width) / 2, (tam - ic.height) / 2);
    ic.alpha = cor ? cor.icone : 1;
    c.addChild(bg, ic);
    return c;
  }

  const linhaDePecas = (lista, tam, vaziosToques = null, reg = null, prefixo = '', marcasDaLinha = null) => {
    const c = new Container();
    lista.forEach((m, i) => {
      const p = peca(m, tam, { vazio: m === null, marca: marcasDaLinha?.[i] ?? null });
      p.position.set(i * (tam + GAP), 0);
      if (vaziosToques && m !== null) {
        p.eventMode = 'static';
        p.cursor = 'pointer';
        p.hitArea = new Rectangle(0, 0, tam, tam);
        p.on('pointertap', () => { if (!wasDragged()) vaziosToques(i); });
      }
      if (reg) reg(`${prefixo}${i}`, p, tam, tam);
      c.addChild(p);
    });
    return { c, w: lista.length * tam + (lista.length - 1) * GAP };
  };

  // ---------- telas ----------
  function lobby(w, reg) {
    const c = new Container();
    const bg = new Graphics();
    c.addChild(bg);
    const cofre = cofreDe(game);
    const t = txt('Código do Ferreiro', C.text, 17, true);
    t.position.set(14, 12);
    const d = para(`O cofre guarda uma sequência secreta de ${cofre.espacos} materiais. Monte um palpite e toque em Conferir: cada peça fica verde (material no lugar certo), amarela (material certo, mas em outro lugar) ou cinza (não está no cofre). Descubra o código em até ${cfg().tentativas} tentativas. Sem tempo: pense à vontade.`, C.dim, 13, w - 28);
    d.position.set(14, t.y + t.height + 4);
    c.addChild(t, d);
    let y = d.y + d.height + 10;

    const un = unidadesPorEspaco(game);
    const info = para(`Cofre atual: ${cofre.espacos} espaços, ${cofre.cores} materiais ${cofre.repete ? '(o mesmo pode repetir)' : '(sem repetir)'} · prêmio: +${un} de cada material do segredo (dobra se abrir em até ${cfg().rapidoAte} tentativas). Errou tudo? Ainda ganha 1 de cada material que acertou no último palpite.`, C.faint, 11, w - 28, { bold: true });
    info.position.set(14, y);
    c.addChild(info);
    y += info.height + 12;

    const cargas = cargasAgora(game);
    const pips = new Graphics();
    for (let i = 0; i < cfg().max; i++) {
      pips.circle(i * 26, 0, 9).fill(i < cargas ? C.gold : 0x000000).stroke({ width: 2, color: C.gold, alpha: i < cargas ? 1 : 0.4 });
    }
    pips.position.set(24, y + 10);
    const rot = txt(`${cargas}/${cfg().max} partidas`, C.text, 14, true);
    rot.position.set(24 + (cfg().max - 1) * 26 + 22, y + 1);
    ui.proxima = txt('', C.dim, 12);
    ui.proxima.position.set(14, y + 28);
    c.addChild(pips, rot, ui.proxima);
    y += 28 + 18 + 8;
    pintarProxima();

    const jogar = labelButton(cargas > 0 ? 'Jogar' : 'Sem partidas agora', w - 28, 48, { tint: cargas > 0 ? C.good : C.dim, size: 16 });
    jogar.position.set(14, y);
    if (cargas <= 0) jogar.setDisabled(true);
    jogar.tap(comecar);
    c.addChild(jogar);
    reg('codigo:jogar', jogar, w - 28, 48);
    y += 48 + 12;

    const s = game.state.codigo;
    const tot = txt(`Partidas: ${fmt(s.partidas)} · cofres abertos: ${fmt(s.vitorias)} · rápidos: ${fmt(s.rapidas)}`, C.faint, 11);
    tot.position.set(14, y);
    c.addChild(tot);
    y += tot.height + 14;
    drawCard(bg, w, y, { fill: C.cardHi, accent: C.accent });
    return { c, h: y };
  }

  function pintarProxima() {
    if (!ui.proxima || ui.proxima.destroyed) return;
    const ms = msParaProxima(game);
    ui.proxima.text = ms > 0 ? `Próxima partida em ${fmtTime(ms / 1000)}` : 'Partidas cheias';
  }

  function jogo(w, reg) {
    const p = j.partida;
    const itens = [];
    const espacos = p.espacos;

    // ----- painel de montagem: palpite atual, materiais, botões -----
    const painel = new Container();
    const bg = new Graphics();
    painel.addChild(bg);
    const restantes = p.tentativas - j.palpites.length;
    const cab = txt(`Tentativa ${j.palpites.length + 1} de ${p.tentativas}`, C.text, 15, true);
    cab.position.set(14, 12);
    const cofre = txt(`${espacos} espaços${p.repete ? ' · pode repetir' : ' · sem repetir'}`, C.dim, 12);
    cofre.position.set(w - 14 - cofre.width, 15);
    painel.addChild(cab, cofre);
    let y = 12 + cab.height + 10;

    const tam = Math.min(52, Math.floor((w - 28 - GAP * (espacos - 1)) / espacos));
    const slots = linhaDePecas(j.atual, tam, tirar, reg, 'codigo:slot:');
    slots.c.position.set((w - slots.w) / 2, y);
    painel.addChild(slots.c);
    y += tam + 12;

    const dica = txt('toque num material para colocar; toque numa peça colocada para tirar', C.faint, 11);
    dica.position.set((w - dica.width) / 2, y);
    painel.addChild(dica);
    y += dica.height + 8;

    const cores = p.paleta.length;
    const pw = Math.min(cores <= 4 ? 74 : 62, Math.floor((w - 28 - GAP * (cores - 1)) / cores));
    const larg = cores * pw + (cores - 1) * GAP;
    p.paleta.forEach((m, i) => {
      const b = new Container();
      const fundo = new Graphics();
      fundo.roundRect(0, 0, pw, pw + 14, 10).fill({ color: C.card, alpha: 1 }).stroke({ width: 1, color: C.accent, alpha: 0.5 });
      const ic = iconSprite('material', m, Math.round(pw * 0.62));
      ic.position.set((pw - ic.width) / 2, 4);
      const nome = txt(nomeDe(m), C.dim, 10, true);
      for (let t = 10; nome.width > pw - 4 && t > 7; t--) nome.style.fontSize = t;
      nome.position.set((pw - nome.width) / 2, pw * 0.62 + 7);
      b.addChild(fundo, ic, nome);
      b.position.set((w - larg) / 2 + i * (pw + GAP), y);
      b.eventMode = 'static';
      b.cursor = 'pointer';
      b.hitArea = new Rectangle(0, 0, pw, pw + 14);
      b.on('pointertap', () => { if (!wasDragged()) colocar(m); });
      reg(`codigo:paleta:${i}`, b, pw, pw + 14);
      painel.addChild(b);
    });
    y += pw + 14 + 12;

    const cheio = !j.atual.includes(null);
    const bw = (w - 28 - 8) / 2;
    const conf = labelButton('Conferir', bw, 44, { tint: cheio ? C.good : C.dim, size: 15 });
    if (!cheio) conf.setDisabled(true);
    conf.position.set(14, y);
    conf.tap(conferir);
    reg('codigo:conferir', conf, bw, 44);
    const lim = labelButton('Limpar', bw, 44, { tint: C.dim, size: 14 });
    lim.position.set(14 + bw + 8, y);
    lim.tap(limpar);
    reg('codigo:limpar', lim, bw, 44);
    painel.addChild(conf, lim);
    y += 44 + 12;
    drawCard(bg, w, y, { fill: C.cardHi, accent: restantes <= 2 ? C.bad : C.accent });
    itens.push({ c: painel, h: y });

    // ----- palpites anteriores (o mais novo primeiro): cada peça é pintada pelo resultado -----
    {
      const leg = new Container();
      const itensLeg = [['certo', 'lugar certo'], ['quase', 'material certo, lugar errado'], ['nada', 'não está no cofre']];
      let lx = 0;
      let ly = 0;
      for (const [m, texto] of itensLeg) {
        const sw = new Graphics().roundRect(0, 0, 14, 14, 4).fill(COR[m].fundo).stroke({ width: 2, color: COR[m].borda });
        const t = txt(texto, C.dim, 11);
        const largura = 14 + 5 + t.width + 14;
        if (lx + largura > w && lx > 0) { lx = 0; ly += 20; }
        sw.position.set(lx, ly + 1);
        t.position.set(lx + 19, ly);
        leg.addChild(sw, t);
        lx += largura;
      }
      itens.push({ c: leg, h: ly + 20 });
    }
    if (j.palpites.length) {
      const mini = Math.min(38, Math.floor((w - 28 - 32 - 118 - GAP * (espacos - 1)) / espacos));
      for (let k = j.palpites.length - 1; k >= 0; k--) {
        const g = j.palpites[k];
        const linha = new Container();
        const fundo = new Graphics();
        const h = mini + 18;
        drawCard(fundo, w, h, { fill: C.card, fillAlpha: 0.9, radius: 10, shadow: false });
        const num = txt(`${k + 1}`, C.faint, 13, true);
        num.position.set(12, (h - num.height) / 2);
        const pecas = linhaDePecas(g.pecas, mini, null, null, '', g.marcas);
        pecas.c.position.set(34, 9);
        const certos = txt(`${g.certos} no lugar certo`, g.certos ? C.good : C.faint, 11, true);
        const fora = txt(`${g.quase} no lugar errado`, g.quase ? C.gold : C.faint, 11, true);
        certos.position.set(w - 12 - certos.width, h / 2 - certos.height - 1);
        fora.position.set(w - 12 - fora.width, h / 2 + 1);
        linha.addChild(fundo, num, pecas.c, certos, fora);
        itens.push({ c: linha, h });
      }
    }

    const desistir = labelButton('Desistir e abrir o cofre', w, 40, { tint: C.dim, size: 13 });
    desistir.tap(() => terminar(true));
    reg('codigo:desistir', desistir, w, 40);
    itens.push({ c: desistir, h: 40 });
    return itens;
  }

  function fim(w, reg) {
    const r = j.resultado;
    const c = new Container();
    const bg = new Graphics();
    c.addChild(bg);
    const titulo = r.aberto ? (r.rapido ? 'Cofre aberto! Prêmio dobrado' : 'Cofre aberto!') : r.desistiu ? 'Você desistiu do cofre' : 'O cofre continua trancado';
    const t = txt(titulo, r.rapido ? C.gold : r.aberto ? C.good : C.text, 18, true);
    t.position.set(14, 12);
    const sub = txt(r.aberto ? `Aberto em ${r.tentativas} ${r.tentativas === 1 ? 'tentativa' : 'tentativas'}` : 'O segredo era:', C.dim, 12);
    sub.position.set(14, t.y + t.height + 3);
    c.addChild(t, sub);
    let y = sub.y + sub.height + 10;
    const tam = Math.min(44, Math.floor((w - 28 - GAP * (r.segredo.length - 1)) / r.segredo.length));
    const seg = linhaDePecas(r.segredo, tam);
    seg.c.position.set(14, y);
    c.addChild(seg.c);
    y += tam + 10;
    const nomes = para(r.segredo.map(nomeDe).join(' · '), C.faint, 11, w - 28);
    nomes.position.set(14, y);
    c.addChild(nomes);
    y += nomes.height + 10;
    for (const [m, q] of Object.entries(r.ganhou)) {
      const ic = iconSprite('material', m, 30);
      ic.position.set(14, y);
      const n = txt(`+${q} ${nomeDe(m)}`, C.good, 14, true);
      n.position.set(54, y + 6);
      c.addChild(ic, n);
      y += 34;
    }
    if (r.total === 0) {
      const pp = para('Nada desta vez. Tente de novo quando voltar uma partida.', C.dim, 13, w - 28);
      pp.position.set(14, y);
      c.addChild(pp);
      y += pp.height;
    } else if (!r.aberto) {
      const pp = para('Consolo: 1 de cada material que estava no lugar certo no último palpite.', C.faint, 11, w - 28);
      pp.position.set(14, y);
      c.addChild(pp);
      y += pp.height;
    }
    y += 6;
    const cargas = cargasAgora(game);
    const de = labelButton(cargas > 0 ? `Jogar de novo (${cargas})` : 'Sem partidas agora', w - 28, 46, { tint: cargas > 0 ? C.good : C.dim });
    if (cargas <= 0) de.setDisabled(true);
    de.position.set(14, y);
    de.tap(comecar);
    reg('codigo:novo', de, w - 28, 46);
    const volta = labelButton('Voltar', w - 28, 40, { tint: C.dim, size: 13 });
    volta.position.set(14, y + 54);
    volta.tap(() => { j.fase = 'lobby'; pedirRender(); });
    reg('codigo:voltar', volta, w - 28, 40);
    c.addChild(de, volta);
    y += 54 + 40 + 14;
    drawCard(bg, w, y, { fill: C.cardHi, accent: r.aberto ? C.good : C.faint });
    return { c, h: y };
  }

  return {
    emJogo: () => j.fase === 'jogando',
    montar(scroll, w, reg) {
      ui = {};
      if (j.fase === 'jogando') for (const it of jogo(w, reg)) scroll.add(it.c, it.h);
      else if (j.fase === 'fim') { const f = fim(w, reg); scroll.add(f.c, f.h); }
      else { const l = lobby(w, reg); scroll.add(l.c, l.h); }
    },
    update(dt) {
      if (j.fase !== 'lobby') return;
      relogioLobby += dt;
      if (relogioLobby >= 1000) {
        relogioLobby = 0;
        pintarProxima();
        const c = cargasAgora(game);
        if (c !== (j.cargasVistas ?? c)) pedirRender();
        j.cargasVistas = c;
      }
    },
    hooks: {
      fase: () => j.fase,
      segredo: () => j.partida?.segredo.slice() ?? [],       // só para os testes
      paleta: () => j.partida?.paleta.slice() ?? [],
      palpite: () => j.atual.slice(),
      historico: () => j.palpites.map((p) => ({ ...p, pecas: p.pecas.slice() })),
      resultado: () => j.resultado,
    },
  };
}
