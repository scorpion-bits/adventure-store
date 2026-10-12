# Loja do Aventureiro

Jogo de gerenciar uma loja de aventureiros, da Scorpion Bits. Roda no navegador, pensado primeiro
para celular em pé (toque), em pt-BR. Feito com [PixiJS 8](https://pixijs.com/) + [Vite](https://vite.dev/).
(O nome é provisório.) O plano completo de construção está em [`PLANO.md`](PLANO.md).

> Estado atual: **M0 (esqueleto)**. Há topo, cinco abas, janela de configurações, sons e layout
> responsivo; as telas ainda são provisórias. As etapas seguintes estão no plano.

## Rodar localmente

```bash
npm install
npm run dev          # http://localhost:5173
```

Em modo de desenvolvimento existe o objeto `window.__loja` (só em dev) com atalhos para testes e depuração.

## Testes

```bash
npm run test:unit    # lógica pura (layout, formatação...), roda no Node
npm run test:e2e     # jogo no Chromium com GL por software (Playwright)
npm test             # os dois
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
| `src/core/` | Lógica pura, sem Pixi (chega no M1) |
| `tests/` | Testes de lógica (Node) e do jogo (Playwright) |

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
