// Código do Ferreiro (Mercado -> Mini-jogos): descubra a sequência secreta de materiais do cofre. A lógica (segredo, dicas, prêmio,
// partidas guardadas) está em core/codigo.js; aqui ficam os toques e o desenho. Sem tempo: é um jogo para pensar.
// O estado da partida mora fora do desenho, porque a tela do Mercado se refaz quando algo muda e o jogo precisa voltar igual.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, labelButton, wasDragged } from './ui.js';
import { iconSprite } from '../assets.js';
import { iniciarPartida, finalizarPartida, dicas, cofreDe, unidadesPorEspaco, cargasAgora, msParaProxima } from '../core/codigo.js';
import { fmt, fmtTime } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const GAP = 6;
const PEG = 9;                       // diâmetro de cada bolinha de dica

export function createCodigo({ game, toast, pedirRender }) {
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
    j.palpites.push({ pecas, ...d });
    j.atual = Array(j.partida.espacos).fill(null);
    if (d.certos === j.partida.espacos) { sfx.sell(); haptic(10); setTimeout(() => terminar(), 500); pedirRender(); return; }
    sfx.tap();
    if (j.palpites.length >= j.partida.tentativas) { setTimeout(() => terminar(), 500); }
    pedirRender();
  }

  // ---------- desenho ----------
  // bolinhas de dica: cheia verde = lugar certo; anel dourado = material certo em outro lugar; apagada = nada
  function pegs(certos, quase, total) {
    const g = new Graphics();
    const colunas = total <= 3 ? total : 3;
    for (let i = 0; i < total; i++) {
      const x = (i % colunas) * (PEG + 4) + PEG / 2;
      const y = Math.floor(i / colunas) * (PEG + 4) + PEG / 2;
      if (i < certos) g.circle(x, y, PEG / 2).fill(C.good);
      else if (i < certos + quase) g.circle(x, y, PEG / 2 - 1).stroke({ width: 2, color: C.gold });
      else g.circle(x, y, 2).fill({ color: 0xffffff, alpha: 0.18 });
    }
    return { g, w: colunas * (PEG + 4) - 4, h: Math.ceil(total / colunas) * (PEG + 4) - 4 };
  }

  function peca(material, tam, { vazio = false, destaque = false } = {}) {
    const c = new Container();
    const bg = new Graphics();
    if (vazio) {
      bg.roundRect(0, 0, tam, tam, 10).fill({ color: 0x000000, alpha: 0.25 }).stroke({ width: 2, color: C.accent, alpha: 0.35 });
    } else {
      bg.roundRect(0, 0, tam, tam, 10).fill(C.parchment).stroke({ width: 2, color: destaque ? C.gold : 0x7a4e2d, alpha: 0.9 });
      const ic = iconSprite('material', material, Math.round(tam * 0.7));
      ic.position.set((tam - ic.width) / 2, (tam - ic.height) / 2);
      c.addChild(bg, ic);
      return c;
    }
    c.addChild(bg);
    return c;
  }

  const linhaDePecas = (lista, tam, vaziosToques = null, reg = null, prefixo = '') => {
    const c = new Container();
    lista.forEach((m, i) => {
      const p = peca(m, tam, { vazio: m === null });
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
    const d = para(`O cofre guarda uma sequência secreta de ${cofre.espacos} materiais. Monte um palpite e veja as dicas: bolinha verde = material no lugar certo; anel dourado = material certo, mas em outro lugar. Descubra o código em até ${cfg().tentativas} tentativas. Sem tempo: pense à vontade.`, C.dim, 13, w - 28);
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

    const dica = txt('toque num material para colocar; toque numa peça colocada para tirar', C.faint, 10);
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

    // ----- palpites anteriores (o mais novo primeiro) -----
    if (j.palpites.length) {
      const rot = txt('Palpites e dicas  (● lugar certo   ○ material certo, lugar errado)', C.faint, 11, true);
      itens.push({ c: rot, h: rot.height + 2 });
      const mini = Math.min(34, Math.floor((w - 28 - 90 - GAP * (espacos - 1)) / espacos));
      for (let k = j.palpites.length - 1; k >= 0; k--) {
        const g = j.palpites[k];
        const linha = new Container();
        const fundo = new Graphics();
        const h = mini + 16;
        drawCard(fundo, w, h, { fill: C.card, fillAlpha: 0.9, radius: 10, shadow: false });
        const num = txt(`${k + 1}`, C.faint, 12, true);
        num.position.set(10, (h - num.height) / 2);
        const pecas = linhaDePecas(g.pecas, mini);
        pecas.c.position.set(30, 8);
        const dg = pegs(g.certos, g.quase, espacos);
        dg.g.position.set(w - 14 - dg.w, (h - dg.h) / 2);
        const resumo = txt(`${g.certos} no lugar${g.quase ? ` · ${g.quase} fora` : ''}`, C.dim, 10);
        resumo.position.set(w - 14 - dg.w - 8 - resumo.width, (h - resumo.height) / 2);
        linha.addChild(fundo, num, pecas.c, resumo, dg.g);
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
