// Código do Ferreiro: um mini-jogo de lógica (estilo Mastermind) para ganhar um pouco de material, sem pressa e sem tempo.
// Um cofre guarda uma sequência secreta de materiais. O jogador monta palpites e cada um recebe duas dicas: quantos materiais estão
// no lugar certo e quantos são certos, mas em outro lugar. Abrir o cofre rende os materiais do segredo; abrir rápido dobra o prêmio.
// Lógica pura (recebe `game`): o segredo, as dicas e o prêmio saem daqui; a interface cuida dos toques e do desenho.
import * as cargas from './cargas.js';
import { materiaisPossiveis } from './minigame.js';

const C = (game) => game.data.meta.codigo;

export const atualizarCargas = (game) => cargas.atualizarCargas(game, 'codigo');
export const cargasAgora = (game) => cargas.cargasAgora(game, 'codigo');
export const msParaProxima = (game) => cargas.msParaProxima(game, 'codigo');

// o cofre do nível: quantos espaços, quantos materiais diferentes e se o mesmo pode repetir
export const cofreDe = (game) => C(game).niveis.find((t) => game.nivel() <= t.ate) ?? C(game).niveis.at(-1);
export const unidadesPorEspaco = (game) => 1 + Math.floor(game.nivel() / C(game).nivelPorUnidade);

// Marca cada peça do palpite: 'certo' (material no lugar certo), 'quase' (material que está no segredo, mas em outro lugar) ou
// 'nada' (não há mais dele no segredo). Cada material do segredo só vale uma vez (como no Wordle).
export function marcas(segredo, palpite) {
  const r = palpite.map(() => 'nada');
  const sobra = new Map();
  segredo.forEach((m, i) => {
    if (palpite[i] === m) r[i] = 'certo';
    else sobra.set(m, (sobra.get(m) ?? 0) + 1);
  });
  palpite.forEach((m, i) => {
    if (r[i] === 'certo') return;
    const q = sobra.get(m) ?? 0;
    if (q > 0) { r[i] = 'quase'; sobra.set(m, q - 1); }
  });
  return r;
}

// Dicas de um palpite em números: `certos` = no lugar certo; `quase` = material certo em outro lugar.
export function dicas(segredo, palpite) {
  const m = marcas(segredo, palpite);
  return { certos: m.filter((x) => x === 'certo').length, quase: m.filter((x) => x === 'quase').length };
}

// Começa uma partida (gasta uma). Devolve { ok, paleta, espacos, tentativas, segredo, unidades, repete } ou { ok: false, motivo }.
export function iniciarPartida(game) {
  if (cargasAgora(game) < 1) return { ok: false, motivo: 'sem-partidas' };
  const cofre = cofreDe(game);
  const pool = materiaisPossiveis(game);
  const cores = Math.min(cofre.cores, pool.length);
  // sem repetição o segredo precisa de pelo menos tantos materiais quanto espaços
  const repete = cofre.repete || cores < cofre.espacos;
  const espacos = repete ? cofre.espacos : Math.min(cofre.espacos, cores);
  if (cores < 2) return { ok: false, motivo: 'sem-materiais' };
  const paleta = game.rng.shuffle(pool).slice(0, cores).map((m) => m.id);
  const segredo = repete
    ? Array.from({ length: espacos }, () => game.rng.pick(paleta))
    : game.rng.shuffle(paleta).slice(0, espacos);
  cargas.gastarCarga(game, 'codigo');
  game.emit('codigo');
  return { ok: true, paleta, espacos, tentativas: C(game).tentativas, segredo, unidades: unidadesPorEspaco(game), repete };
}

// Confere a partida pelos palpites (a interface só diz o que o jogador tentou) e entrega o prêmio.
// `resultado` = { palpites: [[material, ...], ...] }. Devolve { ok, aberto, tentativas, rapido, ganhou, total }.
export function finalizarPartida(game, partida, resultado) {
  const validos = new Set(partida.paleta);
  const palpites = (resultado.palpites ?? [])
    .filter((p) => Array.isArray(p) && p.length === partida.espacos && p.every((m) => validos.has(m)))
    .slice(0, partida.tentativas);
  const acerto = palpites.findIndex((p) => p.every((m, i) => m === partida.segredo[i]));
  const aberto = acerto >= 0;
  const tentativas = aberto ? acerto + 1 : palpites.length;
  const rapido = aberto && tentativas <= C(game).rapidoAte;
  const ganhou = {};
  const soma = (m, q) => { ganhou[m] = (ganhou[m] ?? 0) + q; };
  if (aberto) {
    const por = partida.unidades * (rapido ? 2 : 1);
    for (const m of partida.segredo) soma(m, por);
  } else if (palpites.length) {
    // consolo: 1 de cada material que estava no lugar certo no último palpite
    const ultimo = palpites.at(-1);
    partida.segredo.forEach((m, i) => { if (ultimo[i] === m) soma(m, 1); });
  }
  const total = Object.values(ganhou).reduce((a, b) => a + b, 0);
  for (const [m, q] of Object.entries(ganhou)) game.state.materiais[m] = (game.state.materiais[m] ?? 0) + q;
  const s = game.state.codigo;
  s.partidas += 1;
  if (aberto) s.vitorias += 1;
  if (rapido) s.rapidas += 1;
  if (total > 0) game.emit('materiais', game.state.materiais);
  game.emit('codigo', { ganhou, aberto, rapido, total });
  return { ok: true, aberto, tentativas, rapido, ganhou, total };
}
