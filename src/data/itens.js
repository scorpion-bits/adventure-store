// Itens à venda na loja.
// { id, nome, cat (categoria), raridade, valor (preço de referência na qualidade Comum),
//   nivelRep (nível de reputação em que o item passa a ser pedido, padrão 1), tags (opcional) }
// O ícone de cada item fica em data/icones.js; sem ícone, o jogo desenha um provisório.
export const ITENS = [
  // armas
  { id: 'espada_ferro', nome: 'Espada de ferro', cat: 'armas', raridade: 'comum', valor: 40 },
  { id: 'adaga_bronze', nome: 'Adaga de cobre', cat: 'armas', raridade: 'comum', valor: 25 },
  { id: 'arco_curto', nome: 'Arco curto', cat: 'armas', raridade: 'comum', valor: 35 },
  // armaduras
  { id: 'peitoral_couro', nome: 'Peitoral de couro', cat: 'armaduras', raridade: 'comum', valor: 45 },
  { id: 'escudo_madeira', nome: 'Escudo de madeira', cat: 'armaduras', raridade: 'comum', valor: 30 },
  // poções
  { id: 'pocao_cura', nome: 'Poção de cura', cat: 'pocoes', raridade: 'comum', valor: 20 },
  { id: 'pocao_mana', nome: 'Poção de mana', cat: 'pocoes', raridade: 'comum', valor: 24 },
  // magia
  { id: 'pergaminho_faisca', nome: 'Pergaminho de faísca', cat: 'magia', raridade: 'incomum', valor: 30, nivelRep: 2 },
  // ferramentas
  { id: 'picareta_ferro', nome: 'Picareta de ferro', cat: 'ferramentas', raridade: 'comum', valor: 35 },
  // acessórios
  { id: 'anel_cobre', nome: 'Anel de cobre', cat: 'acessorios', raridade: 'comum', valor: 28 },
  // comida
  { id: 'pao_aventureiro', nome: 'Pão do aventureiro', cat: 'comida', raridade: 'comum', valor: 6 },
  { id: 'ensopado', nome: 'Ensopado de carne', cat: 'comida', raridade: 'comum', valor: 12 },
  // curiosidades
  { id: 'dente_lobo', nome: 'Dente de lobo', cat: 'curiosidades', raridade: 'comum', valor: 15 },
];
