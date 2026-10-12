// Um item "obtível" pode ser feito numa oficina ou comprado de um fornecedor. Os que só aparecem como achado raro de
// expedição não são: nenhum cliente os pede pelo nome (o jogador não teria como atender), mas podem ser vendidos à vontade.
export function obtivel(game, id) {
  return game.data.listas.receitas.some((r) => r.item === id) || game.data.listas.fornecedores.some((f) => f.vende.some((v) => v.material === id));
}
