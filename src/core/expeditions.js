// Expedições: o jogador manda batedores a uma região (em tempo real, continua com o jogo fechado) e eles trazem materiais da região,
// mais barato por unidade que os fornecedores (e mais vantajoso quanto mais longa a viagem), e às vezes uma curiosidade rara.
// Lógica pura (recebe `game`).
import { espacoLivre } from './estoque.js';
import { fmt } from '../format.js';

const T = (game) => game.data.meta.expedicoes;
export const tierDe = (game, id) => T(game).tiers.find((t) => t.id === id);
export const slotsExpedicao = (game) => T(game).slotsBase + (game.mods.expedicoes ?? 0);
export const regiaoAberta = (game, regiaoId) => game.nivel() >= (game.data.regioes[regiaoId]?.nivelRep ?? Infinity);
export const materiaisDaRegiao = (game, regiaoId) => game.data.listas.materiais.filter((m) => m.regiao === regiaoId);

// peso de cada material no sorteio: os baratos aparecem mais que os raros
const pesoMaterial = (m) => 1 / Math.sqrt(m.valor);

// valor médio de uma unidade trazida (usado para fixar o custo)
export function valorMedio(game, regiaoId) {
  const lista = materiaisDaRegiao(game, regiaoId);
  const total = lista.reduce((n, m) => n + pesoMaterial(m), 0);
  return lista.reduce((n, m) => n + (pesoMaterial(m) / total) * m.valor, 0);
}

// quantas unidades traz (com os bônus de melhoria)
export const unidadesDe = (game, tier) => Math.round(tier.unidades * (game.mods.expedicaoRendimento ?? 1));

// custo em ouro: o valor esperado do que trazem dividido pela eficiência da viagem (mais longa, mais vantajosa)
export function custoExpedicao(game, regiaoId, tierId) {
  const tier = tierDe(game, tierId);
  return Math.max(1, Math.round((valorMedio(game, regiaoId) * tier.unidades) / tier.eficiencia));
}

export const emAndamento = (game) => game.state.expedicoes.filter((e) => e.fim > game.clock.now());
export const prontas = (game) => game.state.expedicoes.filter((e) => e.fim <= game.clock.now());

export function iniciarExpedicao(game, regiaoId, tierId) {
  const regiao = game.data.regioes[regiaoId];
  const tier = tierDe(game, tierId);
  if (!regiao || !tier) return { ok: false, motivo: 'inexistente' };
  if (!regiaoAberta(game, regiaoId)) return { ok: false, motivo: 'regiao-fechada', nivel: regiao.nivelRep };
  if (game.state.expedicoes.length >= slotsExpedicao(game)) return { ok: false, motivo: 'sem-vaga' };
  const custo = custoExpedicao(game, regiaoId, tierId);
  if (!game.gastarOuro(custo)) return { ok: false, motivo: 'sem-ouro', custo };
  game.state.expedicaoUid += 1;
  const agora = game.clock.now();
  const e = { uid: game.state.expedicaoUid, regiao: regiaoId, tier: tierId, inicio: agora, fim: agora + tier.minutos * 60000, custo };
  game.state.expedicoes.push(e);
  game.emit('expedicao', e);
  return { ok: true, expedicao: e };
}

// Recolhe o que os batedores trouxeram (só quando já voltaram). Devolve { ok, materiais, itens, linhas }.
export function coletarExpedicao(game, uid) {
  const i = game.state.expedicoes.findIndex((e) => e.uid === uid);
  if (i < 0) return { ok: false, motivo: 'inexistente' };
  const e = game.state.expedicoes[i];
  if (e.fim > game.clock.now()) return { ok: false, motivo: 'em-andamento' };
  const tier = tierDe(game, e.tier);
  const lista = materiaisDaRegiao(game, e.regiao);
  if (!tier || !lista.length) {                      // região ou viagem que não existe mais nos dados: devolve o custo
    game.state.expedicoes.splice(i, 1);
    game.ganharOuro(e.custo ?? 0);
    return { ok: false, motivo: 'regiao-removida' };
  }
  const materiais = {};
  for (let k = 0; k < unidadesDe(game, tier); k++) {
    const m = game.rng.weighted(lista, pesoMaterial);
    materiais[m.id] = (materiais[m.id] ?? 0) + 1;
  }
  for (const [id, q] of Object.entries(materiais)) game.state.materiais[id] = (game.state.materiais[id] ?? 0) + q;

  const itens = {};
  for (const d of game.data.regioes[e.regiao]?.drops ?? []) {
    if (!game.rng.chance(Math.min(0.95, d.chance * tier.chanceDrop))) continue;
    if (espacoLivre(game) <= 0) continue;
    const chave = `${d.item}:1`;
    game.state.estoque[chave] = (game.state.estoque[chave] ?? 0) + 1;
    itens[d.item] = (itens[d.item] ?? 0) + 1;
  }
  game.state.expedicoes.splice(i, 1);
  game.state.stats.expedicoes = (game.state.stats.expedicoes ?? 0) + 1;
  game.emit('materiais', game.state.materiais);
  if (Object.keys(itens).length) game.emit('estoque', game.state.estoque);

  const nome = (id) => game.data.materiais[id]?.nome ?? game.data.itens[id]?.nome ?? id;
  const linhas = [
    ...Object.entries(materiais).sort((a, b) => b[1] - a[1]).map(([id, q]) => `+${fmt(q)} ${nome(id)}`),
    ...Object.entries(itens).map(([id, q]) => `+${q} ${nome(id)} (achado raro!)`),
  ];
  game.emit('expedicaoColetada', { expedicao: e, materiais, itens, linhas });
  return { ok: true, materiais, itens, linhas };
}

// Chamado a cada quadro: avisa (uma vez) quando os batedores de uma expedição voltaram, inclusive os que voltaram com o jogo fechado.
export function tickExpedicoes(game) {
  const agora = game.clock.now();
  for (const e of game.state.expedicoes) {
    if (!e.avisada && e.fim <= agora) {
      e.avisada = true;
      game.emit('expedicaoPronta', e);
    }
  }
}
