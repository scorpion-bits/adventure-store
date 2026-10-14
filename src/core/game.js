// O jogo em si, sem Pixi: guarda o estado, aplica as regras e avisa a interface por eventos.
// Roda igual no navegador, nos testes e no simulador de balanceamento (scripts/balance-sim.mjs).
import { DATA } from '../data/index.js';
import { createRng } from './rng.js';
import { createClock, dayKey, daysBetween } from './time.js';
import { repNivel, repProgresso, repParaNivel } from './economy.js';
import { tickLoja } from './shop.js';
import { avancarProducao } from './craft.js';
import { tickEquipe } from './staff.js';
import { tickEventos } from './events.js';
import { tickExpedicoes } from './expeditions.js';
import { concluirCapitulo } from './legend-story.js';
import { registrarDia, bonusEspecial } from './daily.js';
import { ligarConquistas } from './achievements.js';
import { modsBase, recalcularMods } from './mods.js';
import { semApoio } from './apoio.js';

// número do dia de jogo (1 no primeiro dia), contado em dias de calendário
export const diaDeJogo = (state) => daysBetween(dayKey(state.criadoEm), state.dia.data) + 1;

export function createGame({ state, data = DATA, clock = createClock(), rng = createRng(), apoio = semApoio() }) {
  const handlers = new Map();

  // clientes que estavam na fila ao fechar o jogo voltam com a paciência cheia (e os de aventureiros que não existem mais somem)
  state.fila = state.fila.filter((c) => data.aventureiros[c.adv]);
  for (const c of state.fila) c.paciencia = c.pacienciaMax ?? c.paciencia;

  const game = {
    state, data, clock, rng,
    apoio,       // o que o jogador comprou na loja de apoio (core/apoio.js): temas e "sem anúncios"
    // modificadores vindos das melhorias, equipe, decoração... (recalculados por quem os concede; ver M5)
    mods: modsBase(),

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
      // o nível nunca cai: recusas e clientes que desistem só gastam o progresso dentro do nível atual
      state.rep = n < 0 ? Math.max(state.rep + n, repParaNivel(antes)) : state.rep + n;
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
      avancarProducao(game);
      tickLoja(game, dtMs);
      tickEquipe(game, dtMs);
      tickEventos(game, dtMs);
      tickExpedicoes(game);
      game.conquistasTick();
      game.emit('tick', dtMs);
    },
  };

  game.on('venda', (v) => concluirCapitulo(game, v));
  game.on('venda', (v) => bonusEspecial(game, v));
  game.on('dia', () => { recalcularMods(game); registrarDia(game); });      // virou o dia: sazonais, sequência e conteúdo do dia
  recalcularMods(game);
  ligarConquistas(game);
  registrarDia(game);                                                          // sequência de dias, encomendas e metas já valem desde o começo
  return game;
}
