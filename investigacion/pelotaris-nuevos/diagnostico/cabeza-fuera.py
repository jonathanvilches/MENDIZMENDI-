# cabeza-fuera.py -- modelo.glb : qué vértices de la cabeza (por encima de la barbilla) no van enteros con el hueso de la cabeza, y con qué huesos van
import bpy, sys, collections
a = sys.argv[sys.argv.index('--') + 1:]; ENT = a[0]; ZB = float(a[1])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
tot = 0; mal = []; por = collections.Counter()
for me in ms:
    gi = {g.index: g.name.replace(pre, '') for g in me.vertex_groups}
    for v in me.data.vertices:
        p = me.matrix_world @ v.co
        if p.z < ZB or abs(p.x) > 0.25: continue
        tot += 1; ws = {gi[g.group]: g.weight for g in v.groups if g.weight > 1e-3}; s = sum(ws.values()) or 1
        wh = (ws.get('Head', 0) + ws.get('HeadTop_End', 0)) / s
        if wh < 0.98:
            mal.append((p.x, p.y, p.z, wh)); por[max((k for k in ws if k not in ('Head', 'HeadTop_End')), key=lambda k: ws[k], default='-')] += 1
print('MALLAS', [(m.name, len(m.data.vertices)) for m in ms])
print(f'ENCIMA DE {ZB}: {tot} vértices, {len(mal)} no van enteros con la cabeza; con:', dict(por))
if mal:
    import statistics as st
    print('  x', round(min(m[0] for m in mal), 3), round(max(m[0] for m in mal), 3), ' y', round(min(m[1] for m in mal), 3), round(max(m[1] for m in mal), 3), ' z', round(min(m[2] for m in mal), 3), round(max(m[2] for m in mal), 3), ' peso de cabeza medio', round(st.mean(m[3] for m in mal), 2))
    for zz in (ZB, ZB + 0.02, ZB + 0.04, ZB + 0.07, ZB + 0.10, ZB + 0.15): print('   por encima de', round(zz, 3), ':', sum(1 for m in mal if m[2] > zz))
