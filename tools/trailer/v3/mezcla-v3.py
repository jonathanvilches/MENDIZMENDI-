"""El sonido del tráiler v3 (montaje-v3.js): la música épica del juego (musica-torneos, la del autor) desde su principio,
las voces ya grabadas en su sitio (guion-v3.json: los vecinos y la narradora de Otsagabia y las frases de Salva) y unos
pocos sonidos del propio juego.

  · la música entra con el tráiler; su intro tranquila es la presentación y su golpe (22,98 s) cae cuando Maite dice que
    las cintas se han perdido; se va en los 3 últimos segundos
  · las voces, cada una igualada en volumen; la música baja sola mientras hablan (como un compresor con la voz de llave)
  · una subida de ruido en el silencio de la canción antes del golpe, que se corta en seco
  · golpes graves en el golpe, en «Y esto es solo un pueblo», en Juega, en Descubre y en el logo
  · el sonido de carta del juego (ui-carta) cuando entra cada vecino, con un soplido
  · el público y los aplausos de la pelota, el golpe de la pelota en Juega y el aviso de misión completada al final

Uso: python3 tools/trailer/v3/mezcla-v3.py <salida.wav>
"""
import json
import subprocess
import sys
import wave
import numpy as np

SR = 48000
RAIZ = __file__.rsplit('/tools/', 1)[0]
AQUI = RAIZ + '/tools/trailer/v3/'
G = json.load(open(AQUI + 'guion-v3.json'))
DUR = G['dura']
BEAT = 0.4737
BAR = BEAT * 4
DROP = 22.98
B = lambda k: DROP + k * BAR
SON = RAIZ + '/src/assets/sonidos/'
DIR = {'ot': RAIZ + '/src/assets/voz/vecinos/ochagavia/', 'v3': AQUI + 'voz/'}


def lee(ruta):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


N = int(DUR * SR)
musica = np.zeros((N, 2), np.float32)
voces = np.zeros((N, 2), np.float32)
efectos = np.zeros((N, 2), np.float32)


def pon(dst, x, t, g=1.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), N - i)
    dst[i:i + n] += x[:n] * g


def rampa(n, a, b):
    return np.linspace(a, b, n, dtype=np.float32)[:, None]


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


# ---------- la música ----------
mus = lee(SON + 'musica-torneos.mp3')[:N]
f = int(0.25 * SR)
mus[:f] *= rampa(f, 0, 1)
f = int(3.0 * SR)
mus[-f:] *= rampa(f, 1, 0) ** 1.5
pon(musica, mus, 0, 0.95)

# ---------- las voces ----------
for v in G['voces']:
    pre, nom = v['f'].split(':')
    x = lee(DIR[pre] + nom)
    x = x[int(v['de'] * SR):int(v['a'] * SR)].copy()
    # (igualadas: la parte con voz a la misma energía)
    m = np.abs(x).mean(1)
    hay = m > 0.02
    rms = np.sqrt((x[hay] ** 2).mean()) if hay.any() else 0.1
    x *= 0.13 / max(rms, 1e-4)
    f = int(0.008 * SR)
    x[:f] *= rampa(f, 0, 1)
    x[-f:] *= rampa(f, 1, 0)
    pon(voces, x, v['t'], 1.0)

# ---------- la música baja cuando hablan ----------
env = np.abs(voces).max(1)
# (seguidor de envolvente: sube en 25 ms y suelta en 350 ms; con la voz pasada a «hay voz / no hay voz»)
on = (env > 0.01).astype(np.float32)
k_up, k_dn = np.exp(-1 / (0.025 * SR)), np.exp(-1 / (0.35 * SR))
e = np.empty_like(on)
y = 0.0
for i in range(len(on)):
    y = on[i] + (y - on[i]) * (k_up if on[i] > y else k_dn)
    e[i] = y
# (en la intro, la música ya es suave: baja menos)
prof = np.where(np.arange(N) / SR < DROP, 0.55, 0.8).astype(np.float32)
musica *= (1 - prof * e)[:, None]

# ---------- la subida del silencio antes del golpe ----------
t0, t1 = 20.6, DROP
n = int((t1 - t0) * SR)
k = np.linspace(0, 1, n)
sube = filtra(rng.standard_normal(n).astype(np.float32), 300 + 7000 * k ** 2) * (k ** 2.2) * 0.8
tono = np.sin(2 * np.pi * np.cumsum(60 + 140 * k ** 2) / SR) * (k ** 3) * 0.22
r = (sube + tono).astype(np.float32)
pon(efectos, np.stack([r, r], 1), t0, 0.5)


# ---------- golpes graves ----------
def golpe(g=1.0, larga=1.6):
    n = int(larga * SR)
    t = np.arange(n) / SR
    fr = 34 + 70 * np.exp(-t * 16)
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / (larga * 0.35))
    chas = filtra(rng.standard_normal(n).astype(np.float32), 2200) * np.exp(-t * 22) * 0.9
    s = (sub + chas) * np.minimum(1, t * 600) * g
    return np.stack([s, s], 1).astype(np.float32)


pon(efectos, golpe(1.0, 2.4), DROP, 0.9)
for tg, g in [(B(17), 0.55), (B(18), 0.6), (B(24), 0.8), (B(27), 0.7)]:
    pon(efectos, golpe(g, 1.5), tg, 0.75)
pon(efectos, golpe(1.0, 3.2), B(32), 0.95)


# ---------- la entrada de cada vecino: soplido y el sonido de carta del juego ----------
def soplido(d=0.45):
    n = int(d * SR)
    k = np.linspace(0, 1, n)
    env = np.sin(np.pi * k) ** 2
    s = filtra(rng.standard_normal(n).astype(np.float32), 500 + 5000 * np.sin(np.pi * k)) * env
    pan = np.linspace(-0.8, 0.8, n)
    return np.stack([s * (1 - pan) / 2, s * (1 + pan) / 2], 1).astype(np.float32) * 2.2


carta = lee(SON + 'ui-carta.mp3')
for tc in [13.05, B(4), B(6), B(8), B(10), B(12), B(14), B(30)]:
    pon(efectos, soplido(), tc - 0.2, 0.45)
    pon(efectos, carta, tc + 0.05, 0.5)
for tb in [B(2), B(25), B(26)]:
    pon(efectos, soplido(0.4), tb - 0.18, 0.4)
# (las cintas que salen volando en el golpe y las que vuelven al final)
magia = lee(SON + 'ui-magia.mp3')
pon(efectos, magia, DROP + 0.1, 0.45)
pon(efectos, magia, B(31) - 0.2, 0.4)

# ---------- la pelota ----------
pub = lee(SON + 'publico-grada.mp3')
d = int((B(27) - B(24)) * SR)
p = np.resize(pub, (d, 2)).copy()
f = int(0.5 * SR)
p[:f] *= rampa(f, 0, 1)
p[-f:] *= rampa(f, 1, 0)
pon(efectos, p, B(24), 0.25)
apl = lee(SON + 'aplausos-final.mp3')
n2 = int(2.6 * SR)
pon(efectos, apl[:n2] * rampa(n2, 1, 0), B(26) + 0.2, 0.4)
for nom, tt, g in [('pelota-mano-1.mp3', B(24) + 0.02, 2.4), ('pelota-frontis-1.mp3', B(24) + BEAT, 2.2), ('pelota-bote-1.mp3', B(24) + BEAT * 2.5, 2.0)]:
    x = lee(SON + nom)
    a = int(np.argmax(np.abs(x[:, 0]) > 0.02))
    x = 0.55 * np.tanh(x[max(0, a - 70):] * g / 0.55)
    pon(efectos, x, tt, 1.0)

# ---------- el aviso de misión completada y el logo ----------
pon(efectos, lee(SON + 'ui-fanfarria.mp3'), B(30) + 0.5, 0.4)
pon(efectos, magia, B(32) + 0.1, 0.35)

# ---------- todo junto, sin pasar de -1 dB ----------
mix = musica * 0.85 + voces * 1.25 + efectos
pico = np.abs(mix).max()
if pico > 0.89:
    mix = np.tanh(mix / pico * 1.3) / np.tanh(1.3)
mix *= 0.89 / np.abs(mix).max()
pcm = (mix * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('mezcla', sys.argv[1], f'{DUR} s', 'pico antes', round(float(pico), 3))
