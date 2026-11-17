# Los golpes reales de un pelotari (sacados de vídeo con tools/blender/pose-a-esqueleto.py, uno por archivo) puestos
# como los quiere el juego, en un solo GLB con su esqueleto: cada uno, una acción «Real_<golpe del juego>» (Real_Hit,
# Real_HitL, Real_Volea...) que empieza 0,3 s antes del instante del golpe y acaba 0,6 s después, con el cuerpo girado
# para que la pelota salga hacia delante del personaje (hacia el frontis): en el vídeo, cada pelotari estaba mirando a
# un sitio. El instante del golpe es el fotograma en que la mano que pega va más rápida, y la dirección de la pelota, la
# de la mano en ese instante. actors/glbChar.js los recorta en el golpe y saca de su primer fotograma la postura de
# armado; tools/pelotari-nuevo-glb.mjs los mete en el GLB del juego (REALES=este.glb).
# Uso: python tools/blender/golpes-al-juego.py -- personaje.glb salida.glb Hit:der.glb:R HitL:izq.glb:L ... [Gancho:g.glb:R:44]
import bpy, sys, math
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]
BASE, SAL, LISTA = a[0], a[1], [(x.split(':') + [''])[:4] for x in a[2:]]
ANTES, DESPUES = 9, 18   # fotogramas (a 30 por segundo): 0,3 s antes y 0,6 s después del golpe
datos = {}
for nombre, archivo, mano, fijo in LISTA:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=archivo)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); sc = bpy.context.scene
    act = bpy.data.actions.get('GolpeReal'); arm.animation_data_create(); arm.animation_data.action = act
    if hasattr(arm.animation_data, 'action_slot') and getattr(act, 'slots', None) and not arm.animation_data.action_slot: arm.animation_data.action_slot = act.slots[0]
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1]); fps = sc.render.fps
    pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.pose.bones) else ''
    lado = 'Right' if mano.upper().startswith('R') else 'Left'
    hb, fb = arm.pose.bones[pre + lado + 'Hand'], arm.pose.bones[pre + lado + 'ForeArm']; Mw = arm.matrix_world
    def palma(fr):
        sc.frame_set(fr); H = Mw @ hb.head; F = Mw @ fb.head; return H + (H - F).normalized() * 0.08
    P = {fr: palma(fr) for fr in range(f0, f1 + 1)}
    vel = {fr: (P[min(fr + 1, f1)] - P[max(fr - 1, f0)]) * (fps / 2) for fr in P}
    # (o el que se le diga: Gancho:archivo.glb:R:44, cuando el vídeo trae al principio el pelotari medio fuera del encuadre)
    fi = int(fijo) if fijo else max(range(f0 + 2, f1 - 1), key=lambda fr: vel[fr].length)
    # (la dirección, la del camino de la mano de 4 fotogramas antes a 4 después, en el suelo: la de un solo fotograma
    # bailaba en los golpes que bajan, como el gancho, que casi no avanzan)
    d = P[min(f1, fi + 4)] - P[max(f0, fi - 4)]; d = Vector((d.x, d.y, 0)).normalized()
    # (el personaje mira a −Y en Blender, +Z en el glTF): el giro alrededor de la vertical que lleva la pelota hacia ahí
    th = math.atan2(-1, 0) - math.atan2(d.y, d.x)
    R = Matrix.Rotation(th, 4, 'Z'); Mi = Mw.inverted()
    hips = arm.pose.bones[pre + 'Hips']
    a0, a1 = max(f0, fi - ANTES), min(f1, fi + DESPUES)
    frames = []
    for fr in range(a0, a1 + 1):
        sc.frame_set(fr)
        Mh = Mi @ R @ Mw @ hips.matrix
        rot = {pb.name: pb.rotation_quaternion.copy() for pb in arm.pose.bones}
        # (la cadera, girada: su matriz de pose en el espacio del esqueleto pasa a su giro y su sitio propios)
        hips.matrix = Mh; bpy.context.view_layer.update()
        rot[hips.name] = hips.rotation_quaternion.copy(); loc = hips.location.copy()
        frames.append((rot, loc))
    datos[nombre] = (frames, fi - a0)
    print(f'{nombre}: golpe en el fotograma {fi} ({vel[fi].length:.1f} m/s, altura {P[fi].z:.2f} m), girado {math.degrees(th):.0f}°, {len(frames)} fotogramas, el golpe en el {fi - a0}')
# en el personaje, una acción por golpe
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BASE)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); sc = bpy.context.scene
for o in list(bpy.data.objects):
    if o.type == 'MESH': bpy.data.objects.remove(o)
for x in list(bpy.data.actions): bpy.data.actions.remove(x)
arm.animation_data_create()
for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
for nombre, (frames, gi) in datos.items():
    act = bpy.data.actions.new('Real_' + nombre); arm.animation_data.action = act
    if hasattr(act, 'slots'):
        try: arm.animation_data.action_slot = act.slots.new(id_type='OBJECT', name='Real_' + nombre)
        except Exception as e: print('slot', e)
    for i, (rot, loc) in enumerate(frames):
        for pb in arm.pose.bones:
            if pb.name in rot: pb.rotation_quaternion = rot[pb.name]
            pb.keyframe_insert('rotation_quaternion', frame=i + 1)
            if pb.name.endswith('Hips'): pb.location = loc; pb.keyframe_insert('location', frame=i + 1)
    # (el NLA guarda cada acción para que el exportador las saque todas)
    tr = arm.animation_data.nla_tracks.new(); tr.name = act.name; st = tr.strips.new(act.name, 1, act); arm.animation_data.action = None
sc.frame_start = 1
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True)
print('exportado', SAL, ', '.join('Real_' + n for n in datos))
