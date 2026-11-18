# punta-coleta.py -- modelo.glb : los puntos de detrás del cuello que no van con la cabeza: dónde están y de qué color son
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; ENT = a[0]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); me = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
img = next(n.image for m in me.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
c = img.copy(); c.scale(512, 512); px = np.empty(512 * 512 * 4, np.float32); c.pixels.foreach_get(px); px = px.reshape(512, 512, 4)[:, :, :3]
uv = me.data.uv_layers.active.data; col = np.zeros((len(me.data.vertices), 3), np.float32)
for l in me.data.loops:
    u_, v_ = uv[l.index].uv; col[l.vertex_index] = px[int(min(511, max(0, v_ * 512))), int(min(511, max(0, u_ * 512)))]
gi = {g.index: g.name.replace(pre, '') for g in me.vertex_groups}
out = []
for v in me.data.vertices:
    p = me.matrix_world @ v.co
    if not (1.36 < p.z < 1.50 and abs(p.x) < 0.12 and p.y > 0.085): continue
    ws = {gi[g.group]: g.weight for g in v.groups if g.weight > 1e-3}; s = sum(ws.values()) or 1; wh = ws.get('Head', 0) / s
    out.append((p.x, p.y, p.z, wh, *col[v.index]))
A = np.array(out); np.save(a[1], A)
no = A[A[:, 3] < 0.5]; si = A[A[:, 3] >= 0.5]
print('DETRAS DEL CUELLO:', len(A), 'puntos;', len(si), 'con la cabeza;', len(no), 'con el tronco')
for nombre, B in (('con la cabeza', si), ('con el tronco', no)):
    if len(B): print(f'  {nombre}: y {B[:,1].min():.3f}-{B[:,1].max():.3f}  z {B[:,2].min():.3f}-{B[:,2].max():.3f}  color medio {np.round(B[:,4:7].mean(axis=0),2)}  mediana {np.round(np.median(B[:,4:7],axis=0),2)}')
# los del tronco, por alturas
for z0 in np.arange(1.36, 1.50, 0.02):
    b = no[(no[:, 2] >= z0) & (no[:, 2] < z0 + 0.02)]
    if len(b): print(f'   tronco z {z0:.2f}-{z0+0.02:.2f}: {len(b):4d} pts  y {b[:,1].min():.3f}-{b[:,1].max():.3f}  color mediana {np.round(np.median(b[:,4:7],axis=0),2)}')
