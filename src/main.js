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
import { createGame, diaDeJogo } from './core/game.js';
import { loadState, saveState, clearSave } from './core/save.js';
import { createClock } from './core/time.js';
import { avancarProducao, totalProntos } from './core/craft.js';
import { fmt, fmtTime } from './format.js';
import { para, labelButton } from './ui/ui.js';
import { initAssets, carregarAtlas, origemTextura, quadrosNoAtlas } from './assets.js';
import { createTutorial } from './ui/tutorial.js';
import { createEventos } from './ui/eventos.js';
import { createLendas } from './ui/lendas.js';
import { disparar as dispararEvento } from './core/events.js';
import { criarCliente, receberCliente } from './core/shop.js';
import { simularOffline } from './core/staff.js';

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
  initAssets(app);
  await carregarAtlas();

  // jogo: carrega o save (ou começa um novo) e liga o relógio
  const storage = (() => { try { return window.localStorage; } catch { return null; } })();
  const { state, origem } = loadState(storage);
  // em desenvolvimento, ?hoje=AAAA-MM-DD fixa a data do jogo (os testes usam isso para não depender de eventos sazonais)
  const hoje = import.meta.env.DEV ? new URLSearchParams(location.search).get('hoje') : null;
  const clock = hoje ? createClock(new Date(`${hoje}T12:00:00`).getTime(), { correr: true }) : createClock();
  const game = createGame({ state, clock });
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('semtutorial')) game.state.tutorial.feito = true;
  game.verificarDia();

  // tempo com o jogo fechado: a oficina termina o que deu tempo (antes de criar as telas, para não disparar avisos de cada item)
  const ausenteMs = origem === 'carregado' ? Math.max(0, clock.now() - (state.salvoEm ?? clock.now())) : 0;
  const prontosAntes = totalProntos(game);
  avancarProducao(game);
  const vendasOffline = simularOffline(game, ausenteMs);
  const relatorio = { ausenteMs, prontos: totalProntos(game) - prontosAntes, vendas: vendasOffline };

  // ao apagar o progresso o salvamento é bloqueado: senão o `pagehide` da recarga gravaria tudo de novo
  let apagando = false;
  const guardar = () => (apagando ? false : saveState(storage, game.state, clock.now()));
  const apagarProgresso = () => { apagando = true; clearSave(storage); location.reload(); };

  // camadas, de baixo para cima
  const screensLayer = new Container();
  const topbar = createTopBar({ onSettings: () => openSettings() });
  const tabbar = createTabBar({ onSelect: (i) => selectTab(i) });
  const toasts = createToasts();
  const modal = createModal();
  app.stage.addChild(screensLayer, topbar.root, tabbar.root, toasts.root, modal.root);

  const tutorial = createTutorial({ game, tabbar, onFinish: () => guardar() });
  app.stage.addChild(tutorial.root);
  app.stage.addChild(modal.root);
  const eventos = createEventos({ game, modal, toast: toasts.show });
  const lendas = createLendas({ game, modal, toast: toasts.show });
  const screens = createScreens({ toast: toasts.show, game, modal });
  screens.forEach((s) => { s.root.visible = false; screensLayer.addChild(s.root); });

  let active = 0;
  let L = null;

  function selectTab(i, { silent = false } = {}) {
    if (!silent) sfx.tap();
    const prev = screens[active];
    if (i !== active) prev.root.visible = false;
    active = i;
    tabbar.select(i);
    tutorial.abaAtual(TABS[i].id);
    const s = screens[i];
    s.root.visible = true;
    s.root.alpha = 0;
    tween(s.root, { alpha: 1 }, 220);
    s.show();
  }

  function openSettings() {
    sfx.tap();
    modal.open({
      title: 'Configurações',
      build: (scroll, w) => settingsContent(scroll, w, { onReset: apagarProgresso, onTutorial: () => { modal.close(); tutorial.reiniciar(); tutorial.abaAtual(TABS[active].id); } }),
    });
  }

  function layout() {
    L = computeLayout(app.screen.width, app.screen.height, measureSafe());
    const inset = Math.max(0, BACK_INSET - L.top.x - Math.max(0, L.content.x - L.top.x));
    topbar.layout({ x: L.content.x - 12, y: 0, w: L.content.w + 24, h: L.topH }, L.mode === 'landscape' ? 0 : inset, L.safe.top);
    tabbar.layout(L);
    toasts.layout(L);
    tutorial.layout(L);
    screens.forEach((s) => s.resize(L.content));
    modal.layout({ w: L.w, h: L.h });
  }

  const atualizarTopo = () => topbar.set({
    gold: game.state.ouro, repLevel: game.nivel(), repPct: game.progressoNivel(), day: diaDeJogo(game.state),
  });
  game.on('ouro', atualizarTopo);
  game.on('rep', atualizarTopo);
  game.on('dia', atualizarTopo);
  atualizarTopo();
  layout();
  app.renderer.on('resize', layout);
  selectTab(0, { silent: true });

  // salva a cada 10 s, ao esconder a aba e ao fechar a página
  setInterval(guardar, 10_000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) guardar(); });
  window.addEventListener('pagehide', guardar);
  game.on('nivel', (n) => { toasts.show(`Reputação nível ${n}!`, 0xc79cf0); sfx.levelUp(); });

  app.ticker.add((t) => {
    game.tick(t.deltaMS);
    eventos.update();
    lendas.update();
    screens.forEach((sc) => sc.update?.(t.deltaMS));
    updateTweens(t.deltaMS);
    updateScrolls(t.deltaMS);
  });

  // Esc fecha a janela aberta (janelas de evento, que exigem uma escolha, ignoram)
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

  // "Enquanto você esteve fora": só aparece se ficou fora um tempo e algo aconteceu
  const v = relatorio.vendas;
  if (relatorio.ausenteMs > 60_000 && (relatorio.prontos > 0 || v.vendas > 0)) {
    modal.open({
      title: 'Bem-vindo de volta!',
      build: (scroll, w) => {
        const linhas = [`Você ficou fora por ${fmtTime(relatorio.ausenteMs / 1000)}.`];
        if (relatorio.prontos > 0) linhas.push(`Na Oficina, ${relatorio.prontos} ${relatorio.prontos === 1 ? 'item ficou pronto' : 'itens ficaram prontos'}.`);
        if (v.vendas > 0) linhas.push(`O vendedor fez ${v.vendas} ${v.vendas === 1 ? 'venda' : 'vendas'} e rendeu ${fmt(v.ouro)} de ouro.`);
        if (v.perdidas > 0) linhas.push(`${v.perdidas} ${v.perdidas === 1 ? 'cliente foi embora' : 'clientes foram embora'} sem achar o que queria: falta estoque!`);
        const t = para(linhas.join('\n\n'), C.text, 15, w);
        scroll.add(t, t.height);
        const b = labelButton(relatorio.prontos > 0 ? 'Ir para a Oficina' : 'Continuar', w, 46, { tint: C.good });
        b.tap(() => { modal.close(); if (relatorio.prontos > 0) selectTab(1); });
        scroll.add(b, 46);
      },
    });
  }

  if (import.meta.env.DEV) {
    window.__loja = {
      ready: true,
      app,
      icones: { origem: origemTextura, quadros: quadrosNoAtlas },
      game,
      origem,
      state: () => game.state,
      give: (n) => game.ganharOuro(n),
      addRep: (n) => game.ganharRep(n),
      save: guardar,
      // vai para uma data (AAAA-MM-DD), ao meio-dia, e deixa o jogo perceber a virada do dia
      setDay: (key) => { const [y, m, d] = key.split('-').map(Number); clock.set(new Date(y, m - 1, d, 12).getTime()); game.verificarDia(); },
      reset: apagarProgresso,
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
      loja: screens[0].hooks,
      mercado: screens[2].hooks,
      oficina: screens[1].hooks,
      tutorial: tutorial.hooks,
      eventos: { ...eventos.hooks, disparar: (id) => dispararEvento(game, id) },
      melhorias: screens[4].hooks,
      aventureiros: screens[3].hooks,
      lendas: lendas.hooks,
      chamarLenda: (id) => { game.state.fila.length = 0; const c = criarCliente(game, id); if (c) receberCliente(game, c); return !!c; },
      skip: (ms) => { clock.advance(ms); game.tick(0); },
      giveMaterial: (id, n = 1) => { game.state.materiais[id] = (game.state.materiais[id] ?? 0) + n; game.emit('materiais'); },
      giveItem: (id, q = 1, n = 1) => { const k = `${id}:${q}`; game.state.estoque[k] = (game.state.estoque[k] ?? 0) + n; game.emit('estoque'); },
      clearQueue: () => { game.state.fila.length = 0; game.state.loja.proximaChegada = 1e9; game.emit('fila'); },
      addClient: (adv, pedido = { tipo: 'surpresa' }) => { game.state.loja.uid += 1; const e = game.data.aventureiros[adv]; game.state.fila.push({ uid: game.state.loja.uid, adv, pedido, paciencia: 75000, pacienciaMax: 75000, fala: e?.falas?.chega?.[0] ?? '' }); game.emit('fila'); },
      scrollTo: (y) => screens[active].scroll.scrollBy(y - screens[active].scroll.scrollY),
      scroll: () => { const sc = screens[active].scroll; return { y: sc.scrollY, contentH: sc.contentH, viewH: sc.viewH }; },
    };
  }
}

start().catch((err) => {
  console.error(err);
  const msg = document.getElementById('boot-msg');
  if (msg) msg.style.display = 'block';
});
