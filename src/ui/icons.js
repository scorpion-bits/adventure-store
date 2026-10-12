// Ícones simples desenhados por código (provisórios): a arte do pack entra pelo assets.js.
// Cada função desenha dentro de um quadrado de lado `s`, com o centro em (0,0).

const draw = {
  loja(g, s, col) {            // fachada: toldo, parede e porta
    const w = s * 0.9;
    g.roundRect(-w / 2, -s * 0.12, w, s * 0.62, 3).fill({ color: col, alpha: 0.35 }).stroke({ width: 2, color: col });
    g.moveTo(-w / 2 - 2, -s * 0.12).lineTo(-w / 2 + 3, -s * 0.46).lineTo(w / 2 - 3, -s * 0.46).lineTo(w / 2 + 2, -s * 0.12).closePath().fill(col);
    g.roundRect(-s * 0.12, s * 0.12, s * 0.24, s * 0.38, 2).fill(col);
  },
  oficina(g, s, col) {         // bigorna
    g.moveTo(-s * 0.46, -s * 0.18).lineTo(s * 0.4, -s * 0.18).lineTo(s * 0.5, -s * 0.34).lineTo(-s * 0.1, -s * 0.34)
      .lineTo(-s * 0.46, -s * 0.18).closePath().fill(col);
    g.rect(-s * 0.2, -s * 0.18, s * 0.4, s * 0.26).fill(col);
    g.roundRect(-s * 0.38, s * 0.08, s * 0.76, s * 0.22, 2).fill(col);
  },
  mercado(g, s, col) {         // saco de moedas
    g.moveTo(-s * 0.18, -s * 0.34).lineTo(s * 0.18, -s * 0.34).lineTo(s * 0.1, -s * 0.18).lineTo(-s * 0.1, -s * 0.18).closePath().fill(col);
    g.ellipse(0, s * 0.14, s * 0.4, s * 0.36).fill({ color: col, alpha: 0.35 }).stroke({ width: 2, color: col });
    g.circle(0, s * 0.14, s * 0.12).stroke({ width: 2, color: col });
  },
  aventureiros(g, s, col) {    // pessoa
    g.circle(0, -s * 0.22, s * 0.18).fill(col);
    g.moveTo(-s * 0.34, s * 0.42).quadraticCurveTo(-s * 0.34, -s * 0.02, 0, -s * 0.02)
      .quadraticCurveTo(s * 0.34, -s * 0.02, s * 0.34, s * 0.42).closePath().fill(col);
  },
  melhorias(g, s, col) {       // seta para cima sobre uma base
    g.moveTo(0, -s * 0.44).lineTo(s * 0.36, -s * 0.02).lineTo(s * 0.14, -s * 0.02).lineTo(s * 0.14, s * 0.3)
      .lineTo(-s * 0.14, s * 0.3).lineTo(-s * 0.14, -s * 0.02).lineTo(-s * 0.36, -s * 0.02).closePath().fill(col);
    g.roundRect(-s * 0.36, s * 0.38, s * 0.72, s * 0.1, 2).fill(col);
  },
  engrenagem(g, s, col) {
    const r = s * 0.3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.circle(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25, s * 0.09).fill(col);
    }
    g.circle(0, 0, r).stroke({ width: s * 0.16, color: col });
  },
  moeda(g, s, col) {
    g.circle(0, 0, s * 0.42).fill(col);
    g.circle(0, 0, s * 0.26).stroke({ width: 2, color: 0x000000, alpha: 0.28 });
  },
  estrela(g, s, col) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? s * 0.2 : s * 0.46;
      pts.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.poly(pts).fill(col);
  },
  sol(g, s, col) {             // dia
    g.circle(0, 0, s * 0.22).fill(col);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.moveTo(Math.cos(a) * s * 0.32, Math.sin(a) * s * 0.32).lineTo(Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.46).stroke({ width: 2, color: col });
    }
  },
  fechar(g, s, col) {
    g.moveTo(-s * 0.3, -s * 0.3).lineTo(s * 0.3, s * 0.3).moveTo(s * 0.3, -s * 0.3).lineTo(-s * 0.3, s * 0.3).stroke({ width: 3, color: col, cap: 'round' });
  },
};

export const ICON_NAMES = Object.keys(draw);

export function drawIcon(g, name, size, color) {
  g.clear();
  (draw[name] ?? draw.estrela)(g, size, color);
  return g;
}
