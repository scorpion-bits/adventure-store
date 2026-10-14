// Monta os atlas de retratos e de emotes a partir do pack "Ninja Adventure" (Pixel-boy e AAA, licença CC0: uso livre, até comercial).
// O pack original (11 MB) fica em assets-src/ (fora do git); só os atlas gerados entram no repositório.
// Uso:  npm run pack:ninja                       (usa assets-src/ninja)
//       npm run pack:ninja -- <pasta-do-pack>    (a pasta que tem "Ninja Adventure - Asset Pack" dentro, ou a própria)
// Gera:
//  - src/assets/retratos/retratos.png e .json: um quadro de 38x38 por retrato usado em src/data/retratos.js, com o FUNDO REMOVIDO
//    (os retratos do pack são opacos, com o fundo numa cor única; ela é apagada a partir das bordas e o contorno escuro do desenho fica);
//  - src/assets/emotes/emotes.png e .json: os 30 balões de emoção (14x13).
//  (os ícones de itens e materiais têm o próprio script: `npm run pack:itens`)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPng, gravarPng } from './lib/png.mjs';
import { RETRATOS } from '../src/data/retratos.js';

let raiz = resolve(process.argv[2] ?? 'assets-src/ninja');
if (existsSync(resolve(raiz, 'Ninja Adventure - Asset Pack'))) raiz = resolve(raiz, 'Ninja Adventure - Asset Pack');
if (!existsSync(resolve(raiz, 'Actor'))) {
  console.error('Não achei o pack. Descompacte "Ninja Adventure - Asset Pack" em assets-src/ninja ou passe a pasta como argumento.');
  process.exit(1);
}

const CATEGORIAS = { c: 'Character', m: 'Monster', b: 'Boss', a: 'Animal' };
const FUNDO = [20, 27, 27];               // a cor de fundo dos retratos (#141B1B)
const TAM = 38;
const COLUNAS = 16;

// apaga o fundo conectado às bordas (pixels da cor de fundo ligados por cima, baixo, esquerda ou direita)
function tirarFundo({ w, h, px }) {
  const visto = new Uint8Array(w * h);
  const pilha = [];
  const eFundo = (x, y) => px[(y * w + x) * 4] === FUNDO[0] && px[(y * w + x) * 4 + 1] === FUNDO[1] && px[(y * w + x) * 4 + 2] === FUNDO[2] && px[(y * w + x) * 4 + 3] === 255;
  const empurra = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h && !visto[y * w + x]) { visto[y * w + x] = 1; if (eFundo(x, y)) pilha.push([x, y]); } };
  for (let x = 0; x < w; x++) { empurra(x, 0); empurra(x, h - 1); }
  for (let y = 0; y < h; y++) { empurra(0, y); empurra(w - 1, y); }
  let apagados = 0;
  while (pilha.length) {
    const [x, y] = pilha.pop();
    px.fill(0, (y * w + x) * 4, (y * w + x) * 4 + 4);
    apagados += 1;
    empurra(x + 1, y); empurra(x - 1, y); empurra(x, y + 1); empurra(x, y - 1);
  }
  return apagados;
}

// ---------- retratos ----------
const chaves = [...new Set(Object.values(RETRATOS))].sort();
const caminho = (k) => {
  const [c, nome] = [k[0], k.slice(2)];
  return resolve(raiz, 'Actor', CATEGORIAS[c] ?? '?', nome, 'Faceset.png');
};
const faltando = chaves.filter((k) => !/^[cmba]_/.test(k) || !existsSync(caminho(k)));
if (faltando.length) {
  console.error(`Não achei os retratos: ${faltando.join(', ')}.`);
  process.exit(1);
}
const linhas = Math.ceil(chaves.length / COLUNAS);
const w = COLUNAS * TAM;
const h = linhas * TAM;
const atlas = Buffer.alloc(w * h * 4);
const quadros = {};
let semFundoTotal = 0;
chaves.forEach((k, i) => {
  const img = lerPng(readFileSync(caminho(k)));
  if (img.w > TAM || img.h > TAM) throw new Error(`${k}: ${img.w}x${img.h} é maior que ${TAM}x${TAM}.`);
  semFundoTotal += tirarFundo(img);
  const cx = i % COLUNAS;
  const cy = Math.floor(i / COLUNAS);
  quadros[k] = [cx, cy];
  // alinhado embaixo (os retratos são busto: o corte fica na borda de baixo) e centrado na largura
  const dx = Math.floor((TAM - img.w) / 2);
  const dy = TAM - img.h;
  for (let y = 0; y < img.h; y++) img.px.copy(atlas, (((cy * TAM + dy + y) * w) + cx * TAM + dx) * 4, y * img.w * 4, (y + 1) * img.w * 4);
});
mkdirSync(resolve('src/assets/retratos'), { recursive: true });
writeFileSync(resolve('src/assets/retratos/retratos.png'), gravarPng({ w, h, px: atlas }));
writeFileSync(resolve('src/assets/retratos/retratos.json'), `${JSON.stringify({ tamanho: TAM, colunas: COLUNAS, linhas, quadros })}\n`);
console.log(`Atlas de retratos: ${chaves.length} retratos, ${w}x${h}, ${Math.round(semFundoTotal / chaves.length)} px de fundo apagados em média por retrato.`);

// ---------- emotes (balões de emoção 14x13, emote1.png ... emote30.png) ----------
const EW = 14;
const EH = 13;
const ECOLUNAS = 10;
const emotes = Array.from({ length: 30 }, (_, i) => i + 1);
const ew = ECOLUNAS * EW;
const eh = Math.ceil(emotes.length / ECOLUNAS) * EH;
const eAtlas = Buffer.alloc(ew * eh * 4);
const equadros = {};
for (const n of emotes) {
  const arq = resolve(raiz, 'Ui', 'Emote', `emote${n}.png`);
  if (!existsSync(arq)) { console.error(`Falta o emote ${n}.`); process.exit(1); }
  const img = lerPng(readFileSync(arq));
  if (img.w !== EW || img.h !== EH) throw new Error(`emote${n}.png tem ${img.w}x${img.h}, esperava ${EW}x${EH}.`);
  const cx = (n - 1) % ECOLUNAS;
  const cy = Math.floor((n - 1) / ECOLUNAS);
  equadros[n] = [cx, cy];
  for (let y = 0; y < EH; y++) img.px.copy(eAtlas, ((cy * EH + y) * ew + cx * EW) * 4, y * EW * 4, (y + 1) * EW * 4);
}
mkdirSync(resolve('src/assets/emotes'), { recursive: true });
writeFileSync(resolve('src/assets/emotes/emotes.png'), gravarPng({ w: ew, h: eh, px: eAtlas }));
writeFileSync(resolve('src/assets/emotes/emotes.json'), `${JSON.stringify({ largura: EW, altura: EH, colunas: ECOLUNAS, quadros: equadros })}\n`);
console.log(`Atlas de emotes: ${emotes.length} emotes, ${ew}x${eh}.`);
