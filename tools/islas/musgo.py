# El musgo de la panza de la isla flotante, como en la tercera referencia del autor (15 de noviembre de 2026): una isla
# cuya roca está cubierta de musgo y hierba que baja en lenguas y cortinas desde el borde. Generado con Higgsfield (cuenta
# del autor, 1024 px): musgo en cojines con helechos pequeños. Lo hace repetible sin costuras (la foto y su copia corrida
# media vuelta, mezcladas con una mancha irregular y difuminada, como tools/islas/tierra-roca.py), lo deja en 512 px y
# saca su mapa de normales de su propia luz. Necesita PIL y numpy.
#
#   python3 tools/islas/musgo.py <png> src/assets/isla/musgo.webp src/assets/isla/musgo-n.webp
import sys, numpy as np
from PIL import Image, ImageFilter
src, out_c, out_n = sys.argv[1:4]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
H, W, _ = im.shape
rol = np.roll(np.roll(im, H // 2, 0), W // 2, 1)
y, x = np.mgrid[0:H, 0:W]; d = np.maximum(np.abs(x - W / 2) / (W / 2), np.abs(y - H / 2) / (H / 2))
n = np.random.default_rng(11).random((H // 32 + 1, W // 32 + 1)).astype(np.float32)
n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
m = (d + (n - 0.5) * 0.35 < 0.62).astype(np.float32)
m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18))).astype(np.float32) / 255
m = np.where(d > 0.93, 0, m)[..., None]
o = np.clip(im * m + rol * (1 - m), 0, 1)
c = Image.fromarray((o * 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS)
c.save(out_c, quality=82)
h = np.asarray(c.convert('L').filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 2.6; dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 2.6
l = np.sqrt(dx * dx + dy * dy + 1); N = np.stack([-dx / l, dy / l, 1 / l], 2) * 0.5 + 0.5
Image.fromarray((N * 255).astype(np.uint8)).save(out_n, quality=85)
