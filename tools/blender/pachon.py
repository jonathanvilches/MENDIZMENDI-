# Uso: python3 tools/blender/pachon.py -- salida.glb   (con bpy 4.2; MESH apunta al GLB de Meshy del pachón, sin esqueleto)
# Después: comprimir con gltf-transform (textura WebP 2048 y meshopt) y guardarlo como src/assets/animals/Pachon.glb
# Esqueleto y animaciones para el pachón navarro (malla estática de Meshy) a partir del perro de Quaternius (ShibaInu):
# se ajustan los huesos a las patas, la columna, el cuello, la cabeza y la cola del pachón, se pesa la malla con los
# pesos automáticos de Blender y se exporta con las animaciones del perro (andar, galope, sentarse, comer, reposo).
import bpy, mathutils, numpy as np, sys
SRC = '/home/user/mendimendiz/src/assets/animals/ShibaInu.glb'
MESH = '/tmp/claude-0/sf/pachon_orig.glb'
OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/claude-0/pachon/pachon_rig.glb'
RATIO = 0.42   # malla más ligera (unos 13.000 triángulos)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']: bpy.data.objects.remove(o)   # el cuerpo del shiba fuera
bpy.ops.import_scene.gltf(filepath=MESH)
dog = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for o in bpy.context.scene.objects:
    if o.type == 'EMPTY': bpy.data.objects.remove(o)

# ---- referencias del shiba (de sus huesos) ----
B = {b.name: b for b in arm.data.bones}
hd = lambda n: arm.matrix_world @ B[n].head_local
tl = lambda n: arm.matrix_world @ B[n].tail_local
S = dict(
    ground=0.0, shoulderZ=hd('FrontUpperLeg.L').z, hipZ=hd('BackLeg.L').z, backZ=hd('Back').z,
    frontY=hd('FrontUpperLeg.L').y, backY=hd('BackLeg.L').y, frontX=hd('FrontUpperLeg.L').x, backX=hd('BackLeg.L').x,
    neckY=hd('Neck1').y, neckZ=hd('Neck1').z, headY=hd('Head').y, headZ=hd('Head').z, snoutY=tl('Head').y,
    tailY=hd('Tail1').y, tailZ=hd('Tail1').z,
)

# ---- enderezar el pachón: viene girado sobre el suelo; su eje largo (análisis de componentes de las patas y el cuerpo)
# pasa a ser el eje Y, con la cabeza hacia −Y como el shiba (la cabeza es el extremo con más malla en lo alto) ----
V0 = np.array([dog.matrix_world @ v.co for v in dog.data.vertices])
Hh = V0[:, 2].max() - V0[:, 2].min()
body = V0[V0[:, 2] < V0[:, 2].min() + 0.55 * Hh][:, :2]
c0 = body.mean(0); cov = np.cov((body - c0).T); w, vec = np.linalg.eigh(cov); ax = vec[:, np.argmax(w)]
ang = np.arctan2(ax[0], ax[1])   # ángulo del eje largo respecto a +Y
R = mathutils.Matrix.Rotation(ang, 4, 'Z')
dog.data.transform(R @ mathutils.Matrix.Translation((-c0[0], -c0[1], 0)))
V0 = np.array([v.co[:] for v in dog.data.vertices])
hi = V0[V0[:, 2] > V0[:, 2].min() + 0.6 * Hh]
if (hi[:, 1] > 0).sum() > (hi[:, 1] < 0).sum(): dog.data.transform(mathutils.Matrix.Rotation(np.pi, 4, 'Z'))
print('girado %.1f grados' % np.degrees(ang))
# coser las costuras de la textura (vértices repetidos): sin esto los pesos automáticos fallan
import bmesh
bm = bmesh.new(); bm.from_mesh(dog.data); n0 = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bm.to_mesh(dog.data); bm.free()
print('vértices', n0, '→', len(dog.data.vertices))
# ---- referencias del pachón (de su malla), en las mismas unidades: se escala para que la distancia entre patas
# delanteras y traseras sea la del shiba ----
V = np.array([dog.matrix_world @ v.co for v in dog.data.vertices])
zmin = V[:, 2].min()
low = V[V[:, 2] < zmin + 0.1 * (V[:, 2].max() - zmin)]
# patas: k-medias con cuatro grupos sobre (x, y)
P = low[:, :2]; C = np.array([[P[:, 0].max(), P[:, 1].min()], [P[:, 0].min(), P[:, 1].min()], [P[:, 0].max(), P[:, 1].max()], [P[:, 0].min(), P[:, 1].max()]])
for _ in range(25):
    lab = np.argmin(((P[:, None, :] - C[None]) ** 2).sum(-1), 1)
    C = np.array([P[lab == k].mean(0) if (lab == k).any() else C[k] for k in range(4)])
front = C[np.argsort(C[:, 1])[:2]]; back = C[np.argsort(C[:, 1])[2:]]
pFrontY, pBackY = front[:, 1].mean(), back[:, 1].mean()
k = abs(S['backY'] - S['frontY']) / abs(pBackY - pFrontY)
cy = (pFrontY + pBackY) / 2
# la malla al tamaño del shiba, con los pies en el suelo y el centro entre las patas donde el del shiba
sy = (S['backY'] + S['frontY']) / 2
M = mathutils.Matrix.Translation((0, sy, 0)) @ mathutils.Matrix.Scale(k, 4) @ mathutils.Matrix.Translation((0, -cy, -zmin))
dog.data.transform(M); dog.matrix_world = mathutils.Matrix.Identity(4)
V = np.array([v.co[:] for v in dog.data.vertices])
low = V[V[:, 2] < 0.1 * V[:, 2].max()]
P = low[:, :2]; C = (C - [0, cy]) * k + [0, sy]
for _ in range(10):
    lab = np.argmin(((P[:, None, :] - C[None]) ** 2).sum(-1), 1)
    C = np.array([P[lab == q].mean(0) if (lab == q).any() else C[q] for q in range(4)])
order = np.argsort(C[:, 1]); front = C[order[:2]]; back = C[order[2:]]
pFrontX = np.abs(front[:, 0]).mean(); pBackX = np.abs(back[:, 0]).mean(); pFrontY = front[:, 1].mean(); pBackY = back[:, 1].mean()
mid = V[(np.abs(V[:, 0]) < 0.25 * k) & (V[:, 1] > pFrontY) & (V[:, 1] < pBackY)]
belly, back_top = mid[:, 2].min(), mid[:, 2].max()
ymin, ymax, ztop = V[:, 1].min(), V[:, 1].max(), V[:, 2].max()
headPts = V[(V[:, 1] < pFrontY - 0.05 * k) & (V[:, 2] > belly + 0.2 * (back_top - belly))]
headC = headPts.mean(0)
tailPts = V[(V[:, 1] > pBackY + 0.1 * k) & (V[:, 2] > belly)]
tailBase = tailPts[tailPts[:, 1] < np.percentile(tailPts[:, 1], 15)].mean(0); tailTip = tailPts[np.argmax(tailPts[:, 2] + tailPts[:, 1] * 0.3)]
print('pachón: k %.3f patas F %s B %s vientre %.2f lomo %.2f cabeza %s cola %s→%s' % (k, front.round(2).tolist(), back.round(2).tolist(), belly, back_top, headC.round(2).tolist(), tailBase.round(2).tolist(), tailTip.round(2).tolist()))

# ---- reparto de los huesos ----
spineZ = belly + 0.62 * (back_top - belly)       # la columna, algo por encima de la mitad del cuerpo
shoulderZ = belly + 0.45 * (back_top - belly)    # hombro y cadera dentro del cuerpo
hipZ = belly + 0.55 * (back_top - belly)
def legMap(p, side, front_leg):
    """articulación de una pata del shiba → la del pachón: misma forma, en la altura y la columna de su pata"""
    sx, sy0, sz = (S['frontX'], S['frontY'], S['shoulderZ']) if front_leg else (S['backX'], S['backY'], S['hipZ'])
    tx = pFrontX if front_leg else pBackX
    ty = pFrontY if front_leg else pBackY
    tz = shoulderZ if front_leg else hipZ
    f = tz / sz
    return mathutils.Vector((side * tx * abs(p.x) / sx if abs(p.x) > 1e-4 else 0, ty + (p.y - sy0) * f, p.z * f))
def spineMap(p):
    # de la cadera (y del shiba backY) a la base del cuello (neckY): al tramo del pachón entre sus patas traseras y delanteras
    t = (p.y - S['backY']) / (S['neckY'] - S['backY'])
    y = pBackY + t * (pFrontY - pBackY - 0.15 * k)
    z = spineZ + (p.z - S['backZ']) * 0.5
    return mathutils.Vector((0, y, z))
def headMap(p):
    # cuello y cabeza: del cuello del shiba a la cabeza del pachón
    t = (p.y - S['neckY']) / (S['snoutY'] - S['neckY'])
    y0, z0 = pFrontY - 0.15 * k, spineZ + 0.1 * (back_top - belly)
    y = y0 + t * (ymin + 0.08 * k - y0)
    zt = headC[2]
    z = z0 + min(1, t * 1.6) * (zt - z0)
    return mathutils.Vector((p.x * 0.5, y, z))
def tailMap(p):
    t = (p.y - S['tailY']) / max(1e-3, (hd('Tail3').y + (tl('Tail3').y - hd('Tail3').y)) - S['tailY'])
    t = max(0, min(1, t))
    return mathutils.Vector(tailBase) * (1 - t) + mathutils.Vector(tailTip) * t * 0.92 + mathutils.Vector(tailBase) * 0 + mathutils.Vector((0, 0, 0))

FRONT = {'FrontShoulder', 'FrontUpperLeg', 'FrontLowerLeg', 'IKFrontLeg', 'FF', 'PoleTarget'}
BACKL = {'BackShoulder', 'BackLeg', 'BackUpperLeg', 'BackLowerLeg', 'IKBackLeg', 'FFB', 'PoleTargetBack'}
def mapPoint(name, p):
    base = name.split('.')[0]
    side = 1 if name.endswith('.L') else -1
    if base in FRONT: return legMap(p, side, True)
    if base in BACKL: return legMap(p, side, False)
    if base.startswith('Tail'): return tailMap(p)
    if base.startswith('Neck') or base == 'Head' or base.startswith('Ear'): return headMap(p)
    if base == 'Body': return mathutils.Vector((0, (pFrontY + pBackY) / 2, p.z * (back_top / S['backZ'])))
    return spineMap(p)

bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
E = arm.data.edit_bones
orig = {e.name: (e.head.copy(), e.tail.copy()) for e in E}
for e in E:
    h, t = orig[e.name]
    e.use_connect = False
    e.head = mapPoint(e.name, h); e.tail = mapPoint(e.name, t)
    if (e.tail - e.head).length < 1e-3: e.tail = e.head + mathutils.Vector((0, 0, 0.05 * k))
# las orejas del pachón cuelgan: sin huesos de oreja (se mueven con la cabeza)
for e in [e for e in E if e.name.startswith('Ear')]: E.remove(e)
bpy.ops.object.mode_set(mode='OBJECT')
for n in [f.data_path for a in bpy.data.actions for f in a.fcurves if 'Ear' in f.data_path][:0]: pass

# ---- malla más ligera y pesada con los huesos ----
bpy.context.view_layer.objects.active = dog
mod = dog.modifiers.new('dec', 'DECIMATE'); mod.ratio = RATIO; mod.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.object.select_all(action='DESELECT'); dog.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
# solo los huesos que deforman (los de IK y los polos no)
for b in arm.data.bones: b.use_deform = not (b.name.startswith('IK') or b.name.startswith('Pole') or b.name.startswith('FF') or b.name in ('Body',))
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
vg = {g.name: g for g in dog.vertex_groups}
empty = [g.name for g in dog.vertex_groups if not any(g.index in [x.group for x in v.groups] for v in dog.data.vertices[:2000])]
print('grupos', len(vg), 'triángulos', sum(len(p.vertices) - 2 for p in dog.data.polygons))
unw = [v for v in dog.data.vertices if not v.groups]
print('vértices sin peso tras los automáticos', len(unw), 'de', len(dog.data.vertices))
if unw:
    # cercanía a cada hueso que deforma (segmento cabeza-cola): los dos más cercanos, con peso 1/d^4
    segs = [(b.name, np.array((arm.matrix_world @ b.head_local)[:]), np.array((arm.matrix_world @ b.tail_local)[:])) for b in arm.data.bones if b.use_deform]
    for g in segs:
        if g[0] not in dog.vertex_groups: dog.vertex_groups.new(name=g[0])
    VG = {g.name: g for g in dog.vertex_groups}
    for v in unw:
        p = np.array(v.co[:]); ds = []
        for name, a0, a1 in segs:
            d = a1 - a0; t = np.clip(np.dot(p - a0, d) / max(1e-9, np.dot(d, d)), 0, 1); ds.append((np.linalg.norm(p - (a0 + d * t)), name))
        ds.sort(); top = ds[:2]; ws = [1 / max(1e-4, x[0]) ** 4 for x in top]; tot = sum(ws)
        for (dd, name), wv in zip(top, ws): VG[name].add([v.index], wv / tot, 'REPLACE')
    print('pesos por cercanía en', len(unw), 'vértices')
# acciones: quitar las curvas de huesos borrados (orejas)
for a in bpy.data.actions:
    for f in list(a.fcurves):
        if 'Ear' in f.data_path: a.fcurves.remove(f)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, export_animations=True, export_animation_mode='ACTIONS',
                          export_yup=True, export_texcoords=True, export_normals=True, export_materials='EXPORT', export_image_format='JPEG', export_jpeg_quality=88)
print('exportado', OUT)
