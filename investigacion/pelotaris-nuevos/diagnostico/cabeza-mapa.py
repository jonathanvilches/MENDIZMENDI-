# cabeza-mapa.py -- modelo.glb salida.png : los vértices de cuello y cabeza, de lado y de frente, pintados por su peso de cabeza
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; ENT, SAL = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
H = arm.matrix_world @ arm.data.bones[pre + 'Head'].head_local; N = arm.matrix_world @ arm.data.bones[pre + 'Neck'].head_local
print('CABEZA', [round(v, 3) for v in H], 'CUELLO', [round(v, 3) for v in N])
P = []; W = []
for me in ms:
    gi = {g.index: g.name for g in me.vertex_groups}
    for v in me.data.vertices:
        p = me.matrix_world @ v.co
        if p.z < N.z - 0.06 or abs(p.x) > 0.2: continue
        wh = sum(g.weight for g in v.groups if gi[g.group].replace(pre, '') in ('Head', 'HeadTop_End')); wt = sum(g.weight for g in v.groups) or 1
        P.append((p.x, p.y, p.z)); W.append(wh / wt)
P = np.array(P); W = np.array(W); np.save(SAL.replace('.png', '.npy'), np.c_[P, W])
import cv2
S = 2400; z0 = N.z - 0.06; img = np.full((int(0.36 * S), int(0.8 * S), 3), 255, np.uint8)
def pinta(u, ox, sel):
    for (uu, zz, w) in zip(u[sel], P[sel, 2], W[sel]):
        x = int(ox + uu * S); y = int(img.shape[0] - (zz - z0) * S)
        if 0 <= x < img.shape[1] and 0 <= y < img.shape[0]: img[y, x] = (int(255 * (1 - w)), 60, int(255 * w))
pinta(-P[:, 1], 0.2 * S, P[:, 0] > 0.0)      # de lado (la mitad izquierda del cuerpo): la cara hacia la derecha
pinta(P[:, 0], 0.6 * S, P[:, 1] < H.y)       # de frente (la mitad delantera)
for ox in (0.2 * S, 0.6 * S):
    for (pt, c) in ((H, (0, 200, 0)), (N, (0, 140, 255))): cv2.circle(img, (int(ox + (-pt.y if ox < 0.4 * S else pt.x) * S), int(img.shape[0] - (pt.z - z0) * S)), 9, c, 2)
cv2.imwrite(SAL, img)
