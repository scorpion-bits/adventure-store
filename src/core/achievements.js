// Conquistas e coleção. As conquistas vêm de data/conquistas.js; aqui ficam as medidas (quanto o jogador já fez),
// o registro do que ele já descobriu (itens e aventureiros) e a entrega dos prêmios.
import { lendaConcluida } from './legends.js';
import { lerChave } from '../data/index.js';

const comuns = (game) => game.data.listas.aventureiros.filter((a) => !a.lendario);
const maior = (obj, f) => Math.max(0, ...Object.values(obj).map(f));
const soma = (xs) => xs.reduce((a, b) => a + b, 0);

// total do conteúdo para as metas "todos"
const TOTAIS = {
  itens: (g) => g.data.listas.itens.length,
  aventureiros: (g) => comuns(g).length,
  oficios: (g) => g.data.meta.oficios.length,
  oficioNivel: (g) => g.data.meta.oficina.nivelMax,
  equipe: (g) => g.data.listas.equipe.length,
  decoracoes: (g) => g.data.listas.decoracoes.length,
  capitulos: (g) => soma(g.data.listas.lendarios.map((l) => l.capitulos.length)),
  eventos: (g) => g.data.listas.eventos.length,
  regioes: (g) => g.data.listas.regioes.length,
};

// quanto o jogador já tem de cada medida
export const MEDIDAS = {
  vendas: (g) => g.state.stats.vendas,
  ouroTotal: (g) => g.state.stats.ouroTotal,
  ouro: (g) => Math.floor(g.state.ouro),
  nivel: (g) => g.nivel(),
  itens: (g) => Object.keys(g.state.colecao.itens).filter((id) => g.data.itens[id]).length,
  aventureiros: (g) => Object.keys(g.state.colecao.aventureiros).filter((id) => g.data.aventureiros[id] && !g.data.aventureiros[id].lendario).length,
  lendasVistas: (g) => Object.keys(g.state.lendarios).filter((id) => g.data.lendarios[id]).length,
  lendasConcluidas: (g) => g.data.listas.lendarios.filter((l) => lendaConcluida(g, l.id)).length,
  capitulos: (g) => g.state.stats.capitulos,
  oficios: (g) => Object.keys(g.state.oficios).length,
  oficioNivel: (g) => maior(g.state.oficios, (o) => o.nivel),
  melhorias: (g) => Object.keys(g.state.melhorias).filter((id) => g.state.melhorias[id]).length,
  equipe: (g) => Object.values(g.state.equipe).filter((e) => e.nivel > 0).length,
  decoracoes: (g) => Object.keys(g.state.decoracoes).filter((id) => g.state.decoracoes[id]).length,
  produzidos: (g) => g.state.stats.produzidos,
  encomendas: (g) => g.state.stats.encomendas,
  expedicoes: (g) => g.state.stats.expedicoes,
  sequencia: (g) => Math.max(g.state.sequencia.dias, g.state.stats.melhorSequencia),
  categoria: (g, arg) => g.state.colecao.categorias[arg] ?? 0,
  classe: (g, arg) => g.state.colecao.classes[arg] ?? 0,
  qualidade: (g) => g.state.stats.qualidadeMax,
  raridade: (g, arg) => g.state.colecao.raridades[arg] ?? 0,
  caros: (g) => g.state.stats.caros,
  baratos: (g) => g.state.stats.baratos,
  maiorVenda: (g) => g.state.stats.maiorVenda,
  eventos: (g) => g.state.stats.eventos,
  comprados: (g) => g.state.stats.comprados,
  regioes: (g) => g.data.listas.regioes.filter((r) => g.nivel() >= r.nivelRep).length,
};

export const metaDe = (game, c) => (c.meta === 'todos' ? Math.max(1, TOTAIS[c.medida](game)) : c.meta);

export function progressoConquista(game, c) {
  const meta = metaDe(game, c);
  const atual = Math.min(meta, MEDIDAS[c.medida](game, c.arg));
  return { atual, meta, feita: !!game.state.conquistas[c.id] || atual >= meta };
}

export const ganha = (game, id) => !!game.state.conquistas[id];
export const totalGanhas = (game) => game.data.listas.conquistas.filter((c) => ganha(game, c.id)).length;

// ---------- coleção ----------
// marca como descobertos os itens que aparecem nas prateleiras e os aventureiros na fila; devolve o que é novo
export function registrarDescobertas(game) {
  const col = game.state.colecao;
  const novos = { itens: [], aventureiros: [] };
  for (const [chave, qtd] of Object.entries(game.state.estoque)) {
    if (!(qtd > 0)) continue;
    const { id } = lerChave(chave);
    if (game.data.itens[id] && col.itens[id] === undefined) { col.itens[id] = 0; novos.itens.push(id); }
  }
  for (const cli of game.state.fila) {
    if (game.data.aventureiros[cli.adv] && col.aventureiros[cli.adv] === undefined) { col.aventureiros[cli.adv] = 0; novos.aventureiros.push(cli.adv); }
  }
  return novos;
}

// conta uma venda: coleção (quantas vezes cada item foi vendido, por categoria, classe e raridade) e recordes
export function registrarVenda(game, v) {
  const col = game.state.colecao;
  const st = game.state.stats;
  const item = game.data.itens[v.item?.id ?? v.item];
  const adv = game.data.aventureiros[v.cli.adv];
  if (item) {
    col.itens[item.id] = (col.itens[item.id] ?? 0) + 1;
    col.categorias[item.cat] = (col.categorias[item.cat] ?? 0) + 1;
    col.raridades[item.raridade] = (col.raridades[item.raridade] ?? 0) + 1;
  }
  if (adv) {
    col.aventureiros[adv.id] = (col.aventureiros[adv.id] ?? 0) + 1;
    col.classes[adv.classe] = (col.classes[adv.classe] ?? 0) + 1;
  }
  if (v.nivelPreco === 'caro') st.caros += 1;
  if (v.nivelPreco === 'barato') st.baratos += 1;
  st.maiorVenda = Math.max(st.maiorVenda, Math.floor(v.preco));
  st.qualidadeMax = Math.max(st.qualidadeMax, v.qualidade ?? 0);
}

// ---------- prêmios ----------
export function verificarConquistas(game) {
  const novas = [];
  game.state.stats.melhorSequencia = Math.max(game.state.stats.melhorSequencia, game.state.sequencia.dias);
  for (const c of game.data.listas.conquistas) {
    if (game.state.conquistas[c.id]) continue;
    const p = progressoConquista(game, c);
    if (!p.feita) continue;
    game.state.conquistas[c.id] = game.clock.now();
    if (c.ouro) game.ganharOuro(c.ouro);
    if (c.rep) game.ganharRep(c.rep);
    novas.push(c);
    game.emit('conquista', c);
  }
  return novas;
}

// liga tudo ao jogo: o que aconteceu vira "para verificar" e a verificação roda uma vez por quadro
export function ligarConquistas(game) {
  let pendente = true;
  const marcar = () => { pendente = true; };
  for (const ev of ['venda', 'producao', 'coletou', 'estoque', 'melhoria', 'equipe', 'decoracao', 'oficio', 'nivelOficio', 'nivel', 'lenda',
    'encomenda', 'expedicaoColetada', 'eventoResolvido', 'compra', 'diario', 'ouro', 'chegou', 'dia']) game.on(ev, marcar);
  game.on('venda', (v) => registrarVenda(game, v));
  game.on('eventoResolvido', () => { game.state.stats.eventos += 1; });
  game.on('estoque', () => registrarDescobertas(game));
  game.on('chegou', () => registrarDescobertas(game));
  registrarDescobertas(game);
  game.conquistasTick = () => { if (!pendente || game.semConquistas) return; pendente = false; verificarConquistas(game); };
}
