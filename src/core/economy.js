// Fórmulas da economia (puras). Os números ficam em src/data/meta.js; aqui só a conta.
import { META } from '../data/meta.js';

// preço de referência de um item numa qualidade (índice 0..3)
export function precoBase(item, qualidade = 1) {
  const q = META.qualidades[qualidade] ?? META.qualidades[1];
  return Math.max(1, Math.round(item.valor * q.mult));
}

// preço pedido, dado o nível de preço ('barato' | 'justo' | 'caro') e um fator de mercado
export function precoPedido(item, qualidade, nivelPreco, mercado = 1) {
  const m = META.precos[nivelPreco] ?? 1;
  return Math.max(1, Math.round(precoBase(item, qualidade) * m * mercado));
}

// Reputação: pontos acumulados -> nível. O nível 1 começa em 0 pontos.
export function repParaNivel(n) {
  if (n <= 1) return 0;
  return Math.round(META.reputacao.base * (n - 1) ** META.reputacao.expoente);
}

export function repNivel(pontos) {
  let n = 1;
  while (n < META.reputacao.nivelMax && pontos >= repParaNivel(n + 1)) n++;
  return n;
}

// fração (0..1) do caminho até o próximo nível; 1 no nível máximo
export function repProgresso(pontos) {
  const n = repNivel(pontos);
  if (n >= META.reputacao.nivelMax) return 1;
  const a = repParaNivel(n);
  const b = repParaNivel(n + 1);
  return Math.min(1, Math.max(0, (pontos - a) / (b - a)));
}
