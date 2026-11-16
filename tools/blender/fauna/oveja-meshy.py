"""Pone una oveja de Meshy sobre el esqueleto de la oveja del juego (Quaternius, derivada de la alpaca) con sus ocho
animaciones: el esqueleto se deforma para encajar en la malla nueva (pezuñas, lomo, cabeza, cola) con una
interpolación suave entre puntos clave, la malla se pesa a los huesos y se exporta un GLB (luego tools/ovejapack.mjs).
Meshy no monta esqueletos de cuatro patas: por eso se hace aquí. Noviembre de 2026.
Uso: python3.13 tools/blender/fauna/oveja-meshy.py <Sheep-plano.glb> <oveja-meshy.glb> <salida.glb>
(Sheep-plano.glb: src/assets/animals/Sheep.glb sin la compresión meshopt, node tools/glbplano.mjs; el módulo bpy de
Blender 5.2 va con Python 3.13)"""
import bpy, sys, math
import numpy as np
from mathutils import Vector
BASE, MESHY, SALIDA = sys.argv[-3:]

# ---- puntos clave de una malla de oveja (Z arriba, delante -Y, izquierda +X)
def marcas(vs):
    z0 = min(v.z for v in vs); z1 = max(v.z for v in vs); H = z1 - z0
    y0 = min(v.y for v in vs); y1 = max(v.y for v in vs); L = y1 - y0
    bajos = [v for v in vs if v.z < z0 + 0.10 * H]
    # las cuatro patas: k-medias sobre lo de abajo, empezando por las esquinas
    cx = sum(v.x for v in bajos) / len(bajos); cy = sum(v.y for v in bajos) / len(bajos)
    sx = max(abs(v.x - cx) for v in bajos) * 0.6; sy = max(abs(v.y - cy) for v in bajos) * 0.6
    C = {'FL': (cx + sx, cy - sy), 'FR': (cx - sx, cy - sy), 'BL': (cx + sx, cy + sy), 'BR': (cx - sx, cy + sy)}
    for _ in range(25):
        G = {k: [] for k in C}
        for v in bajos: G[min(C, key=lambda k: (v.x - C[k][0]) ** 2 + (v.y - C[k][1]) ** 2)].append(v)
        C = {k: ((sum(p.x for p in P) / len(P), sum(p.y for p in P) / len(P)) if P else C[k]) for k, P in G.items()}
    pat = {k: Vector((C[k][0], C[k][1], min((p.z for p in G[k]), default=z0))) for k in C}
    yF = (pat['FL'].y + pat['FR'].y) / 2; yB = (pat['BL'].y + pat['BR'].y) / 2
    # el lomo entre las patas: lo más alto de la franja central
    lomo = [v for v in vs if yF < v.y < yB and abs(v.x) < 0.25 * H]
    cruz = max((v for v in lomo if v.y < (yF + yB) / 2), key=lambda v: v.z)
    grupa = max((v for v in vs if yB - 0.05 * L < v.y < yB + 0.15 * L and abs(v.x) < 0.25 * H), key=lambda v: v.z)
    vientre = min((v for v in lomo if abs(v.y - (yF + yB) / 2) < 0.1 * L and abs(v.x) < 0.1 * H and v.z > z0 + 0.25 * H), key=lambda v: v.z)
    # la cabeza: lo de delante de las patas, alto
    cab = [v for v in vs if v.y < yF - 0.05 * L and v.z > z0 + 0.55 * H]
    morro = min(cab, key=lambda v: v.y); coron = max(cab, key=lambda v: v.z)
    cola = max(vs, key=lambda v: v.y)
    return dict(z0=z0, H=H, L=L, pat=pat, yF=yF, yB=yB, cruz=cruz.copy(), grupa=grupa.copy(), vientre=vientre.copy(), morro=morro.copy(), coron=coron.copy(), cola=cola.copy())


r3 = lambda v: tuple(round(x, 3) for x in v)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BASE)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
arm.animation_data.action = None
for pb in arm.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)
for o in [o for o in bpy.data.objects if o.type == 'MESH']: bpy.data.objects.remove(o, do_unlink=True)
bpy.context.view_layer.update()
B = {b.name: (arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local) for b in arm.data.bones}

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=MESHY)
nuevos = [o for o in bpy.data.objects if o not in before]
ob = next(o for o in nuevos if o.type == 'MESH')
for o in nuevos:
    if o is not ob and o.type != 'MESH': pass
# la malla, sin padres y con su transformación aplicada
mw = ob.matrix_world.copy(); ob.parent = None; ob.matrix_world = mw
bpy.context.view_layer.objects.active = ob
for o in bpy.context.selected_objects: o.select_set(False)
ob.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
N = marcas([v.co.copy() for v in ob.data.vertices])

# ---- escala y sitio: la zancada (de pezuña delantera a trasera) igual que la del esqueleto, los pies en el suelo
hoofF = (B['FrontLowerLeg.L'][1] + B['FrontLowerLeg.R'][1]) / 2
hoofB = (B['BackLowerLeg.L'][1] + B['BackLowerLeg.R'][1]) / 2
s = (hoofB.y - hoofF.y) / (N['yB'] - N['yF'])
cx = (B['FrontLowerLeg.L'][1].x + B['FrontLowerLeg.R'][1].x) / 2
mx = sum(p.x for p in N['pat'].values()) / 4   # (el centro, por las patas: la lana cuelga más de un lado)
off = Vector((cx - s * mx, (hoofF.y + hoofB.y) / 2 - s * (N['yF'] + N['yB']) / 2, 0.0 - s * N['z0']))
for v in ob.data.vertices: v.co = v.co * s + off
ob.data.update()
N = marcas([v.co.copy() for v in ob.data.vertices])
print('escala', round(s, 3), 'alto', round(N['H'], 3), 'largo', round(N['L'], 3))

# ---- puntos clave: viejo (del esqueleto) -> nuevo (de la malla)
z0 = N['z0']
def cuerpo(y, t=0.6):
    # altura del eje del cuerpo a la altura y: entre el vientre y el lomo de esa franja
    vs = [v.co for v in ob.data.vertices if abs(v.co.y - y) < 0.06 * N['L'] and abs(v.co.x - cx) < 0.18 * N['H']]
    top = max(v.z for v in vs); bot = min(v.z for v in vs if v.z > z0 + 0.22 * N['H'])
    return bot + t * (top - bot)
hoofZ = B['FrontLowerLeg.L'][1].z   # (la punta del hueso de la caña queda por encima del suelo: la pezuña)
P = []
for lado, kL in (('L', 'FL'), ('R', 'FR')):
    p = N['pat'][kL]; P.append((B[f'FrontLowerLeg.{lado}'][1], Vector((p.x, p.y, z0 + hoofZ))))
for lado, kL in (('L', 'BL'), ('R', 'BR')):
    p = N['pat'][kL]; P.append((B[f'BackLowerLeg.{lado}'][1], Vector((p.x, p.y, z0 + B['BackLowerLeg.L'][1].z))))
yF, yB = N['yF'], N['yB']
# el espinazo: tres puntos del torso y la cadera
for nb in ('Torso3', 'Torso2', 'Torso'):
    h = B[nb][0]; t = (h.y - hoofF.y) / (hoofB.y - hoofF.y); y = yF + t * (yB - yF)
    P.append((h, Vector((cx, y, cuerpo(y)))))
h = B['Back'][0]; P.append((h, Vector((cx, yB + 0.02 * N['L'], cuerpo(yB, 0.62)))))
# la cabeza: la base del cráneo y el morro
co, mo = N['coron'], N['morro']
base = Vector((cx, co.y + 0.10 * (co.y - mo.y) * -1, co.z - 0.30 * (co.z - mo.z) - 0.08 * N['H']))
P.append((B['Head'][0], base))
P.append((B['Head'][1], Vector((cx, mo.y + 0.35 * (co.y - mo.y), mo.z + 0.15 * (co.z - mo.z)))))
# el arranque del cuello, entre la cruz y la cabeza
n0 = B['Neck1'][0]; P.append((n0, Vector((cx, yF - 0.06 * N['L'], cuerpo(yF - 0.06 * N['L'], 0.7)))))
# la cola: de la grupa a la punta
gr = N['grupa']; P.append((B['Tail3'][1], Vector((cx, N['cola'].y - 0.02 * N['L'], N['cola'].z + 0.04 * N['H']))))
P.append((B['Tail1'][1], Vector((cx, gr.y + 0.10 * (N['cola'].y - gr.y), gr.z - 0.05 * N['H']))))
for a, b in P: print('  ', r3(a), '->', r3(b))

# ---- interpolación suave (función de base radial lineal más parte afín) de lo viejo a lo nuevo
A = np.array([list(a) for a, b in P]); Bn = np.array([list(b) for a, b in P]); n = len(P)
K = np.linalg.norm(A[:, None, :] - A[None, :, :], axis=2)
Pm = np.hstack([np.ones((n, 1)), A])
M = np.zeros((n + 4, n + 4)); M[:n, :n] = K + 1e-6 * np.eye(n); M[:n, n:] = Pm; M[n:, :n] = Pm.T
rhs = np.zeros((n + 4, 3)); rhs[:n] = Bn
W = np.linalg.solve(M, rhs)
def warp(p):
    p = np.array(list(p)); k = np.linalg.norm(A - p, axis=1)
    return Vector((k @ W[:n] + np.hstack([1, p]) @ W[n:]).tolist())

bpy.context.view_layer.objects.active = arm
for o in bpy.context.selected_objects: o.select_set(False)
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
inv = arm.matrix_world.inverted()
eb = arm.data.edit_bones
nuevo = {}
for e in eb:
    nuevo[e.name] = (warp(arm.matrix_world @ e.head), warp(arm.matrix_world @ e.tail), e.roll)
for e in eb:
    h, t, roll = nuevo[e.name]
    if e.use_connect and e.parent: pass
    e.head = inv @ h; e.tail = inv @ t; e.roll = roll
bpy.ops.object.mode_set(mode='OBJECT')

# ---- pesos: suaves, por distancia a los huesos (el calor de Blender no funciona en estas mallas de piezas sueltas).
# El cuerpo (de la tripa para arriba) solo lo mueven el espinazo, el cuello y la cabeza; las patas, solo lo que está por
# debajo de la tripa y pegado a cada pata (si no, al andar se arrugaba el pecho). La cola no tira de la lana: solo su
# primer hueso, y solo lo que está muy cerca (al galopar se levantaba media oveja como una capa)
ob.parent = None
def dseg(p, a, b):
    ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9))); return (a + ab * t - p).length
def S_(n): return (n, arm.matrix_world @ arm.data.bones[n].head_local, arm.matrix_world @ arm.data.bones[n].tail_local)
ESP = [S_(n) for n in ('Back', 'Torso', 'Torso2', 'Torso3', 'Neck1', 'Neck2', 'Neck3', 'Head', 'Tail1') + tuple(f'Ear{i}.{l}' for i in range(1, 5) for l in 'LR')]
PATAS = {k: [S_(n) for n in ns] for k, ns in {
    'FL': ('FrontShoulder.L', 'FrontUpperLeg.L', 'FrontLowerLeg.L'), 'FR': ('FrontShoulder.R', 'FrontUpperLeg.R', 'FrontLowerLeg.R'),
    'BL': ('BackShoulder.L', 'BackLeg.L', 'BackUpperLeg.L', 'BackLowerLeg.L'), 'BR': ('BackShoulder.R', 'BackLeg.R', 'BackUpperLeg.R', 'BackLowerLeg.R')}.items()}
for o in list(ob.vertex_groups): ob.vertex_groups.remove(o)
VG = {}
def vg(n):
    if n not in VG: VG[n] = ob.vertex_groups.new(name=n)
    return VG[n]
H_ = N['H']; zb = N['vientre'].z
def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
def suaves(lista, p, k, pen=lambda n: 1.0):
    ds = sorted((dseg(p, a, b) * pen(n), n) for n, a, b in lista)[:k]
    w = [1.0 / ((d / H_) ** 4 + 1e-6) for d, _ in ds]; t = sum(w)
    return {n: wi / t for (d, n), wi in zip(ds, w)}
for v in ob.data.vertices:
    p = v.co
    wS = suaves(ESP, p, 3, lambda n: 1.6 if n.startswith('Ear') else (2.5 if n == 'Tail1' else 1.0))
    # la pata más cercana (por sus huesos de abajo, sin el hombro)
    dl, kl = min((min(dseg(p, a, b) for n, a, b in L[1:]), k) for k, L in PATAS.items())
    t = (1 - ss(0.05 * H_, 0.11 * H_, dl)) * ss(zb + 0.07 * H_, zb - 0.03 * H_, p.z)
    W = {n: (1 - t) * w for n, w in wS.items()}
    if t > 0:
        for n, w in suaves(PATAS[kl], p, 2).items(): W[n] = W.get(n, 0) + t * w
    for n, w in W.items():
        if w > 0.02: vg(n).add([v.index], w, 'REPLACE')
mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
ob.parent = arm; ob.matrix_parent_inverse = arm.matrix_world.inverted()
# ---- exportar: el esqueleto, la malla nueva y las ocho acciones
for o in bpy.data.objects:
    if o not in (arm, ob): bpy.data.objects.remove(o, do_unlink=True)
ob.name = 'Oveja'; ob.data.name = 'Oveja'
for o in bpy.context.selected_objects: o.select_set(False)
arm.select_set(True); ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=SALIDA, export_format='GLB', use_selection=True, export_animations=True,
                          export_animation_mode='ACTIONS', export_skins=True, export_yup=True, export_apply=False, export_force_sampling=True)
print('exportado', SALIDA, [a.name for a in bpy.data.actions])
