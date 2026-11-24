"""El sonido del tráiler v14 (v14/plan.mjs: MUSICA, VOCES, EFECTOS, T_CLIMAX, T_LOGO, DURA): como el del v13, pero con la música
del menú entera desde su principio, la música más baja bajo las voces (suena fuerte desde el primer compás) y los golpes
en el arranque del clímax y en el logo. El del v13:

La épica del autor (musica-torneos) sin cortes desde ocho compases antes de su golpe: su parte suave con la historia, el
compás en silencio con el «¡Kaixo!» de Maite, el golpe en el tiempo 32 y su final (el compás 32 tras el golpe) en el logo.
La música baja cuando hablan Salva, los vecinos o el narrador; un golpe grave en el arranque fuerte y en el logo, un soplo
corto antes de cada capítulo, y los sonidos de la interfaz del juego donde se ven.
Uso: python3 tools/trailer/v14/mezcla-v14.py <salida.wav>
"""
import json, subprocess, sys, wave
import numpy as np

SR = 48000
RAIZ = __file__.rsplit('/tools/', 1)[0]
SON = RAIZ + '/src/assets/sonidos/'
DIR = {'ot': RAIZ + '/src/assets/voz/vecinos/ochagavia/', 'v3': RAIZ + '/tools/trailer/v3/voz/', 'lam': RAIZ + '/public/anatomia/voz/'}
D = json.loads(subprocess.run(['node', '-e', "import('./tools/trailer/v14/plan.mjs').then(m => console.log(JSON.stringify({ M: m.MUSICA, V: m.VOCES, E: m.EFECTOS, R: m.ROTULOS, T0: m.T0, BEAT: m.BEAT, T_DROP: m.T_CLIMAX, T_LOGO: m.T_LOGO, DURA: m.DURA })))"],
                              cwd=RAIZ, capture_output=True, check=True, text=True).stdout)
T0, BEAT, T_DROP, T_LOGO, DUR = D['T0'], D['BEAT'], D['T_DROP'], D['T_LOGO'], D['DURA']
S0 = 0.0
tb = lambda b: T0 + b * BEAT
N = int(DUR * SR)
S = lambda t: int(round(t * SR))
musica, voces, efectos = (np.zeros((N, 2), np.float32) for _ in range(3))
rng = np.random.default_rng(13)


def lee(ruta):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def pon(dst, x, t, g=1.0):
    i = S(t)
    if i >= N or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), N - i)
    dst[i:i + n] += x[:n] * g


rampa = lambda n, a, c: np.linspace(a, c, n, dtype=np.float32)[:, None]


def filtra(sig, fc):
    fc = np.broadcast_to(np.asarray(fc, np.float32), (len(sig),))
    a = np.exp(-2 * np.pi * fc / SR)
    out = np.empty_like(sig)
    y = 0.0
    for i in range(len(sig)):
        y = (1 - a[i]) * sig[i] + a[i] * y
        out[i] = y
    return out


# ---------- la música: entera, sin empalmes ----------
song = lee(SON + D['M'])[S(S0):S(S0 + DUR)].copy()
f = S(0.05)
song[:f] *= rampa(f, 0, 1)
pon(musica, song, 0, 0.95)
f = S(1.0)
musica[-f:] *= rampa(f, 1, 0) ** 1.6

# ---------- las voces ----------
for nom, t, de, hasta in D['V']:
    pre, n = nom.split(':')
    v = lee(DIR[pre] + n)[S(de):S(hasta)].copy()
    hay = np.abs(v).mean(1) > 0.02
    v *= 0.13 / max(np.sqrt((v[hay] ** 2).mean()) if hay.any() else 0.1, 1e-4)
    f = S(0.008)
    v[:f] *= rampa(f, 0, 1)
    f = S(0.08 if hasta < 90 else 0.008)
    v[-f:] *= rampa(f, 1, 0)
    pon(voces, v, t)

# ---------- la música baja cuando hablan ----------
on = (np.abs(voces).max(1) > 0.01).astype(np.float32)
k_up, k_dn = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.3 * SR))
e = np.empty_like(on)
y = 0.0
for i in range(len(on)):
    y = on[i] + (y - on[i]) * (k_up if on[i] > y else k_dn)
    e[i] = y
tt = np.arange(N) / SR
prof = np.where(tt < T_LOGO, 0.58, 0.45).astype(np.float32)
musica *= (1 - prof * e)[:, None]


# ---------- golpes y soplos ----------
def golpe(larga=1.6):
    n = S(larga)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(34 + 70 * np.exp(-t * 16)) / SR) * np.exp(-t / (larga * 0.35))
    chas = filtra(rng.standard_normal(n).astype(np.float32), 2200) * np.exp(-t * 22) * 0.9
    s = (sub + chas) * np.minimum(1, t * 600)
    return np.stack([s, s], 1).astype(np.float32)


def soplo(larga=0.45):
    n = S(larga)
    k = np.linspace(0, 1, n)
    s = filtra(rng.standard_normal(n).astype(np.float32), 400 + 6000 * k ** 2) * np.sin(np.pi * k) ** 2 * 0.6
    return np.stack([s, s * 0.9], 1).astype(np.float32)


pon(efectos, golpe(2.4), T_DROP, 0.9)
pon(efectos, soplo(0.7), T_DROP - 0.7, 0.45)
pon(efectos, golpe(1.6), tb(64), 0.5)
for nom, b, _ in D['R']:
    if nom != 'c1':
        pon(efectos, soplo(), tb(b) - 0.42, 0.35)
pon(efectos, golpe(3.4), T_LOGO, 0.8)
pon(efectos, lee(SON + 'ui-magia.mp3'), T_LOGO + 0.2, 0.35)
for ef in D['E']:
    son, t, g = ef[0], ef[1], ef[2]
    x = lee(SON + son)[S(ef[3] if len(ef) > 3 else 0):]
    if len(ef) > 4:
        x = x[:S(ef[4])].copy()
        f = min(S(0.15), len(x) // 3)
        x[:f] *= rampa(f, 0, 1)
        x[-f:] *= rampa(f, 1, 0)
    pon(efectos, x, t, g)

# ---------- todo junto ----------
mix = musica * 0.85 + voces * 1.25 + efectos
mix *= 0.16 / np.sqrt((mix[S(tb(0)):S(T_LOGO)] ** 2).mean())
pico = np.abs(mix).max()
K = 0.62
a = np.abs(mix)
mix = np.where(a > K, np.sign(mix) * (K + (1 - K) * np.tanh((a - K) / (1 - K))), mix).astype(np.float32)
mix *= 0.89 / max(0.89, np.abs(mix).max())
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('mezcla', sys.argv[1], f'{DUR:.2f} s', 'pico antes', round(float(pico), 3))
