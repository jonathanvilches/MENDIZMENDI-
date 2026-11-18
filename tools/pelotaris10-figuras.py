# Las figuras de las cartas, la pantalla VS y los marcadores, con los 10 pelotaris de siempre (el autor, 18 de noviembre
# de 2026: «adapta las imágenes que hay en el juego para que coincidan los personajes, con las imágenes en las cards y
# marcadores»). Salen de los mismos dibujos de Higgsfield de los que se hicieron los modelos 3D, así que carta y cancha
# enseñan al mismo personaje:
#   - se les quita el fondo gris (lo que, desde los bordes, se parece al fondo de su fila; con el borde suavizado)
#   - la de colorado es la misma con la camiseta azul pasada a colorado (solo el tono; el sombreado se conserva)
#   - se encuadran como las ilustraciones de antes (2:3, la figura de pies a cabeza) en sus tres tamaños
# Cada nombre de la plantilla (ui/pelotariFig.js) recibe la figura de su aspecto (pelota/aspectos.js): los archivos se
# llaman igual que antes, así que las cartas, la pantalla VS y los marcadores no cambian de código.
# Uso: python3 -I tools/pelotaris10-figuras.py <carpeta con 01-rizos.png … 10-rizos.png> [prueba.png]
import sys, os, colorsys
import numpy as np
from PIL import Image, ImageFilter
from collections import deque
SRC = sys.argv[1]; R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'assets', 'pelotaris')
ARCH = {'chico1': '01-rizos', 'chico2': '02-corto', 'chico3': '03-punta', 'chico4': '04-rapado', 'chico5': '05-melenita', 'chica1': '06-coleta', 'chica2': '07-trenza', 'chica3': '08-mono', 'chica4': '09-melena', 'chica5': '10-rizos'}
# (el aspecto de cada nombre: el mismo reparto que pelota/aspectos.js)
DE = {'inigo': 'chico1', 'asier': 'chico1', 'unai': 'chico2', 'jokin': 'chico2', 'ekaitz': 'chico2', 'ander': 'chico3', 'xabier': 'chico3', 'aitor': 'chico4', 'inaki': 'chico4', 'mikel': 'chico5', 'julen': 'chico5',
      'garazi': 'chica1', 'nerea': 'chica1', 'ane': 'chica1', 'maialen': 'chica2', 'nahia': 'chica2', 'leire': 'chica2', 'irati': 'chica3', 'miren': 'chica3', 'oihana': 'chica4', 'uxue': 'chica4', 'amaia': 'chica5'}
def recorta(p):
    im = np.asarray(Image.open(p).convert('RGB')).astype(np.float32); H, W, _ = im.shape
    # el fondo de cada fila: entre el color de su borde izquierdo y el del derecho
    iz = np.median(im[:, :24], axis=1); de = np.median(im[:, -24:], axis=1); t = np.linspace(0, 1, W)[None, :, None]
    fondo = iz[:, None, :] * (1 - t) + de[:, None, :] * t; d = np.abs(im - fondo).max(2)
    # desde los bordes, todo lo que se parece al fondo
    cerca = d < 26; fuera = np.zeros((H, W), bool); q = deque()
    for x in range(W): q.append((0, x)); q.append((H - 1, x))
    for y in range(H): q.append((y, 0)); q.append((y, W - 1))
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= H or x >= W or fuera[y, x] or not cerca[y, x]: continue
        fuera[y, x] = True; q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    a = Image.fromarray(((~fuera) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    a = np.asarray(a).astype(np.float32) / 255; a = np.clip((a - 0.25) / 0.6, 0, 1)
    # (el borde, sin el gris del fondo: el color se lleva hacia el de dentro)
    rgb = im.copy(); borde = (a > 0) & (a < 1); dentro = np.asarray(Image.fromarray(im.astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32)
    k = a[..., None]; rgb = np.where(borde[..., None], np.clip((im - fondo * (1 - k)) / np.maximum(k, 0.35), 0, 255), rgb)
    return np.dstack([rgb, a * 255]).astype(np.uint8)
def colorado(rgba):
    a = rgba.astype(np.float32) / 255; r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a[..., :3].max(2); mn = a[..., :3].min(2); s = (mx - mn) / np.maximum(mx, 1e-4)
    azul = (b > r * 1.35) & (b > g * 1.08) & (s > 0.35)
    # (el azul de la camiseta, a colorado: el brillo y lo saturado de cada punto, con el tono del colorado de los frontones)
    v = mx; o = a.copy(); cr = np.array(colorsys.hsv_to_rgb(0.995, 0.86, 1.0))
    val = np.clip(v * 0.98, 0, 1)[..., None]; sat = np.clip(s * 1.02, 0, 1)[..., None]
    o[..., :3] = np.where(azul[..., None], val * (1 - sat * (1 - cr / cr.max())), a[..., :3])
    return (o * 255).astype(np.uint8)
def encuadra(rgba, w, h):
    al = rgba[..., 3] > 30; ys, xs = np.where(al); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    im = Image.fromarray(rgba).crop((x0, y0, x1 + 1, y1 + 1)); k = min(w * 0.96 / im.width, h * 0.965 / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS); L = Image.new('RGBA', (w, h), (0, 0, 0, 0)); L.paste(im, ((w - im.width) // 2, h - im.height - round(h * 0.012))); return L
hechas = {}
for asp, f in ARCH.items():
    az = recorta(f'{SRC}/{f}.png'); hechas[asp] = (az, colorado(az)); print(asp, 'recortada')
if len(sys.argv) > 2:      # (una hoja de prueba sobre dos fondos, para mirar los bordes)
    L = Image.new('RGB', (300 * 10, 450 * 2), (30, 25, 60))
    for i, asp in enumerate(ARCH):
        for r, c in ((0, (30, 25, 60)), (1, (235, 230, 215))):
            t = Image.new('RGBA', (300, 450), c + (255,)); t.alpha_composite(encuadra(hechas[asp][r], 300, 450)); L.paste(t.convert('RGB'), (300 * i, 450 * r))
    L.save(sys.argv[2], quality=90); sys.exit()
for nombre, asp in DE.items():
    az, ro = hechas[asp]
    for carpeta, img, (w, h), q in (('web/azul', az, (512, 768), 86), ('web/rojo', ro, (512, 768), 86), ('web/vs/azul', az, (1024, 1536), 88), ('web/vs/rojo', ro, (1024, 1536), 88), ('mini/rojo', ro, (256, 384), 82), ('mini/camiseta', az, (256, 384), 82)):
        encuadra(img, w, h).save(f'{R}/{carpeta}/{nombre}.webp', quality=q, method=6)
print('figuras de', len(DE), 'nombres')
