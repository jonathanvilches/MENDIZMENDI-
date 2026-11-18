# La manga de la camiseta entera, también por debajo. Meshy pintó la textura con los brazos abajo: la parte de la manga
# que da al costado no se veía y la dejó del color de la piel. Al levantar el brazo asomaba esa piel donde debería
# haber camiseta y parecía un agujero en la manga (el autor, 17 de noviembre de 2026: «no hueco»).
# Para cada brazo: el dobladillo de la manga es donde, por fuera del brazo, la camiseta da paso a la piel (medido a lo
# largo del hueso del brazo, desde el hombro); todo lo que está por encima del dobladillo es manga y se pinta del color
# de la camiseta (el de la propia manga por fuera) donde la textura tenía piel.
# Uso: python tools/blender/manga-textura.py -- entrada.glb salida.glb [muestra.png]
import bpy, sys, os
import numpy as np
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
ENT, SAL = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
me = next(o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers))
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
mat = me.data.materials[0]
img = next(n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
W, H = img.size; px = np.zeros(W * H * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(H, W, 4)
uv = me.data.uv_layers.active.data
nv = len(me.data.vertices)
# (el color de cada vértice en la textura, por la media de sus esquinas)
vuv = np.zeros((nv, 2)); cnt = np.zeros(nv)
for poly in me.data.polygons:
    for li, vi in zip(poly.loop_indices, poly.vertices): vuv[vi] += uv[li].uv; cnt[vi] += 1
vuv /= np.maximum(cnt, 1)[:, None]
col = px[np.clip((vuv[:, 1] * H).astype(int), 0, H - 1), np.clip((vuv[:, 0] * W).astype(int), 0, W - 1), :3]
Mw = me.matrix_world; P = np.array([list(Mw @ v.co) for v in me.data.vertices])
nombres = [g.name for g in me.vertex_groups]
def peso(v, n): return sum(g.weight for g in v.groups if nombres[g.group] == n)
# referencias: la camiseta en el pecho (por delante, a la altura del esternón) y la piel en el antebrazo
SP2 = arm.matrix_world @ arm.data.bones[pre + 'Spine2'].head_local
pecho = [v.index for v in me.data.vertices if abs(P[v.index][0]) < 0.10 and abs(P[v.index][2] - SP2.z) < 0.08 and peso(v, pre + 'Spine2') > 0.9]
piel = [v.index for v in me.data.vertices if peso(v, pre + 'LeftForeArm') + peso(v, pre + 'RightForeArm') > 0.7]
camiseta = np.median(col[pecho], axis=0); carne = np.median(col[piel], axis=0)
es_cam = lambda c: np.linalg.norm(c - camiseta, axis=-1) < np.linalg.norm(c - carne, axis=-1)
print('camiseta', np.round(camiseta, 3), 'piel', np.round(carne, 3), len(pecho), len(piel))
pintar = {}; inf = []; BRAZOS = []
for s in ('Left', 'Right'):
    A = np.array(arm.matrix_world @ arm.data.bones[pre + s + 'Arm'].head_local); F = np.array(arm.matrix_world @ arm.data.bones[pre + s + 'ForeArm'].head_local)
    u = (F - A) / np.linalg.norm(F - A); L = np.linalg.norm(F - A); sg = 1 if s == 'Left' else -1
    ix = np.array([v.index for v in me.data.vertices if peso(v, pre + s + 'Arm') > 0.5])
    t = (P[ix] - A) @ u; c = A + np.outer(t, u); r = P[ix] - c
    fuera = r[:, 0] * sg > 0.3 * np.linalg.norm(r, axis=1)   # (la cara de fuera del brazo)
    cam = es_cam(col[ix])
    # el dobladillo: el último tramo de 1 cm, bajando por fuera del brazo, que aún es camiseta
    th = None
    for b in np.arange(0.0, L, 0.01):
        m = fuera & (t >= b) & (t < b + 0.01)
        if m.sum() < 5: continue
        if cam[m].mean() > 0.5: th = b + 0.01
        elif th is not None: break
    if th is None: inf.append(f'{s}: sin dobladillo'); continue
    # (la manga por fuera, para el color: la media de su tramo central)
    tono = np.median(col[ix][fuera & cam & (t > 0.02) & (t < th - 0.02)], axis=0)
    # (la manga por debajo: todo lo que está dentro del cilindro del brazo, del hombro al dobladillo, sea de la pieza
    # que sea; por dentro del brazo el reparto deja parte de la manga con el torso)
    R = np.median(np.linalg.norm(r[fuera & (t > 0.03) & (t < th - 0.01)], axis=1)) + 0.015
    tt = (P - A) @ u; rr = np.linalg.norm(P - (A + np.outer(tt, u)), axis=1)
    zona = ((tt > -0.08) & (tt < th - 0.008) & (rr < R))
    # (y la piel del torso que queda debajo de la manga, en el hombro y en los pliegues del sobaco por delante y por
    # detrás: con el brazo abajo no se veía y Meshy la pintó de carne; al moverse la manga con el brazo queda al
    # descubierto. Todo el torso alrededor del hombro va de camiseta)
    zona |= (np.linalg.norm(P - A, axis=1) < 0.17) & (P[:, 0] * sg > 0.085) & (P[:, 2] > A[2] - 0.17)
    for vi in np.where(zona)[0]: pintar[vi] = len(BRAZOS)
    BRAZOS.append((A, u, th, R, sg, tono))
    inf.append(f'{s}: dobladillo a {100 * th:.1f} cm del hombro, {int(zona.sum())} vértices en la manga y el hombro; color {np.round(tono, 3)}')
# en las caras de esa zona, los píxeles de la textura que son piel pasan al color de la camiseta (por píxel: una cara
# puede tener parte de camiseta y parte de piel), con 2 píxeles de margen para que no quede raya en la costura
nuevos = 0
for poly in me.data.polygons:
    if not any(v in pintar for v in poly.vertices): continue
    A, u, th, R, sg, tono = BRAZOS[pintar[next(v for v in poly.vertices if v in pintar)]]
    q = np.array([[uv[li].uv[0] * W, uv[li].uv[1] * H] for li in poly.loop_indices]); Q = P[list(poly.vertices)]
    for k in range(1, len(q) - 1):
        tri = q[[0, k, k + 1]]; T3 = Q[[0, k, k + 1]]
        x0, y0 = np.floor(tri.min(0) - 2).astype(int); x1, y1 = np.ceil(tri.max(0) + 2).astype(int)
        x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(W - 1, x1), min(H - 1, y1)
        if x1 < x0 or y1 < y0: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        a, b, c_ = tri; v0, v1 = b - a, c_ - a; d = v0[0] * v1[1] - v1[0] * v0[1]
        if abs(d) < 1e-9: continue
        wx = ((X - a[0]) * v1[1] - v1[0] * (Y - a[1])) / d; wy = (v0[0] * (Y - a[1]) - (X - a[0]) * v0[1]) / d
        tol = 2.0 / max(1.0, np.sqrt(abs(d)))
        m = (wx >= -tol) & (wy >= -tol) & (wx + wy <= 1 + tol)
        if not m.any(): continue
        # (el sitio en 3D de cada píxel, en reposo: el dobladillo es un corte limpio a lo largo del brazo)
        w0 = 1 - wx - wy; X3 = w0[..., None] * T3[0] + wx[..., None] * T3[1] + wy[..., None] * T3[2]
        tt = (X3 - A) @ u; rr = np.linalg.norm(X3 - A - tt[..., None] * u, axis=-1)
        manga = (tt > -0.08) & (tt < th - 0.006) & (rr < R)
        hombro = (np.linalg.norm(X3 - A, axis=-1) < 0.17) & (X3[..., 0] * sg > 0.085) & (X3[..., 2] > A[2] - 0.17) & ~((tt >= th - 0.006) & (rr < R))
        blk = px[y0:y1 + 1, x0:x1 + 1]
        m &= (manga | hombro) & ~es_cam(blk[..., :3])
        blk[m, :3] = tono; nuevos += int(m.sum())
img.pixels.foreach_set(px.ravel()); img.update()
# (el glTF guarda la imagen empaquetada)
img.pack()
inf.append(f'{nuevos} píxeles pintados de camiseta')
print('MANGA', '\n'.join(inf))
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True)
print('exportado', SAL)
