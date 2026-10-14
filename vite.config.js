import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { pwaPlugin } from './scripts/pwa-plugin.mjs';

// `npm run build:site` gera a versão que vai para scorpionbits.com/loja/ (modo "site"):
//  - usa o PixiJS que o site já tem (assets/vendor), sem empacotar outro;
//  - ganha título, SEO, fontes do site, tela de carregamento e botão "voltar ao site".
// `npm run build` gera a versão autossuficiente (página do repositório no GitHub Pages).
const SITE_ORIGIN = 'https://scorpionbits.com';
const TITLE = 'Loja do Aventureiro — jogue no navegador';
const DESC = 'Loja do Aventureiro: gerencie uma loja de aventureiros no navegador. Escolha o preço, produza itens, contrate funcionários e expanda para novas cidades.';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const VARIANTS = {
  site: { sharedPixi: true, fonts: '../assets/fonts', glyph: '../assets/logo-glyph.png', icon: '../assets/favicon.png', home: '../' },
  standalone: { sharedPixi: false, fonts: './fonts', glyph: './logo-glyph.png', icon: './favicon.png', home: `${SITE_ORIGIN}/` },
};

const pageShell = (variant) => ({
  name: 'page-shell',
  transformIndexHtml(html) {
    const v = VARIANTS[variant];
    return {
      html: html.replace(/<title>.*?<\/title>/, `<title>${TITLE}</title>`),
      tags: [
        // `defer`: a tela de carregamento aparece enquanto o Pixi baixa; roda antes do módulo do jogo
        ...(v.sharedPixi
          ? [{ tag: 'script', attrs: { src: '../assets/vendor/pixi.min.js?v=8.22.0', defer: true }, injectTo: 'head-prepend' }]
          : []),
        { tag: 'meta', attrs: { name: 'theme-color', content: '#1b130f' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'description', content: DESC }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'canonical', href: `${SITE_ORIGIN}/loja/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: `${SITE_ORIGIN}/loja/` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:title', content: TITLE }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:description', content: DESC }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:locale', content: 'pt_BR' }, injectTo: 'head' },
        // app instalável (PWA): manifesto, ícone do iOS e modo de tela cheia
        { tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: './icons/apple-touch-icon.png' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Loja do Aventureiro' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'icon', href: v.icon, type: 'image/png' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `${v.fonts}/grotesk-latin.woff2`, crossorigin: '' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `${v.fonts}/inter-latin.woff2`, crossorigin: '' }, injectTo: 'head' },
        {
          tag: 'style',
          injectTo: 'head',
          children: `
@font-face { font-family: "Grotesk"; src: url("${v.fonts}/grotesk-latin.woff2") format("woff2"); font-weight: 300 700; font-display: swap; }
@font-face { font-family: "Body"; src: url("${v.fonts}/inter-latin.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
html, body { background: #1b130f; }

/* botão "voltar ao site" (canto superior esquerdo, sobre a barra do topo) */
.back { position: fixed; top: 10px; left: 10px; z-index: 5; width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center; color: #f6ead6; text-decoration: none;
  background: rgba(240, 179, 90, 0.1); border: 1px solid rgba(240, 179, 90, 0.35); }
.back svg { width: 16px; height: 16px; }
/* instalado como app não há site para onde voltar */
@media (display-mode: standalone) { .back { display: none; } }

/* tela de carregamento: some com fade quando o jogo está pronto */
#boot { position: fixed; inset: 0; z-index: 10; display: grid; place-content: center; justify-items: center; gap: 14px;
  background: #1b130f; color: #c9b79c; font: 500 14px/1.4 "Body", "Segoe UI", system-ui, sans-serif;
  transition: opacity .6s ease; }
#boot.done { opacity: 0; pointer-events: none; }
#boot img { width: 56px; height: auto; animation: boot-bob 1.6s ease-in-out infinite; }
#boot p { margin: 0; text-align: center; max-width: 30ch; }
#boot-msg { display: none; }
#boot-msg a { color: #f0b35a; }
@keyframes boot-bob { 50% { transform: translateY(-6px); } }
@media (prefers-reduced-motion: reduce) { #boot img { animation: none; } }
`,
        },
        {
          tag: 'div',
          attrs: { id: 'boot', role: 'status' },
          injectTo: 'body-prepend',
          children: `<img src="${v.glyph}" width="56" height="68" alt="">
<p id="boot-txt">Abrindo a loja…</p>
<p id="boot-msg">Está demorando? Tente recarregar a página ou abrir em outro navegador. <a href="${v.home}">Voltar ao site</a></p>
<noscript><p>Este jogo precisa de JavaScript. <a href="${v.home}">Voltar ao site</a></p></noscript>`,
        },
        {
          tag: 'a',
          attrs: { class: 'back', href: v.home, 'aria-label': 'Voltar ao site da Scorpion Bits', title: 'Voltar ao site' },
          injectTo: 'body-prepend',
          children: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
        },
        {
          tag: 'script',
          injectTo: 'body',
          children: `setTimeout(function(){var m=document.getElementById('boot-msg');if(m&&document.getElementById('boot'))m.style.display='block'},12000)`,
        },
      ],
    };
  },
});

export default defineConfig(({ mode }) => {
  const site = mode === 'site';
  return {
    base: './',
    define: { __APP_VERSION__: JSON.stringify(pkg.version), __PWA__: 'true' },
    resolve: site
      ? { alias: { 'pixi.js': fileURLToPath(new URL('./src/pixi-global.js', import.meta.url)) } }
      : {},
    plugins: [
      pageShell(site ? 'site' : 'standalone'),
      // no site o PixiJS, as fontes e o logo vêm de ../assets (mesma origem, fora da pasta /loja/): entram no cache também
      pwaPlugin(site
        ? { extras: ['../assets/vendor/pixi.min.js?v=8.22.0', '../assets/fonts/grotesk-latin.woff2', '../assets/fonts/inter-latin.woff2', '../assets/logo-glyph.png', '../assets/favicon.png'], copiarPublico: ['manifest.webmanifest', 'icons'] }
        : {}),
    ],
    // no site, fontes e logo vêm de assets/ do próprio site, então não copia a pasta public
    publicDir: site ? false : 'public',
    build: { outDir: site ? 'dist-site' : 'dist' },
    // as artes originais (centenas de MB, fora do git), as saídas dos testes e as cópias de trabalho não precisam ser vigiadas
    server: { watch: { ignored: ['**/assets-src/**', '**/tests/out/**', '**/dist/**', '**/dist-site/**', '**/.claude/**'] } },
  };
});
