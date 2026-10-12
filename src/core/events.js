// Eventos aleatórios: de tempos em tempos chega uma situação com escolhas (data/eventos.js). Cada escolha tem resultados
// sorteados que aplicam efeitos (ouro, reputação, materiais, itens, bônus por tempo, clientes...). Lógica pura (recebe `game`).
import { recalcularMods, descreverEfeito } from './mods.js';
import { espacoLivre } from './estoque.js';
import { criarCliente, clienteRico, receberCliente, gerarCliente, adventureiro } from './shop.js';
import { ganharXp, adiantarProducao, oficioAberto } from './craft.js';
import { fmt } from '../format.js';

const sinal = (n) => (n >= 0 ? `+${fmt(n)}` : `−${fmt(Math.abs(n))}`);
const nomeMaterial = (game, id) => game.data.materiais[id]?.nome ?? game.data.itens[id]?.nome ?? id;

// ---------- bônus por tempo ----------
function adicionarBonus(game, { efeito, minutos, rotulo }) {
  const s = game.state;
  const ate = game.clock.now() + minutos * 60000;
  const igual = s.bonus.find((b) => b.rotulo === rotulo && b.efeito.tipo === efeito.tipo && b.efeito.oficio === efeito.oficio);
  if (igual) { igual.ate = Math.max(igual.ate, ate); igual.efeito = efeito; } else s.bonus.push({ rotulo, efeito, ate });
  recalcularMods(game);
  game.emit('bonus', s.bonus);
}

function expirarBonus(game) {
  const agora = game.clock.now();
  const antes = game.state.bonus.length;
  game.state.bonus = game.state.bonus.filter((b) => b.ate > agora);
  if (game.state.bonus.length !== antes) { recalcularMods(game); game.emit('bonus', game.state.bonus); }
}

// ---------- efeitos ----------
const unidades = (dic) => Object.entries(dic).filter(([, q]) => q > 0);

function perder(game, dic, qtd, nomear, evento) {
  let tirados = 0;
  for (let i = 0; i < qtd; i++) {
    const lista = unidades(dic);
    if (!lista.length) break;
    const [chave] = game.rng.pick(lista);
    if (dic[chave] <= 1) delete dic[chave]; else dic[chave] -= 1;
    tirados += 1;
  }
  if (tirados) game.emit(evento, dic);
  return tirados;
}

const APLICAR = {
  ouro(game, ef) {
    const n = Math.round(ef.valor);
    if (n >= 0) { game.ganharOuro(n); return n ? `${sinal(n)} ouro` : null; }
    const perdeu = Math.min(game.state.ouro, -n);
    game.state.ouro -= perdeu;
    game.emit('ouro', game.state.ouro);
    return perdeu ? `−${fmt(perdeu)} ouro` : null;
  },
  ouroPct(game, ef) { return APLICAR.ouro(game, { valor: Math.round(game.state.ouro * ef.valor) }); },
  rep(game, ef) { game.ganharRep(ef.valor); return `${sinal(ef.valor)} reputação`; },
  material(game, ef) {
    const atual = game.state.materiais[ef.id] ?? 0;
    const n = ef.qtd >= 0 ? ef.qtd : -Math.min(atual, -ef.qtd);
    if (!n) return null;
    game.state.materiais[ef.id] = atual + n;
    if (game.state.materiais[ef.id] <= 0) delete game.state.materiais[ef.id];
    game.emit('materiais', game.state.materiais);
    return `${sinal(n)} ${nomeMaterial(game, ef.id)}`;
  },
  materialAleatorio(game, ef) {
    const opcoes = game.data.listas.materiais.filter((m) => m.regiao === ef.regiao);
    if (!opcoes.length) return null;
    const ganhos = {};
    for (let i = 0; i < ef.qtd; i++) { const m = game.rng.pick(opcoes); ganhos[m.id] = (ganhos[m.id] ?? 0) + 1; }
    for (const [id, q] of Object.entries(ganhos)) game.state.materiais[id] = (game.state.materiais[id] ?? 0) + q;
    game.emit('materiais', game.state.materiais);
    return Object.entries(ganhos).map(([id, q]) => `+${q} ${nomeMaterial(game, id)}`).join(', ');
  },
  item(game, ef) {
    const n = Math.min(ef.qtd, espacoLivre(game));
    if (n <= 0) return 'Prateleiras cheias: nada coube';
    const chave = `${ef.id}:${ef.qualidade ?? 1}`;
    game.state.estoque[chave] = (game.state.estoque[chave] ?? 0) + n;
    game.emit('estoque', game.state.estoque);
    return `+${n} ${nomeMaterial(game, ef.id)}`;
  },
  itemAleatorio(game, ef) {
    const nivel = game.nivel();
    let lista = game.data.listas.itens.filter((i) => i.cat === ef.cat && (i.nivelRep ?? 1) <= nivel && i.valor <= 120 + 60 * nivel);
    if (!lista.length) lista = game.data.listas.itens.filter((i) => i.cat === ef.cat);
    const item = game.rng.pick(lista);
    return APLICAR.item(game, { id: item.id, qtd: ef.qtd });
  },
  perderItens(game, ef) {
    const n = perder(game, game.state.estoque, ef.qtd, null, 'estoque');
    return n ? `−${n} ${n === 1 ? 'item' : 'itens'} das prateleiras` : null;
  },
  perderMateriais(game, ef) {
    const n = perder(game, game.state.materiais, ef.qtd, null, 'materiais');
    return n ? `−${n} ${n === 1 ? 'material' : 'materiais'} do depósito` : null;
  },
  bonus(game, ef) {
    adicionarBonus(game, ef);
    return `${descreverEfeito(ef.efeito, game)} por ${ef.minutos} min`;
  },
  cliente(game, ef) {
    const c = criarCliente(game, ef.adv);
    if (!c) return null;
    receberCliente(game, c);
    return `${adventureiro(game, c).nome} entrou na fila`;
  },
  clienteRico(game) {
    const c = clienteRico(game);
    if (!c) return null;
    receberCliente(game, c);
    return `${adventureiro(game, c).nome} entrou na fila`;
  },
  clientes(game, ef) {
    let n = 0;
    for (let i = 0; i < ef.qtd; i++) { const c = gerarCliente(game); if (c) { receberCliente(game, c); n += 1; } }
    return n ? `${n} ${n === 1 ? 'cliente entrou' : 'clientes entraram'} na fila` : null;
  },
  xpOficio(game, ef) {
    if (!oficioAberto(game, ef.oficio)) return null;
    ganharXp(game, ef.oficio, ef.xp);
    return `+${ef.xp} de experiência em ${game.data.meta.oficios.find((o) => o.id === ef.oficio)?.nome ?? ef.oficio}`;
  },
  oficinaAvanca(game, ef) {
    if (!game.state.producao.some((j) => j.inicio !== null)) return null;
    adiantarProducao(game, ef.segundos);
    return `A oficina adiantou ${Math.round(ef.segundos / 60)} min de trabalho`;
  },
};

export const TIPOS_DE_EFEITO = Object.keys(APLICAR);

// Aplica uma lista de efeitos e devolve as linhas de resumo (o que o jogador vê).
export function aplicarEfeitosEvento(game, efeitos) {
  const linhas = [];
  for (const ef of efeitos ?? []) {
    const linha = APLICAR[ef.tipo]?.(game, ef);
    if (linha) linhas.push(linha);
  }
  return linhas;
}

// ---------- sorteio e fluxo ----------
export function elegiveis(game) {
  const agora = game.clock.now();
  const nivel = game.nivel();
  return game.data.listas.eventos.filter((e) => {
    const r = e.requer ?? {};
    if (nivel < (r.nivel ?? 1) || nivel > (r.nivelMax ?? Infinity)) return false;
    if (r.regiao && nivel < (game.data.regioes[r.regiao]?.nivelRep ?? 1)) return false;
    const cool = (e.cooldown ?? game.data.meta.eventos.cooldownPadraoMin) * 60000;
    return agora - (game.state.eventos.ultimo[e.id] ?? -Infinity) >= cool;
  });
}

const proximoIntervalo = (game) => {
  const m = game.data.meta.eventos;
  return game.rng.between(m.intervaloMin, m.intervaloMax);
};

export function disparar(game, id) {
  const def = game.data.eventos[id];
  if (!def || game.state.eventos.pendente) return null;
  game.state.eventos.pendente = { id };
  game.state.eventos.ultimo[id] = game.clock.now();
  game.emit('evento', def);
  return def;
}

export const eventoPendente = (game) => {
  const p = game.state.eventos.pendente;
  return p ? game.data.eventos[p.id] ?? null : null;
};

// Responde ao evento pendente com a escolha `indice`. Devolve { ok, texto, resumo } ou { ok: false, motivo }.
export function escolher(game, indice) {
  const def = eventoPendente(game);
  if (!def) return { ok: false, motivo: 'sem-evento' };
  const escolha = def.escolhas[indice];
  if (!escolha) return { ok: false, motivo: 'escolha-invalida' };
  const resumo = [];
  if (escolha.custo) {
    if (!game.gastarOuro(escolha.custo)) return { ok: false, motivo: 'sem-ouro' };
    resumo.push(`−${fmt(escolha.custo)} ouro`);
  }
  const resultado = game.rng.weighted(escolha.resultados, (r) => r.peso ?? 1);
  resumo.push(...aplicarEfeitosEvento(game, resultado.efeitos));
  game.state.eventos.pendente = null;
  game.state.eventos.proximo = proximoIntervalo(game);
  game.emit('eventoResolvido', { def, escolha, resultado });
  return { ok: true, texto: resultado.texto, resumo, def };
}

// Chamado a cada quadro: expira bônus e, de tempos em tempos, dispara um evento (nunca durante o tutorial).
export function tickEventos(game, dtMs) {
  expirarBonus(game);
  const e = game.state.eventos;
  if (e.pendente || !game.state.tutorial.feito) return;
  e.proximo -= dtMs;
  if (e.proximo > 0) return;
  const lista = elegiveis(game);
  const def = lista.length ? game.rng.weighted(lista, (x) => x.peso ?? 1) : null;
  if (def) disparar(game, def.id); else e.proximo = 60000;
}
