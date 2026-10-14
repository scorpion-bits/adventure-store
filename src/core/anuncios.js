// A oferta "assista a um anúncio e leve a melhoria de graça": de vez em quando uma melhoria que ainda não foi comprada (e que custa
// bastante perto do ouro do jogador) aparece em Melhorias com a opção de ganhá-la assistindo a um anúncio, em vez de pagar em ouro.
// Esta parte é só a regra; quem mostra o anúncio é ui/anuncio-dialog.js. Quem comprou "Sem anúncios" leva a oferta de graça, sem assistir.
import { dayKey } from './time.js';
import { estadoMelhoria, concederMelhoria } from './upgrades.js';

const cfg = (game) => game.data.anuncios.oferta;

// zera a contagem do dia quando o dia vira
function diaAtual(game) {
  const s = game.state.anuncios;
  const hoje = dayKey(game.clock.now());
  if (s.dia !== hoje) { s.dia = hoje; s.hoje = 0; }
  return s;
}

// ms até a próxima oferta poder aparecer (0 = já pode)
export function esperaDaOferta(game) {
  const s = diaAtual(game);
  const c = cfg(game);
  if (s.hoje >= c.maxPorDia) return null;                                    // acabou por hoje
  return Math.max(0, s.ultimo + c.cooldownH * 3600e3 - game.clock.now());
}

// a melhoria oferecida agora (ou null). A escolha fica guardada até ela ser resgatada ou deixar de estar disponível.
export function ofertaAtual(game) {
  const c = cfg(game);
  const s = diaAtual(game);
  if (game.nivel() < c.nivelMin || esperaDaOferta(game) !== 0) return null;
  const atual = game.data.melhorias[s.oferta];
  if (atual && estadoMelhoria(game, atual).estado === 'disponivel') return atual;
  const candidatas = game.data.listas.melhorias.filter((m) => estadoMelhoria(game, m).estado === 'disponivel').sort((a, b) => a.custo - b.custo);
  if (!candidatas.length) { s.oferta = ''; return null; }
  // a mais barata que ainda pesa no bolso; se nenhuma pesa, a mais cara
  const alvo = game.state.ouro * c.fracaoOuro;
  const escolhida = candidatas.find((m) => m.custo >= alvo) ?? candidatas[candidatas.length - 1];
  s.oferta = escolhida.id;
  return escolhida;
}

// o jogador assistiu (ou é apoiador sem anúncios): entrega a melhoria
export function resgatarOferta(game) {
  const m = ofertaAtual(game);
  if (!m) return { ok: false, motivo: 'sem-oferta' };
  const r = concederMelhoria(game, m.id);
  if (!r.ok) return r;
  const s = game.state.anuncios;
  s.ultimo = game.clock.now();
  s.hoje += 1;
  s.oferta = '';
  if (!game.apoio.semAnuncios()) s.vistos += 1;
  game.emit('anuncio', m);
  return { ok: true, melhoria: m };
}
