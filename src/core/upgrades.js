// Comprar melhorias, contratar e promover funcionários, escolher a decoração. Lógica pura (recebe `game`).
import { recalcularMods } from './mods.js';

// ---------- melhorias ----------
// Estado de uma melhoria: 'comprada' | 'disponivel' | 'reputacao' | 'requisito' (e `faltam` com os ids que faltam)
export function estadoMelhoria(game, m) {
  if (game.state.melhorias[m.id]) return { estado: 'comprada' };
  const faltam = (m.requer ?? []).filter((r) => !game.state.melhorias[r]);
  if (faltam.length) return { estado: 'requisito', faltam };
  if (game.nivel() < (m.nivelRep ?? 1)) return { estado: 'reputacao', nivel: m.nivelRep };
  return { estado: 'disponivel' };
}

export function comprarMelhoria(game, id) {
  const m = game.data.melhorias[id];
  if (!m) return { ok: false, motivo: 'inexistente' };
  const e = estadoMelhoria(game, m);
  if (e.estado === 'comprada') return { ok: false, motivo: 'ja-comprada' };
  if (e.estado !== 'disponivel') return { ok: false, motivo: e.estado };
  if (!game.gastarOuro(m.custo)) return { ok: false, motivo: 'sem-ouro' };
  game.state.melhorias[id] = true;
  recalcularMods(game);
  game.emit('melhoria', m);
  return { ok: true };
}

// dá a melhoria sem cobrar ouro (recompensa de anúncio); quem chama já conferiu que ela está disponível
export function concederMelhoria(game, id) {
  const m = game.data.melhorias[id];
  if (!m || estadoMelhoria(game, m).estado !== 'disponivel') return { ok: false, motivo: 'indisponivel' };
  game.state.melhorias[id] = true;
  recalcularMods(game);
  game.emit('melhoria', m);
  return { ok: true };
}

export const melhoriasDoGrupo = (game, grupo) => game.data.listas.melhorias.filter((m) => m.grupo === grupo);

// ---------- equipe ----------
export const nivelFuncionario = (game, id) => game.state.equipe[id]?.nivel ?? 0;

// o próximo nível (contratar ou promover): { nivel, custo, nivelRep, efeitos } ou null no máximo
export function proximoNivel(game, id) {
  const f = game.data.equipe[id];
  const n = nivelFuncionario(game, id);
  return f && n < f.niveis.length ? { nivel: n + 1, ...f.niveis[n] } : null;
}

export function contratar(game, id) {
  const prox = proximoNivel(game, id);
  if (!game.data.equipe[id]) return { ok: false, motivo: 'inexistente' };
  if (!prox) return { ok: false, motivo: 'maximo' };
  if (game.nivel() < prox.nivelRep) return { ok: false, motivo: 'reputacao', nivel: prox.nivelRep };
  if (!game.gastarOuro(prox.custo)) return { ok: false, motivo: 'sem-ouro' };
  game.state.equipe[id] = { nivel: prox.nivel };
  recalcularMods(game);
  game.emit('equipe', { id, nivel: prox.nivel });
  return { ok: true, nivel: prox.nivel };
}

// ---------- decoração ----------
// vale a decoração comprada com ouro ou, nos temas da loja de apoio, o tema comprado por código (que não se perde ao recomeçar)
export const possuiDecoracao = (game, id) => {
  const d = game.data.decoracoes[id];
  return !!game.state.decoracoes[id] || (!!d?.premium && game.apoio.tem(d.premium));
};

export function comprarDecoracao(game, id) {
  const d = game.data.decoracoes[id];
  if (!d) return { ok: false, motivo: 'inexistente' };
  if (d.premium) return { ok: false, motivo: 'loja-de-apoio' };      // tema pago: não se compra com ouro
  if (game.state.decoracoes[id]) return { ok: false, motivo: 'ja-comprada' };
  if (game.nivel() < (d.nivelRep ?? 1)) return { ok: false, motivo: 'reputacao', nivel: d.nivelRep };
  if (!game.gastarOuro(d.custo)) return { ok: false, motivo: 'sem-ouro' };
  game.state.decoracoes[id] = true;
  game.emit('decoracao', d);
  return usarDecoracao(game, id);
}

export function usarDecoracao(game, id) {
  if (!possuiDecoracao(game, id)) return { ok: false, motivo: 'nao-comprada' };
  game.state.loja.tema = id;
  recalcularMods(game);
  game.emit('decoracao', game.data.decoracoes[id]);
  return { ok: true };
}

// o tema em uso; se for um tema pago que o jogador não tem (ex.: o código foi removido), volta ao rústico
export const temaAtual = (game) => {
  const d = game.data.decoracoes[game.state.loja.tema];
  return d && (!d.premium || possuiDecoracao(game, d.id)) ? d : game.data.decoracoes.rustico;
};
