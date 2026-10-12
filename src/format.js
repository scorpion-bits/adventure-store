// Formatação de números e tempos em pt-BR (funções puras, também usadas pelo simulador).

const dec = (v, digits) => v.toFixed(digits).replace('.', ',').replace(/,0+$/, '').replace(/(,\d*?)0+$/, '$1');

// 950 -> "950"; 12 345 -> "12,3 mil"; 1 250 000 -> "1,25 mi"
export function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v < 10000) return sign + Math.floor(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const units = [[1e12, 'tri'], [1e9, 'bi'], [1e6, 'mi'], [1e3, 'mil']];
  for (const [size, name] of units) {
    if (v >= size) return `${sign}${dec(v / size, v / size >= 100 ? 0 : v / size >= 10 ? 1 : 2)} ${name}`;
  }
  return sign + Math.floor(v);
}

// segundos -> "45s", "3min 05s", "2h 10min", "1d 4h"
export function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min ${String(s % 60).padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, '0')}min`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
