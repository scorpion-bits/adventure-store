// Eventos sazonais: ligam e desligam sozinhos pela data (data/sazonais.js). Funções puras sobre o relógio do jogo.
const pad = (n) => String(n).padStart(2, '0');
export const mesDia = (ms) => { const d = new Date(ms); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// `hoje`, `de` e `ate` são "MM-DD"; o período pode virar o ano (ex.: 12-18 até 01-03)
export const dentroDoPeriodo = (hoje, de, ate) => (de <= ate ? hoje >= de && hoje <= ate : hoje >= de || hoje <= ate);

export const sazonaisAtivos = (game) => {
  const hoje = mesDia(game.clock.now());
  return game.data.listas.sazonais.filter((s) => dentroDoPeriodo(hoje, s.de, s.ate));
};
