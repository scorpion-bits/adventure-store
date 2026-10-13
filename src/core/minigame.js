// Mini-jogo de memória: um jogo livre e calmo para ganhar um pouco de material. As cartas são materiais; cada par acertado rende
// aquele material (pouco, e só de regiões que a reputação já abriu). As partidas são limitadas e voltam com o tempo.
// Lógica pura (recebe `game`): o tabuleiro e o prêmio saem daqui; a interface cuida das cartas e do tempo.
import { regiaoAberta } from './expeditions.js';

const M = (game) => game.data.meta.minijogo;

// ---------- partidas guardadas (recarregam sozinhas, também com o jogo fechado) ----------
export function atualizarCargas(game) {
  const s = game.state.minijogo;
  const max = M(game).max;
  const passo = M(game).recargaMin * 60_000;
  const agora = game.clock.now();
  if (s.cargas >= max) { s.cargas = max; s.desde = agora; return s; }
  const ganhos = Math.floor(Math.max(0, agora - s.desde) / passo);
  if (ganhos > 0) {
    s.cargas = Math.min(max, s.cargas + ganhos);
    s.desde = s.cargas >= max ? agora : s.desde + ganhos * passo;
  }
  return s;
}

export const cargasAgora = (game) => atualizarCargas(game).cargas;
// ms até voltar a próxima partida (0 se está cheio)
export function msParaProxima(game) {
  const s = atualizarCargas(game);
  if (s.cargas >= M(game).max) return 0;
  return Math.max(0, s.desde + M(game).recargaMin * 60_000 - game.clock.now());
}

// ---------- tabuleiro e prêmio ----------
export const tabuleiroDe = (game) => M(game).tabuleiros.find((t) => game.nivel() <= t.ate) ?? M(game).tabuleiros.at(-1);
export const unidadesPorPar = (game) => 1 + Math.floor(game.nivel() / M(game).nivelPorUnidade);

// materiais que podem aparecer: os das regiões já abertas pela reputação
export const materiaisPossiveis = (game) => game.data.listas.materiais.filter((m) => regiaoAberta(game, m.regiao));

// Começa uma partida (gasta uma). Devolve { ok, cartas: [{ material }], pares, segundos, unidades } ou { ok: false, motivo }.
export function iniciarPartida(game) {
  if (cargasAgora(game) < 1) return { ok: false, motivo: 'sem-partidas' };
  const t = tabuleiroDe(game);
  const pool = materiaisPossiveis(game);
  const n = Math.min(t.n, pool.length);
  const escolhidos = game.rng.shuffle(pool).slice(0, n).map((m) => m.id);
  const cartas = game.rng.shuffle(escolhidos.flatMap((id) => [{ material: id }, { material: id }]));
  const s = game.state.minijogo;
  s.cargas -= 1;
  s.desde = s.cargas + 1 >= M(game).max ? game.clock.now() : s.desde;       // saiu do cheio: a recarga começa agora
  game.emit('minijogo');
  return { ok: true, cartas, pares: n, segundos: t.seg, unidades: unidadesPorPar(game) };
}

// Confere o resultado e entrega o prêmio. `resultado` = { acertos: [materiais dos pares encontrados], erros }.
// Devolve { ok, ganhou: { material: qtd }, perfeito, total }.
export function finalizarPartida(game, partida, resultado) {
  const validos = new Set(partida.cartas.map((c) => c.material));
  const acertos = [...new Set(resultado.acertos ?? [])].filter((m) => validos.has(m));     // cada par vale uma vez
  const perfeito = acertos.length === partida.pares && (resultado.erros ?? 0) <= M(game).perfeitoErros;
  const por = partida.unidades * (perfeito ? 2 : 1);
  const ganhou = {};
  for (const m of acertos) ganhou[m] = por;
  const total = acertos.length * por;
  for (const [m, q] of Object.entries(ganhou)) game.state.materiais[m] = (game.state.materiais[m] ?? 0) + q;
  const s = game.state.minijogo;
  s.partidas += 1;
  s.pares += acertos.length;
  if (perfeito) s.perfeitas += 1;
  if (total > 0) game.emit('materiais', game.state.materiais);
  game.emit('minijogo', { ganhou, perfeito, total });
  return { ok: true, ganhou, perfeito, total };
}
