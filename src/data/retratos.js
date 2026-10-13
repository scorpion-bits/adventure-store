// Retratos dos aventureiros: id do aventureiro -> chave do retrato no pack "Ninja Adventure" (Pixel-boy e AAA, CC0), 38x38 px.
// A chave é a categoria + a pasta do personagem em Actor/: c_ = Character, m_ = Monster, b_ = Boss, a_ = Animal (ex.: c_Knight = Actor/Character/Knight/Faceset.png).
// Depois de mudar esta lista, rode `npm run pack:ninja` (com o pack em assets-src/ninja, fora do git): ele tira o fundo dos retratos e gera
// o atlas pequeno em src/assets/retratos/. O mesmo retrato pode servir a mais de um aventureiro, e quem não tiver retrato aqui recebe um do pack
// (escolhido pelo id, sempre o mesmo): não há retratos desenhados por código.
export const RETRATOS = {
  // ---------- Os 8 primeiros e os lendários ----------
  aprendiz_guerreiro: 'c_Boy', arqueira_novata: 'c_Cavegirl', maga_estudante: 'c_SorcererOrange',
  ladino_sorrateiro: 'c_NinjaDark', clerigo_viajante: 'c_Monk2', bardo_cantor: 'a_Frog',
  cacador_lobos: 'm_Bear', alquimista_errante: 'c_OldMan3', ser_aldric: 'c_Knight',
  lyra_seda: 'c_SorcererBlack', merlindo: 'c_NinjaMageBlack', irmao_anselmo: 'c_Monk',
  selene_lua: 'c_SamuraiBlue', thorin_rubro: 'c_FighterRed', zahir: 'c_Sultan',
  morwen: 'c_OldWoman', kael: 'c_Hunter', rainha_isolde: 'c_Princess',
  // ---------- Vila Inicial ----------
  soldado_guarda: 'c_Inspector', batedor_carteira: 'c_NinjaGray', novica_templo: 'c_Woman',
  aldeao_tobias: 'c_Villager', aldea_marta: 'c_Villager2', lavrador_beto: 'c_Villager3',
  menina_lia: 'c_Villager4', menino_pip: 'c_Child', garoto_da_casca: 'c_EggBoy',
  garota_da_casca: 'c_EggGirl', velho_barnabe: 'c_OldMan', homem_das_cavernas: 'c_Caveman',
  gato_mercador: 'a_Cat', cao_de_guarda: 'a_Dog', vaca_viajante: 'a_Cow',
  hamster_apressado: 'a_Hamster', slime_gentil: 'm_Slime', cogumelo_curioso: 'm_Mushroom',
  // ---------- Floresta Sussurrante ----------
  cavaleiro_errante: 'c_KnightGold', patrulheira_bosque: 'c_Cavegirl2', mago_bosque: 'c_NinjaMageOrange',
  ladino_copa: 'm_SpiderYellow', druida: 'c_Shaman', trovador: 'm_Owl',
  rastreador: 'a_Hyena', herbalista: 'm_Mushroom2', lenhadora_rosa: 'c_Villager5',
  guia_davi: 'c_Villager6', selvagem_grog: 'c_Caveman2', sapo_mascarado: 'c_MaskFrog',
  guaxinim_mascarado: 'c_MaskRacoon', ninja_das_folhas: 'c_NinjaLeaf', ninja_verde: 'c_NinjaGreen',
  soldado_camuflado: 'c_CamouflageGreen', xama_leonino: 'c_ShamanLion', mestre_cozinheiro: 'c_OldMan2',
  nobre_disfarcado: 'c_Noble', broto_de_bambu: 'm_Bamboo', bambu_dourado: 'm_BambooYellow',
  panda_faminto: 'm_Panda', gata_branca: 'a_CatWhite', cachorro_farejador: 'a_DogYellow',
  filhote_de_leao: 'a_LionCub', guaxinim_batedor: 'a_Racoon',
  // ---------- Montanhas de Ferro ----------
  javali_berserker: 'a_WildBoar', atirador_montanha: 'c_Tengu', mestre_runas: 'c_Statue',
  contrabandista: 'c_GreenPig', fundidor: 'c_Pig', leao_guerreiro: 'c_Lion',
  leao_ruivo: 'c_LionOrange', leao_de_bronze: 'c_LionYellow', jovem_leao: 'c_LionBoy',
  leao_das_cavernas: 'c_CaveLion', leao_do_gelo: 'c_CaveLion2', mestre_ferreiro: 'c_Master',
  automato_de_ferro: 'c_RobotGrey', automato_verde: 'c_RobotGreen', automato_de_guerra: 'c_RobotCamouflage',
  estatua_dourada: 'c_GoldStatue', macaco_pugilista_azul: 'c_MonkeyBoxerBlue', macaco_pugilista_rubro: 'c_MonkeyBoxerRed',
  macaco_joalheiro: 'c_Monkey', lutador_loiro: 'c_FighterWhite', explorador_do_gelo: 'c_Eskimo',
  ninja_do_gelo: 'c_NinjaEskimo', toupeira_escavadora: 'm_Mole', fera_das_rochas: 'm_Beast',
  // ---------- Deserto de Cinzas ----------
  gladiador_cinzas: 'c_GladiatorBlue', sacerdote_sol: 'c_Sultan2', alquimista_deserto: 'm_Slime2',
  samurai_errante: 'c_Samurai', samurai_rubra: 'c_SamuraiRed', tengu_viajante: 'c_Tengu2',
  ninja_dourado: 'c_NinjaYellow', ninja_de_fogo: 'c_NinjaFire', ninja_das_bombas: 'c_NinjaBomb',
  ninja_do_trovao: 'c_NinjaThunder', ninja_carmim: 'c_NinjaRed', ninja_escarlate: 'c_NinjaRed2',
  ninja_da_areia: 'c_RedNinja3', soldado_das_dunas: 'c_CamouflageRed', demonio_comerciante: 'c_DemonRed',
  chama_andarilha: 'c_Flam', lagarto_das_dunas: 'm_Lizard', reptil_guerreiro: 'm_Reptile',
  cobra_comerciante: 'm_Snake', ciclope_vigia: 'm_Cyclope', dino_viajante: 'm_TRex',
  cao_de_caravana: 'a_DogOrange', gato_do_deserto: 'a_CatOrange', guaxinim_dourado: 'm_GoldRacoon',
  // ---------- Pântano Esmeralda ----------
  bruxo_brejo: 'm_BlueBat', poeta_brejo: 'm_KappaGreen', ninja_das_aguas: 'c_NinjaWater',
  ninja_azul: 'c_NinjaBlue', ninja_do_lago: 'c_NinjaBlue2', ninja_mascarado: 'c_NinjaMasked',
  demonio_do_brejo: 'c_DemonGreen', esqueleto_bibliotecario: 'c_Skeleton', esqueleto_demoniaco: 'c_SkeletonDemon',
  vampiro_refinado: 'c_Vampire', espirito_do_pantano: 'c_Spirit', axolote_mistico: 'm_Axolot',
  axolote_azul: 'm_AxolotBlue', polvo_do_brejo: 'm_GreenOctopus', polvo_apressado: 'm_Octopus',
  polvo_rubro: 'm_RedOctopus', caveira_flamejante: 'm_Skull', caveira_gelida: 'm_SkullBlue',
  fera_do_charco: 'm_Beast2', gato_preto: 'a_CatBlack',
  // ---------- Cume do Dragão ----------
  campeao_arena: 'c_RedGladiator', dragao_azul: 'b_DragonBlue', dragao_esmeralda: 'b_DragonGreen',
  ciclope_demoniaco: 'b_DemonCyclop', samurai_gigante_azul: 'b_GiantBlueSamurai', samurai_gigante_rubro: 'b_GiantRedSamurai',
  chama_gigante: 'b_GiantFlam', sapo_rei: 'b_GiantFrog', guaxinim_imperial: 'b_GiantRacoonGold',
  slime_gigante: 'b_GiantSlime', espirito_gigante: 'b_GiantSpirit', lula_do_abismo: 'b_SquidGreen',
  tengu_supremo_azul: 'b_TenguBlue', tengu_supremo_rubro: 'b_TenguRed', dragaozinho: 'm_Dragon',
  cao_do_cume: 'a_Dog2', cao_sombrio: 'a_DogBlack', kappa_guerreiro: 'm_KappaRed',
  camundongo_mercador: 'm_Mouse',
};

const hash = (texto) => { let h = 0x811c9dc5; for (const c of texto) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); } return h >>> 0; };

// Número do retrato de um aventureiro: o mapeado acima ou, se faltar, um da lista `disponiveis` (números do atlas) escolhido pelo id.
export function retratoDe(id, disponiveis) {
  if (RETRATOS[id]) return RETRATOS[id];
  return disponiveis.length ? disponiveis[hash(id) % disponiveis.length] : null;
}
