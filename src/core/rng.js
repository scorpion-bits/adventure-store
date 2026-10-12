// Números aleatórios com semente (determinísticos): o simulador usa uma semente fixa e as
// encomendas/ofertas do dia usam a data, então todo mundo vê o mesmo dia.

// hash de texto -> inteiro de 32 bits (xmur3)
export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// gerador mulberry32: devolve uma função que dá números em [0, 1)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cria um gerador com utilitários. `seed` pode ser número ou texto (ex.: "2026-10-12:encomendas").
export function createRng(seed = Date.now()) {
  const next = mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
  const rng = {
    next,
    // inteiro em [min, max]
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    // número em [min, max)
    between: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    // sorteio com pesos: `weight(item)` devolve o peso (>= 0)
    weighted(list, weight = (x) => x.peso ?? 1) {
      let total = 0;
      for (const it of list) total += Math.max(0, weight(it));
      if (total <= 0) return list.length ? list[0] : undefined;
      let r = next() * total;
      for (const it of list) {
        r -= Math.max(0, weight(it));
        if (r < 0) return it;
      }
      return list[list.length - 1];
    },
    // embaralha uma cópia
    shuffle(list) {
      const a = [...list];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
  return rng;
}
