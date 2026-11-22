# El golpe de la mano contra la pelota, distinto del de la pelota contra el frontis (el autor, 22 de noviembre de 2026:
# «el golpe de la pelota, cuando sale de la mano, cuando la mano golpea, no es el mismo sonido que el golpe del frontis o
# del suelo»). Los de la versión 3 (tools/sonidos/golpes-v3/, sacados de su vídeo) sonaban casi igual que el frontis: el
# mismo brillo hacia 4.000 Hz y la misma cola de sala de 400 ms. Aquí, a partir de ellos: el reparto de graves y agudos de
# la mano medido en el vídeo del entrenamiento (golpes-pelota.py, PERFIL['mano']: los graves fuertes, los medios 10 dB por
# debajo y los agudos muy bajos), el cuerpo de la palma (un golpe grave y corto, hacia 190 Hz) y casi sin sala: la mano
# golpea en medio de la cancha, lejos de las paredes, y su eco se pierde bajo el del frontis, que llega enseguida.
# Uso: python3 tools/sonidos/golpe-mano.py   (lee golpes-v3/pelota-mano-N.mp3 y escribe src/assets/sonidos/pelota-mano-N.mp3)
import subprocess, numpy as np, os
SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.dirname(os.path.dirname(AQUI))
def lee(p):
  raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
  return np.frombuffer(raw, dtype=np.float32).astype(np.float64)
def escribe(p, x):
  subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', p], input=x.astype(np.float64).tobytes(), check=True)
# (la curva, en dB, por frecuencia: más graves, medios algo abajo y los agudos muy abajo)
F = np.array([40, 90, 180, 350, 700, 1400, 2800, 5000, 8000, 14000])
G = np.array([-6, 3, 4, 2, -2, -8, -15, -22, -30, -42])
def forma(x):
  n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
  g = np.interp(np.log2(np.maximum(f, 20)), np.log2(F), G, left=G[0], right=G[-1])
  return np.fft.irfft(X * 10 ** (g / 20), n)
for i in (1, 2):
  x = lee(os.path.join(AQUI, 'golpes-v3', f'pelota-mano-{i}.mp3'))
  a = np.abs(x); pk = int(a.argmax())
  # (desde 4 ms antes del golpe; 0,24 s en total)
  x = x[max(0, pk - int(0.004 * SR)):][: int(0.24 * SR)]; pk = int(np.abs(x).argmax())
  y = forma(x)
  # (el cuerpo de la palma: dos senos amortiguados, 190 y 410 Hz, que nacen con el golpe)
  t = np.arange(len(y)) / SR; t0 = pk / SR; u = np.clip(t - t0, 0, None) * (t >= t0)
  cuerpo = (np.sin(2 * np.pi * 190 * u) * np.exp(-u / 0.022) + 0.45 * np.sin(2 * np.pi * 410 * u) * np.exp(-u / 0.012)) * (t >= t0)
  y = y / (np.abs(y).max() + 1e-9) + 0.55 * cuerpo
  # (casi sin sala: entero los primeros 25 ms y luego cae 40 dB en 150 ms)
  env = np.where(u < 0.025, 1.0, 10 ** (-40 * (u - 0.025) / 0.15 / 20)); env[t < t0] = 1.0
  y = y * env
  # (un fundido de 3 ms al final y el mismo pico que antes)
  y[-int(0.003 * SR):] *= np.linspace(1, 0, int(0.003 * SR))
  y = y / np.abs(y).max() * 0.6
  escribe(os.path.join(RAIZ, 'src', 'assets', 'sonidos', f'pelota-mano-{i}.mp3'), y)
  print('mano', i, f'{len(y) / SR:.2f} s')
