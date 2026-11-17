# Más puntos de giro para un personaje con esqueleto de Meshy (nombres de Mixamo): un hueso de giro en cada antebrazo,
# LeftForeArmTwist y RightForeArmTwist. El autor, 17 de noviembre de 2026: «necesitas más puntos de rotación, aparte de
# las rodillas, los codos, los hombros, la cadera, los tobillos», y que el jugador no se deforme. En una persona, la
# muñeca gira (pronación y supinación) con los dos huesos del antebrazo, a lo largo de todo él; con un solo hueso, al
# girar la mano la piel se retuerce de golpe en la muñeca, como el envoltorio de un caramelo. El hueso de giro va de la
# mitad del antebrazo a la muñeca, hijo del antebrazo, y se lleva la mitad de piel que está cerca de la muñeca (de nada
# en el codo a todo en la muñeca, con una curva suave): en cada fotograma gira la mitad de lo que gira la mano
# (tools/blender/pose-a-esqueleto.py). Las animaciones que no lo mueven se ven igual que antes: en reposo, la piel se
# reparte pero queda en su sitio.
# Uso: python tools/blender/huesos-extra.py -- entrada.glb salida.glb [render.png]
import bpy, sys, math, os
from mathutils import Vector, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ENT, SAL = argv[0], argv[1]; RENDER = argv[2] if len(argv) > 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mallas = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones; nuevos = []
for s in ('Left', 'Right'):
    fa, h = eb.get(pre + s + 'ForeArm'), eb.get(pre + s + 'Hand')
    if not fa or not h or eb.get(pre + s + 'ForeArmTwist'): continue
    t = eb.new(pre + s + 'ForeArmTwist')
    t.head = fa.head.lerp(h.head, 0.5); t.tail = h.head.copy(); t.roll = fa.roll; t.parent = fa; t.use_deform = True
    nuevos.append((s, arm.matrix_world @ fa.head, arm.matrix_world @ h.head))
bpy.ops.object.mode_set(mode='OBJECT')
suave = lambda a, b, x: 0.0 if x <= a else 1.0 if x >= b else (lambda u: u * u * (3 - 2 * u))((x - a) / (b - a))
for me in mallas:
    for s, A, B in nuevos:
        gb = me.vertex_groups.get(pre + s + 'ForeArm')
        if not gb: continue
        gt = me.vertex_groups.get(pre + s + 'ForeArmTwist') or me.vertex_groups.new(name=pre + s + 'ForeArmTwist')
        ax = B - A; L = ax.length; ax.normalize(); M = me.matrix_world; cambios = []
        for v in me.data.vertices:
            for g in v.groups:
                if g.group == gb.index and g.weight > 0:
                    k = suave(0.2, 1.0, max(0.0, min(1.0, (M @ v.co - A).dot(ax) / L)))
                    cambios.append((v.index, g.weight, k))
        for i, w, k in cambios:
            gb.add([i], w * (1 - k), 'REPLACE'); gt.add([i], w * k, 'REPLACE')
        print(f'  {me.name}: {s}ForeArmTwist con {sum(1 for c in cambios if c[2] > 0)} vértices')
# (glTF admite 4 huesos por vértice: los vértices de la muñeca que pasan de 4 se quedan con los 4 que más pesan)
for me in mallas:
    bpy.context.view_layer.objects.active = me
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
bpy.context.view_layer.objects.active = arm
print('huesos de giro:', ', '.join(s + 'ForeArmTwist' for s, *_ in nuevos) or 'ninguno (ya estaban)')
if RENDER:
    # (prueba: la mano derecha girada 80° sobre el antebrazo, con el hueso de giro llevándose la mitad)
    sc = bpy.context.scene; P = arm.pose.bones
    for s in ('Right',):
        hb, tb = P.get(pre + s + 'Hand'), P.get(pre + s + 'ForeArmTwist')
        if hb: hb.rotation_mode = 'QUATERNION'; hb.rotation_quaternion = Quaternion((0, 1, 0), math.radians(80))
        if tb and not os.environ.get('SIN_GIRO'): tb.rotation_mode = 'QUATERNION'; tb.rotation_quaternion = Quaternion((0, 1, 0), math.radians(40))
    bpy.context.view_layer.update()
    mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for me in mallas:
        for c in me.bound_box: p = me.matrix_world @ Vector(c); mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
    hpos = arm.matrix_world @ P[pre + 'RightHand'].head
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = (mx - mn).length * 0.35; cam.location = hpos + Vector((0, -d, d * 0.15))
    cam.rotation_euler = (hpos - cam.location).to_track_quat('-Z', 'Y').to_euler()
    luz = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sc.collection.objects.link(luz); luz.rotation_euler = (0.8, 0.2, 0.4)
    sc.world = sc.world or bpy.data.worlds.new('w'); sc.world.color = (0.8, 0.8, 0.82)
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 12; sc.cycles.use_denoising = True; sc.render.resolution_x = sc.render.resolution_y = 640; sc.render.filepath = RENDER
    bpy.ops.render.render(write_still=True)
    for pb in P: pb.rotation_quaternion = Quaternion()
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True)
print('exportado', SAL)
