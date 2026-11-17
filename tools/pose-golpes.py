# Busca los golpes en el esqueleto sacado de un vídeo de pelota (tools/pose-video.mjs): el momento en que una mano va más
# rápida respecto a la cadera es el golpe. Dice cuándo, con qué mano y a qué altura (por encima de la cabeza: gancho o
# volea alta; a la altura del hombro; a media altura; por debajo de la cadera: sotamano), y el tramo de fotogramas que
# hay que pasar al esqueleto (tools/blender/pose-a-esqueleto.py ... desde hasta) para tener el golpe entero.
# Uso: python3 tools/pose-golpes.py <carpeta>/pose.json [quien] [velocidad_min_m_s]
import json, math, sys
P = json.load(open(sys.argv[1])); QUIEN = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else None
VMIN = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0
fps = P['fps']; fotos = P['fotos']
def persona(F):
    g = [p for p in F['gente'] if not QUIEN or p.get('quien') == QUIEN]
    return max(g, key=lambda p: sum(q[2] for q in p['img'])) if g else None
pers = [persona(F) for F in fotos]
def suav(xs, s=1.0):
    out = []
    for i in range(len(xs)):
        acc = ws = 0
        for d in range(-3, 4):
            j = i + d
            if 0 <= j < len(xs) and xs[j] is not None:
                k = math.exp(-0.5 * (d / s) ** 2); acc += xs[j] * k; ws += k
        out.append(acc / ws if ws else None)
    return out
vel = {}
for lado, m in (('derecha', 16), ('izquierda', 15)):
    v = [None] * len(pers)
    for i in range(1, len(pers)):
        a, b = pers[i - 1], pers[i]
        if a and b and a['mundo'] and b['mundo']:
            v[i] = math.dist(a['mundo'][m], b['mundo'][m]) * fps
    vel[lado] = suav(v)
golpes = []
R = max(2, round(fps * 0.35))
for lado, m in (('derecha', 16), ('izquierda', 15)):
    v = vel[lado]
    for i, x in enumerate(v):
        if x is None or x < VMIN or i < 2 or i > len(v) - 3 or not pers[i] or not pers[i]['mundo']: continue
        ventana = [y for y in v[max(0, i - R): i + R + 1] if y is not None]
        if x < max(ventana): continue
        otro = vel['izquierda' if lado == 'derecha' else 'derecha'][i] or 0
        if otro > x: continue  # (manda la mano que va más rápida)
        w = pers[i]['mundo']; y = w[m][1]  # (y hacia abajo)
        cabeza, hombro, cadera = w[0][1], (w[11][1] + w[12][1]) / 2, (w[23][1] + w[24][1]) / 2
        alt = 'por encima de la cabeza (gancho / volea alta)' if y < cabeza else 'a la altura del hombro' if y < hombro + 0.08 else 'a media altura' if y < cadera else 'por debajo de la cadera (sotamano)'
        golpes.append((i, lado, round(x, 1), alt))
golpes.sort()
# (un golpe por tramo: si dos picos caen juntos, el más rápido)
limpio = []
for g in golpes:
    if limpio and g[0] - limpio[-1][0] <= R:
        if g[2] > limpio[-1][2]: limpio[-1] = g
    else: limpio.append(g)
golpes = limpio
print(f'{len(golpes)} golpes ({QUIEN or "todos"}), {fps} fps, desde {P["desde"]} s')
for i, lado, x, alt in golpes:
    t = P['desde'] + i / fps
    print(f'  fotograma {i + 1:4d} ({t:5.2f} s): mano {lado:9s} {x:4.1f} m/s, {alt}; tramo {max(0, i - round(fps * 1.0))} {min(len(fotos), i + round(fps * 0.7))}')
