// Melhorias: compram-se uma vez e dão efeitos permanentes (até a próxima "expansão para nova cidade").
// { id, grupo ('loja' ou o id de um ofício), nome, desc, custo, nivelRep (padrão 1), requer: [ids de outras melhorias],
//   efeitos: [{ tipo, valor, oficio? }] }   -> os tipos possíveis estão em core/mods.js (EFEITOS)
// Para uma árvore: cada melhoria "requer" as anteriores. O grupo define em que aba/ofício ela aparece.
export const MELHORIAS_LOJA = [
  // ---- ampliar a loja (mais gente na fila) ----
  { id: 'ampliar_1', grupo: 'loja', nome: 'Ampliar a loja I', desc: 'Mais espaço para os clientes esperarem.', custo: 120, nivelRep: 1,
    efeitos: [{ tipo: 'fila', valor: 1 }] },
  { id: 'ampliar_2', grupo: 'loja', nome: 'Ampliar a loja II', desc: 'Um cômodo novo nos fundos.', custo: 420, nivelRep: 3, requer: ['ampliar_1'],
    efeitos: [{ tipo: 'fila', valor: 1 }] },
  { id: 'ampliar_3', grupo: 'loja', nome: 'Ampliar a loja III', desc: 'Fachada nova: a vizinhança repara.', custo: 1300, nivelRep: 6, requer: ['ampliar_2'],
    efeitos: [{ tipo: 'fila', valor: 1 }, { tipo: 'chegada', valor: 1.1 }] },
  { id: 'ampliar_4', grupo: 'loja', nome: 'Ampliar a loja IV', desc: 'Um salão de verdade.', custo: 3800, nivelRep: 10, requer: ['ampliar_3'],
    efeitos: [{ tipo: 'fila', valor: 2 }] },
  // ---- prateleiras (capacidade do estoque) ----
  { id: 'prateleiras_1', grupo: 'loja', nome: 'Prateleiras novas', desc: 'Mais lugar para expor mercadoria.', custo: 100, nivelRep: 1,
    efeitos: [{ tipo: 'capacidade', valor: 10 }] },
  { id: 'prateleiras_2', grupo: 'loja', nome: 'Estantes de carvalho', desc: 'Madeira boa e firme.', custo: 360, nivelRep: 2, requer: ['prateleiras_1'],
    efeitos: [{ tipo: 'capacidade', valor: 15 }] },
  { id: 'prateleiras_3', grupo: 'loja', nome: 'Vitrines', desc: 'Itens valiosos à vista.', custo: 1000, nivelRep: 5, requer: ['prateleiras_2'],
    efeitos: [{ tipo: 'capacidade', valor: 20 }] },
  { id: 'prateleiras_4', grupo: 'loja', nome: 'Armazém anexo', desc: 'Um depósito atrás do balcão.', custo: 3000, nivelRep: 9, requer: ['prateleiras_3'],
    efeitos: [{ tipo: 'capacidade', valor: 30 }] },
  // ---- balcão ----
  { id: 'balcao_1', grupo: 'loja', nome: 'Balcão polido', desc: 'Atendimento mais agradável: clientes esperam mais.', custo: 200, nivelRep: 1,
    efeitos: [{ tipo: 'paciencia', valor: 1.15 }] },
  { id: 'balcao_2', grupo: 'loja', nome: 'Balcão com vitrine', desc: 'Os itens finos se destacam.', custo: 800, nivelRep: 4, requer: ['balcao_1'],
    efeitos: [{ tipo: 'paciencia', valor: 1.1 }, { tipo: 'preco', valor: 1.03 }] },
  { id: 'balcao_3', grupo: 'loja', nome: 'Balcão de mogno', desc: 'Um balcão digno de lenda.', custo: 2500, nivelRep: 8, requer: ['balcao_2'],
    efeitos: [{ tipo: 'preco', valor: 1.05 }, { tipo: 'repGanho', valor: 1.1 }] },
  // ---- divulgação ----
  { id: 'sino_porta', grupo: 'loja', nome: 'Sino na porta', desc: 'Todo mundo ouve quando alguém entra.', custo: 150, nivelRep: 1,
    efeitos: [{ tipo: 'chegada', valor: 1.1 }] },
  { id: 'cartaz_praca', grupo: 'loja', nome: 'Cartaz na praça', desc: 'Mais aventureiros ficam sabendo da loja.', custo: 500, nivelRep: 3, requer: ['sino_porta'],
    efeitos: [{ tipo: 'chegada', valor: 1.15 }] },
  // ---- expedições ----
  // mais batedores ao mesmo tempo: o segundo chega cedo (a fonte de material que não depende do estoque dos fornecedores)
  { id: 'mapa_regiao', grupo: 'loja', nome: 'Mapa da região', desc: 'Dá para mandar mais um grupo de batedores ao mesmo tempo.', custo: 250, nivelRep: 3,
    efeitos: [{ tipo: 'expedicoes', valor: 1 }] },
  { id: 'guia_batedores', grupo: 'loja', nome: 'Guia de batedores', desc: 'Quem conhece o caminho volta com a mochila mais cheia.', custo: 900, nivelRep: 6, requer: ['mapa_regiao'],
    efeitos: [{ tipo: 'expedicaoRendimento', valor: 1.2 }] },
  { id: 'posto_avancado', grupo: 'loja', nome: 'Posto avançado', desc: 'Um acampamento na estrada: mais um grupo de batedores ao mesmo tempo.', custo: 1600, nivelRep: 9, requer: ['guia_batedores'],
    efeitos: [{ tipo: 'expedicoes', valor: 1 }] },
  { id: 'caravana_propria', grupo: 'loja', nome: 'Caravana própria', desc: 'Mais uma expedição ao mesmo tempo e carga maior.', custo: 7500, nivelRep: 18, requer: ['posto_avancado'],
    efeitos: [{ tipo: 'expedicoes', valor: 1 }, { tipo: 'expedicaoRendimento', valor: 1.15 }] },
  { id: 'fornecedor_fiel', grupo: 'loja', nome: 'Contrato com fornecedores', desc: 'Compras em volume: materiais mais baratos.', custo: 700, nivelRep: 4,
    efeitos: [{ tipo: 'compra', valor: 0.93 }] },
];

// ---------------------------------------------------------------------------------------------------------------------
// Árvores dos 8 ofícios: 4 linhas de 5 degraus + 1 nó final que exige o último degrau das quatro (21 por ofício).
//   Linha A  velocidade    (produz mais rápido)
//   Linha B  qualidade     (mais itens finos e primorosos)
//   Linha C  capacidade    (mais produções ao mesmo tempo e fila maior)
//   Linha D  rendimento    (chance de render uma unidade a mais)
// Cada degrau exige o anterior da mesma linha. Para ajustar o ritmo mexa nas tabelas abaixo; para um ofício novo,
// acrescente uma linha em OFICIOS_ARVORE.
// ---------------------------------------------------------------------------------------------------------------------
const GRAUS = {
  m: ['básico', 'reforçado', 'refinado', 'mestre', 'lendário'],
  f: ['básica', 'reforçada', 'refinada', 'mestra', 'lendária'],
};
const FATOR_CUSTO = [1, 3, 9, 27, 80];           // custo de cada degrau, em múltiplos do custo-base do ofício
const FATOR_LINHA = { vel: 1, qual: 1.2, cap: 1.6, rend: 1.4 };
const VEL = [1.1, 1.12, 1.15, 1.18, 1.2];
const QUAL = [0.03, 0.04, 0.05, 0.06, 0.08];
const REND = [0.05, 0.08, 0.1, 0.12, 0.15];
const CAP = [
  { tipo: 'slots', valor: 1 }, { tipo: 'filaOficina', valor: 1 }, { tipo: 'slots', valor: 1 }, { tipo: 'filaOficina', valor: 2 }, { tipo: 'slots', valor: 1 },
];
const DESC = {
  vel: ['Trabalho mais ágil.', 'Cada movimento rende mais.', 'Sem desperdício de tempo.', 'Mãos que já sabem o caminho.', 'Tão rápido que parece magia.'],
  qual: ['Mais cuidado nos detalhes.', 'Acabamento de quem se importa.', 'Peças que chamam atenção.', 'Obras dignas de vitrine.', 'Cada peça é uma obra-prima.'],
  cap: ['Mais espaço para trabalhar.', 'Dá para deixar encomendas esperando.', 'Mais uma bancada funcionando.', 'A fila de encomendas cresce.', 'Uma oficina que não para.'],
  rend: ['Aproveita melhor o material.', 'Sobras viram peças extras.', 'Quase nada se perde.', 'O material rende mais do que devia.', 'O ofício sem desperdício.'],
};

// [id, nome, custo-base, nível mínimo de reputação, [tema A, gênero], [tema B, gênero], [tema C, gênero], [tema D, gênero], nome do mestre]
const OFICIOS_ARVORE = [
  ['ferraria', 'Ferraria', 150, 1, ['Fornalha', 'f'], ['Martelo', 'm'], ['Bancada', 'f'], ['Molde', 'm'], 'Mestre ferreiro'],
  ['culinaria', 'Culinária', 120, 1, ['Fogão', 'm'], ['Tempero', 'm'], ['Despensa', 'f'], ['Receita', 'f'], 'Mestre cozinheiro'],
  ['alquimia', 'Alquimia', 250, 2, ['Alambique', 'm'], ['Fórmula', 'f'], ['Estante', 'f'], ['Destilação', 'f'], 'Mestre alquimista'],
  ['carpintaria', 'Carpintaria', 350, 3, ['Serra', 'f'], ['Lixa', 'f'], ['Bancada', 'f'], ['Gabarito', 'm'], 'Mestre carpinteiro'],
  ['costura', 'Costura', 500, 4, ['Roca', 'f'], ['Agulha', 'f'], ['Tear', 'm'], ['Molde de corte', 'm'], 'Mestre costureiro'],
  ['encantamento', 'Encantamento', 900, 6, ['Círculo', 'm'], ['Runa', 'f'], ['Altar', 'm'], ['Ressonância', 'f'], 'Mestre encantador'],
  ['joalheria', 'Joalheria', 1300, 8, ['Torno', 'm'], ['Lapidação', 'f'], ['Cofre', 'm'], ['Cinzel', 'm'], 'Mestre joalheiro'],
  ['artefatos', 'Artefatos', 2600, 12, ['Estudo', 'm'], ['Lupa', 'f'], ['Acervo', 'm'], ['Intuição', 'f'], 'Mestre de relíquias'],
];

function arvore([oficio, nomeOficio, custoBase, repMin, ...resto]) {
  const mestre = resto.pop();
  const [temaA, temaB, temaC, temaD] = resto;
  const linhas = [
    ['vel', temaA, (t) => [{ tipo: 'velocidade', oficio, valor: VEL[t] }]],
    ['qual', temaB, (t) => [{ tipo: 'qualidadeOficio', oficio, valor: QUAL[t] }]],
    ['cap', temaC, (t) => [{ ...CAP[t], oficio }]],
    ['rend', temaD, (t) => [{ tipo: 'rendimento', oficio, valor: REND[t] }]],
  ];
  const lista = [];
  for (let t = 0; t < 5; t++) {
    linhas.forEach(([chave, [tema, genero], efeitos], col) => {
      lista.push({
        id: `${oficio}_${chave}${t + 1}`, grupo: oficio, nome: `${tema} ${GRAUS[genero][t]}`, desc: DESC[chave][t],
        custo: Math.round((custoBase * FATOR_CUSTO[t] * FATOR_LINHA[chave]) / 5) * 5, nivelRep: repMin + t * 2 + (col > 1 ? 1 : 0),
        requer: t === 0 ? [] : [`${oficio}_${chave}${t}`], efeitos: efeitos(t),
      });
    });
  }
  lista.push({
    id: `${oficio}_mestre`, grupo: oficio, nome: mestre, desc: `O auge de ${nomeOficio}: exige o último degrau das quatro linhas.`,
    custo: Math.round(custoBase * 200 / 5) * 5, nivelRep: repMin + 11,
    requer: ['vel', 'qual', 'cap', 'rend'].map((c) => `${oficio}_${c}5`),
    efeitos: [{ tipo: 'velocidade', oficio, valor: 1.25 }, { tipo: 'qualidadeOficio', oficio, valor: 0.1 }, { tipo: 'rendimento', oficio, valor: 0.1 }],
  });
  return lista;
}

export const MELHORIAS_OFICIOS = OFICIOS_ARVORE.flatMap(arvore);

export const MELHORIAS = [...MELHORIAS_LOJA, ...MELHORIAS_OFICIOS];
