// Ligação entre itens/materiais e a arte: { idDoItem: quadro }. Há dois atlas:
//  - "fbNN": o número do ícone no pack "Raven Fantasy Icons" (Clockwork Raven Studios); rode `npm run pack:icons` depois de mudar;
//  - "nj_<Pasta>_<Nome>": um ícone 16x16 do pack Ninja Adventure (CC0), do atlas src/assets/itens; rode `npm run pack:ninja`.
// Quem não estiver aqui usa um ícone provisório desenhado por código.
// Os retratos dos aventureiros vêm do pack (data/retratos.js), não daqui.
export const ICONES = {
  // ---------- materiais: vila ----------
  barra_ferro: 'fb221', carvao: 'fb210', madeira: 'fb252', couro_cru: 'fb204', erva_curativa: 'fb241', cristal_mana: 'fb255',
  farinha: 'fb478', carne: 'fb488', cobre: 'fb203', linho: 'fb113', la: 'fb235', pedra: 'fb316', mel: 'fb502', baga: 'fb436',
  frasco: 'fb50', leite: 'fb538', peixe: 'fb361', arroz: 'fb456', sal: 'fb430', polvora: 'fb461',
  // ---------- materiais: floresta ----------
  pele_lobo: 'fb220', madeira_nobre: 'fb253', seiva: 'fb246', cogumelo: 'fb247', flor_lunar: 'fb245', pena: 'fb7', garra: 'fb232', teia: 'fb211',
  bambu: 'fb452', resina: 'fb450', ginseng: 'fb457',
  // ---------- materiais: montanhas ----------
  aco: 'fb218', mithril: 'fb219', prata: 'fb152', ouro_barra: 'fb150', gema_bruta: 'fb214', quartzo: 'fb26', pedra_runica: 'fb324',
  jade: 'fb167', enxofre: 'fb198', safira_bruta: 'fb165',
  // ---------- materiais: deserto ----------
  especiaria: 'fb468', seda: 'fb111', presa_escorpiao: 'fb233', cristal_solar: 'fb171', vidro_fino: 'fb168', incenso: 'fb84',
  ambar: 'fb432', papiro: 'fb105', areia_dourada: 'fb417',
  // ---------- materiais: pântano ----------
  lodo: 'fb193', veneno: 'fb57', cogumelo_azul: 'fb249', musgo: 'fb242', raiz_negra: 'fb251', essencia_brejo: 'fb335',
  turfa: 'fb372', flor_carnivora: 'fb263', perola_negra: 'fb384',
  // ---------- materiais: dragão ----------
  escama_dragao: 'fb234', brasa_eterna: 'fb164', osso_draconico: 'fb222', ouro_dragao: 'fb131', ferro_celeste: 'fb217', sangue_dragao: 'fb163',
  coracao_dragao: 'fb659', chifre_dragao: 'fb208', perola_ardente: 'fb386',

  // ---------- armas ----------
  clava_madeira: 'fb1468', adaga_bronze: 'fb1444', arco_curto: 'fb1483', espada_ferro: 'fb1447', lanca_ferro: 'fb1460',
  machado_guerra: 'fb1465', arco_longo: 'fb1516', espada_aco: 'fb1508', balestra: 'fb1481', martelo_guerra: 'fb1477',
  espada_mithril: 'fb1518', arco_elfico: 'fb1515', cimitarra_deserto: 'fb1507', lamina_do_brejo: 'fb1509',
  machado_titanico: 'fb1466', lamina_draconica: 'fb1526',
  // ---------- armaduras ----------
  capuz_couro: 'fb1956', botas_couro: 'fb1938', escudo_madeira: 'fb1810', peitoral_couro: 'fb1974', robe_aprendiz: 'fb1969',
  elmo_ferro: 'fb1905', escudo_ferro: 'fb1811', manto_viajante: 'fb1975', cota_malha: 'fb1921', peitoral_aco: 'fb1928',
  manto_lobo: 'fb2031', escudo_torre: 'fb1813', armadura_placas: 'fb1935', armadura_mithril: 'fb1930', elmo_escamas: 'fb1909',
  armadura_draconica: 'fb1934',
  // ---------- poções ----------
  pocao_cura: 'fb276', pocao_mana: 'fb123', antidoto: 'fb121', elixir_vigor: 'fb269', pocao_velocidade: 'fb122',
  pocao_visao_noturna: 'fb273', pocao_forca: 'fb281', pocao_cura_maior: 'fb288', pocao_coragem: 'fb267', pocao_mana_maior: 'fb69',
  elixir_resistencia: 'fb284', pocao_invisibilidade: 'fb58', elixir_longevidade: 'fb63', pocao_ressurreicao: 'fb286',
  // ---------- magia ----------
  pergaminho_faisca: 'fb301', pergaminho_gelo: 'fb302', pergaminho_cura: 'fb299', pergaminho_chama: 'fb297', pergaminho_raio: 'fb300',
  runa_protecao: 'fb326', grimorio_aprendiz: 'fb289', cajado_carvalho: 'fb1573', varinha_cristal: 'fb295', orbe_arcano: 'fb293',
  cajado_tempestade: 'fb1576', tomo_proibido: 'fb290', pergaminho_meteoro: 'fb1001', cajado_arcano_supremo: 'fb1578',
  // ---------- ferramentas ----------
  pa: 'fb1469', vara_pescar: 'fb337', foice: 'fb1457', corda_gancho: 'fb1474', martelo: 'fb126', machado_lenhador: 'fb1464',
  picareta_ferro: 'fb1458', lanterna: 'fb85', chave_mestra: 'fb71', kit_acampamento: 'fb93', picareta_aco: 'fb1538', balanca_precisao: 'fb124',
  // ---------- acessórios ----------
  pulseira_couro: 'fb2068', colar_contas: 'fb2066', anel_cobre: 'fb1844', anel_prata: 'fb2061', amuleto_sorte: 'fb2182',
  brincos_ouro: 'fb1848', amuleto_protecao: 'fb2178', anel_rubi: 'fb1845', colar_esmeralda: 'fb2065', broche_estelar: 'fb2188',
  tiara_safira: 'fb1837', anel_do_vento: 'fb1847', coroa_real: 'fb1839', colar_draconico: 'fb2180',
  // ---------- comida ----------
  pao_aventureiro: 'fb513', cerveja: 'fb503', queijo: 'fb497', espeto_carne: 'fb483', ensopado: 'fb479', torta_maca: 'fb533',
  sopa_cogumelo: 'fb477', peixe_assado: 'fb487', bolo_mel: 'fb523', torta_carne: 'fb526', vinho_tinto: 'fb525', banquete: 'fb527',
  pao_elfico: 'fb514', ensopado_dragao: 'fb505',
  // ---------- curiosidades ----------
  dente_lobo: 'fb230', osso_antigo: 'fb231', pena_grifo: 'fb239', geodo: 'fb209', cranio_antigo: 'fb225', moeda_antiga: 'fb129',
  mapa_tesouro: 'fb109', chave_misteriosa: 'fb77', estatueta_jade: 'fb1', relicario: 'fb6', orbe_cristal: 'fb336', ovo_dragao: 'fb236',

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
