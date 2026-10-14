# Créditos e licenças de terceiros

Tudo o que não foi escrito pela Scorpion Bits está listado aqui, com autor, link e licença.
Quando um asset novo entra no jogo, ele entra nesta lista no mesmo commit.

## Em uso

| O quê | Autor | Link | Licença |
| --- | --- | --- | --- |
| PixiJS 8 (renderização) | Pixi contributors | <https://pixijs.com/> | MIT |
| Fonte Space Grotesk (títulos, carregada como "Grotesk") | Florian Karsten e colaboradores | <https://github.com/floriankarsten/space-grotesk> | SIL Open Font License 1.1 |
| Fonte Inter (texto, carregada como "Body") | Rasmus Andersson e colaboradores | <https://github.com/rsms/inter> | SIL Open Font License 1.1 |
| Logo e favicon da Scorpion Bits | Scorpion Bits | <https://scorpionbits.com/> | Marca da Scorpion Bits |
| Cryo's Mini GUI (botões, moldura de madeira, moedas e ícones da interface; `src/assets/gui/`, gerado por `npm run pack:gui`) | PaperHatLizard (Cryo) | Página do pack no itch.io: "Cryo's Mini GUI" | O autor confirmou, na página do pack, que qualquer asset pode ser usado em projetos comerciais; crédito não é obrigatório, mas ele pede que ninguém diga que fez a arte. Os PNGs originais ficam fora do git; só as peças usadas são publicadas. |
| Ninja Adventure Asset Pack (retratos dos aventureiros, sem o fundo, em `src/assets/retratos/`, os emotes das reações, em `src/assets/emotes/`, os ícones de ~86 itens, em `src/assets/itens/`, e o mapa-múndi com os batedores que andam nele, em `src/assets/mapa/`; gerados por `npm run pack:ninja`) | Pixel-boy e AAA | <https://pixel-boy.itch.io/ninja-adventure-asset-pack> | **CC0 1.0** (domínio público): uso livre, até comercial, sem crédito obrigatório (aqui, o crédito é bem-vindo). O pack tem tilesets e sprites animados que ainda não usamos. Os PNGs originais ficam em `assets-src/` (fora do git, por tamanho); só os atlas gerados entram no repositório. |
| Ícones de itens e materiais: packs CC0 reunidos em `src/assets/itens/` (gerado por `npm run pack:itens`; os PNGs originais ficam em `assets-src/cc0/`, fora do git). Pastas usadas: `armor-ettingrinder`, `armor-ocal`, `axe-7soul1_20201212`, `axe-ocal`, `book-7soul1_20201212`, `book-ocal`, `club-ocal`, `food-7soul1_20201212`, `food-ocal`, `footgear-ocal`, `gem-7soul1_20201212`, `gem-ocal`, `hammer-ocal`, `headgear-ocal`, `idylwilds_inventory`, `jewelry-7soul1_20201212`, `jewelry-ocal`, `key-ocal`, `polearm-ocal`, `potion-ocal`, `ranged-ocal`, `shield-blarumyrran`, `shield-ocal`, `stave-7soul1_20201212`, `stave-ocal`, `sword-babysamurai`, `sword-melle`, `sword-ocal_20230219`. Quem é quem: `idylwilds_inventory` (Idylwild, OpenGameArt: <https://opengameart.org/node/171013>); os pacotes `*-ocal` (food, potion, jewelry, gem, headgear, armor, sword, ranged, shield, stave, key, club, polearm, axe, hammer, book, footgear), arte derivada do OpenClipart (domínio público) reunida por AntumDeluge nas coleções "CC0 Consolidated Submissions" do OpenGameArt: <https://opengameart.org/content/cc0-food-icons>, <https://opengameart.org/content/cc0-potion-icons>, <https://opengameart.org/content/cc0-gem-icons> e as demais "CC0 ... Icons" da lista dele; `*-7soul1_20201212` (food, gem, jewelry, axe, book, stave), de Henrique Lazarini (7Soul1), pacote "496 pixel art icons": <https://www.deviantart.com/7soul1/art/129892453>; `sword-melle` (<https://opengameart.org/node/108926>), `sword-babysamurai` (<https://opengameart.org/node/96388>), `armor-ettingrinder` (<https://opengameart.org/node/10653>), `shield-blarumyrran` (<https://opengameart.org/node/5066>), cada um do autor do próprio nome | Idylwild, AntumDeluge (compilação), OpenClipart, 7Soul1, Melle, BabySamurai, ETTiNGRiNDER, Blarumyrran | Páginas acima, e a dos Ninja Adventure abaixo | **CC0 1.0** (domínio público), conforme as páginas dessas coleções no OpenGameArt: uso livre, até comercial, com anúncios e compras dentro do jogo, sem crédito obrigatório (aqui, o crédito é bem-vindo). Os ícones do Ninja Adventure (`nj_`, `ns_`) também entram nesse atlas. |
| Música "Taverna ao entardecer" (`src/assets/music/taverna-ao-entardecer.mp3`; faixa provisória até a trilha própria ficar pronta) | Scorpion Bits (sintetizada por código, sem amostras de terceiros: `scripts/gerar-musica.py`) | — | Da Scorpion Bits |

## Aprovados, ainda não usados

Os packs "Cryo's Mini GUI Controller" e "Cryo's Mini GUI Social Buttons" (mesmo autor e mesma licença) foram enviados, mas o jogo não usa nada deles.

## Removidos

- **Raven Fantasy Icons (versão gratuita)**, de Caio / Clockwork Raven Studios: era a arte dos itens e materiais até a troca pelos packs CC0 acima. A licença da versão gratuita só vale para jogos gratuitos, sem anúncios e sem microtransações, por isso saiu do jogo (e do app: o ícone do app agora é uma espada CC0). O pack original, se ainda estiver em `assets-src/raven`, não é mais usado por nada.
- **BizmasterStudios** (poções e arco): a página original de parte dos ícones dele tem outra licença (CC-BY 4.0), então nenhum ícone dele foi usado.

