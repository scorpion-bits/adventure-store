// Gera os ícones do app (PWA/atlas de instalação) a partir do ícone da espada do pack de ícones já empacotado em src/assets/atlas.
// Uso:  npm run icons:app
// Saída: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png (arte dentro dos 80% centrais) e apple-touch-icon.png (180).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPng, gravarPng } from './lib/png.mjs';
import { ICONES } from '../src/data/icones.js';

const atlas = JSON.parse(readFileSync(resolve('src/assets/atlas/icones.json'), 'utf8'));
const folha = lerPng(readFileSync(resolve('src/assets/atlas/icones-64.png')));
const quadro = atlas.quadros[ICONES.espada_ferro];
if (!quadro) throw new Error('Ícone da espada não está no atlas (rode npm run pack:icons).');

// recorta a arte de 64 px (RGBA)
const ART = 64;
const arte = Buffer.alloc(ART * ART * 4);
for (let y = 0; y < ART; y++) {
  folha.px.copy(arte, y * ART * 4, ((quadro[1] * ART + y) * folha.w + quadro[0] * ART) * 4, ((quadro[1] * ART + y) * folha.w + quadro[0] * ART + ART) * 4);
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);
// fundo: madeira escura com um brilho quente no centro (mesma paleta do jogo)
function fundo(tam) {
  const px = Buffer.alloc(tam * tam * 4);
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const d = Math.hypot(x - tam / 2, y - tam / 2) / (tam * 0.72);
      const t = Math.min(1, d);
      const o = (y * tam + x) * 4;
      px[o] = mix(0x4a, 0x1b, t); px[o + 1] = mix(0x36, 0x13, t); px[o + 2] = mix(0x2a, 0x0f, t); px[o + 3] = 255;
    }
  }
  return px;
}

// compõe a arte (ampliada sem suavizar) no centro; `fracao` = quanto do lado o ícone ocupa
function icone(tam, fracao) {
  const px = fundo(tam);
  const escala = Math.max(1, Math.floor((tam * fracao) / ART));
  const lado = ART * escala;
  const ox = Math.floor((tam - lado) / 2);
  const oy = Math.floor((tam - lado) / 2);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const s = (Math.floor(y / escala) * ART + Math.floor(x / escala)) * 4;
      const a = arte[s + 3] / 255;
      if (!a) continue;
      const d = ((oy + y) * tam + ox + x) * 4;
      for (let c = 0; c < 3; c++) px[d + c] = Math.round(arte[s + c] * a + px[d + c] * (1 - a));
    }
  }
  return { w: tam, h: tam, px };
}

mkdirSync(resolve('public/icons'), { recursive: true });
const saidas = {
  'icon-192.png': icone(192, 0.7),
  'icon-512.png': icone(512, 0.7),
  'icon-maskable-512.png': icone(512, 0.56),      // o sistema corta até 20% das bordas: a arte fica na zona segura
  'apple-touch-icon.png': icone(180, 0.7),
};
for (const [nome, img] of Object.entries(saidas)) writeFileSync(resolve('public/icons', nome), gravarPng(img));
console.log(`Ícones do app gerados em public/icons (${Object.keys(saidas).join(', ')}).`);
