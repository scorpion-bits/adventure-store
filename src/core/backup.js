// Backup do progresso: transforma o save num código de texto (para copiar e colar, ou guardar num arquivo) e lê o código de volta.
// Serve para levar o jogo de um aparelho/navegador para outro ou guardar uma cópia de segurança.
// Formato: `LOJA1-<verificação>-<dados>`. Os dados são o JSON do save comprimido (deflate) em base64 "url-safe";
// a verificação (8 caracteres) pega códigos cortados ou alterados. `LOJA0` é o mesmo sem compressão (navegadores antigos).
import { SAVE_VERSION } from './state.js';
import { normalizar } from './save.js';
import { repNivel } from './economy.js';

const MARCA = /LOJA([01])-([0-9a-f]{8})-([A-Za-z0-9_-]+)/;

export const MENSAGENS = {
  vazio: 'Cole o código do save (ou escolha o arquivo).',
  formato: 'Isso não parece um código de save da Loja do Aventureiro.',
  incompleto: 'O código está incompleto ou foi alterado. Copie de novo, o código inteiro e só ele.',
  navegador: 'Este navegador não consegue abrir esse código. Tente em outro, mais novo.',
  invalido: 'O código não contém um save válido.',
  'versao-nova': 'Esse save é de uma versão mais nova do jogo. Atualize o app e tente de novo.',
};

// FNV-1a de 32 bits em texto hexadecimal
function verificacao(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function paraBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64(texto) {
  const bin = atob(texto.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const temCompressao = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function passar(bytes, transformador) {
  const fluxo = new Blob([bytes]).stream().pipeThrough(transformador);
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

// O código do save atual. `agora` entra como "salvo em" (o estado em memória pode estar uns segundos adiantado do disco).
export async function exportarCodigo(state, agora = Date.now()) {
  const json = JSON.stringify({ ...state, salvoEm: agora });
  const bytes = new TextEncoder().encode(json);
  const comprimir = temCompressao();
  const dados = paraBase64(comprimir ? await passar(bytes, new CompressionStream('deflate-raw')) : bytes);
  return `LOJA${comprimir ? 1 : 0}-${verificacao(dados)}-${dados}`;
}

// Lê um código (ou o JSON cru de um save). Devolve { ok: true, state, resumo } ou { ok: false, motivo } (veja MENSAGENS).
export async function lerCodigo(texto, agora = Date.now()) {
  const entrada = String(texto ?? '').trim();
  if (!entrada) return { ok: false, motivo: 'vazio' };
  let raw;
  try {
    if (entrada.startsWith('{')) {
      raw = JSON.parse(entrada);
    } else {
      // tolera mensagens coladas com texto em volta e quebras de linha no meio do código
      const inicio = entrada.search(/LOJA[01]-/);
      if (inicio < 0) return { ok: false, motivo: 'formato' };
      const m = entrada.slice(inicio).replace(/[\s​-‍﻿]/g, '').match(MARCA);
      if (!m) return { ok: false, motivo: 'formato' };
      const [, tipo, soma, dados] = m;
      if (verificacao(dados) !== soma) return { ok: false, motivo: 'incompleto' };
      let bytes = deBase64(dados);
      if (tipo === '1') {
        if (!temCompressao()) return { ok: false, motivo: 'navegador' };
        bytes = await passar(bytes, new DecompressionStream('deflate-raw'));
      }
      raw = JSON.parse(new TextDecoder().decode(bytes));
    }
  } catch {
    return { ok: false, motivo: 'incompleto' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Number.isFinite(raw.ouro) || !Number.isFinite(raw.rep) || typeof raw.estoque !== 'object') {
    return { ok: false, motivo: 'invalido' };
  }
  if (Number.isFinite(raw.versao) && raw.versao > SAVE_VERSION) return { ok: false, motivo: 'versao-nova' };
  const state = normalizar(raw, agora);
  return { ok: true, state, resumo: resumoDoSave(state) };
}

// o que mostrar ao jogador antes de ele substituir o progresso
export function resumoDoSave(state) {
  return {
    nivel: repNivel(state.rep),
    ouro: Math.floor(state.ouro),
    dias: Math.max(1, Math.floor(((state.salvoEm ?? 0) - (state.criadoEm ?? 0)) / 86400000) + 1),
    salvoEm: state.salvoEm ?? 0,
  };
}
