# Un golpe corto (la dejada) a partir de uno real entero (tools/blender/pose-a-esqueleto.py): las piernas y la cadera
# hacen lo mismo (el desplazamiento y el apoyo son los del pelotari de verdad), pero los brazos, los hombros y la
# espalda solo hacen una parte del recorrido desde la postura de espera, como quien acaricia la pelota en vez de pegarle,
# y todo un poco más despacio. Cada postura sale entre dos posturas reales del mismo hueso, así que no puede pasar de lo
# que gira un cuerpo.
# Uso: python tools/blender/golpe-corto.py -- golpe.glb salida.glb [parte=0.45] [lento=1.25]
import bpy, sys
from mathutils import Quaternion
a = sys.argv[sys.argv.index('--') + 1:]
ENT, SAL = a[0], a[1]; K = float(a[2]) if len(a) > 2 else 0.45; LENTO = float(a[3]) if len(a) > 3 else 1.25
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
act = bpy.data.actions.get('GolpeReal'); arm.animation_data_create(); arm.animation_data.action = act
if hasattr(arm.animation_data, 'action_slot') and getattr(act, 'slots', None) and not arm.animation_data.action_slot: arm.animation_data.action_slot = act.slots[0]
sc = bpy.context.scene; f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
ARRIBA = ('Shoulder', 'Arm', 'ForeArm', 'ForeArmTwist', 'Hand', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head')
P = arm.pose.bones
toca = [pb for pb in P if any(pb.name.endswith(x) for x in ARRIBA)]
# las posturas de cada fotograma
pos = {}
for fr in range(f0, f1 + 1):
    sc.frame_set(fr); pos[fr] = {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in P}
ref = pos[f0]
# el nuevo, más largo (más despacio) y con el recorrido de arriba recortado
n = int(round((f1 - f0) * LENTO)) + 1
nueva = bpy.data.actions.new('GolpeReal_corto')
arm.animation_data.action = nueva
if hasattr(nueva, 'slots'):
    try: arm.animation_data.action_slot = nueva.slots.new(id_type='OBJECT', name='GolpeReal')
    except Exception: pass
for i in range(n):
    t = f0 + i / LENTO; a0 = int(t); b0 = min(f1, a0 + 1); u = t - a0
    for pb in P:
        qa, la = pos[a0][pb.name]; qb, lb = pos[b0][pb.name]
        q = qa.slerp(qb, u); l = la.lerp(lb, u)
        if pb in toca: q = ref[pb.name][0].slerp(q, K)
        pb.rotation_quaternion = q; pb.location = l
        pb.keyframe_insert('rotation_quaternion', frame=i + 1)
        if pb.name.endswith('Hips'): pb.keyframe_insert('location', frame=i + 1)
bpy.data.actions.remove(act); nueva.name = 'GolpeReal'
sc.frame_start, sc.frame_end = 1, n
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True)
print('golpe corto', n, 'fotogramas, recorrido', K, 'exportado', SAL)
