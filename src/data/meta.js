// Tabelas de base do jogo: categorias, raridades, qualidades, temperamentos, classes, ofícios.
// Para balancear o jogo, edite os números aqui. Para adicionar conteúdo, veja os outros arquivos de data/.

export const META = {
  // ---------- categorias de itens à venda ----------
  categorias: [
    { id: 'armas', nome: 'Armas' },
    { id: 'armaduras', nome: 'Armaduras' },
    { id: 'pocoes', nome: 'Poções' },
    { id: 'magia', nome: 'Magia' },
    { id: 'ferramentas', nome: 'Ferramentas' },
    { id: 'acessorios', nome: 'Acessórios' },
    { id: 'comida', nome: 'Comida' },
    { id: 'curiosidades', nome: 'Curiosidades' },
  ],

  // ---------- raridades (cor usada nas bordas dos ícones) ----------
  raridades: [
    { id: 'comum', nome: 'Comum', cor: 0xb9b2a3 },
    { id: 'incomum', nome: 'Incomum', cor: 0x7ed67e },
    { id: 'raro', nome: 'Raro', cor: 0x6fb2ff },
    { id: 'epico', nome: 'Épico', cor: 0xc08cff },
    { id: 'lendario', nome: 'Lendário', cor: 0xffb347 },
  ],

  // ---------- qualidades: multiplicam o preço de referência ----------
  qualidades: [
    { id: 'tosco', nome: 'Tosco', mult: 0.7 },
    { id: 'comum', nome: 'Comum', mult: 1 },
    { id: 'fino', nome: 'Fino', mult: 1.35 },
    { id: 'primoroso', nome: 'Primoroso', mult: 1.8 },
  ],

  // ---------- os três preços que o jogador escolhe (multiplicam o preço de referência) ----------
  precos: { barato: 0.75, justo: 1, caro: 1.35 },

  // ---------- temperamentos ----------
  // aceita: chance base de comprar em cada preço. rep: reputação ganha ao vender em cada preço
  // (e `recusa` quando o cliente vai embora sem comprar). paciencia: multiplica o tempo na fila.
  temperamentos: [
    { id: 'pechincheiro', nome: 'Pechincheiro', desc: 'Adora uma pechincha e foge de preço alto.',
      aceita: { barato: 0.98, justo: 0.72, caro: 0.18 }, rep: { barato: 3, justo: 1, caro: 0, recusa: -1 }, paciencia: 1 },
    { id: 'esnobe', nome: 'Esnobe', desc: 'Desconfia do que é barato demais.',
      aceita: { barato: 0.7, justo: 0.9, caro: 0.85 }, rep: { barato: 0, justo: 1, caro: 3, recusa: -1 }, paciencia: 1 },
    { id: 'impaciente', nome: 'Impaciente', desc: 'Não gosta de esperar na fila.',
      aceita: { barato: 0.95, justo: 0.85, caro: 0.45 }, rep: { barato: 2, justo: 1, caro: 0, recusa: -2 }, paciencia: 0.55 },
    { id: 'generoso', nome: 'Generoso', desc: 'Paga bem por bom atendimento.',
      aceita: { barato: 0.9, justo: 0.95, caro: 0.8 }, rep: { barato: 1, justo: 2, caro: 2, recusa: 0 }, paciencia: 1.1 },
    { id: 'desconfiado', nome: 'Desconfiado', desc: 'Só compra com preço justo.',
      aceita: { barato: 0.6, justo: 0.92, caro: 0.2 }, rep: { barato: 0, justo: 2, caro: -1, recusa: -1 }, paciencia: 1 },
    { id: 'curioso', nome: 'Curioso', desc: 'Compra por impulso e leva coisas diferentes.',
      aceita: { barato: 0.95, justo: 0.88, caro: 0.55 }, rep: { barato: 1, justo: 1, caro: 1, recusa: 0 }, paciencia: 1.2 },
    { id: 'leal', nome: 'Leal', desc: 'Cliente de longa data: perdoa um preço alto de vez em quando.',
      aceita: { barato: 0.95, justo: 0.95, caro: 0.7 }, rep: { barato: 1, justo: 2, caro: 1, recusa: -1 }, paciencia: 1.25 },
    { id: 'sovina', nome: 'Sovina', desc: 'Conta cada moeda.',
      aceita: { barato: 0.9, justo: 0.5, caro: 0.05 }, rep: { barato: 3, justo: 1, caro: -2, recusa: -1 }, paciencia: 0.9 },
  ],

  // ---------- classes de aventureiro (as preferências ficam em cada aventureiro) ----------
  classes: [
    { id: 'guerreiro', nome: 'Guerreiro', cor: 0xc8553d },
    { id: 'arqueiro', nome: 'Arqueiro', cor: 0x5fa55a },
    { id: 'mago', nome: 'Mago', cor: 0x6a7ff0 },
    { id: 'ladino', nome: 'Ladino', cor: 0x7d6b8f },
    { id: 'clerigo', nome: 'Clérigo', cor: 0xe8d07a },
    { id: 'bardo', nome: 'Bardo', cor: 0xe58fb4 },
    { id: 'cacador', nome: 'Caçador', cor: 0x8a6a3d },
    { id: 'alquimista', nome: 'Alquimista errante', cor: 0x4fb8a8 },
  ],

  // ---------- ofícios da oficina ----------
  oficios: [
    { id: 'ferraria', nome: 'Ferraria', desc: 'Armas, armaduras e ferramentas de metal.' },
    { id: 'alquimia', nome: 'Alquimia', desc: 'Poções e elixires.' },
    { id: 'encantamento', nome: 'Encantamento', desc: 'Pergaminhos, runas e itens mágicos.' },
    { id: 'costura', nome: 'Costura', desc: 'Roupas, capas e armaduras de tecido e couro.' },
    { id: 'culinaria', nome: 'Culinária', desc: 'Refeições para quem vai à aventura.' },
    { id: 'joalheria', nome: 'Joalheria', desc: 'Anéis, amuletos e gemas lapidadas.' },
    { id: 'carpintaria', nome: 'Carpintaria', desc: 'Arcos, cajados, escudos e ferramentas de madeira.' },
    { id: 'artefatos', nome: 'Artefatos', desc: 'Curiosidades e relíquias raras.' },
  ],

  // ---------- reputação: pontos para o nível n = base * (n-1)^expoente ----------
  reputacao: { base: 30, expoente: 1.6, nivelMax: 50 },

  // ---------- início do jogo ----------
  // estoque inicial: o jogo começa jogável antes de o jogador ter materiais e oficina ("item:qualidade": quantidade)
  inicio: {
    ouro: 100,
    estoque: {
      'pao_aventureiro:1': 4, 'pocao_cura:1': 3, 'adaga_bronze:1': 2, 'escudo_madeira:1': 1,
      'ensopado:1': 2, 'anel_cobre:1': 1, 'arco_curto:1': 1,
    },
  },

  // ---------- fluxo de clientes (tempos em milissegundos) ----------
  loja: {
    filaBase: 3,                // quantos clientes cabem na fila (melhorias aumentam)
    intervaloBase: 14000,       // tempo médio entre chegadas no nível 1 de reputação...
    intervaloPorNivel: 250,     // ...e quanto diminui por nível
    intervaloMin: 5000,
    jitter: 0.35,               // variação sorteada (±35%)
    pacienciaBase: 75000,       // quanto um cliente espera na fila antes de ir embora
    // chance de cada tipo de pedido
    pedido: { item: 0.55, categoria: 0.3, surpresa: 0.15 },
    // ajustes na chance de compra
    substituto: 0.7,            // ofereceu outro item que não o pedido
    preferido: 1.1,             // item de uma categoria que ele prefere
    naoPreferido: 0.85,
    semOrcamento: 0.04,         // o preço passa do orçamento: quase nunca compra
  },

  // ---------- metas mínimas de conteúdo (conferidas por `npm run validate -- --metas`) ----------
  metas: {
    itens: 100, receitas: 60, melhoriasPorOficio: 20, aventureiros: 40, lendarios: 10,
    regioes: 6, fornecedores: 12, eventos: 30, conquistas: 80,
  },
};
