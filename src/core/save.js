// Salvar e carregar. Regras para nunca quebrar um save antigo:
//  - todo campo novo tem padrão em defaultState; `withDefaults` completa o que faltar;
//  - campos desconhecidos (de versões futuras) são preservados;
//  - JSON corrompido não derruba o jogo: o texto é guardado à parte e começa um jogo novo.
import { defaultState, SAVE_VERSION, DICIONARIOS_NUMERICOS } from './state.js';

export const SAVE_KEY = 'scorpion-bits-loja-v1';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Mescla `raw` sobre `defaults`. Objetos que nos padrões são `{}` vazios são dicionários livres
// (estoque, materiais...): ficam como vieram, sem valores nulos; os numéricos (DICIONARIOS_NUMERICOS)
// só guardam números válidos.
export function withDefaults(raw, defaults, caminho = '') {
  if (!isObj(raw)) return structuredClone(defaults);
  const out = { ...raw };
  for (const [key, def] of Object.entries(defaults)) {
    const val = raw[key];
    if (isObj(def)) {
      if (!isObj(val)) out[key] = structuredClone(def);
      else if (!caminho && DICIONARIOS_NUMERICOS.includes(key)) out[key] = limparDicionario(val, true);   // o padrão só vale se o campo não existir
      else if (Object.keys(def).length === 0) out[key] = limparDicionario(val, false);
      else out[key] = withDefaults(val, def, `${caminho}${key}.`);
    } else if (Array.isArray(def)) {
      out[key] = Array.isArray(val) ? val : structuredClone(def);
    } else if (typeof def === 'number') {
      out[key] = Number.isFinite(val) ? val : def;
    } else if (typeof def === 'boolean') {
      out[key] = typeof val === 'boolean' ? val : def;
    } else if (typeof def === 'string') {
      out[key] = typeof val === 'string' ? val : def;
    } else {
      out[key] = val ?? def;
    }
  }
  return out;
}

function limparDicionario(obj, numerico) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (numerico) { if (Number.isFinite(v)) out[k] = v; }
    else if (v !== null && v !== undefined && !(typeof v === 'number' && !Number.isFinite(v))) out[k] = v;
  }
  return out;
}

// Atualiza saves de versões anteriores. Cada degrau faz uma mudança e sobe `versao`.
const MIGRACOES = [
  // { de: 1, para: 2, fn(s) { ... } }
];

export function migrate(state) {
  let s = state;
  let guard = 0;
  while (s.versao < SAVE_VERSION && guard++ < 50) {
    const step = MIGRACOES.find((m) => m.de === s.versao);
    if (!step) break;
    s = step.fn(s) ?? s;
    s.versao = step.para;
  }
  return s;
}

// Dado um save já lido (objeto), migra e completa os campos que faltam. Usado ao carregar e ao importar um backup.
export const normalizar = (raw, now = Date.now()) => withDefaults(migrate({ versao: 1, ...raw }), defaultState(now));

// Lê o save. Devolve { state, origem: 'novo' | 'carregado' | 'corrompido' }.
export function loadState(storage, now = Date.now()) {
  let text = null;
  try { text = storage?.getItem(SAVE_KEY) ?? null; } catch { /* storage bloqueado */ }
  if (text === null) return { state: defaultState(now), origem: 'novo' };
  try {
    const raw = JSON.parse(text);
    if (!isObj(raw)) throw new Error('save não é um objeto');
    const s = normalizar(raw, now);
    return { state: s, origem: 'carregado' };
  } catch {
    try { storage.setItem(`${SAVE_KEY}-corrompido`, text); } catch { /* sem espaço */ }
    return { state: defaultState(now), origem: 'corrompido' };
  }
}

export function saveState(storage, state, now = Date.now()) {
  state.salvoEm = now;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;   // storage bloqueado ou cheio: o jogo segue sem salvar
  }
}

export function clearSave(storage) {
  try { storage.removeItem(SAVE_KEY); } catch { /* ignora */ }
}
