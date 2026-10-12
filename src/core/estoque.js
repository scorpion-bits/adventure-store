// Capacidade das prateleiras: o estoque é limitado (e as melhorias aumentam o limite).

export const capacidadeEstoque = (game) => game.data.meta.loja.capacidadeBase + (game.mods.capacidade ?? 0);

export const totalEstoque = (game) => Object.values(game.state.estoque).reduce((n, q) => n + (q > 0 ? q : 0), 0);

export const espacoLivre = (game) => Math.max(0, capacidadeEstoque(game) - totalEstoque(game));
