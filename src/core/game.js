// O jogo em si, sem Pixi: guarda o estado, aplica as regras e avisa a interface por eventos.
// Roda igual no navegador, nos testes e no simulador de balanceamento (scripts/balance-sim.mjs).
import { DATA } from '../data/index.js';
import { createRng } from './rng.js';
import { createClock, dayKey, daysBetween } from './time.js';
import { repNivel, repProgresso } from './economy.js';

// número do dia de jogo (1 no primeiro dia), contado em dias de calendário
export const diaDeJogo = (state) => daysBetween(dayKey(state.criadoEm), state.dia.data) + 1;

export function createGame({ state, data = DATA, clock = createClock(), rng = createRng() }) {
  const handlers = new Map();

  const game = {
    state, data, clock, rng,

    // ---------- eventos ----------
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(fn);
      return () => handlers.get(type).delete(fn);
    },
    emit(type, payload) {
      for (const fn of handlers.get(type) ?? []) fn(payload);
    },

    // ---------- ouro e reputação ----------
    ganharOuro(n) {
      if (!(n > 0)) return;
      state.ouro += n;
      state.stats.ouroTotal += n;
      game.emit('ouro', state.ouro);
    },
    // gasta se tiver; devolve se conseguiu
    gastarOuro(n) {
      if (n > state.ouro) return false;
      state.ouro -= n;
      game.emit('ouro', state.ouro);
      return true;
    },
    ganharRep(n) {
      const antes = repNivel(state.rep);
      state.rep = Math.max(0, state.rep + n);
      const depois = repNivel(state.rep);
      game.emit('rep', state.rep);
      if (depois > antes) game.emit('nivel', depois);
    },
    nivel: () => repNivel(state.rep),
    progressoNivel: () => repProgresso(state.rep),

    // ---------- dia do calendário ----------
    // devolve quantos dias se passaram desde a última verificação (0 no mesmo dia)
    verificarDia() {
      const hoje = dayKey(clock.now());
      if (hoje === state.dia.data) return 0;
      const passou = Math.max(0, daysBetween(state.dia.data, hoje));
      state.dia.data = hoje;
      game.emit('dia', { data: hoje, passou });
      return passou;
    },

    // ---------- tempo ----------
    // chamado a cada quadro pela interface (dtMs em milissegundos)
    tick(dtMs) {
      game.verificarDia();
      game.emit('tick', dtMs);
    },
  };

  return game;
}
