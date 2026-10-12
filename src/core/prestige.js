// Prestígio: "Expandir para uma nova cidade". A loja recomeça; ficam a coleção, as conquistas, as lendas, a sequência de dias
// e a Herança, uma moeda permanente que se gasta em bônus (data/heranca.js). Lógica pura (recebe `game`).
import { defaultState } from './state.js';
import { recalcularMods } from './mods.js';
import { registrarDia } from './daily.js';

const P = (game) => game.data.meta.prestigio;

export const nomeDaCidade = (game, n = game.state.prestigio.cidade) => {
  const lista = game.data.cidades;
  const volta = Math.floor((n - 1) / lista.length);
  return volta === 0 ? lista[n - 1] : `${lista[(n - 1) % lista.length]} ${romano(volta + 1)}`;
};
const romano = (n) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n);

// ouro ganho desde que esta cidade foi fundada
export const ouroDestaCidade = (game) => Math.max(0, game.state.stats.ouroTotal - game.state.prestigio.base);

// Herança que a expansão renderia agora (0 enquanto a reputação mínima não foi atingida)
export function herancaPendente(game) {
  if (game.nivel() < P(game).nivelMin) return 0;
  return Math.floor(P(game).coef * Math.sqrt(ouroDestaCidade(game) / P(game).ouroBase));
}

export function estadoExpansao(game) {
  const ganho = herancaPendente(game);
  const nivelMin = P(game).nivelMin;
  if (game.nivel() < nivelMin) return { ok: false, motivo: 'reputacao', nivelMin, ganho };
  if (ganho < 1) return { ok: false, motivo: 'ouro', ganho, falta: Math.ceil(P(game).ouroBase - ouroDestaCidade(game)) };
  return { ok: true, ganho };
}

// campos que voltam ao começo numa cidade nova (o resto do estado fica)
const REINICIA = [
  'ouro', 'rep', 'estoque', 'materiais', 'fila', 'loja', 'melhorias', 'equipe', 'decoracoes', 'repetir', 'relogioEquipe',
  'oficios', 'producao', 'prontos', 'producaoUid', 'expedicoes', 'expedicaoUid', 'eventos', 'bonus', 'mercado',
];

export function expandir(game) {
  const e = estadoExpansao(game);
  if (!e.ok) return { ok: false, motivo: e.motivo };
  const s = game.state;
  const novo = defaultState(game.clock.now());
  for (const k of REINICIA) s[k] = structuredClone(novo[k]);
  s.prestigio.heranca += e.ganho;
  s.prestigio.herancaTotal += e.ganho;
  s.prestigio.cidade += 1;
  s.prestigio.base = s.stats.ouroTotal;
  recalcularMods(game);
  s.ouro += game.mods.ouroInicial;                  // o pé-de-meia da família (não conta como ouro ganho)
  s.diario.data = '';                               // encomendas e especial do dia refeitos para a nova fase
  registrarDia(game);
  for (const ev of ['ouro', 'rep', 'estoque', 'materiais', 'fila', 'producao', 'oficio', 'expedicao', 'diario']) game.emit(ev);        // a interface refaz as telas (esses eventos não levam dados)
  game.emit('expandiu', { cidade: s.prestigio.cidade, ganho: e.ganho });
  return { ok: true, ganho: e.ganho, cidade: s.prestigio.cidade };
}

// ---------- bônus de Herança ----------
export const nivelHeranca = (game, id) => game.state.prestigio.bonus[id] ?? 0;
export const custoHeranca = (game, id) => game.data.heranca[id].niveis[nivelHeranca(game, id)]?.custo ?? null;     // null = no máximo

export function comprarHeranca(game, id) {
  const def = game.data.heranca[id];
  if (!def) return { ok: false, motivo: 'inexistente' };
  const custo = custoHeranca(game, id);
  if (custo === null) return { ok: false, motivo: 'maximo' };
  if (game.state.prestigio.heranca < custo) return { ok: false, motivo: 'sem-heranca' };
  game.state.prestigio.heranca -= custo;
  game.state.prestigio.bonus[id] = nivelHeranca(game, id) + 1;
  recalcularMods(game);
  game.emit('heranca', { id, nivel: game.state.prestigio.bonus[id] });
  return { ok: true, nivel: game.state.prestigio.bonus[id] };
}
