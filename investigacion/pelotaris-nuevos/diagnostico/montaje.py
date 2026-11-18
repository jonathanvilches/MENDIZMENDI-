# Montaje del vídeo de los golpes: real | pelotari de espaldas | pelotari de lado, a velocidad real y a cámara lenta
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
import os
M = os.environ.get('TRABAJO', '/tmp/pelotaris-nuevos') + '/render'; R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'movimientos-reales')
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', s)
FB = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
PW, PH, TOP = 480, 600, 64; W, H = PW * 4, PH + TOP
# (golpe, render, referencia json, carpeta de fotogramas, espejo, estirado, título, rótulo de la referencia)
GOLPES = [
  ('der', 'tabar-derecha-3', f'{SP}/tabar3/f', False, 1.0, 'Derecha', 'Real: Tabar'),
  ('izq', 'tabar-izquierda-2', f'{SP}/tabar3/f', False, 1.0, 'Izquierda', 'Real: Tabar'),
  ('gancho-izq', 'tabar-izquierda', f'{SP}/normal/poseH/f', False, 1.0, 'Gancho de izquierda', 'Real: Tabar'),
  ('dejada', 'tabar-derecha-3', f'{SP}/tabar3/f', False, 1.25, 'Dejada', 'Referencia: derecha de Tabar'),
  ('volea-der', 'jaka-golpe-por-arriba', f'{SP}/poseGolpe/f', False, 1.0, 'Volea de derecha', 'Real: Erik Jaka'),
  ('volea-izq', 'jaka-izquierda-por-arriba', f'{SP}/jaka-25c55e8b/f', False, 1.0, 'Volea de izquierda', 'Real: Erik Jaka'),
  ('der-chica', 'tabar-derecha-3', f'{SP}/tabar3/f', False, 1.0, 'Derecha · pelotari del moño (nueva)', 'Real: Tabar'),
  ('izq-chica', 'tabar-izquierda-2', f'{SP}/tabar3/f', False, 1.0, 'Izquierda · pelotari del moño (nueva)', 'Real: Tabar'),
  ('der-melena', 'tabar-derecha-3', f'{SP}/tabar3/f', False, 1.0, 'Derecha · pelotari de la coleta (nueva)', 'Real: Tabar'),
  ('izq-melena', 'tabar-izquierda-2', f'{SP}/tabar3/f', False, 1.0, 'Izquierda · pelotari de la coleta (nueva)', 'Real: Tabar'),
]
solo = sys.argv[1].split(',') if len(sys.argv) > 1 else None
out = f'{M}/video'; os.makedirs(out, exist_ok=True); k = 0
def caja_real(P, i):
    g = P['fotos'][i]['gente']
    if not g: return None
    pts = [(q[0], q[1]) for q in g[0]['img'] if (len(q) < 3 or q[2] > 0.3) and 0 < q[0] < 1 and 0 < q[1] < 1]
    if len(pts) < 5: return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]; return min(xs), min(ys), max(xs), max(ys)
lista = [g for g in GOLPES if not solo or g[0] in solo]
for n, (rid, ref, fdir, esp, est, tit, rot) in enumerate(lista, 1):
    rp = f'{M}/rp-{rid}'
    if not os.path.exists(f'{rp}/golpe.txt'): print('falta', rid); continue
    gi = int(open(f'{rp}/golpe.txt').read()); nr = len([f for f in os.listdir(rp) if f.startswith('a_')])
    P = json.load(open(f'{R}/{ref}.json')); AW, AH = P.get('ancho', 1170), P.get('alto', 2532)
    cajas = [caja_real(P, i) for i in range(len(P['fotos']))]
    for i in range(len(cajas)):
        if cajas[i] is None: cajas[i] = next((c for c in cajas[i::-1] if c), None) or next(c for c in cajas if c)
    a, b = max(1, gi - 22), min(nr, gi + 16)
    def cuadro(fr, lento):
        im = Image.new('RGB', (W, H), (14, 22, 21)); d = ImageDraw.Draw(im)
        # el real (el fotograma que toca; en la dejada, estirada, el más cercano)
        ri = min(len(P['fotos']) - 1, int(round((fr - 1) / est)))
        vs = cajas[max(0, ri - 3): ri + 4]; x0, y0, x1, y1 = [sum(v[j] for v in vs) / len(vs) for j in range(4)]
        cx, cy = (x0 + x1) / 2 * AW, (y0 + y1) / 2 * AH; hh = (y1 - y0) * AH * 1.25; ww = hh * PW / PH
        src = Image.open(f'{fdir}/{P["fotos"][ri]["f"]}').convert('RGB')
        big = Image.new('RGB', (AW + 2000, AH + 2000), (14, 22, 21)); big.paste(src, (1000, 1000))
        cr = big.crop((int(cx - ww / 2 + 1000), int(cy - hh / 2 + 1000), int(cx + ww / 2 + 1000), int(cy + hh / 2 + 1000))).resize((PW, PH), Image.LANCZOS)
        if esp: cr = cr.transpose(Image.FLIP_LEFT_RIGHT)
        im.paste(cr, (0, TOP))
        for j, cam in enumerate('abh'): im.paste(Image.open(f'{rp}/{cam}_{fr:04d}.png').convert('RGB'), (PW * (j + 1), TOP))
        d.text((20, 14), f'{n}/{len(lista)}  {tit}', font=FB(30), fill=(245, 240, 225))
        d.text((W - 20, 20), 'cámara lenta' if lento else 'velocidad real', font=F(22), fill=(150, 220, 190) if lento else (200, 200, 200), anchor='ra')
        for j, t in enumerate([rot, 'Pelotari del juego', 'Pelotari del juego · de lado', 'Hombro y torso, de cerca']):
            d.rectangle((PW * j, TOP + PH - 34, PW * j + PW, TOP + PH), fill=(0, 0, 0)); d.text((PW * j + 12, TOP + PH - 29), t, font=F(19), fill=(235, 235, 235))
        if fr == gi: d.rectangle((PW, TOP, W - 1, TOP + PH - 1), outline=(255, 210, 90), width=4)
        return im
    for lento in (False, True):
        for fr in range(a, b + 1):
            im = cuadro(fr, lento)
            for _ in range(2 if lento else 1): k += 1; im.save(f'{out}/{k:05d}.jpg', quality=90)
    # (medio segundo quieto entre golpe y golpe)
    for _ in range(12): k += 1; im.save(f'{out}/{k:05d}.jpg', quality=90)
    print(rid, 'golpe', gi, 'tramo', a, b)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', f'{out}/%05d.jpg', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-movflags', '+faststart', f'{M}/golpes-cuerpo-firme.mp4'], check=True)
print('vídeo', k, 'fotogramas')
