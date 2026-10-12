# Loja do Aventureiro

Jogo de gerenciar uma loja de aventureiros, da Scorpion Bits. Roda no navegador, pensado primeiro
para celular em pé (toque), em pt-BR. Feito com [PixiJS 8](https://pixijs.com/) + [Vite](https://vite.dev/).
(O nome é provisório.) O plano completo de construção está em [`PLANO.md`](PLANO.md).

> Estado atual: **M1 (núcleo e dados)**. Há topo, cinco abas, configurações, sons, layout responsivo,
> save com migração, formato definitivo dos dados e validador; as telas ainda são provisórias.
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

Os números de balanceamento (preços, qualidades, temperamentos, reputação) ficam em `src/data/meta.js`.

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
