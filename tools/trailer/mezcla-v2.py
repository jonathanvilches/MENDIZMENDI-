"""El sonido del tráiler v2 (montaje-v2.js): la música épica del juego (musica-torneos, la del autor) cortada a su pulso,
con los golpes del montaje y unos pocos sonidos del propio juego.

  · la música: del segundo 7,82 de la canción (8 compases antes del golpe del 22,98) al 53,30, y del 68,46 al 92,48
    (se salta una frase de 8 compases, la tercera, para que el tráiler dure 69,5 s; el corte cae en un compás y se funde
    en 30 ms); entra en 1,2 s y se va en los 3 últimos
  · en el silencio de la canción (13,2-15,2 s del tráiler), una subida de ruido que se corta en seco con el golpe
  · golpes graves en el golpe y en las palabras que entran de golpe (Explora, Juega, Campeonatos, Descubre) y en el logo
  · un soplido en cada barrido
  · los cencerros de los momotxorros en los tres destellos rojos del silencio y, bajos, en la manada
  · el público del frontón bajo la pelota y los aplausos en «Campeonatos», y los golpes de la pelota al pulso
  · los sonidos del juego en los avisos (misión completada, nueva misión, insignia)

Uso: python3 tools/trailer/mezcla-v2.py <salida.wav>
"""
import subprocess, sys
import numpy as np

SR = 48000
DUR = 69.5
BEAT = 0.4737
BAR = BEAT * 4
DROP = 15.158
B = lambda k: DROP + k * BAR
RAIZ = __file__.rsplit('/tools/', 1)[0]
SON = RAIZ + '/src/assets/sonidos/'


def lee(nombre):
    """Un mp3 del juego, estéreo a 48 kHz, como float32 (n, 2)."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SON + nombre, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


N = int(DUR * SR)
mix = np.zeros((N, 2), np.float32)


def pon(x, t, g=1.0):
    i = int(t * SR)
    if i >= N:
        return
    n = min(len(x), N - i)
    mix[i:i + n] += x[:n] * g


def rampa(n, a, b):
    return np.linspace(a, b, n, dtype=np.float32)[:, None]


# ---------- la música ----------
mus = lee('musica-torneos.mp3')
a0, a1 = int(7.822 * SR), int(53.297 * SR)
b0 = int(68.455 * SR)
A = mus[a0:a1].copy()
Bm = mus[b0:b0 + (N - len(A)) + int(0.03 * SR)].copy()
x = int(0.03 * SR)
A[-x:] *= rampa(x, 1, 0)
Bm[:x] *= rampa(x, 0, 1)
musica = np.concatenate([A[:-x], A[-x:] + Bm[:x], Bm[x:]])[:N]
f = int(1.2 * SR)
musica[:f] *= rampa(f, 0, 1)
f = int(3.0 * SR)
musica[-f:] *= rampa(f, 1, 0) ** 1.5
pon(musica, 0, 0.9)

rng = np.random.default_rng(7)


def filtra(sig, fc):
    """Paso bajo de un polo (fc puede variar en el tiempo)."""
    fc = np.broadcast_to(np.asarray(fc, np.float32), (len(sig),))
    a = np.exp(-2 * np.pi * fc / SR)
    out = np.empty_like(sig)
    y = 0.0
    for i in range(len(sig)):
        y = (1 - a[i]) * sig[i] + a[i] * y
        out[i] = y
    return out


# ---------- la subida del silencio ----------
t0, t1 = 13.25, DROP
n = int((t1 - t0) * SR)
k = np.linspace(0, 1, n)
ruido = rng.standard_normal(n).astype(np.float32)
sube = filtra(ruido, 300 + 7000 * k ** 2) * (k ** 2.2) * 0.9
tono = np.sin(2 * np.pi * np.cumsum(60 + 140 * k ** 2) / SR) * (k ** 3) * 0.25
r = (sube + tono).astype(np.float32)
pon(np.stack([r, r], 1), t0, 0.55)


# ---------- golpes graves ----------
def golpe(g=1.0, larga=1.6):
    n = int(larga * SR)
    t = np.arange(n) / SR
    f = 34 + 70 * np.exp(-t * 16)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (larga * 0.35))
    chas = filtra(rng.standard_normal(n).astype(np.float32), 2200) * np.exp(-t * 22) * 0.9
    s = (sub + chas) * np.minimum(1, t * 600) * g
    return np.stack([s, s], 1).astype(np.float32)


pon(golpe(1.0, 2.2), DROP, 0.9)
for tg, g in [(B(3), 0.6), (B(8), 0.7), (B(12), 0.5), (B(16), 0.7), (B(23), 0.5)]:
    pon(golpe(g, 1.4), tg, 0.75)
pon(golpe(1.0, 3.0), B(24), 0.95)


# ---------- soplidos de los barridos ----------
def soplido(d=0.45):
    n = int(d * SR)
    k = np.linspace(0, 1, n)
    env = np.sin(np.pi * k) ** 2
    s = filtra(rng.standard_normal(n).astype(np.float32), 500 + 5000 * np.sin(np.pi * k)) * env
    pan = np.linspace(-0.8, 0.8, n)
    return np.stack([s * (1 - pan) / 2, s * (1 + pan) / 2], 1).astype(np.float32) * 2.2


for tb in [B(2), B(5), B(10), B(14), B(20)]:
    pon(soplido(), tb - 0.22, 0.5)

# ---------- cencerros de los momotxorros ----------
cenc = [lee(f'cencerro-{i}.mp3') for i in (1, 2, 3)]
for i, tc in enumerate([14.42, 14.66, 14.90]):
    pon(cenc[i][:int(0.9 * SR)], tc, 0.7)
des = lee('cencerros-desfile.mp3')
seg = des[:int((B(3) - B(0)) * SR)].copy()
f = int(0.4 * SR)
seg[-f:] *= rampa(f, 1, 0)
pon(seg, B(0), 0.35)
pon(seg[:int((B(24) - B(23)) * SR)], B(23), 0.25)

# ---------- el público de la pelota ----------
pub = lee('publico-grada.mp3')
d = int((B(16) - B(8)) * SR)
p = np.resize(pub, (d, 2)).copy()
f = int(0.6 * SR)
p[:f] *= rampa(f, 0, 1)
p[-f:] *= rampa(f, 1, 0)
pon(p, B(8), 0.3)
apl = lee('aplausos-final.mp3')
pon(apl[:int(2.4 * SR)] * rampa(int(2.4 * SR), 1, 0), B(12), 0.45)
# los golpes de la pelota (los del juego, la versión A que eligió el autor): un peloteo al pulso bajo los planos del
# Labrit (mano, frontis y bote en cada compás, como un tanto de verdad), más seco en los cortes rápidos del final de la
# frase y uno en cada plano de pelota de Descubre
G = {k: [lee(f'pelota-{k}-{i}.mp3') for i in ((1, 2) if k == 'mano' else (1, 2, 3))] for k in ('mano', 'frontis', 'bote', 'pared')}   # (la tercera mano se quitó: llevaba una voz)


def golpea(k, t, g, n=[0]):
    n[0] += 1
    x = G[k][n[0] % len(G[k])].copy()
    # (el golpe empieza donde está el impacto: el mp3 trae delante el silencio del codificador)
    a = int(np.argmax(np.abs(x[:, 0]) > 0.02))
    x = x[max(0, a - int(0.0015 * SR)):]
    pan = (-0.25, 0.1, 0.3)[n[0] % 3]
    x[:, 0] *= 1 - pan
    x[:, 1] *= 1 + pan
    # (los golpes vienen unos 12 dB por debajo de la música: se suben con un techo suave, para que el chasquido suba sin
    # que el pico mande en el limitador del final, y lo que ya suena se aparta 120 ms, como un compresor de lado)
    x = 0.55 * np.tanh(x * g / 0.55)
    i, d = int(t * SR), int(0.12 * SR)
    if i + d < N:
        mix[i:i + d] *= (1 - 0.5 * np.sin(np.linspace(0, np.pi, d)) ** 0.4)[:, None]
    pon(x, t, 1.0)


for k in range(8, 15):
    if k == 12:      # (el público y los aplausos: un solo golpe)
        golpea('mano', B(k) + 0.02, 2.5)
        continue
    t = B(k)
    golpea('mano', t + 0.02, 3.5)
    golpea('frontis', t + BEAT * 1, 3.5)
    golpea('bote', t + BEAT * 2.5, 3.2)
    if k % 2:
        golpea('pared', t + BEAT * 3.25, 2.8)
for q in range(4):   # (los cortes de cuarto de compás de B(15) a B(16))
    golpea('mano' if q % 2 == 0 else 'frontis', B(15) + q * BEAT + 0.02, 3.5)
golpea('mano', B(22.25) + 0.02, 3.0)
golpea('frontis', B(22.25) + BEAT * 0.5, 2.6)

# ---------- los avisos ----------
for nom, ta, g in [('ui-fanfarria.mp3', B(0) + 0.35, 0.35), ('ui-abre.mp3', B(6) + 0.1, 0.45), ('ui-moneda.mp3', B(20) + 0.3, 0.45)]:
    pon(lee(nom), ta, g)

# ---------- el final: que no pase de -1 dB ----------
pico = np.abs(mix).max()
if pico > 0.89:
    # (compresión suave de los picos y luego al techo)
    mix = np.tanh(mix / pico * 1.4) / np.tanh(1.4)
mix *= 0.89 / np.abs(mix).max()
pcm = (mix * 32767).astype('<i2')
out = sys.argv[1]
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('mezcla', out, f'{DUR} s')
