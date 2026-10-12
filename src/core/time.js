// Relógio e calendário. O "dia" do jogo é o dia do calendário no fuso do jogador: encomendas,
// fornecedores e aventureiro especial mudam à meia-noite e são sorteados pela data.

// Relógio injetável: nos testes e no simulador dá para adiantar o tempo sem esperar.
export function createClock(start = null) {
  let offset = 0;
  const base = start;
  return {
    now: () => (base !== null ? base + offset : Date.now() + offset),
    advance(ms) { offset += ms; },
    set(ms) { offset = ms - (base !== null ? base : Date.now()); },
  };
}

const pad = (n) => String(n).padStart(2, '0');

// "2026-10-12" no fuso local
export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// número de dias de calendário entre duas datas "AAAA-MM-DD" (b - a); ignora horário de verão
export function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

// "AAAA-Wss": semana do jogo (segunda a domingo) para o baú semanal
export function weekKey(ms) {
  const d = new Date(ms);
  const day = (d.getDay() + 6) % 7;                       // segunda = 0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `sem-${dayKey(monday.getTime())}`;
}
