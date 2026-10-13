// Curva de volume da música. O ouvido percebe o volume de forma logarítmica: com uma barra linear, 10% ainda soa alto.
// Aqui o ganho cresce com o quadrado do valor da barra, então os níveis baixos ficam realmente baixos.
export const GANHO_MAXIMO_MUSICA = 0.35;   // ganho com a barra no 100%: a música nunca passa disso, para não cobrir os efeitos

export const ganhoDaMusica = (volume) => {
  const v = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0));
  return v * v * GANHO_MAXIMO_MUSICA;
};
