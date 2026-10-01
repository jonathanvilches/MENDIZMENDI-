# MENDIMENDIZ · Haritz, niño del Neolítico de Aralar (época de los dólmenes, hace unos 5.000 años).
# Diseño propio: túnica de lana sin teñir con franja en zigzag de ocre rojo, chaleco de piel de oveja, cinturón
# tejido, polainas de cuero atadas con cordones y abarcas de cuero crudo. Mismo cuerpo y esqueleto que Beñat.
# Uso: python3.11 tools/blender/build_haritz.py [--solo-geo] [--sin-renders]
import os, sys, copy
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import mbz_core as C
import mbz_build as B
import build_protagonista as P

D = copy.deepcopy(P.D)
D.update(name='Haritz', key='haritz', file='char_haritz', buttons=(), tufts=[],
    freckles=[(28, -10), (40, -14)])
D['colors'] = dict(D['colors'],
    skin=(226, 176, 136), hair=(46, 30, 22), brow=(30, 20, 14), iris=(70, 46, 26), iris_dark=(40, 26, 14),
    shirt=(214, 196, 158),                       # túnica de lana sin teñir
    vest=(236, 226, 204), trim=(150, 120, 86),   # piel de oveja con el borde de cuero
    scarf=(168, 74, 44), sash=(120, 70, 40),     # pañuelo tejido teñido con ocre y cinturón de cuero
    shorts=(132, 96, 62),                        # calzón de cuero
    socks=(156, 116, 76), stripe=(70, 46, 30),   # polainas de cuero
    boots=(176, 136, 92), toecap=(150, 112, 74), collar=(120, 86, 56), sole=(96, 70, 48), lace=(70, 46, 30))
ZZ = [dict(cx=0.012 + i * 0.024, hx=0.008, cz=0.682 + (0.006 if i % 2 else -0.006), hz=0.006, y1=-0.05, color=(168, 74, 44)) for i in range(5)]
D['rects'] = ZZ + [
    # cordones cruzando las polainas
    *[dict(cx=0.09, hx=0.075, cz=z, hz=0.004, color=(70, 46, 30)) for z in (0.17, 0.2, 0.23, 0.26, 0.29)],
    # tira de las abarcas sobre el empeine
    *[dict(cx=0.085, hx=0.03, cz=z, hz=0.004, y1=-0.015, color=(70, 46, 30)) for z in (0.06, 0.09)],
    # bolsa de cuero en la cadera con su cuchillo de sílex
    dict(cx=0.16, hx=0.028, cz=0.55, hz=0.04, y0=-0.12, y1=0.0, color=(96, 64, 38)),
    dict(cx=0.16, hx=0.006, cz=0.6, hz=0.012, y0=-0.12, y1=0.0, color=(120, 120, 128)),
]

# rizos de lana en el chaleco de piel de oveja: puntos algo más oscuros repartidos por delante y por detrás
import math, random
_r = random.Random(7); _pts = []
for _ in range(110):
    a = _r.uniform(0, 2 * math.pi); z = _r.uniform(0.69, 0.875)
    if abs(math.sin(a)) < 0.5 and math.cos(a) < 0 and z > 0.74: continue      # el escote, abierto
    _pts.append((0.2 * math.sin(a), -0.145 * math.cos(a), z))
D['dots'] = {'pts': _pts, 'r': 0.02, 'color': (186, 164, 126)}
D['colors']['vest'] = (218, 202, 168)

if __name__ == '__main__':
    args = C.script_args()
    B.build_character(D, P.ROOT, solo_geo='--solo-geo' in args, renders='--sin-renders' not in args)
