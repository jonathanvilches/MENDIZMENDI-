# Dónde nace el pelo en el cráneo liso (cabeza.py): para cada dirección alrededor de la cabeza (a, desde delante, hacia
# la izquierda del personaje), la altura más baja con pelo, buscando desde el centro de la cabeza hacia fuera.
# Uso: python3 nacimiento.py -- <calva.blend>   (escribe <calva>-nacimiento.json)
import os, sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]; src = argv[0]
bpy.ops.wm.open_mainfile(filepath=src)
me = next(o for o in bpy.data.objects if o.type == 'MESH'); K = Medidas(desde=src.replace('.blend', '-medidas.json')); M = me.matrix_world
pelo = np.load(src.replace('.blend', '-pelo.npy')); key = np.load(src.replace('.blend', '-key.npy'))
mesh = me.data; P = [M @ v.co for v in mesh.vertices]
bvh = BVHTree.FromPolygons([tuple(p) for p in P], [tuple(f.vertices) for f in mesh.polygons])
C = K.mundo(Vector((0, 0.8, -0.022)))
res = []
for ai in range(72):
    a = ai / 72 * 2 * math.pi   # (0 delante, π/2 a su izquierda: x > 0)
    fila = None
    for ei in range(0, 90):
        e = math.radians(-60 + ei * 1.5)
        d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
        loc, nor, fi, dist = bvh.ray_cast(C + d * 0.6 * K.H, -d)   # (desde fuera hacia el centro: la superficie de fuera)
        if loc is None: continue
        f = mesh.polygons[fi]; hp = np.mean([pelo[key[v]] for v in f.vertices])
        if hp > 0.5: fila = (round(math.degrees(e), 1), [round(v, 4) for v in K.frac(loc)]); break
    res.append({'a': round(math.degrees(a), 1), 'nace': fila})
json.dump(res, open(src.replace('.blend', '-nacimiento.json'), 'w'))
for r in res[::4]: print(r)
salir()
