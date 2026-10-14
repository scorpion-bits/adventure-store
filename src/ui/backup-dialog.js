// Janela do backup do progresso. É feita em HTML (por cima do jogo) porque o Pixi não tem campo de texto: o jogador precisa
// copiar o código, colar o de outro aparelho e escolher um arquivo, o que só um <textarea> e um <input> fazem bem no celular.
import { garantirEstilo, el, copiar } from './dialogo.js';
import { exportarCodigo, lerCodigo, MENSAGENS } from '../core/backup.js';

const dataHora = (ms) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const dataArquivo = () => new Date().toISOString().slice(0, 10);

// `getState`: o estado atual do jogo (para exportar); `onImportar(state)`: troca o progresso pelo importado (e recarrega)
export function abrirBackup({ getState, onImportar, aoFechar }) {
  garantirEstilo();
  const fundo = el('div', { className: 'bk-fundo', role: 'dialog' });
  fundo.setAttribute('aria-label', 'Backup do progresso');
  fundo.dataset.testid = 'backup';
  const caixa = el('div', { className: 'bk-caixa' });
  fundo.append(caixa);

  const fechar = () => {
    document.removeEventListener('keydown', aoTecla, true);
    fundo.remove();
    aoFechar?.();
  };
  const aoTecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
  document.addEventListener('keydown', aoTecla, true);
  fundo.addEventListener('pointerdown', (e) => { if (e.target === fundo) fechar(); });
  // o jogo escuta toques na janela inteira (para liberar o áudio): não precisa saber do que acontece aqui dentro
  fundo.addEventListener('keydown', (e) => e.stopPropagation());

  const x = el('button', { className: 'bk-x', type: 'button', textContent: '×', title: 'Fechar' });
  x.setAttribute('aria-label', 'Fechar');
  x.addEventListener('click', fechar);
  caixa.append(el('div', { className: 'bk-topo' }, el('h2', { textContent: 'Backup do progresso' }), x));

  // ---------- exportar ----------
  const codigoBox = el('textarea', { readOnly: true, value: 'Gerando o código…' });
  codigoBox.dataset.testid = 'backup-codigo';
  codigoBox.setAttribute('aria-label', 'Código do save');
  codigoBox.addEventListener('focus', () => codigoBox.select());
  const bCopiar = el('button', { className: 'bk-b bom', type: 'button', textContent: 'Copiar código', disabled: true });
  bCopiar.dataset.testid = 'backup-copiar';
  const bBaixar = el('button', { className: 'bk-b neutro', type: 'button', textContent: 'Baixar arquivo', disabled: true });
  const msgExp = el('div', { className: 'bk-msg' });
  let codigo = '';
  exportarCodigo(getState(), Date.now()).then((c) => {
    codigo = c;
    codigoBox.value = c;
    bCopiar.disabled = false;
    bBaixar.disabled = false;
  }).catch(() => { codigoBox.value = ''; msgExp.className = 'bk-msg erro'; msgExp.textContent = 'Não foi possível gerar o código neste navegador.'; });
  bCopiar.addEventListener('click', async () => {
    const ok = await copiar(codigo, codigoBox);
    msgExp.className = `bk-msg ${ok ? 'ok' : 'erro'}`;
    msgExp.textContent = ok ? 'Código copiado! Agora cole em "Importar" no outro aparelho.' : 'Não consegui copiar sozinho: segure o texto acima, selecione tudo e copie.';
  });
  bBaixar.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([codigo], { type: 'text/plain' }));
    const a = el('a', { href: url, download: `loja-do-aventureiro-save-${dataArquivo()}.txt` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    msgExp.className = 'bk-msg ok';
    msgExp.textContent = 'Arquivo baixado. No outro aparelho, use "Escolher arquivo" em Importar.';
  });
  caixa.append(el('div', { className: 'bk-sec' },
    el('h3', { textContent: 'Exportar (levar o progresso para outro aparelho)' }),
    el('p', { textContent: 'Copie o código e mande para você mesmo (WhatsApp, e-mail...), ou baixe como arquivo.' }),
    codigoBox,
    el('div', { className: 'bk-linha' }, bCopiar, bBaixar),
    msgExp));

  // ---------- importar ----------
  const entrada = el('textarea', { placeholder: 'Cole aqui o código do save…' });
  entrada.dataset.testid = 'backup-entrada';
  entrada.setAttribute('aria-label', 'Código para importar');
  const arquivo = el('input', { className: 'bk-arquivo', type: 'file', accept: '.txt,.json,text/plain,application/json' });
  const bArquivo = el('button', { className: 'bk-b neutro', type: 'button', textContent: 'Escolher arquivo' });
  const bImportar = el('button', { className: 'bk-b', type: 'button', textContent: 'Importar' });
  bImportar.dataset.testid = 'backup-importar';
  const msgImp = el('div', { className: 'bk-msg' });
  let pronto = null;          // save lido e validado, esperando o "Substituir"

  const voltar = () => { pronto = null; bImportar.textContent = 'Importar'; bImportar.className = 'bk-b'; };
  entrada.addEventListener('input', () => { voltar(); msgImp.textContent = ''; });
  bArquivo.addEventListener('click', () => arquivo.click());
  arquivo.addEventListener('change', async () => {
    const f = arquivo.files?.[0];
    if (!f) return;
    entrada.value = (await f.text()).trim();
    arquivo.value = '';
    voltar();
    bImportar.click();
  });
  bImportar.addEventListener('click', async () => {
    if (pronto) { onImportar(pronto); return; }       // segundo toque: confirma
    const r = await lerCodigo(entrada.value, Date.now());
    if (!r.ok) {
      msgImp.className = 'bk-msg erro';
      msgImp.textContent = MENSAGENS[r.motivo] ?? MENSAGENS.invalido;
      return;
    }
    pronto = r.state;
    const { nivel, ouro, dias, salvoEm } = r.resumo;
    msgImp.className = 'bk-msg ok';
    msgImp.textContent = `Save encontrado: nível ${nivel}, ${ouro.toLocaleString('pt-BR')} de ouro, ${dias} ${dias === 1 ? 'dia' : 'dias'} de jogo (salvo em ${dataHora(salvoEm)}). Importar SUBSTITUI o progresso deste aparelho.`;
    bImportar.textContent = 'Substituir meu progresso';
    bImportar.className = 'bk-b ruim';
  });
  caixa.append(el('div', { className: 'bk-sec' },
    el('h3', { textContent: 'Importar (trazer o progresso de outro aparelho)' }),
    el('p', { textContent: 'Cole o código ou escolha o arquivo do outro aparelho. O jogo mostra o que achou antes de substituir.' }),
    entrada,
    el('div', { className: 'bk-linha' }, bArquivo, bImportar),
    arquivo,
    msgImp));

  document.body.append(fundo);
  bCopiar.focus({ preventScroll: true });
  return { fechar };
}
