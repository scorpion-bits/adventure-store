// "Próximo objetivo": uma sugestão única do que fazer agora, para o jogador não ficar sem rumo. Lógica pura (recebe `game`).
// Candidatos: a próxima compra com ouro (melhoria, ofício, funcionário) e o próximo nível de reputação que abre algo.
// Vence o que está mais perto de ficar pronto (progresso 0..1); se empatar, compra antes de nível e o mais barato primeiro.
import { estadoMelhoria, proximoNivel } from './upgrades.js';
import { oficioAberto } from './craft.js';
import { repParaNivel } from './economy.js';
import { estadoExpansao } from './prestige.js';
import { fmt } from '../format.js';

// Para onde o toque no objetivo leva: aba, sub-aba, ofício (quando a compra está na árvore de um ofício) e o botão exato
// a destacar (o nome registrado na tela, veja `reg(...)` em ui/melhorias.js e ui/oficina.js).
const DESTINO = {
  melhoria: (m) => (m.grupo === 'loja'
    ? { aba: 'melhorias', sub: 'loja', alvo: `comprar:${m.id}` }
    : { aba: 'melhorias', sub: 'oficios', oficio: m.grupo, alvo: `comprar:${m.id}` }),
  oficio: (o) => ({ aba: 'oficina', oficio: o.id, alvo: 'desbloquear' }),
  equipe: (f) => ({ aba: 'melhorias', sub: 'equipe', alvo: `contratar:${f.id}` }),
  expansao: () => ({ aba: 'melhorias', sub: 'expandir', alvo: 'expandir' }),
  nivel: () => ({}),      // reputação não se compra: não há para onde ir (o cartão só explica quanto falta)
};

export function proximoObjetivo(game) {
  const nivel = game.nivel();
  const ouro = game.state.ouro;
  const rep = game.state.rep;
  const compras = [];     // o que se compra só com ouro (a reputação já basta)
  const portoes = [];     // o que espera um nível de reputação: { nivelRep, nome }

  const compra = (tipo, ref, titulo, custo) => compras.push({
    tipo, id: ref.id, titulo, custo,
    detalhe: `${fmt(Math.min(ouro, custo))} / ${fmt(custo)} de ouro`,
    progresso: custo > 0 ? Math.min(1, ouro / custo) : 1,
    pronto: ouro >= custo,
    ...DESTINO[tipo](ref),
  });

  for (const m of game.data.listas.melhorias) {
    const e = estadoMelhoria(game, m);
    if (e.estado === 'disponivel') compra('melhoria', m, `Comprar ${m.nome}`, m.custo);
    else if (e.estado === 'reputacao') portoes.push({ nivelRep: m.nivelRep, nome: m.nome, ordem: 3 });
  }
  for (const o of game.data.meta.oficios) {
    if (oficioAberto(game, o.id)) continue;
    if (nivel >= (o.nivelRep ?? 1)) compra('oficio', o, `Abrir a ${o.nome}`, o.custo ?? 0);
    else portoes.push({ nivelRep: o.nivelRep, nome: o.nome, ordem: 1 });
  }
  for (const f of Object.values(game.data.equipe)) {
    const prox = proximoNivel(game, f.id);
    if (!prox) continue;
    if (nivel >= prox.nivelRep) compra('equipe', f, `${prox.nivel === 1 ? 'Contratar' : 'Promover'} ${f.nome}`, prox.custo);
    else portoes.push({ nivelRep: prox.nivelRep, nome: f.nome, ordem: 2 });
  }
  for (const r of game.data.listas.regioes) {
    if (nivel < r.nivelRep) portoes.push({ nivelRep: r.nivelRep, nome: r.nome, ordem: 0 });
  }

  const candidatos = [...compras];
  // o próximo nível que abre algo (só um candidato de nível: o mais próximo)
  const proximos = portoes.filter((p) => p.nivelRep > nivel);
  if (proximos.length) {
    const alvo = Math.min(...proximos.map((p) => p.nivelRep));
    const nomes = proximos.filter((p) => p.nivelRep === alvo).sort((a, b) => a.ordem - b.ordem).map((p) => p.nome);
    const de = repParaNivel(alvo === nivel + 1 ? nivel : 0);
    const para = repParaNivel(alvo);
    candidatos.push({
      tipo: 'nivel', id: `nivel-${alvo}`, titulo: `Chegar ao nível ${alvo} de reputação`,
      detalhe: `abre ${nomes.slice(0, 2).join(' e ')}${nomes.length > 2 ? ` e mais ${nomes.length - 2}` : ''}`,
      progresso: Math.min(1, Math.max(0, (rep - de) / Math.max(1, para - de))), pronto: false, nivelRep: alvo,
      dica: `Faltam ${fmt(Math.max(1, Math.ceil(para - rep)))} pontos de reputação para o nível ${alvo}. Vendendo você chega lá!`,
      ...DESTINO.nivel(),
    });
  }

  // mais perto de ficar pronto; compra antes de nível; mais barato antes
  candidatos.sort((a, b) => (b.progresso - a.progresso)
    || ((a.tipo === 'nivel') - (b.tipo === 'nivel'))
    || ((a.custo ?? 0) - (b.custo ?? 0)));
  const melhor = candidatos[0] ?? null;

  // a expansão (recomeçar numa cidade nova) só é sugerida quando não há nenhuma compra pronta para fazer
  const exp = estadoExpansao(game);
  if (exp.ok && !melhor?.pronto) {
    return {
      tipo: 'expansao', id: 'expansao', titulo: 'Expandir a loja para uma nova cidade',
      detalhe: `+${fmt(exp.ganho)} de Herança`, progresso: 1, pronto: true, ...DESTINO.expansao(),
    };
  }
  return melhor;
}
