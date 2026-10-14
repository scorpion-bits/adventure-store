// Monta o atlas dos ícones de itens e materiais (src/assets/itens/) a partir de packs de licença livre (CC0): tudo o que o jogo
// mostra como ícone de item ou de material está em src/data/icones.js, e cada quadro tem um nome que diz de onde vem:
//   cc_<pacote>__<caminho>[~transformação]  um PNG 32x32 dos packs CC0 baixados em assets-src/cc0/pacotes/<pacote>/<caminho>.png
//                                           (no nome, "+" separa as pastas do caminho; ex.: cc_food-ocal__32x32+drink+milk_carton)
//   nj_<Pasta>_<Nome>                       um ícone 16x16 do Ninja Adventure: Items/<Pasta>/<Nome>.png (ou Items/Weapons/<Nome>/Sprite.png);
//                                           espaços somem do nome ("Fishing Rod" vira FishingRod)
//   ns_<Categoria>_<Nome>                   o primeiro quadro (16x16) de Actor/<Categoria>/<Nome>/SpriteSheet.png do Ninja Adventure
// Transformações (depois de "~", podem ser encadeadas): H+60 gira o matiz em graus, V0.55 escurece (multiplica o brilho),
// T1,0.55,0.45 multiplica R,G,B. Servem para derivar uma variante de uma arte que já existe (ex.: cogumelo azul).
// Os ícones de 16 px são ampliados 2x (pixel exato) para ficarem na mesma célula de 32 px.
// Os PNGs originais ficam em assets-src/ (fora do git); só o atlas gerado entra no repositório.
// Uso:  npm run pack:itens                                   (usa assets-src/ninja e assets-src/cc0/pacotes)
//       npm run pack:itens -- <pasta-do-ninja> <pasta-dos-pacotes-cc0>
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPng, gravarPng } from './lib/png.mjs';
import { ICONES } from '../src/data/icones.js';

let ninja = resolve(process.argv[2] ?? 'assets-src/ninja');
if (existsSync(resolve(ninja, 'Ninja Adventure - Asset Pack'))) ninja = resolve(ninja, 'Ninja Adventure - Asset Pack');
const cc0 = resolve(process.argv[3] ?? 'assets-src/cc0/pacotes');
const CELULA = 32;
const COLUNAS = 16;

// ---------- onde está cada arte ----------
const itensNinja = {};
const pastaItens = resolve(ninja, 'Items');
if (existsSync(pastaItens)) {
  for (const pasta of readdirSync(pastaItens)) {
    const dir = resolve(pastaItens, pasta);
    if (!statSync(dir).isDirectory()) continue;
    for (const nome of readdirSync(dir)) {
      const cam = resolve(dir, nome);
      if (statSync(cam).isDirectory()) {
        if (existsSync(resolve(cam, 'Sprite.png'))) itensNinja[`nj_${pasta}_${nome.replace(/ /g, '')}`] = resolve(cam, 'Sprite.png');
      } else if (nome.endsWith('.png')) {
        itensNinja[`nj_${pasta}_${nome.slice(0, -4).replace(/ /g, '')}`] = cam;
      }
    }
  }
}
// folhas com várias imagens lado a lado: só o primeiro quadro (largura em pixels) é o ícone
const PRIMEIRO_QUADRO = { nj_Treasure_BigTreasureChest: 16, nj_Treasure_LittleTreasureChest: 16, nj_Treasure_Coin2: 10 };

function achar(base) {
  if (base.startsWith('nj_')) return itensNinja[base] ? { arq: itensNinja[base] } : null;
  if (base.startsWith('ns_')) {
    const [, categoria, nome] = base.split('_');
    const arq = resolve(ninja, 'Actor', categoria, nome, 'SpriteSheet.png');
    return existsSync(arq) ? { arq, recorte: [0, 0, 16, 16] } : null;
  }
  if (base.startsWith('cc_')) {
    const [pacote, caminho] = base.slice(3).split('__');
    const arq = resolve(cc0, pacote, `${caminho.replaceAll('+', '/')}.png`);
    return existsSync(arq) ? { arq } : null;
  }
  return null;
}

// ---------- pixels ----------
const rgb2hsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
};
const hsv2rgb = (h, s, v) => {
  const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
};
const limita = (n) => Math.max(0, Math.min(255, Math.round(n)));

function transformar(img, t) {
  const { px } = img;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    let [r, g, b] = [px[i], px[i + 1], px[i + 2]];
    if (t[0] === 'H') { const [h, s, v] = rgb2hsv(r, g, b); [r, g, b] = hsv2rgb((h + Number(t.slice(1)) + 360) % 360, s, v); }
    else if (t[0] === 'V') { const f = Number(t.slice(1)); [r, g, b] = [r * f, g * f, b * f]; }
    else if (t[0] === 'T') { const m = t.slice(1).split(',').map(Number); [r, g, b] = [r * m[0], g * m[1], b * m[2]]; }
    else throw new Error(`transformação desconhecida: ${t}`);
    px[i] = limita(r); px[i + 1] = limita(g); px[i + 2] = limita(b);
  }
}

function recortar(img, x, y, w, h) {
  const px = Buffer.alloc(w * h * 4);
  for (let j = 0; j < h; j++) img.px.copy(px, j * w * 4, ((y + j) * img.w + x) * 4, ((y + j) * img.w + x + w) * 4);
  return { w, h, px };
}

function carregar(chave) {
  const [base, ...transf] = chave.split('~');
  const onde = achar(base);
  if (!onde) return null;
  let img = lerPng(readFileSync(onde.arq));
  if (onde.recorte) img = recortar(img, ...onde.recorte);
  else if (PRIMEIRO_QUADRO[base]) img = recortar(img, 0, 0, PRIMEIRO_QUADRO[base], img.h);
  for (const t of transf) transformar(img, t);
  return img;
}

// ---------- atlas ----------
const usados = [...new Set(Object.values(ICONES))].filter((q) => /^(cc|nj|ns)_/.test(q)).sort();
const outras = Object.values(ICONES).filter((q) => !/^(cc|nj|ns)_/.test(q));
if (outras.length) { console.error(`Ícones com origem desconhecida em data/icones.js: ${[...new Set(outras)].join(', ')}.`); process.exit(1); }
const faltando = usados.filter((q) => !achar(q.split('~')[0]));
if (faltando.length) {
  console.error(`Não achei a arte de: ${faltando.join(', ')}.\nConfira assets-src/ninja e assets-src/cc0/pacotes (veja o README).`);
  process.exit(1);
}
const linhas = Math.ceil(usados.length / COLUNAS);
const w = COLUNAS * CELULA;
const h = linhas * CELULA;
const atlas = Buffer.alloc(w * h * 4);
const quadros = {};
usados.forEach((chave, i) => {
  const img = carregar(chave);
  if (img.w > CELULA || img.h > CELULA) throw new Error(`${chave}: ${img.w}x${img.h} é maior que ${CELULA}x${CELULA}.`);
  const esc = img.w <= 16 && img.h <= 16 ? 2 : 1;          // arte de 16 px: ampliada 2x, sem suavizar
  const cx = i % COLUNAS;
  const cy = Math.floor(i / COLUNAS);
  quadros[chave] = [cx, cy];
  const dx = Math.floor((CELULA - img.w * esc) / 2);
  const dy = Math.floor((CELULA - img.h * esc) / 2);
  for (let y = 0; y < img.h * esc; y++) {
    for (let x = 0; x < img.w * esc; x++) {
      const o = ((Math.floor(y / esc)) * img.w + Math.floor(x / esc)) * 4;
      img.px.copy(atlas, ((cy * CELULA + dy + y) * w + cx * CELULA + dx + x) * 4, o, o + 4);
    }
  }
});
mkdirSync(resolve('src/assets/itens'), { recursive: true });
writeFileSync(resolve('src/assets/itens/itens.png'), gravarPng({ w, h, px: atlas }));
writeFileSync(resolve('src/assets/itens/itens.json'), `${JSON.stringify({ tamanho: CELULA, colunas: COLUNAS, linhas, quadros })}\n`);
console.log(`Atlas de ícones: ${usados.length} ícones, ${w}x${h}.`);
