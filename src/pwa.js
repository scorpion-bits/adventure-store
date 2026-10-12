// App instalável (PWA): registra o service worker (só na versão autossuficiente, já compilada) e cuida do convite de instalação.
// O service worker é gerado no build por scripts/pwa-plugin.mjs e guarda o jogo inteiro para rodar sem internet.

let convite = null;               // evento `beforeinstallprompt` guardado até o jogador pedir para instalar
const ouvintes = new Set();

// rodando como app instalado (tela cheia, sem barra do navegador)
export const emApp = () => {
  try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; }
};
export const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const podeInstalar = () => !!convite;
export const aoMudarInstalacao = (fn) => ouvintes.add(fn);

export async function instalar() {
  if (!convite) return 'indisponivel';
  convite.prompt();
  const { outcome } = await convite.userChoice;
  convite = null;
  for (const fn of ouvintes) fn();
  return outcome;
}

// `aviso(texto)`: mostra uma mensagem ao jogador (ex.: nova versão instalada)
export function iniciarPwa({ aviso } = {}) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    convite = e;
    for (const fn of ouvintes) fn();
  });
  window.addEventListener('appinstalled', () => {
    convite = null;
    aviso?.('App instalado! Procure o ícone na sua tela inicial.');
    for (const fn of ouvintes) fn();
  });

  // `__PWA__` vem do vite.config.js: falso na versão do site (scorpionbits.com/loja), que usa o PixiJS do site
  if (typeof __PWA__ !== 'undefined' && __PWA__ && import.meta.env.PROD && 'serviceWorker' in navigator) {
    const tinhaControle = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // uma versão nova assumiu: o jogo aberto ainda roda a antiga até reabrir
      if (tinhaControle) aviso?.('Nova versão instalada: feche e abra o jogo para atualizar.');
    });
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker indisponível:', err));
  }
}
