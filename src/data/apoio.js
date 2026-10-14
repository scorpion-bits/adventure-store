// Apoio ao jogo: Pix, produtos da loja de apoio e a chave que confere os códigos de compra.
// Preços, nomes e o conteúdo de cada produto se editam aqui. Os temas pagos são decorações marcadas com `premium` em decoracoes.js.
export const APOIO = {
  // Pix da Scorpion Bits (chave CNPJ). `nome` e `cidade` aparecem no "copia e cola" (sem acento, em maiúsculas, até 25 e 15 letras).
  pix: { chave: '60345144000101', nome: 'SCORPION BITS', cidade: 'BRASIL' },

  // Onde o jogador avisa que pagou, para receber o código (escreva um e-mail, endereço de página ou @ de rede social). Vazio = só mostra
  // "fale com a Scorpion Bits pelo site".
  contato: '',
  site: 'https://scorpionbits.com/',

  // Chave PÚBLICA que confere os códigos (gerada por `npm run apoio:chaves`; a privada fica fora do git). Ela só confere, não emite.
  chavePublica: { kty: 'EC', crv: 'P-256', x: 'oI1bnjxNun4Z-Vym6FNpsPMwJiBLcgWvvG7lWbWwIh0', y: 'H4KGR0CPetwbZBibHnwJUvYIZ9n9McFxUYnM2ub4lRc' },

  // tipo: 'sem_anuncios' | 'tema' (decoração `decoracao`) | 'pacote' (inclui outros produtos). preco em reais.
  produtos: [
    { id: 'sem_anuncios', tipo: 'sem_anuncios', nome: 'Sem anúncios', desc: 'Tira os anúncios do jogo e libera as ofertas de melhoria sem precisar assistir a nada.', preco: 9.9 },
    { id: 'tema_noturno', tipo: 'tema', decoracao: 'noturno', nome: 'Loja Noturna', desc: 'Azul-noite e prata: a loja à luz das estrelas. Só muda a aparência.', preco: 4.9 },
    { id: 'tema_sakura', tipo: 'tema', decoracao: 'sakura', nome: 'Loja Sakura', desc: 'Madeira rosada e flores de cerejeira. Só muda a aparência.', preco: 4.9 },
    { id: 'tema_vulcanico', tipo: 'tema', decoracao: 'vulcanico', nome: 'Loja Vulcânica', desc: 'Rocha escura e brasa. Só muda a aparência.', preco: 4.9 },
    { id: 'tema_gelo', tipo: 'tema', decoracao: 'gelo', nome: 'Loja de Gelo', desc: 'Azul gelado de inverno. Só muda a aparência.', preco: 4.9 },
    { id: 'pacote_apoiador', tipo: 'pacote', nome: 'Pacote do Apoiador', desc: 'Sem anúncios + os quatro temas da loja, mais o selo de apoiador.',
      inclui: ['sem_anuncios', 'tema_noturno', 'tema_sakura', 'tema_vulcanico', 'tema_gelo'], preco: 19.9 },
  ],
};
