// Retenção: encomendas diárias, aventureiro especial do dia, sequência de dias, bônus de login, metas e baú da semana.
// Tudo sorteado pela DATA (e pela faixa de reputação): quem está na mesma faixa vê as mesmas encomendas. Lógica pura (recebe `game`).
import { createRng } from './rng.js';
import { daysBetween, weekKey } from './time.js';
import { itensPedidos } from './shop.js';
import { aplicarEfeitosEvento } from './events.js';
import { fmt } from '../format.js';

const D = (game) => game.data.diario;
const S = (game) => game.data.semanal;

export const faixaDe = (game) => D(game).faixas.filter((n) => game.nivel() >= n).length;
// nível de referência da faixa (o menor dela): o sorteio usa este, não o nível exato, para quem está na mesma faixa ver o mesmo conteúdo
export const nivelDaFaixa = (game) => D(game).faixas[Math.max(0, faixaDe(game) - 1)];

// o item pode ser obtido? (tem receita ou algum fornecedor vende)
function obtivel(game, id) {
  return game.data.listas.receitas.some((r) => r.item === id) || game.data.listas.fornecedores.some((f) => f.vende.some((v) => v.material === id));
}

const qtdPor = (valor) => (valor < 30 ? 4 : valor < 100 ? 3 : valor < 400 ? 2 : 1);

// ---------- encomendas e especial ----------
export function gerarDiario(game) {
  const hoje = game.state.dia.data;
  const faixa = faixaDe(game);
  const rng = createRng(`${hoje}:diario:f${faixa}`);
  const nivel = nivelDaFaixa(game);
  const cfg = D(game);
  const valorMax = cfg.valorMax.base + cfg.valorMax.porNivel * nivel;

  const pool = game.data.listas.itens.filter((i) => (i.nivelRep ?? 1) <= nivel && i.valor <= valorMax && obtivel(game, i.id));
  const escolhidos = rng.shuffle(pool).slice(0, cfg.encomendas);
  const encomendas = escolhidos.map((item) => {
    const qtd = qtdPor(item.valor);
    const qualidadeMin = faixa >= 2 && rng.chance(0.3) ? 2 : 0;
    const mult = qualidadeMin >= 2 ? cfg.recompensa.qualidadeFino : 1;
    return {
      item: item.id, qtd, qualidadeMin, entregue: false,
      ouro: Math.round((item.valor * qtd * cfg.recompensa.ouroPorValor * mult) + cfg.recompensa.ouroPorNivel * nivel),
      rep: Math.min(5, 1 + qtd),
    };
  });

  // aventureiro especial: um tipo de cliente comum, elegível agora, com um pedido da faixa dele
  let especial = null;
  const candidatos = game.data.listas.aventureiros.filter((a) => !a.lendario && (a.nivelRep ?? 1) <= nivel && (game.data.regioes[a.regiao]?.nivelRep ?? 1) <= nivel);
  const adv = candidatos.length ? rng.weighted(candidatos, (a) => a.peso ?? 1) : null;
  if (adv) {
    const itens = itensPedidos(game, adv, nivel);
    if (itens.length) especial = { adv: adv.id, item: rng.pick(itens).id, visitou: false, atendido: false };
  }
  game.state.diario = { data: hoje, encomendas, especial, bonusColetado: game.state.diario.data === hoje ? game.state.diario.bonusColetado : false };
}

// unidades de `item` na qualidade pedida ou melhor
const disponiveis = (game, enc) => Object.entries(game.state.estoque)
  .filter(([k, q]) => q > 0 && k.startsWith(`${enc.item}:`) && Number(k.split(':')[1]) >= enc.qualidadeMin)
  .sort((a, b) => Number(a[0].split(':')[1]) - Number(b[0].split(':')[1]));        // gasta primeiro a pior qualidade que serve

export const unidadesParaEncomenda = (game, enc) => disponiveis(game, enc).reduce((n, [, q]) => n + q, 0);
export const podeEntregar = (game, enc) => !enc.entregue && unidadesParaEncomenda(game, enc) >= enc.qtd;

export function entregarEncomenda(game, indice) {
  const enc = game.state.diario.encomendas[indice];
  if (!enc) return { ok: false, motivo: 'inexistente' };
  if (enc.entregue) return { ok: false, motivo: 'ja-entregue' };
  if (!podeEntregar(game, enc)) return { ok: false, motivo: 'faltam-itens' };
  let falta = enc.qtd;
  for (const [chave, q] of disponiveis(game, enc)) {
    const tira = Math.min(q, falta);
    if (q - tira <= 0) delete game.state.estoque[chave]; else game.state.estoque[chave] = q - tira;
    falta -= tira;
    if (falta <= 0) break;
  }
  enc.entregue = true;
  game.state.stats.encomendas = (game.state.stats.encomendas ?? 0) + 1;
  game.ganharOuro(enc.ouro);
  game.ganharRep(enc.rep);
  game.emit('estoque', game.state.estoque);
  game.emit('encomenda', { enc, indice });
  return { ok: true, ouro: enc.ouro, rep: enc.rep };
}

// bônus ao atender o aventureiro especial (chamado a cada venda)
export function bonusEspecial(game, venda) {
  const e = game.state.diario.especial;
  if (!venda.cli?.especial || !venda.ok || !e || e.atendido) return null;
  if (venda.item.id !== e.item) return null;
  e.atendido = true;
  const cfg = D(game).especial;
  const ouro = Math.round(venda.preco * cfg.bonusOuro);
  game.ganharOuro(ouro);
  game.ganharRep(cfg.bonusRep);
  const r = { ouro, rep: cfg.bonusRep, adv: e.adv };
  game.emit('especialAtendido', r);
  return r;
}

// ---------- sequência de dias e bônus de login ----------
export function registrarDia(game) {
  const hoje = game.state.dia.data;
  const seq = game.state.sequencia;
  let mudou = false;
  if (seq.ultimoDia !== hoje) {
    const gap = seq.ultimoDia ? daysBetween(seq.ultimoDia, hoje) : 1;
    if (gap >= 1) {
      if (gap === 1) seq.dias += 1;
      else if (gap === 2 && perdoDisponivel(game)) { seq.dias += 1; seq.perdao.usados += 1; game.emit('perdao', { dias: seq.dias }); }
      else seq.dias = 1;
      seq.ultimoDia = hoje;
      game.state.diario.bonusColetado = false;
      mudou = true;
    }
  }
  if (game.state.diario.data !== hoje) { gerarDiario(game); mudou = true; }
  const semana = weekKey(game.clock.now());
  if (game.state.semanal.chave !== semana) { gerarSemana(game, semana); mudou = true; }
  if (mudou) game.emit('diario', game.state.diario);
  return mudou;
}

// um perdão por semana: só vale se ainda não foi usado nesta semana
function perdoDisponivel(game) {
  const p = game.state.sequencia.perdao;
  const semana = weekKey(game.clock.now());
  if (p.semana !== semana) { p.semana = semana; p.usados = 0; }
  return p.usados < D(game).perdoPorSemana;
}

export function bonusDoDia(game) {
  const L = D(game).login;
  const dias = Math.max(1, game.state.sequencia.dias);
  const mult = 1 + L.multPorDia * Math.min(dias, L.multMaxDias);
  return { ouro: Math.round((L.ouroBase + L.ouroPorNivel * game.nivel()) * mult), pacote: dias % L.pacoteACada === 0, dias };
}

export function coletarBonus(game) {
  if (game.state.diario.bonusColetado) return { ok: false, motivo: 'ja-coletado' };
  if (game.state.sequencia.ultimoDia !== game.state.dia.data) return { ok: false, motivo: 'sem-registro' };
  const b = bonusDoDia(game);
  const efeitos = [{ tipo: 'ouro', valor: b.ouro }];
  if (b.pacote) {
    const L = D(game).login;
    const regiao = [...game.data.listas.regioes].reverse().find((r) => game.nivel() >= r.nivelRep)?.id ?? 'vila';
    efeitos.push({ tipo: 'materialAleatorio', regiao, qtd: L.pacoteMateriais }, { tipo: 'rep', valor: L.pacoteRep });
  }
  game.state.diario.bonusColetado = true;
  const linhas = aplicarEfeitosEvento(game, efeitos);
  game.emit('bonusDiario', { ...b, linhas });
  return { ok: true, linhas, ...b };
}

// ---------- metas e baú da semana ----------
export function gerarSemana(game, semana = weekKey(game.clock.now())) {
  const rng = createRng(`${semana}:semanal:f${faixaDe(game)}`);
  const cfg = S(game);
  const nivel = nivelDaFaixa(game);
  const metas = rng.shuffle(cfg.metas).slice(0, cfg.quantas).map((m) => ({
    id: m.id, alvo: Math.max(1, Math.round((m.base + m.porNivel * nivel) * rng.between(1 - cfg.variacao, 1 + cfg.variacao))),
  }));
  const base = {};
  for (const m of cfg.metas) base[m.stat] = game.state.stats[m.stat] ?? 0;
  game.state.semanal = { chave: semana, metas, base, bauAberto: false };
}

export const defMeta = (game, id) => S(game).metas.find((m) => m.id === id);
export function progressoMeta(game, meta) {
  const def = defMeta(game, meta.id);
  return Math.max(0, (game.state.stats[def.stat] ?? 0) - (game.state.semanal.base[def.stat] ?? 0));
}
export const metaCumprida = (game, meta) => progressoMeta(game, meta) >= meta.alvo;
export const metasCumpridas = (game) => game.state.semanal.metas.filter((m) => metaCumprida(game, m)).length;
export const textoMeta = (game, meta) => defMeta(game, meta.id).texto.replace('{n}', fmt(meta.alvo));

export function abrirBau(game) {
  const s = game.state.semanal;
  if (s.bauAberto) return { ok: false, motivo: 'ja-aberto' };
  const n = metasCumpridas(game);
  if (n < 1) return { ok: false, motivo: 'sem-metas' };
  const B = S(game).bau;
  const nivel = game.nivel();
  const efeitos = [{ tipo: 'ouro', valor: (B.ouroBase + B.ouroPorNivel * nivel) * n }, { tipo: 'rep', valor: B.repPorMeta * n }];
  if (n >= B.itemComMetas) {
    const cats = game.data.meta.categorias.map((c) => c.id);
    efeitos.push({ tipo: 'itemAleatorio', cat: game.rng.pick(cats), qtd: 2 });
  }
  if (n >= B.materiaisComMetas) {
    const regiao = [...game.data.listas.regioes].reverse().find((r) => nivel >= r.nivelRep)?.id ?? 'vila';
    efeitos.push({ tipo: 'materialAleatorio', regiao, qtd: B.materiais });
  }
  s.bauAberto = true;
  const linhas = aplicarEfeitosEvento(game, efeitos);
  game.emit('bau', { metas: n, linhas });
  return { ok: true, metas: n, linhas };
}

// "tem algo esperando você?" (para o aviso na aba)
export function pendencias(game) {
  const d = game.state.diario;
  return {
    bonus: !d.bonusColetado && game.state.sequencia.ultimoDia === game.state.dia.data,
    encomendas: d.encomendas.filter((e) => podeEntregar(game, e)).length,
    bau: !game.state.semanal.bauAberto && metasCumpridas(game) >= 1,
  };
}
