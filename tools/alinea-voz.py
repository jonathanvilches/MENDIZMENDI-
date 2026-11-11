# Corta una locución de Envato (un bloque de frases seguidas, una sola voz) en un archivo por frase, sin oírla, y lo
# deja en src/assets/voz/<hombre|mujer>/<es|eu>/<clave>.mp3. Para las voces del guion a dos voces (noviembre de 2026):
# Envato las da por bloques de menos de 800 caracteres, primero las del hombre y luego las de la mujer, con pausas
# entre frases tan cortas como las de dentro de una frase, así que cortar por los silencios (tools/corta-voz.mjs, para
# las grabaciones del autor con pausas largas) no basta.
#   python3 tools/alinea-voz.py <locución.mp3> <es|eu> <hombre|mujer> <guion.json> [--prueba <carpeta>]
# guion.json: [{ "id": "dejada-1", "texto": "..." }, ...] en el orden en que se leen (los de tools/guion-voz/).
# Necesita ffmpeg, espeak-ng y numpy.
# Cómo: 1) cada frase se sintetiza aparte con espeak-ng, solo como regla para medir (no se usa en el juego), con voz
# de hombre o de mujer según la locución, y se sabe dónde empieza y acaba cada una; 2) DTW entre la regla, estirada a
# la duración de la locución, y la locución, con coeficientes cepstrales normalizados (sin el volumen ni el timbre de
# cada voz); 3) los límites de cada frase pasan por el camino al audio de Envato y se cortan en el silencio o el valle
# de volumen más cercano (a menos de 0,3 s); 4) se comprueba que cada trozo se parece más a su frase que a la de antes
# y la de después (DTW otra vez): imprime las dudosas. La locución entera se normaliza antes (paso alto a 70 Hz,
# compresión suave y -16 LUFS: las de mujer llegaban a -36), y cada frase va en mp3 mono de 96 kbps con fundidos.
import sys, json, subprocess, os, tempfile
import numpy as np

args = sys.argv[1:]
prueba = None
if '--prueba' in args: i = args.index('--prueba'); prueba = args[i + 1]; del args[i:i + 2]
if len(args) != 4 or args[1] not in ('es', 'eu') or args[2] not in ('hombre', 'mujer'):
    sys.exit('Uso: python3 tools/alinea-voz.py <locución.mp3> <es|eu> <hombre|mujer> <guion.json> [--prueba <carpeta>]')
ent, lang, voz, guion = args
F = json.load(open(guion, encoding='utf-8'))
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dest = prueba or os.path.join(RAIZ, 'src', 'assets', 'voz', voz, lang)
tmp = tempfile.mkdtemp()
SR, HOP, WIN, INF = 16000, 160, 400, 1e18   # (10 ms)

def pcm(path, sr=SR):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768

def mel_fb(n_mels=26, nfft=512):
    f2m = lambda f: 2595 * np.log10(1 + f / 700); m2f = lambda m: 700 * (10 ** (m / 2595) - 1)
    bins = np.floor((nfft + 1) * m2f(np.linspace(f2m(80), f2m(7600), n_mels + 2)) / SR).astype(int)
    fb = np.zeros((n_mels, nfft // 2 + 1))
    for i in range(1, n_mels + 1):
        a, b, c = bins[i - 1], bins[i], bins[i + 1]
        for k in range(a, b): fb[i - 1, k] = (k - a) / max(1, b - a)
        for k in range(b, c): fb[i - 1, k] = (c - k) / max(1, c - b)
    return fb
FB = mel_fb()
DCT = np.cos(np.pi / 26 * (np.arange(26)[None, :] + 0.5) * np.arange(1, 14)[:, None])
def feats(x):
    n = 1 + (len(x) - WIN) // HOP
    fr = x[np.arange(WIN)[None, :] + HOP * np.arange(n)[:, None]] * np.hamming(WIN)[None, :]
    c = np.log((np.abs(np.fft.rfft(fr, 512)) ** 2) @ FB.T + 1e-8) @ DCT.T
    return (c - c.mean(0)) / (c.std(0) + 1e-6), 10 * np.log10((fr ** 2).mean(1) + 1e-10)

def dtw(X, Y, banda=None, camino=False):
    # (pasos (1,1), (1,0) y (1,2): cada fila depende solo de la anterior; X se estira antes a la duración de Y)
    k = len(Y) / len(X); X = X[np.clip(np.round(np.arange(max(2, int(len(X) * k))) / k).astype(int), 0, len(X) - 1)]
    n, m = len(X), len(Y); prev = np.full(m, INF); back = np.zeros((n, m), np.int8) if camino else None
    for i in range(n):
        c = np.sqrt(((Y - X[i]) ** 2).sum(1))
        if i == 0: cur = np.full(m, INF); cur[0] = c[0]
        else:
            st = np.stack([np.concatenate([[INF], prev[:-1]]), prev, np.concatenate([[INF, INF], prev[:-2]])]); a = st.argmin(0)
            cur = st[a, np.arange(m)] + c
            if camino: back[i] = a
        if banda: lo, hi = max(0, int(i * m / n) - banda), min(m, int(i * m / n) + banda); cur[:lo] = INF; cur[hi:] = INF
        prev = cur
    if not camino: return prev[-1] / (n + m)
    p = np.zeros(n, int); j = m - 1
    for i in range(n - 1, -1, -1):
        p[i] = j
        if i: a = back[i, j]; j = max(0, j - (1 if a == 0 else 0 if a == 1 else 2))
    return p, k

# 0) la locución normalizada entera
norm = os.path.join(tmp, 'norm.wav')
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', ent, '-af', 'highpass=f=70,acompressor=threshold=-28dB:ratio=2.5:attack=8:release=120,loudnorm=I=-16:TP=-1.5:LRA=7',
                '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', norm], check=True)
# 1) la regla
regla = ('es' if lang == 'es' else 'eu') + ('+f3' if voz == 'mujer' else '')
partes, lim, t = [], [], 0.0
for i, f in enumerate(F):
    w = os.path.join(tmp, f'r{i}.wav'); subprocess.run(['espeak-ng', '-v', regla, '-s', '165', '-w', w, f['texto']], check=True)
    x = pcm(w); on = np.where(np.abs(x) > 0.01)[0]; x = x[on[0]:on[-1] + 1] if len(on) else x
    lim.append((t, t + len(x) / SR)); partes += [x, np.zeros(int(0.5 * SR), np.float32)]; t += len(x) / SR + 0.5
A, _ = feats(np.concatenate(partes)); B, eB = feats(pcm(norm))
# 2) el camino
path, k = dtw(A, B, banda=int(0.18 * len(B)) + 200, camino=True)
aB = lambda s: path[min(len(path) - 1, int(s * SR / HOP * k))] * HOP / SR
# 3) a la locución, al silencio o valle más cercano
eS = np.convolve(eB, np.ones(3) / 3, mode='same'); umbral = np.percentile(eB, 97) - 30
def ajusta(s):
    f = int(s * SR / HOP); lo, hi = max(0, f - 30), min(len(eS), f + 31); w = eS[lo:hi]; sil = np.where(w < umbral)[0]
    if len(sil):
        runs = np.split(sil, np.where(np.diff(sil) > 1)[0] + 1)
        return (lo + min((int(r.mean()) for r in runs), key=lambda g: abs(lo + g - f))) * HOP / SR
    return (lo + int(np.argmin(w))) * HOP / SR
out = [{'id': f['id'], 'texto': f['texto'], 'ini': ajusta(aB(a)), 'fin': ajusta(aB(b))} for (a, b), f in zip(lim, F)]
for i in range(1, len(out)):
    if out[i]['ini'] < out[i - 1]['fin']: out[i]['ini'] = out[i - 1]['fin'] = (out[i]['ini'] + out[i - 1]['fin']) / 2
# 4) la comprobación
trozo = lambda a, b, X, kk=1: X[int(a * SR / HOP * kk):max(int(a * SR / HOP * kk) + 2, int(b * SR / HOP * kk))]
dudas = []
for j, o in enumerate(out):
    cs = {q: dtw(trozo(lim[q][0], lim[q][1], A), trozo(o['ini'], o['fin'], B)) for q in (j - 1, j, j + 1) if 0 <= q < len(lim)}
    if min(cs, key=cs.get) != j: dudas.append(o['id'])
# 5) los archivos
os.makedirs(dest, exist_ok=True)
for o in out:
    ini, fin = max(0, o['ini'] - 0.03), o['fin'] + 0.03
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{ini:.3f}', '-to', f'{fin:.3f}', '-i', norm, '-af', f'afade=t=in:d=0.012,afade=t=out:st={fin - ini - 0.06:.3f}:d=0.06',
                    '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', os.path.join(dest, o['id'] + '.mp3')], check=True)
    print(f"{'¿?' if o['id'] in dudas else '  '} {o['id']:<22} {o['ini']:7.2f} s  dura {o['fin'] - o['ini']:5.2f} s  {o['texto']}")
print(f"\n{len(out)} frases en {dest}.", 'Todas se parecen más a su frase que a las de al lado.' if not dudas else f"Para escuchar (se parecen más a la de al lado; en frases cortas pasa sin que esté mal): {', '.join(dudas)}")
