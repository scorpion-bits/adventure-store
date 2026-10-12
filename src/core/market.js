// Mercado: fornecedores vendem materiais. Preço e estoque de cada dia são sorteados pela DATA e pelo id do
// fornecedor, então são iguais para todo mundo e não mudam se o jogador recarregar a página.
// Lógica pura: as funções recebem `game` (veja game.js).
import { createRng } from './rng.js';

export function fornecedorDisponivel(game, f) {
  const nivel = game.nivel();
  const regiao = game.data.regioes[f.regiao];
  return nivel >= (f.nivelRep ?? 1) && nivel >= (regiao?.nivelRep ?? 1);
}

const nomeDe = (game, id) => game.data.materiais[id]?.nome ?? game.data.itens[id]?.nome ?? id;
const valorDe = (game, id) => game.data.materiais[id]?.valor ?? game.data.itens[id]?.valor ?? 1;

// zera o que já foi comprado quando o dia do calendário muda
function garantirDia(game) {
  const m = game.state.mercado;
  if (m.data !== game.state.dia.data) {
    m.data = game.state.dia.data;
    m.comprado = {};
  }
  return m;
}

// Ofertas de hoje de um fornecedor: [{ material, nome, preco, base, tendencia, total, restante, comprado }]
export function ofertas(game, f) {
  const m = garantirDia(game);
  const rng = createRng(`${game.state.dia.data}:${f.id}`);
  const variacao = f.variacao ?? 0.15;
  const desconto = game.mods.compra ?? 1;
  return f.vende.map((v) => {
    const fator = rng.between(1 - variacao, 1 + variacao);
    const total = Math.max(1, Math.round(v.estoque * rng.between(0.7, 1.3)));
    const preco = Math.max(1, Math.round(v.preco * fator * desconto));
    const comprado = m.comprado[`${f.id}:${v.material}`] ?? 0;
    return {
      material: v.material,
      nome: nomeDe(game, v.material),
      preco, base: v.preco,
      tendencia: fator < 0.92 ? -1 : fator > 1.08 ? 1 : 0,      // -1 = em promoção, 1 = mais caro que o normal
      total, comprado, restante: Math.max(0, total - comprado),
    };
  });
}

export const maxCompravel = (game, oferta) => Math.max(0, Math.min(oferta.restante, Math.floor(game.state.ouro / oferta.preco)));

// Compra `qtd` unidades (ou o que sobrar do estoque do fornecedor). Devolve { ok, motivo, qtd, custo }.
export function comprar(game, fornecedorId, material, qtd = 1) {
  const f = game.data.fornecedores[fornecedorId];
  if (!f || !fornecedorDisponivel(game, f)) return { ok: false, motivo: 'indisponivel' };
  const o = ofertas(game, f).find((x) => x.material === material);
  if (!o) return { ok: false, motivo: 'nao-vende' };
  const n = Math.min(Math.floor(qtd), o.restante);
  if (!(n > 0)) return { ok: false, motivo: 'sem-estoque' };
  const custo = n * o.preco;
  if (!game.gastarOuro(custo)) return { ok: false, motivo: 'sem-ouro', custo };

  const m = garantirDia(game);
  m.comprado[`${f.id}:${material}`] = o.comprado + n;
  if (game.data.itens[material]) game.state.estoque[`${material}:1`] = (game.state.estoque[`${material}:1`] ?? 0) + n;
  else game.state.materiais[material] = (game.state.materiais[material] ?? 0) + n;
  game.state.stats.comprados = (game.state.stats.comprados ?? 0) + n;
  game.emit('materiais', game.state.materiais);
  if (game.data.itens[material]) game.emit('estoque', game.state.estoque);
  game.emit('compra', { fornecedor: f, material, qtd: n, custo });
  return { ok: true, qtd: n, custo };
}

// resumo do depósito: [{ id, nome, qtd, valor }] com quantidade > 0
export function deposito(game) {
  return Object.entries(game.state.materiais)
    .filter(([, q]) => q > 0)
    .map(([id, qtd]) => ({ id, nome: nomeDe(game, id), qtd, valor: valorDe(game, id) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// quantos de um material o jogador tem
export const temMaterial = (game, id) => game.state.materiais[id] ?? 0;
