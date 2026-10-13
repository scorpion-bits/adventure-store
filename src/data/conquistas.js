// Conquistas. Cada uma mede uma coisa do jogo (`medida`, veja MEDIDAS em core/achievements.js), tem uma meta e dá um prêmio.
// { id, nome, desc, medida, arg?, meta (número ou 'todos'), ouro, rep? }
//  - medida: vendas, ouroTotal, ouro, nivel, itens, aventureiros, lendasVistas, lendasConcluidas, oficios, oficioNivel, melhorias,
//    equipe, decoracoes, produzidos, encomendas, expedicoes, capitulos, sequencia, categoria (arg), classe (arg), qualidade,
//    raridade (arg), caros, baratos, maiorVenda, eventos, comprados, regioes
//  - 'todos' vale o total do conteúdo (todos os itens, todas as decorações...), então a conquista acompanha o que você acrescentar
// Para uma conquista nova basta uma linha aqui (ou mais uma entrada nas listas abaixo).
import { META } from './meta.js';

// prêmio em ouro que cresce a cada degrau da série
const premio = (i, base) => Math.round((base * 2.3 ** i) / 5) * 5;

// uma série de metas crescentes da mesma medida: nomes e descrições por degrau
function serie(medida, base, passos, arg) {
  return passos.map(([meta, nome, desc], i) => ({
    id: `${medida}${arg ? `_${arg}` : ''}_${typeof meta === 'number' ? meta : 'todos'}`,
    nome, desc, medida, ...(arg ? { arg } : {}), meta, ouro: premio(i, base),
  }));
}

export const CONQUISTAS = [
  ...serie('vendas', 20, [
    [1, 'Primeira venda', 'Venda algo para um aventureiro.'],
    [10, 'Freguesia fiel', 'Faça 10 vendas.'],
    [50, 'Balcão movimentado', 'Faça 50 vendas.'],
    [100, 'Cem sorrisos', 'Faça 100 vendas.'],
    [250, 'Casa cheia', 'Faça 250 vendas.'],
    [500, 'Meio milhar', 'Faça 500 vendas.'],
    [1000, 'Mil vendas', 'Faça 1.000 vendas.'],
    [2500, 'Instituição da cidade', 'Faça 2.500 vendas.'],
    [5000, 'Lenda do comércio', 'Faça 5.000 vendas.'],
  ]),
  ...serie('ouroTotal', 25, [
    [500, 'Primeiras moedas', 'Ganhe 500 de ouro no total.'],
    [5000, 'Cofre recheado', 'Ganhe 5.000 de ouro no total.'],
    [50000, 'Mercador próspero', 'Ganhe 50.000 de ouro no total.'],
    [500000, 'Magnata local', 'Ganhe 500.000 de ouro no total.'],
    [5000000, 'Rei do ouro', 'Ganhe 5.000.000 de ouro no total.'],
  ]),
  ...serie('ouro', 50, [
    [1000, 'Bolso pesado', 'Tenha 1.000 de ouro de uma vez.'],
    [25000, 'Tesouro guardado', 'Tenha 25.000 de ouro de uma vez.'],
    [1000000, 'Dormindo sobre o ouro', 'Tenha 1.000.000 de ouro de uma vez.'],
  ]),
  ...serie('nivel', 30, [
    [2, 'Nome conhecido', 'Chegue à reputação 2.'],
    [5, 'Loja respeitada', 'Chegue à reputação 5.'],
    [10, 'Parada obrigatória', 'Chegue à reputação 10.'],
    [20, 'Fama regional', 'Chegue à reputação 20.'],
    [30, 'Lendária entre aventureiros', 'Chegue à reputação 30.'],
    [50, 'Mais famosa do reino', 'Chegue à reputação 50.'],
  ]),
  ...serie('itens', 30, [
    [10, 'Curioso', 'Descubra 10 itens.'],
    [25, 'Colecionador', 'Descubra 25 itens.'],
    [50, 'Catálogo crescendo', 'Descubra 50 itens.'],
    [80, 'Enciclopédia ambulante', 'Descubra 80 itens.'],
    ['todos', 'Nada me escapa', 'Descubra todos os itens.'],
  ]),
  ...serie('aventureiros', 30, [
    [5, 'Rostos novos', 'Receba 5 tipos de aventureiro.'],
    [15, 'Casa de todos', 'Receba 15 tipos de aventureiro.'],
    [30, 'Taverna da cidade', 'Receba 30 tipos de aventureiro.'],
    [70, 'Cidade em festa', 'Receba 70 tipos de aventureiro.'],
    [110, 'Todos os reinos aqui', 'Receba 110 tipos de aventureiro.'],
    ['todos', 'Conheço todo mundo', 'Receba todos os tipos de aventureiro.'],
  ]),
  ...serie('lendasVistas', 60, [
    [1, 'Uma lenda entra', 'Receba um aventureiro lendário.'],
    [5, 'Ouvinte de histórias', 'Receba 5 aventureiros lendários.'],
    [10, 'Galeria de heróis', 'Receba os 10 aventureiros lendários.'],
  ]),
  ...serie('lendasConcluidas', 120, [
    [1, 'Fim de uma história', 'Conclua a história de uma lenda.'],
    [5, 'Contador de histórias', 'Conclua 5 histórias de lendas.'],
    [10, 'Cronista do reino', 'Conclua as 10 histórias de lendas.'],
  ]),
  ...serie('capitulos', 25, [
    [1, 'Primeiro capítulo', 'Conclua um capítulo de lenda.'],
    [10, 'Leitor atento', 'Conclua 10 capítulos de lendas.'],
    ['todos', 'Todos os capítulos', 'Conclua todos os capítulos de todas as lendas.'],
  ]),
  ...serie('oficios', 60, [
    [2, 'Duas mãos, dois ofícios', 'Abra 2 ofícios.'],
    [4, 'Oficina completa', 'Abra 4 ofícios.'],
    [6, 'Mestre de vários ofícios', 'Abra 6 ofícios.'],
    ['todos', 'Todos os ofícios', 'Abra todos os ofícios.'],
  ]),
  ...serie('oficioNivel', 40, [
    [3, 'Aprendiz firme', 'Leve um ofício ao nível 3.'],
    [6, 'Artesão experiente', 'Leve um ofício ao nível 6.'],
    ['todos', 'Mestre artesão', 'Leve um ofício ao nível máximo.'],
  ]),
  ...serie('melhorias', 35, [
    [5, 'Reformas', 'Compre 5 melhorias.'],
    [15, 'Loja em obras', 'Compre 15 melhorias.'],
    [30, 'Ninguém reconhece a loja', 'Compre 30 melhorias.'],
    [60, 'Obra-prima', 'Compre 60 melhorias.'],
  ]),
  ...serie('equipe', 80, [
    [1, 'Primeiro funcionário', 'Contrate um funcionário.'],
    [2, 'Equipe pequena', 'Contrate 2 funcionários.'],
    ['todos', 'Equipe completa', 'Contrate todos os tipos de funcionário.'],
  ]),
  ...serie('decoracoes', 50, [
    [2, 'Um toque pessoal', 'Tenha 2 decorações.'],
    [4, 'Casa bonita', 'Tenha 4 decorações.'],
    ['todos', 'Decorador de mão cheia', 'Tenha todas as decorações.'],
  ]),
  ...serie('produzidos', 25, [
    [10, 'Mãos à obra', 'Produza 10 itens.'],
    [50, 'Linha de produção', 'Produza 50 itens.'],
    [200, 'Oficina barulhenta', 'Produza 200 itens.'],
    [1000, 'Fábrica de maravilhas', 'Produza 1.000 itens.'],
  ]),
  ...serie('encomendas', 40, [
    [1, 'Cliente especial', 'Entregue uma encomenda do dia.'],
    [10, 'Entrega em dia', 'Entregue 10 encomendas.'],
    [50, 'Correio de confiança', 'Entregue 50 encomendas.'],
  ]),
  ...serie('expedicoes', 40, [
    [1, 'Primeira expedição', 'Envie uma expedição.'],
    [10, 'Exploradores', 'Faça 10 expedições.'],
    [50, 'Mapa cheio de marcas', 'Faça 50 expedições.'],
  ]),
  ...serie('sequencia', 40, [
    [3, 'Voltando sempre', 'Jogue 3 dias seguidos.'],
    [7, 'Uma semana de loja', 'Jogue 7 dias seguidos.'],
    [14, 'Quinzena de ouro', 'Jogue 14 dias seguidos.'],
    [30, 'Um mês aberto', 'Jogue 30 dias seguidos.'],
  ]),
  // uma conquista por categoria de item
  ...META.categorias.map((c) => ({
    id: `categoria_${c.id}`, nome: `Especialista: ${c.nome}`, desc: `Venda 25 itens de ${c.nome.toLowerCase()}.`,
    medida: 'categoria', arg: c.id, meta: 25, ouro: 150, rep: 2,
  })),
  // e uma por classe de aventureiro
  ...META.classes.map((c) => ({
    id: `classe_${c.id}`, nome: `Clientela: ${c.nome}`, desc: `Atenda 10 clientes da classe ${c.nome.toLowerCase()}.`,
    medida: 'classe', arg: c.id, meta: 10, ouro: 120, rep: 1,
  })),
  ...serie('qualidade', 90, [
    [2, 'Trabalho fino', 'Venda um item de qualidade Fina.'],
    [3, 'Primor', 'Venda um item de qualidade Primorosa.'],
  ]),
  ...[['raro', 'Achado raro', 'Venda um item raro.'], ['epico', 'Peça de museu', 'Venda um item épico.'], ['lendario', 'Digno de uma canção', 'Venda um item lendário.']]
    .map(([r, nome, desc], i) => ({ id: `raridade_${r}`, nome, desc, medida: 'raridade', arg: r, meta: 1, ouro: premio(i, 100), rep: i + 1 })),
  { id: 'caros_25', nome: 'Preço de mestre', desc: 'Venda 25 vezes pelo preço caro.', medida: 'caros', meta: 25, ouro: 150 },
  { id: 'baratos_25', nome: 'Bom de coração', desc: 'Venda 25 vezes pelo preço barato.', medida: 'baratos', meta: 25, ouro: 100, rep: 3 },
  ...serie('maiorVenda', 30, [
    [100, 'Venda gorda', 'Faça uma venda de 100 de ouro ou mais.'],
    [1000, 'Venda de gala', 'Faça uma venda de 1.000 de ouro ou mais.'],
    [10000, 'Negócio do século', 'Faça uma venda de 10.000 de ouro ou mais.'],
  ]),
  ...serie('eventos', 30, [
    [5, 'Imprevistos do ofício', 'Resolva 5 acontecimentos na loja.'],
    [20, 'Calejado', 'Resolva 20 acontecimentos na loja.'],
    ['todos', 'Já vi de tudo', 'Resolva todos os tipos de acontecimento.'],
  ]),
  ...serie('comprados', 30, [
    [50, 'Freguês dos fornecedores', 'Compre 50 materiais.'],
    [500, 'Despensa abarrotada', 'Compre 500 materiais.'],
  ]),
  ...serie('regioes', 60, [
    [2, 'Além da vila', 'Abra a segunda região.'],
    [4, 'Fama de viajante', 'Abra 4 regiões.'],
    ['todos', 'Mapa completo', 'Abra todas as regiões.'],
  ]),
];
