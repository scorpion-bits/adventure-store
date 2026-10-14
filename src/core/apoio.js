// Apoio ao jogo e loja de apoio. A compra é um CÓDIGO assinado pela Scorpion Bits (ECDSA P-256), conferido aqui com a chave pública
// de data/apoio.js: o jogo é estático (sem servidor), então quem paga o Pix recebe um código e o digita. Códigos valem para sempre
// e em qualquer aparelho. Ficam guardados à parte do save (assim "Apagar progresso" e a expansão de cidade não tiram o que foi comprado).
// Como o jogo roda no aparelho do jogador, isto não impede um jogador determinado de burlar; é para quem quer apoiar fazer isso com facilidade.
//
// Formato do código:  LOJAP1-<payload em base64url>.<assinatura em base64url>   payload = {"p":"tema_gelo","n":"pedido-0001"}
import { APOIO } from '../data/apoio.js';

export const CHAVE_ARMAZENAMENTO = 'scorpion-bits-loja-apoio';
const PREFIXO = 'LOJAP1-';

const b64u = {
  codificar: (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''),
  decodificar: (s) => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0)),
};
const enc = new TextEncoder();
const dec = new TextDecoder();

export const MENSAGENS = {
  vazio: 'Cole o código que você recebeu.',
  formato: 'Esse texto não parece um código da loja de apoio. Confira se copiou tudo, do começo ao fim.',
  assinatura: 'Esse código não é válido (a assinatura não confere). Confira se copiou tudo ou peça um novo.',
  produto: 'Esse código é de um produto que este jogo não conhece. Atualize a página e tente de novo.',
  repetido: 'Esse código já está ativo neste aparelho.',
  navegador: 'Este navegador não consegue conferir códigos. Use um navegador mais recente.',
};

// Lê e confere um código. Devolve { ok, produto, pedido } ou { ok: false, motivo }.
export async function conferirCodigo(texto, { chavePublica = APOIO.chavePublica, produtos } = {}) {
  const t = String(texto ?? '').replace(/\s+/g, '');
  if (!t) return { ok: false, motivo: 'vazio' };
  if (!t.startsWith(PREFIXO)) return { ok: false, motivo: 'formato' };
  const [carga, assinatura, resto] = t.slice(PREFIXO.length).split('.');
  if (!carga || !assinatura || resto !== undefined) return { ok: false, motivo: 'formato' };
  let dados;
  let sig;
  let payload;
  try {
    dados = b64u.decodificar(carga);
    sig = b64u.decodificar(assinatura);
    payload = JSON.parse(dec.decode(dados));
  } catch { return { ok: false, motivo: 'formato' }; }
  if (typeof payload?.p !== 'string' || typeof payload?.n !== 'string') return { ok: false, motivo: 'formato' };
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return { ok: false, motivo: 'navegador' };
  let certo = false;
  try {
    const chave = await subtle.importKey('jwk', chavePublica, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    certo = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, chave, sig, dados);
  } catch { return { ok: false, motivo: 'assinatura' }; }
  if (!certo) return { ok: false, motivo: 'assinatura' };
  if (produtos && !produtos[payload.p]) return { ok: false, motivo: 'produto' };
  return { ok: true, produto: payload.p, pedido: payload.n };
}

// Assina um código (usado pelo script do dono e pelos testes; a chave privada nunca entra no jogo)
export async function assinarCodigo(produto, pedido, chavePrivada) {
  const subtle = globalThis.crypto.subtle;
  const dados = enc.encode(JSON.stringify({ p: produto, n: pedido }));
  const chave = await subtle.importKey('jwk', chavePrivada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, dados));
  return `${PREFIXO}${b64u.codificar(dados)}.${b64u.codificar(sig)}`;
}

// O que o jogador tem. `storage`: o localStorage (ou um de mentira nos testes). Códigos guardados são conferidos de novo ao abrir
// (em segundo plano); enquanto isso valem como estão, para o jogo não piscar anúncio.
export function criarApoio({ storage = null, chavePublica = APOIO.chavePublica, produtos = null, definicoes = null } = {}) {
  const catalogo = definicoes ?? Object.fromEntries(APOIO.produtos.map((p) => [p.id, p]));
  const conhecidos = produtos ?? catalogo;
  let codigos = [];          // [{ codigo, produto, pedido }]
  let chave = chavePublica;
  const ouvintes = new Set();
  const avisar = () => { for (const f of ouvintes) f(); };

  const ler = () => {
    try { const r = JSON.parse(storage?.getItem(CHAVE_ARMAZENAMENTO) ?? '[]'); return Array.isArray(r) ? r.filter((c) => c && typeof c.codigo === 'string' && typeof c.produto === 'string') : []; } catch { return []; }
  };
  const gravar = () => { try { storage?.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(codigos)); } catch { /* storage bloqueado */ } };
  codigos = ler();

  // produtos efetivos: os comprados e o que cada pacote inclui
  const efetivos = () => {
    const s = new Set();
    for (const c of codigos) {
      s.add(c.produto);
      for (const i of catalogo[c.produto]?.inclui ?? []) s.add(i);
    }
    return s;
  };

  const api = {
    tem: (id) => efetivos().has(id),
    produtos: () => [...efetivos()],
    codigos: () => codigos.map((c) => ({ ...c })),
    semAnuncios: () => efetivos().has('sem_anuncios'),
    apoiador: () => codigos.length > 0,
    aoMudar(f) { ouvintes.add(f); return () => ouvintes.delete(f); },
    // só para testes e para o dono conferir um código sem estar no jogo
    usarChavePublica(jwk) { chave = jwk; },
    async resgatar(texto) {
      const r = await conferirCodigo(texto, { chavePublica: chave, produtos: conhecidos });
      if (!r.ok) return r;
      if (codigos.some((c) => c.pedido === r.pedido && c.produto === r.produto)) return { ok: false, motivo: 'repetido', produto: r.produto };
      codigos.push({ codigo: String(texto).replace(/\s+/g, ''), produto: r.produto, pedido: r.pedido });
      gravar();
      avisar();
      return { ok: true, produto: r.produto, pedido: r.pedido };
    },
    // confere de novo os códigos guardados e descarta os que não valem mais (chave trocada, texto alterado)
    async reconferir() {
      const bons = [];
      for (const c of codigos) {
        const r = await conferirCodigo(c.codigo, { chavePublica: chave, produtos: conhecidos });
        if (r.ok) bons.push(c);
      }
      if (bons.length !== codigos.length) { codigos = bons; gravar(); avisar(); }
    },
  };
  return api;
}

// um apoio vazio (testes e quando o storage não está disponível)
export const semApoio = () => criarApoio({ storage: null });
