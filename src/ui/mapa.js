// Cartão de uma região (materiais, clientes e expedições), mostrado numa janela ao tocar a região no mapa-múndi (ui/mundo.js).
// Lógica das expedições em core/expeditions.js.
import { Container, Graphics } from 'pixi.js';
import { C, txt, para, drawCard, makeButton, iconeComNome } from './ui.js';
import { iconSprite } from '../assets.js';
import {
  iniciarExpedicao, coletarExpedicao, custoExpedicao, slotsExpedicao, regiaoAberta, materiaisDaRegiao, unidadesDe, tierDe,
} from '../core/expeditions.js';
import { fmt, fmtTime } from '../format.js';
import { sfx, haptic } from '../audio/sfx.js';

const MOTIVOS = { 'sem-ouro': 'Ouro insuficiente', 'sem-vaga': 'Todos os batedores estão em campo', 'regiao-fechada': 'Região ainda fechada' };

// Cartão de uma região para a janela do mapa. `ctx`: { game, reg, toast, modal, tempos, barras, aoIniciar }
// (`reg` registra botões para os testes; `tempos`/`barras` recebem o progresso da expedição, pintado por pintarMapa).
export function cartaoRegiao(r, w, ctx) {
  const { game, reg, toast, modal, tempos, barras, aoIniciar } = ctx;
  const ativas = game.state.expedicoes;
  const botaoTier = (regiaoId, tier, bw) => {
    const custo = custoExpedicao(game, regiaoId, tier.id);
    const livre = ativas.length < slotsExpedicao(game);
    const pode = livre && game.state.ouro >= custo;
    const b = makeButton(bw, 56, { tint: pode ? C.accent : C.dim, radius: 12, alpha: pode ? 0.16 : 0.05 });
    const t1 = txt(tier.nome, pode ? C.text : C.faint, 13, true);
    t1.position.set((bw - t1.width) / 2, 7);
    const t2 = txt(`${tier.minutos >= 60 ? `${tier.minutos / 60} h` : `${tier.minutos} min`} · ${fmt(unidadesDe(game, tier))} mat.`, C.dim, 10);
    t2.position.set((bw - t2.width) / 2, 25);
    const t3 = txt(`${fmt(custo)} ouro`, pode ? C.gold : C.faint, 12, true);
    t3.position.set((bw - t3.width) / 2, 38);
    b.addChild(t1, t2, t3);
    b.tap(() => {
      const r = iniciarExpedicao(game, regiaoId, tier.id);
      if (r.ok) { sfx.buy(); haptic(8); toast(`Batedores a caminho: ${game.data.regioes[regiaoId].nome}`, C.accent); aoIniciar?.(); }
      else { sfx.deny(); toast(MOTIVOS[r.motivo] ?? 'Não foi possível', C.bad); }
    });
    return b;
  };


  const aberta = regiaoAberta(game, r.id);
  const c = new Container();
  const bg = new Graphics();
  c.addChild(bg);
  let y = 12;                              // o nome da região é o título da janela
  const desc = para(r.desc, C.dim, 12, w - 28);
  desc.position.set(14, y);
  c.addChild(desc);
  y += desc.height + 8;

  if (!aberta) {
    const t = txt(`Abre com reputação ${r.nivelRep}`, C.warn, 12, true);
    t.position.set(14, y);
    c.addChild(t);
    y += t.height + 12;
    drawCard(bg, w, y, { fill: C.card, fillAlpha: 0.6, shadow: false });
    c.alpha = 0.85;
    return { c, h: y };
  }

  // materiais da região
  const mats = materiaisDaRegiao(game, r.id);
  const cell = 34;
  const per = Math.max(1, Math.floor((w - 24) / cell));
  mats.forEach((m, i) => {
    const ic = iconSprite('material', m.id, 28);
    ic.position.set(12 + (i % per) * cell, y + Math.floor(i / per) * cell);
    c.addChild(ic);
  });
  y += Math.ceil(mats.length / per) * cell + 4;
  const clientes = game.data.listas.aventureiros.filter((a) => a.regiao === r.id).length;
  const info = txt(`${mats.length} materiais · ${clientes} tipos de clientes`, C.faint, 11);
  info.position.set(14, y);
  c.addChild(info);
  y += info.height + 8;

  // achados raros que as expedições desta região podem trazer
  const achados = game.data.regioes[r.id]?.drops ?? [];
  if (achados.length) {
    const tit = txt('Achados raros', C.faint, 11);
    tit.position.set(14, y);
    c.addChild(tit);
    y += tit.height + 4;
    achados.forEach((d, i) => {
      const ic = iconeComNome('item', d.item, 28, () => toast(game.data.itens[d.item]?.nome ?? d.item, C.dim), { w: 32, h: 32 });
      ic.position.set(12 + (i % per) * cell, y + Math.floor(i / per) * cell);
      c.addChild(ic);
    });
    y += Math.ceil(achados.length / per) * cell + 4;
  }

  // expedição desta região
  const ativa = ativas.find((e) => e.regiao === r.id);
  if (ativa) {
    const tier = tierDe(game, ativa.tier);
    const volta = ativa.fim <= game.clock.now();
    const t = txt(volta ? 'Os batedores voltaram!' : `Expedição ${tier.nome.toLowerCase()} em andamento`, volta ? C.good : C.accent, 13, true);
    t.position.set(14, y);
    c.addChild(t);
    y += t.height + 6;
    if (volta) {
      const b = makeButton(w - 28, 44, { tint: C.good, radius: 12, alpha: 0.2 });
      const bt = txt('Coletar o que trouxeram', C.text, 14, true);
      bt.position.set((w - 28 - bt.width) / 2, 12);
      b.addChild(bt);
      b.position.set(14, y);
      b.tap(() => {
        const res = coletarExpedicao(game, ativa.uid);
        if (!res.ok) return;
        sfx.levelUp(); haptic(10);
        const total = Object.values(res.materiais).reduce((a, b2) => a + b2, 0);
        toast(`+${fmt(total)} materiais${Object.keys(res.itens).length ? ' e um achado raro!' : ''}`, C.good);
        modal?.open({
          title: `Expedição a ${r.nome}`,
          build: (sc, ww) => {
            const lista = para(res.linhas.join('\n'), C.text, 14, ww);
            sc.add(lista, lista.height);
          },
        });
      });
      c.addChild(b);
      reg(`coletarExp:${ativa.uid}`, b, w - 28, 44);
      y += 44 + 12;
    } else {
      const barra = new Graphics();
      barra.position.set(14, y);
      c.addChild(barra);
      barras.push({ g: barra, w: w - 28, e: ativa });
      const tt = txt('', C.dim, 11);
      tt.position.set(14, y + 10);
      c.addChild(tt);
      tempos.push({ t: tt, e: ativa, x: w - 14 });
      y += 10 + tt.height + 12;
    }
  } else {
    const gap = 6;
    const bw = (w - 28 - gap * 2) / 3;
    game.data.meta.expedicoes.tiers.forEach((tier, i) => {
      const b = botaoTier(r.id, tier, bw);
      b.position.set(14 + i * (bw + gap), y);
      c.addChild(b);
      reg(`exp:${r.id}:${tier.id}`, b, bw, 56);
    });
    y += 56 + 14;
  }
  drawCard(bg, w, y, { fill: C.cardHi, accent: C.accent });
  return { c, h: y };
}


// desenha as barras de progresso e o tempo restante das expedições
export function pintarMapa(game, barras, tempos) {
  const agora = game.clock.now();
  for (const b of barras) {
    const f = Math.max(0, Math.min(1, (agora - b.e.inicio) / (b.e.fim - b.e.inicio)));
    b.g.clear().roundRect(0, 0, b.w, 5, 2.5).fill({ color: 0x000000, alpha: 0.45 });
    if (f > 0) b.g.roundRect(0, 0, Math.max(5, b.w * f), 5, 2.5).fill(C.accent);
  }
  for (const x of tempos) {
    x.t.text = `volta em ${fmtTime((x.e.fim - agora) / 1000)}`;
    x.t.position.x = x.x - x.t.width;
  }
}
