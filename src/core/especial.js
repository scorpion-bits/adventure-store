// Aventureiro especial do dia: sorteado pela data (daily.js); aqui só a decisão de quando ele chega (usada pela loja).

// Devolve o especial se ele deve chegar agora (ainda não veio hoje, e a chance de uma chegada sorteou), e marca que veio.
export function proximoEspecial(game) {
  const e = game.state.diario.especial;
  if (!e || e.visitou || !game.data.aventureiros[e.adv] || !game.data.itens[e.item]) return null;
  if (!game.rng.chance(game.data.diario.especial.chance)) return null;
  e.visitou = true;
  return e;
}
