// Janela do anúncio da oferta "assista e leve a melhoria de graça". Se o site definiu `window.scorpionbitsAds.recompensado()`
// (anúncios de terceiros), usa essa função; senão mostra um anúncio da casa (data/anuncios.js) com uma contagem até liberar a recompensa.
// Devolve uma promessa: true se o jogador assistiu até o fim (e deve receber a recompensa), false se desistiu.
import { C, hex } from './theme.js';
import { FONT_DISPLAY } from './theme.js';
import { garantirEstilo, el } from './dialogo.js';

const CSS = `
.an-rotulo{font:700 11px ${FONT_DISPLAY};letter-spacing:.08em;text-transform:uppercase;color:${hex(C.faint)};}
.an-card{background:${hex(C.cardHi)};border-radius:12px;padding:16px;margin-top:8px;border:1px solid rgba(255,255,255,.1);}
.an-card h3{margin:0 0 6px;font:700 20px ${FONT_DISPLAY};color:${hex(C.accent)};}
.an-card p{margin:0 0 12px;font-size:14px;line-height:1.4;color:${hex(C.text)};}
.an-barra{height:8px;background:${hex(C.deep)};border-radius:4px;overflow:hidden;margin-top:12px;}
.an-barra i{display:block;height:100%;width:0;background:${hex(C.accent)};}
.an-tempo{margin-top:6px;font-size:13px;color:${hex(C.dim)};}
`;
let estiloAnuncio = null;

export function assistirAnuncio({ game, toast }) {
  const externo = globalThis.scorpionbitsAds?.recompensado;
  if (typeof externo === 'function') {
    // anúncio de terceiros do site: a função devolve (uma promessa de) true quando o jogador assistiu
    return Promise.resolve().then(() => externo()).then((ok) => !!ok).catch(() => { toast?.('Não consegui carregar o anúncio agora. Tente de novo em instantes.', C.bad); return false; });
  }
  garantirEstilo();
  if (!estiloAnuncio) { estiloAnuncio = document.createElement('style'); estiloAnuncio.textContent = CSS; document.head.appendChild(estiloAnuncio); }
  const casa = game.data.anuncios.casa;
  const anuncio = casa[game.state.anuncios.vistos % casa.length];
  const duracaoMs = game.data.anuncios.oferta.duracaoS * 1000;

  return new Promise((resolve) => {
    const fundo = el('div', { className: 'bk-fundo', role: 'dialog' });
    fundo.setAttribute('aria-label', 'Anúncio');
    fundo.dataset.testid = 'anuncio';
    const caixa = el('div', { className: 'bk-caixa' });
    fundo.append(caixa);
    let feito = false;
    let corrido = 0;
    let ultimo = performance.now();
    const fim = (ok) => {
      if (feito) return;
      feito = true;
      clearInterval(timer);
      document.removeEventListener('keydown', aoTecla, true);
      fundo.remove();
      resolve(ok);
    };
    const aoTecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fim(false); } };
    document.addEventListener('keydown', aoTecla, true);
    fundo.addEventListener('keydown', (e) => e.stopPropagation());

    const x = el('button', { className: 'bk-x', type: 'button', textContent: '×', title: 'Desistir' });
    x.setAttribute('aria-label', 'Desistir');
    x.addEventListener('click', () => fim(false));
    caixa.append(el('div', { className: 'bk-topo' }, el('span', { className: 'an-rotulo', textContent: 'Anúncio' }), x));

    const barra = el('i');
    const tempo = el('div', { className: 'an-tempo' });
    const pegar = el('button', { className: 'bk-b bom', type: 'button', textContent: 'Pegar a recompensa', disabled: true });
    pegar.dataset.testid = 'anuncio-pegar';
    pegar.addEventListener('click', () => fim(true));
    const conhecer = el('a', { className: 'bk-b neutro', href: anuncio.url, target: '_blank', rel: 'noopener', textContent: anuncio.cta, style: 'text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;' });
    caixa.append(el('div', { className: 'an-card' },
      el('h3', { textContent: anuncio.titulo }),
      el('p', { textContent: anuncio.texto }),
      el('div', { className: 'bk-linha' }, conhecer),
      el('div', { className: 'an-barra' }, barra), tempo),
    el('div', { className: 'bk-linha', style: 'margin-top:12px' }, pegar));

    const pintar = () => {
      const f = Math.min(1, corrido / duracaoMs);
      barra.style.width = `${f * 100}%`;
      if (f >= 1) { tempo.textContent = 'Pronto! A recompensa é sua.'; pegar.disabled = false; }
      else tempo.textContent = `Recompensa em ${Math.ceil((duracaoMs - corrido) / 1000)} s`;
    };
    const timer = setInterval(() => {
      const agora = performance.now();
      if (document.visibilityState === 'visible') corrido += agora - ultimo;       // só conta com a página à vista
      ultimo = agora;
      pintar();
      if (corrido >= duracaoMs) clearInterval(timer);
    }, 100);
    pintar();
    document.body.append(fundo);
    pegar.focus({ preventScroll: true });
  });
}
