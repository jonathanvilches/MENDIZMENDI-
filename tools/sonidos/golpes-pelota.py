# Los golpes de la pelota del juego, fabricados aquí (no son una grabación): un chasquido de ruido muy corto con el
# reparto de agudos y graves medido en el vídeo de un entrenamiento que pasó el autor el 17 de noviembre de 2026, un
# golpe grave que le da cuerpo y la reverberación de un frontón cubierto (las primeras reflexiones del suelo y las
# paredes y una cola de algo más de un segundo que pierde antes los agudos).
# Uso: python3 tools/sonidos/golpes-pelota.py <carpeta de salida>   (escribe .wav; ffmpeg los pasa a .mp3)
import sys, wave, numpy as np
SR = 44100
rng = np.random.default_rng(17)
BANDAS = np.array([63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000])
# (lo medido en el vídeo, en dB por octava respecto a la más fuerte, en los primeros 50 ms de cada golpe)
PERFIL = {
  'frontis': [-3, -2, -2, -6, -3, -4, -5, -15, -35],
  'mano':    [-2, -4, -2, -10, -10, -9, -15, -26, -45],
  'bote':    [-5, -5, -1, -1, 0, 0, -6, -20, -43],
  'pared':   [-2, -2, -2, -6, -4, -6, -8, -18, -38],
}
# (cuánto dura el chasquido, el grave que le da cuerpo y su tono, y cuánta sala lleva)
FORMA = {
  'frontis': dict(burst=0.007, cuerpo=0.04, f0=118, dc=0.04, sala=0.42),
  'mano':    dict(burst=0.010, cuerpo=0.08, f0=150, dc=0.03, sala=0.30),
  'bote':    dict(burst=0.006, cuerpo=0.05, f0=96, dc=0.03, sala=0.30),
  'pared':   dict(burst=0.007, cuerpo=0.06, f0=105, dc=0.035, sala=0.40),
}
# (realce de agudos: la sala y el golpe grave se comen los agudos del chasquido; se le suben antes para que, ya con la
# sala, quede el reparto medido)
REALCE = {'frontis': 9, 'mano': 5, 'bote': 7, 'pared': 7}
def filtra(x, perfil):
  # (filtro por la forma medida: se multiplica el espectro por la curva interpolada de las bandas)
  n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
  g = np.interp(np.log2(np.maximum(f, 20)), np.log2(BANDAS), perfil, left=perfil[0], right=-60)
  return np.fft.irfft(X * 10 ** (g / 20), n)
def sala(n, rt60=1.15):
  # (la respuesta del frontón: reflexiones tempranas y una cola de ruido que cae, más deprisa en los agudos)
  t = np.arange(n) / SR; ir = np.zeros(n)
  for d, a in [(0.011, 0.55), (0.023, 0.42), (0.037, 0.35), (0.052, 0.3), (0.071, 0.24), (0.094, 0.2)]:
    ir[int(d * SR)] += a * (1 if rng.random() > 0.5 else -1)
  cola = rng.standard_normal(n) * np.exp(-6.91 * t / rt60) * 0.09
  # (los agudos de la cola caen antes: se mezcla con una versión suavizada a medida que pasa el tiempo)
  suave = np.convolve(cola, np.ones(24) / 24, 'same'); k = np.clip(t / 0.5, 0, 1)
  ir += cola * (1 - k) + suave * k * 2.2
  ir[0] = 1
  return ir
def golpe(tipo, var):
  P, F = np.array(PERFIL[tipo], float), FORMA[tipo]
  dur = 1.35; n = int(dur * SR); t = np.arange(n) / SR
  b = int(F['burst'] * SR * (0.85 + 0.3 * rng.random()))
  seco = np.zeros(n); seco[:b] = rng.standard_normal(b) * np.exp(-np.arange(b) / (b / 3.5))
  rampa = np.clip((np.log2(BANDAS) - np.log2(500)) / 3, 0, 1) * REALCE[tipo]
  seco = filtra(seco, P + rampa + rng.normal(0, 1.2, len(P)))
  seco /= np.max(np.abs(seco)) + 1e-9
  f0 = F['f0'] * (0.92 + 0.16 * rng.random())
  cuerpo = np.sin(2 * np.pi * f0 * t * (1 - 0.25 * t / (t + 0.03))) * np.exp(-t / F['dc']) * F['cuerpo']
  seco = seco + cuerpo
  ir = sala(n, 1.05 + 0.2 * rng.random())
  mojado = np.fft.irfft(np.fft.rfft(seco, 2 * n) * np.fft.rfft(ir, 2 * n), 2 * n)[:n]
  y = seco * (1 - F['sala'] * 0.4) + mojado / (np.max(np.abs(mojado)) + 1e-9) * F['sala']
  y *= np.minimum(1, (dur - t) / 0.25)   # (se apaga al final, sin corte)
  return y / (np.max(np.abs(y)) + 1e-9) * 0.89
out = sys.argv[1]
for tipo in PERFIL:
  for v in range(1, 4):
    y = golpe(tipo, v); w = wave.open(f'{out}/pelota-{tipo}-{v}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y * 32767).astype(np.int16).tobytes()); w.close()
print('hecho')
