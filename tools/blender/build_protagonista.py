# MENDIMENDIZ · protagonista (joven pastor navarro) construido desde cero con bpy y bmesh.
# Uso:  blender -b -P tools/blender/build_protagonista.py -- [--solo-geo] [--sin-renders]
#       (o, con el módulo bpy de Python:  python3.11 tools/blender/build_protagonista.py …)
# Salida: entrega/personajes/protagonista/ (.blend, texturas, renders, informe) y src/assets/chars/char_protagonista.glb
import os, sys, math, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion
import mbz_core as C
import mbz_human as Hm
import mbz_build as B

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
V = Vector

# ------------------------------------------------------------------ diseño (medidas en metros)
D = dict(
    name='Protagonista', key='protagonista', file='char_protagonista',
    # cabeza de juguete: cilindro redondeado (superelipse de exponente 3,2 de perfil) con la cara pintada encima.
    # La rejilla es la misma esfera 24 × 16 del encargo; centro entre el cuello (1,00) y la coronilla (1,58)
    head_style='toy', head_n=3.2, head_axes=(0.27, 0.245, 0.285), head_r=0.29, head_scale=(1.0, 0.93, 1.07), head_c=1.29,
    eye_x=0.088, eye_z=1.305, eye_w=0.042, eye_h=0.056,
    brow_xs=(0.058, 0.088, 0.118), brow_dz=0.05, brow_lift=0.003, brow_r=0.0085, brow_k=0.7,
    nose_z=1.24, mouth_z=1.192, mouth_w=0.1, mouth_h=0.03,
    blush_ll=(42, -6),
    # tronco (cilindro de 16 lados): (z, semiancho, semifondo, desplazamiento en y)
    torso=[(0.47, 0.150, 0.104, 0.0), (0.52, 0.160, 0.112, 0.0), (0.58, 0.164, 0.115, 0.0), (0.64, 0.158, 0.114, 0.0),
           (0.70, 0.154, 0.116, -0.004), (0.78, 0.162, 0.118, -0.004), (0.85, 0.170, 0.114, 0.0), (0.90, 0.176, 0.108, 0.0),
           (0.95, 0.160, 0.098, 0.0), (0.98, 0.092, 0.074, 0.004)],
    neck=[(1.00, 0.056, 0.054, 0.006), (1.05, 0.054, 0.052, 0.008)],
    leg_x=0.085,
    leg=[(0.44, 0.084), (0.39, 0.080), (0.34, 0.070), (0.315, 0.060), (0.30, 0.058), (0.285, 0.058), (0.22, 0.060), (0.16, 0.052), (0.10, 0.045), (0.06, 0.044)],
    arm_rings=6,
    wrist=(0.56, 0.68), hand_end=(0.64, 0.61),
    palm=(0.1, 0.1, 0.044), fingers=[0.056, 0.062, 0.057, 0.048], finger_r=0.0165,
    boot=dict(len=0.28, w=0.126, h=0.1, heel_y=0.056, shaft=0.19),
    colors=dict(skin=(241, 196, 160), hair=(58, 36, 24), brow=(45, 28, 20), lips=(214, 128, 118), blush=(236, 150, 140),
                shirt=(242, 236, 224), vest=(106, 40, 84), trim=(80, 26, 62), button=(214, 172, 74), scarf=(200, 34, 42),
                shorts=(92, 78, 64), socks=(234, 226, 206), boots=(122, 76, 42), sole=(58, 40, 30), lace=(236, 222, 190),
                iris=(98, 60, 30), iris_dark=(56, 32, 16)),
    rough=dict(body=0.72, face=0.5, eyes=0.25),
    # pelo de juguete: una sola pieza (casco con flequillo), sin mechones sueltos
    tufts=[],
)
# brazo en pose A (huesos de la tabla): hombro (0,24; 0,94) → codo (0,42; 0,80) → muñeca (0,56; 0,68)
def _arm_path():
    S, E, W = V((0.24, 0.94)), V((0.42, 0.80)), V((0.56, 0.68))
    pts = [S.lerp(E, t) for t in (0.1, 0.35, 0.6, 0.86)] + [E - (E - S).normalized() * 0.018, E, E + (W - E).normalized() * 0.018] + [E.lerp(W, t) for t in (0.3, 0.6, 0.85, 1.0)]
    return [(p.x, p.y) for p in pts]
D['arm_path'] = _arm_path()
D['arm_r'] = [0.064, 0.058, 0.054, 0.050, 0.047, 0.046, 0.047, 0.047, 0.044, 0.040, 0.036]

if __name__ == '__main__':
    args = C.script_args()
    B.build_character(D, ROOT, solo_geo='--solo-geo' in args, renders='--sin-renders' not in args)
