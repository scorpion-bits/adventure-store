// Simulador de balanceamento: joga o jogo inteiro sem interface (só src/core e src/data), com um bot que se comporta como um
// jogador razoável, e mostra como a economia anda ao longo do tempo (ouro, reputação, melhorias, prestígio).
//
// Uso:  npm run sim                              (perfil "regular", 14 dias)
//       npm run sim -- --perfil casual --dias 30
//       npm run sim -- --perfil dedicado --dias 30 --prestigio     (expande de novo toda vez que dá pelo menos 3 de Herança)
//       npm run sim -- --semente 7 --json
// Perfis (sessões por dia x minutos de jogo ativo por sessão): casual 3x5, regular 2x20, dedicado 4x30.
// Fora das sessões o jogo fica "fechado": a oficina e as expedições andam, e o vendedor vende (se contratado).
import { DATA } from '../src/data/index.js';
import { createGame } from '../src/core/game.js';
import { defaultState } from '../src/core/state.js';
import { createRng } from '../src/core/rng.js';
import { createClock } from '../src/core/time.js';
import { avancarProducao, coletar, desbloquearOficio, nivelOficio, oficioAberto, podeProduzir, produzir, duracaoDe } from '../src/core/craft.js';
import { avaliar, melhorOpcao, vender, dispensar, opcoes } from '../src/core/shop.js';
import { simularOffline } from '../src/core/staff.js';
import { comprar, ofertas, fornecedorDisponivel } from '../src/core/market.js';
import { comprarMelhoria, estadoMelhoria, contratar, proximoNivel } from '../src/core/upgrades.js';
import { iniciarExpedicao, coletarExpedicao, prontas, regiaoAberta, custoExpedicao } from '../src/core/expeditions.js';
import { coletarBonus, entregarEncomenda, podeEntregar, abrirBau, metasCumpridas } from '../src/core/daily.js';
import { eventoPendente, escolher } from '../src/core/events.js';
import { estadoExpansao, expandir, comprarHeranca, nivelHeranca, custoHeranca } from '../src/core/prestige.js';
import { verificarConquistas, totalGanhas } from '../src/core/achievements.js';

const PERFIS = {
  casual: { sessoes: 3, minutos: 5 },
  regular: { sessoes: 2, minutos: 20 },
  dedicado: { sessoes: 4, minutos: 30 },
};

// ---------- bot ----------
function precoMaisBarato(game, material) {
  let melhor = null;
  for (const f of game.data.listas.fornecedores) {
    if (!fornecedorDisponivel(game, f)) continue;
    const o = ofertas(game, f).find((x) => x.material === material && x.restante > 0);
    if (o && (!melhor || o.preco < melhor.preco)) melhor = { fornecedor: f.id, preco: o.preco, restante: o.restante };
  }
  return melhor;
}

// compra o que falta para a receita; false se algum material não existe à venda ou falta ouro
function comprarFaltas(game, receita) {
  for (const [m, q] of Object.entries(receita.materiais)) {
    const falta = q - (game.state.materiais[m] ?? 0);
    if (falta <= 0) continue;
    const p = precoMaisBarato(game, m);
    if (!p || p.restante < falta || game.state.ouro < p.preco * falta) return false;
    if (!comprar(game, p.fornecedor, m, falta).ok) return false;
  }
  return true;
}

// contadores do que aconteceu com os clientes (mostrados no fim; ajudam a achar o gargalo)
const diag = { vendas: 0, recusouPreco: 0, semEstoque: 0, substituto: 0, repGanha: 0, repPerdida: 0, repPerdidaRecusa: 0, repPerdidaPaciencia: 0, saiu: 0, fontes: {} };

function atender(game) {
  for (const cli of [...game.state.fila]) {
    const entrada = melhorOpcao(game, cli);
    if (!entrada) { diag.semEstoque += 1; dispensar(game, cli.uid); continue; }
    if (entrada.substituto) diag.substituto += 1;
    // escolhe o preço que rende mais ouro esperado (o jogador sente a "reação" mostrada na tela)
    let melhor = 'justo';
    let valor = -1;
    for (const nivel of ['barato', 'justo', 'caro']) {
      const av = avaliar(game, cli, entrada, nivel);
      // um ponto de reputação vale uns 6 de ouro para o bot; recusar custa a reputação de recusa do temperamento
      const recusa = game.data.meta.temperamentos.find((t) => t.id === game.data.aventureiros[cli.adv].temperamento)?.rep.recusa ?? 0;
      const v = av.chance * (av.preco + av.rep * 6) + (1 - av.chance) * recusa * 6;
      if (v > valor) { valor = v; melhor = nivel; }
    }
    const r = vender(game, cli.uid, entrada.chave, melhor);
    if (r.ok) diag.vendas += 1; else diag.recusouPreco += 1;
  }
}

// o que os clientes da fila estão pedindo agora (item ou categoria): o bot produz primeiro o que falta
function demandaAtual(game) {
  const itens = new Set();
  const cats = new Set();
  for (const cli of game.state.fila) {
    if (cli.pedido?.tipo === 'item') itens.add(cli.pedido.item);
    else if (cli.pedido?.tipo === 'categoria') cats.add(cli.pedido.cat);
    else for (const c of game.data.aventureiros[cli.adv]?.prefere ?? []) cats.add(c);
  }
  return { itens, cats };
}

function produzirTudo(game) {
  const s = game.state;
  const demanda = demandaAtual(game);
  const total = Object.values(s.estoque).reduce((n, q) => n + q, 0);
  const cap = game.data.meta.loja.capacidadeBase + (game.mods.capacidade ?? 0);
  coletar(game);
  for (const of of game.data.meta.oficios) {
    if (!oficioAberto(game, of.id)) continue;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const pend = s.producao.filter((j) => j.oficio === of.id).length;
      if (pend >= 3 + (game.mods.slotsGlobal ?? 0) + (game.mods.slots?.[of.id] ?? 0)) break;
      if (total + s.prontos.length >= cap * 0.9) break;
      const candidatas = game.data.listas.receitas
        .filter((r) => r.oficio === of.id && r.nivel <= nivelOficio(game, of.id))
        .map((r) => {
          const tem = Object.entries(s.estoque).filter(([k]) => k.startsWith(`${r.item}:`)).reduce((n, [, q]) => n + q, 0);
          // só paga pelo que falta: material que já está no depósito (de expedições, por exemplo) sai de graça
          const custo = Object.entries(r.materiais).reduce((n, [m, q]) => {
            const falta = Math.max(0, q - (s.materiais[m] ?? 0));
            return n + falta * (precoMaisBarato(game, m)?.preco ?? (game.data.materiais[m].valor * 1.3));
          }, 0);
          const it = game.data.itens[r.item];
          const ganho = it.valor * (r.qtd ?? 1);
          const bonus = (demanda.itens.has(r.item) ? 4 : demanda.cats.has(it.cat) ? 1.8 : 1) * Math.max(0.1, (5 - tem) / 5);   // variedade: quem já tem estoque vale menos
          return { r, custo, tem, score: ((ganho - custo) / Math.max(10, duracaoDe(game, r))) * bonus };
        })
        .filter((c) => c.tem < 5 && c.score > 0 && c.custo <= s.ouro)
        .sort((a, b) => b.score - a.score);
      const c = candidatas[0];
      if (!c) break;
      if (!comprarFaltas(game, c.r)) { c.r = null; break; }
      if (!podeProduzir(game, c.r.id).ok) break;
      produzir(game, c.r.id);
    }
  }
}

function gastarMelhorias(game) {
  const s = game.state;
  const reserva = Math.min(1500, 40 + s.ouro * 0.08);
  const cands = [];
  for (const o of game.data.meta.oficios) {
    if (!oficioAberto(game, o.id) && game.nivel() >= (o.nivelRep ?? 1)) cands.push({ custo: o.custo, fazer: () => desbloquearOficio(game, o.id) });
  }
  for (const m of game.data.listas.melhorias) {
    if (estadoMelhoria(game, m).estado === 'disponivel') cands.push({ custo: m.custo, fazer: () => comprarMelhoria(game, m.id) });
  }
  for (const f of game.data.listas.equipe) {
    const p = proximoNivel(game, f.id);
    if (p && game.nivel() >= p.nivelRep) cands.push({ custo: p.custo, fazer: () => contratar(game, f.id) });
  }
  cands.sort((a, b) => a.custo - b.custo);
  for (const c of cands) {
    if (s.ouro - c.custo < reserva) break;
    c.fazer();
  }
}

function expedicoes(game) {
  for (const e of prontas(game)) coletarExpedicao(game, e.uid);
  const regioes = game.data.listas.regioes.filter((r) => regiaoAberta(game, r.id));
  const r = regioes[regioes.length - 1];
  if (!r) return;
  const tier = game.data.meta.expedicoes.tiers.find((t) => t.id === 'curta');
  if (game.state.ouro > custoExpedicao(game, r.id, tier.id) * 6) iniciarExpedicao(game, r.id, tier.id);
}

function rotinaDiaria(game) {
  coletarBonus(game);
  game.state.diario.encomendas.forEach((e, i) => { if (podeEntregar(game, e)) entregarEncomenda(game, i); });
  if (metasCumpridas(game) >= 1) abrirBau(game);
}

function eventos(game) {
  while (eventoPendente(game)) {
    const def = eventoPendente(game);
    // primeira escolha que o bot consegue pagar
    const i = def.escolhas.findIndex((e) => !e.custo || game.state.ouro >= e.custo);
    if (!escolher(game, Math.max(0, i)).ok) break;
  }
}

function jogar(game) {
  eventos(game);
  rotinaDiaria(game);
  atender(game);
  produzirTudo(game);
  expedicoes(game);
  gastarMelhorias(game);
}

function gastarHeranca(game) {
  let comprou = true;
  while (comprou) {
    comprou = false;
    const lista = game.data.listas.heranca
      .map((h) => ({ h, custo: custoHeranca(game, h.id) }))
      .filter((x) => x.custo !== null && x.custo <= game.state.prestigio.heranca)
      .sort((a, b) => a.custo - b.custo);
    if (lista[0]) { comprarHeranca(game, lista[0].h.id); comprou = true; }
  }
}

// ---------- simulação ----------
function simular({ perfil, dias, semente, prestigio, passo = 1000 }) {
  for (const k of Object.keys(diag)) diag[k] = typeof diag[k] === 'object' ? {} : 0;
  const T0 = new Date(2026, 7, 4, 8).getTime();           // 4 de agosto de 2026, 8h (sem evento sazonal)
  const clock = createClock(T0);
  const state = defaultState(clock.now());
  state.tutorial.feito = true;
  const game = createGame({ state, clock, rng: createRng(semente) });
  const ganharRepOriginal = game.ganharRep;
  game.ganharRep = (n) => {
    if (n > 0) diag.repGanha += n; else diag.repPerdida += n;
    if (process.env.SIM_TRACE && n < 0) { const f = new Error().stack.split('\n')[2].trim().split(' ')[1]; diag.fontes[f] = (diag.fontes[f] ?? 0) + n; }
    ganharRepOriginal(n);
  };
  game.on('saiu', ({ rep }) => { diag.saiu += 1; diag.repPerdidaPaciencia += rep ?? 0; });
  const marcos = [1 / 24, 4 / 24, 1, 3, 7, 14, 30, 60, 90].filter((d) => d <= dias);
  const linhas = [];
  const cidades = [];
  let proximoMarco = 0;
  let ultimaSessao = clock.now();

  const registrar = (rotulo) => {
    verificarConquistas(game);
    const e = estadoExpansao(game);
    linhas.push({
      quando: rotulo, ouro: Math.floor(state.ouro), ouroTotal: Math.floor(state.stats.ouroTotal), nivel: game.nivel(), vendas: state.stats.vendas,
      melhorias: Object.keys(state.melhorias).length, oficios: Object.keys(state.oficios).length,
      equipe: Object.values(state.equipe).filter((f) => f.nivel > 0).length, herancaPendente: e.ganho ?? 0, cidade: state.prestigio.cidade,
      conquistas: totalGanhas(game),
    });
  };

  const sessaoMs = perfil.minutos * 60_000;
  const intervaloMs = (24 * 3_600_000 - 8 * 3_600_000) / perfil.sessoes;       // sessões espalhadas pelas 16 h acordado
  const fim = T0 + dias * 86_400_000;

  while (clock.now() < fim) {
    const dentroDoDia = (clock.now() - T0) % 86_400_000;
    // começa uma sessão: o jogo estava fechado desde a última
    const ausente = clock.now() - ultimaSessao;
    if (ausente > 60_000) {
      game.tick(0);
      avancarProducao(game);
      simularOffline(game, ausente);
    }
    const inicioSessao = clock.now();
    let proximaAcao = 0;
    for (let t = 0; t < sessaoMs && clock.now() < fim; t += passo) {
      clock.advance(passo);
      game.tick(passo);
      proximaAcao -= passo;
      if (proximaAcao <= 0) { jogar(game); proximaAcao = 4000; }
      while (proximoMarco < marcos.length && clock.now() - T0 >= marcos[proximoMarco] * 86_400_000) {
        const d = marcos[proximoMarco];
        registrar(d < 1 ? `${Math.round(d * 24)} h` : `${d} d`);
        proximoMarco += 1;
      }
      if (prestigio && estadoExpansao(game).ok && estadoExpansao(game).ganho >= 3) {
        cidades.push({ cidade: state.prestigio.cidade, dia: ((clock.now() - T0) / 86_400_000).toFixed(1), ganho: estadoExpansao(game).ganho, nivel: game.nivel() });
        expandir(game);
        gastarHeranca(game);
      }
    }
    if (prestigio) gastarHeranca(game);
    ultimaSessao = clock.now();
    // jogo fechado até a próxima sessão (pula de uma vez; os marcos que caírem aí são registrados na volta)
    const espera = Math.max(60_000, intervaloMs - (clock.now() - inicioSessao));
    clock.advance(Math.min(espera, fim - clock.now()));
    void dentroDoDia;
    while (proximoMarco < marcos.length && clock.now() - T0 >= marcos[proximoMarco] * 86_400_000) {
      game.tick(0);
      avancarProducao(game);
      const d = marcos[proximoMarco];
      registrar(d < 1 ? `${Math.round(d * 24)} h` : `${d} d`);
      proximoMarco += 1;
    }
  }
  registrar(`fim (${dias} d)`);
  return { linhas, cidades, game, diag };
}

// ---------- linha de comando ----------
function arg(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  if (i < 0) return padrao;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const nomePerfil = arg('perfil', 'regular');
  const perfil = PERFIS[nomePerfil];
  if (!perfil) { console.error(`Perfil desconhecido "${nomePerfil}". Use: ${Object.keys(PERFIS).join(', ')}.`); process.exit(1); }
  const dias = Number(arg('dias', 14));
  const semente = Number(arg('semente', 1));
  const prestigio = !!arg('prestigio', false);
  const inicio = Date.now();
  const { linhas, cidades, diag: d } = simular({ perfil, dias, semente, prestigio });
  if (arg('json', false)) {
    console.log(JSON.stringify({ perfil: nomePerfil, dias, semente, linhas, cidades }, null, 2));
  } else {
    console.log(`Perfil ${nomePerfil} (${perfil.sessoes} sessões/dia x ${perfil.minutos} min), ${dias} dias, semente ${semente}${prestigio ? ', com prestígio' : ''}\n`);
    const col = ['quando', 'ouro', 'ouroTotal', 'nivel', 'vendas', 'melhorias', 'oficios', 'equipe', 'conquistas', 'herancaPendente', 'cidade'];
    console.log(col.map((c) => c.padStart(c === 'quando' ? 10 : 11)).join(''));
    for (const l of linhas) console.log(col.map((c) => String(l[c]).padStart(c === 'quando' ? 10 : 11)).join(''));
    if (cidades.length) {
      console.log('\nExpansões:');
      for (const c of cidades) console.log(`  cidade ${c.cidade} -> ${c.cidade + 1} no dia ${c.dia} (reputação ${c.nivel}, +${c.ganho} Herança)`);
    }
    console.log(`\nClientes atendidos pelo bot: ${d.vendas} vendas, ${d.recusouPreco} recusaram o preço, ${d.semEstoque} sem estoque (${d.substituto} com item substituto)`);
    console.log(`Reputação: +${Math.round(d.repGanha)} ganhos, ${Math.round(d.repPerdida)} perdidos (${d.saiu} clientes cansaram de esperar: ${Math.round(d.repPerdidaPaciencia)})`);
    console.log(`\n(simulado em ${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
  }
}

export { simular, PERFIS, DATA, opcoes };
