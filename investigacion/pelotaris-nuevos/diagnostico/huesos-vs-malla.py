# huesos-vs-malla.py -- modelo.glb : dónde cae cada hueso respecto a la malla (centro de la rebanada de malla a su altura)
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; ENT = a[0]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
P = np.array([tuple(me.matrix_world @ v.co) for me in ms for v in me.data.vertices])
print('MALLA  x', P[:, 0].min().round(3), P[:, 0].max().round(3), ' y', P[:, 1].min().round(3), P[:, 1].max().round(3), ' z', P[:, 2].min().round(3), P[:, 2].max().round(3), ' escala del esqueleto', [round(s, 4) for s in arm.matrix_world.to_scale()])
for b in arm.data.bones:
    n = b.name.replace('mixamorig:', '')
    if n not in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Spine01', 'Spine02', 'Neck', 'neck', 'Head', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightUpLeg'): continue
    j = arm.matrix_world @ b.head_local
    # la rebanada de malla a la altura del hueso, cerca de él en x (para piernas y tronco) → su centro en y
    sel = (np.abs(P[:, 2] - j.z) < 0.012) & (np.abs(P[:, 0] - j.x) < 0.09)
    if sel.sum() < 10: print(f'  {n:12s} {j.x:7.3f} {j.y:7.3f} {j.z:7.3f}   sin malla cerca'); continue
    y0, y1 = P[sel, 1].min(), P[sel, 1].max()
    print(f'  {n:12s} x {j.x:7.3f}  y {j.y:7.3f}  z {j.z:7.3f}   malla en y de {y0:6.3f} a {y1:6.3f} (centro {(y0 + y1) / 2:6.3f}) → hueso a {j.y - (y0 + y1) / 2:+.3f} del centro')
