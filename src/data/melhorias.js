// Melhorias: compram-se uma vez e dão efeitos permanentes (até a próxima "expansão para nova cidade").
// { id, grupo ('loja' ou o id de um ofício), nome, desc, custo, nivelRep (padrão 1), requer: [ids de outras melhorias],
//   efeitos: [{ tipo, valor, oficio? }] }   -> os tipos possíveis estão em core/mods.js (EFEITOS)
// Para uma árvore: cada melhoria "requer" as anteriores. O grupo define em que aba/ofício ela aparece.
export const MELHORIAS_LOJA = [
  // ---- ampliar a loja (mais gente na fila) ----
  { id: 'ampliar_1', grupo: 'loja', nome: 'Ampliar a loja I', desc: 'Mais espaço para os clientes esperarem.', custo: 120, nivelRep: 1,
    efeitos: [{ tipo: 'fila', valor: 1 }] },
  { id: 'ampliar_2', grupo: 'loja', nome: 'Ampliar a loja II', desc: 'Um cômodo novo nos fundos.', custo: 420, nivelRep: 3, requer: ['ampliar_1'],
    efeitos: [{ tipo: 'fila', valor: 1 }] },
  { id: 'ampliar_3', grupo: 'loja', nome: 'Ampliar a loja III', desc: 'Fachada nova: a vizinhança repara.', custo: 1300, nivelRep: 6, requer: ['ampliar_2'],
    efeitos: [{ tipo: 'fila', valor: 1 }, { tipo: 'chegada', valor: 1.1 }] },
  { id: 'ampliar_4', grupo: 'loja', nome: 'Ampliar a loja IV', desc: 'Um salão de verdade.', custo: 3800, nivelRep: 10, requer: ['ampliar_3'],
    efeitos: [{ tipo: 'fila', valor: 2 }] },
  // ---- prateleiras (capacidade do estoque) ----
  { id: 'prateleiras_1', grupo: 'loja', nome: 'Prateleiras novas', desc: 'Mais lugar para expor mercadoria.', custo: 100, nivelRep: 1,
    efeitos: [{ tipo: 'capacidade', valor: 10 }] },
  { id: 'prateleiras_2', grupo: 'loja', nome: 'Estantes de carvalho', desc: 'Madeira boa e firme.', custo: 360, nivelRep: 2, requer: ['prateleiras_1'],
    efeitos: [{ tipo: 'capacidade', valor: 15 }] },
  { id: 'prateleiras_3', grupo: 'loja', nome: 'Vitrines', desc: 'Itens valiosos à vista.', custo: 1000, nivelRep: 5, requer: ['prateleiras_2'],
    efeitos: [{ tipo: 'capacidade', valor: 20 }] },
  { id: 'prateleiras_4', grupo: 'loja', nome: 'Armazém anexo', desc: 'Um depósito atrás do balcão.', custo: 3000, nivelRep: 9, requer: ['prateleiras_3'],
    efeitos: [{ tipo: 'capacidade', valor: 30 }] },
  // ---- balcão ----
  { id: 'balcao_1', grupo: 'loja', nome: 'Balcão polido', desc: 'Atendimento mais agradável: clientes esperam mais.', custo: 200, nivelRep: 1,
    efeitos: [{ tipo: 'paciencia', valor: 1.15 }] },
  { id: 'balcao_2', grupo: 'loja', nome: 'Balcão com vitrine', desc: 'Os itens finos se destacam.', custo: 800, nivelRep: 4, requer: ['balcao_1'],
    efeitos: [{ tipo: 'paciencia', valor: 1.1 }, { tipo: 'preco', valor: 1.03 }] },
  { id: 'balcao_3', grupo: 'loja', nome: 'Balcão de mogno', desc: 'Um balcão digno de lenda.', custo: 2500, nivelRep: 8, requer: ['balcao_2'],
    efeitos: [{ tipo: 'preco', valor: 1.05 }, { tipo: 'repGanho', valor: 1.1 }] },
  // ---- divulgação ----
  { id: 'sino_porta', grupo: 'loja', nome: 'Sino na porta', desc: 'Todo mundo ouve quando alguém entra.', custo: 150, nivelRep: 1,
    efeitos: [{ tipo: 'chegada', valor: 1.1 }] },
  { id: 'cartaz_praca', grupo: 'loja', nome: 'Cartaz na praça', desc: 'Mais aventureiros ficam sabendo da loja.', custo: 500, nivelRep: 3, requer: ['sino_porta'],
    efeitos: [{ tipo: 'chegada', valor: 1.15 }] },
  { id: 'fornecedor_fiel', grupo: 'loja', nome: 'Contrato com fornecedores', desc: 'Compras em volume: materiais mais baratos.', custo: 700, nivelRep: 4,
    efeitos: [{ tipo: 'compra', valor: 0.93 }] },
];

// Árvore de cada ofício. (Provisória: 3 melhorias por ofício; o conteúdo completo, 20+ por ofício, vem no M6.)
const trio = (oficio, nome, base, rep) => [
  { id: `${oficio}_bancada`, grupo: oficio, nome: `Bancada extra de ${nome}`, desc: 'Mais uma produção ao mesmo tempo.', custo: base, nivelRep: rep,
    efeitos: [{ tipo: 'slots', oficio, valor: 1 }] },
  { id: `${oficio}_ferramentas`, grupo: oficio, nome: 'Ferramentas melhores', desc: 'O trabalho rende mais rápido.', custo: Math.round(base * 1.4), nivelRep: rep, requer: [`${oficio}_bancada`],
    efeitos: [{ tipo: 'velocidade', oficio, valor: 1.15 }] },
  { id: `${oficio}_mestre`, grupo: oficio, nome: `Mestre de ${nome}`, desc: 'Mais chance de itens de qualidade.', custo: Math.round(base * 3), nivelRep: rep + 2, requer: [`${oficio}_ferramentas`],
    efeitos: [{ tipo: 'qualidade', valor: 0.05 }, { tipo: 'filaOficina', oficio, valor: 1 }] },
];

export const MELHORIAS_OFICIOS = [
  ...trio('ferraria', 'ferraria', 150, 1),
  ...trio('culinaria', 'culinária', 120, 1),
  ...trio('alquimia', 'alquimia', 250, 2),
  ...trio('carpintaria', 'carpintaria', 350, 3),
  ...trio('costura', 'costura', 500, 4),
  ...trio('encantamento', 'encantamento', 900, 6),
  ...trio('joalheria', 'joalheria', 1300, 8),
  ...trio('artefatos', 'artefatos', 2600, 12),
];

export const MELHORIAS = [...MELHORIAS_LOJA, ...MELHORIAS_OFICIOS];
