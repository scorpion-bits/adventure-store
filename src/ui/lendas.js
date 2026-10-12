// Janela de capítulo dos lendários: aparece quando um capítulo é concluído (e ao reler um capítulo na aba Aventureiros).
import { Container, Graphics } from 'pixi.js';
import { C, txt, para, labelButton } from './ui.js';
import { sfx } from '../audio/sfx.js';

// Conteúdo de um capítulo (usado pela janela de conclusão e pela releitura)
export function conteudoCapitulo(scroll, w, { def, capitulo, indice, resumo = [], final = false, fechar }) {
  const sub = txt(`Capítulo ${indice + 1} de ${def.capitulos.length} · ${capitulo.titulo}`, C.accent, 13, true);
  scroll.add(sub, sub.height);
  const historia = para(capitulo.texto, C.text, 15, w, { lineHeight: 22 });
  scroll.add(historia, historia.height);
  if (resumo.length) {
    const c = new Container();
    const bg = new Graphics();
    const t0 = txt('Recompensa', C.dim, 12, true);
    t0.position.set(14, 10);
    const linhas = resumo.map((l, i) => {
      const x = txt(`• ${l}`, /^−/.test(l) ? C.bad : C.good, 14, true);
      x.position.set(14, 32 + i * 24);
      return x;
    });
    const h = 32 + 24 * linhas.length + 10;
    bg.roundRect(0, 0, w, h, 12).fill(C.card).stroke({ width: 1, color: 0xffffff, alpha: 0.1 });
    c.addChild(bg, t0, ...linhas);
    scroll.add(c, h);
  }
  if (final) {
    const f = txt('✦ Lenda completa! ✦', C.gold, 16, true);
    scroll.add(f, f.height + 4);
  }
  const ok = labelButton(final ? 'Que história!' : 'Continuar', w, 46, { tint: C.good });
  ok.tap(fechar);
  scroll.add(ok, 46);
  return ok;
}

export function createLendas({ game, modal, toast }) {
  const fila = [];                  // capítulos concluídos esperando para serem mostrados
  let mostrando = false;
  let botao = null;

  game.on('lenda', (l) => { fila.push(l); });
  game.on('chegou', (cli) => {
    if (!cli.lenda) return;
    const nome = game.data.aventureiros[cli.lenda.id].nome;
    sfx.achievement();
    toast(`Uma lenda chegou: ${nome}!`, 0xffd166);
  });
  game.on('lendaErrou', ({ id }) => {
    toast(`${game.data.aventureiros[id].nome} levou outra coisa: a história espera a próxima visita`, 0xe27d6a);
  });

  const abrir = (l) => {
    mostrando = true;
    sfx.levelUp();
    modal.open({
      title: l.def.titulo,
      build: (scroll, w) => {
        botao = conteudoCapitulo(scroll, w, { ...l, fechar: () => { modal.close(true); mostrando = false; } });
      },
    });
  };

  return {
    // chamado a cada quadro: mostra o próximo capítulo quando nenhuma outra janela está aberta
    update() {
      if (mostrando && !modal.isOpen()) mostrando = false;      // o jogador fechou no X
      if (!mostrando && fila.length && !modal.isOpen()) abrir(fila.shift());
    },
    hooks: {
      mostrando: () => mostrando,
      naFila: () => fila.length,
      continuarCentro: () => (botao ? botao.toGlobal({ x: botao.btn.w / 2, y: botao.btn.h / 2 }) : null),
    },
  };
}
