// Mini-jogo de memória: um jogo livre e calmo para ganhar um pouco de material. As cartas são materiais; cada par acertado rende
// aquele material (pouco, e só de regiões que a reputação já abriu). As partidas são limitadas e voltam com o tempo.
// Lógica pura (recebe `game`): o tabuleiro e o prêmio saem daqui; a interface cuida das cartas e do tempo.
import { regiaoAberta } from './expeditions.js';
import * as cargas from './cargas.js';

const M = (game) => game.data.meta.minijogo;

// ---------- partidas guardadas (veja cargas.js) ----------
export const atualizarCargas = (game) => cargas.atualizarCargas(game, 'minijogo');
export const cargasAgora = (game) => cargas.cargasAgora(game, 'minijogo');
export const msParaProxima = (game) => cargas.msParaProxima(game, 'minijogo');

// ---------- tabuleiro e prêmio ----------
export const tabuleiroDe = (game) => M(game).tabuleiros.find((t) => game.nivel() <= t.ate) ?? M(game).tabuleiros.at(-1);
export const unidadesPorPar = (game) => 1 + Math.floor(game.nivel() / M(game).nivelPorUnidade);

// materiais que podem aparecer: os das regiões já abertas pela reputação
export const materiaisPossiveis = (game) => game.data.listas.materiais.filter((m) => regiaoAberta(game, m.regiao));

// Começa uma partida (gasta uma). Devolve { ok, cartas: [{ material }], pares, segundos, unidades } ou { ok: false, motivo }.
export function iniciarPartida(game) {
  if (!cargas.gastarCarga(game, 'minijogo')) return { ok: false, motivo: 'sem-partidas' };
  const t = tabuleiroDe(game);
  const pool = materiaisPossiveis(game);
  const n = Math.min(t.n, pool.length);
  const escolhidos = game.rng.shuffle(pool).slice(0, n).map((m) => m.id);
  const cartas = game.rng.shuffle(escolhidos.flatMap((id) => [{ material: id }, { material: id }]));
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
