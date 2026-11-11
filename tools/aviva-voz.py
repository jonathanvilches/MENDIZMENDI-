# Locución más viva, sin crear voz: se editan las grabaciones ya cortadas (tools/alinea-voz.py). Acorta las pausas de
# dentro de cada frase (las de junto a «Iñaki», casi del todo), recorta el silencio de los bordes y, en la voz de mujer,
# le da cuerpo y le quita el brillo metálico, con un 5 % más de ritmo sin cambiar el tono. Se pasa una sola vez a cada
# frase recién cortada (dos veces acortaría dos veces): la salida va a otra carpeta y se copia a src/assets/voz.
#   python3 tools/aviva-voz.py <hombre|mujer> <carpeta de salida> [sala]   (sala: con un poco de eco de cabina; necesita numpy)
import sys, subprocess, glob, math, os, json, numpy as np
voz, dest = sys.argv[1], sys.argv[2]; sala = len(sys.argv) > 3 and sys.argv[3] == 'sala'
os.makedirs(dest, exist_ok=True)
SR = 44100
# (las pausas junto a «Iñaki» en las frases de Miren: cuál, contando desde 0)
INAKI = {'d-descanso-1-2': [0], 'd-final-1-2': [0], 'd-grada-1-2': [0], 'd-igualado-1-1': [0], 'd-inicio-1-2': [0], 'd-inicio-2-2': [1],
         'd-mano-1-1': [0], 'd-peloteo-1-2': [0], 'd-pesada-1-1': [0], 'd-tanto-1-2': [1], 'd-viva-1-2': [0]}
def objetivo(largo, junto):
    if junto: return 0.07
    if voz == 'mujer': return 0.24 if largo >= 0.45 else 0.13 if largo >= 0.2 else largo
    return 0.24 if largo >= 0.4 else 0.16 if largo >= 0.28 else largo
def lee(f):
    return np.frombuffer(subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, dtype=np.float32).copy()
informe = {}
for f in sorted(glob.glob(f'/home/user/mendimendiz/src/assets/voz/{voz}/es/*.mp3')):
    k = os.path.basename(f)[:-4]; x = lee(f); hop = SR // 100; n = len(x) // hop
    e = np.array([20 * math.log10(max(1e-9, float(np.sqrt(np.mean(x[i*hop:(i+1)*hop] ** 2))))) for i in range(n)]); on = e > -40
    if not on.any(): continue
    a, b = int(np.argmax(on)), n - 1 - int(np.argmax(on[::-1]))
    pausas = []; i = a
    while i <= b:
        if not on[i]:
            j = i
            while j <= b and not on[j]: j += 1
            if j - i >= 9: pausas.append((i, j))
            i = j
        else: i += 1
    # (los bordes: 50 ms antes de la voz y 50 ms después)
    ini, fin = max(0, a * hop - int(0.05 * SR)), min(len(x), (b + 1) * hop + int(0.05 * SR))
    trozos, cur, quitado = [], ini, 0.0
    for idx, (p0, p1) in enumerate(pausas):
        largo = (p1 - p0) / 100; t = objetivo(largo, idx in INAKI.get(k, []))
        if t >= largo - 0.01: continue
        # (se quita el centro de la pausa, con un fundido cruzado de 10 ms en el empalme)
        keep = int(t * SR / 2); s0, s1 = p0 * hop + keep, p1 * hop - keep
        trozos.append(x[cur:s0]); cur = s1; quitado += (s1 - s0) / SR
    trozos.append(x[cur:fin])
    y = trozos[0]; X = int(0.01 * SR)
    for t in trozos[1:]:
        if len(y) > X and len(t) > X:
            r = np.linspace(0, 1, X, dtype=np.float32); y = np.concatenate([y[:-X], y[-X:] * (1 - r) + t[:X] * r, t[X:]])
        else: y = np.concatenate([y, t])
    raw = os.path.join(dest, k + '.f32'); y.astype(np.float32).tofile(raw)
    af = []
    if voz == 'mujer':
        af += ['equalizer=f=220:t=q:w=0.9:g=2.5', 'equalizer=f=3200:t=q:w=1:g=-2.5', 'equalizer=f=7500:t=q:w=1.2:g=-3', 'lowpass=f=12000', 'atempo=1.05', 'volume=-1.4dB']
        if sala: af += ['aecho=0.9:0.9:19|31|47:0.06|0.045|0.03']
    af += [f'afade=t=in:d=0.01', 'alimiter=limit=0.89']
    out = os.path.join(dest, k + '.mp3')
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw, '-af', ','.join(af), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', out], check=True)
    # (y el final, fundido en sus últimos 40 ms)
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout)
    tmp = out + '.tmp.mp3'; subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', out, '-af', f'afade=t=out:st={max(0, d - 0.04):.3f}:d=0.04', '-c:a', 'libmp3lame', '-b:a', '96k', tmp], check=True); os.replace(tmp, out); os.remove(raw)
    informe[k] = {'antes': round(len(x) / SR, 2), 'despues': round(d, 2), 'pausas_quitadas': round(quitado, 2)}
json.dump(informe, open(os.path.join(dest, 'informe.json'), 'w'), indent=0)
A = sum(v['antes'] for v in informe.values()); D = sum(v['despues'] for v in informe.values())
print(voz, 'frases', len(informe), 'duración total %.1f s → %.1f s' % (A, D))
