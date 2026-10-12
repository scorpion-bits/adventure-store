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
    loja: { proximaChegada: 1500, uid: 0, tema: 'rustico' },   // relógio de chegadas (ms), contador de clientes, decoração em uso
    melhorias: {},                   // compradas: { id: true }
    equipe: { atendente: { nivel: 0 }, artesao: { nivel: 0 }, vendedor: { nivel: 0 } },   // 0 = não contratado
    decoracoes: { rustico: true },   // decorações compradas
    repetir: {},                     // receita que cada ofício repete sozinho: { ofício: idDaReceita }
    relogioEquipe: { atendente: 0 }, // acumuladores de tempo (ms) da equipe
    dia: { data: dayKey(now) },      // dia do calendário em que o jogo estava

    oficios: { ferraria: { nivel: 1, xp: 0 } },   // ofícios abertos: { id: { nivel, xp } }
    producao: [],                    // fila da oficina: { uid, receita, oficio, qtd, duracao, inicio, fim } (inicio/fim em ms; null enquanto espera)
    prontos: [],                     // produções terminadas esperando coleta: { uid, receita, oficio, resultado: { qualidade: qtd } }
    producaoUid: 0,

    lendarios: {},                   // progresso das lendas: { id: { cap (capítulos concluídos), visita (ms da última chegada) } }
    expedicoes: [],                  // expedições em andamento ou terminadas e não coletadas: { uid, regiao, tier, inicio, fim, custo }
    expedicaoUid: 0,

    eventos: { proximo: META.eventos.primeiroMin, ultimo: {}, pendente: null },   // relógio (ms), quando cada evento foi visto, evento esperando resposta
    bonus: [],                       // efeitos temporários: { rotulo, efeito, ate (ms) }

    mercado: { data: '', comprado: {} },   // compras de hoje por fornecedor: { "fornecedor:material": qtd }

    stats: { vendas: 0, recusas: 0, ouroTotal: 0, comprados: 0 },
    tutorial: { passo: 0, feito: false },
  };
}
