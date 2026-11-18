# El hombro quieto en el torso: el giro de cada clavícula de un movimiento pasa al brazo, que acaba igual de orientado
# pero girando sobre el hombro sin moverlo. Con la piel rígida (tools/blender/piel-rigida.py) el torso es un bloque que
# incluye las clavículas: si la clavícula girase, el brazo se saldría de su sitio y la unión del hombro se estiraría. El
# autor, 17 de noviembre de 2026: «ni el torso ni el hombro se tienen que deformar; solo es movimiento de giro».
# Lo mismo hace el juego en cada fotograma con los movimientos que no pasan por aquí (actors/glbChar.js, clavícula).
# Uso: python tools/blender/clavicula.py -- movimiento.glb salida.glb   (la acción «GolpeReal»)
import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
ENT, SAL = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); sc = bpy.context.scene
act = bpy.data.actions.get('GolpeReal')
arm.animation_data_create(); arm.animation_data.action = act
if hasattr(arm.animation_data, 'action_slot') and getattr(act, 'slots', None): arm.animation_data.action_slot = act.slots[0]
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.pose.bones) else ''
for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
poses, mx = {}, 0.0
for fr in range(f0, f1 + 1):
    sc.frame_set(fr)
    d = {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in arm.pose.bones}
    for s in ('Left', 'Right'):
        sh, ar = arm.pose.bones[pre + s + 'Shoulder'], arm.pose.bones[pre + s + 'Arm']
        mx = max(mx, sh.rotation_quaternion.angle)
        M = ar.matrix.copy(); sh.rotation_quaternion = (1, 0, 0, 0); bpy.context.view_layer.update()
        M.translation = ar.matrix.translation; ar.matrix = M; bpy.context.view_layer.update()
        d[sh.name] = (sh.rotation_quaternion.copy(), sh.location.copy()); d[ar.name] = (ar.rotation_quaternion.copy(), ar.location.copy())
    poses[fr] = d
# la acción nueva, con el mismo nombre y los mismos fotogramas
nombre = act.name; act.name = nombre + '_vieja'
nueva = bpy.data.actions.new(nombre); arm.animation_data.action = nueva
if hasattr(nueva, 'slots'):
    try: arm.animation_data.action_slot = nueva.slots.new(id_type='OBJECT', name=nombre)
    except Exception as e: print('slot', e)
for fr, d in poses.items():
    for pb in arm.pose.bones:
        q, l = d[pb.name]; pb.rotation_quaternion = q; pb.location = l
        pb.keyframe_insert('rotation_quaternion', frame=fr); pb.keyframe_insert('location', frame=fr)
bpy.data.actions.remove(act)
for x in list(bpy.data.actions):
    if x != nueva: bpy.data.actions.remove(x)
sc.frame_start, sc.frame_end = f0, f1
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True)
import math
print(f'clavícula al brazo: {f1 - f0 + 1} fotogramas, la clavícula giraba hasta {math.degrees(mx):.0f}°; exportado', SAL)
