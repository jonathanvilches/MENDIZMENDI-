# cuello-ver.py -- modelo.glb salida.npy : perfil de lado del cuello y la cabeza (tira central y contorno), con los huesos
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; ENT, SAL = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
J = {n: arm.matrix_world @ arm.data.bones[pre + n].head_local for n in ('Spine2', 'Neck', 'Head', 'HeadTop_End') if arm.data.bones.get(pre + n)}
print('HUESOS', {k: [round(c, 3) for c in v] for k, v in J.items()})
P = np.array([tuple(me.matrix_world @ v.co) for me in ms for v in me.data.vertices if (me.matrix_world @ v.co).z > J['Neck'].z - 0.08])
np.save(SAL, P); np.save(SAL.replace('.npy', '-j.npy'), np.array([tuple(J[k]) for k in ('Neck', 'Head')]))
