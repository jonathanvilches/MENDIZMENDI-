# Prepara las texturas del borde de la isla flotante, generadas con Higgsfield (cuenta del autor, 14 de noviembre de 2026):
# la roca, repetible en las dos direcciones y con su mapa de normales, y las tiras, repetibles a lo ancho y con su
# transparencia (el fleco de hierba y musgo que cuelga, la tierra con raíces). Necesita PIL y numpy.
#
#   python3 tools/islas/texturas-borde.py roca <png> src/assets/isla/caliza.webp src/assets/isla/caliza-n.webp 1024
#       (la caliza: recorte cuadrado de 1880 px desde la esquina de arriba a la izquierda, sin la grieta oscura grande)
#   python3 tools/islas/texturas-borde.py tira <png> src/assets/isla/colgante.webp 260 2860 60 1260 1024 480
#   python3 tools/islas/texturas-borde.py tira <png> src/assets/isla/tierra.webp 0 3120 300 1180 1024 320
#   (la hierba de arriba, hierba.webp, 512 px: la de la foto hecha repetible igual que la roca, sin normales)
import sys, numpy as np
from PIL import Image, ImageFilter
def cruza(a, B, eje):   # (repetible en un eje: los B últimos píxeles se funden con los B primeros; queda B más corta)
    a = np.moveaxis(a, eje, 0); W = a.shape[0]; t = (np.arange(B) / B)[:, None, None] if a.ndim == 3 else (np.arange(B) / B)[:, None]
    t = t * t * (3 - 2 * t); out = a[: W - B].copy(); out[:B] = a[W - B:] * (1 - t) + a[:B] * t; return np.moveaxis(out, 0, eje)
def normales(rgb, fuerza, borrado):
    L = np.asarray(Image.fromarray(rgb.astype(np.uint8)).convert('L').filter(ImageFilter.GaussianBlur(borrado)), np.float32) / 255
    dx = (np.roll(L, -1, 1) - np.roll(L, 1, 1)) * fuerza; dy = (np.roll(L, -1, 0) - np.roll(L, 1, 0)) * fuerza
    n = np.stack([-dx, dy, np.ones_like(L)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True); return ((n * 0.5 + 0.5) * 255).astype(np.uint8)
modo = sys.argv[1]
if modo == 'roca':
    src, out, outn, tam = sys.argv[2:6]; tam = int(tam)
    a = np.asarray(Image.open(src).convert('RGB'), np.float32); B = a.shape[0] // 9
    a = cruza(cruza(a, B, 1), B, 0)
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((tam, tam), Image.LANCZOS); im.save(out, 'WEBP', quality=86, method=6)
    Image.fromarray(normales(np.asarray(im.resize((tam // 2, tam // 2), Image.LANCZOS), np.float32), 5.0, 0.8)).save(outn, 'WEBP', quality=88, method=6)
    print('roca', im.size, out)
else:   # tira: src out x0 x1 y0 y1 ancho alto
    src, out = sys.argv[2:4]; x0, x1, y0, y1, W, H = map(int, sys.argv[4:10])
    a = np.asarray(Image.open(src).convert('RGBA'), np.float32)[y0:y1, x0:x1]
    # (el color, sin el halo del recorte: donde es casi transparente, el de los vecinos opacos)
    al = a[..., 3:4] / 255; rgb = a[..., :3]
    pre = Image.fromarray(np.clip(rgb * al, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)); den = Image.fromarray(np.clip(al[..., 0] * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
    fill = np.asarray(pre, np.float32) / np.maximum(np.asarray(den, np.float32)[..., None] / 255, 1e-3)
    rgb = rgb * al + np.clip(fill, 0, 255) * (1 - al); a = np.concatenate([rgb, a[..., 3:4]], -1)
    a = cruza(a, (x1 - x0) // 8, 1)
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA').resize((W, H), Image.LANCZOS).save(out, 'WEBP', quality=88, method=6, exact=True)
    print('tira', W, H, out)
