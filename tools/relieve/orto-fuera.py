# La ortofoto del mapa (src/assets/relieve/orto.webp, de tools/relieve/ortofoto.py) sin la mancha de Francia: el servicio
# del PNOA solo cubre España y, al otro lado de la frontera, su capa de fondo es un satélite de baja resolución, oscuro y a
# cuadros. Mientras el mapa solo pintaba Navarra no se veía; desde que la isla de una comarca crece y coge montes de
# Francia (15 de noviembre de 2026, src/hub/mapa3dAmplia.js), sí: «que no parezcan piezas de puzzle». Donde la foto es de
# esa capa (casi sin detalle y mucho más oscura que la imagen de alrededor), se pone la imagen de alrededor del mapa
# (src/assets/relieve/entorno-sat.webp, de tools/relieve/fuera.py: el mismo servicio, con el fondo ya llevado al tono del
# PNOA), con el borde fundido. Lo demás no se toca. Necesita PIL y numpy.
#
#   python3 tools/relieve/orto-fuera.py src/assets/relieve/orto.webp src/assets/relieve/entorno-sat.webp <salida .webp>
import sys, numpy as np
from PIL import Image, ImageFilter
ORTO, ENT, OUT = sys.argv[1:4]
X0, Y0, PASO = 15.0, 12.0, 0.45            # (src/data/mapa-orto.js)
EX0, EY0, EW = 372 - 1000, 400 - 760, 2000  # (lo que cubre entorno-sat.webp, en unidades del mapa)
o = Image.open(ORTO).convert('RGB'); W, H = o.size
e = Image.open(ENT).convert('RGBA'); k = e.size[0] / EW
a = PASO * k; er = e.transform((W, H), Image.AFFINE, (a, 0, (X0 - EX0) * k + 0.5 * a - 0.5, 0, a, (Y0 - EY0) * k + 0.5 * a - 0.5), resample=Image.BICUBIC)
O = np.asarray(o).astype(np.float32) / 255; E = np.asarray(er).astype(np.float32)[..., :3] / 255
g = lambda x, r: np.asarray(Image.fromarray(np.clip(x * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
L, LE = O.mean(2), E.mean(2)
det = g(np.clip(np.abs(L - g(L, 3)) * 8, 0, 1), 10)       # (el detalle de cerca: el PNOA tiene mucho, el fondo casi nada)
ratio = g(LE, 10) / np.maximum(g(L, 10), 0.02)             # (cuánto más clara es la imagen de alrededor)
m = ((det < 0.1) & (ratio > 1.25)).astype(np.float32)
m = (g(m, 6) > 0.5).astype(np.float32)                     # (sin motas sueltas)
# (los cuadros sueltos de esa capa junto a la frontera, que por tocar el PNOA claro parecían tener detalle: cerca de lo
# ya encontrado, lo mucho más oscuro que la imagen de alrededor, mirado de cerca)
cerca = g(m, 30) > 0.03
m = np.maximum(m, (cerca & (g(LE, 2) / np.maximum(g(L, 2), 0.02) > 1.3)).astype(np.float32))
m = (g(m, 3) > 0.5).astype(np.float32)
m = np.maximum(m, (g(m, 14) > 0.3).astype(np.float32))     # (algo crecida, para que entren los escalones de los cuadros)
m = g(np.maximum(m, (g(m, 22) > 0.2).astype(np.float32)), 26)[..., None]   # (y el borde, fundido en ancho: los escalones de los cuadros del
# servicio no se notan)
out = O * (1 - m) + E * m
Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8)).save(OUT, quality=88, method=6)
print('cambiado', round(float((m > 0.5).mean()) * 100, 1), '% de la imagen')
