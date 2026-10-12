// Tutorial curto (primeiros 2 minutos). Cada passo mostra um balão; avança com o botão ("botao") ou quando o jogador
// faz a ação ("espera": nomes de eventos do game; qualquer um deles basta). "aba" = aba que o passo pede (ganha um aviso).
// Para mudar o tutorial basta editar esta lista; o jogador pode pulá-lo ou revê-lo nas configurações.
export const TUTORIAL = [
  { id: 'boas-vindas', aba: 'loja', botao: 'Vamos lá',
    texto: 'Bem-vindo à sua loja! Aventureiros chegam pedindo itens. Você escolhe o preço de cada venda.' },
  { id: 'vender', aba: 'loja', espera: ['venda', 'recusa'],
    texto: 'Toque num dos três preços. Barato agrada e rende reputação; caro rende mais ouro, mas pode espantar o cliente.' },
  { id: 'mercado', aba: 'mercado', espera: ['compra'],
    texto: 'O estoque é limitado! No Mercado, compre materiais para produzir mais itens.' },
  { id: 'oficina', aba: 'oficina', espera: ['produziu'],
    texto: 'Agora, na Oficina, escolha uma receita e toque em Produzir.' },
  { id: 'coletar', aba: 'oficina', espera: ['coletou'],
    texto: 'Quando o tempo acabar, toque em Coletar tudo para levar os itens às prateleiras. Isso continua mesmo com o jogo fechado.' },
  { id: 'fim', aba: 'melhorias', botao: 'Entendi',
    texto: 'Pronto! Com ouro e reputação você amplia a loja, contrata equipe e abre novos ofícios em Melhorias.' },
];
