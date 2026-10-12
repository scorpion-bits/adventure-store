// Fornecedores: vendem materiais. Preço e estoque mudam a cada dia (sorteados pela data).
// { id, nome, desc, regiao, nivelRep, vende: [{ material, preco, estoque }] }
//  - preco: preço-base por unidade; o jogo varia ±variacao a cada dia
//  - estoque: quantidade-base por dia
export const FORNECEDORES = [
  { id: 'ferreiro_toras', nome: 'Toras & Cia', desc: 'Madeira e carvão direto da serraria.', regiao: 'vila', nivelRep: 1, variacao: 0.15,
    vende: [{ material: 'madeira', preco: 4, estoque: 30 }, { material: 'carvao', preco: 3, estoque: 30 }] },
  { id: 'mineradora_pedra', nome: 'Mineradora Pedra Funda', desc: 'Barras de ferro e cobre.', regiao: 'vila', nivelRep: 1, variacao: 0.2,
    vende: [{ material: 'barra_ferro', preco: 8, estoque: 20 }, { material: 'cobre', preco: 5, estoque: 25 }] },
  { id: 'herbolario_flor', nome: 'Herbolário da Dona Flor', desc: 'Ervas, farinha e cristais.', regiao: 'vila', nivelRep: 1, variacao: 0.2,
    vende: [{ material: 'erva_curativa', preco: 4, estoque: 30 }, { material: 'farinha', preco: 2, estoque: 40 }, { material: 'cristal_mana', preco: 10, estoque: 10 }] },
];
