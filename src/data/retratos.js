// Retratos dos aventureiros: id do aventureiro -> número do retrato no pack "Free 39 Portraits Pixel Art" (CraftPix), arquivo Icons_NN.png.
// Depois de mudar esta lista, rode `npm run pack:retratos` (com o pack em assets-src/retratos, fora do git): ele gera o atlas pequeno
// em src/assets/retratos/. O mesmo retrato pode servir a mais de um aventureiro, e quem não tiver retrato aqui recebe um do pack
// (escolhido pelo id, sempre o mesmo): não há retratos desenhados por código.
export const RETRATOS = {
  // ---------- Vila Inicial ----------
  aprendiz_guerreiro: '01', arqueira_novata: '09', maga_estudante: '24', ladino_sorrateiro: '28', clerigo_viajante: '32',
  bardo_cantor: '05', cacador_lobos: '21', alquimista_errante: '07', soldado_guarda: '08', batedor_carteira: '20', novica_templo: '19',
  // ---------- Floresta Sussurrante ----------
  patrulheira_bosque: '31', mago_bosque: '23', ladino_copa: '22', druida: '27', trovador: '39', rastreador: '06', herbalista: '04', cavaleiro_errante: '10',
  // ---------- Montanhas de Ferro ----------
  mestre_runas: '26', atirador_montanha: '29', javali_berserker: '35', contrabandista: '30', fundidor: '40',
  // ---------- Deserto de Cinzas ----------
  gladiador_cinzas: '38', sacerdote_sol: '25', alquimista_deserto: '37',
  // ---------- Pântano Esmeralda ----------
  bruxo_brejo: '11', poeta_brejo: '12',
  // ---------- Cume do Dragão ----------
  campeao_arena: '34',
  // ---------- Lendários ----------
  ser_aldric: '14', lyra_seda: '02', merlindo: '13', irmao_anselmo: '17', selene_lua: '16',
  thorin_rubro: '36', zahir: '03', morwen: '18', kael: '15', rainha_isolde: '33',
};

// hash simples e estável (FNV-1a) do id
const hash = (texto) => { let h = 0x811c9dc5; for (const c of texto) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); } return h >>> 0; };

// Número do retrato de um aventureiro: o mapeado acima ou, se faltar, um da lista `disponiveis` (números do atlas) escolhido pelo id.
export function retratoDe(id, disponiveis) {
  if (RETRATOS[id]) return RETRATOS[id];
  return disponiveis.length ? disponiveis[hash(id) % disponiveis.length] : null;
}
