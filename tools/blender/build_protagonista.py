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
    # cara de muñeco: ojos con blanco, iris castaño, pupila y brillo; cejas siempre visibles; naricilla de botón; sonrisa
    head_style='toy', head_n=2.7, head_axes=(0.27, 0.25, 0.285), head_r=0.29, head_scale=(1.0, 0.93, 1.07), head_c=1.29,
    eye_x=0.09, eye_z=1.3, eye_w=0.047, eye_h=0.058, eye_glint=True, sclera=(1.48, 1.26), iris_off=(0.0, -0.08), iris_uv=0.4,
    nose_size=(0.024, 0.02, 0.019),
    brow_xs=(0.062, 0.09, 0.118), brow_dz=0.066, brow_lift=0.003, brow_r=0.0105, brow_k=0.7, brow_hidden=(),
    nose_z=1.24, mouth_z=1.2, mouth_w=0.09, mouth_h=0.03,
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
    boot=dict(len=0.28, w=0.126, h=0.1, heel_y=0.056, shaft=0.19, lip=0.07),
    colors=dict(skin=(241, 196, 160), hair=(96, 60, 36), brow=(45, 28, 20), lips=(214, 128, 118), blush=(236, 150, 140),
                shirt=(236, 226, 200), vest=(96, 112, 62), trim=(64, 76, 42), button=(214, 172, 74), scarf=(200, 34, 42), sash=(196, 30, 40),
                pocket=(112, 128, 74), flap=(70, 84, 46), cargo=(118, 94, 62), stripe=(196, 30, 40),
                shorts=(136, 110, 76), socks=(226, 218, 198), boots=(126, 80, 44), sole=(44, 36, 32), lace=(236, 222, 190), toecap=(92, 58, 32), collar=(160, 46, 40),
                iris=(98, 60, 30), iris_dark=(56, 32, 16)),
    rough=dict(body=0.72, face=0.5, eyes=0.25),
    # pelo de juguete: una sola pieza con raya a la izquierda, flequillo barrido con un mechón en punta, tupé,
    # mechones moldeados y nuca en picos; sin mechones sueltos
    hair_style='side', tuft_scale=0.55,
    tufts=[],
    # orejas (longitud, latitud, medio alto, medio ancho, grosor, separación de la cabeza)
    ears=(90, -6, 0.032, 0.05, 0.028, 0.004),
    # proporciones (medidas de una referencia de estilo: unas 3,5 cabezas de alto y cadera a media altura)
    proportions=dict(legs=1.35, head=0.78, hip=0.55, neck=1.0),
    # faja roja a la cintura (pintada en el pantalón) con el nudo a la izquierda, y botones dorados en el chaleco
    sash=dict(z=(0.598, 0.75), knot=(0.118, -0.128, 0.628)),
    buttons=(0.668, 0.701, 0.734), button_y=-0.163,
    # ropa de explorador: bolsillos con solapa en el pecho del chaleco, bolsillos de carga en los muslos y raya roja
    # en el calcetín de lana (se pintan en la textura al hornear)
    rects=[dict(cx=0.108, hx=0.03, cz=0.812, hz=0.036, y1=-0.08, color=(112, 128, 74)),
           dict(cx=0.108, hx=0.033, cz=0.85, hz=0.009, y1=-0.08, color=(64, 76, 42)),
           dict(cx=0.108, hx=0.004, cz=0.835, hz=0.006, y1=-0.08, color=(214, 172, 74)),
           dict(cx=0.175, hx=0.03, cz=0.43, hz=0.045, y0=-0.05, y1=0.05, color=(110, 86, 56)),
           dict(cx=0.175, hx=0.032, cz=0.476, hz=0.008, y0=-0.05, y1=0.05, color=(86, 66, 42)),
           dict(cx=0.09, hx=0.07, cz=0.238, hz=0.009, color=(196, 30, 40)),
           # cordones de las botas (en la parte de delante de la caña) y costura del bajo del pantalón
           *[dict(cx=0.085, hx=0.024, cz=z, hz=0.0045, y1=-0.015, color=(236, 222, 190)) for z in (0.122, 0.142, 0.162)],
           dict(cx=0.085, hx=0.006, cz=0.142, hz=0.03, y1=-0.015, color=(150, 100, 60))],
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
