// Mini-jogo de memória (Mercado -> Mini-jogo): vire as cartas e ache os pares de materiais. Cada par rende aquele material.
// A lógica (tabuleiro, partidas guardadas, prêmio) está em core/minigame.js; aqui ficam as cartas, o tempo e os resultados.
// O estado da partida mora aqui fora do desenho: a tela do Mercado se refaz quando algo muda (ouro, materiais...) e o tabuleiro volta igual.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, para, drawCard, labelButton, wasDragged } from './ui.js';
import { iconSprite } from '../assets.js';
import { tween } from './anim.js';
import { iniciarPartida, finalizarPartida, cargasAgora, msParaProxima, tabuleiroDe, unidadesPorPar } from '../core/minigame.js';
import { fmt, fmtTime } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const COLUNAS = 4;
const GAP = 8;
const TEMPO_ERRO_MS = 700;           // quanto tempo um par errado fica à mostra antes de virar de volta

export function createMinijogo({ game, toast, pedirRender }) {
  const j = {
    fase: 'lobby',                   // 'lobby' | 'jogando' | 'fim'
    partida: null,
    viradas: [],                     // cartas viradas e ainda sem par (no máximo 2)
    achadas: new Set(),              // índices das cartas com par encontrado
    erros: 0,
    restanteMs: 0,
    comecou: false,                  // o tempo só corre depois da primeira carta
    esconderEm: 0,                   // ms até virar de volta um par errado
    resultado: null,
  };
  let ui = {};                       // peças desenhadas que o tempo atualiza: { barra, tempo, erros, pares, proxima, cartas }
  let relogioLobby = 0;
  const M = () => game.data.meta.minijogo;
  const nomeDe = (id) => game.data.materiais[id]?.nome ?? id;

  // ---------- partida ----------
  function comecar() {
    const p = iniciarPartida(game);
    if (!p.ok) { sfx.deny(); toast('Sem partidas por agora: elas voltam com o tempo', C.warn); return; }
    Object.assign(j, { fase: 'jogando', partida: p, viradas: [], achadas: new Set(), erros: 0, restanteMs: p.segundos * 1000, comecou: false, esconderEm: 0, resultado: null });
    sfx.open();
    pedirRender();
  }

  function terminar() {
    if (j.fase !== 'jogando') return;
    const acertos = [...new Set([...j.achadas].map((i) => j.partida.cartas[i].material))];
    const r = finalizarPartida(game, j.partida, { acertos, erros: j.erros });
    j.resultado = { ...r, tempoAcabou: j.restanteMs <= 0 && j.achadas.size < j.partida.cartas.length, pares: acertos.length, total_pares: j.partida.pares, erros: j.erros };
    j.fase = 'fim';
    j.viradas = [];
    if (r.total > 0) { r.perfeito ? sfx.achievement() : sfx.levelUp(); haptic(15); } else sfx.deny();
    pedirRender();
  }

  function tocar(i) {
    if (j.fase !== 'jogando' || j.esconderEm > 0 || j.achadas.has(i) || j.viradas.includes(i)) return;
    j.comecou = true;
    j.viradas.push(i);
    sfx.tap();
    virar(i);
    if (j.viradas.length < 2) return;
    const [a, b] = j.viradas;
    if (j.partida.cartas[a].material === j.partida.cartas[b].material) {
      j.achadas.add(a); j.achadas.add(b);
      j.viradas = [];
      sfx.sell();
      haptic(8);
      for (const k of [a, b]) setTimeout(() => virar(k), 260);        // vira para o verde de "achado"
      pintarPlacar();
      if (j.achadas.size === j.partida.cartas.length) setTimeout(terminar, 650);
    } else {
      j.erros += 1;
      j.esconderEm = TEMPO_ERRO_MS;
      pintarPlacar();
    }
  }

  function desvirar() {
    const par = j.viradas;
    j.viradas = [];
    for (const k of par) virar(k);
  }

  // ---------- desenho das cartas ----------
  const estadoDe = (i) => (j.achadas.has(i) ? 'achada' : j.viradas.includes(i) ? 'aberta' : 'fechada');

  function pintarFace(face, i, cs) {
    face.removeChildren().forEach((c) => c.destroy({ children: true }));
    const e = estadoDe(i);
    const bg = new Graphics();
    if (e === 'fechada') {
      bg.roundRect(0, 0, cs, cs, 12).fill(0x4a362a).stroke({ width: 2, color: C.accent, alpha: 0.55 });
      bg.roundRect(6, 6, cs - 12, cs - 12, 8).stroke({ width: 1, color: C.accent, alpha: 0.25 });
      const q = txt('?', C.accent, Math.round(cs * 0.42), true);
      q.alpha = 0.7;
      q.position.set((cs - q.width) / 2, (cs - q.height) / 2);
      face.addChild(bg, q);
      return;
    }
    const id = j.partida.cartas[i].material;
    bg.roundRect(0, 0, cs, cs, 12).fill({ color: e === 'achada' ? 0x2f4a30 : C.parchment, alpha: e === 'achada' ? 0.95 : 1 })
      .stroke({ width: 2, color: e === 'achada' ? C.good : 0x7a4e2d, alpha: 0.9 });
    const ic = iconSprite('material', id, Math.round(cs * 0.56));
    ic.position.set((cs - ic.width) / 2, cs * 0.08);
    const nome = txt(nomeDe(id), e === 'achada' ? C.text : 0x3a2a20, 10, true);
    for (let tam = 10; nome.width > cs - 8 && tam > 7; tam--) nome.style.fontSize = tam;
    nome.position.set((cs - nome.width) / 2, cs - nome.height - 6);
    face.addChild(bg, ic, nome);
  }

  // gira a carta (a largura vai a zero, troca a face, volta); se a carta não está mais na tela, não faz nada
  function virar(i) {
    const c = ui.cartas?.[i];
    if (!c || c.inner.destroyed) return;
    tween(c.inner, { scaleX: 0 }, 110, {
      onDone: () => {
        if (c.inner.destroyed) return;
        pintarFace(c.face, i, c.cs);
        tween(c.inner, { scaleX: 1 }, 110);
      },
    });
  }

  function criarCarta(i, cs, reg) {
    const c = new Container();
    const inner = new Container();
    const face = new Container();
    inner.pivot.set(cs / 2, cs / 2);
    inner.position.set(cs / 2, cs / 2);
    inner.addChild(face);
    c.addChild(inner);
    pintarFace(face, i, cs);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new Rectangle(0, 0, cs, cs);
    c.on('pointertap', () => { if (!wasDragged()) tocar(i); });
    reg(`carta:${i}`, c, cs, cs);
    ui.cartas[i] = { inner, face, cs };
    return c;
  }

  // ---------- placar e tempo ----------
  function pintarPlacar() {
    if (ui.erros && !ui.erros.destroyed) ui.erros.text = `Erros: ${j.erros}`;
    if (ui.pares && !ui.pares.destroyed) ui.pares.text = `Pares: ${j.achadas.size / 2}/${j.partida?.pares ?? 0}`;
  }

  function pintarTempo() {
    if (!ui.barra || ui.barra.destroyed || !j.partida) return;
    const f = Math.max(0, Math.min(1, j.restanteMs / (j.partida.segundos * 1000)));
    const cor = f > 0.4 ? C.good : f > 0.18 ? C.warn : C.bad;
    ui.barra.clear().roundRect(0, 0, ui.larguraBarra, 8, 4).fill({ color: 0x000000, alpha: 0.4 });
    if (f > 0) ui.barra.roundRect(0, 0, Math.max(8, ui.larguraBarra * f), 8, 4).fill(cor);
    if (ui.tempo && !ui.tempo.destroyed) {
      ui.tempo.text = j.comecou ? fmtTime(Math.max(0, j.restanteMs) / 1000) : `${j.partida.segundos} s`;
      ui.tempo.position.set(ui.larguraBarra - ui.tempo.width, ui.tempo.y);
    }
  }

  // ---------- telas ----------
  function lobby(w, reg) {
    const c = new Container();
    const bg = new Graphics();
    c.addChild(bg);
    const t = txt('Pares de materiais', C.text, 17, true);
    t.position.set(14, 12);
    const tab = tabuleiroDe(game);
    const d = para(`Vire as cartas e ache os pares: cada par rende aquele material (+${unidadesPorPar(game)} por par). Acerte tudo com no máximo ${M().perfeitoErros} erros e o prêmio dobra. Sem pressa demais: o tempo só corre depois da primeira carta.`, C.dim, 13, w - 28);
    d.position.set(14, t.y + t.height + 4);
    c.addChild(t, d);
    let y = d.y + d.height + 10;

    const info = txt(`Tabuleiro: ${tab.n} pares · ${tab.seg} s · mais pares com mais reputação`, C.faint, 11, true);
    info.position.set(14, y);
    c.addChild(info);
    y += info.height + 12;

    // partidas guardadas
    const cargas = cargasAgora(game);
    const pips = new Graphics();
    for (let i = 0; i < M().max; i++) {
      pips.circle(i * 26, 0, 9).fill(i < cargas ? C.gold : 0x000000).stroke({ width: 2, color: C.gold, alpha: i < cargas ? 1 : 0.4 });
    }
    pips.position.set(24, y + 10);
    const rot = txt(`${cargas}/${M().max} partidas`, C.text, 14, true);
    rot.position.set(24 + (M().max - 1) * 26 + 22, y + 1);
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
    reg('minijogo:jogar', jogar, w - 28, 48);
    y += 48 + 12;

    const s = game.state.minijogo;
    const tot = txt(`Partidas jogadas: ${fmt(s.partidas)} · pares achados: ${fmt(s.pares)} · perfeitas: ${fmt(s.perfeitas)}`, C.faint, 11);
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
    const out = [];
    // placar: erros, pares e a barra de tempo
    const cab = new Container();
    ui.larguraBarra = w;
    ui.pares = txt('', C.text, 14, true);
    ui.erros = txt('', C.dim, 14, true);
    ui.tempo = txt('', C.text, 14, true);
    ui.pares.position.set(0, 0);
    ui.erros.position.set(w * 0.34, 0);
    ui.tempo.position.set(0, 0);
    ui.barra = new Graphics();
    ui.barra.position.set(0, 26);
    cab.addChild(ui.pares, ui.erros, ui.tempo, ui.barra);
    out.push({ c: cab, h: 38 });
    pintarPlacar();
    pintarTempo();

    // tabuleiro
    const n = j.partida.cartas.length;
    const cs = Math.min(92, Math.floor((w - GAP * (COLUNAS - 1)) / COLUNAS));
    const linhas = Math.ceil(n / COLUNAS);
    const tab = new Container();
    const larg = COLUNAS * cs + (COLUNAS - 1) * GAP;
    ui.cartas = [];
    j.partida.cartas.forEach((_, i) => {
      const carta = criarCarta(i, cs, reg);
      carta.position.set((w - larg) / 2 + (i % COLUNAS) * (cs + GAP), Math.floor(i / COLUNAS) * (cs + GAP));
      tab.addChild(carta);
    });
    out.push({ c: tab, h: linhas * cs + (linhas - 1) * GAP });

    const desistir = labelButton('Terminar agora', w, 40, { tint: C.dim, size: 13 });
    desistir.tap(terminar);
    reg('minijogo:desistir', desistir, w, 40);
    out.push({ c: desistir, h: 40 });
    return out;
  }

  function fim(w, reg) {
    const r = j.resultado;
    const c = new Container();
    const bg = new Graphics();
    c.addChild(bg);
    const titulo = r.total === 0 ? 'Nenhum par desta vez' : r.perfeito ? 'Perfeito! Prêmio dobrado' : r.tempoAcabou ? 'O tempo acabou' : 'Muito bem!';
    const t = txt(titulo, r.perfeito ? C.gold : C.text, 18, true);
    t.position.set(14, 12);
    const sub = txt(`${r.pares}/${r.total_pares} pares · ${r.erros} ${r.erros === 1 ? 'erro' : 'erros'}`, C.dim, 12);
    sub.position.set(14, t.y + t.height + 3);
    c.addChild(t, sub);
    let y = sub.y + sub.height + 12;
    for (const [m, q] of Object.entries(r.ganhou)) {
      const ic = iconSprite('material', m, 30);
      ic.position.set(14, y);
      const n = txt(`+${q} ${nomeDe(m)}`, C.good, 14, true);
      n.position.set(54, y + 6);
      c.addChild(ic, n);
      y += 34;
    }
    if (r.total === 0) {
      const p = para('Tente de novo quando voltar uma partida.', C.dim, 13, w - 28);
      p.position.set(14, y);
      c.addChild(p);
      y += p.height;
    }
    y += 6;
    const cargas = cargasAgora(game);
    const de = labelButton(cargas > 0 ? `Jogar de novo (${cargas})` : 'Sem partidas agora', w - 28, 46, { tint: cargas > 0 ? C.good : C.dim });
    if (cargas <= 0) de.setDisabled(true);
    de.position.set(14, y);
    de.tap(comecar);
    reg('minijogo:novo', de, w - 28, 46);
    const volta = labelButton('Voltar', w - 28, 40, { tint: C.dim, size: 13 });
    volta.position.set(14, y + 54);
    volta.tap(() => { j.fase = 'lobby'; pedirRender(); });
    reg('minijogo:voltar', volta, w - 28, 40);
    c.addChild(de, volta);
    y += 54 + 40 + 14;
    drawCard(bg, w, y, { fill: C.cardHi, accent: r.perfeito ? C.gold : C.good });
    return { c, h: y };
  }

  return {
    emJogo: () => j.fase === 'jogando',
    // chamada pela tela do Mercado quando ela se refaz
    montar(scroll, w, reg) {
      ui = {};
      if (j.fase === 'jogando') for (const it of jogo(w, reg)) scroll.add(it.c, it.h);
      else if (j.fase === 'fim') { const f = fim(w, reg); scroll.add(f.c, f.h); }
      else { const l = lobby(w, reg); scroll.add(l.c, l.h); }
    },
    // todo quadro (só enquanto a aba está à vista)
    update(dt) {
      if (j.fase === 'jogando') {
        if (j.esconderEm > 0) { j.esconderEm -= dt; if (j.esconderEm <= 0) desvirar(); }
        if (j.comecou) {
          j.restanteMs -= dt;
          pintarTempo();
          if (j.restanteMs <= 0) terminar();
        }
      } else if (j.fase === 'lobby') {
        relogioLobby += dt;
        if (relogioLobby >= 1000) { relogioLobby = 0; pintarProxima(); if (ui.proxima && cargasAgora(game) !== (j.cargasVistas ?? cargasAgora(game))) pedirRender(); j.cargasVistas = cargasAgora(game); }
      }
    },
    hooks: {
      fase: () => j.fase,
      tabuleiro: () => j.partida?.cartas.map((c) => c.material) ?? [],
      achadas: () => [...j.achadas],
      erros: () => j.erros,
      resultado: () => j.resultado,
      // testes: faz o tempo andar sem esperar
      avancar: (ms) => { j.restanteMs -= ms; if (j.restanteMs <= 0 && j.comecou) terminar(); },
    },
  };
}
