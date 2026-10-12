// Conclusão dos capítulos dos lendários: quando o lendário compra o item pedido (com a qualidade mínima) a história avança,
// a recompensa é paga e a interface mostra o capítulo.
import { capituloAtual, progressoLenda, defLenda, qualidadeMinima } from './legends.js';
import { aplicarEfeitosEvento } from './events.js';

// chamado a cada venda (evento 'venda'); só importa se o cliente era um lendário
export function concluirCapitulo(game, venda) {
  const l = venda.cli?.lenda;
  if (!l || !venda.ok) return null;
  const cap = capituloAtual(game, l.id);
  const atual = progressoLenda(game, l.id);
  if (!cap || atual.cap !== l.cap) return null;                       // capítulo já avançou ou mudou
  if (venda.item.id !== cap.pedido.item || venda.qualidade < qualidadeMinima(cap)) {
    game.emit('lendaErrou', { id: l.id, cap });                       // comprou outra coisa: a história espera a próxima visita
    return null;
  }
  const def = defLenda(game, l.id);
  game.state.lendarios[l.id] = { ...atual, cap: atual.cap + 1 };
  game.state.stats.capitulos = (game.state.stats.capitulos ?? 0) + 1;
  const resumo = aplicarEfeitosEvento(game, cap.recompensa);
  const final = game.state.lendarios[l.id].cap >= def.capitulos.length;
  const r = { id: l.id, def, capitulo: cap, indice: atual.cap, resumo, final };
  game.emit('lenda', r);
  return r;
}
