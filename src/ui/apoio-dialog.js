// Janela "Apoie o jogo": Pix da Scorpion Bits (valor livre), loja de apoio (temas da loja e "sem anúncios") e o campo para ativar
// um código de compra. É HTML (por cima do jogo) porque precisa de campo de texto e de "copiar". A lógica está em core/apoio.js e core/pix.js.
import { C, hex } from './theme.js';
import { FONT_DISPLAY } from './theme.js';
import { garantirEstilo, el, copiar } from './dialogo.js';
import { APOIO } from '../data/apoio.js';
import { DATA } from '../data/index.js';
import { pixCopiaECola, reais } from '../core/pix.js';
import { MENSAGENS } from '../core/apoio.js';

const CSS = `
.ap-lista{display:flex;flex-direction:column;gap:10px;margin-top:8px;}
.ap-prod{background:${hex(C.cardHi)};border-radius:12px;padding:12px;border:1px solid rgba(255,255,255,.08);}
.ap-prod.tem{border-color:${hex(C.good)};}
.ap-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.ap-cab h4{margin:0;font:700 15px ${FONT_DISPLAY};color:${hex(C.text)};}
.ap-cab .ap-preco{font:700 14px ${FONT_DISPLAY};color:${hex(C.gold)};white-space:nowrap;}
.ap-cab .ap-tem{font:700 13px ${FONT_DISPLAY};color:${hex(C.good)};white-space:nowrap;}
.ap-prod p{margin:4px 0 8px;font-size:13px;line-height:1.35;color:${hex(C.dim)};}
.ap-amostra{display:flex;gap:0;margin:6px 0 2px;border-radius:6px;overflow:hidden;width:96px;height:18px;border:1px solid rgba(255,255,255,.25);}
.ap-amostra i{flex:1;display:block;}
.ap-pagar{margin-top:10px;border-top:1px solid rgba(255,255,255,.1);padding-top:10px;}
.ap-pagar ol{margin:0 0 8px;padding-left:20px;font-size:13px;line-height:1.45;color:${hex(C.dim)};}
.ap-pagar a,.bk-sec a{color:${hex(C.accent)};}
.ap-chave{display:flex;align-items:center;gap:8px;background:${hex(C.deep)};border:1px solid ${hex(C.faint)};border-radius:8px;padding:8px 10px;margin:6px 0;font:700 15px ui-monospace,Menlo,Consolas,monospace;color:${hex(C.text)};word-break:break-all;}
.ap-chave small{font:12px ${FONT_DISPLAY};color:${hex(C.dim)};}
.ap-sec textarea{height:64px;}
`;
let estiloApoio = null;
const garantirEstiloApoio = () => {
  garantirEstilo();
  if (estiloApoio) return;
  estiloApoio = document.createElement('style');
  estiloApoio.textContent = CSS;
  document.head.appendChild(estiloApoio);
};

// `game`: o jogo (game.apoio guarda o que foi comprado); `toast(texto, cor)`; `aoMudar()`: avisa que algo foi ativado
export function abrirApoio({ game, toast, aoFechar, aoMudar }) {
  garantirEstiloApoio();
  const apoio = game.apoio;
  const fundo = el('div', { className: 'bk-fundo', role: 'dialog' });
  fundo.setAttribute('aria-label', 'Apoie o jogo');
  fundo.dataset.testid = 'apoio';
  const caixa = el('div', { className: 'bk-caixa' });
  fundo.append(caixa);

  const fechar = () => {
    document.removeEventListener('keydown', aoTecla, true);
    sair();
    fundo.remove();
    aoFechar?.();
  };
  const aoTecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
  document.addEventListener('keydown', aoTecla, true);
  const sair = apoio.aoMudar(() => { digitado = ''; desenhar(); });      // só avisa quando um código foi ativado
  fundo.addEventListener('pointerdown', (e) => { if (e.target === fundo) fechar(); });
  fundo.addEventListener('keydown', (e) => e.stopPropagation());

  const aberto = new Set();            // produtos com o passo a passo do pagamento aberto
  let digitado = '';                   // o que está escrito no campo do código (a janela se redesenha ao abrir um passo a passo)

  // ---------- ativar um código ----------
  function blocoCodigo() {
    const entrada = el('textarea', { placeholder: 'Cole aqui o código que você recebeu (começa com LOJAP1-)…', value: digitado });
    entrada.dataset.testid = 'apoio-codigo';
    entrada.setAttribute('aria-label', 'Código de compra');
    const msg = el('div', { className: 'bk-msg' });
    msg.dataset.testid = 'apoio-msg';
    const b = el('button', { className: 'bk-b bom', type: 'button', textContent: 'Ativar código' });
    b.dataset.testid = 'apoio-ativar';
    b.addEventListener('click', async () => {
      const r = await apoio.resgatar(entrada.value);
      if (!r.ok) {
        msg.className = 'bk-msg erro';
        msg.textContent = MENSAGENS[r.motivo] ?? MENSAGENS.formato;
        return;
      }
      const nome = APOIO.produtos.find((p) => p.id === r.produto)?.nome ?? r.produto;
      entrada.value = '';
      digitado = '';
      toast?.(`${nome} ativado. Obrigado por apoiar!`, C.good);
      game.emit('apoio', r.produto);
      game.emit('decoracao');          // as telas que mostram temas se atualizam
      aoMudar?.();
    });
    entrada.addEventListener('input', () => { digitado = entrada.value; msg.textContent = ''; });
    return el('div', { className: 'bk-sec ap-sec' },
      el('h3', { textContent: 'Já tenho um código' }),
      el('p', { textContent: 'O código vale para sempre e em qualquer aparelho, e não some se você apagar o progresso do jogo.' }),
      entrada, el('div', { className: 'bk-linha' }, b), msg);
  }

  // ---------- Pix de valor livre ----------
  function blocoPix() {
    const { chave, nome, cidade } = APOIO.pix;
    const copiaECola = pixCopiaECola({ chave, nome, cidade });
    const area = el('textarea', { readOnly: true, value: copiaECola, style: 'position:absolute;left:-9999px;top:0;height:1px;' });
    const msg = el('div', { className: 'bk-msg' });
    const mostrar = (ok, texto) => { msg.className = `bk-msg ${ok ? 'ok' : 'erro'}`; msg.textContent = ok ? texto : 'Não consegui copiar sozinho: anote a chave acima e cole no app do seu banco.'; };
    const bChave = el('button', { className: 'bk-b bom', type: 'button', textContent: 'Copiar a chave Pix' });
    bChave.dataset.testid = 'apoio-copiar-chave';
    bChave.addEventListener('click', async () => mostrar(await copiar(chave, area), 'Chave copiada! Abra o app do seu banco, escolha Pix e cole.'));
    const bCola = el('button', { className: 'bk-b neutro', type: 'button', textContent: 'Copiar "copia e cola"' });
    bCola.dataset.testid = 'apoio-copiar-pix';
    bCola.addEventListener('click', async () => mostrar(await copiar(copiaECola, area), 'Código copiado! No app do banco, use "Pix copia e cola" e escolha o valor que quiser.'));
    return el('div', { className: 'bk-sec ap-sec' },
      el('h3', { textContent: 'Apoie com um Pix de qualquer valor' }),
      el('p', { textContent: 'O jogo é grátis e feito com carinho pela Scorpion Bits. Se quiser ajudar a manter e a criar mais, um Pix de qualquer valor já ajuda muito.' }),
      el('div', { className: 'ap-chave' }, el('span', { textContent: chave }), el('small', { textContent: `chave Pix (CNPJ) · ${nome}` })),
      el('div', { className: 'bk-linha' }, bChave, bCola), msg, area);
  }

  // ---------- produtos ----------
  function cartaoProduto(p) {
    const tem = apoio.tem(p.id);
    const c = el('div', { className: `ap-prod${tem ? ' tem' : ''}` });
    c.dataset.testid = `produto-${p.id}`;
    c.append(el('div', { className: 'ap-cab' }, el('h4', { textContent: p.nome }),
      el('span', { className: tem ? 'ap-tem' : 'ap-preco', textContent: tem ? '✓ você tem' : reais(p.preco) })));
    c.append(el('p', { textContent: p.desc }));
    const dec = p.tipo === 'tema' ? DATA.decoracoes[p.decoracao] : null;
    if (dec) {
      const h = (n) => `#${n.toString(16).padStart(6, '0')}`;
      const am = el('div', { className: 'ap-amostra' });
      for (const k of ['parede', 'piso', 'balcao', 'prateleira']) am.append(el('i', { style: `background:${h(dec.cores[k])}` }));
      c.append(am);
    }
    if (p.tipo === 'pacote') {
      c.append(el('p', { textContent: `Inclui: ${p.inclui.map((i) => APOIO.produtos.find((x) => x.id === i)?.nome ?? i).join(', ')}.` }));
    }
    if (tem) return c;
    const aberta = aberto.has(p.id);
    const b = el('button', { className: 'bk-b', type: 'button', textContent: aberta ? 'Fechar' : `Comprar com Pix · ${reais(p.preco)}` });
    b.dataset.testid = `comprar-${p.id}`;
    b.addEventListener('click', () => { if (aberta) aberto.delete(p.id); else aberto.add(p.id); desenhar(); });
    c.append(el('div', { className: 'bk-linha' }, b));
    if (aberta) {
      const cola = pixCopiaECola({ ...APOIO.pix, valor: p.preco, txid: `LOJA${p.id.replace(/_/g, '')}` });
      const area = el('textarea', { readOnly: true, value: cola, style: 'position:absolute;left:-9999px;top:0;height:1px;' });
      const msg = el('div', { className: 'bk-msg' });
      const bCopiar = el('button', { className: 'bk-b bom', type: 'button', textContent: `Copiar Pix de ${reais(p.preco)}` });
      bCopiar.dataset.testid = `pix-${p.id}`;
      bCopiar.addEventListener('click', async () => {
        const ok = await copiar(cola, area);
        msg.className = `bk-msg ${ok ? 'ok' : 'erro'}`;
        msg.textContent = ok ? 'Copiado! Agora é só colar no app do seu banco.' : `Não consegui copiar sozinho. Pague ${reais(p.preco)} para a chave ${APOIO.pix.chave}.`;
      });
      const contato = APOIO.contato
        ? el('span', {}, 'Envie o comprovante para ', el('b', { textContent: APOIO.contato }))
        : el('span', {}, 'Envie o comprovante pelo contato em ', el('a', { href: APOIO.site, target: '_blank', rel: 'noopener', textContent: APOIO.site.replace(/^https?:\/\//, '') }));
      c.append(el('div', { className: 'ap-pagar' },
        el('ol', {},
          el('li', { textContent: `Pague ${reais(p.preco)} por Pix (copie abaixo e cole no app do seu banco).` }),
          el('li', {}, contato, ' informando o produto.'),
          el('li', { textContent: 'Você recebe um código: cole em "Já tenho um código", mais abaixo.' })),
        el('div', { className: 'bk-linha' }, bCopiar), msg, area));
    }
    return c;
  }

  function blocoLoja() {
    const lista = el('div', { className: 'ap-lista' });
    for (const p of APOIO.produtos) lista.append(cartaoProduto(p));
    return el('div', { className: 'bk-sec ap-sec' },
      el('h3', { textContent: 'Loja de apoio' }),
      el('p', { textContent: 'Nada aqui dá vantagem no jogo: são temas de aparência e a opção de tirar os anúncios. Cada compra ajuda a manter o jogo.' }),
      lista);
  }

  function desenhar() {
    const rolagem = caixa.scrollTop;
    caixa.replaceChildren();
    const x = el('button', { className: 'bk-x', type: 'button', textContent: '×', title: 'Fechar' });
    x.setAttribute('aria-label', 'Fechar');
    x.addEventListener('click', fechar);
    caixa.append(el('div', { className: 'bk-topo' }, el('h2', { textContent: apoio.apoiador() ? 'Apoie o jogo ♥ obrigado!' : 'Apoie o jogo' }), x));
    caixa.append(blocoPix(), blocoLoja(), blocoCodigo());
    caixa.scrollTop = rolagem;
  }

  desenhar();
  document.body.append(fundo);
  return { fechar };
}
