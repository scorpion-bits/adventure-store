// Reúne todo o conteúdo do jogo e cria os índices por id. A lógica e a interface só leem daqui.
import { META } from './meta.js';
import { MATERIAIS } from './materiais.js';
import { ITENS } from './itens.js';
import { RECEITAS } from './receitas.js';
import { AVENTUREIROS } from './aventureiros.js';
import { FORNECEDORES } from './fornecedores.js';
import { REGIOES } from './regioes.js';
import { MELHORIAS } from './melhorias.js';
import { EQUIPE } from './equipe.js';
import { DECORACOES } from './decoracoes.js';
import { EVENTOS } from './eventos.js';
import { ICONES } from './icones.js';

const indexar = (lista) => Object.fromEntries(lista.map((x) => [x.id, x]));

export const DATA = {
  meta: META,
  materiais: indexar(MATERIAIS),
  itens: indexar(ITENS),
  receitas: indexar(RECEITAS),
  aventureiros: indexar(AVENTUREIROS),
  fornecedores: indexar(FORNECEDORES),
  regioes: indexar(REGIOES),
  melhorias: indexar(MELHORIAS),
  equipe: indexar(EQUIPE),
  decoracoes: indexar(DECORACOES),
  eventos: indexar(EVENTOS),
  icones: ICONES,
  // listas na ordem em que foram escritas (para sorteios e telas)
  listas: {
    materiais: MATERIAIS, itens: ITENS, receitas: RECEITAS,
    aventureiros: AVENTUREIROS, fornecedores: FORNECEDORES, regioes: REGIOES,
    melhorias: MELHORIAS, equipe: EQUIPE, decoracoes: DECORACOES, eventos: EVENTOS,
  },
};

// pequenos auxiliares sobre o conteúdo
export const categoria = (id) => META.categorias.find((c) => c.id === id);
export const raridade = (id) => META.raridades.find((r) => r.id === id);
export const temperamento = (id) => META.temperamentos.find((t) => t.id === id);
export const classe = (id) => META.classes.find((c) => c.id === id);
export const oficio = (id) => META.oficios.find((o) => o.id === id);

// chave de estoque: itens têm qualidade ("espada_ferro:1"); materiais usam só o id
export const chaveItem = (id, qualidade = 1) => `${id}:${qualidade}`;
export const lerChave = (chave) => {
  const [id, q] = chave.split(':');
  return { id, qualidade: Number(q) };
};
