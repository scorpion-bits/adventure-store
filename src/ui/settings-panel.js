// Conteúdo da janela de configurações.
import { Container, Graphics } from 'pixi.js';
import { C, txt, drawCard, makeToggle, labelButton } from './ui.js';
import { settings, setSetting } from '../settings.js';
import { applyVolume, sfx } from '../audio/sfx.js';
import { startMusic, stopMusic, updateMusicVolume, hasMusic } from '../audio/music.js';

const ROW_H = 56;

function toggleRow(w, label, key, after) {
  const row = new Container();
  const bg = new Graphics();
  drawCard(bg, w, ROW_H, { fill: C.card });
  const t = txt(label, C.text, 15, true);
  t.position.set(16, (ROW_H - t.height) / 2);
  const sw = makeToggle(settings[key], (v) => { setSetting(key, v); after?.(v); sfx.tap(); });
  sw.position.set(w - 66, (ROW_H - 28) / 2);
  row.addChild(bg, t, sw);
  return row;
}

function volumeRow(w, label, key, after) {
  const row = new Container();
  const bg = new Graphics();
  drawCard(bg, w, ROW_H, { fill: C.card });
  const t = txt(label, C.text, 15, true);
  t.position.set(16, (ROW_H - t.height) / 2);
  const val = txt('', C.accent, 14, true);
  // o valor fica entre o − (w-164..w-124) e o + (w-56..w-16)
  const paint = () => {
    val.text = `${Math.round(settings[key] * 100)}%`;
    val.position.set(w - 90 - val.width / 2, (ROW_H - val.height) / 2);
  };
  const step = (d) => () => {
    setSetting(key, Math.min(1, Math.max(0, Math.round((settings[key] + d) * 10) / 10)));
    paint();
    after?.();
    sfx.tick();
  };
  const minus = labelButton('−', 40, 40, { size: 20 }).tap(step(-0.1));
  const plus = labelButton('+', 40, 40, { size: 20 }).tap(step(0.1));
  minus.position.set(w - 164, (ROW_H - 40) / 2);
  plus.position.set(w - 56, (ROW_H - 40) / 2);
  paint();
  row.addChild(bg, t, val, minus, plus);
  return row;
}

export function settingsContent(scroll, w, { onReset, onTutorial } = {}) {
  scroll.add(toggleRow(w, 'Efeitos sonoros', 'sound', () => applyVolume()), ROW_H);
  scroll.add(volumeRow(w, 'Volume dos efeitos', 'volume', () => applyVolume()), ROW_H);
  if (hasMusic()) {
    scroll.add(toggleRow(w, 'Música', 'music', (on) => (on ? startMusic() : stopMusic())), ROW_H);
    scroll.add(volumeRow(w, 'Volume da música', 'musicVolume', () => updateMusicVolume()), ROW_H);
  }
  scroll.add(toggleRow(w, 'Animações', 'motion'), ROW_H);
  scroll.add(toggleRow(w, 'Vibração (celular)', 'haptics'), ROW_H);

  if (onTutorial) {
    const rev = labelButton('Rever o tutorial', w, 48, { tint: C.accent });
    rev.tap(onTutorial);
    scroll.add(rev, 48);
  }

  if (onReset) {
    // apagar o progresso pede dois toques
    const btn = labelButton('Apagar progresso', w, 48, { tint: C.bad });
    let armed = false;
    btn.tap(() => {
      if (!armed) {
        armed = true;
        btn.label.text = 'Tem certeza? Toque de novo';
        setTimeout(() => { armed = false; if (!btn.destroyed) btn.label.text = 'Apagar progresso'; }, 3500);
      } else onReset();
    });
    scroll.add(btn, 48);
  }

  const about = new Container();
  const t = txt(`Loja do Aventureiro · Scorpion Bits · v${__APP_VERSION__}`, C.faint, 12);
  t.position.set(2, 4);
  about.addChild(t);
  scroll.add(about, 24);
}
