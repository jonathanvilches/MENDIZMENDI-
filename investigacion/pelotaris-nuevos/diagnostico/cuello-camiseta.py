# cuello-camiseta.py -- modelo.glb : a qué altura llega la camiseta alrededor del cuello, por sectores (de frente a nuca)
import bpy, sys, math, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; ENT = a[0]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); me = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
H = arm.matrix_world @ arm.data.bones[pre + 'Head'].head_local; N = arm.matrix_world @ arm.data.bones[pre + 'Neck'].head_local; S2 = arm.matrix_world @ arm.data.bones[pre + 'Spine2'].head_local
img = next(n.image for m in me.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
c = img.copy(); c.scale(1024, 1024); px = np.empty(1024 * 1024 * 4, np.float32); c.pixels.foreach_get(px); px = px.reshape(1024, 1024, 4)[:, :, :3]
uv = me.data.uv_layers.active.data; col = np.zeros((len(me.data.vertices), 3), np.float32)
for l in me.data.loops:
    u_, v_ = uv[l.index].uv; col[l.vertex_index] = px[int(min(1023, max(0, v_ * 1024))), int(min(1023, max(0, u_ * 1024)))]
W = [me.matrix_world @ v.co for v in me.data.vertices]
ropa = np.median(col[[i for i, p in enumerate(W) if S2.z - 0.10 < p.z < S2.z and p.y < H.y and abs(p.x) < 0.10]], axis=0)
print('HEAD', round(H.z, 3), 'NECK', round(N.z, 3), 'ropa', np.round(ropa, 2))
sect = {}
for i, p in enumerate(W):
    if not (N.z - 0.02 < p.z < H.z + 0.06): continue
    t = (p.z - N.z) / max(1e-6, H.z - N.z); cx = N.x + (H.x - N.x) * t; cy = N.y + (H.y - N.y) * t
    r = math.hypot(p.x - cx, p.y - cy)
    if r > 0.085: continue
    ang = math.degrees(math.atan2(p.x - cx, -(p.y - cy)))   # 0 = delante, ±180 = nuca
    k = int(round(ang / 30.0)) * 30; k = 180 if k == -180 else k
    es_ropa = float(np.linalg.norm(col[i] - ropa)) < 0.22 or float(np.linalg.norm(col[i] - ropa * 0.6)) < 0.15
    d = sect.setdefault(k, {'ropa': [], 'piel': [], 'r': []}); d['ropa' if es_ropa else 'piel'].append(p.z); d['r'].append(r)
for k in sorted(sect):
    d = sect[k]; rz = sorted(d['ropa']); pz = sorted(d['piel'])
    print(f'  {k:5d}°  camiseta hasta {rz[int(len(rz) * 0.98)] if rz else 0:.3f} (máx {rz[-1] if rz else 0:.3f}, {len(rz)} pts)   piel desde {pz[int(len(pz) * 0.02)] if pz else 0:.3f}   radio medio {sum(d["r"]) / len(d["r"]):.3f}')
