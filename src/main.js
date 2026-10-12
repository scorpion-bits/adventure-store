// Loja do Aventureiro — ponto de entrada: abre o Pixi, monta a interface e liga o layout responsivo.
import { Application, Container, Graphics } from 'pixi.js';
import { C } from './ui/theme.js';
import { updateTweens, tween } from './ui/anim.js';
import { updateScrolls, txt } from './ui/ui.js';
import { computeLayout } from './ui/layout.js';
import { createTopBar } from './ui/topbar.js';
import { createTabBar, TABS } from './ui/tabbar.js';
import { createModal } from './ui/modal.js';
import { createToasts } from './ui/toast.js';
import { createScreens } from './ui/screens.js';
import { settingsContent } from './ui/settings-panel.js';
import { unlockAudio, sfx } from './audio/sfx.js';
import { startMusic } from './audio/music.js';

const BACK_INSET = 46;   // espaço do botão "voltar ao site" no canto superior esquerdo

async function loadFonts() {
  const fonts = document.fonts;
  if (!fonts?.load) return;
  const work = Promise.all([fonts.load('600 16px Grotesk'), fonts.load('400 16px Body')]).catch(() => {});
  await Promise.race([work, new Promise((r) => setTimeout(r, 2500))]);   // sem fonte? segue com a do sistema
}

function measureSafe() {
  const el = document.getElementById('safe');
  if (!el) return {};
  const cs = getComputedStyle(el);
  return {
    top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0,
  };
}

async function start() {
  await loadFonts();

  const app = new Application();
  await app.init({
    resizeTo: window,
    background: C.bg,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 3),
  });
  document.body.appendChild(app.canvas);

  // camadas, de baixo para cima
  const screensLayer = new Container();
  const topbar = createTopBar({ onSettings: () => openSettings() });
  const tabbar = createTabBar({ onSelect: (i) => selectTab(i) });
  const toasts = createToasts();
  const modal = createModal();
  app.stage.addChild(screensLayer, topbar.root, tabbar.root, toasts.root, modal.root);

  const screens = createScreens({ toast: toasts.show });
  screens.forEach((s) => { s.root.visible = false; screensLayer.addChild(s.root); });

  let active = 0;
  let L = null;

  function selectTab(i, { silent = false } = {}) {
    if (!silent) sfx.tap();
    const prev = screens[active];
    if (i !== active) prev.root.visible = false;
    active = i;
    tabbar.select(i);
    const s = screens[i];
    s.root.visible = true;
    s.root.alpha = 0;
    tween(s.root, { alpha: 1 }, 220);
    s.show();
  }

  function openSettings() {
    sfx.tap();
    modal.open({ title: 'Configurações', build: settingsContent });
  }

  function layout() {
    L = computeLayout(app.screen.width, app.screen.height, measureSafe());
    const inset = Math.max(0, BACK_INSET - L.top.x - Math.max(0, L.content.x - L.top.x));
    topbar.layout({ x: L.content.x - 12, y: 0, w: L.content.w + 24, h: L.topH }, L.mode === 'landscape' ? 0 : inset, L.safe.top);
    tabbar.layout(L);
    toasts.layout(L);
    screens.forEach((s) => s.resize(L.content));
    modal.layout({ w: L.w, h: L.h });
  }

  topbar.set({ gold: 100, repLevel: 1, repPct: 0, day: 1 });
  layout();
  app.renderer.on('resize', layout);
  selectTab(0, { silent: true });

  app.ticker.add((t) => {
    updateTweens(t.deltaMS);
    updateScrolls(t.deltaMS);
  });

  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.isOpen()) modal.close(); });

  // áudio só depois do primeiro gesto
  const unlock = () => {
    unlockAudio();
    startMusic();
  };
  window.addEventListener('pointerdown', unlock, { once: true });

  // tira a tela de carregamento
  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 700);
  }

  if (import.meta.env.DEV) {
    window.__loja = {
      ready: true,
      app,
      layout: () => L,
      mode: () => L.mode,
      tab: () => TABS[active].id,
      selectTab: (i) => selectTab(i),
      tabCenter: (i) => tabbar.cellCenter(i),
      gearCenter: () => topbar.gearCenter(),
      openSettings,
      closeModal: () => modal.close(),
      modalOpen: () => modal.isOpen(),
      toast: (text) => toasts.show(text),
      scroll: () => { const sc = screens[active].scroll; return { y: sc.scrollY, contentH: sc.contentH, viewH: sc.viewH }; },
    };
  }
}

start().catch((err) => {
  console.error(err);
  const msg = document.getElementById('boot-msg');
  if (msg) msg.style.display = 'block';
});
