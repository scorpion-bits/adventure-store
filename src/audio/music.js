// Música de fundo em loop (Web Audio, sem emendas audíveis).
// A trilha é opcional: coloque arquivos .mp3/.ogg em src/assets/music/ e o jogo toca um deles
// (sorteado a cada abertura; se o navegador não decodifica o formato, tenta o próximo — o Safari não lê .ogg, por isso o
// .mp3 é o formato mais seguro). Sem arquivo nenhum, não toca nada e o resto funciona igual.
import { settings } from '../settings.js';
import { getAudioContext } from './sfx.js';
import { ganhoDaMusica } from './volume.js';

const FILES = Object.values(import.meta.glob('../assets/music/*.{mp3,ogg,wav}', { eager: true, query: '?url', import: 'default' }))
  .sort(() => Math.random() - 0.5);

let buffer = null;
let loading = null;
let source = null;
let gain = null;

const level = () => (settings.music ? ganhoDaMusica(settings.musicVolume) : 0);

function load(ctx) {
  if (buffer) return Promise.resolve(buffer);
  if (!FILES.length) return Promise.resolve(null);
  if (!loading) {
    loading = (async () => {
      for (const url of FILES) {
        try {
          const data = await (await fetch(url)).arrayBuffer();
          buffer = await ctx.decodeAudioData(data);
          return buffer;
        } catch { /* formato que este navegador não lê, ou falha de rede: tenta o próximo */ }
      }
      loading = null;
      return null;
    })();
  }
  return loading;
}

export const hasMusic = () => FILES.length > 0;

// Começa a tocar (idempotente). Precisa de um gesto do jogador antes, como todo áudio no navegador.
export async function startMusic() {
  const ctx = getAudioContext();
  if (!ctx || !settings.music || source || !FILES.length) return;
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

export const musicState = () => ({ playing: !!source, available: FILES.length > 0 });

// aba em segundo plano: pausa o áudio (economiza bateria) e retoma ao voltar
document.addEventListener('visibilitychange', () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});
