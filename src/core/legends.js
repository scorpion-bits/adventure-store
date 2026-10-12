// Lendários: escolher quem aparece e qual capítulo vem a seguir (funções puras sobre o estado; sem depender da loja).
// A conclusão de capítulos fica em legend-story.js.

export const progressoLenda = (game, id) => game.state.lendarios[id] ?? { cap: 0, visita: 0 };
export const defLenda = (game, id) => game.data.lendarios[id] ?? null;

// O capítulo que o lendário pede agora (ou null se a lenda já terminou ou não existe)
export function capituloAtual(game, id) {
  const def = defLenda(game, id);
  return def?.capitulos[progressoLenda(game, id).cap] ?? null;
}

export const lendaConcluida = (game, id) => {
  const def = defLenda(game, id);
  return !!def && progressoLenda(game, id).cap >= def.capitulos.length;
};

// Nível de reputação necessário para o capítulo atual (o maior entre o do aventureiro, o da região e o do capítulo)
export function nivelNecessario(game, id) {
  const adv = game.data.aventureiros[id];
  const cap = capituloAtual(game, id);
  if (!adv || !cap) return Infinity;
  return Math.max(adv.nivelRep ?? 1, game.data.regioes[adv.regiao]?.nivelRep ?? 1, cap.nivelRep ?? 1);
}

// Lendários que podem aparecer agora: nível suficiente, lenda não terminada, fora do intervalo entre visitas e fora da fila
export function candidatos(game) {
  const agora = game.clock.now();
  const cool = game.data.meta.lendarios.cooldownMin * 60000;
  const naFila = new Set(game.state.fila.filter((c) => c.lenda).map((c) => c.lenda.id));
  return game.data.listas.lendarios.filter((l) => (
    game.data.aventureiros[l.id]
    && !lendaConcluida(game, l.id)
    && game.nivel() >= nivelNecessario(game, l.id)
    && agora - progressoLenda(game, l.id).visita >= cool
    && !naFila.has(l.id)
  ));
}

// Sorteia se um lendário aparece nesta chegada (ou null)
export function proximaLenda(game) {
  const lista = candidatos(game);
  if (!lista.length || !game.rng.chance(game.data.meta.lendarios.chance)) return null;
  return game.rng.pick(lista).id;
}

export const qualidadeMinima = (cap) => cap?.pedido?.qualidadeMin ?? 0;
