// Destaque de um botão: leva o jogador até ele. Rola a lista até o botão ficar no meio da tela e desenha um anel pulsante
// em volta dele por alguns segundos (como no tutorial). Usado, por exemplo, pelo cartão de objetivo da Loja.
// `telas()`: { idDaAba: hooks da tela }; `rolagens()`: { idDaAba: área rolável }; `conteudo()`: retângulo útil da tela;
// `abaAtual()`: id da aba aberta. O botão é achado pelo nome registrado na tela (`hooks.retangulo(nome)`).
import { Container, Graphics } from 'pixi.js';
import { C } from './ui.js';
import { settings } from '../settings.js';

const DURACAO = 5000;       // ms que o anel fica
const ESPERA_MAX = 1500;    // ms esperando o botão aparecer (a tela pode estar trocando de sub-aba)

export function createDestaque({ telas, rolagens, conteudo, abaAtual }) {
  const root = new Container();
  root.eventMode = 'none';
  const halo = new Graphics();
  root.addChild(halo);
  let alvo = null;           // { aba, nome, t, rolado }
  let relogio = 0;

  const parar = () => { alvo = null; halo.clear(); };

  return {
    root,
    mostrar(aba, nome) { alvo = { aba, nome, t: 0, rolado: false }; },
    parar,
    ativo: () => alvo?.nome ?? null,
    update(dt = 16) {
      halo.clear();
      if (!alvo) return;
      alvo.t += dt;
      if (alvo.t > DURACAO || abaAtual() !== alvo.aba) { parar(); return; }
      const r = telas()[alvo.aba]?.retangulo?.(alvo.nome);
      if (!r) { if (alvo.t > ESPERA_MAX) parar(); return; }
      const area = conteudo();
      const dentro = r.y >= area.y + 4 && r.y + r.h <= area.y + area.h - 4;
      if (!dentro) {
        // rola uma vez até o botão ficar no meio da área visível
        const rolagem = rolagens()[alvo.aba];
        if (rolagem && !alvo.rolado) {
          alvo.rolado = true;
          rolagem.scrollBy(r.y + r.h / 2 - (area.y + area.h / 2));
        }
        return;
      }
      relogio += dt;
      const pulso = settings.motion ? (Math.sin(relogio / 260) + 1) / 2 : 0.5;
      const cresce = 3 + pulso * 4;
      const sumindo = Math.min(1, (DURACAO - alvo.t) / 600);
      halo.roundRect(r.x - cresce, r.y - cresce, r.w + cresce * 2, r.h + cresce * 2, 14)
        .stroke({ width: 3, color: C.gold, alpha: (0.55 + pulso * 0.45) * sumindo });
      halo.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 12).fill({ color: C.gold, alpha: (0.05 + pulso * 0.07) * sumindo });
    },
  };
}
