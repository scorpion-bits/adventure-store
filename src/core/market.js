// Mercado: fornecedores vendem materiais. Preço e estoque de cada dia são sorteados pela DATA e pelo id do
// fornecedor, então são iguais para todo mundo e não mudam se o jogador recarregar a página.
// Lógica pura: as funções recebem `game` (veja game.js).
import { createRng } from './rng.js';
import { espacoLivre } from './estoque.js';

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

// O estoque do dia chega aos poucos: uma parte logo cedo e o resto em horários fixos (hora local do aparelho).
// `f` = fração do estoque do dia já liberada a partir de `hora`.
export const LIBERACOES = [{ hora: 0, f: 0.4 }, { hora: 8, f: 0.6 }, { hora: 14, f: 0.8 }, { hora: 20, f: 1 }];
// depois que o estoque liberado acaba, dá para comprar mais por `URGENTE.preco`x o preço, até `URGENTE.fracao` do estoque do dia
export const URGENTE = { preco: 2, fracao: 0.3 };

export function liberacaoAgora(game) {
  const hora = new Date(game.clock.now()).getHours();
  const atual = [...LIBERACOES].reverse().find((l) => hora >= l.hora) ?? LIBERACOES[0];
  const proxima = LIBERACOES.find((l) => l.hora > hora) ?? null;
  return { f: atual.f, proximaHora: proxima?.hora ?? null };
}

// Ofertas de hoje de um fornecedor: [{ material, nome, preco, base, tendencia, total, liberado, restante, comprado, urgente, precoUrgente }]
export function ofertas(game, f) {
  const m = garantirDia(game);
  const rng = createRng(`${game.state.dia.data}:${f.id}`);
  const variacao = f.variacao ?? 0.15;
  const desconto = game.mods.compra ?? 1;
  const { f: fracao } = liberacaoAgora(game);
  return f.vende.map((v) => {
    const fator = rng.between(1 - variacao, 1 + variacao);
    const total = Math.max(1, Math.round(v.estoque * rng.between(0.7, 1.3)));
    const preco = Math.max(1, Math.round(v.preco * fator * desconto));
    const chave = `${f.id}:${v.material}`;
    const comprado = m.comprado[chave] ?? 0;
    const liberado = Math.max(1, Math.round(total * fracao));
    const reserva = Math.max(1, Math.round(total * URGENTE.fracao));
    return {
      material: v.material,
      nome: nomeDe(game, v.material),
      preco, base: v.preco,
      tendencia: fator < 0.92 ? -1 : fator > 1.08 ? 1 : 0,      // -1 = em promoção, 1 = mais caro que o normal
      total, liberado, comprado, restante: Math.max(0, liberado - comprado),
      urgente: Math.max(0, reserva - (m.comprado[`${chave}!`] ?? 0)),
      precoUrgente: Math.max(preco + 1, Math.round(preco * URGENTE.preco)),
    };
  });
}

export const maxCompravel = (game, oferta, urgente = false) => {
  const disp = urgente ? oferta.urgente : oferta.restante;
  const preco = urgente ? oferta.precoUrgente : oferta.preco;
  return Math.max(0, Math.min(disp, Math.floor(game.state.ouro / preco)));
};

// Compra `qtd` unidades (ou o que sobrar do estoque do fornecedor). Com `urgente`, usa a reserva de compra urgente (preço dobrado),
// que só vale quando o estoque normal liberado acabou. Devolve { ok, motivo, qtd, custo }.
export function comprar(game, fornecedorId, material, qtd = 1, { urgente = false } = {}) {
  const f = game.data.fornecedores[fornecedorId];
  if (!f || !fornecedorDisponivel(game, f)) return { ok: false, motivo: 'indisponivel' };
  const o = ofertas(game, f).find((x) => x.material === material);
  if (!o) return { ok: false, motivo: 'nao-vende' };
  const ehItem = !!game.data.itens[material];
  if (urgente && o.restante > 0) return { ok: false, motivo: 'use-estoque-normal' };
  const n = Math.min(Math.floor(qtd), urgente ? o.urgente : o.restante, ehItem ? espacoLivre(game) : Infinity);
  if (!(n > 0)) return { ok: false, motivo: ehItem && espacoLivre(game) <= 0 ? 'prateleiras-cheias' : 'sem-estoque' };
  const custo = n * (urgente ? o.precoUrgente : o.preco);
  if (!game.gastarOuro(custo)) return { ok: false, motivo: 'sem-ouro', custo };

  const m = garantirDia(game);
  const chaveUso = urgente ? `${f.id}:${material}!` : `${f.id}:${material}`;
  m.comprado[chaveUso] = (m.comprado[chaveUso] ?? 0) + n;
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
