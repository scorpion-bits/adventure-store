// Eventos aleatórios: aparecem de tempos em tempos com uma escolha. Cada escolha tem um ou mais resultados (sorteados
// pelo `peso`); cada resultado tem um texto e uma lista de efeitos.
// { id, titulo, texto, peso, requer: { nivel, nivelMax, regiao }, cooldown (minutos, padrão 45),
//   escolhas: [{ rotulo, dica, custo (ouro, desconta antes), resultados: [{ peso, texto, efeitos: [...] }] }] }
// Efeitos (veja core/events.js):
//   { tipo: 'ouro', valor }  { tipo: 'ouroPct', valor (fração do ouro atual) }  { tipo: 'rep', valor }
//   { tipo: 'material', id, qtd }  { tipo: 'materialAleatorio', regiao, qtd }  { tipo: 'item', id, qtd, qualidade }
//   { tipo: 'itemAleatorio', cat, qtd }  { tipo: 'perderItens', qtd }  { tipo: 'perderMateriais', qtd }
//   { tipo: 'bonus', efeito: { tipo, valor, oficio? }, minutos, rotulo }   (mesmos tipos de data/melhorias.js, por tempo)
//   { tipo: 'cliente', adv }  { tipo: 'clienteRico' }  { tipo: 'clientes', qtd }
//   { tipo: 'xpOficio', oficio, xp }  { tipo: 'oficinaAvanca', segundos }
const nada = (texto) => [{ texto, efeitos: [] }];
const so = (texto, ...efeitos) => [{ texto, efeitos }];

export const EVENTOS = [
  { id: 'feira_cidade', titulo: 'Dia de feira!', texto: 'A praça está cheia de gente. Uma barraca na porta atrairia a freguesia, mas dá trabalho montar.', peso: 8, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Montar uma barraca', dica: 'Custa 30 de ouro', custo: 30,
        resultados: so('A barraca chamou atenção: muita gente entrando na loja!', { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.5 }, minutos: 6, rotulo: 'Feira na praça' }) },
      { rotulo: 'Deixar como está', resultados: nada('A feira passa sem grandes novidades para a loja.') },
    ] },
  { id: 'ladrao_loja', titulo: 'Ladrão na loja!', texto: 'Um sujeito encapuzado está de olho nas suas prateleiras. Parece prestes a agarrar alguma coisa.', peso: 7, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Gritar "Pega ladrão!"', dica: 'Arriscado', resultados: [
        { peso: 6, texto: 'O ladrão tropeça e a guarda o prende. A vizinhança aplaude!', efeitos: [{ tipo: 'rep', valor: 3 }] },
        { peso: 4, texto: 'Ele escapa com um item debaixo do braço.', efeitos: [{ tipo: 'perderItens', qtd: 1 }] }] },
      { rotulo: 'Chamar a guarda', dica: 'Custa 20 de ouro', custo: 20, resultados: [
        { peso: 8, texto: 'A guarda chega rápido e o ladrão desiste.', efeitos: [{ tipo: 'rep', valor: 2 }] },
        { peso: 2, texto: 'A guarda demora, mas nada foi levado.', efeitos: [] }] },
      { rotulo: 'Fingir que não viu', resultados: so('O ladrão leva um item e some na multidão.', { tipo: 'perderItens', qtd: 2 }) },
    ] },
  { id: 'inspecao_fiscal', titulo: 'Inspeção do fiscal', texto: 'Um fiscal da cidade entra com uma prancheta e olha tudo com cara de poucos amigos.', peso: 6, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Pagar a taxa', dica: 'Custa 40 de ouro', custo: 40, resultados: nada('Taxa paga. O fiscal assina e vai embora.') },
      { rotulo: 'Mostrar os documentos', dica: 'Pode dar certo ou não', resultados: [
        { peso: 7, texto: 'Está tudo em ordem! O fiscal elogia a organização.', efeitos: [{ tipo: 'rep', valor: 3 }] },
        { peso: 3, texto: 'Faltava um carimbo. Multa!', efeitos: [{ tipo: 'ouroPct', valor: -0.08 }] }] },
    ] },
  { id: 'dragao_cidade', titulo: 'Dragão sobrevoa a cidade!', texto: 'Um rugido faz as janelas tremerem. Todo mundo corre para algum lugar: uns para longe, outros para as lojas de armas.', peso: 3, requer: { nivel: 5 }, cooldown: 90,
    escolhas: [
      { rotulo: 'Fechar as portas', dica: 'Seguro, mas vazio', resultados: so('A cidade esvazia. Poucos clientes por um tempo.', { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 0.5 }, minutos: 5, rotulo: 'Cidade assustada' }) },
      { rotulo: 'Vender equipamento aos corajosos', dica: 'Lucrativo e perigoso', resultados: [
        { peso: 6, texto: 'Heróis de última hora lotam a loja!', efeitos: [{ tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.7 }, minutos: 5, rotulo: 'Corrida aos heróis' }, { tipo: 'rep', valor: 3 }] },
        { peso: 4, texto: 'O dragão cospe fogo perto da loja: algum prejuízo, mas muita fama.', efeitos: [{ tipo: 'ouroPct', valor: -0.05 }, { tipo: 'rep', valor: 4 }] }] },
    ] },
  { id: 'festival', titulo: 'Festival da cidade', texto: 'Bandeirolas, música e comida pelas ruas. O clima é de festa e todo mundo está com a bolsa mais frouxa.', peso: 6, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Decorar a loja', dica: 'Custa 50 de ouro', custo: 50, resultados: so('A loja ficou linda! Clientes pagam um pouco mais e esperam felizes.', { tipo: 'bonus', efeito: { tipo: 'preco', valor: 1.12 }, minutos: 8, rotulo: 'Loja em festa' }, { tipo: 'bonus', efeito: { tipo: 'paciencia', valor: 1.3 }, minutos: 8, rotulo: 'Clima de festa' }) },
      { rotulo: 'Só aproveitar o movimento', resultados: so('Mais gente passando, mas sem destaque.', { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.15 }, minutos: 5, rotulo: 'Festival' }) },
    ] },
  { id: 'mercador_viajante', titulo: 'Mercador viajante', texto: 'Um mercador de carroça oferece um lote de materiais "direto da estrada". O preço parece bom... ou não.', peso: 7, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Comprar o lote', dica: 'Custa 60 de ouro', custo: 60, resultados: [
        { peso: 7, texto: 'O lote era bom! Materiais de sobra para a oficina.', efeitos: [{ tipo: 'materialAleatorio', regiao: 'vila', qtd: 14 }] },
        { peso: 3, texto: 'Metade era material de segunda, mas ainda deu para aproveitar algo.', efeitos: [{ tipo: 'materialAleatorio', regiao: 'vila', qtd: 6 }] }] },
      { rotulo: 'Recusar educadamente', resultados: nada('O mercador resmunga e segue viagem.') },
    ] },
  { id: 'nobre_curioso', titulo: 'Um nobre curioso', texto: 'Um nobre de capa bordada passeia pela loja examinando tudo com um monóculo.', peso: 5, requer: { nivel: 4 },
    escolhas: [
      { rotulo: 'Atendê-lo pessoalmente', dica: 'Ele costuma pagar bem', resultados: so('O nobre gostou do atendimento e deixou uma boa gorjeta.', { tipo: 'ouro', valor: 90 }, { tipo: 'rep', valor: 2 }) },
      { rotulo: 'Deixá-lo olhar sozinho', resultados: [
        { peso: 5, texto: 'Ele se divertiu e comprou uma lembrança.', efeitos: [{ tipo: 'ouro', valor: 25 }] },
        { peso: 5, texto: 'Saiu sem comprar nada, torcendo o nariz.', efeitos: [] }] },
    ] },
  { id: 'goteira', titulo: 'Goteira no telhado', texto: 'Começou a chover e há uma goteira bem em cima do depósito de materiais.', peso: 5, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Consertar agora', dica: 'Custa 35 de ouro', custo: 35, resultados: nada('Conserto rápido. Nada molhou.') },
      { rotulo: 'Colocar um balde e esperar', resultados: [
        { peso: 5, texto: 'O balde deu conta, por sorte.', efeitos: [] },
        { peso: 5, texto: 'Alguns materiais estragaram com a umidade.', efeitos: [{ tipo: 'perderMateriais', qtd: 3 }] }] },
    ] },
  { id: 'ratos_estoque', titulo: 'Ratos no estoque!', texto: 'Alguém ouviu roer na parte de trás. Ratos? Em pleno depósito?', peso: 5, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Adotar um gato', dica: 'Custa 25 de ouro', custo: 25, resultados: so('O gato resolveu o problema e ainda atrai clientes simpáticos.', { tipo: 'bonus', efeito: { tipo: 'paciencia', valor: 1.15 }, minutos: 10, rotulo: 'Gato da loja' }) },
      { rotulo: 'Ignorar', resultados: so('Os ratos fizeram a festa no depósito.', { tipo: 'perderMateriais', qtd: 4 }) },
    ] },
  { id: 'bardo_loja', titulo: 'Um bardo na porta', texto: 'Um bardo afina o alaúde na porta e pergunta se pode tocar um pouco para animar o ambiente.', peso: 6, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Deixar tocar', resultados: so('A música deixa os clientes mais pacientes e atrai curiosos.', { tipo: 'bonus', efeito: { tipo: 'paciencia', valor: 1.3 }, minutos: 6, rotulo: 'Música na loja' }, { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.1 }, minutos: 6, rotulo: 'Música na loja' }) },
      { rotulo: 'Pedir silêncio', resultados: nada('O bardo dá de ombros e vai tocar em outro lugar.') },
    ] },
  { id: 'cliente_vip', titulo: 'Cliente importante à porta', texto: 'Uma carruagem para em frente à loja. Um cliente de posses desce e olha em volta.', peso: 4, requer: { nivel: 3 },
    escolhas: [
      { rotulo: 'Recebê-lo com festa', resultados: so('Ele entra na fila, impressionado com a recepção.', { tipo: 'clienteRico' }) },
      { rotulo: 'Tratar como qualquer um', resultados: so('Ele entra na fila como todo mundo.', { tipo: 'clientes', qtd: 1 }) },
    ] },
  { id: 'concorrente', titulo: 'Uma loja concorrente abriu', texto: 'Na esquina oposta abriu uma loja nova, com cartaz grande e preços chamativos.', peso: 5, requer: { nivel: 3 },
    escolhas: [
      { rotulo: 'Fazer uma promoção', dica: 'Mais gente, menos ouro por venda', resultados: so('A promoção segurou a freguesia.', { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.4 }, minutos: 8, rotulo: 'Promoção' }, { tipo: 'bonus', efeito: { tipo: 'preco', valor: 0.9 }, minutos: 8, rotulo: 'Promoção' }) },
      { rotulo: 'Manter tudo como está', resultados: [
        { peso: 5, texto: 'Sua clientela é fiel. A concorrente não faz diferença.', efeitos: [{ tipo: 'rep', valor: 1 }] },
        { peso: 5, texto: 'Alguns clientes foram conferir a novidade.', efeitos: [{ tipo: 'bonus', efeito: { tipo: 'chegada', valor: 0.8 }, minutos: 6, rotulo: 'Concorrência' }] }] },
    ] },
  { id: 'tesouro_porao', titulo: 'Algo estranho no porão', texto: 'Uma tábua solta no porão esconde um buraco. Dentro dele, algo brilha.', peso: 4, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Cavar para ver', resultados: [
        { peso: 5, texto: 'Um baú velho com moedas e uma curiosidade!', efeitos: [{ tipo: 'ouro', valor: 70 }, { tipo: 'itemAleatorio', cat: 'curiosidades', qtd: 1 }] },
        { peso: 5, texto: 'Só um monte de terra e alguns ossos.', efeitos: [{ tipo: 'item', id: 'osso_antigo', qtd: 1 }] }] },
      { rotulo: 'Tapar o buraco', resultados: nada('Melhor não mexer no que não se conhece.') },
    ] },
  { id: 'pergaminho_perdido', titulo: 'Pergaminho perdido', texto: 'Um aventureiro deixou um pergaminho antigo no balcão. Está escrito em uma língua que você quase entende.', peso: 4, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Estudar o pergaminho', resultados: so('Você aprendeu um truque do ofício de encantamento.', { tipo: 'xpOficio', oficio: 'encantamento', xp: 40 }, { tipo: 'ouro', valor: 15 }) },
      { rotulo: 'Guardar para o dono', resultados: so('O dono voltou agradecido e deixou uma recompensa.', { tipo: 'rep', valor: 2 }) },
    ] },
  { id: 'aprendiz', titulo: 'Um aprendiz bate à porta', texto: 'Um jovem pede uma chance: diz que trabalha duro e aprende rápido.', peso: 5, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Aceitá-lo por um dia', dica: 'Custa 40 de ouro', custo: 40, resultados: so('O aprendiz adiantou bastante o trabalho da oficina.', { tipo: 'oficinaAvanca', segundos: 300 }) },
      { rotulo: 'Agradecer e dispensar', resultados: nada('O jovem agradece e segue procurando.') },
    ] },
  { id: 'crianca_curiosa', titulo: 'Criança curiosa', texto: 'Uma criança está grudada na vitrine, com os olhos arregalados para as espadas.', peso: 5, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Deixar segurar uma espada de madeira', resultados: so('A criança saiu radiante e contou para todos.', { tipo: 'rep', valor: 2 }) },
      { rotulo: 'Pedir que não encoste em nada', resultados: nada('A criança se afasta, um pouco desapontada.') },
    ] },
  { id: 'tempestade', titulo: 'Tempestade à vista', texto: 'O céu escureceu de repente. Vai cair o mundo lá fora.', peso: 5, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Acender a lareira', dica: 'Custa 15 de ouro', custo: 15, resultados: so('Quem se abriga na loja fica mais à vontade.', { tipo: 'bonus', efeito: { tipo: 'paciencia', valor: 1.4 }, minutos: 6, rotulo: 'Lareira acesa' }) },
      { rotulo: 'Esperar passar', resultados: so('Com a chuva, quase ninguém sai de casa.', { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 0.6 }, minutos: 5, rotulo: 'Tempestade' }) },
    ] },
  { id: 'bebado_baderna', titulo: 'Confusão no balcão', texto: 'Um cliente bebeu além da conta e está fazendo discursos para as prateleiras.', peso: 5, requer: { nivel: 1 },
    escolhas: [
      { rotulo: 'Oferecer uma caneca de água', resultados: so('Ele se acalma e agradece a gentileza.', { tipo: 'rep', valor: 1 }) },
      { rotulo: 'Pedir para sair', resultados: [
        { peso: 6, texto: 'Ele sai resmungando, sem confusão.', efeitos: [] },
        { peso: 4, texto: 'Na saída derruba uma pilha de mercadorias.', efeitos: [{ tipo: 'perderItens', qtd: 1 }] }] },
    ] },
  { id: 'vendedor_ambulante', titulo: 'Vendedor ambulante', texto: 'Um vendedor oferece uma caixa de mercadorias prontas por um preço camarada.', peso: 5, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Comprar a caixa', dica: 'Custa 70 de ouro', custo: 70, resultados: [
        { peso: 7, texto: 'Itens bons, direto para a prateleira.', efeitos: [{ tipo: 'itemAleatorio', cat: 'armas', qtd: 2 }, { tipo: 'itemAleatorio', cat: 'pocoes', qtd: 2 }] },
        { peso: 3, texto: 'A caixa tinha pouca coisa, mas serviu.', efeitos: [{ tipo: 'itemAleatorio', cat: 'comida', qtd: 3 }] }] },
      { rotulo: 'Dispensar', resultados: nada('O vendedor segue seu caminho.') },
    ] },
  { id: 'heroi_aposentado', titulo: 'Herói aposentado', texto: 'Um velho aventureiro entra devagar, olha tudo e sorri: "Já tive uma loja assim na cabeça."', peso: 3, requer: { nivel: 5 }, cooldown: 120,
    escolhas: [
      { rotulo: 'Conversar sobre histórias', resultados: so('Ele conta aventuras incríveis e deixa um presente.', { tipo: 'rep', valor: 3 }, { tipo: 'itemAleatorio', cat: 'curiosidades', qtd: 1 }) },
      { rotulo: 'Oferecer um desconto de veterano', resultados: so('Ele compra e espalha o seu nome pela cidade.', { tipo: 'ouro', valor: -10 }, { tipo: 'rep', valor: 4 }) },
    ] },
  { id: 'caridade', titulo: 'Pedido de caridade', texto: 'Uma moça do orfanato pede uma doação para o inverno que vem aí.', peso: 5, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Doar 50 de ouro', custo: 50, resultados: so('A vizinhança fica sabendo da sua generosidade.', { tipo: 'rep', valor: 4 }) },
      { rotulo: 'Doar alguns pães', resultados: so('Foi o que deu para fazer. Agradeceram do coração.', { tipo: 'perderItens', qtd: 2 }, { tipo: 'rep', valor: 2 }) },
      { rotulo: 'Dizer que não pode agora', resultados: nada('Ela entende e segue para a próxima porta.') },
    ] },
  { id: 'premio_loja', titulo: 'Prêmio da cidade', texto: 'Um arauto anuncia que a sua loja está entre as mais queridas da cidade este mês.', peso: 3, requer: { nivel: 6 }, cooldown: 120,
    escolhas: [
      { rotulo: 'Receber o prêmio', resultados: so('Aplausos! O prêmio vem com um bom dinheiro e muita fama.', { tipo: 'ouro', valor: 150 }, { tipo: 'rep', valor: 5 }) },
    ] },
  { id: 'cometa', titulo: 'Cometa no céu', texto: 'Um cometa cruza o céu da cidade. Os magos juram que o dia é propício para coisas mágicas.', peso: 4, requer: { nivel: 4 },
    escolhas: [
      { rotulo: 'Enfeitar a vitrine de magia', dica: 'Custa 30 de ouro', custo: 30, resultados: so('Os clientes se animam: vendas rendem mais.', { tipo: 'bonus', efeito: { tipo: 'preco', valor: 1.15 }, minutos: 8, rotulo: 'Noite do cometa' }) },
      { rotulo: 'Só observar o céu', resultados: nada('Bonito, mas sem efeito no caixa.') },
    ] },
  { id: 'lua_cheia', titulo: 'Noite de lua cheia', texto: 'A lua está imensa. Quem sai à noite está mais ousado... e mais gastador.', peso: 4, requer: { nivel: 3 },
    escolhas: [
      { rotulo: 'Estender o horário', resultados: so('Mais gente aparece, atraída pela lua.', { tipo: 'bonus', efeito: { tipo: 'chegada', valor: 1.3 }, minutos: 7, rotulo: 'Lua cheia' }) },
      { rotulo: 'Fechar mais cedo', resultados: nada('Uma noite tranquila para descansar.') },
    ] },
  { id: 'greve_fornecedores', titulo: 'Fornecedores em greve', texto: 'Os carroceiros pararam: materiais chegam atrasados e os preços sobem.', peso: 4, requer: { nivel: 3 },
    escolhas: [
      { rotulo: 'Pagar mais para furar a fila', dica: 'Custa 40 de ouro', custo: 40, resultados: nada('Seu pedido chegou na hora. Nada mudou.') },
      { rotulo: 'Esperar a greve passar', resultados: so('Os materiais ficam mais caros por um tempo.', { tipo: 'bonus', efeito: { tipo: 'compra', valor: 1.25 }, minutos: 10, rotulo: 'Greve dos carroceiros' }) },
    ] },
  { id: 'imposto_real', titulo: 'Coletor de impostos', texto: 'O coletor do reino chegou para recolher o imposto trimestral. Ele faz questão de ver o livro-caixa.', peso: 4, requer: { nivel: 4 },
    escolhas: [
      { rotulo: 'Pagar o imposto', resultados: so('Imposto pago. Sem problemas.', { tipo: 'ouroPct', valor: -0.06 }) },
      { rotulo: 'Pedir um prazo', resultados: [
        { peso: 6, texto: 'O coletor aceitou um prazo menor... e uma multa pequena.', efeitos: [{ tipo: 'ouroPct', valor: -0.03 }] },
        { peso: 4, texto: 'Ele não gostou nada: multa pesada.', efeitos: [{ tipo: 'ouroPct', valor: -0.12 }, { tipo: 'rep', valor: -2 }] }] },
    ] },
  { id: 'espiao_rival', titulo: 'Um espião na loja', texto: 'Um estranho anota preços e fornecedores num caderninho. Parece bisbilhotar a concorrência.', peso: 3, requer: { nivel: 5 },
    escolhas: [
      { rotulo: 'Confrontar o espião', resultados: [
        { peso: 5, texto: 'Ele foge deixando cair o caderno com anotações úteis.', efeitos: [{ tipo: 'ouro', valor: 60 }] },
        { peso: 5, texto: 'Ele nega tudo e vai embora.', efeitos: [] }] },
      { rotulo: 'Fingir não ter percebido', resultados: nada('Ele anota mais um pouco e sai.') },
    ] },
  { id: 'sorteio_cidade', titulo: 'Sorteio da cidade', texto: 'Todo lojista recebe um bilhete para o sorteio de fim de mês. Basta pagar uma pequena taxa.', peso: 4, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Comprar o bilhete', dica: 'Custa 20 de ouro', custo: 20, resultados: [
        { peso: 1, texto: 'PRÊMIO MÁXIMO! A loja inteira comemora.', efeitos: [{ tipo: 'ouro', valor: 400 }] },
        { peso: 3, texto: 'Prêmio de consolação: algo útil.', efeitos: [{ tipo: 'ouro', valor: 45 }] },
        { peso: 6, texto: 'Dessa vez não deu.', efeitos: [] }] },
      { rotulo: 'Não participar', resultados: nada('Dinheiro guardado é dinheiro seguro.') },
    ] },
  { id: 'lobos_floresta', titulo: 'Lobos na estrada', texto: 'Caçadores da floresta contam que uma matilha atacou a estrada. As peles estão por toda parte.', peso: 4, requer: { nivel: 5, regiao: 'floresta' },
    escolhas: [
      { rotulo: 'Comprar peles dos caçadores', dica: 'Custa 80 de ouro', custo: 80, resultados: so('Um lote bom de peles e garras.', { tipo: 'material', id: 'pele_lobo', qtd: 6 }, { tipo: 'material', id: 'garra', qtd: 3 }) },
      { rotulo: 'Oferecer armas aos caçadores', resultados: so('Eles agradeceram e deixaram uma recompensa.', { tipo: 'ouro', valor: 55 }, { tipo: 'rep', valor: 2 }) },
    ] },
  { id: 'desabamento', titulo: 'Desabamento na mina', texto: 'Um túnel das Montanhas de Ferro desabou. Mineiros precisam de ferramentas e remédios.', peso: 4, requer: { nivel: 10, regiao: 'montanhas' },
    escolhas: [
      { rotulo: 'Doar ferramentas e poções', resultados: so('Os mineiros nunca vão esquecer.', { tipo: 'perderItens', qtd: 3 }, { tipo: 'rep', valor: 6 }) },
      { rotulo: 'Vender o que precisarem', resultados: so('Boa venda, mas alguns torceram o nariz.', { tipo: 'ouro', valor: 220 }, { tipo: 'rep', valor: -1 }) },
    ] },
  { id: 'miragem', titulo: 'Miragem no deserto', texto: 'Uma caravana jura ter visto uma cidade de ouro no horizonte. Eles estão dispostos a pagar por mapas e provisões.', peso: 4, requer: { nivel: 16, regiao: 'deserto' },
    escolhas: [
      { rotulo: 'Vender provisões à caravana', resultados: [
        { peso: 7, texto: 'A caravana pagou bem e deixou especiarias de presente.', efeitos: [{ tipo: 'ouro', valor: 300 }, { tipo: 'material', id: 'especiaria', qtd: 4 }] },
        { peso: 3, texto: 'A caravana sumiu sem pagar tudo.', efeitos: [{ tipo: 'ouro', valor: 100 }] }] },
      { rotulo: 'Não acreditar na história', resultados: nada('Miragem é miragem.') },
    ] },
  { id: 'nevoa_brejo', titulo: 'Névoa no pântano', texto: 'Uma névoa verde subiu do Pântano Esmeralda até a vila. Cheira a ervas... e a encrenca.', peso: 4, requer: { nivel: 22, regiao: 'pantano' },
    escolhas: [
      { rotulo: 'Coletar a névoa em frascos', dica: 'Custa 100 de ouro', custo: 100, resultados: [
        { peso: 6, texto: 'A essência rendeu ingredientes raros.', efeitos: [{ tipo: 'material', id: 'essencia_brejo', qtd: 2 }, { tipo: 'material', id: 'musgo', qtd: 4 }] },
        { peso: 4, texto: 'Os frascos racharam, mas sobrou algo.', efeitos: [{ tipo: 'material', id: 'musgo', qtd: 3 }] }] },
      { rotulo: 'Fechar as janelas', resultados: nada('A névoa passa sem incomodar.') },
    ] },
  { id: 'tesouro_dragao', titulo: 'Ninho abandonado', texto: 'Caçadores de dragão encontraram um ninho vazio e querem vender o que acharam, sem fazer perguntas.', peso: 3, requer: { nivel: 30, regiao: 'dragao' }, cooldown: 120,
    escolhas: [
      { rotulo: 'Comprar tudo', dica: 'Custa 600 de ouro', custo: 600, resultados: [
        { peso: 7, texto: 'Escamas e ouro de dragão! Um achado enorme.', efeitos: [{ tipo: 'material', id: 'escama_dragao', qtd: 2 }, { tipo: 'material', id: 'ouro_dragao', qtd: 3 }] },
        { peso: 3, texto: 'Uma parte era falsificada, mas ainda valeu.', efeitos: [{ tipo: 'material', id: 'ouro_dragao', qtd: 2 }] }] },
      { rotulo: 'Recusar', resultados: nada('Melhor não se meter com isso.') },
    ] },
  { id: 'visita_real', titulo: 'Visita real!', texto: 'Um arauto anuncia: a família real quer conhecer a loja da qual todos falam.', peso: 2, requer: { nivel: 25 }, cooldown: 180,
    escolhas: [
      { rotulo: 'Preparar uma recepção digna', dica: 'Custa 500 de ouro', custo: 500, resultados: so('A realeza adorou e a loja ganhou o selo real!', { tipo: 'rep', valor: 25 }, { tipo: 'ouro', valor: 1400 }, { tipo: 'bonus', efeito: { tipo: 'preco', valor: 1.15 }, minutos: 15, rotulo: 'Selo real' }) },
      { rotulo: 'Receber com simplicidade', resultados: so('Simples e sincero. A realeza gostou.', { tipo: 'rep', valor: 8 }, { tipo: 'ouro', valor: 300 }) },
    ] },
  { id: 'anao_forja', titulo: 'Um anão e sua forja', texto: 'Um anão ferreiro de passagem oferece usar a sua forja por algumas horas, em troca de algumas moedas.', peso: 4, requer: { nivel: 8 },
    escolhas: [
      { rotulo: 'Aceitar a ajuda', dica: 'Custa 80 de ouro', custo: 80, resultados: so('A forja não parou um instante.', { tipo: 'xpOficio', oficio: 'ferraria', xp: 80 }, { tipo: 'oficinaAvanca', segundos: 600 }) },
      { rotulo: 'Recusar', resultados: nada('Ele dá de ombros e segue viagem.') },
    ] },
  { id: 'pedido_urgente', titulo: 'Encomenda urgente', texto: 'Um capitão da guarda precisa de equipamento para a patrulha da noite e paga bem por quem atender rápido.', peso: 5, requer: { nivel: 3 },
    escolhas: [
      { rotulo: 'Atendê-lo agora', resultados: so('O capitão entra na fila com pressa.', { tipo: 'cliente', adv: 'soldado_guarda' }, { tipo: 'rep', valor: 1 }) },
      { rotulo: 'Pedir que volte mais tarde', resultados: nada('O capitão procura outra loja.') },
    ] },
  { id: 'pagina_perdida', titulo: 'Receita antiga', texto: 'Entre papéis velhos você encontra a receita de um prato esquecido, anotada à mão.', peso: 4, requer: { nivel: 2 },
    escolhas: [
      { rotulo: 'Testar na cozinha', resultados: [
        { peso: 6, texto: 'Ficou delicioso! A cozinha ganhou prática.', efeitos: [{ tipo: 'xpOficio', oficio: 'culinaria', xp: 50 }, { tipo: 'item', id: 'bolo_mel', qtd: 2 }] },
        { peso: 4, texto: 'Queimou um pouco, mas deu para aprender algo.', efeitos: [{ tipo: 'xpOficio', oficio: 'culinaria', xp: 20 }] }] },
      { rotulo: 'Guardar de lembrança', resultados: nada('Uma bela recordação.') },
    ] },
  { id: 'excursao_guilda', titulo: 'Excursão da guilda', texto: 'Um grupo grande de aventureiros da guilda entra de uma vez só, todos querendo ser atendidos.', peso: 4, requer: { nivel: 4 },
    escolhas: [
      { rotulo: 'Dar conta de todos', resultados: so('Correria! Mas valeu a pena.', { tipo: 'clientes', qtd: 3 }, { tipo: 'rep', valor: 1 }) },
      { rotulo: 'Pedir que voltem em grupos pequenos', resultados: so('Eles entendem e voltam aos poucos.', { tipo: 'clientes', qtd: 1 }) },
    ] },
];
