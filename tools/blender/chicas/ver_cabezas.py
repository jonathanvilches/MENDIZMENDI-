# Primer plano de la cabeza de cada modelo base, de frente y de lado (para elegir y medir).
# Uso: python3 ver_cabezas.py -- <carpeta> <nombre>…   (lee <carpeta>/<nombre>-hd.glb)
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *
argv = sys.argv[sys.argv.index('--') + 1:]; d = argv[0]
for n in argv[1:]:
    arm, me = abrir(f'{d}/{n}-hd.glb'); K = Medidas(me)
    print(n, 'H', round(K.H, 4), 'z0', round(K.z0, 4), 'cx', round(K.cx, 4), 'cy', round(K.cy, 4))
    montar(muestras=24); c = K.mundo(Vector((0, 0.8, 0)))
    for tag, yaw in (('frente', 0), ('lado', 90), ('atras', 180)): foto(f'{d}/cabeza-{n}-{tag}.png', yaw, c.z + 0.02, c, K.H * 0.75, 70, 420, 420)
salir()
