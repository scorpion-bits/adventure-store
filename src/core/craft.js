// Oficina: ofícios, fila de produção e coleta. A produção usa horários (não contagem de quadros),
// então continua com o jogo fechado: ao abrir, `avancarProducao` termina o que já deu o tempo.
// Lógica pura: as funções recebem `game` (veja game.js).

import { espacoLivre } from './estoque.js';

const O = (game) => game.data.meta.oficina;

// ---------- ofícios ----------
export const oficioAberto = (game, id) => !!game.state.oficios[id];
export const nivelOficio = (game, id) => game.state.oficios[id]?.nivel ?? 0;

export function xpParaNivel(game, n) {
  if (n <= 1) return 0;
  return Math.round(O(game).xpNivel.base * (n - 1) ** O(game).xpNivel.expoente);
}

export function progressoOficio(game, id) {
  const e = game.state.oficios[id];
  if (!e) return 0;
  const max = O(game).nivelMax;
  if (e.nivel >= max) return 1;
  const a = xpParaNivel(game, e.nivel);
  const b = xpParaNivel(game, e.nivel + 1);
  return Math.min(1, Math.max(0, (e.xp - a) / (b - a)));
}

export function desbloquearOficio(game, id) {
  const def = game.data.meta.oficios.find((o) => o.id === id);
  if (!def) return { ok: false, motivo: 'inexistente' };
  if (oficioAberto(game, id)) return { ok: false, motivo: 'ja-aberto' };
  if (game.nivel() < (def.nivelRep ?? 1)) return { ok: false, motivo: 'reputacao' };
  if (!game.gastarOuro(def.custo ?? 0)) return { ok: false, motivo: 'sem-ouro' };
  game.state.oficios[id] = { nivel: 1, xp: 0 };
  game.emit('oficio', { id });
  game.emit('producao');
  return { ok: true };
}

// ---------- capacidade ----------
export const slotsDe = (game, id) => O(game).slotsBase + (game.mods.slots?.[id] ?? 0) + (game.mods.slotsGlobal ?? 0);
export const filaMaxDe = (game, id) => O(game).filaBase + (game.mods.filaOficinaGlobal ?? 0) + (game.mods.filaOficina?.[id] ?? 0);

// duração de uma produção em ms (melhorias podem acelerar)
export function duracaoDe(game, receita) {
  const v = (game.mods.velocidadeOficina?.[receita.oficio] ?? 1) * (game.mods.velocidadeOficinaGlobal ?? 1);
  return Math.max(1000, Math.round((receita.tempo * 1000) / v));
}

export const emProducao = (game, oficio) => game.state.producao.filter((j) => j.oficio === oficio && j.inicio !== null);
export const naFila = (game, oficio) => game.state.producao.filter((j) => j.oficio === oficio && j.inicio === null);

// ---------- produzir ----------
// O que falta para produzir uma receita: { mat: quanto falta }
export function faltando(game, receita) {
  const falta = {};
  for (const [m, q] of Object.entries(receita.materiais)) {
    const tem = game.state.materiais[m] ?? 0;
    if (tem < q) falta[m] = q - tem;
  }
  return falta;
}

export function podeProduzir(game, receitaId) {
  const r = game.data.receitas[receitaId];
  if (!r) return { ok: false, motivo: 'inexistente' };
  if (!oficioAberto(game, r.oficio)) return { ok: false, motivo: 'oficio-fechado' };
  if (nivelOficio(game, r.oficio) < r.nivel) return { ok: false, motivo: 'nivel' };
  const total = emProducao(game, r.oficio).length + naFila(game, r.oficio).length;
  if (total >= slotsDe(game, r.oficio) + filaMaxDe(game, r.oficio)) return { ok: false, motivo: 'fila-cheia' };
  const falta = faltando(game, r);
  if (Object.keys(falta).length) return { ok: false, motivo: 'materiais', falta };
  return { ok: true };
}

// Gasta os materiais e põe a produção no fim da fila (sem começar). Quem chama já conferiu `podeProduzir`.
function enfileirar(game, r) {
  for (const [m, q] of Object.entries(r.materiais)) {
    game.state.materiais[m] -= q;
    if (game.state.materiais[m] <= 0) delete game.state.materiais[m];
  }
  game.state.producaoUid += 1;
  const job = { uid: game.state.producaoUid, receita: r.id, oficio: r.oficio, qtd: r.qtd ?? 1, duracao: duracaoDe(game, r), inicio: null, fim: null };
  game.state.producao.push(job);
  game.emit('materiais', game.state.materiais);
  return job;
}

// Põe uma produção na fila (gasta os materiais agora). Começa já se houver slot livre.
export function produzir(game, receitaId) {
  const chk = podeProduzir(game, receitaId);
  if (!chk.ok) return chk;
  const job = enfileirar(game, game.data.receitas[receitaId]);
  avancarProducao(game);
  game.emit('producao', job);
  return { ok: true, job };
}

// O artesão pode repetir uma receita por ofício: quando uma produção termina, entra outra igual (se houver material e fila).
export function alternarRepetir(game, receitaId) {
  const r = game.data.receitas[receitaId];
  if (!r) return { ok: false, motivo: 'inexistente' };
  if (!game.mods.repetir) return { ok: false, motivo: 'sem-artesao' };
  const atual = game.state.repetir[r.oficio];
  if (atual === receitaId) delete game.state.repetir[r.oficio];
  else game.state.repetir[r.oficio] = receitaId;
  game.emit('producao');
  return { ok: true, ligado: game.state.repetir[r.oficio] === receitaId };
}

// ---------- tempo ----------
export function chancesQualidade(game, nivel) {
  const tabela = O(game).qualidade;
  let p = tabela[0].p;
  for (const t of tabela) if (nivel >= t.nivel) p = t.p;
  const bonus = game.mods.qualidade ?? 0;           // melhorias deslocam chance do pior para o melhor
  if (!bonus) return p;
  const q = [...p];
  for (let i = 0; i < q.length - 1; i++) {
    const mover = Math.min(q[i], bonus);
    q[i] -= mover;
    q[i + 1] += mover;
  }
  return q;
}

function sortearQualidade(game, nivel) {
  const p = chancesQualidade(game, nivel);
  let r = game.rng.next();
  let ultimo = 1;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0) ultimo = i;
    r -= p[i];
    if (r < 0) return i;
  }
  return ultimo;        // sobra de arredondamento: a melhor qualidade possível
}

function concluir(game, job) {
  const receita = game.data.receitas[job.receita];
  const e = game.state.oficios[job.oficio];
  const resultado = {};
  for (let i = 0; i < job.qtd; i++) {
    const q = sortearQualidade(game, e?.nivel ?? 1);
    resultado[q] = (resultado[q] ?? 0) + 1;
  }
  game.state.prontos.push({ uid: job.uid, receita: job.receita, oficio: job.oficio, resultado, fim: job.fim });
  if (e) {
    const antes = e.nivel;
    e.xp += Math.max(5, Math.round((receita?.tempo ?? 0) * O(game).xpPorSegundo)) * job.qtd;
    while (e.nivel < O(game).nivelMax && e.xp >= xpParaNivel(game, e.nivel + 1)) e.nivel += 1;
    if (e.nivel > antes) game.emit('nivelOficio', { id: job.oficio, nivel: e.nivel });
  }
  game.state.stats.produzidos = (game.state.stats.produzidos ?? 0) + job.qtd;
  game.emit('pronto', { job, receita });
}

// Avança a fila até `agora`: termina o que já deu o tempo e começa o próximo no instante em que o slot ficou livre
// (assim o tempo com o jogo fechado conta certinho).
export function avancarProducao(game, agora = game.clock.now()) {
  const s = game.state;
  let mudou = false;
  let guarda = 0;
  for (let achou = true; achou && guarda++ < 1000;) {
    achou = false;
    for (const oficio of new Set(s.producao.map((j) => j.oficio))) {
      const rodando = s.producao.filter((j) => j.oficio === oficio && j.inicio !== null);
      // termina o que acabou (o mais antigo primeiro, para respeitar a ordem do relógio)
      const acabou = rodando.filter((j) => j.fim <= agora).sort((a, b) => a.fim - b.fim)[0];
      if (acabou) {
        s.producao.splice(s.producao.indexOf(acabou), 1);
        concluir(game, acabou);
        mudou = achou = true;
        // repetir: entra outra produção igual no fim da fila (o tempo do slot livre vale a partir de `acabou.fim`)
        const rep = game.mods.repetir ? s.repetir[oficio] : null;
        if (rep && rep === acabou.receita && podeProduzir(game, rep).ok) enfileirar(game, game.data.receitas[rep]);
        // o próximo da fila começa quando este terminou
        const proximo = s.producao.find((j) => j.oficio === oficio && j.inicio === null);
        if (proximo) { proximo.inicio = acabou.fim; proximo.fim = acabou.fim + proximo.duracao; }
        continue;
      }
      // slot livre e ninguém rodando além do limite: começa agora
      if (rodando.length < slotsDe(game, oficio)) {
        const proximo = s.producao.find((j) => j.oficio === oficio && j.inicio === null);
        if (proximo) { proximo.inicio = agora; proximo.fim = agora + proximo.duracao; mudou = achou = true; }
      }
    }
  }
  if (mudou) {
    game.emit('producao');
    if (game.mods.autoColetar) coletar(game);
  }
  return mudou;
}

// ---------- coleta ----------
// Leva o que está pronto para as prateleiras, até onde couber. Sem `uid`, leva tudo.
// O que não coube continua pronto. Devolve { itens: [{ item, qualidade, qtd }], cheio }.
export function coletar(game, uid = null) {
  const s = game.state;
  const levados = [];
  let cheio = false;
  let espaco = espacoLivre(game);
  const resto = [];
  for (const p of s.prontos) {
    if (uid !== null && p.uid !== uid) { resto.push(p); continue; }
    const receita = game.data.receitas[p.receita];
    for (const q of Object.keys(p.resultado)) {
      const quer = p.resultado[q];
      const leva = Math.min(quer, espaco);
      if (leva < quer) cheio = true;
      if (leva > 0) {
        const chave = `${receita.item}:${q}`;
        s.estoque[chave] = (s.estoque[chave] ?? 0) + leva;
        levados.push({ item: receita.item, qualidade: Number(q), qtd: leva });
        espaco -= leva;
      }
      if (quer - leva > 0) p.resultado[q] = quer - leva;
      else delete p.resultado[q];
    }
    if (Object.keys(p.resultado).length) resto.push(p);
  }
  s.prontos = resto;
  if (levados.length) {
    game.emit('estoque', s.estoque);
    game.emit('coletou', levados);
  }
  if (levados.length || cheio) game.emit('producao');
  if (cheio) game.emit('cheio');
  return { itens: levados, cheio };
}

export const totalProntos = (game) => game.state.prontos.reduce((n, p) => n + Object.values(p.resultado).reduce((a, b) => a + b, 0), 0);
