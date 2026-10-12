// Funcionários em ação: o atendente atende sozinho com o jogo aberto; o vendedor vende o estoque com o jogo fechado.
// Lógica pura (recebe `game`).
import { gerarCliente, melhorOpcao, fecharVenda, dispensar, intervaloChegada } from './shop.js';

// Atendente: a cada `mods.atendente` segundos atende o cliente que mais esperou (se já passou de 30% da paciência).
export function tickEquipe(game, dtMs) {
  const intervalo = game.mods.atendente;
  const rel = game.state.relogioEquipe;
  if (!(intervalo > 0)) { rel.atendente = 0; return; }
  rel.atendente += dtMs;
  if (rel.atendente < intervalo * 1000) return;

  const espera = game.state.fila
    .filter((c) => c.paciencia / c.pacienciaMax < 0.7)
    .sort((a, b) => a.paciencia / a.pacienciaMax - b.paciencia / b.pacienciaMax)[0];
  if (!espera) { rel.atendente = intervalo * 1000; return; }        // fica de prontidão até alguém esperar
  rel.atendente = 0;

  const entrada = melhorOpcao(game, espera);
  if (!entrada) {
    dispensar(game, espera.uid);
    game.emit('atendente', { ok: false, cli: espera });
    return;
  }
  const i = game.state.fila.findIndex((c) => c.uid === espera.uid);
  game.state.fila.splice(i, 1);
  game.emit('fila', game.state.fila);
  const r = fecharVenda(game, espera, entrada, 'justo');
  game.emit('atendente', { ...r, cli: espera });
}

// Vendas com o jogo fechado. Devolve { vendas, perdidas, ouro, rep, horas } (zeros se não há vendedor).
// Cada cliente simulado nasce como no jogo normal, escolhe a melhor oferta a preço justo e compra com a mesma chance.
export function simularOffline(game, ausenteMs) {
  const fracao = game.mods.vendasOffline;
  const vazio = { vendas: 0, perdidas: 0, ouro: 0, rep: 0, horas: 0 };
  if (!(fracao > 0) || !(ausenteMs > 60_000)) return vazio;
  const horas = Math.min(ausenteMs / 3_600_000, game.mods.offlineHoras || 0);
  const media = intervaloChegada(game);
  const n = Math.min(3000, Math.floor((horas * 3_600_000) / media * fracao));

  const ouroAntes = game.state.ouro;
  const repAntes = game.state.rep;
  let vendas = 0;
  let perdidas = 0;
  for (let i = 0; i < n; i++) {
    const cli = gerarCliente(game);
    if (!cli) continue;
    const entrada = melhorOpcao(game, cli);
    if (!entrada) { perdidas += 1; continue; }
    if (fecharVenda(game, cli, entrada, 'justo').ok) vendas += 1;
  }
  return { vendas, perdidas, ouro: game.state.ouro - ouroAntes, rep: game.state.rep - repAntes, horas };
}
