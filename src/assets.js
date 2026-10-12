// Manifesto de sprites: TODA imagem do jogo passa por aqui. Quem precisa de um ícone pede por
// (tipo, id); o manifesto devolve a arte do atlas se existir, ou um ícone provisório desenhado
// por código. Para trocar a arte, basta registrar o atlas (registerAtlas) e preencher data/icones.js:
// nenhuma tela muda.
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { DATA, raridade } from './data/index.js';
import { FONT_DISPLAY } from './ui/theme.js';
import { portraitPixels } from './ui/portrait-art.js';
import ATLAS from './assets/atlas/icones.json';
import ATLAS_32_URL from './assets/atlas/icones-32.png';
import ATLAS_64_URL from './assets/atlas/icones-64.png';
import GUI from './assets/gui/gui.json';
import GUI_URL from './assets/gui/gui.png';

let renderer = null;
const cache = new Map();
// Quadros do atlas, por tamanho da arte (32 ou 64 px): nome do quadro (ex.: 'fb123') -> Texture.
const atlas = { 32: new Map(), 64: new Map() };

// Qual arte usar: telas de alta densidade (celulares) pedem a de 64 px; as demais, a de 32 px.
const tamanhoDaArte = () => ((renderer?.resolution ?? 1) >= 1.5 ? 64 : 32);
const quadroDoAtlas = (nome) => atlas[tamanhoDaArte()].get(nome) ?? null;

const CAT_COR = {
  armas: 0xb35a4a, armaduras: 0x6d86a8, pocoes: 0x4fae7a, magia: 0x8a6fd0,
  ferramentas: 0x9a8a6a, acessorios: 0xd0a24a, comida: 0xc9854a, curiosidades: 0x7aa7a0,
};
const PADRAO = 0x8a7660;

export function initAssets(app) {
  renderer = app.renderer;
}

// Carrega o atlas de ícones (src/assets/atlas, gerado por `npm run pack:icons`). Se falhar, o jogo segue com os provisórios.
export async function carregarAtlas() {
  try {
    const [t32, t64] = await Promise.all([Assets.load(ATLAS_32_URL), Assets.load(ATLAS_64_URL)]);
    for (const [tam, tex] of [[32, t32], [64, t64]]) {
      tex.source.scaleMode = 'nearest';                     // pixel-art: sem suavizar
      for (const [nome, [cx, cy]] of Object.entries(ATLAS.quadros)) {
        atlas[tam].set(nome, new Texture({ source: tex.source, frame: new Rectangle(cx * tam, cy * tam, tam, tam) }));
      }
    }
    cache.clear();
    return true;
  } catch (err) {
    console.warn('Atlas de ícones indisponível; usando ícones provisórios.', err);
    return false;
  }
}

// ---------- peças da interface (Cryo's Mini GUI: botão, moldura de madeira, pergaminho, moedas...) ----------
// Atlas pequeno gerado por `npm run pack:gui`. Sem ele, a interface usa formas desenhadas por código (guiPronto() = false).
const gui = new Map();
export const guiPronto = () => gui.size > 0;

export async function carregarGui() {
  try {
    const tex = await Assets.load(GUI_URL);
    tex.source.scaleMode = 'nearest';
    for (const [nome, q] of Object.entries(GUI.quadros)) gui.set(nome, { tex: new Texture({ source: tex.source, frame: new Rectangle(q.x, q.y, q.w, q.h) }), margens: q.margens });
    return true;
  } catch (err) {
    console.warn('Peças da interface indisponíveis; usando formas desenhadas por código.', err);
    return false;
  }
}

// Sprite simples de uma peça (moeda, troféu...), ampliada `escala` vezes sem suavizar.
export function guiSprite(nome, escala = 2) {
  const p = gui.get(nome);
  const s = new Sprite(p?.tex ?? Texture.EMPTY);
  s.scale.set(escala);
  return s;
}

// Painel esticável (9-slice) de `w` x `h` pixels de tela; `escala` é o tamanho de cada pixel da arte.
// Feito com sprites (cantos fixos; bordas e miolo esticados, ou repetidos com `repetir: true`, que combina com texturas
// como a madeira). Funciona com peças recortadas de um atlas. `painel.setSize(w, h)` refaz o tamanho.
export function guiPainel(nome, w, h, escala = 2, { repetir = false } = {}) {
  const p = gui.get(nome);
  const [e, c, d, b] = p.margens;
  const { frame } = p.tex;
  const cont = new Container();
  const xs = [0, e, frame.width - d, frame.width];          // cortes na arte (pixels da peça)
  const ys = [0, c, frame.height - b, frame.height];
  const recorte = (x0, y0, x1, y1) => new Texture({ source: p.tex.source, frame: new Rectangle(frame.x + x0, frame.y + y0, x1 - x0, y1 - y0) });
  const pecas = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) pecas.push({ i, j, tex: recorte(xs[i], ys[j], xs[i + 1], ys[j + 1]) });

  cont.setSize = (nw, nh) => {
    for (const ch of cont.removeChildren()) ch.destroy();
    const col = [e * escala, Math.max(0, nw - (e + d) * escala), d * escala];
    const lin = [c * escala, Math.max(0, nh - (c + b) * escala), b * escala];
    const colX = [0, col[0], col[0] + col[1]];
    const rowY = [0, lin[0], lin[0] + lin[1]];
    for (const { i, j, tex } of pecas) {
      const meio = i === 1 || j === 1;
      if (repetir && meio && !(i === 1 && j === 1)) {
        // borda repetida: ladrilhos do tamanho original da arte, o último cortado
        const horizontal = j !== 1;
        const passo = (horizontal ? tex.frame.width : tex.frame.height) * escala;
        const total = horizontal ? col[1] : lin[1];
        for (let o = 0; o < total; o += passo) {
          const resto = Math.min(passo, total - o);
          const t = resto === passo ? tex : recorte(
            horizontal ? xs[1] : xs[i], horizontal ? ys[j] : ys[1],
            horizontal ? xs[1] + resto / escala : xs[i + 1], horizontal ? ys[j + 1] : ys[1] + resto / escala,
          );
          const sp = new Sprite(t);
          sp.scale.set(escala);
          sp.position.set(horizontal ? colX[1] + o : colX[i], horizontal ? rowY[j] : rowY[1] + o);
          cont.addChild(sp);
        }
      } else if (!(repetir && i === 1 && j === 1)) {
        const sp = new Sprite(tex);
        sp.position.set(colX[i], rowY[j]);
        sp.width = col[i];
        sp.height = lin[j];
        cont.addChild(sp);
      }
    }
  };
  cont.setSize(w, h);
  return cont;
}

// De onde vem a imagem de um item/material: 'atlas' (arte do pack) ou 'provisorio' (desenhada por código).
export const origemTextura = (id) => (DATA.icones[id] && quadroDoAtlas(DATA.icones[id]) ? 'atlas' : 'provisorio');
export const quadrosNoAtlas = () => atlas[32].size;

function placeholder(nome, corBase, corBorda) {
  const c = new Container();
  const g = new Graphics();
  g.roundRect(0, 0, 32, 32, 7).fill({ color: corBase, alpha: 0.95 }).stroke({ width: 2, color: corBorda });
  g.roundRect(3, 3, 26, 9, 5).fill({ color: 0xffffff, alpha: 0.12 });
  const t = new Text({ text: (nome ?? '?').trim().charAt(0).toUpperCase(), style: { fill: 0xffffff, fontSize: 18, fontFamily: FONT_DISPLAY, fontWeight: '600' } });
  t.anchor.set(0.5);
  t.position.set(16, 17);
  c.addChild(g, t);
  const tex = renderer.generateTexture({ target: c, resolution: 3 });
  c.destroy({ children: true });
  return tex;
}

// Tipos: 'item' (nome, categoria e raridade vêm dos dados), 'material'.
export function textureFor(tipo, id) {
  const key = `${tipo}:${id}`;
  if (cache.has(key)) return cache.get(key);
  let tex = null;
  const arte = DATA.icones[id] ? quadroDoAtlas(DATA.icones[id]) : null;
  if (arte) tex = arte;
  else if (renderer) {
    if (tipo === 'item') {
      const it = DATA.itens[id];
      tex = placeholder(it?.nome, CAT_COR[it?.cat] ?? PADRAO, raridade(it?.raridade)?.cor ?? 0xb9b2a3);
    } else if (tipo === 'material') {
      tex = placeholder(DATA.materiais[id]?.nome, 0x5a4a3a, 0x9a8a6a);
    } else {
      tex = placeholder('?', PADRAO, 0xffffff);
    }
  } else {
    tex = Texture.EMPTY;
  }
  cache.set(key, tex);
  return tex;
}

// Sprite quadrado de `size` pixels (o ícone de 16/32/64 do pack é escolhido pelo atlas, não aqui).
export function iconSprite(tipo, id, size = 32) {
  const s = new Sprite(textureFor(tipo, id));
  s.width = size;
  s.height = size;
  return s;
}

// ---------- retratos de aventureiros ----------
const ESCALA_RETRATO = 4;

// Textura do retrato (pixel-art, "nearest"). Usa a arte do atlas se houver um quadro `retrato_<id>` em data/icones.js.
export function portraitTexture(advId) {
  const key = `retrato:${advId}`;
  if (cache.has(key)) return cache.get(key);
  const arte = DATA.icones[`retrato_${advId}`] ? quadroDoAtlas(DATA.icones[`retrato_${advId}`]) : null;
  if (arte) { cache.set(key, arte); return arte; }
  if (!renderer) return Texture.EMPTY;
  const adv = DATA.aventureiros[advId];
  const cor = DATA.meta.classes.find((c) => c.id === adv?.classe)?.cor;
  const { grade, pixels } = portraitPixels(advId, adv?.classe, cor);
  const g = new Graphics();
  for (const [x, y, c] of pixels) g.rect(x * ESCALA_RETRATO, y * ESCALA_RETRATO, ESCALA_RETRATO, ESCALA_RETRATO).fill(c);
  const tex = renderer.generateTexture({ target: g, resolution: 1, frame: new Rectangle(0, 0, grade * ESCALA_RETRATO, grade * ESCALA_RETRATO) });
  tex.source.scaleMode = 'nearest';
  g.destroy();
  cache.set(key, tex);
  return tex;
}

export function portraitSprite(advId, size = 64) {
  const s = new Sprite(portraitTexture(advId));
  s.width = size;
  s.height = size;
  return s;
}
