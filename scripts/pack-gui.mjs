// Recorta do Cryo's Mini GUI só as peças USADAS pelo jogo e monta um atlas pequeno (1x; o jogo amplia sem suavizar).
// O pack original fica fora do git (assets-src/); só o atlas gerado entra no repositório.
// Uso:  npm run pack:gui                       (usa assets-src/cryo)
//       npm run pack:gui -- <pasta-do-pack>    (com "GUI/GUI_1x.png" e "Buttons/buttons_1x.png")
// Gera src/assets/gui/gui.png e gui.json (quadros e margens do 9-slice).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPng, gravarPng } from './lib/png.mjs';

const pasta = resolve(process.argv[2] ?? 'assets-src/cryo');
const arquivos = { gui: resolve(pasta, 'GUI', 'GUI_1x.png'), botoes: resolve(pasta, 'Buttons', 'buttons_1x.png') };
for (const f of Object.values(arquivos)) {
  if (!existsSync(f)) { console.error(`Não achei ${f}.\nColoque o pack em assets-src/cryo ou passe a pasta como argumento.`); process.exit(1); }
}

// nome: [folha, x, y, w, h, margens do 9-slice [esq, cima, dir, baixo] (só para peças esticáveis)]
const PECAS = {
  botao: ['botoes', 56, 0, 24, 16, [3, 3, 3, 4]],
  moldura: ['gui', 0, 56, 32, 32, [8, 8, 8, 8]],
  pergaminho: ['gui', 96, 0, 24, 24, [5, 5, 5, 5]],
  moeda: ['gui', 72, 72, 8, 8],
  trofeu: ['gui', 112, 64, 8, 8],
  coracao: ['gui', 64, 64, 8, 8],
  relampago: ['gui', 88, 64, 8, 8],
  bau: ['gui', 120, 72, 8, 8],
  chave: ['gui', 88, 72, 8, 8],
};

const folhas = Object.fromEntries(Object.entries(arquivos).map(([k, f]) => [k, lerPng(readFileSync(f))]));
const W = 48;
let y = 0;
const quadros = {};
for (const [nome, [folha, x, py, w, h, margens]] of Object.entries(PECAS)) {
  quadros[nome] = { x: 0, y, w, h, ...(margens ? { margens } : {}) };
  y += h + 1;
}
const H = y;
const px = Buffer.alloc(W * H * 4);
for (const [nome, [folha, sx, sy, w, h]] of Object.entries(PECAS)) {
  const o = folhas[folha];
  const q = quadros[nome];
  for (let j = 0; j < h; j++) o.px.copy(px, ((q.y + j) * W + q.x) * 4, ((sy + j) * o.w + sx) * 4, ((sy + j) * o.w + sx + w) * 4);
}
mkdirSync(resolve('src/assets/gui'), { recursive: true });
writeFileSync(resolve('src/assets/gui/gui.png'), gravarPng({ w: W, h: H, px }));
writeFileSync(resolve('src/assets/gui/gui.json'), `${JSON.stringify({ largura: W, altura: H, quadros }, null, 2)}\n`);
console.log(`gui.png ${W}x${H} com ${Object.keys(quadros).length} peças.`);
