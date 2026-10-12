// Empacota os ícones USADOS pelo jogo (os de src/data/icones.js) num atlas pequeno, a partir do pack original.
// O pack original fica fora do git (licença); só o atlas gerado entra no repositório.
// Uso:  npm run pack:icons                       (usa assets-src/raven)
//       npm run pack:icons -- <pasta-do-pack>    ("Free - Raven Fantasy Icons", com "Full Spritesheet/")
// Gera src/assets/atlas/icones-32.png, icones-64.png (mesma disposição, arte em 32 e 64 px) e icones.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPng, gravarPng } from './lib/png.mjs';
import { ICONES } from '../src/data/icones.js';

const pasta = resolve(process.argv[2] ?? 'assets-src/raven');
const folha = (tam) => resolve(pasta, 'Full Spritesheet', `${tam}x${tam}.png`);
if (!existsSync(folha(32)) || !existsSync(folha(64))) {
  console.error(`Não achei "Full Spritesheet/32x32.png" e "64x64.png" em ${pasta}.\nColoque o pack em assets-src/raven ou passe a pasta como argumento.`);
  process.exit(1);
}

const COLUNAS_PACK = 16;
const usados = [...new Set(Object.values(ICONES))].filter((q) => /^fb\d+$/.test(q)).sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
const COLUNAS = 16;
const linhas = Math.ceil(usados.length / COLUNAS);
const quadros = {};
usados.forEach((nome, i) => { quadros[nome] = [i % COLUNAS, Math.floor(i / COLUNAS)]; });

mkdirSync(resolve('src/assets/atlas'), { recursive: true });
for (const tam of [32, 64]) {
  const origem = lerPng(readFileSync(folha(tam)));
  const w = COLUNAS * tam;
  const h = linhas * tam;
  const px = Buffer.alloc(w * h * 4);
  for (const nome of usados) {
    const n = Number(nome.slice(2)) - 1;                       // fbN = célula N-1 da folha, da esquerda para a direita
    const ox = (n % COLUNAS_PACK) * tam;
    const oy = Math.floor(n / COLUNAS_PACK) * tam;
    if (oy + tam > origem.h) throw new Error(`${nome} fora da folha de ${tam}px`);
    const [cx, cy] = quadros[nome];
    for (let y = 0; y < tam; y++) {
      origem.px.copy(px, ((cy * tam + y) * w + cx * tam) * 4, ((oy + y) * origem.w + ox) * 4, ((oy + y) * origem.w + ox + tam) * 4);
    }
  }
  writeFileSync(resolve(`src/assets/atlas/icones-${tam}.png`), gravarPng({ w, h, px }));
}
writeFileSync(resolve('src/assets/atlas/icones.json'), `${JSON.stringify({ colunas: COLUNAS, linhas, tamanhos: [32, 64], quadros }, null, 1)}\n`);
console.log(`Atlas: ${usados.length} ícones, ${COLUNAS * 32}x${linhas * 32} (32 px) e ${COLUNAS * 64}x${linhas * 64} (64 px).`);
