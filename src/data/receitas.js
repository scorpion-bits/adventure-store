// Receitas da oficina.
// { id, item, oficio, nivel (nível do ofício necessário), tempo (segundos), materiais: { idMaterial: qtd },
//   qtd (itens produzidos de uma vez, padrão 1) }
export const RECEITAS = [
  { id: 'r_espada_ferro', item: 'espada_ferro', oficio: 'ferraria', nivel: 1, tempo: 90, materiais: { barra_ferro: 2, carvao: 1 } },
  { id: 'r_adaga_bronze', item: 'adaga_bronze', oficio: 'ferraria', nivel: 1, tempo: 60, materiais: { cobre: 2, carvao: 1 } },
  { id: 'r_picareta_ferro', item: 'picareta_ferro', oficio: 'ferraria', nivel: 1, tempo: 75, materiais: { barra_ferro: 1, madeira: 1, carvao: 1 } },
  { id: 'r_arco_curto', item: 'arco_curto', oficio: 'carpintaria', nivel: 1, tempo: 70, materiais: { madeira: 2, couro_cru: 1 } },
  { id: 'r_escudo_madeira', item: 'escudo_madeira', oficio: 'carpintaria', nivel: 1, tempo: 60, materiais: { madeira: 3, cobre: 1 } },
  { id: 'r_peitoral_couro', item: 'peitoral_couro', oficio: 'costura', nivel: 1, tempo: 80, materiais: { couro_cru: 3 } },
  { id: 'r_pocao_cura', item: 'pocao_cura', oficio: 'alquimia', nivel: 1, tempo: 40, materiais: { erva_curativa: 2 }, qtd: 2 },
  { id: 'r_pocao_mana', item: 'pocao_mana', oficio: 'alquimia', nivel: 1, tempo: 50, materiais: { cristal_mana: 1, erva_curativa: 1 }, qtd: 2 },
  { id: 'r_pergaminho_faisca', item: 'pergaminho_faisca', oficio: 'encantamento', nivel: 1, tempo: 60, materiais: { cristal_mana: 1 } },
  { id: 'r_anel_cobre', item: 'anel_cobre', oficio: 'joalheria', nivel: 1, tempo: 50, materiais: { cobre: 2 } },
  { id: 'r_pao_aventureiro', item: 'pao_aventureiro', oficio: 'culinaria', nivel: 1, tempo: 20, materiais: { farinha: 1 }, qtd: 3 },
  { id: 'r_ensopado', item: 'ensopado', oficio: 'culinaria', nivel: 1, tempo: 35, materiais: { carne: 1, erva_curativa: 1 }, qtd: 2 },
];
