// A loja: clientes chegam, fazem um pedido, o jogador escolhe o item e o preço.
// Lógica pura: todas as funções recebem `game` (veja game.js); sem Pixi.
import { lerChave } from '../data/index.js';
import { precoPedido } from './economy.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const capacidadeFila = (game) => game.data.meta.loja.filaBase + (game.mods.fila ?? 0);
export const adventureiro = (game, cli) => game.data.aventureiros[cli.adv];
// Frases do aventureiro para uma situação (chega, compra, recusa, barato, caro); o que ele não tiver vem do temperamento.
export function falasDe(game, adv, tipo) {
  if (adv.falas?.[tipo]?.length) return adv.falas[tipo];
  return game.data.meta.temperamentos.find((t) => t.id === adv.temperamento)?.falas?.[tipo] ?? [];
}

export const temperamentoDe = (game, cli) => game.data.meta.temperamentos.find((t) => t.id === adventureiro(game, cli)?.temperamento);

// ---------- chegada de clientes ----------

// tempo até a próxima chegada (ms): diminui com a reputação e varia por sorteio
export function intervaloChegada(game) {
  const L = game.data.meta.loja;
  const base = Math.max(L.intervaloMin, L.intervaloBase - L.intervaloPorNivel * (game.nivel() - 1));
  const sorteio = game.rng.between(1 - L.jitter, 1 + L.jitter);
  return Math.max(L.intervaloMin * 0.5, (base * sorteio) / (game.mods.chegada ?? 1));
}

// Itens que este aventureiro pode pedir por nome: das categorias que ele procura, já liberados pela reputação e dentro da
// faixa de valor da região dele (novatos não pedem lendários; heróis não pedem pão). Sem nada na faixa, vale qualquer um liberado.
const itensPedidos = (game, adv) => {
  const nivel = game.nivel();
  const doTipo = game.data.listas.itens.filter((it) => adv.prefere.includes(it.cat) && (it.nivelRep ?? 1) <= nivel);
  const regiao = game.data.regioes[adv.regiao];
  const naFaixa = doTipo.filter((it) => it.valor >= (regiao?.valorMin ?? 0) && it.valor <= (regiao?.valorMax ?? Infinity));
  return naFaixa.length ? naFaixa : doTipo;
};

// Sorteia um aventureiro e o pedido dele. Devolve null se ninguém puder vir (nada a pedir).
export function gerarCliente(game) {
  const nivel = game.nivel();
  const candidatos = game.data.listas.aventureiros.filter((a) => {
    const regiao = game.data.regioes[a.regiao];
    return (a.nivelRep ?? 1) <= nivel && (regiao?.nivelRep ?? 1) <= nivel && itensPedidos(game, a).length > 0;
  });
  const adv = game.rng.weighted(candidatos, (a) => a.peso ?? 1);
  if (!adv) return null;

  const L = game.data.meta.loja;
  const tipo = game.rng.weighted(
    [{ t: 'item', peso: L.pedido.item }, { t: 'categoria', peso: L.pedido.categoria }, { t: 'surpresa', peso: L.pedido.surpresa }],
    (x) => x.peso,
  ).t;
  const pedido = { tipo };
  if (tipo === 'item') pedido.item = game.rng.pick(itensPedidos(game, adv)).id;
  else if (tipo === 'categoria') pedido.cat = game.rng.pick(adv.prefere);

  const temp = game.data.meta.temperamentos.find((t) => t.id === adv.temperamento);
  const espera = L.pacienciaBase * (temp?.paciencia ?? 1) * (game.mods.paciencia ?? 1);
  const falas = falasDe(game, adv, 'chega');
  game.state.loja.uid += 1;
  return {
    uid: game.state.loja.uid, adv: adv.id, pedido,
    paciencia: espera, pacienciaMax: espera,
    fala: falas.length ? game.rng.pick(falas) : '',
  };
}

export function chegar(game) {
  if (game.state.fila.length >= capacidadeFila(game)) return null;
  const cli = gerarCliente(game);
  if (!cli) return null;
  game.state.fila.push(cli);
  game.emit('chegou', cli);
  game.emit('fila', game.state.fila);
  return cli;
}

// ---------- atendimento ----------

export function pedidoTexto(game, cli) {
  const p = cli.pedido;
  if (p.tipo === 'item') return `Procura: ${game.data.itens[p.item]?.nome ?? 'um item'}`;
  if (p.tipo === 'categoria') {
    const c = game.data.meta.categorias.find((x) => x.id === p.cat);
    return `Procura: algo de ${c?.nome ?? p.cat}`;
  }
  return 'Procura: me surpreenda!';
}

// O que há no estoque que serve para este cliente. `substituto` = não é o item pedido, mas é parecido.
export function opcoes(game, cli) {
  const p = cli.pedido;
  const alvo = p.tipo === 'item' ? game.data.itens[p.item] : null;
  const lista = [];
  for (const [chave, qtd] of Object.entries(game.state.estoque)) {
    if (!(qtd > 0)) continue;
    const { id, qualidade } = lerChave(chave);
    const item = game.data.itens[id];
    if (!item) continue;
    let substituto = false;
    if (p.tipo === 'item') {
      if (id !== p.item) {
        if (!alvo || item.cat !== alvo.cat) continue;
        substituto = true;
      }
    } else if (p.tipo === 'categoria' && item.cat !== p.cat) continue;
    lista.push({ chave, item, qualidade, qtd, substituto });
  }
  lista.sort((a, b) => (a.substituto - b.substituto) || a.item.nome.localeCompare(b.item.nome, 'pt-BR') || b.qualidade - a.qualidade);
  return lista;
}

export const REACOES = [
  { min: 0.85, id: 'adora', texto: 'Vai adorar' },
  { min: 0.6, id: 'aceita', texto: 'Deve aceitar' },
  { min: 0.3, id: 'hesita', texto: 'Vai hesitar' },
  { min: 0, id: 'recusa', texto: 'Vai recusar' },
];
export const reacaoDe = (chance) => REACOES.find((r) => chance >= r.min);

// Chance de o cliente comprar `entrada` (uma opção) por um dos três preços.
export function avaliar(game, cli, entrada, nivelPreco) {
  const meta = game.data.meta;
  const adv = adventureiro(game, cli);
  const temp = temperamentoDe(game, cli);
  const L = meta.loja;
  const preco = precoPedido(entrada.item, entrada.qualidade, nivelPreco, game.mods.preco ?? 1);

  let chance = temp.aceita[nivelPreco];
  // o orçamento do cliente é um múltiplo do valor do item (Comum): item fino a preço justo já passa de 1,0
  const relativo = meta.precos[nivelPreco] * (meta.qualidades[entrada.qualidade]?.mult ?? 1);
  if (entrada.substituto) chance *= L.substituto;
  chance *= adv.prefere.includes(entrada.item.cat) ? L.preferido : L.naoPreferido;
  if (relativo > adv.orcamento + 1e-9) chance = Math.min(chance, L.semOrcamento);   // sem dinheiro, nada o convence
  chance = clamp(chance, 0, 0.99);

  return { preco, chance, reacao: reacaoDe(chance), rep: temp.rep[nivelPreco] };
}

const removerCliente = (game, uid) => {
  const i = game.state.fila.findIndex((c) => c.uid === uid);
  if (i < 0) return null;
  const [cli] = game.state.fila.splice(i, 1);
  game.emit('fila', game.state.fila);
  return cli;
};

const tirarDoEstoque = (game, chave) => {
  const q = game.state.estoque[chave] ?? 0;
  if (q <= 1) delete game.state.estoque[chave];
  else game.state.estoque[chave] = q - 1;
  game.emit('estoque', game.state.estoque);
};

const sorteia = (game, lista) => (lista?.length ? game.rng.pick(lista) : '');

// Resolve uma venda já escolhida (o cliente já foi tirado da fila, ou nunca esteve nela: vendas offline e do atendente).
// Sorteia se ele aceita; se sim, tira do estoque e paga; se não, ele sai e a reputação cai.
export function fecharVenda(game, cli, entrada, nivelPreco) {
  const av = avaliar(game, cli, entrada, nivelPreco);
  const adv = adventureiro(game, cli);
  const temp = temperamentoDe(game, cli);

  if (game.rng.chance(av.chance)) {
    tirarDoEstoque(game, entrada.chave);
    game.ganharOuro(av.preco);
    game.state.stats.vendas += 1;
    const rep = av.rep > 0 ? av.rep * (game.mods.repGanho ?? 1) : av.rep;
    game.ganharRep(rep);
    const r = { ok: true, preco: av.preco, rep, fala: sorteia(game, falasDe(game, adv, nivelPreco === 'barato' ? 'barato' : 'compra')), cli, item: entrada.item, qualidade: entrada.qualidade, nivelPreco };
    game.emit('venda', r);
    return r;
  }
  game.state.stats.recusas += 1;
  game.ganharRep(temp.rep.recusa);
  const r = { ok: false, motivo: 'recusou', preco: av.preco, rep: temp.rep.recusa, fala: sorteia(game, falasDe(game, adv, nivelPreco === 'caro' ? 'caro' : 'recusa')), cli, item: entrada.item, nivelPreco };
  game.emit('recusa', r);
  return r;
}

// Tenta vender ao cliente da fila. Devolve { ok, preco, rep, fala, motivo }.
export function vender(game, uid, chave, nivelPreco) {
  const cli = game.state.fila.find((c) => c.uid === uid);
  if (!cli) return { ok: false, motivo: 'cliente-ausente' };
  const entrada = opcoes(game, cli).find((o) => o.chave === chave);
  if (!entrada) return { ok: false, motivo: 'sem-estoque' };
  removerCliente(game, uid);
  return fecharVenda(game, cli, entrada, nivelPreco);
}

// A melhor oferta para um cliente a preço justo: maximiza o ouro esperado (quem não tem nada devolve null).
// Usada pelo atendente e pelas vendas com o jogo fechado.
export function melhorOpcao(game, cli, nivelPreco = 'justo') {
  let melhor = null;
  for (const o of opcoes(game, cli)) {
    const av = avaliar(game, cli, o, nivelPreco);
    const valor = av.chance * av.preco;
    if (!melhor || valor > melhor.valor) melhor = { entrada: o, valor };
  }
  return melhor?.entrada ?? null;
}

// Manda o cliente embora sem oferecer nada (a penalidade é metade da de uma recusa por preço).
export function dispensar(game, uid) {
  const cli = removerCliente(game, uid);
  if (!cli) return null;
  const temp = temperamentoDe(game, cli);
  const rep = Math.trunc((temp?.rep.recusa ?? 0) / 2) || 0;
  game.state.stats.recusas += 1;
  if (rep) game.ganharRep(rep);
  game.emit('dispensou', { cli, rep });
  return { cli, rep };
}

// "Quem atender primeiro": põe o cliente no começo da fila.
export function passarNaFrente(game, uid) {
  const i = game.state.fila.findIndex((c) => c.uid === uid);
  if (i <= 0) return false;
  const [cli] = game.state.fila.splice(i, 1);
  game.state.fila.unshift(cli);
  game.emit('fila', game.state.fila);
  return true;
}

// ---------- passagem do tempo ----------
export function tickLoja(game, dtMs) {
  const s = game.state;

  // paciência: quem espera demais vai embora
  for (let i = s.fila.length - 1; i >= 0; i--) {
    const cli = s.fila[i];
    cli.paciencia -= dtMs;
    if (cli.paciencia <= 0) {
      s.fila.splice(i, 1);
      const temp = temperamentoDe(game, cli);
      s.stats.recusas += 1;
      const rep = temp?.rep.recusa ?? 0;
      if (rep) game.ganharRep(rep);
      game.emit('saiu', { cli, rep });
      game.emit('fila', s.fila);
    }
  }

  // chegadas
  s.loja.proximaChegada -= dtMs;
  if (s.loja.proximaChegada <= 0) {
    chegar(game);
    s.loja.proximaChegada = intervaloChegada(game);
  }
}
