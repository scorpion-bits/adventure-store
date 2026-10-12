// Janela dos eventos aleatórios: situação + escolhas, e depois o resultado com o resumo do que mudou.
// A janela de evento não pode ser dispensada sem escolher (o evento fica pendente e volta se o jogo for fechado).
import { C, txt, para, labelButton } from './ui.js';
import { Container, Graphics } from 'pixi.js';
import { eventoPendente, escolher } from '../core/events.js';
import { fmt } from '../format.js';
import { sfx } from '../audio/sfx.js';

export function createEventos({ game, modal, toast }) {
  let mostrando = false;
  const refs = {};

  function escolhas(def, w, scroll) {
    const texto = para(def.texto, C.text, 15, w);
    scroll.add(texto, texto.height);
    def.escolhas.forEach((esc, i) => {
      const pode = !esc.custo || game.state.ouro >= esc.custo;
      const h = esc.dica ? 58 : 46;
      const b = labelButton(esc.rotulo, w, h, { tint: pode ? C.accent : C.dim, size: 14 });
      b.label.position.y = esc.dica ? h / 2 - 9 : h / 2;
      if (esc.dica) {
        const d = txt(esc.dica, pode ? C.dim : C.bad, 11);
        d.position.set((w - d.width) / 2, h / 2 + 6);
        b.addChild(d);
      }
      if (!pode) { b.paint({ alpha: 0.05 }); b.label.style.fill = C.faint; }
      b.tap(() => responder(def, i));
      scroll.add(b, h);
      refs[`escolha:${i}`] = { c: b, w, h };
    });
  }

  function resultado(def, r, w, scroll) {
    const t = para(r.texto, C.text, 15, w);
    scroll.add(t, t.height);
    if (r.resumo.length) {
      const c = new Container();
      const bg = new Graphics();
      const linhas = r.resumo.map((l, i) => {
        const bom = !/^−/.test(l);
        const x = txt(`• ${l}`, bom ? C.good : C.bad, 14, true);
        x.position.set(14, 12 + i * 24);
        return x;
      });
      const h = 24 * linhas.length + 20;
      bg.roundRect(0, 0, w, h, 12).fill({ color: C.card, alpha: 1 }).stroke({ width: 1, color: 0xffffff, alpha: 0.1 });
      c.addChild(bg, ...linhas);
      scroll.add(c, h);
    }
    const ok = labelButton('Continuar', w, 46, { tint: C.good });
    ok.tap(() => { modal.close(true); mostrando = false; });
    scroll.add(ok, 46);
    refs.continuar = { c: ok, w, h: 46 };
  }

  function responder(def, i) {
    const r = escolher(game, i);
    if (!r.ok) {
      sfx.deny();
      toast(r.motivo === 'sem-ouro' ? 'Ouro insuficiente para esta escolha' : 'Não foi possível', C.bad);
      return;
    }
    sfx.tap();
    modal.open({ title: def.titulo, fechavel: false, build: (scroll, w) => { for (const k of Object.keys(refs)) delete refs[k]; resultado(def, r, w, scroll); } });
  }

  function abrir() {
    const def = eventoPendente(game);
    if (!def) return;
    mostrando = true;
    sfx.event();
    modal.open({ title: def.titulo, fechavel: false, build: (scroll, w) => { for (const k of Object.keys(refs)) delete refs[k]; escolhas(def, w, scroll); } });
  }

  const global = (ref) => (ref ? ref.c.toGlobal({ x: ref.w / 2, y: ref.h / 2 }) : null);

  return {
    // chamado a cada quadro: abre o evento pendente assim que nenhuma outra janela estiver aberta
    update() {
      if (!mostrando && !modal.isOpen() && eventoPendente(game)) abrir();
    },
    hooks: {
      mostrando: () => mostrando,
      pendente: () => game.state.eventos.pendente?.id ?? null,
      centro: (nome) => global(refs[nome]),
    },
  };
}
