// Base das janelas em HTML (backup, loja de apoio): estilo, criação de elementos e copiar para a área de transferência.
// São HTML (por cima do jogo) porque o Pixi não tem campo de texto nem "copiar": o jogador precisa colar um código ou copiar uma chave Pix.
import { C, hex } from './theme.js';
import { FONT_BODY, FONT_DISPLAY } from './theme.js';

export const CSS = `
.bk-fundo{position:fixed;inset:0;z-index:50;background:rgba(10,6,4,.78);display:flex;align-items:center;justify-content:center;padding:12px;font-family:${FONT_BODY};}
.bk-caixa{width:min(480px,100%);max-height:100%;overflow:auto;background:${hex(C.panel)};border:2px solid ${hex(C.wood)};border-radius:14px;padding:16px;color:${hex(C.text)};box-shadow:0 12px 40px rgba(0,0,0,.6);}
.bk-topo{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.bk-topo h2{margin:0;font:700 20px ${FONT_DISPLAY};}
.bk-x{background:none;border:0;color:${hex(C.dim)};font-size:26px;line-height:1;padding:4px 10px;cursor:pointer;}
.bk-sec{background:${hex(C.card)};border-radius:12px;padding:12px;margin-top:10px;}
.bk-sec h3{margin:0 0 4px;font:700 15px ${FONT_DISPLAY};color:${hex(C.accent)};}
.bk-sec p{margin:0 0 8px;font-size:13px;line-height:1.35;color:${hex(C.dim)};}
.bk-sec textarea{width:100%;box-sizing:border-box;height:84px;resize:vertical;background:${hex(C.deep)};color:${hex(C.text)};border:1px solid ${hex(C.faint)};border-radius:8px;padding:8px;font:12px ui-monospace,Menlo,Consolas,monospace;word-break:break-all;}
.bk-linha{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}
.bk-b{flex:1 1 130px;min-height:44px;border:0;border-radius:10px;padding:8px 12px;font:700 14px ${FONT_BODY};cursor:pointer;color:${hex(C.bg)};background:${hex(C.accent)};}
.bk-b.bom{background:${hex(C.good)};}
.bk-b.ruim{background:${hex(C.bad)};}
.bk-b.neutro{background:${hex(C.cardHi)};color:${hex(C.text)};border:1px solid ${hex(C.faint)};}
.bk-b:disabled{opacity:.5;cursor:default;}
.bk-msg{min-height:18px;margin-top:8px;font-size:13px;line-height:1.35;}
.bk-msg.erro{color:${hex(C.bad)};}
.bk-msg.ok{color:${hex(C.good)};}
.bk-arquivo{display:none;}
`;

let estilo = null;
export const garantirEstilo = () => {
  if (estilo) return;
  estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
};

export const el = (tag, props = {}, ...filhos) => {
  const e = Object.assign(document.createElement(tag), props);
  for (const f of filhos) e.append(f);
  return e;
};

export async function copiar(texto, areaDeTexto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      areaDeTexto.focus();
      areaDeTexto.select();
      return document.execCommand('copy');
    } catch { return false; }
  }
}
