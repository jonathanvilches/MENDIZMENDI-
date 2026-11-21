# Los golpes de la pelota de la versión A (los que eligió el autor en la página de golpes: «la primera del vídeo»), vueltos
# a recortar del vídeo del frontón cubierto que pasó el autor el 20 de noviembre de 2026 (el autor, 21 de noviembre: «quiero
# que soluciones el sonido de la pelota, que no me gusta cómo está en el juego ahora mismo»). Los recortes de antes tenían
# fallos que se oían jugando:
#   - en cinco de los doce el impacto no estaba al principio, sino 25 a 160 ms después: el golpe sonaba tarde;
#   - un golpe de mano llevaba dentro otro golpe 190 ms después, y uno de pared otro a los 130 ms;
#   - una pared y un frontis salían del mismo instante del vídeo, y un bote y una pared, de la cola de otro golpe;
#   - entre variantes, hasta 12 dB de diferencia (uno de cada tantos botes, cuatro veces más fuerte).
# Aquí cada golpe empieza justo en su impacto (1,5 ms antes), se corta antes del siguiente golpe que se cuela y sigue con la
# cola de sala del propio frontón (la del golpe más limpio del vídeo, a 0,692 s, ajustada a su nivel), se le quita el
# soplido de fondo del vídeo y las tres variantes de cada golpe quedan igual de fuertes.
# uso: python3 -I tools/sonidos/golpes-a-limpios.py <audio del vídeo, wav mono 44,1 kHz>   (necesita numpy y ffmpeg)
import subprocess, numpy as np, os, sys, wave
AQUI = os.path.dirname(os.path.abspath(__file__)); SALE = os.path.join(AQUI, '..', '..', 'src', 'assets', 'sonidos'); sr = 44100
w = wave.open(sys.argv[1]); v = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768

# (inicio del impacto en el vídeo, segundos; y dónde cortar porque entra otro golpe, o None)
FUENTES = {
    'mano':    [0.692, 2.842, 11.276],
    'frontis': [6.497, 13.395, 7.903],
    'pared':   [14.890, 6.326, 10.062],
    'bote':    [1.874, 5.304, 12.304],
}
ATAQUE_S = 0.045                  # el impacto de verdad: los primeros 45 ms de cada golpe del vídeo
# (cuánta sala lleva cada golpe sobre la de su propio impacto, y el brillo de la sala: el bote, más sordo)
SALA = {'mano': 0.9, 'frontis': 1.15, 'pared': 1.0, 'bote': 0.8}
BRILLO = {'mano': None, 'frontis': None, 'pared': 5200, 'bote': 2600}
LARGO = 0.56                      # segundos de cada golpe
# (lo fuerte que suena cada golpe: los 10 ms más fuertes, en dB. La mediana de los golpes de antes en el juego, para no
# descompensar el partido, pero igual para las tres variantes)
FUERZA = {'mano': -18.2, 'frontis': -18.8, 'pared': -17.3, 'bote': -21.8}

# el soplido de fondo del vídeo: su espectro medio antes del primer golpe
N, H = 1024, 256
win = np.hanning(N)
def stft(x):
    n = 1 + (len(x) - N) // H
    return np.array([np.fft.rfft(x[i * H:i * H + N] * win) for i in range(n)])
def istft(S, n):
    y = np.zeros(n + N); z = np.zeros(n + N)
    for i, f in enumerate(S):
        y[i * H:i * H + N] += np.fft.irfft(f, N) * win; z[i * H:i * H + N] += win ** 2
    return (y / np.maximum(z, 1e-6))[:n]
ruido = np.mean(np.abs(stft(v[int(0.05 * sr):int(0.62 * sr)])) ** 2, axis=0)
def limpia(x):
    pad = np.concatenate([np.zeros(N), x, np.zeros(N)])
    S = stft(pad); P = np.abs(S) ** 2
    g = np.sqrt(np.maximum(1 - 2.0 * ruido / np.maximum(P, 1e-12), 0.05 ** 2))
    # suavizado en el tiempo, para que el silenciado no «burbujee»
    for i in range(1, len(g)): g[i] = np.maximum(g[i], g[i - 1] * 0.6)
    return istft(S * g, len(pad))[N:N + len(x)]

# la cola de sala del frontón: la del golpe más limpio del vídeo (0,692 s), de 40 ms en adelante, ya sin el soplido
t0 = int(0.692 * sr); cola = limpia(v[t0:t0 + int(1.2 * sr)])[int(0.04 * sr):]

def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-18)
def lp(x, fc):
    # (filtro de un polo, en frecuencia)
    n = len(x); M = 1 << int(np.ceil(np.log2(n * 2))); al = np.exp(-2 * np.pi * fc / sr); wf = 2 * np.pi * np.fft.rfftfreq(M)
    return np.fft.irfft(np.fft.rfft(x, M) * (1 - al) / (1 - al * np.exp(-1j * wf)), M)[:n]
def golpe(tipo, i, ini):
    # el impacto de verdad (45 ms) y, desde ahí, la sala del frontón del vídeo, al mismo nivel: cada golpe suena una sola
    # vez y siempre con la misma sala (antes cada recorte traía la cola de lo que pasaba en el vídeo: otros golpes, gente)
    a = int(ini * sr) - int(0.0015 * sr); n = int(LARGO * sr); na = int(ATAQUE_S * sr); fx = int(0.010 * sr)
    x = limpia(v[a:a + na + fx + N])[:na + fx]
    off = int((0.0 + 0.012 * (i - 1)) * sr)         # (cada variante, la sala desde un punto algo distinto)
    r = cola[off:off + n - na + fx].copy()
    if BRILLO[tipo]: r = lp(r, BRILLO[tipo])
    r *= SALA[tipo] * rms(x[na - fx:na]) / max(rms(r[:fx]), 1e-9)
    y = np.zeros(n); y[:na - fx] = x[:na - fx]
    f = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fx))
    y[na - fx:na] = x[na - fx:na] * (1 - f) + r[:fx] * f
    y[na:] = r[fx:fx + n - na]
    y[:int(0.0015 * sr)] *= np.linspace(0, 1, int(0.0015 * sr))
    k = int(0.30 * sr); y[k:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n - k))
    return y

def save(x, f):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(sr), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', f], input=x.tobytes(), check=True)

for tipo, L in FUENTES.items():
    for i, ini in enumerate(L, 1):
        x = golpe(tipo, i, ini)
        k = int(0.01 * sr); m10 = np.sqrt(np.max(np.convolve(x ** 2, np.ones(k) / k, 'valid')))
        x *= 10 ** (FUERZA[tipo] / 20) / m10
        pk = np.max(np.abs(x))
        if pk > 0.89: x *= 0.89 / pk        # (techo, -1 dB)
        save(x, os.path.join(SALE, f'pelota-{tipo}-{i}.mp3'))
        print(f'pelota-{tipo}-{i}: impacto del vídeo a {ini:.3f} s, pico {20*np.log10(np.max(np.abs(x))):.1f} dB')
