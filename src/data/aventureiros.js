// Tipos de aventureiro (clientes comuns).
// { id, nome, classe, temperamento, orcamento, prefere: [categorias], regiao, nivelRep, peso, falas }
//  - orcamento: o maior preço que ele paga, como múltiplo do preço de referência (1,1 = não paga "caro" de 1,35)
//  - peso: chance relativa de aparecer; nivelRep: reputação mínima da loja para ele vir
//  - falas: listas de frases por situação (chega, compra, recusa, barato, caro); o jogo sorteia uma
export const AVENTUREIROS = [
  { id: 'aprendiz_guerreiro', nome: 'Aprendiz de guerreiro', classe: 'guerreiro', temperamento: 'pechincheiro', orcamento: 1.05,
    prefere: ['armas', 'armaduras'], regiao: 'vila', nivelRep: 1, peso: 10,
    falas: {
      chega: ['Quero minha primeira espada de verdade!', 'Dizem que aqui tem equipamento bom.'],
      compra: ['Fechado! Vou vencer meu primeiro goblin!'],
      recusa: ['Está caro demais para mim...'],
      barato: ['Uau, que pechincha!'],
      caro: ['Hmm... é pesado para o meu bolso.'],
    } },
  { id: 'arqueira_novata', nome: 'Arqueira novata', classe: 'arqueiro', temperamento: 'curioso', orcamento: 1.1,
    prefere: ['armas', 'acessorios'], regiao: 'vila', nivelRep: 1, peso: 10,
    falas: {
      chega: ['Vocês têm algo para quem mira bem?', 'Só vim dar uma olhada...'],
      compra: ['Gostei! Levo!'],
      recusa: ['Vou pensar e volto depois.'],
      barato: ['Preço bom!'],
      caro: ['Ai, ai... será que vale?'],
    } },
  { id: 'maga_estudante', nome: 'Maga estudante', classe: 'mago', temperamento: 'desconfiado', orcamento: 1.15,
    prefere: ['magia', 'pocoes'], regiao: 'vila', nivelRep: 1, peso: 8,
    falas: {
      chega: ['Preciso de material para a prova da academia.', 'Isso aqui é de boa procedência?'],
      compra: ['Está dentro do esperado. Levo.'],
      recusa: ['Não confio nesse preço.'],
      barato: ['Barato demais... tem algo errado?'],
      caro: ['Isso é um assalto!'],
    } },
  { id: 'ladino_sorrateiro', nome: 'Ladino sorrateiro', classe: 'ladino', temperamento: 'sovina', orcamento: 1.0,
    prefere: ['armas', 'acessorios', 'curiosidades'], regiao: 'vila', nivelRep: 1, peso: 7,
    falas: {
      chega: ['Psiu... algo discreto, por favor.', 'Quanto custa isso? E aquilo?'],
      compra: ['Combinado. Nem vi você aqui.'],
      recusa: ['Muito caro. Eu arrumo de graça por aí.'],
      barato: ['Agora sim!'],
      caro: ['Você está louco?'],
    } },
  { id: 'clerigo_viajante', nome: 'Clérigo viajante', classe: 'clerigo', temperamento: 'generoso', orcamento: 1.4,
    prefere: ['pocoes', 'comida', 'acessorios'], regiao: 'vila', nivelRep: 1, peso: 9,
    falas: {
      chega: ['Que a luz abençoe esta loja!', 'Preciso abastecer minha bolsa de cura.'],
      compra: ['Que bênção! Obrigado!'],
      recusa: ['Que pena, que pena...'],
      barato: ['Que preço generoso!'],
      caro: ['Pelo bom serviço, pago com gosto.'],
    } },
  { id: 'bardo_cantor', nome: 'Bardo cantor', classe: 'bardo', temperamento: 'esnobe', orcamento: 1.5,
    prefere: ['acessorios', 'comida', 'curiosidades'], regiao: 'vila', nivelRep: 1, peso: 7,
    falas: {
      chega: ['Algo digno de uma balada, por favor!', 'Quero o que há de melhor.'],
      compra: ['Divino! Vai render uma canção.'],
      recusa: ['Que falta de elegância...'],
      barato: ['Tão barato? Duvido da qualidade.'],
      caro: ['O melhor tem seu preço, não é?'],
    } },
  { id: 'cacador_lobos', nome: 'Caçador de lobos', classe: 'cacador', temperamento: 'impaciente', orcamento: 1.2,
    prefere: ['armas', 'ferramentas', 'comida'], regiao: 'vila', nivelRep: 1, peso: 8,
    falas: {
      chega: ['Rápido, a caçada não espera!', 'Quanto tempo demora aqui?'],
      compra: ['Anotado. Já vou!'],
      recusa: ['Perdi meu tempo.'],
      barato: ['Ótimo, vamos logo!'],
      caro: ['Sem tempo para discutir... mas está caro.'],
    } },
  { id: 'alquimista_errante', nome: 'Alquimista errante', classe: 'alquimista', temperamento: 'leal', orcamento: 1.3,
    prefere: ['pocoes', 'magia', 'curiosidades'], regiao: 'vila', nivelRep: 1, peso: 8,
    falas: {
      chega: ['Voltei! Seu estoque de sempre, por favor.', 'Os frascos daqui são os melhores.'],
      compra: ['Sempre um prazer negociar com você.'],
      recusa: ['Hoje não, amigo.'],
      barato: ['Obrigado pela consideração!'],
      caro: ['Por você, eu aceito.'],
    } },
];
