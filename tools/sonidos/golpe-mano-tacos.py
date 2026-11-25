# El golpe de la mano con tacos contra la pelota (el autor, 25 de noviembre de 2026: los de antes «son golpes que hacen
# al chocar la pelota contra el frontis o contra el suelo, contra la pared izquierda, pero no contra los tacos de la
# mano»; de la página de golpes eligió la número 1, «Palmada con tacos»). No sale de una grabación: es una palmada hecha a
# mano, con tres partes y ningún tono (el «pok» hueco con tono era lo que sonaba a pelota contra la pared):
#  - el chasquido de la palma: ruido con el centro hacia 2.000 Hz, que el esparadrapo de los tacos redondea (sube en
#    1,2 ms, no de golpe) y se apaga en unos 9 ms;
#  - el golpe sordo de la carne: ruido grave, de 150 a 300 Hz, que se apaga en 16 ms;
#  - la piel: un clic finísimo hacia 9.000 Hz al principio;
#  y una sala muy corta (0,35 s, al 7 %): la mano golpea en medio de la cancha, lejos de las paredes. Con el pico a 0,95
# (no a 0,62 como el de antes): es más corta y, a igual pico, sonaba 5 dB más baja que la mano de antes.
# Dos tomas con distinto ruido, para que dos golpes seguidos no suenen idénticos (audio.js, VARIANTES.mano = 2).
# Uso: python3 tools/sonidos/golpe-mano-tacos.py   (escribe src/assets/sonidos/pelota-mano-1.mp3 y -2.mp3)
import subprocess, numpy as np, os
SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.dirname(os.path.dirname(AQUI))
def escribe(p, x):
  subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', p], input=x.astype(np.float64).tobytes(), check=True)
def eq(x, F, G):
  n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
  g = np.interp(np.log2(np.maximum(f, 20)), np.log2(F), G, left=G[0], right=G[-1]); return np.fft.irfft(X * 10 ** (g / 20), n)
def env(n, ata, tau):
  t = np.arange(n) / SR; e = np.exp(-t / tau); a = int(ata * SR); e[:a] *= np.linspace(0, 1, a) ** 1.5; return e
def sala(x, rt, nivel, rng):
  n = int(rt * SR); t = np.arange(n) / SR; ir = rng.standard_normal(n) * np.exp(-6.9 * t / rt); ir[:int(0.012 * SR)] = 0
  for d, a in ((0.019, 0.4), (0.033, 0.25)): ir[int(d * SR)] += a * 6
  ir = eq(ir, np.array([80, 300, 1000, 3000, 8000]), np.array([-10, -2, 0, -6, -20]))
  w = np.convolve(x, ir); w = w / np.abs(w).max() * nivel; y = np.zeros(len(w)); y[:len(x)] = x; return y + w
def palmada(rng, chas=1.0, cuerpo=0.6, tauC=0.009, tauB=0.016, centro=2000, ata=0.0012):
  n = int(0.16 * SR)
  F = np.array([200, 600, centro / 1.6, centro, centro * 1.6, 7000, 12000])
  c = eq(rng.standard_normal(n), F, np.array([-30, -14, -3, 0, -3, -14, -30])) * env(n, ata, tauC)
  b = eq(rng.standard_normal(n), np.array([60, 150, 300, 600, 1200]), np.array([-12, 0, 0, -10, -30])) * env(n, 0.002, tauB)
  k = eq(rng.standard_normal(n), np.array([3000, 6000, 9000, 14000]), np.array([-20, -4, 0, -12])) * env(n, 0.0003, 0.0018)
  return chas * c / np.abs(c).max() + cuerpo * b / np.abs(b).max() + 0.25 * k / np.abs(k).max()
# (la toma 1, la misma que sonó en la página de golpes; la 2, otro ruido y una pizca más de carne)
for i, (semilla, cuerpo, centro) in enumerate(((11, 0.6, 2000), (23, 0.66, 1900)), 1):
  rng = np.random.default_rng(semilla)
  x = sala(palmada(rng, cuerpo=cuerpo, centro=centro), 0.35, 0.07, rng)
  x = x / np.abs(x).max() * 0.95; x[-200:] *= np.linspace(1, 0, 200)
  escribe(os.path.join(RAIZ, 'src', 'assets', 'sonidos', f'pelota-mano-{i}.mp3'), x)
  print(f'pelota-mano-{i}.mp3', f'{len(x) / SR:.2f} s')
