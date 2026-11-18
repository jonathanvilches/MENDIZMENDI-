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
# EL EJE DE LA CABEZA, EN EL CENTRO DEL CUELLO. La cabeza gira sobre el punto donde nace su hueso, y Meshy no siempre lo
# pone en su sitio: a la pelotari de la coleta (18 nov) le dejó los huesos del cuello y de la cabeza 7 cm por delante del
# centro del cuello, debajo de la barbilla y fuera del cuello. Girando ahí, la nuca recorría el doble de lo normal, se
# metía en la camiseta y el borde del cuello salía roto; a la pelotari del moño, con los huesos centrados, no le pasaba.
# Se mide en la figura (como en tools/blender/piel-rigida.py: la barbilla, donde la cara sobresale 2,5 cm de la garganta,
# y el cuello, en la rebanada de debajo) y, si la línea de los huesos se aparta más de 1,5 cm del centro del cuello, los
# dos huesos se llevan a él, a su misma altura. La piel no se mueve: solo cambia el punto sobre el que gira la cabeza
def centro_cuello():
    try:
        H = arm.matrix_world @ arm.data.bones[pre + 'Head'].head_local; N = arm.matrix_world @ arm.data.bones[pre + 'Neck'].head_local
        pts = [me.matrix_world @ v.co for me in mallas for v in me.data.vertices]; paso = 0.005; perfil = {}
        for p_ in pts:
            if abs(p_.x - N.x) < 0.02 and N.z + 0.02 < p_.z < N.z + 0.32: k_ = int((p_.z - N.z) / paso); perfil[k_] = min(perfil.get(k_, 1e9), p_.y)
        garg = sorted(perfil[k_] for k_ in perfil if 0.03 <= k_ * paso <= 0.06)
        if len(garg) < 3: return None
        yg = garg[len(garg) // 2]; zb = next((N.z + k_ * paso for k_ in sorted(perfil) if k_ * paso >= 0.03 and perfil[k_] < yg - 0.025), None)
        if zb is None or not (N.z + 0.06 < zb < H.z + 0.10): return None
        reb = [p_ for p_ in pts if zb - 0.04 < p_.z < zb - 0.01 and abs(p_.x - N.x) < 0.12]
        delante = min(p_.y for p_ in reb if abs(p_.x - N.x) < 0.02); xs = sorted(p_.x for p_ in reb if p_.y < delante + 0.06)
        if len(xs) < 30: return None
        a_, b_ = xs[int(len(xs) * 0.02)], xs[int(len(xs) * 0.98) - 1]; rad = (b_ - a_) / 2
        return ((a_ + b_) / 2, delante + rad, rad, H, N) if 0.035 < rad < 0.075 else None
    except Exception as e: print('sin centro del cuello:', e); return None
CC = centro_cuello(); mover = {}
if CC:
    cx_, cy_, rad_, H_, N_ = CC; fuera = math.hypot(H_.x - cx_, H_.y - cy_)
    print(f'cuello: centro en x {cx_:.3f}, y {cy_:.3f}, radio {rad_:.3f} m; el hueso de la cabeza, a {fuera * 100:.1f} cm del centro')
    if fuera > 0.015:
        Minv = arm.matrix_world.inverted().to_3x3()
        for n_, J_ in (('Neck', N_), ('Head', H_)): mover[pre + n_] = Minv @ Vector((cx_ - J_.x, cy_ - J_.y, 0.0))
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones; nuevos = []
for n_, d_ in mover.items():
    b_ = eb.get(n_)
    if b_: b_.use_connect = False; b_.head = b_.head + d_; b_.tail = b_.tail + d_
if mover: print('eje de la cabeza y del cuello, llevados al centro del cuello')
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
