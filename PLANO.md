# Loja do Aventureiro — plano de construção

> Documento para aprovação **antes** de qualquer código. Nome provisório: "Loja do Aventureiro".
> Jogo da Scorpion Bits · PixiJS 8 + Vite · mobile-first (toque) · pt-BR.

## 0. O que já verifiquei

| Item | Achado |
| --- | --- |
| Repositório | Estou em `scorpion-bits/adventure-store` (branch `claude/clever-pasteur-n42qo5`), vazio. Mantenho este repo; o nome só importa na publicação (`/loja/`). |
| `idle-game-scorpion` | Li `ui.js`, `theme.js`, `anim.js`, `sfx.js`, `music.js`, `settings.js`, `pixi-global.js`, `vite.config.js` (modo `site` com `window.PIXI`), `publish-site.mjs`, workflow do Pages e o `balance-sim.mjs`. Dá para portar quase tudo. O `main.js` (3.400 linhas) **não** será copiado: lá estado, lógica e UI estão misturados; aqui a lógica fica separada da UI. |
| Pack de ícones | *Raven Fantasy Icons* (Clockwork Raven Studios): **2.192 ícones**, folhas de 16 colunas em 16/32/64 px, mais PNGs separados. Cobre armas, armaduras, escudos, elmos, botas, anéis/colares, poções, comida (pratos, frutas, carnes), gemas, minérios/barras, ervas, pergaminhos, livros, chaves, ferramentas, ícones de habilidades/efeitos e algumas construções. **Não tem** personagens, rostos nem cenário. |
| Ferramentas | Node 22, Chromium + Playwright já instalados no container. |

## 1. Pontos que precisam da sua decisão (tenho um padrão para cada)

1. **Licença do pack (importante).** Os termos que você colou dizem: uso comercial permitido, mas **não pode ser distribuído ou vendido como produto separado**, e o "uso pessoal" vale para jogo **gratuito, sem microtransações e sem anúncios**.
   - Colocar os PNGs soltos num repositório **público** é redistribuí-los. O jogo publicado precisa carregá-los (isso é uso normal), mas a pasta original não deve ir para o git.
   - **Padrão proposto:** a pasta do pack fica fora do git (`.gitignore`); o repo guarda só o **atlas empacotado** (só os ícones que o jogo usa) + `assets.js`, e um script `npm run pack:icons -- <pasta-do-pack>` regenera o atlas. O `CREDITS.md` cita Clockwork Raven Studios e a licença.
   - **Você confirma:** o site/jogo não terá anúncios nem compras dentro do jogo? Se isso mudar, é preciso a licença certa do pack. Se preferir, o repo pode ser privado.
2. **Personagens e cenário** não existem no pack. **Padrão:** aventureiros e loja desenhados por código (retratos em camadas: corpo, cabelo, cor da classe, acessório por classe) — consistente em pixel-art 16 px ampliado, trocável depois pelo manifesto. Os **itens** usam o pack desde o início do conteúdo (mapa `item.id → ícone`).
3. **Música:** o idle usa um mp3 que não tenho. **Padrão:** música gerada por Web Audio (loop curto e calmo, liga/desliga nas configurações). Dá para trocar por arquivo depois.
4. **Tempo do jogo.** **Padrão:** a loja funciona em **tempo real** enquanto o jogo está aberto (um cliente a cada ~6–15 s, conforme reputação e tamanho da loja). Um **"dia"** é o dia do calendário (fuso do jogador): encomendas, fornecedores, aventureiro especial e sequência mudam à meia-noite, sorteados pela **data** (iguais para todos).

## 2. Telas e navegação

Barra superior fixa: **ouro · reputação (nível + barra) · dia/sequência · engrenagem**.
Abas inferiores (altura de toque 56+ px, uma mão): **Loja · Oficina · Mercado · Aventureiros · Melhorias**.
Desktop usa o mesmo layout num painel central mais largo (a loja ganha mais colunas de prateleira).

| Aba | Conteúdo |
| --- | --- |
| **Loja** | Cena da loja (balcão, prateleiras que mostram o estoque de verdade, fila de clientes). Cartão do cliente atual: retrato, fala, pedido, humor. Três botões de preço **Barato / Justo / Caro** com ouro previsto e efeito na reputação; escolher o item do estoque a oferecer (ou "Recusar"). Fila: tocar num cliente da fila **passa-o à frente** (decisão "quem atender primeiro"). Faixa de eventos ativos. |
| **Oficina** | Sub-abas por **ofício** (8). Lista de receitas (ícone, materiais com contagem/falta, tempo, qualidade esperada), fila de produção com barras de progresso em tempo real, botão "coletar → prateleira". Slots de produção crescem com melhorias. |
| **Mercado** | **Fornecedores** (12): preço e estoque do dia, comprar 1/5/máx; **Mapa** (6 regiões): reputação para destravar, materiais/clientes/eventos exclusivos, mandar uma expedição de coleta. |
| **Aventureiros** | **Hoje** (aventureiro especial, encomendas diárias, baú semanal, sequência); **Coleção** (enciclopédia de aventureiros e de itens, "???" até descobrir); **Lendários** (história em mini-capítulos). |
| **Melhorias** | Sub-abas: **Loja** (ampliar, decoração, prateleiras, balcão) · **Ofícios** (8 árvores de 20+ nós) · **Equipe** (atendente, artesão, vendedor, com nível e salário) · **Conquistas** (80+) · **Expandir** (prestígio). |

Sobreposições (janelas): evento aleatório com escolhas · tutorial (balões curtos) · ganho offline ("enquanto você esteve fora") · configurações · detalhes de item/aventureiro.

## 3. Loop principal (regras que viram código)

1. **Chegada.** Cliente sorteado da região ativa + especial do dia + lendário elegível. Tem pedido: item exato, categoria ou "me surpreenda". Fila máxima = tamanho da loja; quem espera demais perde paciência e sai (reputação −).
2. **Preço.** Preço-base = `valor do item × multiplicador de qualidade × mercado do dia`. Opções: **barato ×0,75**, **justo ×1,0**, **caro ×1,35** (valores nos dados).
   - Probabilidade de compra = f(orçamento do cliente, tolerância do temperamento, oferta do item, decoração/atendimento).
   - Temperamentos (dados): pechincheiro, esnobe, impaciente, generoso, desconfiado, curioso, leal, sovina.
   - Barato: quase sempre compra, **+reputação**, menos ouro. Caro: mais ouro, **risco de recusa e −reputação**; esnobe e generoso gostam de caro.
   - O cartão mostra uma **dica de humor** (rosto/indicador), então a decisão é informada, não aleatória às cegas.
3. **Estoque.** Prateleiras com capacidade por categoria. Item faltando → oferecer substituto (pior chance, mas vende) ou recusar. Estoque é por `item + qualidade`.
4. **Produção.** Receita consome materiais, ocupa um slot do ofício por `tempo`, entrega item com qualidade definida pelo nível do ofício/melhorias. Roda por timestamp de término (continua com o jogo fechado).
5. **Progressão.** Ouro e reputação pagam melhorias, destravam ofícios e regiões; reputação sobe de nível (cada nível libera clientes/itens/fornecedores).
6. **Qualidades:** Tosco ×0,7 · Comum ×1,0 · Fino ×1,35 · Primoroso ×1,8 (a quarta destrava com melhorias). **Raridades:** comum, incomum, raro, épico, lendário.

## 4. Arquitetura

```
index.html  vite.config.js  .env.site  package.json
scripts/
  balance-sim.mjs        simulador headless (usa só src/core + src/data)
  validate-data.mjs      confere referências, mínimos de conteúdo, ids duplicados
  pack-icons.mjs         empacota o pack em atlas + gera mapa de ícones
  publish-site.mjs       build:site → <site>/loja/
src/
  main.js                bootstrap Pixi, loop, layout
  assets.js              MANIFESTO de sprites (placeholder por código → atlas)
  core/                  LÓGICA PURA, sem Pixi (roda no Node, usada pelo simulador)
    state.js  save.js  time.js  rng.js  economy.js  shop.js  customers.js
    craft.js  market.js  staff.js  regions.js  events.js  daily.js
    achievements.js  prestige.js  offline.js
  data/                  TODO O CONTEÚDO (editável sem tocar no código)
    items.js  recipes.js  crafts.js  upgrades.js  adventurers.js  legends.js
    regions.js  suppliers.js  events.js  achievements.js  decor.js
    staff.js  seasons.js  tutorial.js  strings.js
  ui/                    ui.js theme.js anim.js (portados) + telas/ (loja, oficina, mercado, ...)
  audio/                 sfx.js music.js (sintetizados)
  settings.js
tests/                   Playwright (software GL) + testes de lógica
```

- **Dados × lógica:** os arquivos de `data/` exportam objetos simples; a UI e o core só os leem. Para adicionar conteúdo basta acrescentar uma entrada. `validate-data.mjs` roda no `npm test` e no CI e falha se faltar referência (ex.: receita usando material inexistente) ou se algum mínimo da meta cair.
- **Save:** `localStorage` com chave versionada, `version` + `migrate()`; todo campo novo é opcional e recebe padrão ao carregar (`withDefaults`), então saves antigos nunca quebram. Autosave a cada 10 s e ao esconder a aba. Há teste que carrega saves "antigos" fabricados.
- **Tempo/offline:** estado guarda timestamps; ao abrir, `offline.js` simula oficina + funcionários até o teto (padrão 8 h, melhorias aumentam) com taxa reduzida e mostra o resumo.
- **RNG:** gerador com semente (`mulberry32`) — encomendas diárias/especial do dia usam a data como semente; o simulador usa semente fixa.
- **Build:** `npm run build` (autossuficiente, Pages do repo) e `npm run build:site` (usa `window.PIXI` do site, `src/pixi-global.js`, casca com carregamento e botão "voltar").
- **Layout responsivo:** modos `portrait`, `landscape` (baixa altura: abas viram trilho lateral) e `desktop`, recalculados no `resize`, igual ao idle.
- **Dev hooks:** `window.__loja` só com `import.meta.env.DEV`: `state()`, `give(ouro)`, `skip(ms)`, `spawnCustomer(id)`, `setDay(date)`, `unlock(...)`, `openTab(...)`. Os testes usam isso para não esperar tempo real.
- **Testes:** Playwright com Chromium em software GL (`--use-angle=swiftshader`), checando: carga sem erros no console, cada aba abre, vender, produzir, comprar, offline, save/load, layout nos três modos (capturas). Mais testes de lógica pura e o validador de dados.

## 5. Dados: formatos (resumo)

```js
// items.js
{ id: 'espada_ferro', nome: 'Espada de Ferro', cat: 'armas', raridade: 'comum',
  valor: 40, icone: 'espada_01', prateleira: 1 }
// recipes.js
{ id: 'r_espada_ferro', item: 'espada_ferro', oficio: 'ferraria', nivelOficio: 1,
  tempo: 90, materiais: { barra_ferro: 2, carvao: 1 } }
// adventurers.js
{ id: 'novato_guerreiro', nome: 'Aprendiz de Guerreiro', classe: 'guerreiro',
  temperamento: 'pechincheiro', orcamento: 1.0, prefere: ['armas','armaduras'],
  regiao: 'vila', falas: { chega: [...], compra: [...], recusa: [...], caro: [...] } }
// events.js
{ id: 'ev_ladrao', titulo: 'Ladrão na loja!', texto: '...', peso: 3, requer: { rep: 5 },
  escolhas: [{ rotulo: 'Chamar a guarda', efeitos: [{ ouro: -20 }, { rep: +2 }] }, ...] }
```
Condições (`requer`) e efeitos (`efeitos`) usam um vocabulário pequeno e comum a eventos, conquistas, melhorias e sazonais. Eventos sazonais: `seasons.js` com `{ de, ate, bonus, itensExtra, clientesExtra, tema }` por data — basta adicionar uma linha.

**Metas de conteúdo (verificadas pelo `validate-data`):** 100+ itens / 8 categorias · 60+ receitas · 8 ofícios × 20+ melhorias (160+) · 40+ aventureiros em 8 classes + 10 lendários (3–5 capítulos) · 6 regiões · 12 fornecedores · 30+ eventos · 80+ conquistas · decorações, prateleiras, balcões · 3 tipos de funcionário com níveis.

**Classes (8):** guerreiro, arqueiro, mago, ladino, clérigo, bardo, caçador, alquimista-errante (ajustável). **Regiões (6):** Vila Inicial, Floresta Sussurrante, Montanhas de Ferro, Deserto de Cinzas, Pântano Esmeralda, Cume do Dragão — cada uma com materiais, clientes e eventos exclusivos.

## 6. Retenção

- **Encomendas diárias:** 3 por dia, sorteadas pela data (`rng(data)`), com recompensa em ouro/reputação/itens.
- **Aventureiro especial do dia:** cliente raro, pedido e pagamento melhores, fala própria.
- **Sequência de dias:** bônus crescente, com "perdão" de 1 dia por semana.
- **Baú semanal:** enche com metas da semana; abre uma vez por semana.
- **Sazonais:** por dados (`seasons.js`).
- **Offline:** teto de horas, resumo ao voltar.
- **Prestígio — "Expandir para uma nova cidade":** reinicia ouro/estoque/melhorias, mantém coleção, conquistas e **Herança** (moeda permanente) gasta em bônus (mais slots, preço de compra menor, mais rep por venda, etc.).

## 7. Sensação e arte

- Paleta **quente e acolhedora** (madeira, creme, âmbar), diferente do azul frio do idle, mas com os mesmos componentes (`ui.js`): cartões suaves, botões que "afundam", listas roláveis, gavetas.
- Animações curtas (tween): item voando para o balcão, moeda subindo, selo de reputação; respeita "reduzir movimento".
- Sons sintetizados: moeda, clique, produção pronta, sino da porta, evento, conquista.
- Pixel-art com `scaleMode: 'nearest'`, `roundPixels`, escala inteira do atlas (16/32/64 conforme a densidade da tela).
- **Tutorial (≈2 min):** 5–6 balões: cliente chegou → escolha o preço → venda → falta estoque → compre material → produza → pronto. Pulável, nunca bloqueia.

## 8. Ordem de construção (cada etapa = testes passando + commit na branch)

| # | Etapa | Entrega |
| --- | --- | --- |
| M0 | **Esqueleto** | Vite + Pixi 8, `build` e `build:site`, tema/ui/anim/sfx/music/settings portados, layout 3 modos com topo e 5 abas vazias, tela de carregamento, Playwright rodando, CI, `__loja` |
| M1 | **Núcleo e dados** | `core/` (estado, save com migração, rng, tempo), `data/` com formato definitivo, `validate-data`, `assets.js` com placeholders |
| M2 | **Loja jogável** | Fila, cliente, pedido, 3 preços, temperamentos, reputação, cena com prateleiras (≈15 itens iniciais) |
| M3 | **Mercado** | Fornecedores com preço/estoque por dia (sorteados pela data), compra de materiais |
| M4 | **Oficina** | Ofícios, receitas, fila em tempo real, qualidades, ganho offline + tela de retorno |
| M5 | **Melhorias e equipe** | Ampliar/decoração/prateleiras/balcão, funcionários, árvores de ofício; **tutorial** |
| M6 | **Conteúdo em massa I** | 100+ itens, 60+ receitas, 8 ofícios × 20 melhorias, 12 fornecedores, ícones do pack mapeados |
| M7 | **Conteúdo em massa II** | 40+ aventureiros, 10 lendários com capítulos, 6 regiões e expedições, 30+ eventos |
| M8 | **Retenção** | Encomendas diárias, especial do dia, sequência, baú semanal, sazonais |
| M9 | **Conquistas e coleção** | 80+ conquistas, enciclopédias (itens e aventureiros) |
| M10 | **Prestígio** | Expandir cidade, Herança e seus bônus |
| M11 | **Arte e polimento** | Atlas final do pack, retratos em camadas, animações, sons, acessibilidade |
| M12 | **Balanceamento e entrega** | `balance-sim` com bots (ritmo de 1 h, 1 dia, 1 semana, prestígio), README, `CREDITS.md`, publicação em `/loja/` |

Os marcos M6–M7 são os maiores em volume; vou escrevê-los em lotes por categoria/região, validando a cada lote.

## 9. Publicação

- **Pages do repo** (autossuficiente) pelo mesmo workflow do idle, para teste.
- **No site:** `npm run publish:site -- ../scorpion-bits.github.io` gera `loja/`; falta só o card em `jogos.html` (peço acesso ao `scorpion-bits.github.io` quando chegar lá — hoje a sessão não o enxerga).
- **Nenhum PR e nenhum merge** sem a sua autorização; trabalho só na branch `claude/clever-pasteur-n42qo5`.

## 10. Riscos

| Risco | Mitigação |
| --- | --- |
| Volume de conteúdo (≈ 500+ entradas de dados) | Validador + escrita em lotes; textos curtos e com padrão por classe/temperamento |
| Equilíbrio de uma economia com muitas peças | Núcleo puro + simulador desde o M2, ajustado a cada marco |
| Texto em Pixi (nitidez, performance) | `resolution` do device, cache de textos, `BitmapText` onde houver muita repetição |
| Arte de personagem inexistente no pack | Retratos procedurais agora; manifesto permite trocar por pacote depois |
| Licença do pack | Item 1 da seção 1 |
