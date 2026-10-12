// Configurações do jogador (guardadas à parte do save do jogo).
const KEY = 'scorpion-bits-loja-settings';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const defaults = () => ({
  sound: true,                      // efeitos sonoros
  volume: 0.6,                      // 0..1 (efeitos)
  music: true,                      // música de fundo (só toca se existir um arquivo em audio/music.js)
  musicVolume: 0.5,                 // 0..1
  motion: !prefersReducedMotion(),  // partículas e animações decorativas
  haptics: true,                    // vibração em celulares que suportam
});

export const settings = defaults();

const clamp01 = (v) => Math.min(1, Math.max(0, v));

try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  if (saved && typeof saved === 'object') {
    if (typeof saved.sound === 'boolean') settings.sound = saved.sound;
    if (Number.isFinite(saved.volume)) settings.volume = clamp01(saved.volume);
    if (typeof saved.music === 'boolean') settings.music = saved.music;
    if (Number.isFinite(saved.musicVolume)) settings.musicVolume = clamp01(saved.musicVolume);
    if (typeof saved.motion === 'boolean') settings.motion = saved.motion;
    if (typeof saved.haptics === 'boolean') settings.haptics = saved.haptics;
  }
} catch {
  // sem localStorage: usa os padrões
}

const listeners = new Set();

export function onSettingsChange(fn) {
  listeners.add(fn);
}

export function setSetting(key, value) {
  settings[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignora */ }
  for (const fn of listeners) fn(key, value);
}
