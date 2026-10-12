// Barra do topo: ouro, reputação (nível + barra), dia e engrenagem.
import { Container, Graphics, Rectangle } from 'pixi.js';
import { C, txt, drawCard, wasDragged } from './ui.js';
import { drawIcon } from './icons.js';
import { fmt } from '../format.js';
import { tween } from './anim.js';

export function createTopBar({ onSettings }) {
  const root = new Container();
  const bg = new Graphics();

  const goldBox = new Container();
  const goldBg = new Graphics();
  const goldIcon = new Graphics();
  const goldTxt = txt('0', C.gold, 16, true);
  goldBox.addChild(goldBg, goldIcon, goldTxt);

  const repBox = new Container();
  const repBg = new Graphics();
  const repBar = new Graphics();
  const repLabel = txt('Reputação 1', C.text, 12, true);
  repBox.addChild(repBg, repBar, repLabel);

  const dayBox = new Container();
  const dayBg = new Graphics();
  const dayIcon = new Graphics();
  const dayTxt = txt('Dia 1', C.dim, 13, true);
  dayBox.addChild(dayBg, dayIcon, dayTxt);

  const gear = new Container();
  const gearBg = new Graphics();
  const gearIcon = new Graphics();
  gear.addChild(gearBg, gearIcon);
  gear.eventMode = 'static';
  gear.cursor = 'pointer';
  gear.hitArea = new Rectangle(-4, -4, 48, 48);
  gear.on('pointertap', () => { if (!wasDragged()) onSettings(); });

  root.addChild(bg, goldBox, repBox, dayBox, gear);

  const v = { gold: 0, repLevel: 1, repPct: 0, day: 1, streak: 0 };
  let L = null;

  const pill = (g, w, h) => drawCard(g, w, h, { fill: C.deep, radius: h / 2, shadow: false, borderAlpha: 0.12 });

  const paint = () => {
    if (!L) return;
    const compact = L.w < 400;
    const h = 36;
    const y = (L.h - h) / 2 + (L.safeTop ?? 0) / 2;
    const gearW = 40;

    gear.position.set(L.x + L.w - gearW, y - 2);
    gearBg.clear().circle(20, 20, 18).fill({ color: C.accent, alpha: 0.12 }).stroke({ width: 1, color: C.accent, alpha: 0.4 });
    drawIcon(gearIcon, 'engrenagem', 22, C.accent);
    gearIcon.position.set(20, 20);

    const dayW = compact ? 54 : 78;
    dayBox.position.set(gear.x - 8 - dayW, y);
    pill(dayBg, dayW, h);
    drawIcon(dayIcon, 'sol', 16, C.dim);
    dayIcon.position.set(16, h / 2);
    dayTxt.text = compact ? `${v.day}` : `Dia ${v.day}`;
    dayTxt.position.set(28, (h - dayTxt.height) / 2);

    const goldW = compact ? 104 : 124;
    goldBox.position.set(L.x, y);
    pill(goldBg, goldW, h);
    drawIcon(goldIcon, 'moeda', 20, C.gold);
    goldIcon.position.set(20, h / 2);
    goldTxt.text = fmt(v.gold);
    goldTxt.position.set(36, (h - goldTxt.height) / 2);

    const repX = L.x + goldW + 8;
    const repW = Math.max(60, dayBox.x - 8 - repX);
    repBox.position.set(repX, y);
    pill(repBg, repW, h);
    repLabel.text = `Reputação ${v.repLevel}`;
    repLabel.position.set(12, 4);
    const barW = repW - 24;
    repBar.clear().roundRect(12, h - 12, barW, 5, 2.5).fill({ color: 0xffffff, alpha: 0.1 })
      .roundRect(12, h - 12, Math.max(5, barW * v.repPct), 5, 2.5).fill(C.rep);
    repLabel.visible = repW > 90;
  };

  return {
    root,
    // `rect` é a área da barra; `inset` reserva espaço à esquerda (botão "voltar ao site")
    layout(rect, inset = 0, safeTop = 0) {
      L = { x: rect.x + inset + 12, w: rect.w - inset - 24, h: rect.h, safeTop };
      bg.clear().rect(rect.x, 0, rect.w, rect.h).fill({ color: C.panel, alpha: 0 });
      paint();
    },
    set(values) {
      const goldChanged = values.gold !== undefined && values.gold !== v.gold;
      Object.assign(v, values);
      paint();
      if (goldChanged) {
        goldTxt.scale.set(1.12);
        tween(goldTxt, { scale: 1 }, 260);
      }
    },
    gearCenter: () => ({ x: gear.x + 20, y: gear.y + 20 }),
  };
}
