"""El sonido del tráiler v8: el del v6 (v6/mezcla-v6.py) sin la pelota (fuera el «¡Eres un txapeldun!» de Kike, el público
del frontón y los aplausos: sus pelotaris eran los modelos antiguos), con un soplido más (cuatro frases en vez de tres) y
los sonidos de lo que se ve, donde v8/tomas.mjs (CORTES) pone cada toma: el burro, el galope, los cencerros, el mercado.

Del v6 (23 nov 2026, el autor: «La voz me gusta. Quiero más ritmo»):

La música épica del juego (musica-torneos, la del autor) cortada para que en 60 s quepa lo mejor:
  · 4 compases de la intro (desde los 15,40 s de la canción) con Salva: «Hay una tierra donde cada pueblo guarda una
    historia»; el último compás es el silencio de la canción, con la subida de ruido
  · el golpe (22,98 s de la canción) a los T0 = 7,58 s del tráiler, y 16 compases de la parte fuerte
  · un empalme en el compás 16 al compás 24 de la canción (los dos, principio de frase de 8 compases): se salta lo del
    medio y se llega a su final de verdad, el compás 32, que cae justo en el logo (53,06 s), con la cola tranquila debajo
Las voces, ya grabadas (las de Salva, v3/voz, y las de Otsagabia), en sus compases (v6/tomas.mjs, CORTES); la música baja
sola cuando hablan. Golpes graves en el golpe, en el empalme y en el logo; soplidos en las tres frases.

Uso: python3 tools/trailer/v8/mezcla-v8.py <salida.wav>
"""
import json
import subprocess
import sys
import wave
import numpy as np

SR = 48000
RAIZ = __file__.rsplit('/tools/', 1)[0]
SON = RAIZ + '/src/assets/sonidos/'
DIR = {'ot': RAIZ + '/src/assets/voz/vecinos/ochagavia/', 'v3': RAIZ + '/tools/trailer/v3/voz/'}
BEAT = 0.4737
BAR = BEAT * 4
T0 = 4 * BAR
DROP = 22.98
DUR = 60.0
b = lambda k: T0 + k * BAR


def lee(ruta):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


N = int(DUR * SR)
musica = np.zeros((N, 2), np.float32)
voces = np.zeros((N, 2), np.float32)
efectos = np.zeros((N, 2), np.float32)


def pon(dst, x, t, g=1.0):
    i = int(round(t * SR))
    if i >= N or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), N - i)
    dst[i:i + n] += x[:n] * g


def rampa(n, a, c):
    return np.linspace(a, c, n, dtype=np.float32)[:, None]


rng = np.random.default_rng(7)


def filtra(sig, fc):
    fc = np.broadcast_to(np.asarray(fc, np.float32), (len(sig),))
    a = np.exp(-2 * np.pi * fc / SR)
    out = np.empty_like(sig)
    y = 0.0
    for i in range(len(sig)):
        y = (1 - a[i]) * sig[i] + a[i] * y
        out[i] = y
    return out


# ---------- la música: intro + 16 compases, empalme, compases 24 a 32 y la cola ----------
song = lee(SON + 'musica-torneos.mp3')
S = lambda t: int(round(t * SR))
a0, a1 = DROP - 4 * BAR, DROP + 16 * BAR          # (15,40 → 53,30 s de la canción)
c0 = DROP + 24 * BAR                              # (68,46 s)
parte1 = song[S(a0):S(a1)].copy()
parte2 = song[S(c0):S(c0) + S(DUR - b(16) + 0.5)].copy()
f = S(0.4)
parte1[:f] *= rampa(f, 0, 1)
x = S(0.012)                                      # (el empalme: un fundido cruzado de 12 ms en el golpe del compás)
parte1[-x:] *= rampa(x, 1, 0)
parte2[:x] *= rampa(x, 0, 1)
pon(musica, parte1, 0, 0.95)
pon(musica, parte2, b(16) - x / SR, 0.95)
# (al final, la cola tranquila se va del todo en los 2,5 últimos segundos)
f = S(2.5)
musica[-f:] *= rampa(f, 1, 0) ** 1.6

# ---------- las voces ----------
VOCES = [
    ('v3:salva-tierra.mp3', 0.35, 0, 99),
    ('ot:maite-00.mp3', b(2) + 0.06, 0, 0.62),            # ¡Kaixo!
    ('v3:salva-vecinos.mp3', b(2) + 0.72, 0, 99),        # Cada vecino te pide ayuda… el pastoreo, el carnaval, las leyendas
    ('ot:basajaun-00.mp3', b(6) + 0.12, 0, 2.32),        # ¡Oooh! Una personita en mi bosque…
    ('v3:salva-naturaleza.mp3', b(8) + 0.1, 0, 99),      # La naturaleza y la cultura, contadas jugando
    ('v3:salva-herrizherri.mp3', b(24) + 0.35, 0, 99),   # Herrizherri
    ('v3:salva-navarra.mp3', b(24) + 1.75, 0, 99),       # Navarra, pueblo a pueblo
]
for nom, t, de, a in VOCES:
    pre, n = nom.split(':')
    v = lee(DIR[pre] + n)
    v = v[S(de):S(a)].copy()
    m = np.abs(v).mean(1)
    hay = m > 0.02
    rms = np.sqrt((v[hay] ** 2).mean()) if hay.any() else 0.1
    v *= 0.13 / max(rms, 1e-4)
    f = S(0.008)
    v[:f] *= rampa(f, 0, 1)
    v[-f:] *= rampa(f, 1, 0)
    pon(voces, v, t, 1.0)

# ---------- la música baja cuando hablan ----------
env = np.abs(voces).max(1)
on = (env > 0.01).astype(np.float32)
k_up, k_dn = np.exp(-1 / (0.025 * SR)), np.exp(-1 / (0.3 * SR))
e = np.empty_like(on)
y = 0.0
for i in range(len(on)):
    y = on[i] + (y - on[i]) * (k_up if on[i] > y else k_dn)
    e[i] = y
tt = np.arange(N) / SR
prof = np.where(tt < T0, 0.5, np.where(tt < b(24), 0.72, 0.4)).astype(np.float32)
musica *= (1 - prof * e)[:, None]


# ---------- la subida de ruido del silencio antes del golpe ----------
t0 = b(-1) - 0.5
n = S(T0 - t0)
k = np.linspace(0, 1, n)
sube = filtra(rng.standard_normal(n).astype(np.float32), 300 + 7000 * k ** 2) * (k ** 2.2) * 0.8
tono = np.sin(2 * np.pi * np.cumsum(60 + 140 * k ** 2) / SR) * (k ** 3) * 0.22
r = (sube + tono).astype(np.float32)
pon(efectos, np.stack([r, r], 1), t0, 0.5)


# ---------- golpes graves ----------
def golpe(g=1.0, larga=1.6):
    n = S(larga)
    t = np.arange(n) / SR
    fr = 34 + 70 * np.exp(-t * 16)
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / (larga * 0.35))
    chas = filtra(rng.standard_normal(n).astype(np.float32), 2200) * np.exp(-t * 22) * 0.9
    s = (sub + chas) * np.minimum(1, t * 600) * g
    return np.stack([s, s], 1).astype(np.float32)


pon(efectos, golpe(1.0, 2.4), T0, 0.9)
pon(efectos, golpe(0.8, 1.8), b(16), 0.75)
pon(efectos, golpe(1.0, 3.4), b(24), 0.8)


# ---------- soplidos: en las tres frases y en el logo ----------
def soplido(d=0.45):
    n = S(d)
    k = np.linspace(0, 1, n)
    env = np.sin(np.pi * k) ** 2
    s = filtra(rng.standard_normal(n).astype(np.float32), 500 + 5000 * np.sin(np.pi * k)) * env
    pan = np.linspace(-0.8, 0.8, n)
    return np.stack([s * (1 - pan) / 2, s * (1 + pan) / 2], 1).astype(np.float32) * 2.2


for tb in [b(16), b(18), b(20), b(22)]:
    pon(efectos, soplido(0.4), tb - 0.12, 0.4)
magia = lee(SON + 'ui-magia.mp3')
pon(efectos, magia, b(24) + 0.2, 0.35)

# ---------- lo que se ve: el burro, el galope, los cencerros, el mercado (en el segundo en que CORTES pone su toma) ----------
CORTES = json.loads(subprocess.run(['node', '-e', "import('./tools/trailer/v8/tomas.mjs').then(m => console.log(JSON.stringify(m.CORTES)))"], cwd=RAIZ, capture_output=True, check=True, text=True).stdout)
fin = lambda i: CORTES[i + 1][0] if i + 1 < len(CORTES) else DUR
MERCADO = ('ambiente-pueblo.mp3', 0.0, 0.3)
SUENA = {'burro': ('burro.mp3', 0.3, 0.25), 'galope': ('caballo-galope.mp3', 0.0, 0.3), 'pastoreo': ('cencerro-2.mp3', 0.0, 0.25),
         'mercQueso': MERCADO, 'mercTxistorra': MERCADO, 'mercMiel': MERCADO, 'mercHuerta': MERCADO}
for i, c in enumerate(CORTES):
    if c[1] not in SUENA:
        continue
    son, de, g = SUENA[c[1]]
    x = lee(SON + son)[S(de):]
    d = min(len(x), S(fin(i) - c[0]))
    x = x[:d].copy()
    f = min(S(0.06), d // 3)
    x[:f] *= rampa(f, 0, 1)
    x[-f:] *= rampa(f, 1, 0)
    pon(efectos, x, c[0], g)

# ---------- todo junto: a un volumen de tráiler y sin pasar de -1 dB ----------
# (el cuerpo, del golpe al logo, a un volumen medio fijo; los picos, los golpes graves, se redondean con una rodilla suave
# en vez de bajar todo el tráiler por ellos)
mix = musica * 0.85 + voces * 1.25 + efectos
cuerpo = mix[S(T0):S(b(24))]
mix *= 0.17 / np.sqrt((cuerpo ** 2).mean())
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
print('mezcla', sys.argv[1], f'{DUR} s', 'pico antes', round(float(pico), 3))
