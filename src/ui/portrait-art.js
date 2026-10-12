// Retratos de aventureiros desenhados por código, em pixel-art 16x16 (mais um contorno).
// Função pura: devolve a lista de pixels; quem desenha em Pixi é o assets.js. Cada aventureiro tem sempre
// o mesmo rosto (pele, cabelo e estilo vêm de um hash do id) e a classe define o acessório.
// Trocar por arte de pacote depois: basta preencher data/icones.js, nenhuma tela muda.
import { hashString } from '../core/rng.js';

export const GRADE = 18;            // 16 + 1 de contorno em cada lado
const OFF = 1;

const PELES = [0xf1c6a0, 0xe0a97e, 0xc68a5b, 0x9a6540, 0x6e4529, 0xf6d9bf];
const CABELOS = [0x2b1d14, 0x5a3a22, 0x9a6a2e, 0xd9b45a, 0xb5442f, 0x8f8f9a, 0x3a3a55, 0xe8e0d0];
const CONTORNO = 0x1a1410;
const OLHOS = [0x1a1410, 0x2a4f8a, 0x2f6b3a, 0x6b3a2a];
const BOCA = 0x7a3b2e;

const mix = (a, b, f) => {
  const ch = (c, s) => (c >> s) & 0xff;
  const m = (s) => Math.round(ch(a, s) * (1 - f) + ch(b, s) * f);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

// Acessórios por classe: cada um recebe `rect(x, y, w, h, cor)` e a cor da classe.
const ACESSORIOS = {
  guerreiro(r) {
    r(4, 3, 8, 3, 0xb8c0cc); r(4, 6, 1, 2, 0x8e97a5); r(11, 6, 1, 2, 0x8e97a5); r(7, 1, 2, 2, 0xc8553d);
  },
  arqueiro(r) {
    r(4, 3, 8, 2, 0x4f8a4a); r(4, 5, 1, 4, 0x3f7040); r(11, 5, 1, 4, 0x3f7040); r(11, 1, 1, 3, 0xf2e6c8);
  },
  mago(r) {
    r(3, 4, 10, 1, 0x4a5fd0); r(5, 3, 6, 1, 0x4a5fd0); r(6, 2, 4, 1, 0x4a5fd0); r(7, 0, 2, 2, 0x4a5fd0); r(8, 3, 1, 1, 0xffd166);
  },
  ladino(r) {
    r(4, 3, 8, 2, 0x3b3347); r(4, 5, 1, 4, 0x3b3347); r(11, 5, 1, 4, 0x3b3347); r(5, 8, 6, 2, 0x2a2433);
  },
  clerigo(r) {
    r(5, 0, 6, 1, 0xffe58a); r(4, 1, 1, 1, 0xffe58a); r(11, 1, 1, 1, 0xffe58a); r(6, 11, 4, 1, 0xffffff);
  },
  bardo(r) {
    r(3, 3, 10, 1, 0xb23a6b); r(5, 1, 6, 2, 0xb23a6b); r(11, 0, 1, 3, 0x6fd0c0);
  },
  cacador(r) {
    r(4, 2, 8, 3, 0x7a5a36); r(4, 4, 8, 1, 0xd8c8a8);
  },
  alquimista(r) {
    r(4, 5, 8, 1, 0x6b4a2b); r(5, 5, 2, 2, 0x8de6d8); r(9, 5, 2, 2, 0x8de6d8);
  },
};

// Devolve { grade, pixels: [[x, y, cor], ...] } (coordenadas já com o deslocamento do contorno).
export function portraitPixels(advId, classe, corClasse = 0x8a7660) {
  const h = hashString(advId);
  const pele = PELES[h % PELES.length];
  const cabelo = CABELOS[(h >>> 3) % CABELOS.length];
  const estilo = (h >>> 6) % 4;
  const olho = OLHOS[(h >>> 9) % OLHOS.length];
  const boca = (h >>> 12) % 3;           // 0 sorriso, 1 reta, 2 aberta
  const sardas = (h >>> 14) % 4 === 0;

  const mapa = new Map();
  const put = (x, y, cor) => { if (x >= 0 && y >= 0 && x < 16 && y < 16) mapa.set(`${x},${y}`, cor); };
  const rect = (x, y, w, hh, cor) => { for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) put(x + i, y + j, cor); };

  // cabelo comprido cai atrás do corpo
  if (estilo === 1) { rect(4, 7, 1, 5, cabelo); rect(11, 7, 1, 5, cabelo); }
  // corpo
  rect(3, 12, 10, 4, corClasse);
  rect(5, 11, 6, 1, corClasse);
  rect(3, 12, 10, 1, mix(corClasse, 0xffffff, 0.25));
  rect(7, 10, 2, 1, mix(pele, 0x000000, 0.2));
  // cabeça e orelhas
  rect(5, 5, 6, 4, pele); rect(6, 4, 4, 6, pele);
  rect(4, 6, 1, 2, pele); rect(11, 6, 1, 2, pele);
  // cabelo
  rect(5, 3, 6, 1, cabelo); rect(4, 4, 8, 1, cabelo); rect(4, 5, 1, 2, cabelo); rect(11, 5, 1, 2, cabelo);
  if (estilo === 2) { rect(5, 2, 1, 1, cabelo); rect(7, 1, 1, 2, cabelo); rect(9, 2, 1, 1, cabelo); rect(10, 2, 1, 1, cabelo); }
  if (estilo === 3) rect(7, 1, 2, 2, cabelo);
  // rosto
  put(6, 7, olho); put(9, 7, olho);
  if (boca === 0) { rect(7, 9, 2, 1, BOCA); put(6, 8, BOCA); put(9, 8, BOCA); }
  else if (boca === 1) rect(7, 9, 2, 1, BOCA);
  else rect(7, 9, 2, 2, BOCA);
  if (sardas) { put(5, 8, mix(pele, 0x8a4a2a, 0.45)); put(10, 8, mix(pele, 0x8a4a2a, 0.45)); put(6, 9, mix(pele, 0x8a4a2a, 0.45)); }
  // acessório da classe
  (ACESSORIOS[classe] ?? (() => {}))(rect);

  // contorno: todo pixel vazio encostado (4 vizinhos) em um pixel pintado
  const pixels = [];
  const vazio = (x, y) => !mapa.has(`${x},${y}`);
  for (let y = -1; y <= 16; y++) {
    for (let x = -1; x <= 16; x++) {
      if (!vazio(x, y)) continue;
      if (!vazio(x - 1, y) || !vazio(x + 1, y) || !vazio(x, y - 1) || !vazio(x, y + 1)) pixels.push([x + OFF, y + OFF, CONTORNO]);
    }
  }
  for (const [k, cor] of mapa) {
    const [x, y] = k.split(',').map(Number);
    pixels.push([x + OFF, y + OFF, cor]);
  }
  return { grade: GRADE, pixels };
}
