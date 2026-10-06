# Acabado de las portadas de los pueblos (tools/puebloportada.mjs): el mismo grado de color que las portadas de las
# comarcas (tools/comarcakey.py: contraste, luces cálidas y sombras frías, bloom, halo de sol y viñeta), con el halo
# arriba a la izquierda, del lado del monumento. Guarda src/assets/portadas/pueblos/<pueblo>.webp (1280×720) y <pueblo>-s.webp (480×270, para las tarjetas).
# Uso: python3 tools/puebloportada.py [pueblo …]
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = '/tmp/puebloportada', 'src/assets/portadas/pueblos'
os.makedirs(OUT, exist_ok=True)

def finish(im):
    a = np.asarray(im.convert('RGB'), np.float32) / 255
    H, W = a.shape[:2]
    l = a.mean(2, keepdims=True)
    a = np.clip(l + (a - l) * 1.22, 0, 1)
    a = a + 0.18 * a * (1 - a) * (2 * a - 1) * 2.2
    l = a.mean(2, keepdims=True)
    warm = np.array([1.07, 1.0, 0.88], np.float32); cool = np.array([0.9, 0.96, 1.1], np.float32)
    a = a * (cool + (warm - cool) * np.clip(l * 1.4 - 0.15, 0, 1))
    bright = np.clip((a - 0.6) / 0.4, 0, 1) * a
    b = np.asarray(Image.fromarray((bright * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(W / 60)), np.float32) / 255
    a = 1 - (1 - a) * (1 - b * 0.5)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((xx - W * 0.2) / W, (yy - H * 0.04) / H * 0.9)
    glow = np.exp(-(r / 0.45) ** 2)[..., None] * np.array([1.0, 0.7, 0.36], np.float32) * 0.4
    a = 1 - (1 - a) * (1 - glow)
    v = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.52) / (H * 0.62))
    a = a * (1 - 0.45 * np.clip(v - 0.5, 0, 1) ** 1.4)[..., None]
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return out.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))

names = sys.argv[1:] or [os.path.basename(f)[:-4] for f in sorted(glob.glob(SRC + '/*.png'))]
tot = 0
for n in names:
    im = finish(Image.open(f'{SRC}/{n}.png')).resize((1280, 720), Image.LANCZOS)
    im.save(f'{OUT}/{n}.webp', 'WEBP', quality=68, method=6); tot += os.path.getsize(f'{OUT}/{n}.webp')
    im.resize((480, 270), Image.LANCZOS).save(f'{OUT}/{n}-s.webp', 'WEBP', quality=72, method=6); tot += os.path.getsize(f'{OUT}/{n}-s.webp')
    print(n, os.path.getsize(f'{OUT}/{n}.webp') // 1024, 'KB')
print('total', tot // 1024, 'KB')
