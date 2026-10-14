// Decorações: mudam a aparência da loja (cores da cena) e dão um pequeno bônus. Uma fica em uso por vez.
// { id, nome, desc, custo, nivelRep, cores: { parede, piso, balcao, prateleira }, efeitos, premium }
//  - premium: id do produto da loja de apoio (data/apoio.js) que libera o tema; só muda a aparência (sem efeitos) e não se compra com ouro
export const DECORACOES = [
  { id: 'rustico', nome: 'Rústico', desc: 'Madeira simples, como toda loja começa.', custo: 0, nivelRep: 1,
    cores: { parede: 0x2e2119, piso: 0x42301f, balcao: 0x8a5a33, prateleira: 0x8a5a33 }, efeitos: [] },
  { id: 'taverna', nome: 'Taverna', desc: 'Calor de lareira: mais gente entra para ver.', custo: 300, nivelRep: 2,
    cores: { parede: 0x3a2318, piso: 0x4f2f1c, balcao: 0xa5532c, prateleira: 0x9a5a30 }, efeitos: [{ tipo: 'chegada', valor: 1.08 }] },
  { id: 'elfico', nome: 'Élfico', desc: 'Madeira clara e folhas: o preço parece mais justo.', custo: 800, nivelRep: 5,
    cores: { parede: 0x23352a, piso: 0x35472f, balcao: 0xb59a5a, prateleira: 0x9a8a4a }, efeitos: [{ tipo: 'preco', valor: 1.03 }] },
  { id: 'anao', nome: 'Anão', desc: 'Pedra e ferro: clientes se sentem seguros e esperam mais.', custo: 1800, nivelRep: 8,
    cores: { parede: 0x2a2d33, piso: 0x3a3d44, balcao: 0x6d7480, prateleira: 0x5c636e }, efeitos: [{ tipo: 'paciencia', valor: 1.2 }] },
  { id: 'real', nome: 'Real', desc: 'Veludo e ouro: a loja dos nobres.', custo: 6000, nivelRep: 14,
    cores: { parede: 0x2e2040, piso: 0x40305a, balcao: 0xc79a3a, prateleira: 0xb88a30 }, efeitos: [{ tipo: 'chegada', valor: 1.1 }, { tipo: 'preco', valor: 1.05 }] },

  // ---- temas da loja de apoio (pagos; só aparência) ----
  { id: 'noturno', nome: 'Loja Noturna', desc: 'Azul-noite e prata: a loja à luz das estrelas.', custo: 0, nivelRep: 1, premium: 'tema_noturno',
    cores: { parede: 0x161a33, piso: 0x232a4a, balcao: 0x6b7bb0, prateleira: 0x5a6aa0 }, efeitos: [] },
  { id: 'sakura', nome: 'Loja Sakura', desc: 'Madeira rosada e flores de cerejeira.', custo: 0, nivelRep: 1, premium: 'tema_sakura',
    cores: { parede: 0x3b2430, piso: 0x573444, balcao: 0xe08fa8, prateleira: 0xc97c95 }, efeitos: [] },
  { id: 'vulcanico', nome: 'Loja Vulcânica', desc: 'Rocha escura e brasa.', custo: 0, nivelRep: 1, premium: 'tema_vulcanico',
    cores: { parede: 0x2a1412, piso: 0x3d1c18, balcao: 0xc2461f, prateleira: 0xa03a1a }, efeitos: [] },
  { id: 'gelo', nome: 'Loja de Gelo', desc: 'Azul gelado de inverno.', custo: 0, nivelRep: 1, premium: 'tema_gelo',
    cores: { parede: 0x1f3340, piso: 0x2e4a5c, balcao: 0x9fd4e6, prateleira: 0x7fb8cf }, efeitos: [] },
];
