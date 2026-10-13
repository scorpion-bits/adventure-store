// Tutorial guiado, em sequências curtas: "inicio" (a Loja, os primeiros minutos) e uma sequência para cada aba, que começa
// sozinha na primeira vez que o jogador entra nela. As abas ainda não vistas ganham um pontinho de aviso.
// Cada passo mostra um balão, destaca o botão a tocar (anel pulsante) e, quando preciso, muda de sub-aba sozinho.
// Campos de um passo:
//  - id, texto (curto), aba: tela do passo, sub: sub-aba dessa tela (opcional)
//  - botao: rótulo do botão que avança o passo; OU espera: eventos do game (qualquer um avança) — ao fazer a ação, o passo termina
//  - alvo: botão a destacar. Texto = nome do botão (ou o começo do nome, ex.: 'produzir:r_adaga_bronze'); { termina: ':x1' } = o
//    primeiro botão cujo nome termina assim
//  - presente: id de receita; no começo do passo o jogo completa os materiais dela (se faltarem), para o passo poder ser feito
//  - acelerar: depois de alguns segundos o tutorial termina sozinho a produção em andamento (o primeiro item sai logo)
// Para mudar o tutorial basta editar estas listas; o jogador pode pulá-lo ou revê-lo nas configurações.
export const RECEITA_GUIADA = 'r_adaga_bronze';

export const SEQUENCIAS = {
  // ---------- primeiros minutos: só a Loja ----------
  inicio: [
    { id: 'boas-vindas', aba: 'loja', botao: 'Vamos lá',
      texto: 'Bem-vindo à sua loja! Aventureiros passam por aqui procurando equipamento, poções e comida.' },
    { id: 'cliente', aba: 'loja', botao: 'Entendi',
      texto: 'Cada cliente pede um item, um tipo de item ou "me surpreenda". O pedido aparece em laranja; a barra verde é a paciência dele.' },
    { id: 'vender', aba: 'loja', espera: ['venda', 'recusa'], alvo: 'preco:justo',
      texto: 'Escolha o preço; a % é a chance de o cliente aceitar. Barato rende reputação, caro rende mais ouro mas pode espantá-lo. Toque em Justo.' },
    { id: 'estoque', aba: 'loja', botao: 'Entendi',
      texto: 'O estoque é limitado (veja as prateleiras). Se faltar o item pedido, ofereça um parecido (ele aceita menos) ou dispense o cliente.' },
    { id: 'explorar', aba: 'loja', botao: 'Vamos explorar',
      texto: 'Cada venda rende reputação (barra no topo). Para ter mais itens, visite as outras abas: as que ainda não viu estão com um pontinho.' },
  ],

  // ---------- uma sequência por aba, na primeira visita ----------
  oficina: [
    { id: 'oficina-intro', aba: 'oficina', botao: 'Entendi',
      texto: 'A Oficina transforma materiais em itens. Cada ofício (no alto) tem suas receitas; a Ferraria já vem aberta. Os cadeados abrem com ouro e reputação.' },
    { id: 'oficina-produzir', aba: 'oficina', espera: ['produziu'], alvo: `produzir:${RECEITA_GUIADA}`, presente: RECEITA_GUIADA,
      texto: 'Vou dar os materiais da Adaga de cobre, por conta da casa. Toque em Produzir.' },
    { id: 'oficina-coletar', aba: 'oficina', espera: ['coletou'], alvo: 'coletarTudo', acelerar: true,
      texto: 'Produzir leva tempo (e continua com o jogo fechado). Vou acelerar esta; quando terminar, toque em Coletar tudo.' },
    { id: 'oficina-niveis', aba: 'oficina', botao: 'Entendi',
      texto: 'Fabricar dá experiência ao ofício, e cada nível libera receitas melhores. Os materiais vêm do Mercado.' },
  ],
  mercado: [
    { id: 'mercado-intro', aba: 'mercado', botao: 'Entendi',
      texto: 'No Mercado, fornecedores vendem os materiais das receitas. Preços e estoques mudam todo dia, à meia-noite.' },
    { id: 'mercado-comprar', aba: 'mercado', espera: ['compra'], alvo: { termina: ':x1' },
      texto: 'Toque em +1 para comprar uma unidade. O "Máx" compra o que o ouro e o estoque do fornecedor permitirem.' },
    { id: 'mercado-mapa', aba: 'mercado', sub: 'mapa', botao: 'Entendi',
      texto: 'No Mapa, batedores buscam materiais por você, mesmo com o jogo fechado. Regiões novas abrem com reputação.' },
    { id: 'mercado-minijogo', aba: 'mercado', sub: 'minijogo', botao: 'Entendi',
      texto: 'Sem material? No Mini-jogo você acha pares de cartas e ganha um pouco de cada material. São poucas partidas, que voltam com o tempo.' },
  ],
  aventureiros: [
    { id: 'aventureiros-bonus', aba: 'aventureiros', sub: 'hoje', espera: ['bonusDiario'], alvo: 'bonus',
      texto: 'Todo dia tem um bônus de presença. Toque em Coletar bônus: dias seguidos rendem cada vez mais.' },
    { id: 'aventureiros-hoje', aba: 'aventureiros', sub: 'hoje', botao: 'Entendi',
      texto: 'Aqui também ficam as encomendas do dia, o cliente especial (que paga mais se você o atender bem) e as metas da semana, com baú.' },
    { id: 'aventureiros-colecao', aba: 'aventureiros', sub: 'colecao', botao: 'Entendi',
      texto: 'A Coleção guarda tudo o que você já descobriu. Em Lendários, clientes raros trazem histórias em capítulos.' },
  ],
  melhorias: [
    { id: 'melhorias-loja', aba: 'melhorias', sub: 'loja', botao: 'Entendi',
      texto: 'Melhorias gastam ouro e reputação: mais lugar na fila, prateleiras maiores, balcão e decoração.' },
    { id: 'melhorias-equipe', aba: 'melhorias', sub: 'equipe', botao: 'Entendi',
      texto: 'A Equipe trabalha por você: o atendente vende, o artesão cuida da oficina e o vendedor atende com o jogo fechado.' },
    { id: 'melhorias-oficios', aba: 'melhorias', sub: 'oficios', botao: 'Entendi',
      texto: 'Cada ofício tem a sua árvore: velocidade, qualidade, capacidade e rendimento.' },
    { id: 'melhorias-expandir', aba: 'melhorias', sub: 'expandir', botao: 'Entendi',
      texto: 'Mais para a frente, "Expandir" leva a loja a uma nova cidade e dá Herança: bônus permanentes. Conquistas dão prêmios pelo caminho.' },
  ],
};

// a sequência da aba, se houver
export const sequenciaDaAba = (aba) => SEQUENCIAS[aba] && aba !== 'inicio' ? SEQUENCIAS[aba] : null;
export const ABAS_COM_TUTORIAL = Object.keys(SEQUENCIAS).filter((k) => k !== 'inicio');
