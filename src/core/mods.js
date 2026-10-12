// Modificadores: tudo que melhorias, equipe e decoração mudam no jogo. Cada efeito é um objeto { tipo, valor, ... }
// com tipo de EFEITOS; `recalcularMods` refaz game.mods do zero a partir do que o jogador tem (então nunca "acumula erro").
// Para criar um efeito novo: acrescente uma entrada em EFEITOS e use `game.mods.<campo>` onde a regra se aplica.

const pct = (x) => `${Math.round(Math.abs(x - 1) * 100)}%`;
const nomeOficio = (game, id) => game?.data.meta.oficios.find((o) => o.id === id)?.nome ?? id;

export const modsBase = () => ({
  fila: 0,                 // lugares extras na fila de clientes
  capacidade: 0,           // itens extras nas prateleiras
  paciencia: 1,            // multiplica a paciência dos clientes
  chegada: 1,              // multiplica a frequência de chegada
  preco: 1,                // multiplica o ouro das vendas
  repGanho: 1,             // multiplica a reputação ganha em vendas
  compra: 1,               // multiplica o preço dos materiais
  qualidade: 0,            // desloca a chance de qualidade para cima (todos os ofícios)
  qualidadeOficio: {},     // idem, por ofício
  rendimento: {},          // chance de uma produção render 1 unidade a mais, por ofício
  slots: {},               // produções simultâneas extras por ofício
  slotsGlobal: 0,
  velocidadeOficina: {},   // multiplica a velocidade por ofício
  velocidadeOficinaGlobal: 1,
  filaOficina: {},         // lugares extras na fila de cada ofício
  filaOficinaGlobal: 0,
  autoColetar: false,      // produção pronta vai sozinha para as prateleiras
  repetir: false,          // a oficina pode repetir uma receita sozinha
  offlineHoras: 0,         // quanto tempo de vendas offline conta (horas)
  vendasOffline: 0,        // fração da chegada normal de clientes que o vendedor atende com o jogo fechado
  atendente: 0,            // segundos entre atendimentos automáticos (0 = sem atendente)
});

const soma = (m, k, e) => { m[k] += e.valor; };
const mult = (m, k, e) => { m[k] *= e.valor; };
const porOficio = (campo, modo) => (m, e) => {
  m[campo][e.oficio] = modo === 'mult' ? (m[campo][e.oficio] ?? 1) * e.valor : (m[campo][e.oficio] ?? 0) + e.valor;
};

export const EFEITOS = {
  fila: { aplicar: (m, e) => soma(m, 'fila', e), texto: (e) => `+${e.valor} lugar${e.valor > 1 ? 'es' : ''} na fila de clientes` },
  capacidade: { aplicar: (m, e) => soma(m, 'capacidade', e), texto: (e) => `+${e.valor} itens nas prateleiras` },
  paciencia: { aplicar: (m, e) => mult(m, 'paciencia', e), texto: (e) => `Clientes esperam ${pct(e.valor)} mais` },
  chegada: { aplicar: (m, e) => mult(m, 'chegada', e), texto: (e) => `${pct(e.valor)} mais clientes chegando` },
  preco: { aplicar: (m, e) => mult(m, 'preco', e), texto: (e) => `Vendas rendem ${pct(e.valor)} mais ouro` },
  repGanho: { aplicar: (m, e) => mult(m, 'repGanho', e), texto: (e) => `${pct(e.valor)} mais reputação por venda` },
  compra: { aplicar: (m, e) => mult(m, 'compra', e), texto: (e) => `Materiais ${pct(e.valor)} mais baratos` },
  qualidade: { aplicar: (m, e) => soma(m, 'qualidade', e), texto: (e) => `Itens de melhor qualidade (+${Math.round(e.valor * 100)}%)` },
  qualidadeOficio: { aplicar: porOficio('qualidadeOficio', 'soma'), texto: (e, g) => `${nomeOficio(g, e.oficio)}: itens de melhor qualidade (+${Math.round(e.valor * 100)}%)` },
  rendimento: { aplicar: porOficio('rendimento', 'soma'), texto: (e, g) => `${nomeOficio(g, e.oficio)}: ${Math.round(e.valor * 100)}% de chance de render 1 a mais` },
  slots: { aplicar: porOficio('slots', 'soma'), texto: (e, g) => `+${e.valor} produção simultânea em ${nomeOficio(g, e.oficio)}` },
  slotsGlobal: { aplicar: (m, e) => soma(m, 'slotsGlobal', e), texto: (e) => `+${e.valor} produção simultânea em todos os ofícios` },
  velocidade: { aplicar: porOficio('velocidadeOficina', 'mult'), texto: (e, g) => `${nomeOficio(g, e.oficio)} produz ${pct(e.valor)} mais rápido` },
  velocidadeGlobal: { aplicar: (m, e) => mult(m, 'velocidadeOficinaGlobal', e), texto: (e) => `Todos os ofícios produzem ${pct(e.valor)} mais rápido` },
  filaOficina: { aplicar: porOficio('filaOficina', 'soma'), texto: (e, g) => `+${e.valor} na fila de ${nomeOficio(g, e.oficio)}` },
  filaOficinaGlobal: { aplicar: (m, e) => soma(m, 'filaOficinaGlobal', e), texto: (e) => `+${e.valor} na fila de todos os ofícios` },
  autoColetar: { aplicar: (m) => { m.autoColetar = true; }, texto: () => 'Produção pronta vai sozinha para as prateleiras' },
  repetir: { aplicar: (m) => { m.repetir = true; }, texto: () => 'A oficina pode repetir uma receita sozinha' },
  offlineHoras: { aplicar: (m, e) => { m.offlineHoras = Math.max(m.offlineHoras, e.valor); }, texto: (e) => `Vendas com o jogo fechado por até ${e.valor} h` },
  vendasOffline: { aplicar: (m, e) => { m.vendasOffline = Math.max(m.vendasOffline, e.valor); }, texto: (e) => `Atende ${Math.round(e.valor * 100)}% dos clientes com o jogo fechado` },
  atendente: { aplicar: (m, e) => { m.atendente = m.atendente ? Math.min(m.atendente, e.valor) : e.valor; }, texto: (e) => `Atende um cliente que espera a cada ${e.valor} s` },
};

export const descreverEfeito = (e, game) => EFEITOS[e.tipo]?.texto(e, game) ?? e.tipo;

export function aplicarEfeitos(mods, efeitos) {
  for (const e of efeitos ?? []) EFEITOS[e.tipo]?.aplicar(mods, e);
}

// Refaz game.mods a partir do estado: melhorias compradas, nível da equipe e decoração em uso.
export function recalcularMods(game) {
  const m = modsBase();
  const s = game.state;
  for (const [id, tem] of Object.entries(s.melhorias)) {
    if (tem) aplicarEfeitos(m, game.data.melhorias[id]?.efeitos);
  }
  for (const f of game.data.listas.equipe) {
    const nivel = s.equipe[f.id]?.nivel ?? 0;
    if (nivel > 0) aplicarEfeitos(m, f.niveis[nivel - 1]?.efeitos);
  }
  aplicarEfeitos(m, game.data.decoracoes[s.loja.tema]?.efeitos);
  const agora = game.clock.now();
  for (const b of s.bonus ?? []) if (b.ate > agora) aplicarEfeitos(m, [b.efeito]);      // bônus temporários (eventos)
  Object.assign(game.mods, m);        // mantém a mesma referência que o resto do jogo já guarda
  game.emit('mods', game.mods);
  return game.mods;
}
