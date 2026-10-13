#!/usr/bin/env python3
"""Gera a trilha provisória "Taverna ao entardecer": ambiente medieval em ré dórico, 6/8, em loop sem emenda.

Alaúde (cordas dedilhadas sintetizadas), flauta, pad e um pouco de reverb. Tudo sintetizado por código com numpy,
sem amostras de terceiros. Uso: python3 scripts/gerar-musica.py saida.wav  (depois: ffmpeg -i saida.wav -c:a libmp3lame -b:a 112k saida.mp3)
Precisa de numpy. A semente fixa (7) faz a faixa sair sempre igual.
"""
import sys
import wave
import numpy as np

SR = 32000
BPM_COLCHEIA = 0.30                      # duração de uma colcheia, em segundos (compasso 6/8 = 1,8 s)
COMPASSOS = 64
N_COL = COMPASSOS * 6
TOTAL = int(SR * BPM_COLCHEIA * N_COL)
rng = np.random.default_rng(7)

hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
tempo = lambda col: col * BPM_COLCHEIA

esq = np.zeros(TOTAL)
dir_ = np.zeros(TOTAL)


def misturar(sinal, t0, pan=0.0, ganho=1.0):
    """soma `sinal` a partir de t0 segundos, circular (o final volta ao começo: o loop não tem emenda)"""
    i0 = int(t0 * SR)
    idx = (np.arange(len(sinal)) + i0) % TOTAL
    gl = ganho * np.cos((pan + 1) * np.pi / 4)
    gr = ganho * np.sin((pan + 1) * np.pi / 4)
    np.add.at(esq, idx, sinal * gl)
    np.add.at(dir_, idx, sinal * gr)


def pluck(m, dur=2.4, brilho=1.0):
    t = np.arange(int(dur * SR)) / SR
    f = hz(m)
    s = np.zeros_like(t)
    for k in range(1, 12):
        if f * k > 7000:
            break
        amp = (1.0 / k ** 1.15) * (0.7 if k % 2 == 0 else 1.0)
        tau = (0.9 / (1 + 0.55 * (k - 1) * brilho))
        s += amp * np.exp(-t / tau) * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k))
    s *= np.minimum(1, t / 0.004)
    return s * 0.5


def flauta(m, dur, vib=True):
    n = int((dur + 0.5) * SR)
    t = np.arange(n) / SR
    f = hz(m)
    atraso = np.clip((t - 0.25) / 0.4, 0, 1)
    f_t = f * (1 + (0.0035 * atraso * np.sin(2 * np.pi * 5.1 * t) if vib else 0))
    fase = 2 * np.pi * np.cumsum(f_t) / SR
    s = np.sin(fase) + 0.22 * np.sin(2 * fase) + 0.07 * np.sin(3 * fase)
    sopro = rng.normal(0, 1, n)
    sopro = np.convolve(sopro, np.ones(6) / 6, mode='same') * 0.05
    env = np.minimum(1, t / 0.09) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.16))
    env *= 1 + 0.06 * np.sin(2 * np.pi * 0.7 * t)
    return (s + sopro) * env * 0.26


def pad(ms, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in ms:
        for det in (-0.6, 0.0, 0.7):
            f = hz(m) * 2 ** (det / 1200)
            s += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / 0.9) * np.minimum(1, (dur - t) / 1.1)
    return s * env * 0.020


# acordes: raiz (grave) e qualidade
M = lambda raiz: (raiz, [0, 7, 16])      # maior
m_ = lambda raiz: (raiz, [0, 7, 15])     # menor
Dm, C, Gm, Am, F = m_(50), M(48), m_(43), m_(45), M(53)

PROGRESSOES = [
    [Dm, Dm, C, C, Gm, Gm, Am, Dm],
    [F, C, Gm, Dm, F, C, Am, Dm],
    [Dm, C, Dm, Am, Gm, F, C, Dm],
    [F, C, Dm, Dm, Gm, Dm, Am, Dm],
]
ORDEM = [0, 1, 0, 2, 1, 3, 2, 3]       # 8 trechos de 8 compassos = 64 compassos
compassos = [ch for p in ORDEM for ch in PROGRESSOES[p]]

# ---------- alaúde: baixo + arpejo em 6/8 ----------
PADROES = [[0, 7, 15, 19, 15, 7], [0, 7, 12 + 3, 12 + 7, 12 + 3, 7]]
for b, (raiz, iv) in enumerate(compassos):
    terca = iv[2] - 12 if iv[2] > 12 else iv[2]
    arpejo = [0, 7, 12 + terca, 12 + 7, 12 + terca, 7]
    if (b // 2) % 2:
        arpejo = [0, 7, 12 + terca, 12 + 7, 12 + 12, 12 + 7]
    for k, off in enumerate(arpejo):
        m = raiz + off + (12 if off else 0)
        vol = 1.0 if k == 0 else (0.62 if k % 3 == 0 else 0.5)
        misturar(pluck(m if off else raiz, dur=2.6 if k == 0 else 1.6), tempo(b * 6 + k) + rng.normal(0, 0.004),
                 pan=-0.25 + 0.1 * (k % 3), ganho=vol * (1.0 if k else 1.25))
    misturar(pluck(raiz + 7, dur=1.8), tempo(b * 6 + 3), pan=-0.3, ganho=0.55)        # quinta no 2º tempo

# ---------- pad: acorde sustentado, trocando de dois em dois compassos ----------
for b in range(0, COMPASSOS, 2):
    raiz, iv = compassos[b]
    notas = [raiz + 12, raiz + 12 + iv[1], raiz + 24 + (iv[2] - 12 if iv[2] > 12 else iv[2])]
    misturar(pad(notas, tempo(12) + 0.6), tempo(b * 6) - 0.2, pan=0.0, ganho=1.0)

# ---------- flauta: frases de dois compassos, com respiros ----------
ESCALA = [m for m in range(66, 90) if m % 12 in (2, 4, 5, 7, 9, 11, 0)]   # ré dórico
RITMOS = [[3, 1, 2, 3, 3], [2, 2, 2, 3, 3], [4, 2, 6], [3, 3, 6], [1, 1, 1, 3, 6], [6, 3, 3], [2, 1, 3, 6]]
nota_ref = ESCALA.index(76)
for b in range(0, COMPASSOS, 2):
    if (b // 2) % 4 == 3 and b > 8:
        continue                                  # um respiro a cada quatro frases
    raiz, iv = compassos[b]
    ultimo = compassos[b + 1]
    alvos = lambda ch: {(ch[0] + i) % 12 for i in ch[1]}
    ritmo = RITMOS[int(rng.integers(len(RITMOS)))]
    col = 0
    idx = nota_ref + int(rng.integers(-1, 2))
    # começa em nota do acorde
    ini = [i for i, m in enumerate(ESCALA) if m % 12 in alvos(compassos[b]) and 72 <= m <= 80]
    idx = min(ini, key=lambda i: abs(i - idx)) if ini else idx
    if (b // 2) % 3 == 1:
        col = 3                                   # entra atrasada, deixando o alaúde respirar
    for j, d in enumerate(ritmo):
        if col + d > 12:
            d = 12 - col
        if d <= 0:
            break
        if j == len(ritmo) - 1:
            fim = [i for i, m in enumerate(ESCALA) if m % 12 in alvos(ultimo) and 69 <= m <= 81]
            idx = min(fim, key=lambda i: abs(i - idx)) if fim else idx
        else:
            idx += int(rng.choice([-2, -1, -1, 1, 1, 2], p=[0.1, 0.3, 0.1, 0.3, 0.1, 0.1]))
            idx += int(np.sign(nota_ref - idx) * (abs(nota_ref - idx) > 3))
        idx = int(np.clip(idx, 0, len(ESCALA) - 1))
        dur = d * BPM_COLCHEIA * 0.92
        misturar(flauta(ESCALA[idx], dur), tempo(b * 6 + col), pan=0.2, ganho=1.0)
        col += d

# ---------- reverb (convolução circular: a cauda do final entra no começo do loop) ----------
def reverb(x, seg=2.8, seed=0):
    r = np.random.default_rng(seed)
    n = int(seg * SR)
    t = np.arange(n) / SR
    ir = r.normal(0, 1, n) * np.exp(-t / 0.75)
    for a in (0.5, 0.78):                         # escurece a cauda aos poucos
        k = np.exp(-np.arange(1, 12) * (1 - a))
        ir = np.convolve(ir, k / k.sum(), mode='same')
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum())
    N = len(x)
    X = np.fft.rfft(x)
    IR = np.fft.rfft(ir, N)
    return np.fft.irfft(X * IR, N)


seco = 1.0
umido = 0.34
L = esq * seco + reverb(esq, seed=1) * umido
R = dir_ * seco + reverb(dir_, seed=2) * umido
pico = max(np.abs(L).max(), np.abs(R).max())
L, R = L / pico * 0.82, R / pico * 0.82

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    dados = np.empty(TOTAL * 2, dtype=np.int16)
    dados[0::2] = (L * 32767).astype(np.int16)
    dados[1::2] = (R * 32767).astype(np.int16)
    w.writeframes(dados.tobytes())
print(f'{TOTAL / SR:.1f} s')
