// Tema visual: madeira escura, creme e âmbar. Combina com os painéis de madeira e pergaminho
// do Cryo's Mini GUI (usados na etapa de arte) e com os cartões desenhados por código.

// "Grotesk" (títulos) e "Body" (texto) são as fontes do site da Scorpion Bits; fora dele
// o jogo carrega as mesmas de public/fonts e, em último caso, cai para as do sistema.
export const FONT_DISPLAY = '"Grotesk", "Segoe UI", system-ui, sans-serif';
export const FONT_BODY = '"Body", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';

const channel = (c, shift) => (c >> shift) & 0xff;
const pack = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

export function darken(color, f) {
  return pack(channel(color, 16) * (1 - f), channel(color, 8) * (1 - f), channel(color, 0) * (1 - f));
}

export function lighten(color, f) {
  const up = (v) => v + (255 - v) * f;
  return pack(up(channel(color, 16)), up(channel(color, 8)), up(channel(color, 0)));
}

export const hex = (color) => `#${color.toString(16).padStart(6, '0')}`;

export const C = {
  bg: 0x1b130f,
  panel: 0x2a1e17,       // janelas e barras
  card: 0x3a2a20,        // cartões
  cardHi: 0x4a362a,      // cartões em destaque
  deep: 0x120c09,        // áreas mais fundas
  wood: 0x7a4e2d,
  parchment: 0xe8d5a8,
  text: 0xf6ead6,
  dim: 0xc9b79c,
  faint: 0x8a7660,

  accent: 0xf0b35a,      // âmbar da loja
  gold: 0xffd166,
  good: 0x8fd18a,
  warn: 0xf0b35a,
  bad: 0xe27d6a,
  info: 0x7fb8d8,
  rep: 0xc79cf0,
};

export const T = {
  text: hex(C.text),
  dim: hex(C.dim),
  faint: hex(C.faint),
  accent: hex(C.accent),
  gold: hex(C.gold),
  good: hex(C.good),
  warn: hex(C.warn),
  bad: hex(C.bad),
};
