// Fornecedores: vendem materiais (ou itens prontos). Preço e estoque mudam a cada dia (sorteados pela data).
// { id, nome, desc, regiao, nivelRep, variacao, vende: [{ material, preco, estoque }] }
//  - material: id de um material (vai para o depósito) ou de um item (vai direto para as prateleiras)
//  - preco: preço-base por unidade; o jogo varia ±variacao a cada dia
//  - estoque: quantidade-base por dia (o jogo sorteia de 70% a 130% disso)
export const FORNECEDORES = [
  // ---- Vila Inicial ----
  { id: 'ferreiro_toras', nome: 'Toras & Cia', desc: 'Madeira, pedra e carvão direto da serraria.', regiao: 'vila', nivelRep: 1, variacao: 0.15,
    vende: [{ material: 'madeira', preco: 4, estoque: 30 }, { material: 'carvao', preco: 3, estoque: 30 }, { material: 'pedra', preco: 3, estoque: 30 }] },
  { id: 'mineradora_pedra', nome: 'Mineradora Pedra Funda', desc: 'Barras de ferro e cobre.', regiao: 'vila', nivelRep: 1, variacao: 0.2,
    vende: [{ material: 'barra_ferro', preco: 8, estoque: 20 }, { material: 'cobre', preco: 5, estoque: 25 }] },
  { id: 'herbolario_flor', nome: 'Herbolário da Dona Flor', desc: 'Ervas, farinha, frascos e cristais.', regiao: 'vila', nivelRep: 1, variacao: 0.2,
    vende: [{ material: 'erva_curativa', preco: 4, estoque: 30 }, { material: 'farinha', preco: 2, estoque: 40 }, { material: 'cristal_mana', preco: 10, estoque: 10 },
      { material: 'frasco', preco: 3, estoque: 30 }, { material: 'baga', preco: 3, estoque: 30 }] },
  { id: 'acougue_ze', nome: 'Açougue do Zé', desc: 'Carne, couro, peixe, leite e mel.', regiao: 'vila', nivelRep: 1, variacao: 0.18,
    vende: [{ material: 'carne', preco: 5, estoque: 25 }, { material: 'couro_cru', preco: 6, estoque: 25 }, { material: 'peixe', preco: 6, estoque: 20 },
      { material: 'leite', preco: 4, estoque: 20 }, { material: 'mel', preco: 6, estoque: 15 }] },
  { id: 'tecidos_lina', nome: 'Tecidos da Tia Lina', desc: 'Linho e lã de boa qualidade.', regiao: 'vila', nivelRep: 2, variacao: 0.15,
    vende: [{ material: 'linho', preco: 4, estoque: 30 }, { material: 'la', preco: 5, estoque: 25 }] },
  { id: 'mercador_errante', nome: 'Mercador Errante', desc: 'Curiosidades que ninguém sabe de onde vieram.', regiao: 'vila', nivelRep: 8, variacao: 0.25,
    vende: [{ material: 'dente_lobo', preco: 12, estoque: 6 }, { material: 'osso_antigo', preco: 20, estoque: 5 }, { material: 'pena_grifo', preco: 34, estoque: 4 },
      { material: 'cranio_antigo', preco: 75, estoque: 3 }, { material: 'moeda_antiga', preco: 105, estoque: 3 }] },
  // ---- Floresta Sussurrante ----
  { id: 'cacadores_peles', nome: 'Caçadores de Peles', desc: 'Peles, garras e penas da floresta.', regiao: 'floresta', nivelRep: 5, variacao: 0.2,
    vende: [{ material: 'pele_lobo', preco: 9, estoque: 15 }, { material: 'garra', preco: 10, estoque: 12 }, { material: 'pena', preco: 7, estoque: 20 }] },
  { id: 'colhedores_bosque', nome: 'Colhedores do Bosque', desc: 'Madeira nobre, seiva, cogumelos e flores lunares.', regiao: 'floresta', nivelRep: 5, variacao: 0.2,
    vende: [{ material: 'madeira_nobre', preco: 12, estoque: 20 }, { material: 'seiva', preco: 8, estoque: 20 }, { material: 'cogumelo', preco: 6, estoque: 25 },
      { material: 'flor_lunar', preco: 14, estoque: 12 }, { material: 'teia', preco: 15, estoque: 8 }] },
  // ---- Montanhas de Ferro ----
  { id: 'forja_anoes', nome: 'Forja dos Anões', desc: 'Aço e mithril, direto da fornalha.', regiao: 'montanhas', nivelRep: 10, variacao: 0.2,
    vende: [{ material: 'aco', preco: 18, estoque: 20 }, { material: 'mithril', preco: 45, estoque: 6 }] },
  { id: 'joalheiro_rubi', nome: 'Joalheiro Rubi', desc: 'Metais preciosos, gemas e pedras rúnicas.', regiao: 'montanhas', nivelRep: 10, variacao: 0.22,
    vende: [{ material: 'prata', preco: 22, estoque: 15 }, { material: 'ouro_barra', preco: 32, estoque: 10 }, { material: 'gema_bruta', preco: 35, estoque: 8 },
      { material: 'quartzo', preco: 14, estoque: 15 }, { material: 'pedra_runica', preco: 26, estoque: 10 }] },
  // ---- Deserto de Cinzas ----
  { id: 'caravana_cinzas', nome: 'Caravana das Cinzas', desc: 'Especiarias, seda e cristais do deserto.', regiao: 'deserto', nivelRep: 16, variacao: 0.25,
    vende: [{ material: 'especiaria', preco: 14, estoque: 15 }, { material: 'seda', preco: 28, estoque: 8 }, { material: 'presa_escorpiao', preco: 18, estoque: 8 },
      { material: 'cristal_solar', preco: 30, estoque: 8 }, { material: 'vidro_fino', preco: 16, estoque: 12 }, { material: 'incenso', preco: 20, estoque: 10 }] },
  // ---- Pântano Esmeralda ----
  { id: 'bruxa_brejo', nome: 'Bruxa do Brejo', desc: 'Ingredientes que você não pergunta de onde vêm.', regiao: 'pantano', nivelRep: 22, variacao: 0.25,
    vende: [{ material: 'lodo', preco: 8, estoque: 20 }, { material: 'veneno', preco: 20, estoque: 10 }, { material: 'cogumelo_azul', preco: 16, estoque: 12 },
      { material: 'musgo', preco: 9, estoque: 20 }, { material: 'raiz_negra', preco: 24, estoque: 8 }, { material: 'essencia_brejo', preco: 38, estoque: 6 }] },
  // ---- Cume do Dragão ----
  { id: 'ninho_vulcanico', nome: 'Ninho Vulcânico', desc: 'Tesouros de dragão, em pouca quantidade.', regiao: 'dragao', nivelRep: 30, variacao: 0.3,
    vende: [{ material: 'escama_dragao', preco: 120, estoque: 4 }, { material: 'brasa_eterna', preco: 85, estoque: 5 }, { material: 'osso_draconico', preco: 90, estoque: 4 },
      { material: 'ouro_dragao', preco: 65, estoque: 6 }, { material: 'ferro_celeste', preco: 100, estoque: 5 }, { material: 'sangue_dragao', preco: 150, estoque: 3 }] },
];
