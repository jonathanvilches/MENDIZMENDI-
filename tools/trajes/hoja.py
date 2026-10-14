# Junta las capturas de tools/trajes/ver.mjs en una hoja: una columna por personaje, arriba de frente y abajo de espaldas.
# Uso: python3 -I tools/trajes/hoja.py <carpeta> <salida.png> [nombres separados por comas]
import sys, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
names = sys.argv[3].split(',') if len(sys.argv) > 3 else sorted({f.rsplit('-', 1)[0] for f in os.listdir(d) if f.endswith('-frente.png')})
W, H = 260, 320
s = Image.new('RGB', (W * len(names), H * 2 + 24), (30, 18, 52)); g = ImageDraw.Draw(s)
for i, n in enumerate(names):
    for j, v in enumerate(['frente', 'espalda']):
        f = os.path.join(d, f'{n}-{v}.png')
        if os.path.exists(f): s.paste(Image.open(f).convert('RGB').resize((W, H)), (i * W, 24 + j * H))
    g.text((i * W + 8, 6), n, fill=(255, 210, 235))
s.save(out)
