# Loja do Aventureiro

Jogo de gerenciar uma loja de aventureiros, da Scorpion Bits. Roda no navegador, pensado primeiro
para celular em pé (toque), em pt-BR. Feito com [PixiJS 8](https://pixijs.com/) + [Vite](https://vite.dev/).
(O nome é provisório.) O plano completo de construção está em [`PLANO.md`](PLANO.md).

> Estado atual: **mini-jogo de memória** (Mercado → Mini-jogo, ganha um pouco de material), estoque dos fornecedores a cada 3 h com compra urgente, mais batedores cedo e filtro de receitas na Oficina. Antes, M12 (balanceamento): simulador `npm run sim`, reputação que não cai de nível, ritmo de ~2 semanas até a primeira expansão. Antes, M11 (arte e polimento): botões e molduras em pixel-art, "+ouro" nas vendas, opção de reduzir animações. Antes: M10, prestígio: "Expandir para uma nova cidade" com Herança e 12 bônus permanentes. Antes: M9, conquistas e coleção. Já tem retenção (encomendas e especial do dia, sequência com perdão, baú semanal, eventos sazonais),
> 106 conquistas com prêmio e a Coleção (enciclopédia de itens e de aventureiros). Conteúdo: 52 aventureiros em 8 classes e 6 regiões, 10 lendários com 33 capítulos, 38 eventos
> aleatórios, mapa com expedições, 112 itens, 106 receitas, 13 fornecedores, ícones do pack e 21 melhorias por ofício. Há topo, cinco abas, configurações, sons, layout responsivo,
> save com migração, dados e validador, e a **Loja** funcionando: fila de clientes, pedidos, três preços,
> temperamentos e reputação, e o **Mercado**: fornecedores com preço e estoque do dia e o depósito de materiais.
> A **Oficina** produz em tempo real (continua com o jogo fechado). **Melhorias**: ampliar, prateleiras, balcão, decoração, equipe
> (atendente, artesão, vendedor) e a árvore de cada ofício. Tutorial guiado em sequências: 5 passos na Loja no começo e um tutorial curto para cada aba na primeira visita (destaca o botão a tocar e troca de sub-aba sozinho; editável em `src/data/tutorial.js`).
> As próximas etapas estão no plano.

## Rodar localmente

```bash
npm install
npm run dev          # http://localhost:5173
```

Em modo de desenvolvimento existe o objeto `window.__loja` (só em dev) com atalhos para testes e depuração.

## Testes

```bash
npm run validate     # confere os arquivos de dados (ids, referências); `-- --metas` cobra as metas de conteúdo
npm run test:unit    # lógica pura (núcleo, save, dados, layout...), roda no Node
npm run test:e2e     # jogo no Chromium com GL por software (Playwright)
npm test             # os três
```

As capturas de tela dos testes ficam em `tests/out/shots/` (fora do git). No container de desenvolvimento
o Chromium já está instalado; em outra máquina rode `npx playwright install chromium` uma vez.

## Publicar

| Onde | Endereço | Como |
| --- | --- | --- |
| Página do repositório | <https://scorpionbits.com/adventure-store/> | Automático: `.github/workflows/pages.yml` compila (`npm run build`) e publica a cada push na `main`. Primeira vez: **Settings → Pages → Source = "GitHub Actions"**. |
| Dentro do site | <https://scorpionbits.com/loja/> | Manual: `npm run publish:site -- ../scorpion-bits.github.io`, depois `git add loja && git commit && git push` no repositório do site. |

O build do site (`npm run build:site`) **não empacota o PixiJS**: usa o `window.PIXI` de
`assets/vendor/pixi.min.js` do próprio site (veja `src/pixi-global.js`). Se o jogo passar a usar outra
classe do Pixi, exporte-a nesse arquivo também.

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `src/ui/` | Componentes (cartões, botões, listas roláveis com toque, interruptores, janela), tema, animações, layout responsivo, telas |
| `src/audio/` | Efeitos sintetizados (Web Audio) e música opcional |
| `src/data/` | Conteúdo do jogo (itens, receitas, aventureiros...). É aqui que se adiciona conteúdo, sem mexer no código |
| `src/core/` | Lógica pura, sem Pixi: estado, save, sorteios com semente, relógio/calendário, economia, o `game` |
| `src/assets.js` | Manifesto de sprites: ícones do atlas, ou provisórios desenhados por código |
| `tests/` | Testes de lógica (Node) e do jogo (Playwright) |

### Adicionar conteúdo

Tudo fica em `src/data/`; cada arquivo começa com um comentário explicando os campos. Basta acrescentar uma
entrada na lista e rodar `npm run validate`, que acusa id repetido, categoria/material inexistente, falas
faltando etc. Exemplo, um item novo em `itens.js`:

```js
{ id: 'machado_ferro', nome: 'Machado de ferro', cat: 'armas', raridade: 'comum', valor: 38 },
```

e a receita dele em `receitas.js`:

```js
{ id: 'r_machado_ferro', item: 'machado_ferro', oficio: 'ferraria', nivel: 1, tempo: 80, materiais: { barra_ferro: 2, madeira: 1 } },
```

Conquistas ficam em `conquistas.js`: cada uma é uma linha com a medida (vendas, ouro, itens descobertos...), a meta e o prêmio;
meta `'todos'` acompanha o conteúdo que você acrescentar.

Os números de balanceamento (preços, qualidades, temperamentos, reputação) ficam em `src/data/meta.js`.

**Ícones:** cada item/material aponta para um ícone do pack em `src/data/icones.js` (`id: 'fbNN'`, onde NN é o
número do ícone). Depois de mudar essa lista, rode `npm run pack:icons` (com o pack original em `assets-src/raven`,
fora do git): ele gera o atlas pequeno em `src/assets/atlas/`, que é o que vai para o repositório e para o jogo.

**Interface:** botões, moldura de madeira e moedas vêm do Cryo's Mini GUI. As peças usadas e as margens do 9-slice ficam em
`scripts/pack-gui.mjs`; `npm run pack:gui` (pack original em `assets-src/cryo`, fora do git) gera `src/assets/gui/`. Sem o atlas,
a interface volta às formas desenhadas por código. A opção "Animações" das configurações (e `prefers-reduced-motion`) desliga as animações.

**Melhorias dos ofícios:** `src/data/melhorias.js` gera 4 linhas de 5 degraus (velocidade, qualidade, capacidade,
rendimento) mais um nó final por ofício a partir de tabelas no topo do arquivo; é só mexer nelas para rebalancear.
Melhorias avulsas (da loja, ou especiais) entram como objetos nas listas, usando os efeitos de `src/core/mods.js`.

`npm run validate -- --metas` confere as metas de quantidade (hoje todas atingidas).

### Mini-jogo de memória

Em *Mercado → Mini-jogo*: vire as cartas e ache os pares; cada par rende **1 unidade daquele material** (mais 1 a cada 15 de reputação, e dobrado se
acertar tudo com no máximo 2 erros). Os materiais sorteados são só os das regiões que a reputação já abriu, e o tabuleiro cresce (6, 8 e 10 pares).
São **3 partidas guardadas**, que voltam uma a cada 2 horas (também com o jogo fechado), então é um complemento: uma expedição curta traz o mesmo
que uma partida perfeita. Os números ficam em `minijogo` de `src/data/meta.js`; a lógica em `src/core/minigame.js` e a tela em `src/ui/minijogo.js`.

### Balanceamento e ritmo de jogo

`npm run sim` joga o jogo inteiro sem interface com um bot (só `src/core` e `src/data`) e mostra a economia ao longo do tempo.
Opções: `--perfil casual|regular|dedicado` (3x5, 2x20 ou 4x30 minutos de jogo por dia, o resto do tempo o jogo fica fechado),
`--dias N`, `--semente N`, `--prestigio` (expande de novo sempre que rende 3+ de Herança) e `--json`. No fim ele mostra
o que aconteceu com os clientes e a reputação ganha e perdida, que ajuda a achar gargalos.

Ritmo que o jogo mira hoje (perfil regular, o bot é um pouco pior que uma pessoa atenta):

| Quando | Reputação | O que acontece |
| --- | --- | --- |
| Primeira hora | 2 a 3 | 3 ofícios abertos, primeiras melhorias, primeiro funcionário |
| Fim do dia 1 | 5 a 7 | segundo e terceiro ofícios, equipe completa |
| Fim da semana 1 | 11 a 12 | 7 ofícios, 60+ melhorias |
| Dia 13 a 14 | 15 a 16 | primeira expansão (rende 3 de Herança); a seguinte sai em ~9 dias |

O perfil casual (15 min por dia) chega à reputação 20 em um mês; o dedicado faz a primeira expansão em ~8 dias.
Os números que mais mexem no ritmo: `reputacao` e `prestigio` em `src/data/meta.js`, as chegadas de clientes (`loja`) e os custos
das melhorias. `tests/unit/balance.test.mjs` guarda o ritmo dos dois primeiros dias para um ajuste não quebrar o começo sem aviso.

### Save

O progresso fica no `localStorage` (`scorpion-bits-loja-v1`), salvo a cada 10 s e ao sair da página. Para
criar um campo novo, acrescente-o em `src/core/state.js` com um valor padrão: saves antigos são completados
sozinhos (`withDefaults`), nunca quebram. Mudança que precisa transformar dados antigos entra em `MIGRACOES`
(`src/core/save.js`).

### Layout responsivo

`src/ui/layout.js` é uma função pura que recebe a largura/altura e devolve os retângulos de tudo:
`portrait` (celular em pé, abas embaixo), `landscape` (celular deitado, abas num trilho à esquerda) e
`desktop` (o mesmo do retrato, mais largo e centralizado). Respeita as áreas seguras (notch).

### Música

A trilha é opcional. Coloque arquivos `.mp3`, `.ogg` ou `.wav` em `src/assets/music/`: o jogo toca um deles
em loop (sorteado a cada abertura) e a janela de configurações ganha os controles de música.
Sem arquivos, não há música e nada quebra.

## Arte de terceiros

Veja [`CREDITS.md`](CREDITS.md). Os pacotes de arte originais ficam em `assets-src/` (ignorado pelo git,
por causa das licenças); só o atlas gerado a partir deles entra no repositório.

### Instalar como app (PWA)

O jogo (tanto a versão da página do repositório, `npm run build`, em `scorpionbits.com/adventure-store/`, quanto a do site, em `scorpionbits.com/loja/`) é um **app instalável** e funciona **sem internet**:
- **Android (Chrome):** menu → *Instalar app*, ou o botão **Instalar o app** nas Configurações do jogo.
- **iPhone/iPad (Safari):** *Compartilhar* → *Adicionar à Tela de Início*.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço, ou o botão nas Configurações.

Como funciona: `public/manifest.webmanifest` descreve o app (nome, cores, tela cheia, ícones); o plugin `scripts/pwa-plugin.mjs` gera `dist/sw.js` no build,
um service worker que guarda o jogo inteiro na primeira visita. Quando sai uma versão nova, o app avisa para fechar e abrir de novo. O save continua no
`localStorage` do aparelho. Os ícones (uma espada do pack Raven sobre madeira escura) saem de `npm run icons:app`.
A versão do site (`npm run build:site`, publicada em `scorpionbits.com/loja/`) também é instalável e offline: o service worker dela (escopo `/loja/`)
guarda, além do jogo, o PixiJS, as fontes e o logo que vêm de `/assets/` do site.
`npm run test:pwa` confere, nas duas versões, manifesto, ícones, instalação do service worker e abertura offline (a versão do site é testada numa cópia
montada em `tests/out/site-raiz` por `tests/pwa/servidor-site.mjs`).

### Jogar pelo GitHub Pages

O workflow `.github/workflows/pages.yml` compila (`npm run build`) e publica a cada push na `main` (e pode ser rodado à mão em *Actions*).
Uso único: *Settings → Pages → Source = GitHub Actions*. O endereço fica em `https://<organização>.github.io/adventure-store/` (ou no domínio próprio da organização).
O ambiente `github-pages` só aceita a `main`, então branches de desenvolvimento não publicam.

Os testes (`.github/workflows/test.yml`) rodam em todo pull request e em push na `main`, com uma nova tentativa automática para testes lentos.
