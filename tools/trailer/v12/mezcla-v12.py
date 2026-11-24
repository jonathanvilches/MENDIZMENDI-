"""El sonido del tráiler v12: el del v11 con la épica ocho compases más larga (empalme del compás 16 al 24, y su final
sigue cayendo en el logo). El del v11 (v11/tomas.mjs: VOCES, EFECTOS, T_GOLPE, T_LOGO, DURA).

La música: la del juego en los pueblos (musica-juego) mientras se cuenta la historia, bajando sola cuando hablan los
vecinos, Salva o el narrador de la lámina; se apaga en el capítulo «Trabaja el campo», con una subida de ruido, y entra la
épica del autor (musica-torneos) desde su golpe (22,98 s) en el primer plano del campo. Ocho compases después, un empalme
a su compás 24 (los dos, principio de frase) para que su final, el compás 32, caiga en el logo, con la cola tranquila.
Las voces, todas ya grabadas: las de Otsagabia (Maite, Joxemari, el Bobo, el narrador), las de Salva (v3/voz) y las del
narrador de las láminas (public/anatomia/voz). Los sonidos de la interfaz del juego (la tarjeta, la moneda, la fanfarria
de misión cumplida) y de lo que se ve (los cencerros, las ovejas, el público del frontón).

Uso: python3 tools/trailer/v12/mezcla-v12.py <salida.wav>
"""
import json
import subprocess
import sys
import wave
import numpy as np

SR = 48000
RAIZ = __file__.rsplit('/tools/', 1)[0]
SON = RAIZ + '/src/assets/sonidos/'
DIR = {'ot': RAIZ + '/src/assets/voz/vecinos/ochagavia/', 'v3': RAIZ + '/tools/trailer/v3/voz/', 'lam': RAIZ + '/public/anatomia/voz/'}
D = json.loads(subprocess.run(['node', '-e', "import('./tools/trailer/v12/tomas.mjs').then(m => console.log(JSON.stringify({ VOCES: m.VOCES, EFECTOS: m.EFECTOS, T_GOLPE: m.T_GOLPE, T_LOGO: m.T_LOGO, DURA: m.DURA, BAR: m.BAR, DROP: m.DROP, BARRAS: m.BARRAS, C: m.CORTES.filter(c => c[1] === '#c4')[0][0] })))"],
                              cwd=RAIZ, capture_output=True, check=True, text=True).stdout)
BAR, DROP, T_GOLPE, T_LOGO, DUR = D['BAR'], D['DROP'], D['T_GOLPE'], D['T_LOGO'], D['DURA']
T_C4 = D['C']
N1 = D['BARRAS'] - 8                                # (compases de la épica antes del empalme a su compás 24)


def lee(ruta):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


N = int(DUR * SR)
musica = np.zeros((N, 2), np.float32)
voces = np.zeros((N, 2), np.float32)
efectos = np.zeros((N, 2), np.float32)
S = lambda t: int(round(t * SR))


def pon(dst, x, t, g=1.0):
    i = S(t)
    if i >= N or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), N - i)
    dst[i:i + n] += x[:n] * g


def rampa(n, a, c):
    return np.linspace(a, c, n, dtype=np.float32)[:, None]


rng = np.random.default_rng(11)


def filtra(sig, fc):
    fc = np.broadcast_to(np.asarray(fc, np.float32), (len(sig),))
    a = np.exp(-2 * np.pi * fc / SR)
    out = np.empty_like(sig)
    y = 0.0
    for i in range(len(sig)):
        y = (1 - a[i]) * sig[i] + a[i] * y
        out[i] = y
    return out


# ---------- la música ----------
# (A) la del juego, desde su principio hasta el capítulo del campo, donde se apaga en un segundo
juego = lee(SON + 'musica-juego.mp3')
fin_a = T_C4 + 0.35
a = juego[:S(fin_a + 1.0)].copy()
f = S(0.6)
a[:f] *= rampa(f, 0, 1)
f = S(1.0)
a[-f:] *= rampa(f, 1, 0) ** 2
pon(musica, a, 0, 0.8)
# (B) la épica: del golpe 8 compases, empalme al compás 24 y hasta el final de la canción
song = lee(SON + 'musica-torneos.mp3')
p1 = song[S(DROP):S(DROP + N1 * BAR)].copy()
c0 = DROP + 24 * BAR
p2 = song[S(c0):].copy()
x = S(0.012)
p1[-x:] *= rampa(x, 1, 0)
p2[:x] *= rampa(x, 0, 1)
pon(musica, p1, T_GOLPE, 0.95)
pon(musica, p2, T_GOLPE + N1 * BAR - x / SR, 0.95)
f = S(2.5)
musica[-f:] *= rampa(f, 1, 0) ** 1.6

# ---------- las voces ----------
for nom, t, de, hasta in D['VOCES']:
    pre, n = nom.split(':')
    v = lee(DIR[pre] + n)
    v = v[S(de):S(hasta)].copy()
    m = np.abs(v).mean(1)
    hay = m > 0.02
    rms = np.sqrt((v[hay] ** 2).mean()) if hay.any() else 0.1
    v *= 0.13 / max(rms, 1e-4)
    f = S(0.008)
    v[:f] *= rampa(f, 0, 1)
    f = S(0.08 if hasta < 90 else 0.008)            # (las que se cortan a media frase, con un fundido algo más largo)
    v[-f:] *= rampa(f, 1, 0)
    pon(voces, v, t, 1.0)

# ---------- la música baja cuando hablan ----------
env = np.abs(voces).max(1)
on = (env > 0.01).astype(np.float32)
k_up, k_dn = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
e = np.empty_like(on)
y = 0.0
for i in range(len(on)):
    y = on[i] + (y - on[i]) * (k_up if on[i] > y else k_dn)
    e[i] = y
tt = np.arange(N) / SR
prof = np.where(tt < T_GOLPE, 0.6, np.where(tt < T_LOGO, 0.62, 0.4)).astype(np.float32)
musica *= (1 - prof * e)[:, None]

# ---------- la subida de ruido del capítulo del campo, antes del golpe ----------
t0 = T_C4 + 0.2
n = S(T_GOLPE - t0)
k = np.linspace(0, 1, n)
sube = filtra(rng.standard_normal(n).astype(np.float32), 300 + 7000 * k ** 2) * (k ** 2.2) * 0.8
tono = np.sin(2 * np.pi * np.cumsum(60 + 140 * k ** 2) / SR) * (k ** 3) * 0.22
r = (sube + tono).astype(np.float32)
pon(efectos, np.stack([r, r], 1), t0, 0.5)


def golpe(g=1.0, larga=1.6):
    n = S(larga)
    t = np.arange(n) / SR
    fr = 34 + 70 * np.exp(-t * 16)
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / (larga * 0.35))
    chas = filtra(rng.standard_normal(n).astype(np.float32), 2200) * np.exp(-t * 22) * 0.9
    s = (sub + chas) * np.minimum(1, t * 600) * g
    return np.stack([s, s], 1).astype(np.float32)


pon(efectos, golpe(1.0, 2.4), T_GOLPE, 0.9)
pon(efectos, golpe(1.0, 3.4), T_LOGO, 0.8)
pon(efectos, lee(SON + 'ui-magia.mp3'), T_LOGO + 0.2, 0.35)

# ---------- los sonidos de la interfaz y de lo que se ve ----------
for ef in D['EFECTOS']:
    son, t, g = ef[0], ef[1], ef[2]
    de = ef[3] if len(ef) > 3 else 0
    x = lee(SON + son)[S(de):]
    if len(ef) > 4:
        x = x[:S(ef[4])].copy()
        f = min(S(0.15), len(x) // 3)
        x[:f] *= rampa(f, 0, 1)
        x[-f:] *= rampa(f, 1, 0)
    pon(efectos, x, t, g)

# ---------- todo junto ----------
mix = musica * 0.85 + voces * 1.25 + efectos
cuerpo = mix[S(2):S(T_LOGO)]
mix *= 0.16 / np.sqrt((cuerpo ** 2).mean())
pico = np.abs(mix).max()
K = 0.62
a = np.abs(mix)
mix = np.where(a > K, np.sign(mix) * (K + (1 - K) * np.tanh((a - K) / (1 - K))), mix).astype(np.float32)
mix *= 0.89 / max(0.89, np.abs(mix).max())
pcm = (mix * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('mezcla', sys.argv[1], f'{DUR:.2f} s', 'pico antes', round(float(pico), 3))
