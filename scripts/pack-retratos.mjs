// Monta o atlas de retratos dos aventureiros a partir do pack "Free 39 Portraits Pixel Art" (CraftPix, 32x32 por retrato).
// O pack original fica fora do git (licença: não redistribuir os arquivos); só o atlas com os retratos usados é publicado.
// Uso:  npm run pack:retratos                       (usa assets-src/retratos)
//       npm run pack:retratos -- <pasta-do-pack>    (com a pasta "1 Portraits/")
// Gera src/assets/retratos/retratos.png (grade de 8 colunas) e retratos.json (id do aventureiro -> [coluna, linha]).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPng, gravarPng } from './lib/png.mjs';
import { RETRATOS } from '../src/data/retratos.js';

const pasta = resolve(process.argv[2] ?? 'assets-src/retratos', '1 Portraits');
const TAM = 32;
const COLUNAS = 8;
const ids = Object.keys(RETRATOS);
const faltando = ids.filter((id) => !existsSync(resolve(pasta, `Icons_${RETRATOS[id]}.png`)));
if (faltando.length) {
  console.error(`Não achei os retratos de: ${faltando.join(', ')}.\nColoque o pack em assets-src/retratos (pasta "1 Portraits") ou passe a pasta como argumento.`);
  process.exit(1);
}
const usados = new Set();
for (const id of ids) {
  if (usados.has(RETRATOS[id])) { console.error(`O retrato ${RETRATOS[id]} está em uso por mais de um aventureiro (${id}).`); process.exit(1); }
  usados.add(RETRATOS[id]);
}

const linhas = Math.ceil(ids.length / COLUNAS);
const w = COLUNAS * TAM;
const h = linhas * TAM;
const px = Buffer.alloc(w * h * 4);
const quadros = {};
ids.forEach((id, i) => {
  const img = lerPng(readFileSync(resolve(pasta, `Icons_${RETRATOS[id]}.png`)));
  if (img.w !== TAM || img.h !== TAM) throw new Error(`Icons_${RETRATOS[id]}.png tem ${img.w}x${img.h}, esperava ${TAM}x${TAM}.`);
  const cx = i % COLUNAS;
  const cy = Math.floor(i / COLUNAS);
  quadros[id] = [cx, cy];
  for (let y = 0; y < TAM; y++) img.px.copy(px, ((cy * TAM + y) * w + cx * TAM) * 4, y * TAM * 4, (y + 1) * TAM * 4);
});
mkdirSync(resolve('src/assets/retratos'), { recursive: true });
writeFileSync(resolve('src/assets/retratos/retratos.png'), gravarPng({ w, h, px }));
writeFileSync(resolve('src/assets/retratos/retratos.json'), `${JSON.stringify({ tamanho: TAM, colunas: COLUNAS, linhas, quadros }, null, 1)}\n`);
console.log(`Atlas de retratos: ${ids.length} retratos, ${w}x${h}.`);
