// Ligação entre itens/materiais e a arte: { idDoItem: quadro }. Todos os quadros vêm do atlas src/assets/itens (npm run pack:itens),
// montado só com packs de licença livre (CC0; veja CREDITS.md), e o nome do quadro diz de onde vem:
//  - "cc_<pacote>__<caminho>": um PNG 32x32 dos packs CC0 (OpenGameArt) baixados em assets-src/cc0/pacotes;
//  - "nj_<Pasta>_<Nome>": um ícone 16x16 do Ninja Adventure (ampliado 2x no atlas);
//  - "ns_<Categoria>_<Nome>": o primeiro quadro de um personagem ou monstro do Ninja Adventure;
//  - "~H+60", "~V0.55", "~T1,0.5,0.4" no fim: variante da mesma arte (matiz, brilho ou cor), veja scripts/pack-itens.mjs.
// Quem não estiver aqui usa um ícone provisório desenhado por código.
// Os retratos dos aventureiros vêm do pack (data/retratos.js), não daqui.
export const ICONES = {
  // ---------- materiais: vila ----------
  barra_ferro: 'cc_idylwilds_inventory__iron_ingot', carvao: 'cc_idylwilds_inventory__iron_ore', madeira: 'cc_idylwilds_inventory__log', couro_cru: 'cc_idylwilds_inventory__leather', erva_curativa: 'cc_idylwilds_inventory__herb', cristal_mana: 'cc_gem-7soul1_20201212__32x32+crystal_01',
  farinha: 'cc_idylwilds_inventory__sack', carne: 'cc_food-7soul1_20201212__32x32+meat_raw', cobre: 'cc_idylwilds_inventory__copper_ingot', linho: 'cc_idylwilds_inventory__cloth', la: 'cc_idylwilds_inventory__string', pedra: 'nj_Resource_Rock', mel: 'nj_Food_Honey', baga: 'cc_food-ocal__32x32+fruit+blackberries',
  frasco: 'cc_food-7soul1_20201212__32x32+water', leite: 'cc_food-ocal__32x32+drink+milk_carton', peixe: 'cc_food-7soul1_20201212__32x32+fish_raw', arroz: 'cc_idylwilds_inventory__wheat', sal: 'cc_gem-7soul1_20201212__32x32+opal', polvora: 'cc_idylwilds_inventory__inkpot',
  // ---------- materiais: floresta ----------
  pele_lobo: 'cc_idylwilds_inventory__rawhide', madeira_nobre: 'cc_idylwilds_inventory__board', seiva: 'cc_food-ocal__32x32+dairy+butter', cogumelo: 'cc_food-7soul1_20201212__32x32+mushroom', flor_lunar: 'nj_Resource_Grass', pena: 'nj_Resource_feather', garra: 'cc_sword-ocal_20230219__32x32+scimitar_01', teia: 'cc_idylwilds_inventory__thread',
  bambu: 'cc_idylwilds_inventory__grass', resina: 'cc_gem-ocal__32x32+birthstone_bloodstone_01', ginseng: 'cc_food-ocal__32x32+vegetable+ginger',
  // ---------- materiais: montanhas ----------
  aco: 'nj_Resource_BarSilver', mithril: 'nj_Resource_BarMithril', prata: 'cc_idylwilds_inventory__silver_ingot', ouro_barra: 'cc_idylwilds_inventory__gold_ingot', gema_bruta: 'cc_gem-7soul1_20201212__32x32+crystal_02', quartzo: 'cc_gem-7soul1_20201212__32x32+crystal_03', pedra_runica: 'cc_shield-blarumyrran__32x32+shield_02',
  jade: 'cc_gem-7soul1_20201212__32x32+jade', enxofre: 'cc_idylwilds_inventory__platinum_ore', safira_bruta: 'cc_gem-7soul1_20201212__32x32+sapphire',
  // ---------- materiais: deserto ----------
  especiaria: 'cc_food-ocal__32x32+vegetable+pepper_chili', seda: 'cc_idylwilds_inventory__silk', presa_escorpiao: 'cc_sword-babysamurai__32x32+short_sword_05', cristal_solar: 'cc_gem-ocal__32x32+birthstone_beryl_01', vidro_fino: 'cc_gem-7soul1_20201212__32x32+diamond', incenso: 'cc_idylwilds_inventory__urn',
  ambar: 'cc_gem-ocal__32x32+birthstone_carnelian_01', papiro: 'cc_idylwilds_inventory__parchment~T0.8,1,0.65', areia_dourada: 'cc_idylwilds_inventory__bonemeal',
  // ---------- materiais: pântano ----------
  lodo: 'cc_food-ocal__32x32+vegetable+potato', veneno: 'cc_potion-ocal__32x32+potion_1_green~H-25', cogumelo_azul: 'cc_food-7soul1_20201212__32x32+mushroom~H+150', musgo: 'cc_food-ocal__32x32+vegetable+bok_choy', raiz_negra: 'cc_idylwilds_inventory__stick', essencia_brejo: 'cc_potion-ocal__32x32+potion_1_green~H+60',
  turfa: 'cc_idylwilds_inventory__silver_ore', flor_carnivora: 'cc_food-ocal__32x32+vegetable+lettuce', perola_negra: 'cc_gem-ocal__32x32+birthstone_onyx_01',
  // ---------- materiais: dragão ----------
  escama_dragao: 'cc_gem-ocal__32x32+birthstone_peridot_01', brasa_eterna: 'cc_idylwilds_inventory__torch_lit', osso_draconico: 'cc_idylwilds_inventory__bone~T1,0.55,0.45', ouro_dragao: 'cc_idylwilds_inventory__gold_ore', ferro_celeste: 'nj_Resource_BarPurple', sangue_dragao: 'cc_potion-ocal__32x32+potion_1_red~V0.55',
  coracao_dragao: 'cc_gem-7soul1_20201212__32x32+ruby', chifre_dragao: 'cc_sword-babysamurai__32x32+short_sword_04', perola_ardente: 'cc_gem-ocal__32x32+birthstone_ruby_01',

  // ---------- armas ----------
  clava_madeira: 'cc_club-ocal__32x32+club_01', adaga_bronze: 'cc_sword-melle__32x32+dagger', arco_curto: 'cc_ranged-ocal__32x32+bow_02', espada_ferro: 'cc_sword-melle__32x32+sword', lanca_ferro: 'cc_polearm-ocal__32x32+spear_01',
  machado_guerra: 'cc_axe-ocal__32x32+battle_axe', arco_longo: 'cc_ranged-ocal__32x32+bow_01', espada_aco: 'cc_sword-ocal_20230219__32x32+long_sword_01', balestra: 'cc_ranged-ocal__32x32+crossbow_01', martelo_guerra: 'cc_hammer-ocal__32x32+warhammer_01',
  espada_mithril: 'cc_sword-melle__32x32+ice_sword', arco_elfico: 'cc_ranged-ocal__32x32+bow_03', cimitarra_deserto: 'cc_sword-ocal_20230219__32x32+scimitar_02', lamina_do_brejo: 'cc_sword-babysamurai__32x32+short_sword_03',
  machado_titanico: 'cc_axe-7soul1_20201212__32x32+axe_07', lamina_draconica: 'cc_sword-melle__32x32+fire_sword',
  // ---------- armaduras ----------
  capuz_couro: 'cc_headgear-ocal__32x32+pith_helmet_01', botas_couro: 'cc_footgear-ocal__32x32+engineer_boots', escudo_madeira: 'cc_shield-ocal__32x32+wooden_buckler', peitoral_couro: 'cc_armor-ocal__32x32+brigandine', robe_aprendiz: 'cc_armor-ocal__32x32+judo_gi',
  elmo_ferro: 'cc_headgear-ocal__32x32+knight_helmet_02', escudo_ferro: 'cc_shield-ocal__32x32+kite_shield_01', manto_viajante: 'cc_armor-ocal__32x32+t-shirt', cota_malha: 'cc_armor-ettingrinder__32x32+armor_01_long', peitoral_aco: 'cc_armor-ocal__32x32+breastplate',
  manto_lobo: 'cc_armor-ettingrinder__32x32+armor_04_short', escudo_torre: 'cc_shield-ocal__32x32+kite_shield_12', armadura_placas: 'cc_armor-ettingrinder__32x32+armor_01_short', armadura_mithril: 'cc_armor-ettingrinder__32x32+armor_03_gray', elmo_escamas: 'cc_headgear-ocal__32x32+armet',
  armadura_draconica: 'cc_armor-ettingrinder__32x32+armor_03_red',
  // ---------- poções ----------
  pocao_cura: 'cc_potion-ocal__32x32+potion_1_red', pocao_mana: 'cc_potion-ocal__32x32+potion_1_blue', antidoto: 'cc_potion-ocal__32x32+potion_1_green', elixir_vigor: 'cc_potion-ocal__32x32+potion_1_orange', pocao_velocidade: 'cc_potion-ocal__32x32+potion_1_cyan',
  pocao_visao_noturna: 'cc_potion-ocal__32x32+potion_1_purple', pocao_forca: 'cc_potion-ocal__32x32+potion_1_pink', pocao_cura_maior: 'cc_potion-ocal__32x32+potion_1_red~V0.7', pocao_coragem: 'cc_potion-ocal__32x32+potion_1_yellow', pocao_mana_maior: 'cc_potion-ocal__32x32+potion_1_blue~V0.7',
  elixir_resistencia: 'cc_potion-ocal__32x32+potion_1_black', pocao_invisibilidade: 'cc_potion-ocal__32x32+potion_1_white', elixir_longevidade: 'nj_Potion_LifePot', pocao_ressurreicao: 'cc_gem-ocal__32x32+ruby',
  // ---------- magia ----------
  pergaminho_faisca: 'cc_idylwilds_inventory__scroll', pergaminho_gelo: 'nj_Scroll_ScrollIce', pergaminho_cura: 'cc_book-ocal__32x32+holy_book_01', pergaminho_chama: 'nj_Scroll_ScrollFire', pergaminho_raio: 'nj_Scroll_ScrollThunder',
  runa_protecao: 'cc_shield-blarumyrran__32x32+shield_01', grimorio_aprendiz: 'cc_book-7soul1_20201212__32x32+book_01', cajado_carvalho: 'cc_stave-ocal__32x32+staff_01', varinha_cristal: 'cc_stave-7soul1_20201212__32x32+staff_07', orbe_arcano: 'cc_gem-7soul1_20201212__32x32+agate',
  cajado_tempestade: 'cc_stave-7soul1_20201212__32x32+staff_11', tomo_proibido: 'cc_book-7soul1_20201212__32x32+book_04', pergaminho_meteoro: 'cc_idylwilds_inventory__scroll~T1,0.5,0.4', cajado_arcano_supremo: 'cc_stave-ocal__32x32+staff_03',
  // ---------- ferramentas ----------
  pa: 'nj_Tool_Shovel', vara_pescar: 'nj_Weapons_FishingRod', foice: 'nj_Tool_Sickle', corda_gancho: 'cc_idylwilds_inventory__rope', martelo: 'nj_Tool_Hammer', machado_lenhador: 'nj_Tool_Axe',
  picareta_ferro: 'nj_Tool_Pickaxe', lanterna: 'cc_idylwilds_inventory__torch', chave_mestra: 'cc_key-ocal__32x32+key_01', kit_acampamento: 'cc_idylwilds_inventory__basket', picareta_aco: 'cc_idylwilds_inventory__iron_pickaxe', balanca_precisao: 'cc_idylwilds_inventory__chain',
  // ---------- acessórios ----------
  pulseira_couro: 'cc_jewelry-ocal__32x32+chain_ring_01', colar_contas: 'cc_jewelry-ocal__32x32+necklace_pearls_01', anel_cobre: 'cc_jewelry-ocal__32x32+ring_08', anel_prata: 'cc_jewelry-ocal__32x32+ring_06', amuleto_sorte: 'cc_jewelry-7soul1_20201212__32x32+necklace_07',
  brincos_ouro: 'cc_jewelry-ocal__32x32+ring_01', amuleto_protecao: 'cc_jewelry-7soul1_20201212__32x32+necklace_04', anel_rubi: 'cc_jewelry-7soul1_20201212__32x32+ring_03_red', colar_esmeralda: 'cc_jewelry-7soul1_20201212__32x32+necklace_03', broche_estelar: 'cc_jewelry-7soul1_20201212__32x32+necklace_05',
  tiara_safira: 'cc_jewelry-ocal__32x32+ring_13', anel_do_vento: 'cc_jewelry-7soul1_20201212__32x32+ring_03_blue', coroa_real: 'cc_headgear-ocal__32x32+crusader_great_helmet', colar_draconico: 'cc_jewelry-7soul1_20201212__32x32+necklace_01',
  // ---------- comida ----------
  pao_aventureiro: 'cc_food-7soul1_20201212__32x32+bread', cerveja: 'cc_idylwilds_inventory__mug', queijo: 'cc_food-7soul1_20201212__32x32+cheese', espeto_carne: 'cc_food-ocal__32x32+misc+shish_kabob', ensopado: 'cc_food-ocal__32x32+misc+ramen_bowl', torta_maca: 'cc_food-7soul1_20201212__32x32+pie',
  sopa_cogumelo: 'cc_food-ocal__32x32+misc+mushroom', peixe_assado: 'cc_food-7soul1_20201212__32x32+fish_cooked', bolo_mel: 'cc_food-ocal__32x32+treat+cupcake', torta_carne: 'cc_food-ocal__32x32+pasta+lasagna', vinho_tinto: 'cc_food-7soul1_20201212__32x32+grapes_purple', banquete: 'cc_food-ocal__32x32+meat+chicken',
  pao_elfico: 'cc_food-ocal__32x32+grain+bread_loaf', ensopado_dragao: 'cc_food-7soul1_20201212__32x32+meat_cooked_hot',
  // ---------- curiosidades ----------
  dente_lobo: 'cc_jewelry-7soul1_20201212__32x32+necklace_06', osso_antigo: 'cc_idylwilds_inventory__bone', pena_grifo: 'cc_idylwilds_inventory__quill', geodo: 'cc_gem-ocal__32x32+birthstone_topaz_01', cranio_antigo: 'ns_Monster_Skull', moeda_antiga: 'cc_idylwilds_inventory__plate',
  mapa_tesouro: 'cc_idylwilds_inventory__parchment', chave_misteriosa: 'cc_key-ocal__32x32+key_02', estatueta_jade: 'ns_Character_GoldStatue~T0.55,1,0.7', relicario: 'cc_jewelry-7soul1_20201212__32x32+necklace_08', orbe_cristal: 'cc_gem-7soul1_20201212__32x32+amethist', ovo_dragao: 'cc_food-ocal__32x32+meat+egg_small~T0.55,0.9,0.7',

  // ---------- pack Ninja Adventure (CC0): quadros "nj_<Pasta>_<Nome>" do atlas src/assets/itens (npm run pack:ninja) ----------
  forcado: 'nj_Weapons_Fork', machadinha: 'nj_Weapons_AxeTool', bastao: 'nj_Weapons_Stick',
  arco_bambu: 'nj_Weapons_Bow2', arco_composto: 'nj_Weapons_Bow', nunchaku: 'nj_Weapons_Ninjaku',
  chicote: 'nj_Weapons_Whip', florete: 'nj_Weapons_Rapier', sai: 'nj_Weapons_Sai',
  machado_duplo: 'nj_Weapons_Axe', katana: 'nj_Weapons_Katana', montante: 'nj_Weapons_BigSword',
  flechas: 'nj_Projectile_Arrow', shuriken: 'nj_Projectile_Shuriken', kunai: 'nj_Projectile_Kunai',
  abrolho: 'nj_Projectile_Caltrop', bomba: 'nj_Projectile_Bomb', dinamite: 'nj_Projectile_Dynamite',
  caixa_dinamite: 'nj_Projectile_CrateDynamite', kit_primeiros_socorros: 'nj_Potion_Medipack', agua_benta: 'nj_Potion_WaterPot',
  elixir_coracao: 'nj_Potion_Heart', pergaminho_branco: 'nj_Scroll_ScrollEmpty', pergaminho_identificacao: 'nj_Scroll_Scroll',
  pergaminho_crescimento: 'nj_Scroll_ScrollPlant', pergaminho_muralha: 'nj_Scroll_ScrollRock', livro_feiticos: 'nj_Weapons_Book',
  enxada: 'nj_Tool_Hoe', regador: 'nj_Tool_WateringCan', caixote: 'nj_Object_CrateEmpty',
  bigorna: 'nj_Tool_Anvil', pote_barro: 'nj_Potion_EmptyPot', balde_agua: 'nj_Resource_Water',
  bolsa_couro: 'nj_Object_Bag', bolsa_moedas: 'nj_Object_MoneyBag', jarra_leite: 'nj_Potion_MilkPot',
  coxa_assada: 'nj_Food_Meat', bife_grelhado: 'nj_Food_Beaf', peixe_frito: 'nj_Food_Fish',
  biscoito_sorte: 'nj_Food_FortuneCookie', macarrao: 'nj_Food_Noodle', onigiri: 'nj_Food_Onigiri',
  sushi: 'nj_Food_Sushi', sushi_rolo: 'nj_Food_Sushi2', yakitori: 'nj_Food_Yakitori',
  aneis_lula: 'nj_Food_Calamari', camarao_frito: 'nj_Food_Shrimp', polvo_cozido: 'nj_Food_Octopus',
  cabaca_licor: 'nj_Object_Gourd', cha_verde: 'nj_Food_TeaLeaf', noz_macadamia: 'nj_Food_Nut',
  castanha_rubra: 'nj_Food_Nut2', amendoa: 'nj_Food_SeedLarge', pinhao: 'nj_Food_SeedLargeWhite',
  semente_abobora: 'nj_Food_Seed1', semente_rabanete: 'nj_Food_Seed2', semente_tomate: 'nj_Food_Seed3',
  broto_cenoura: 'nj_Food_SeedBig1', broto_nabo: 'nj_Food_SeedBig2', broto_beterraba: 'nj_Food_SeedBig3',
  dado_6: 'nj_Object_Dice6', dado_4: 'nj_Object_Dice4', dado_8: 'nj_Object_Dice8',
  dado_20: 'nj_Object_Dice20', ampulheta: 'nj_Object_Hourglass', flauta_pa: 'nj_Object_PanFlute',
  diario: 'nj_Object_Book', carta_lacrada: 'nj_Other_Letter', carta_amor: 'nj_Other_Letter2',
  carta_guilda: 'nj_Other_Letter3', selo_cera: 'nj_Other_Stamp', galho_macieira: 'nj_Resource_Branch',
  moedas_cobre: 'nj_Treasure_Coin2', moeda_prata: 'nj_Treasure_SilverCoin', moeda_ouro: 'nj_Treasure_GoldCoin',
  taca_prata: 'nj_Treasure_SilverCup', calice_ouro: 'nj_Treasure_GoldCup', chave_prata: 'nj_Treasure_SilverKey',
  chave_ouro: 'nj_Treasure_GoldKey', bau_pequeno: 'nj_Treasure_LittleTreasureChest', bau_tesouro: 'nj_Treasure_BigTreasureChest',
  topazio: 'nj_Resource_GemYellow', ametista: 'nj_Resource_GemPurple', rubi: 'nj_Resource_GemRed',
  esmeralda: 'nj_Resource_GemGreen', femur_fossil: 'nj_Weapons_Bone',
};
