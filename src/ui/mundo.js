// Mapa-múndi (aba "Mapa" do Mercado): uma imagem grande das seis regiões, feita com os tilesets do pack Ninja Adventure
// (scripts/pack-mapa.mjs), que se arrasta com o dedo. As regiões fechadas ficam sob névoa; tocar numa região abre a janela
// dela (materiais, achados raros e expedições, ui/mapa.js). Os batedores de cada expedição caminham pelo caminho tracejado:
// vão na primeira metade do tempo e voltam na segunda.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt } from './ui.js';
import { mapaPronto, mapaDados, mapaSprite, batedorSprite, batedoresQtd, emoteSprite } from '../assets.js';
import { regiaoAberta, slotsExpedicao } from '../core/expeditions.js';
import { cartaoRegiao, pintarMapa } from './mapa.js';

const ESC = 2;                       // pixels de tela por pixel da imagem (inteiro: pixel-art nítida)
const COR_PINO = { vila: 0xd8b04a, floresta: 0x5fae5a, montanhas: 0xdfe8ee, deserto: 0xe89a4a, pantano: 0x5cb0a8, dragao: 0xd8574a };
const PASSO_MS = 150;                // duração de cada quadro da caminhada
const VELOCIDADE_INERCIA = 0.94;

export function createMundo({ game, toast, modal }) {
  const root = new Container();
  const mundo = new Container();                 // a câmera: anda ao arrastar
  const terreno = mapaSprite(ESC);
  const trilha = new Graphics();
  const nevoa = new Graphics();
  const pinos = new Container();
  const andarilhos = new Container();
  const maskG = new Graphics();
  const hud = new Container();
  const placa = new Graphics();
  let rotuloBatedores = txt('', C.dim, 12, true);
  hud.addChild(placa, rotuloBatedores);
  mundo.addChild(terreno, trilha, nevoa, andarilhos, pinos);
  root.addChild(mundo, maskG, hud);
  mundo.mask = maskG;
  root.eventMode = 'static';

  let R = { w: 360, h: 500 };
  const W = mapaDados.largura * ESC;
  const H = mapaDados.altura * ESC;
  const cam = { x: 0, y: 0, vx: 0, vy: 0 };       // posição do canto esquerdo/superior da tela no mapa (pixels de tela)
  let focado = false;
  let aberto = false;
  const regioes = () => game.data.listas.regioes;
  const ponto = (id) => mapaDados.regioes[id].hub.map((n) => n * ESC);
  const ilha = (id) => mapaDados.regioes[id].ilha.map((n) => n * ESC);

  // ---------- janela da região ----------
  const refsJanela = {};                          // botões da janela, para os testes
  let barras = [];
  let tempos = [];
  let janelaDe = null;
  function abrirRegiao(id) {
    const r = game.data.regioes[id];
    janelaDe = id;
    modal.open({
      title: r.nome,
      build: (sc, w) => {
        for (const k of Object.keys(refsJanela)) delete refsJanela[k];
        barras = [];
        tempos = [];
        const { c, h } = cartaoRegiao(r, w, {
          game, toast, modal, barras, tempos,
          reg: (nome, b, ww, hh) => { refsJanela[nome] = { c: b, w: ww, h: hh }; },
          aoIniciar: () => modal.close(),
        });
        sc.add(c, h);
        pintarMapa(game, barras, tempos);
      },
    });
  }

  // ---------- desenho ----------
  function limites() {
    const minX = Math.min(0, R.w - W);
    const minY = Math.min(0, R.h - H);
    return { minX, minY, maxX: W <= R.w ? (R.w - W) / 2 : 0, maxY: H <= R.h ? (R.h - H) / 2 : 0 };
  }
  function aplicarCamera() {
    const l = limites();
    const lx = W <= R.w ? l.maxX : -Math.max(0, Math.min(W - R.w, cam.x));
    const ly = H <= R.h ? l.maxY : -Math.max(0, Math.min(H - R.h, cam.y));
    cam.x = -lx;
    cam.y = -ly;
    mundo.position.set(lx, ly);
  }
  function centralizar(x, y) {
    cam.x = x - R.w / 2;
    cam.y = y - R.h / 2;
    cam.vx = cam.vy = 0;
    aplicarCamera();
  }

  function desenharTrilha() {
    trilha.clear();
    const lista = regioes();
    for (let i = 0; i < lista.length - 1; i++) {
      const [x0, y0] = ponto(lista[i].id);
      const [x1, y1] = ponto(lista[i + 1].id);
      const aberta = regiaoAberta(game, lista[i + 1].id);
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const passos = Math.floor(dist / 14);
      for (let k = 0; k < passos; k++) {
        const t = (k + 0.5) / passos;
        trilha.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 2.5).fill({ color: 0x7a3b2a, alpha: aberta ? 0.95 : 0.4 });
      }
    }
  }

  function desenharNevoa() {
    nevoa.clear();
    for (const r of regioes()) {
      if (regiaoAberta(game, r.id)) continue;
      const [x, y, w, h] = ilha(r.id);
      const cor = 0x1d3a4c;
      nevoa.roundRect(x - 6, y - 6, w + 12, h + 12, 26).fill({ color: cor, alpha: 0.74 });
      for (let k = 0; k < 2 * (Math.floor(w / 28) + Math.floor(h / 28)); k++) {      // bordas de nuvem, em bolinhas
        const lado = k % 4;
        const t = ((k * 37) % 100) / 100;
        const cx = lado === 0 ? x + t * w : lado === 1 ? x + w + 2 : lado === 2 ? x + t * w : x - 2;
        const cy = lado === 0 ? y - 2 : lado === 1 ? y + t * h : lado === 2 ? y + h + 2 : y + t * h;
        nevoa.circle(cx, cy, 14 + (k % 3) * 3).fill({ color: cor, alpha: 0.4 });
      }
      for (let k = 0; k < 14; k++) {                                              // brilho de névoa
        nevoa.roundRect(x + ((k * 53) % 97) / 100 * (w - 40), y + ((k * 29) % 91) / 100 * (h - 10), 36, 6, 3).fill({ color: 0xffffff, alpha: 0.07 });
      }
    }
  }

  const pinosPorRegiao = {};
  function desenharPinos() {
    pinos.removeChildren().forEach((c) => c.destroy({ children: true }));
    for (const k of Object.keys(pinosPorRegiao)) delete pinosPorRegiao[k];
    for (const r of regioes()) {
      const aberta = regiaoAberta(game, r.id);
      const [x, y] = ponto(r.id);
      const c = new Container();
      c.position.set(x, y);
      const anel = new Graphics();
      const pino = new Graphics();
      const cor = aberta ? COR_PINO[r.id] : 0x8a97a3;
      pino.circle(0, 0, 9).fill(0x000000).circle(0, 0, 8).fill(0xffffff).circle(0, 0, 6).fill(cor);
      const nome = txt(aberta ? r.nome : `${r.nome} · rep ${r.nivelRep}`, aberta ? C.text : 0xcfd8e0, 11, true);
      const placaNome = new Graphics();
      const pw = nome.width + 14;
      placaNome.roundRect(-pw / 2, 14, pw, nome.height + 6, 8).fill({ color: 0x1b1410, alpha: 0.82 }).stroke({ width: 1, color: aberta ? cor : 0x8a97a3, alpha: 0.9 });
      nome.position.set(-nome.width / 2, 17);
      c.addChild(anel, pino, placaNome, nome);
      pinos.addChild(c);
      pinosPorRegiao[r.id] = { c, anel, pino, nome };
    }
  }

  function pintarAneis(agora) {
    for (const r of regioes()) {
      const p = pinosPorRegiao[r.id];
      if (!p) continue;
      const e = game.state.expedicoes.find((x) => x.regiao === r.id);
      p.anel.clear();
      if (p.aviso) { p.aviso.destroy(); p.aviso = null; }
      if (!e) continue;
      const f = Math.max(0, Math.min(1, (agora - e.inicio) / (e.fim - e.inicio)));
      if (f >= 1) {
        p.anel.circle(0, 0, 13).stroke({ width: 3, color: C.good });
        const em = emoteSprite(21, 3);
        em.position.set(-21, -52 - Math.abs(Math.sin(agora / 260)) * 5);
        p.c.addChild(em);
        p.aviso = em;
      } else {
        p.anel.circle(0, 0, 13).stroke({ width: 3, color: 0x000000, alpha: 0.5 });
        p.anel.arc(0, 0, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f).stroke({ width: 3, color: C.accent });
      }
    }
  }

  // ---------- batedores caminhando ----------
  const walkers = new Map();                       // uid da expedição -> sprite
  function trajeto(regiaoId) {
    const ids = regioes().map((r) => r.id);
    return ids.slice(0, ids.indexOf(regiaoId) + 1).map(ponto);
  }
  // posição e direção (0 de frente, 1 de costas, 2 esquerda, 3 direita) a uma fração `t` (0..1) do trajeto
  function sobreTrajeto(pts, t, voltando) {
    if (pts.length < 2) return { x: pts[0][0], y: pts[0][1], dir: 0 };
    const seg = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); total += d; }
    let alvo = t * total;
    for (let i = 0; i < seg.length; i++) {
      if (alvo <= seg[i] || i === seg.length - 1) {
        const k = Math.min(1, alvo / seg[i]);
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        let dx = bx - ax;
        let dy = by - ay;
        if (voltando) { dx = -dx; dy = -dy; }
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
        return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dir };
      }
      alvo -= seg[i];
    }
    return { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], dir: 0 };
  }

  function moverBatedores(agora, relogioMs) {
    const vivos = new Set();
    for (const e of game.state.expedicoes) {
      vivos.add(e.uid);
      let s = walkers.get(e.uid);
      if (!s) { s = batedorSprite(e.uid % batedoresQtd(), ESC); andarilhos.addChild(s); walkers.set(e.uid, s); }
      const pts = trajeto(e.regiao);
      const f = Math.max(0, Math.min(1, (agora - e.inicio) / (e.fim - e.inicio)));
      const parado = f >= 1;
      const ida = f < 0.5;
      const t = parado ? 0 : ida ? f * 2 : 2 - f * 2;
      const pos = sobreTrajeto(pts, t, !ida && !parado);
      s.position.set(pos.x, pos.y + 6 - (parado ? 0 : Math.abs(Math.sin(relogioMs / (PASSO_MS * 2))) * 2));
      s.pose(parado ? 0 : pos.dir, parado ? 0 : Math.floor(relogioMs / PASSO_MS));
    }
    for (const [uid, s] of walkers) if (!vivos.has(uid)) { s.destroy(); walkers.delete(uid); }
  }

  // ---------- HUD ----------
  function desenharHud() {
    rotuloBatedores.text = `Batedores em campo: ${game.state.expedicoes.length}/${slotsExpedicao(game)}`;
    rotuloBatedores.position.set(18, 14);
    placa.clear().roundRect(8, 8, rotuloBatedores.width + 20, rotuloBatedores.height + 12, 10).fill({ color: 0x1b1410, alpha: 0.78 }).stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
  }

  function montar() {
    desenharTrilha();
    desenharNevoa();
    desenharPinos();
    desenharHud();
    pintarAneis(game.clock.now());
  }

  // ---------- arrastar e tocar ----------
  let toque = null;
  const emIlha = (x, y) => {
    const mx = x - mundo.x;
    const my = y - mundo.y;
    let melhor = null;
    for (const r of regioes()) {
      const [ix, iy, iw, ih] = ilha(r.id);
      if (mx >= ix - 8 && mx <= ix + iw + 8 && my >= iy - 8 && my <= iy + ih + 8) melhor = r.id;
    }
    return melhor;
  };
  root.on('pointerdown', (e) => {
    const p = root.toLocal(e.global);
    toque = { x: p.x, y: p.y, ult: { x: p.x, y: p.y }, t: performance.now(), mexeu: false };
    cam.vx = cam.vy = 0;
  });
  root.on('globalpointermove', (e) => {
    if (!toque) return;
    const p = root.toLocal(e.global);
    if (!toque.mexeu && Math.hypot(p.x - toque.x, p.y - toque.y) > 8) toque.mexeu = true;
    if (toque.mexeu) {
      const agora = performance.now();
      const dt = Math.max(1, agora - toque.t);
      const dx = toque.ult.x - p.x;
      const dy = toque.ult.y - p.y;
      cam.x += dx;
      cam.y += dy;
      cam.vx = cam.vx * 0.6 + (dx / dt) * 0.4;
      cam.vy = cam.vy * 0.6 + (dy / dt) * 0.4;
      toque.t = agora;
      aplicarCamera();
    }
    toque.ult = { x: p.x, y: p.y };
  });
  const soltar = (e) => {
    if (!toque) return;
    const t = toque;
    toque = null;
    if (t.mexeu) return;
    const p = root.toLocal(e.global);
    const id = emIlha(p.x, p.y);
    if (id) abrirRegiao(id);
  };
  root.on('pointerup', soltar);
  root.on('pointerupoutside', () => { toque = null; });

  // ---------- ciclo ----------
  let relogio = 0;
  let relogioBarras = 0;
  const api = {
    root,
    pronto: () => mapaPronto(),
    resize(rect) {
      R = { w: rect.w, h: rect.h };
      root.hitArea = new Rectangle(0, 0, R.w, R.h);
      maskG.clear().rect(0, 0, R.w, R.h).fill(0xffffff);
      aplicarCamera();
    },
    show() {
      aberto = true;
      montar();
      if (!focado) {
        focado = true;
        const pronta = game.state.expedicoes.find((e) => e.fim <= game.clock.now());
        const alvo = pronta ? pronta.regiao : [...regioes()].reverse().find((r) => regiaoAberta(game, r.id))?.id ?? 'vila';
        const [x, y] = ponto(alvo);
        centralizar(x, y);
      } else aplicarCamera();
    },
    hide() { aberto = false; },
    atualizar() { if (aberto) montar(); },
    update(dt) {
      relogio += dt;
      if (!aberto) return;
      if (!toque && (Math.abs(cam.vx) > 0.02 || Math.abs(cam.vy) > 0.02)) {
        cam.x += cam.vx * dt;
        cam.y += cam.vy * dt;
        cam.vx *= VELOCIDADE_INERCIA ** (dt / 16);
        cam.vy *= VELOCIDADE_INERCIA ** (dt / 16);
        aplicarCamera();
      }
      const agora = game.clock.now();
      moverBatedores(agora, relogio);
      relogioBarras += dt;
      if (relogioBarras >= 120) {
        relogioBarras = 0;
        pintarAneis(agora);
        if (modal.isOpen?.() && (barras.length || tempos.length)) pintarMapa(game, barras, tempos);
        desenharHud();
      }
    },
    janelaAberta: () => janelaDe,
    refs: refsJanela,
    hooks: {
      pronto: () => mapaPronto() && aberto,
      camera: () => ({ x: Math.round(cam.x), y: Math.round(cam.y), w: R.w, h: R.h, mundoW: W, mundoH: H }),
      centroDe: (id) => { const [x, y] = ponto(id); return root.toGlobal({ x: x + mundo.x, y: y + mundo.y }); },
      visivel: (id) => { const [x, y] = ponto(id); const gx = x + mundo.x; const gy = y + mundo.y; return gx > 0 && gx < R.w && gy > 0 && gy < R.h; },
      centralizarEm: (id) => { const [x, y] = ponto(id); centralizar(x, y); },
      batedores: () => walkers.size,
      aviso: (id) => !!pinosPorRegiao[id]?.aviso,
    },
  };
  return api;
}
