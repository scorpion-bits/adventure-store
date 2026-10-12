// Tutorial guiado. Cada passo mostra um balão, leva o jogador para a tela certa e destaca o botão a tocar.
// Campos de um passo:
//  - id, texto (curto), aba: tela do passo (o tutorial muda de aba sozinho), sub: sub-aba dessa tela (opcional)
//  - botao: rótulo do botão que avança o passo; OU espera: eventos do game (qualquer um avança) — ao fazer a ação, o passo termina
//  - alvo: o que destacar com um anel pulsante. Texto = nome de um botão da tela (ou o começo do nome, ex.: 'produzir:r_adaga_bronze').
//    { material: true } no passo "compra" destaca o botão +1 do material que ainda falta para a receita guiada (veja `compra`)
//  - compra: id de receita; o passo só termina quando o depósito tem todos os materiais dela
//  - acelerar: depois de alguns segundos o tutorial termina sozinho a produção em andamento (o primeiro item sai logo)
// Para mudar o tutorial basta editar esta lista; o jogador pode pulá-lo ou revê-lo nas configurações.
export const RECEITA_GUIADA = 'r_adaga_bronze';

export const TUTORIAL = [
  { id: 'boas-vindas', aba: 'loja', botao: 'Vamos lá',
    texto: 'Bem-vindo à sua loja! Aventureiros passam por aqui procurando equipamento, poções e comida.' },
  { id: 'cliente', aba: 'loja', botao: 'Entendi',
    texto: 'Cada cliente pede um item, um tipo de item ou "me surpreenda". O pedido aparece em laranja; a barra verde é a paciência dele.' },
  { id: 'vender', aba: 'loja', espera: ['venda', 'recusa'], alvo: 'preco:justo',
    texto: 'Escolha o preço: barato agrada e rende reputação; caro rende mais ouro, mas pode espantar o cliente. Toque em Justo.' },
  { id: 'estoque', aba: 'loja', botao: 'Entendi',
    texto: 'O estoque é limitado (veja as prateleiras). Se faltar o item pedido, ofereça um parecido (ele aceita menos) ou dispense o cliente.' },
  { id: 'reputacao', aba: 'loja', botao: 'Legal',
    texto: 'Cada venda rende reputação (barra no topo). Com ela chegam clientes novos, itens novos, regiões e melhorias.' },
  { id: 'mercado', aba: 'mercado', espera: ['compra'], compra: RECEITA_GUIADA, alvo: { material: true },
    texto: 'Para ter mais itens, você os fabrica. Comece pelo Mercado: toque nos +1 destacados para comprar 2 Barras de cobre e 1 Carvão.' },
  { id: 'oficina', aba: 'oficina', espera: ['produziu'], alvo: `produzir:${RECEITA_GUIADA}`,
    texto: 'Agora, na Oficina: cada ofício tem suas receitas. Toque em Produzir na Adaga de cobre.' },
  { id: 'coletar', aba: 'oficina', espera: ['coletou'], alvo: 'coletarTudo', acelerar: true,
    texto: 'Produzir leva tempo (e continua com o jogo fechado). Vou acelerar esta; quando terminar, toque em Coletar tudo.' },
  { id: 'niveis', aba: 'oficina', botao: 'Entendi',
    texto: 'Fabricar dá experiência ao ofício, e cada nível libera receitas melhores. Os cadeados são ofícios novos: abrem com ouro e reputação.' },
  { id: 'mapa', aba: 'mercado', sub: 'mapa', botao: 'Entendi',
    texto: 'No Mapa, batedores buscam materiais por você, mesmo com o jogo fechado. Regiões novas abrem com reputação.' },
  { id: 'melhorias', aba: 'melhorias', botao: 'Entendi',
    texto: 'Em Melhorias: amplie a loja, contrate atendente, artesão e vendedor, e evolua a árvore de cada ofício.' },
  { id: 'hoje', aba: 'aventureiros', sub: 'hoje', botao: 'Entendi',
    texto: 'Em Aventureiros: bônus do dia, encomendas, um cliente especial e as metas da semana. Volte todo dia!' },
  { id: 'fim', aba: 'loja', botao: 'Começar a vender',
    texto: 'Pronto! Dá para rever estas dicas em Configurações. Boa sorte, comerciante!' },
];
