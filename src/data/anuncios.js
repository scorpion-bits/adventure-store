// Anúncios do jogo. Hoje só existem os da própria Scorpion Bits ("da casa", sem rastreamento): aparecem na oferta
// "assista e leve a melhoria de graça". Quem compra "Sem anúncios" (data/apoio.js) leva a oferta de graça, sem assistir.
// Para ligar anúncios de terceiros (AdSense, AdMob...), o site define `window.scorpionbitsAds.recompensado()` (veja o README):
// o jogo usa essa função no lugar do anúncio da casa. O consentimento (LGPD) de anúncios de terceiros é do site.
export const ANUNCIOS = {
  // anúncios da casa, mostrados em rodízio. { id, titulo, texto, cta, url }
  casa: [
    { id: 'site', titulo: 'Scorpion Bits', texto: 'Jogos e projetos feitos com carinho no Brasil. Conheça o que mais a gente anda criando.', cta: 'Visitar o site', url: 'https://scorpionbits.com/' },
  ],
  // a oferta de melhoria: de vez em quando uma melhoria cara pode ser levada de graça depois de assistir a um anúncio
  oferta: {
    duracaoS: 15,        // tempo do anúncio da casa até liberar a recompensa
    cooldownH: 6,        // intervalo mínimo entre uma oferta resgatada e a próxima
    maxPorDia: 3,        // no máximo, por dia
    nivelMin: 3,         // reputação a partir da qual as ofertas aparecem
    fracaoOuro: 0.35,    // a melhoria oferecida custa pelo menos esta fração do ouro que o jogador tem (senão não valeria a pena)
  },
};
