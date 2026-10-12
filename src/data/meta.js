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
  // falas: frases genéricas do temperamento (compra, recusa, barato, caro); cada aventureiro pode ter as suas em data/aventureiros.js.
  // aceita: chance base de comprar em cada preço. rep: reputação ganha ao vender em cada preço
  // (e `recusa` quando o cliente vai embora sem comprar). paciencia: multiplica o tempo na fila.
  temperamentos: [
    { id: 'pechincheiro', nome: 'Pechincheiro', desc: 'Adora uma pechincha e foge de preço alto.',
      aceita: { barato: 0.98, justo: 0.72, caro: 0.18 }, rep: { barato: 3, justo: 1, caro: 0, recusa: -1 }, paciencia: 1,
      falas: { compra: ['Fechado! Mais barato que isso só no mercado negro.', 'Negócio bom é negócio fechado.', 'Levo! E volto semana que vem.'], recusa: ['Está caro demais para mim.', 'Se baixar um pouquinho, a gente conversa.', 'Hmm... a loja da esquina cobra menos.'], barato: ['Uau, que pechincha!', 'Esse preço eu não esperava!', 'Pode embrulhar antes que você mude de ideia!'], caro: ['Isso é um roubo!', 'Eu pago bem menos em qualquer lugar.', 'Preço de rei para bolso de plebeu...'] } },
    { id: 'esnobe', nome: 'Esnobe', desc: 'Desconfia do que é barato demais.',
      aceita: { barato: 0.7, justo: 0.9, caro: 0.85 }, rep: { barato: 0, justo: 1, caro: 3, recusa: -1 }, paciencia: 1,
      falas: { compra: ['Aceitável. Embrulhe com cuidado.', 'Finalmente, algo digno.', 'Levo. Mande entregar na estalagem.'], recusa: ['Que falta de elegância.', 'Isso não está à minha altura.', 'Prefiro não me envolver com isso.'], barato: ['Tão barato? Duvido da qualidade.', 'Preço de quem não confia no próprio produto.', 'Hmm... suspeito.'], caro: ['O melhor tem seu preço, não é?', 'Pelo menos você sabe o que vale.', 'Caro, mas à altura.'] } },
    { id: 'impaciente', nome: 'Impaciente', desc: 'Não gosta de esperar na fila.',
      aceita: { barato: 0.95, justo: 0.85, caro: 0.45 }, rep: { barato: 2, justo: 1, caro: 0, recusa: -2 }, paciencia: 0.55,
      falas: { compra: ['Anotado. Já vou!', 'Rápido, rápido, embrulhe isso.', 'Combinado. Tchau!'], recusa: ['Perdi meu tempo aqui.', 'Não dá para esperar mais.', 'Ficou tudo muito lento, vou embora.'], barato: ['Ótimo, vamos logo!', 'Pode ser, sem enrolar.', 'Fechado, rápido!'], caro: ['Sem tempo para discutir... mas está caro.', 'Caro, mas não vou perder tempo barganhando.', 'Se for rápido, eu pago.'] } },
    { id: 'generoso', nome: 'Generoso', desc: 'Paga bem por bom atendimento.',
      aceita: { barato: 0.9, justo: 0.95, caro: 0.8 }, rep: { barato: 1, justo: 2, caro: 2, recusa: 0 }, paciencia: 1.1,
      falas: { compra: ['Que bênção! Obrigado!', 'Com prazer! Fique com o troco.', 'Um prazer fazer negócio com você.'], recusa: ['Que pena, que pena...', 'Quem sabe da próxima vez.', 'Vou pensar com carinho.'], barato: ['Que preço generoso!', 'Tão bom que vou indicar a loja!', 'Assim você me deixa sem graça!'], caro: ['Pelo bom serviço, pago com gosto.', 'Vale cada moeda.', 'Qualidade se paga.'] } },
    { id: 'desconfiado', nome: 'Desconfiado', desc: 'Só compra com preço justo.',
      aceita: { barato: 0.6, justo: 0.92, caro: 0.2 }, rep: { barato: 0, justo: 2, caro: -1, recusa: -1 }, paciencia: 1,
      falas: { compra: ['Está dentro do esperado. Levo.', 'Hmm. Pode ser. Confio... por enquanto.', 'Preço justo. É o que me interessa.'], recusa: ['Não confio nesse preço.', 'Tem alguma pegadinha aí.', 'Prefiro não arriscar.'], barato: ['Barato demais... tem algo errado?', 'Hmm, quem dá desconto assim?', 'Isso cheira a armadilha.'], caro: ['Isso é um assalto!', 'Está me enganando, não está?', 'Nem pensar num preço desses.'] } },
    { id: 'curioso', nome: 'Curioso', desc: 'Compra por impulso e leva coisas diferentes.',
      aceita: { barato: 0.95, justo: 0.88, caro: 0.55 }, rep: { barato: 1, justo: 1, caro: 1, recusa: 0 }, paciencia: 1.2,
      falas: { compra: ['Gostei! Levo!', 'Nunca vi nada igual, quero!', 'Hm, por que não?'], recusa: ['Vou pensar e volto depois.', 'Interessante... mas hoje não.', 'Ah, deixa para a próxima.'], barato: ['Preço bom!', 'Que achado!', 'Levo dois! Ah, só tenho dinheiro para um...'], caro: ['Ai, ai... será que vale?', 'Caro, mas a curiosidade fala mais alto.', 'Tentador... e salgado.'] } },
    { id: 'leal', nome: 'Leal', desc: 'Cliente de longa data: perdoa um preço alto de vez em quando.',
      aceita: { barato: 0.95, justo: 0.95, caro: 0.7 }, rep: { barato: 1, justo: 2, caro: 1, recusa: -1 }, paciencia: 1.25,
      falas: { compra: ['Sempre um prazer negociar com você.', 'Como sempre, ótimo atendimento.', 'Pode contar comigo de novo.'], recusa: ['Hoje não, amigo.', 'Dessa vez vou passar.', 'Vamos deixar para outra ocasião.'], barato: ['Obrigado pela consideração!', 'Você sempre cuida bem dos seus clientes.', 'Isso é amizade!'], caro: ['Por você, eu aceito.', 'Um pouco salgado, mas somos amigos.', 'Tudo bem, a confiança conta.'] } },
    { id: 'sovina', nome: 'Sovina', desc: 'Conta cada moeda.',
      aceita: { barato: 0.9, justo: 0.5, caro: 0.05 }, rep: { barato: 3, justo: 1, caro: -2, recusa: -1 }, paciencia: 0.9,
      falas: { compra: ['Combinado. Nem vi você aqui.', 'Cada moeda conta... fechado.', 'Tá, tá. Embrulha.'], recusa: ['Muito caro. Eu arrumo de graça por aí.', 'Nem pensar, guardo meu dinheiro.', 'Meu bolso agradece por eu não comprar.'], barato: ['Agora sim!', 'Esse preço eu entendo!', 'Uma moeda poupada é uma moeda ganha.'], caro: ['Você está louco?', 'Meu dinheiro não é de pedra!', 'Prefiro dormir ao relento.'] } },
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
  // custo: ouro para abrir o ofício; nivelRep: reputação mínima da loja (o primeiro já vem aberto)
  oficios: [
    { id: 'ferraria', nome: 'Ferraria', desc: 'Armas, armaduras e ferramentas de metal.', custo: 0, nivelRep: 1 },
    { id: 'culinaria', nome: 'Culinária', desc: 'Refeições para quem vai à aventura.', custo: 60, nivelRep: 1 },
    { id: 'alquimia', nome: 'Alquimia', desc: 'Poções e elixires.', custo: 150, nivelRep: 2 },
    { id: 'carpintaria', nome: 'Carpintaria', desc: 'Arcos, cajados, escudos e ferramentas de madeira.', custo: 250, nivelRep: 3 },
    { id: 'costura', nome: 'Costura', desc: 'Roupas, capas e armaduras de tecido e couro.', custo: 400, nivelRep: 4 },
    { id: 'encantamento', nome: 'Encantamento', desc: 'Pergaminhos, runas e itens mágicos.', custo: 700, nivelRep: 6 },
    { id: 'joalheria', nome: 'Joalheria', desc: 'Anéis, amuletos e gemas lapidadas.', custo: 1000, nivelRep: 8 },
    { id: 'artefatos', nome: 'Artefatos', desc: 'Curiosidades e relíquias raras.', custo: 2000, nivelRep: 12 },
  ],

  // ---------- oficina ----------
  oficina: {
    slotsBase: 1,               // produções simultâneas por ofício (melhorias aumentam)
    filaBase: 2,                // quantas produções podem esperar na fila de cada ofício
    xpPorSegundo: 1 / 6,        // experiência do ofício por segundo de receita (mínimo 5 por produção)
    nivelMax: 10,
    xpNivel: { base: 60, expoente: 1.5 },     // xp acumulado para o nível n = base * (n-1)^expoente
    // chance de cada qualidade [tosco, comum, fino, primoroso] a partir do nível do ofício
    qualidade: [
      { nivel: 1, p: [0.25, 0.75, 0, 0] },
      { nivel: 3, p: [0.1, 0.7, 0.2, 0] },
      { nivel: 5, p: [0, 0.6, 0.35, 0.05] },
      { nivel: 7, p: [0, 0.4, 0.45, 0.15] },
      { nivel: 10, p: [0, 0.2, 0.5, 0.3] },
    ],
  },

  // ---------- expedições (mandar batedores buscar materiais de uma região) ----------
  // unidades: quantos materiais trazem; eficiencia: quanto valem os materiais trazidos em relação ao custo (mais tempo, mais vantagem);
  // chanceDrop: multiplica a chance de achar as curiosidades de cada região (data/regioes.js)
  expedicoes: {
    slotsBase: 1,
    tiers: [
      { id: 'curta', nome: 'Curta', minutos: 5, unidades: 6, eficiencia: 1.25, chanceDrop: 0.5 },
      { id: 'media', nome: 'Média', minutos: 30, unidades: 36, eficiencia: 1.6, chanceDrop: 1 },
      { id: 'longa', nome: 'Longa', minutos: 120, unidades: 130, eficiencia: 2.0, chanceDrop: 2.5 },
    ],
  },

  // ---------- eventos aleatórios (tempos em milissegundos) ----------
  eventos: { primeiroMin: 180000, intervaloMin: 240000, intervaloMax: 540000, cooldownPadraoMin: 45 },

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
    capacidadeBase: 24,         // quantos itens cabem nas prateleiras (melhorias aumentam)
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
    itens: 100, eventos: 30, expedicoes: 1, receitas: 60, melhoriasPorOficio: 20, aventureiros: 40, lendarios: 10,
    regioes: 6, fornecedores: 12, eventos: 30, conquistas: 80,
  },
};
