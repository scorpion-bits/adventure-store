// Regiões: destravam por nível de reputação e trazem materiais, clientes e eventos próprios.
// { id, nome, desc, nivelRep, valorMin, valorMax, drops }
//  - valorMin/valorMax: faixa de valor (preço de referência) dos itens que os clientes da região pedem por nome
//  - drops: itens raros que as expedições à região podem achar: { item, chance } (chance de uma expedição média; vai para as prateleiras)
export const REGIOES = [
  { id: 'vila', nome: 'Vila Inicial', desc: 'Onde tudo começa: clientes novatos e materiais básicos.', nivelRep: 1, valorMin: 0, valorMax: 160,
    drops: [{ item: 'dente_lobo', chance: 0.25 }, { item: 'osso_antigo', chance: 0.15 }, { item: 'moedas_cobre', chance: 0.2 }, { item: 'carta_lacrada', chance: 0.1 }, { item: 'dado_6', chance: 0.1 }] },
  { id: 'floresta', nome: 'Floresta Sussurrante', desc: 'Peles, ervas raras e caçadores.', nivelRep: 5, valorMin: 15, valorMax: 420,
    drops: [{ item: 'pena_grifo', chance: 0.25 }, { item: 'dente_lobo', chance: 0.2 }, { item: 'galho_macieira', chance: 0.15 }, { item: 'flauta_pa', chance: 0.1 }] },
  { id: 'montanhas', nome: 'Montanhas de Ferro', desc: 'Minérios nobres e anões ferreiros.', nivelRep: 10, valorMin: 40, valorMax: 900,
    drops: [{ item: 'geodo', chance: 0.25 }, { item: 'cranio_antigo', chance: 0.12 }, { item: 'ametista', chance: 0.1 }, { item: 'femur_fossil', chance: 0.1 }, { item: 'bau_pequeno', chance: 0.06 }] },
  { id: 'deserto', nome: 'Deserto de Cinzas', desc: 'Relíquias, especiarias e viajantes misteriosos.', nivelRep: 16, valorMin: 80, valorMax: 2000,
    drops: [{ item: 'moeda_antiga', chance: 0.2 }, { item: 'cranio_antigo', chance: 0.15 }, { item: 'mapa_tesouro', chance: 0.1 }, { item: 'topazio', chance: 0.1 }, { item: 'moeda_ouro', chance: 0.15 }, { item: 'ampulheta', chance: 0.07 }] },
  { id: 'pantano', nome: 'Pântano Esmeralda', desc: 'Ingredientes de alquimia e bruxos.', nivelRep: 22, valorMin: 150, valorMax: 4000,
    drops: [{ item: 'osso_antigo', chance: 0.2 }, { item: 'chave_misteriosa', chance: 0.08 }, { item: 'esmeralda', chance: 0.08 }, { item: 'dado_20', chance: 0.1 }, { item: 'diario', chance: 0.1 }] },
  { id: 'dragao', nome: 'Cume do Dragão', desc: 'Tesouros lendários e heróis de verdade.', nivelRep: 30, valorMin: 300, valorMax: 100000,
    drops: [{ item: 'orbe_cristal', chance: 0.06 }, { item: 'ovo_dragao', chance: 0.008 }, { item: 'rubi', chance: 0.1 }, { item: 'chave_ouro', chance: 0.08 }, { item: 'bau_tesouro', chance: 0.05 }] },
];
