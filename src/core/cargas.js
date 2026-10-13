// Partidas guardadas dos mini-jogos: cada jogo tem um número máximo de partidas que voltam com o tempo (também com o jogo fechado).
// `chave` é o nome do jogo em `game.data.meta` (a configuração: max, recargaMin) e em `game.state` (cargas, desde).
export function atualizarCargas(game, chave) {
  const s = game.state[chave];
  const { max, recargaMin } = game.data.meta[chave];
  const passo = recargaMin * 60_000;
  const agora = game.clock.now();
  if (s.cargas >= max) { s.cargas = max; s.desde = agora; return s; }
  const ganhos = Math.floor(Math.max(0, agora - s.desde) / passo);
  if (ganhos > 0) {
    s.cargas = Math.min(max, s.cargas + ganhos);
    s.desde = s.cargas >= max ? agora : s.desde + ganhos * passo;
  }
  return s;
}

export const cargasAgora = (game, chave) => atualizarCargas(game, chave).cargas;

// ms até voltar a próxima partida (0 se está cheio)
export function msParaProxima(game, chave) {
  const s = atualizarCargas(game, chave);
  const { max, recargaMin } = game.data.meta[chave];
  if (s.cargas >= max) return 0;
  return Math.max(0, s.desde + recargaMin * 60_000 - game.clock.now());
}

// gasta uma partida; devolve false se não há nenhuma
export function gastarCarga(game, chave) {
  const s = atualizarCargas(game, chave);
  if (s.cargas < 1) return false;
  const { max } = game.data.meta[chave];
  s.cargas -= 1;
  s.desde = s.cargas + 1 >= max ? game.clock.now() : s.desde;       // saiu do cheio: a recarga começa agora
  return true;
}
