# Acabado de ilustración para las portadas de los pueblos: el fondo (fotos de tools/puebloportada.mjs) y el personaje
# en acción (tools/heroaccion.mjs) pasan a parecer pintados, como la portada de un videojuego: manchas de color planas
# (filtro de Kuwahara: pinceladas que respetan los bordes), color vivo por bandas suaves, líneas de tinta en los bordes,
# luz dorada de atardecer, halo y viñeta; el personaje, además, con su contorno de tinta y el contraluz cálido.
# Uso: python3 tools/ilustra.py fondos [pueblo …]  ·  python3 tools/ilustra.py personajes
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter

def box(a, r):
    # media en una ventana (2r+1)² con sumas acumuladas (rápido y sin dependencias)
    p = np.pad(a, ((r + 1, r), (r + 1, r)) + ((0, 0),) * (a.ndim - 2), mode='edge')
    c = p.cumsum(0).cumsum(1); k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def shift(x, dy, dx):
    # desplazar con los bordes repetidos (np.roll daba la vuelta y manchaba los lados de la imagen)
    H, W = x.shape[:2]; p = np.pad(x, ((abs(dy), abs(dy)), (abs(dx), abs(dx))) + ((0, 0),) * (x.ndim - 2), mode='edge')
    return p[abs(dy) - dy:abs(dy) - dy + H, abs(dx) - dx:abs(dx) - dx + W]

def kuwahara(a, r):
    # de los cuatro cuadrantes alrededor de cada píxel, el color medio del más uniforme (pinceladas que respetan bordes)
    l = a.mean(2); h = r // 2 + 1
    mean = box(a, h); l1 = box(l, h); var = box(l * l, h) - l1 * l1
    out = None; bv = None
    for dy in (-h, h):
        for dx in (-h, h):
            mv = shift(var, dy, dx); mm = shift(mean, dy, dx)
            if bv is None: bv = mv.copy(); out = mm.copy()
            else: s = mv < bv; bv[s] = mv[s]; out[s] = mm[s]
    # suaviza la costura entre cuadrantes (si no, salen manchas cuadradas)
    return (out + box(out, 1)) / 2

def ink(a, thr=0.09, k=1.0):
    # líneas de tinta: donde cambia mucho la luz (bordes de casas, tejados, ventanas)
    l = a.mean(2); gx = np.zeros_like(l); gy = np.zeros_like(l)
    gx[:, 1:-1] = l[:, 2:] - l[:, :-2]; gy[1:-1] = l[2:] - l[:-2]
    g = np.hypot(gx, gy)
    e = np.clip((g - thr) / (thr * 1.6), 0, 1) * k
    return 1 - e[..., None] * np.array([0.72, 0.78, 0.7], np.float32)   # tinta de color ciruela oscuro, no negro

def grade(a):
    l = a.mean(2, keepdims=True)
    a = np.clip(l + (a - l) * 1.35, 0, 1)                  # color vivo
    # bandas suaves de luz (cel shading ligero): se acerca cada tono a 6 niveles sin cortes bruscos
    q = 6; lq = np.round(l * q) / q; a = np.clip(a + (lq - l) * 0.35, 0, 1)
    l = a.mean(2, keepdims=True)
    warm = np.array([1.08, 1.0, 0.86], np.float32); cool = np.array([0.88, 0.95, 1.12], np.float32)
    return a * (cool + (warm - cool) * np.clip(l * 1.5 - 0.2, 0, 1))

def light(a, sx, sy, glow=0.42, vig=0.45):
    H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((xx - W * sx) / W, (yy - H * sy) / H * 0.9)
    g = np.exp(-(r / 0.5) ** 2)[..., None] * np.array([1.0, 0.68, 0.34], np.float32) * glow
    a = 1 - (1 - a) * (1 - g)
    v = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.52) / (H * 0.62))
    return a * (1 - vig * np.clip(v - 0.5, 0, 1) ** 1.4)[..., None]

def fondo(src, dst, small):
    im = Image.open(src).convert('RGB').resize((1280, 720), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    o = a
    a = kuwahara(a, 4); a = kuwahara(a, 2)                 # pinceladas medianas y luego el detalle
    a = a * 0.82 + box(o, 1) * 0.18                         # (sin perder ventanas ni rejas)
    a = grade(a) * ink(a, 0.06, 0.9)
    a = light(a, 0.18, 0.02)
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.SMOOTH)
    out.save(dst, 'WEBP', quality=70, method=6); out.resize((480, 270), Image.LANCZOS).save(small, 'WEBP', quality=72, method=6)

def personaje(src, dst, hgt=900):
    im = Image.open(src).convert('RGBA'); bb = im.getbbox(); im = im.crop((max(0, bb[0] - 30), max(0, bb[1] - 30), min(im.width, bb[2] + 30), im.height))
    im = im.resize((round(im.width * hgt / im.height), hgt), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255; rgb, al = a[..., :3], a[..., 3:]
    # el color de fuera del personaje se rellena con el suyo (para que el filtro no traiga negro a los bordes)
    pre = rgb * al; w = box(al[..., 0], 3)[..., None]; fill = box(pre, 3) / np.maximum(w, 1e-3)
    rgb = np.where(al > 0.5, rgb, fill)
    rgb = kuwahara(rgb, 3)
    rgb = grade(rgb) * ink(rgb, 0.1, 0.7)
    # contorno de tinta: el borde del personaje engordado unos píxeles, por detrás
    A = Image.fromarray((al[..., 0] * 255).astype(np.uint8)); O = np.asarray(A.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(1.2)), np.float32)[..., None] / 255
    line = np.array([0.16, 0.08, 0.2], np.float32)
    col = rgb * al + line * (1 - al)
    out = np.concatenate([np.clip(col, 0, 1), np.maximum(al, O)], 2)
    Image.fromarray((out * 255).astype(np.uint8), 'RGBA').save(dst, 'WEBP', quality=84, alpha_quality=90, method=6)

if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'fondos'
    if what == 'fondos':
        os.makedirs('src/assets/portadas/pueblos', exist_ok=True)
        names = sys.argv[2:] or [os.path.basename(f)[:-4] for f in sorted(glob.glob('/tmp/puebloportada/*.png')) if not os.path.basename(f).startswith('cand-')]
        for n in names:
            fondo(f'/tmp/puebloportada/{n}.png', f'src/assets/portadas/pueblos/{n}.webp', f'src/assets/portadas/pueblos/{n}-s.webp'); print('·', n)
    else:
        os.makedirs('src/assets/portadas/heroe', exist_ok=True)
        for f in sorted(glob.glob('/tmp/heroaccion/*.png')):
            n = os.path.basename(f)[:-4]; personaje(f, f'src/assets/portadas/heroe/acc-{n}.webp'); print('·', n)
