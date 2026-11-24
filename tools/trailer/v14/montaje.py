"""El montaje del tráiler v14 (v14/plan.mjs): el del v13, con los tiempos contados desde el primer compás de la música (T0).

El del v13 (v13/plan.mjs): cada fotograma se compone aquí, a 1920 × 1080 y 24 por segundo.

· Cada plano toma sus fotogramas de la toma (ya a 24 por segundo) desde el que dice el plan y a su velocidad.
· La cámara siempre se mueve: un empuje lento hacia dentro en todo el plano y, al entrar, un golpe de zoom que se asienta en
  seis fotogramas (salvo los planos «suave» del principio y el logo). Los capítulos entran con un destello blanco corto.
· Los rótulos animados (v13/rotulos.mjs) van encima de la imagen; al final el mapa se oscurece bajo el logo.
· Luego ffmpeg le da el color del v8 (algo más de contraste y color, y un poco de nitidez) y le pone el sonido.
Necesita Python con Pillow y numpy.
Uso: python3 tools/trailer/v14/montaje.py <tomas> <rótulos> <mezcla.wav> <trabajo> <salida.mp4>
(<tomas>: una carpeta con una subcarpeta por toma, con sus fotogramas 0000.jpg… a 24 por segundo)
"""
import json, os, subprocess, sys
from multiprocessing import Pool
from PIL import Image

RAIZ = __file__.rsplit('/tools/', 1)[0]
TOM, ROT, WAV, TRA, OUT = sys.argv[1:6]
D = json.loads(subprocess.run(['node', '-e', "import('./tools/trailer/v14/plan.mjs').then(m => console.log(JSON.stringify({ P: m.PLANOS, R: m.ROTULOS, BEAT: m.BEAT, T0: m.T0, T_LOGO: m.T_LOGO, DURA: m.DURA })))"],
                              cwd=RAIZ, capture_output=True, check=True, text=True).stdout)
FPS, W, H = 24, 1920, 1080
BEAT, T0, T_LOGO, DURA = D['BEAT'], D['T0'], D['T_LOGO'], D['DURA']
N = int(round(DURA * FPS))
fr = lambda b: int(round((T0 + b * BEAT) * FPS))
lista = {}


def fotos(nom):
    if nom not in lista:
        d = os.path.join(TOM, nom)
        lista[nom] = sorted(os.path.join(d, f) for f in os.listdir(d) if f.endswith('.jpg'))
    return lista[nom]


# los planos, en fotogramas
PL = []
for i, (b, nom, desde, vel, *o) in enumerate(D['P']):
    o = o[0] if o else {}
    k0 = fr(b)
    k1 = fr(D['P'][i + 1][0]) if i + 1 < len(D['P']) else N
    PL.append(dict(k0=k0, k1=k1, nom=nom, desde=desde, vel=vel, flash=o.get('flash', False), suave=o.get('suave', False), n=i))
ROTS = [(nom, fr(b), sorted(os.listdir(os.path.join(ROT, nom)))) for nom, b, _ in D['R']]
LOGO = (int(round((T_LOGO + 0.35) * FPS)), sorted(os.listdir(os.path.join(ROT, 'logo'))))
OSCURO = T_LOGO + 1.9


def plano(k):
    for p in PL:
        if p['k0'] <= k < p['k1']:
            return p
    return PL[-1]


def hazlo(k):
    p = plano(k)
    f = fotos(p['nom'])
    j = min(p['desde'] + int(round((k - p['k0']) * p['vel'])), len(f) - 1)
    src = Image.open(f[j]).convert('RGB')
    sw, sh = src.size
    # la cámara: empuje lento (más en los planos largos) y golpe de zoom al entrar
    u = (k - p['k0']) / max(1, p['k1'] - p['k0'] - 1)
    z = 1.0 + (0.035 if p['suave'] else 0.05) * u
    e = min(1.0, (k - p['k0']) / 6)
    if not p['suave']:
        z += 0.07 * (1 - e) ** 3
    # (de lado a lado, alternando, un poco de deriva para que no sea solo zoom)
    dx = (0.012 * (u - 0.5)) * (1 if p['n'] % 2 else -1)
    cw, ch = sw / z, sh / z
    x0 = (sw - cw) / 2 + dx * sw
    x0 = min(max(0, x0), sw - cw)
    y0 = (sh - ch) / 2
    im = src.transform((W, H), Image.AFFINE, (cw / W, 0, x0, 0, ch / H, y0), resample=Image.BICUBIC)
    t = k / FPS
    if t > OSCURO:
        a = min(1.0, (t - OSCURO) / 0.9)
        im = Image.blend(im, Image.new('RGB', (W, H), (11, 7, 20)), 0.8 * a)
    im = im.convert('RGBA')
    if p['flash'] and k - p['k0'] < 5:
        a = 0.75 * (1 - (k - p['k0']) / 5) ** 1.5
        im = Image.alpha_composite(im, Image.new('RGBA', (W, H), (255, 250, 235, int(255 * a))))
    for nom, r0, fs in ROTS:
        if r0 <= k < r0 + len(fs):
            im = Image.alpha_composite(im, Image.open(os.path.join(ROT, nom, fs[k - r0])).convert('RGBA'))
    l0, fs = LOGO
    if k >= l0:
        im = Image.alpha_composite(im, Image.open(os.path.join(ROT, 'logo', fs[min(k - l0, len(fs) - 1)])).convert('RGBA'))
    im.convert('RGB').save(os.path.join(TRA, f'{k:05d}.jpg'), quality=93)
    return k


if __name__ == '__main__':
    os.makedirs(TRA, exist_ok=True)
    for f in os.listdir(TRA):
        os.remove(os.path.join(TRA, f))
    for p in PL:
        n = len(fotos(p['nom']))
        jz = p['desde'] + int(round((p['k1'] - p['k0'] - 1) * p['vel']))
        print(f"{p['nom']:12s} {p['k0'] / FPS:6.2f}–{p['k1'] / FPS:6.2f} s  fotogramas {p['desde']}–{jz}" + (f'  (la toma tiene {n})' if jz >= n else ''))
    with Pool(os.cpu_count()) as pool:
        for i, _ in enumerate(pool.imap_unordered(hazlo, range(N), chunksize=8)):
            if i % 400 == 0:
                print('  ', i, '/', N, flush=True)
    GRADO = 'eq=contrast=1.06:saturation=1.1:gamma=0.98,unsharp=5:5:0.45:5:5:0'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(TRA, '%05d.jpg'), '-i', WAV,
                    '-vf', f'{GRADO},fade=t=in:st=0:d=0.4,fade=t=out:st={DURA - 1.2:.3f}:d=1.2,format=yuv420p',
                    '-map', '0:v', '-map', '1:a', '-t', f'{DURA:.3f}', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
                    '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT], check=True)
    print('hecho', OUT, N, 'fotogramas')
