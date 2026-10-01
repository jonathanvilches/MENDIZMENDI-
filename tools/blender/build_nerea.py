# MENDIMENDIZ · Nerea, la montañera de Isaba (protagonista chica). Mismo cuerpo y esqueleto que Beñat, con coleta
# (mechón largo con su hueso, que se balancea), pecas, ojos verdes y ropa de montañera propia.
# Uso: python3.11 tools/blender/build_nerea.py [--solo-geo] [--sin-renders]
import os, sys, copy
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import mbz_core as C
import mbz_build as B
import build_protagonista as P

D = copy.deepcopy(P.D)
D.update(name='Nerea', key='nerea', file='char_nerea',
    # coleta alta atrás: sale de la coronilla, cae hacia atrás y abajo
    tufts=[(180, 38, (0.0, 0.5, -0.86), 0.34)], tuft_scale=1.3,
    freckles=[(30, -12), (38, -16), (46, -11), (34, -20), (42, -6)])
D['colors'] = dict(D['colors'], hair=(170, 92, 42), brow=(120, 62, 30), iris=(74, 122, 70), iris_dark=(40, 82, 42),
    shirt=(242, 234, 214), vest=(58, 96, 140), trim=(36, 62, 98), scarf=(132, 84, 204), sash=(120, 72, 190),
    shorts=(62, 76, 106), socks=(232, 226, 210), collar=(120, 72, 190))
D['rects'] = [dict(cx=0.108, hx=0.03, cz=0.812, hz=0.036, y1=-0.08, color=(76, 116, 162)),
              dict(cx=0.108, hx=0.033, cz=0.85, hz=0.009, y1=-0.08, color=(36, 62, 98)),
              dict(cx=0.108, hx=0.004, cz=0.835, hz=0.006, y1=-0.08, color=(214, 172, 74)),
              dict(cx=0.175, hx=0.03, cz=0.43, hz=0.045, y0=-0.05, y1=0.05, color=(52, 64, 92)),
              dict(cx=0.175, hx=0.032, cz=0.476, hz=0.008, y0=-0.05, y1=0.05, color=(40, 50, 74)),
              dict(cx=0.09, hx=0.07, cz=0.238, hz=0.009, color=(120, 72, 190)),
              *[dict(cx=0.085, hx=0.024, cz=z, hz=0.0045, y1=-0.015, color=(236, 222, 190)) for z in (0.122, 0.142, 0.162)],
              dict(cx=0.085, hx=0.006, cz=0.142, hz=0.03, y1=-0.015, color=(150, 100, 60))]

if __name__ == '__main__':
    args = C.script_args()
    B.build_character(D, P.ROOT, solo_geo='--solo-geo' in args, renders='--sin-renders' not in args)
