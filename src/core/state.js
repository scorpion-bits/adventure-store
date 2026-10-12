// Estado do jogo (tudo o que vai para o save). Campo novo = acrescente aqui com um valor padrão:
// `withDefaults` (save.js) preenche o que faltar em saves antigos, então eles nunca quebram.
import { META } from '../data/meta.js';
import { dayKey } from './time.js';

export const SAVE_VERSION = 1;

// dicionários cujos valores são sempre números (quantidades): valores inválidos são descartados ao carregar
export const DICIONARIOS_NUMERICOS = ['estoque', 'materiais'];

export function defaultState(now = Date.now()) {
  return {
    versao: SAVE_VERSION,
    criadoEm: now,
    salvoEm: now,

    ouro: META.inicio.ouro,
    rep: 0,                          // pontos de reputação (o nível vem de repNivel)

    estoque: { ...META.inicio.estoque },   // itens nas prateleiras: { "espada_ferro:1": 3 }
    materiais: {},                   // materiais no depósito: { barra_ferro: 4 }

    fila: [],                        // clientes esperando (veja core/shop.js)
    loja: { proximaChegada: 1500, uid: 0 },   // relógio de chegadas (ms) e contador de clientes
    dia: { data: dayKey(now) },      // dia do calendário em que o jogo estava

    stats: { vendas: 0, recusas: 0, ouroTotal: 0 },
    tutorial: { passo: 0, feito: false },
  };
}
