// Funcionários. Cada um tem níveis; o nível 1 é a contratação e os seguintes são promoções.
// Os efeitos de cada nível SUBSTITUEM os do anterior (descrevem o total naquele nível, não o acréscimo).
// { id, nome, desc, niveis: [{ custo, nivelRep, efeitos }] }
export const EQUIPE = [
  { id: 'atendente', nome: 'Atendente', desc: 'Atende sozinho os clientes que esperam muito, enquanto você cuida do resto.',
    niveis: [
      { custo: 150, nivelRep: 2, efeitos: [{ tipo: 'atendente', valor: 30 }] },
      { custo: 500, nivelRep: 4, efeitos: [{ tipo: 'atendente', valor: 24 }] },
      { custo: 1500, nivelRep: 7, efeitos: [{ tipo: 'atendente', valor: 18 }] },
      { custo: 4500, nivelRep: 11, efeitos: [{ tipo: 'atendente', valor: 13 }] },
      { custo: 12000, nivelRep: 16, efeitos: [{ tipo: 'atendente', valor: 9 }] },
    ] },
  { id: 'artesao', nome: 'Artesão', desc: 'Leva a produção pronta para as prateleiras, repete receitas e trabalha mais rápido.',
    niveis: [
      { custo: 300, nivelRep: 3, efeitos: [{ tipo: 'autoColetar' }, { tipo: 'repetir' }] },
      { custo: 900, nivelRep: 5, efeitos: [{ tipo: 'autoColetar' }, { tipo: 'repetir' }, { tipo: 'velocidadeGlobal', valor: 1.1 }] },
      { custo: 2500, nivelRep: 8, efeitos: [{ tipo: 'autoColetar' }, { tipo: 'repetir' }, { tipo: 'velocidadeGlobal', valor: 1.1 }, { tipo: 'slotsGlobal', valor: 1 }] },
      { custo: 7000, nivelRep: 12, efeitos: [{ tipo: 'autoColetar' }, { tipo: 'repetir' }, { tipo: 'velocidadeGlobal', valor: 1.25 }, { tipo: 'slotsGlobal', valor: 1 }] },
      { custo: 18000, nivelRep: 17, efeitos: [{ tipo: 'autoColetar' }, { tipo: 'repetir' }, { tipo: 'velocidadeGlobal', valor: 1.25 }, { tipo: 'slotsGlobal', valor: 1 }, { tipo: 'qualidade', valor: 0.1 }] },
    ] },
  { id: 'vendedor', nome: 'Vendedor', desc: 'Cuida da loja com o jogo fechado: atende clientes e vende o estoque enquanto você está fora.',
    niveis: [
      { custo: 250, nivelRep: 2, efeitos: [{ tipo: 'vendasOffline', valor: 0.3 }, { tipo: 'offlineHoras', valor: 2 }] },
      { custo: 800, nivelRep: 4, efeitos: [{ tipo: 'vendasOffline', valor: 0.45 }, { tipo: 'offlineHoras', valor: 3 }] },
      { custo: 2400, nivelRep: 6, efeitos: [{ tipo: 'vendasOffline', valor: 0.6 }, { tipo: 'offlineHoras', valor: 4 }] },
      { custo: 7000, nivelRep: 10, efeitos: [{ tipo: 'vendasOffline', valor: 0.8 }, { tipo: 'offlineHoras', valor: 6 }] },
      { custo: 18000, nivelRep: 15, efeitos: [{ tipo: 'vendasOffline', valor: 1 }, { tipo: 'offlineHoras', valor: 8 }] },
    ] },
];
