// Textos das telas provisórias (M0). Cada tela vai ganhando conteúdo real nas etapas seguintes;
// os blocos abaixo dizem o que ela vai ter e em que etapa chega (veja PLANO.md).
export const TELAS = {
  loja: {
    titulo: 'Loja',
    resumo: 'O balcão: clientes chegam, pedem algo e você escolhe o preço.',
    etapa: 'M2',
    itens: [
      'Fila de aventureiros, cada um com pedido e temperamento',
      'Três preços: barato, justo e caro, com a reação esperada',
      'Prateleiras que mostram o estoque de verdade',
      'Toque num cliente da fila para atendê-lo primeiro',
    ],
  },
  oficina: {
    titulo: 'Oficina',
    resumo: 'Produza itens com materiais e tempo; continua com o jogo fechado.',
    etapa: 'M4',
    itens: [
      'Oito ofícios: ferraria, alquimia, encantamento, costura, culinária, joalheria, carpintaria e artefatos',
      'Fila de produção com barras de progresso em tempo real',
      'Qualidade do item pelo nível do ofício',
    ],
  },
  mercado: {
    titulo: 'Mercado',
    resumo: 'Fornecedores com preço e estoque que mudam a cada dia, e o mapa das regiões.',
    etapa: 'M3',
    itens: [
      'Doze fornecedores com ofertas do dia',
      'Seis regiões que abrem com reputação',
      'Materiais exclusivos de cada região',
    ],
  },
  aventureiros: {
    titulo: 'Aventureiros',
    resumo: 'Quem passa pela sua loja: aventureiro do dia, encomendas e coleção.',
    etapa: 'M8',
    itens: [
      'Aventureiro especial do dia e encomendas diárias',
      'Sequência de dias e baú semanal',
      'Coleção de aventureiros e itens descobertos',
      'Dez lendários com histórias em capítulos',
    ],
  },
  melhorias: {
    titulo: 'Melhorias',
    resumo: 'Faça a loja crescer: ampliar, decorar, contratar e expandir para novas cidades.',
    etapa: 'M5',
    itens: [
      'Ampliar a loja, prateleiras, balcão e decoração',
      'Funcionários: atendente, artesão e vendedor',
      'Árvore de melhorias de cada ofício',
      'Conquistas e Expandir para uma nova cidade',
    ],
  },
};
