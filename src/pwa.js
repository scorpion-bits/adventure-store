// App instalável (PWA): registra o service worker (só na versão autossuficiente, já compilada) e cuida do convite de instalação.
// O service worker é gerado no build por scripts/pwa-plugin.mjs e guarda o jogo inteiro para rodar sem internet.

const INTERVALO_BUSCA = 20 * 60 * 1000;   // de quanto em quanto tempo procurar versão nova com o app aberto
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
    let recarregando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // uma versão nova assumiu: o jogo aberto ainda roda a antiga, então recarrega sozinho (o progresso é salvo no `pagehide`)
      if (!tinhaControle || recarregando) return;
      recarregando = true;
      aviso?.('Nova versão instalada! Atualizando…');
      setTimeout(() => location.reload(), 1800);
    });
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // O navegador só procura versão nova ao abrir a página; um app instalado costuma ser só "retomado" do segundo plano
      // e ficaria preso na versão antiga. Por isso pergunta ao voltar para o app, ao voltar a internet e de tempos em tempos.
      const procurar = () => { if (navigator.onLine) reg.update().catch(() => {}); };
      document.addEventListener('visibilitychange', () => { if (!document.hidden) procurar(); });
      window.addEventListener('online', procurar);
      setInterval(procurar, INTERVALO_BUSCA);
      procurar();
    }).catch((err) => console.warn('Service worker indisponível:', err));
  }
}
