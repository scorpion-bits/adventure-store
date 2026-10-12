// Música de fundo em loop (Web Audio, sem emendas audíveis).
// A trilha é opcional: coloque arquivos .mp3/.ogg em src/assets/music/ e o jogo toca um deles
// (sorteado a cada abertura). Sem arquivo nenhum, não toca nada e o resto funciona igual.
import { settings } from '../settings.js';
import { getAudioContext } from './sfx.js';

const FILES = Object.values(import.meta.glob('../assets/music/*.{mp3,ogg,wav}', { eager: true, query: '?url', import: 'default' }));
const MAX_GAIN = 0.45;   // a música nunca passa disso, para não cobrir os efeitos

let buffer = null;
let loading = null;
let source = null;
let gain = null;
const url = FILES.length ? FILES[Math.floor(Math.random() * FILES.length)] : null;

const level = () => (settings.music ? settings.musicVolume * MAX_GAIN : 0);

function load(ctx) {
  if (buffer) return Promise.resolve(buffer);
  if (!url) return Promise.resolve(null);
  if (!loading) {
    loading = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((b) => { buffer = b; return b; })
      .catch(() => { loading = null; return null; });
  }
  return loading;
}

export const hasMusic = () => FILES.length > 0;

// Começa a tocar (idempotente). Precisa de um gesto do jogador antes, como todo áudio no navegador.
export async function startMusic() {
  const ctx = getAudioContext();
  if (!ctx || !settings.music || source || !url) return;
  const buf = await load(ctx);
  if (!buf || source || !settings.music) return;

  gain = gain ?? ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  source.connect(gain);
  source.start();
  gain.gain.setTargetAtTime(level(), ctx.currentTime, 0.8);   // entra suave
}

export function stopMusic() {
  const ctx = getAudioContext();
  if (!source || !ctx) return;
  const s = source;
  source = null;
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);          // sai suave
  setTimeout(() => { try { s.stop(); } catch { /* já parou */ } }, 1000);
}

export function updateMusicVolume() {
  const ctx = getAudioContext();
  if (gain && ctx) gain.gain.setTargetAtTime(level(), ctx.currentTime, 0.15);
}

export const musicState = () => ({ playing: !!source, available: !!url });

// aba em segundo plano: pausa o áudio (economiza bateria) e retoma ao voltar
document.addEventListener('visibilitychange', () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});
