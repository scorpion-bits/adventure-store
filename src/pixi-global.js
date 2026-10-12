// Usado só no build do site (`npm run build:site`): em vez de empacotar o PixiJS de novo,
// o jogo reaproveita o `window.PIXI` carregado de `assets/vendor/pixi.min.js` do site
// (mesmo arquivo e mesma URL, logo o mesmo cache do navegador).
// Se o jogo passar a usar outra classe do Pixi, exporte-a aqui também.
const P = window.PIXI;
if (!P) throw new Error('PixiJS não carregou (assets/vendor/pixi.min.js).');

export const {
  Application, Assets, Sprite, Container, Graphics, Rectangle, Text, Texture,
  NineSliceSprite, TextureStyle, ColorMatrixFilter,
} = P;
export default P;
