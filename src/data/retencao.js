// Parâmetros das mecânicas de retenção: encomendas diárias, aventureiro especial, sequência de dias e baú semanal.
// As encomendas e as metas são sorteadas pela data (e pela faixa de reputação), então são iguais para quem está na mesma faixa.

export const DIARIO = {
  encomendas: 3,
  // faixas de reputação (níveis em que começa cada faixa); quem está na mesma faixa recebe as mesmas encomendas
  faixas: [1, 5, 10, 16, 22, 30],
  // valor máximo do item de uma encomenda: base + porNivel * nível
  valorMax: { base: 80, porNivel: 70 },
  recompensa: { ouroPorValor: 1.5, ouroPorNivel: 10, qualidadeFino: 1.3 },
  // aventureiro especial: chance, a cada chegada de cliente, de ele aparecer; bônus ao atendê-lo
  especial: { chance: 0.2, pacienciaMult: 1.5, bonusOuro: 0.5, bonusRep: 3 },
  // bônus de login: ouro = (base + porNivel * nível) * (1 + 0,05 * min(sequência, 20)); a cada 7 dias vem um pacote de materiais
  login: { ouroBase: 40, ouroPorNivel: 12, multPorDia: 0.05, multMaxDias: 20, pacoteACada: 7, pacoteMateriais: 12, pacoteRep: 5 },
  perdoPorSemana: 1,        // dias que dá para faltar sem perder a sequência (um por semana)
};

// Metas semanais: sorteia-se `quantas` do pool. alvo = base + porNivel * nível (± variação).
// stat: contador de state.stats que mede o progresso na semana.
export const SEMANAL = {
  quantas: 4,
  variacao: 0.15,
  metas: [
    { id: 'vender', texto: 'Vender {n} itens', stat: 'vendas', base: 20, porNivel: 2.5 },
    { id: 'produzir', texto: 'Produzir {n} itens na oficina', stat: 'produzidos', base: 20, porNivel: 2 },
    { id: 'ganhar', texto: 'Ganhar {n} de ouro', stat: 'ouroTotal', base: 600, porNivel: 150 },
    { id: 'encomendas', texto: 'Entregar {n} encomendas diárias', stat: 'encomendas', base: 4, porNivel: 0.15 },
    { id: 'comprar', texto: 'Comprar {n} materiais', stat: 'comprados', base: 40, porNivel: 4 },
    { id: 'expedicoes', texto: 'Concluir {n} expedições', stat: 'expedicoes', base: 2, porNivel: 0.12 },
  ],
  // baú: ouro = (base + porNivel * nível) * metas cumpridas; 3+ metas dão um item; 4 metas dão materiais raros
  bau: { ouroBase: 150, ouroPorNivel: 40, repPorMeta: 2, itemComMetas: 3, materiaisComMetas: 4, materiais: 8 },
};
