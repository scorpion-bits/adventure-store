// Um item "obtível" pode ser feito numa oficina ou comprado de um fornecedor. Os que só aparecem como achado raro de
// expedição não são: nenhum cliente os pede pelo nome (o jogador não teria como atender), mas podem ser vendidos à vontade.
// O conjunto é montado uma vez por conjunto de dados (a conferência roda para cada item de cada aventureiro a cada chegada).
const cache = new WeakMap();
const conjunto = (listas) => {
  let s = cache.get(listas);
  if (!s) {
    s = new Set([...listas.receitas.map((r) => r.item), ...listas.fornecedores.flatMap((f) => f.vende.map((v) => v.material))]);
    cache.set(listas, s);
  }
  return s;
};

export const obtivel = (game, id) => conjunto(game.data.listas).has(id);
