// Monta a imagem do mapa-múndi a partir dos tilesets do pack "Ninja Adventure" (CC0): mar, uma ilha de cada região
// (as ilhas usam o bloco 3x3 de "terreno" do TilesetField, em cores diferentes) e enfeites (árvores, pedras, casas...).
// O pack original fica em assets-src/ninja (fora do git); só a imagem gerada entra no repositório.
// Uso:  npm run pack:mapa                       (usa assets-src/ninja)
//       npm run pack:mapa -- <pasta-do-pack>
// Gera src/assets/mapa/mapa.png e mapa.json (tamanho em pixels e onde fica cada região). Tudo é desenhado em pixels
// de 1x (tiles de 16 px); o jogo mostra a imagem em escala inteira.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPng, gravarPng } from './lib/png.mjs';

let raiz = resolve(process.argv[2] ?? 'assets-src/ninja');
if (existsSync(resolve(raiz, 'Ninja Adventure - Asset Pack'))) raiz = resolve(raiz, 'Ninja Adventure - Asset Pack');
const pasta = resolve(raiz, 'Backgrounds', 'Tilesets');
if (!existsSync(pasta)) {
  console.error('Não achei o pack. Descompacte "Ninja Adventure - Asset Pack" em assets-src/ninja ou passe a pasta como argumento.');
  process.exit(1);
}
const T = 16;
const folhas = {};
const folha = (nome) => (folhas[nome] ??= lerPng(readFileSync(resolve(pasta, `Tileset${nome}.png`))));

// ---------- pixels ----------
const COLUNAS = 24;
const LINHAS = 51;
const W = COLUNAS * T;
const H = LINHAS * T;
const mapa = { w: W, h: H, px: Buffer.alloc(W * H * 4) };

// copia o retângulo (sx, sy, w, h) de `src` para `dst` em (dx, dy), compondo a transparência; `fn` muda a cor de cada pixel
function copiar(dst, src, sx, sy, w, h, dx, dy, fn) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = dx + x;
      const py = dy + y;
      if (px < 0 || py < 0 || px >= dst.w || py >= dst.h) continue;
      const i = ((sy + y) * src.w + sx + x) * 4;
      const a = src.px[i + 3];
      if (!a) continue;
      let r = src.px[i];
      let g = src.px[i + 1];
      let b = src.px[i + 2];
      if (fn) [r, g, b] = fn(r, g, b);
      const j = (py * dst.w + px) * 4;
      if (a === 255) { dst.px[j] = r; dst.px[j + 1] = g; dst.px[j + 2] = b; dst.px[j + 3] = 255; continue; }
      const k = a / 255;
      dst.px[j] = Math.round(r * k + dst.px[j] * (1 - k));
      dst.px[j + 1] = Math.round(g * k + dst.px[j + 1] * (1 - k));
      dst.px[j + 2] = Math.round(b * k + dst.px[j + 2] * (1 - k));
      dst.px[j + 3] = Math.max(dst.px[j + 3], a);
    }
  }
}

function pintar(x0, y0, w, h, [r, g, b]) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const j = (y * W + x) * 4; mapa.px[j] = r; mapa.px[j + 1] = g; mapa.px[j + 2] = b; mapa.px[j + 3] = 255; }
}

// aleatório repetível (as mesmas ilhas a cada geração)
let semente = 20261013;
const rnd = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 2 ** 32; };

// ---------- mar ----------
const MAR = [106, 215, 232];
const MAR_ESCURO = [86, 190, 214];
pintar(0, 0, W, H, MAR);
for (let i = 0; i < 260; i++) {              // marolas: pequenos traços mais claros/escuros
  const x = Math.floor(rnd() * (W - 8));
  const y = Math.floor(rnd() * (H - 2));
  pintar(x, y, 4 + Math.floor(rnd() * 4), 1, rnd() < 0.5 ? [150, 235, 245] : MAR_ESCURO);
}

// ---------- ilhas (terreno do TilesetField: 5 cores, cada uma um bloco de 3x3 com cantos, bordas e miolo) ----------
const campo = folha('Field');
const COR = { laranja: 0, verde: 3, mata: 6, rosa: 9, branco: 12 };
const tingir = {
  nenhum: null,
  // pântano: a mata esverdeada vira verde-azulado turvo
  brejo: (r, g, b) => [Math.round(r * 0.6 + b * 0.25 + 10), Math.round(g * 0.85 + 6), Math.round(b * 1.5 + 34)],
  // cume do dragão: o rosa vira rocha vulcânica avermelhada
  vulcao: (r, g, b) => [Math.round(r * 0.7), Math.round(g * 0.42), Math.round(b * 0.45)],
};

function ilha(x, y, w, h, cor, tom) {
  const fn = tingir[tom ?? 'nenhum'];
  const base = COR[cor];
  const bloco = (tx, ty, dx, dy) => copiar(mapa, campo, tx * T, (base + ty) * T, T, T, dx * T, dy * T, fn);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const tx = i === 0 ? 0 : i === w - 1 ? 2 : 1;
      const ty = j === 0 ? 0 : j === h - 1 ? 2 : 1;
      bloco(tx, ty, x + i, y + j);
    }
  }
}

// ---------- enfeites ----------
const N = 'Nature';
const O = {
  arvore: [N, 0, 0, 32, 32], pinheiro: [N, 32, 0, 32, 32], morta: [N, 64, 0, 32, 32], nevada: [N, 128, 0, 32, 32], nevada2: [N, 160, 0, 32, 32],
  oliva: [N, 288, 0, 32, 32], verde2: [N, 256, 0, 32, 32], branca: [N, 192, 0, 32, 32],
  pinheiros: [N, 0, 32, 64, 48], bosque: [N, 64, 32, 64, 48], oliveiras: [N, 320, 32, 64, 48],
  mortas: [N, 0, 80, 64, 48], nevados: [N, 64, 80, 64, 48], nevados2: [N, 128, 80, 64, 48],
  pedrasMarrons: [N, 192, 80, 64, 48], pedrasCinza: [N, 256, 80, 64, 48],
  rochaMarrom: [N, 273, 163, 62, 38], rochaCinza: [N, 273, 227, 62, 43], pedraMarrom: [N, 240, 163, 32, 29], pedraCinza: [N, 240, 227, 32, 30],
  grande: [N, 48, 288, 48, 48], grandeLaranja: [N, 144, 288, 48, 48], grandeRosa: [N, 0, 288, 48, 48],
  casa1: ['House', 0, 0, 64, 48], casa2: ['House', 64, 0, 64, 48], casa3: ['House', 128, 0, 64, 48], casa4: ['House', 192, 0, 64, 48],
  torii: ['House', 8, 82, 40, 14],
  cupula: ['Desert', 0, 0, 45, 50], torre: ['Desert', 48, 0, 47, 64], palmeira: ['Desert', 160, 112, 64, 48],
};
const objetos = [];
// (nome, coluna do tile, linha do tile, deslocamento x/y em pixels): o pé do enfeite fica na base do tile indicado
const coloca = (nome, tx, ty, ox = 0, oy = 0, tom) => objetos.push({ nome, x: tx * T + ox, y: ty * T + oy, tom });

// ---------- as seis regiões (de baixo para cima: o jogo vai subindo o mapa) ----------
const REGIOES = [
  { id: 'vila', ilha: [2, 41, 10, 9, 'verde'], hub: [6, 47.5] },
  { id: 'floresta', ilha: [12, 33, 11, 9, 'mata'], hub: [17, 38] },
  { id: 'montanhas', ilha: [2, 25, 10, 9, 'branco'], hub: [7, 30] },
  { id: 'deserto', ilha: [12, 17, 11, 9, 'laranja'], hub: [17, 22] },
  { id: 'pantano', ilha: [2, 9, 10, 9, 'mata', 'brejo'], hub: [6.5, 15.5] },
  { id: 'dragao', ilha: [11, 1, 12, 9, 'rosa', 'vulcao'], hub: [17, 5] },
];
for (const r of REGIOES) ilha(...r.ilha);

// vila: casas e árvores
coloca('casa1', 5, 46); coloca('casa2', 9, 45); coloca('casa3', 9, 49); coloca('arvore', 3, 44); coloca('arvore', 11, 47); coloca('torii', 5, 49);
// floresta
coloca('pinheiros', 15, 38); coloca('pinheiro', 21, 37); coloca('pinheiro', 14, 41); coloca('pinheiros', 19, 41); coloca('pinheiro', 17, 35);
// montanhas
coloca('nevados', 4, 30); coloca('rochaCinza', 9, 33); coloca('pedrasCinza', 4, 33); coloca('nevada', 10, 29); coloca('nevada2', 7, 27);
// deserto
coloca('cupula', 15, 22); coloca('palmeira', 20, 21); coloca('torre', 19, 25); coloca('rochaMarrom', 14, 25);
// pântano
coloca('oliveiras', 4, 14); coloca('oliva', 10, 13); coloca('oliveiras', 9, 17); coloca('morta', 4, 17); coloca('oliva', 7, 12);
// dragão
coloca('pedrasMarrons', 14, 6, 0, 0, 'vulcao'); coloca('rochaMarrom', 20, 6, 0, 0, 'vulcao'); coloca('mortas', 17, 9, 0, 0, 'vulcao');
coloca('pedraMarrom', 13, 9, 0, 0, 'vulcao'); coloca('pedraMarrom', 21, 9, 0, 0, 'vulcao');

objetos.sort((a, b) => a.y - b.y);
for (const o of objetos) {
  const [nome, sx, sy, w, h] = O[o.nome];
  copiar(mapa, folha(nome), sx, sy, w, h, Math.round(o.x - w / 2), o.y - h, tingir[o.tom ?? 'nenhum']);
}

mkdirSync(resolve('src/assets/mapa'), { recursive: true });
writeFileSync(resolve('src/assets/mapa/mapa.png'), gravarPng(mapa));
const regioes = Object.fromEntries(REGIOES.map((r) => [r.id, { ilha: r.ilha.slice(0, 4).map((n) => n * T), hub: r.hub.map((n) => Math.round(n * T)) }]));
writeFileSync(resolve('src/assets/mapa/mapa.json'), `${JSON.stringify({ largura: W, altura: H, tile: T, regioes })}\n`);
console.log(`Mapa: ${W}x${H} px, ${REGIOES.length} regiões, ${objetos.length} enfeites.`);

// ---------- batedores: o passo a passo dos personagens que caminham pelo mapa ----------
// Cada SpriteSheet.png tem 4 colunas (de frente, de costas, esquerda, direita) e, nas 4 primeiras linhas, os 4 quadros da caminhada.
// Aqui cada personagem vira um bloco de 64x64 (empilhados na vertical): quadro (direção d, passo p) em (d*16, i*64 + p*16).
const BATEDORES = ['Hunter', 'Samurai', 'Cavegirl', 'Knight', 'Villager2', 'NinjaBlue'];
const bw = 64;
const bh = 64 * BATEDORES.length;
const batedores = { w: bw, h: bh, px: Buffer.alloc(bw * bh * 4) };
BATEDORES.forEach((nome, i) => {
  const arq = resolve(raiz, 'Actor', 'Character', nome, 'SpriteSheet.png');
  if (!existsSync(arq)) { console.error(`Falta o personagem ${nome}.`); process.exit(1); }
  const img = lerPng(readFileSync(arq));
  if (img.w !== 64) throw new Error(`${nome}: SpriteSheet com ${img.w} px de largura, esperava 64.`);
  copiar(batedores, img, 0, 0, 64, 64, 0, i * 64);
});
writeFileSync(resolve('src/assets/mapa/batedores.png'), gravarPng(batedores));
writeFileSync(resolve('src/assets/mapa/batedores.json'), `${JSON.stringify({ tamanho: 16, personagens: BATEDORES })}\n`);
console.log(`Batedores: ${BATEDORES.length} personagens.`);
