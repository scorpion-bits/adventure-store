// Regiões: destravam por nível de reputação e trazem materiais, clientes e eventos próprios.
// { id, nome, desc, nivelRep, valorMin, valorMax }
//  - valorMin/valorMax: faixa de valor (preço de referência) dos itens que os clientes da região pedem por nome
export const REGIOES = [
  { id: 'vila', nome: 'Vila Inicial', desc: 'Onde tudo começa: clientes novatos e materiais básicos.', nivelRep: 1, valorMin: 0, valorMax: 160 },
  { id: 'floresta', nome: 'Floresta Sussurrante', desc: 'Peles, ervas raras e caçadores.', nivelRep: 5, valorMin: 15, valorMax: 420 },
  { id: 'montanhas', nome: 'Montanhas de Ferro', desc: 'Minérios nobres e anões ferreiros.', nivelRep: 10, valorMin: 40, valorMax: 900 },
  { id: 'deserto', nome: 'Deserto de Cinzas', desc: 'Relíquias, especiarias e viajantes misteriosos.', nivelRep: 16, valorMin: 80, valorMax: 2000 },
  { id: 'pantano', nome: 'Pântano Esmeralda', desc: 'Ingredientes de alquimia e bruxos.', nivelRep: 22, valorMin: 150, valorMax: 4000 },
  { id: 'dragao', nome: 'Cume do Dragão', desc: 'Tesouros lendários e heróis de verdade.', nivelRep: 30, valorMin: 300, valorMax: 100000 },
];
