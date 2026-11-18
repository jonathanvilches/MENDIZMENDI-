# Vídeo de prueba de un golpe: el pelotari con su movimiento (el GLB que saca tools/blender/pose-a-esqueleto.py) y la
# pelota que llega y sale de la mano en el instante del golpe, visto desde dos sitios: de frente al pelotari, como el
# vídeo real, y de lado. Saca un PNG por fotograma y cámara (a_0001.png, b_0001.png...).
# El golpe es el fotograma en que la mano que pega va más rápida; la pelota sale en la dirección en que va la mano y
# llega desde ese mismo lado (del frontis), con un poco de comba.
# Uso: python tools/blender/golpe-render.py -- golpe.glb carpeta R|L [ancho] [alto]   (MUESTRAS=8, DIST=4.6, LADO=1|-1, FR=10,20 solo esos)
import bpy, sys, os, math
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
ENT, OUT, MANO = a[0], a[1], a[2]
RW = int(a[3]) if len(a) > 3 else 480; RH = int(a[4]) if len(a) > 4 else 600
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
sc = bpy.context.scene
# (la mezcla de las articulaciones con cuaterniones duales, como en el juego: el giro sin aplastar el volumen; VOL=0 sin ella)
for o in bpy.data.objects:
    for m in getattr(o, 'modifiers', []):
        if m.type == 'ARMATURE': m.use_deform_preserve_volume = os.environ.get('VOL', '1') == '1'
# (PESOS=Left|Right: la piel pintada por pesos, rojo el brazo, verde la clavícula, azul el torso, para ver de qué pieza
# es cada trozo de tela)
if os.environ.get('PESOS'):
    sd = os.environ['PESOS']
    for o in bpy.data.objects:
        if o.type != 'MESH' or not o.vertex_groups: continue
        nom = {g.index: g.name.split(':')[-1] for g in o.vertex_groups}
        ca = o.data.color_attributes.new('peso', 'FLOAT_COLOR', 'POINT')
        for v in o.data.vertices:
            w = {nom[g.group]: g.weight for g in v.groups}
            ca.data[v.index].color = (w.get(sd + 'Arm', 0), w.get(sd + 'Shoulder', 0), w.get('Spine2', 0), 1)
        m = bpy.data.materials.new('peso'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
        at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'peso'; nt.links.new(at.outputs['Color'], bs.inputs['Base Color'])
        o.data.materials.clear(); o.data.materials.append(m)
# (DORSO=1: las caras vistas por detrás, en magenta: dónde se abre la malla y se vería el hueco en el juego)
if os.environ.get('DORSO') == '1':
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        nt = mat.node_tree; out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if not out or not out.inputs['Surface'].links: continue
        src = out.inputs['Surface'].links[0].from_socket
        geo = nt.nodes.new('ShaderNodeNewGeometry'); em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (1, 0, 1, 1); em.inputs[1].default_value = 3
        mix = nt.nodes.new('ShaderNodeMixShader'); nt.links.new(geo.outputs['Backfacing'], mix.inputs[0]); nt.links.new(src, mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs['Surface'])
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.lower().startswith(('icosphere', 'cube')): bpy.data.objects.remove(o)
# (el GLB trae también andar y correr: el golpe es la acción «GolpeReal»)
act = bpy.data.actions.get('GolpeReal') or next((x for x in bpy.data.actions if 'golpe' in x.name.lower()), None) or (bpy.data.actions[0] if bpy.data.actions else None)
arm.animation_data_create(); arm.animation_data.action = act
if act is not None and hasattr(arm.animation_data, 'action_slot') and getattr(act, 'slots', None) and not arm.animation_data.action_slot:
    arm.animation_data.action_slot = act.slots[0]
print('acción', act.name if act else None, [x.name for x in bpy.data.actions])
f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (1, 1)
sc.frame_start, sc.frame_end = f0, f1
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.pose.bones) else ''
lado_m = 'Right' if MANO.upper().startswith('R') else 'Left'
mano, ante = arm.pose.bones[pre + lado_m + 'Hand'], arm.pose.bones[pre + lado_m + 'ForeArm']
Mw = arm.matrix_world
# (la palma: 8 cm más allá de la muñeca, siguiendo el antebrazo; la cola del hueso de la mano no sirve, que es la punta
# de un hueso sin hijo y el importador le pone el largo que quiere)
def palma(fr):
    sc.frame_set(fr); H = Mw @ mano.head; F = Mw @ ante.head; return H + (H - F).normalized() * 0.08
P = {fr: palma(fr) for fr in range(f0, f1 + 1)}
vel = {fr: (P[min(fr + 1, f1)] - P[max(fr - 1, f0)]) * (sc.render.fps / 2) for fr in P}
fi = int(os.environ['GOLPE']) + f0 - 1 if os.environ.get('GOLPE') else max(range(f0 + 2, f1 - 1), key=lambda fr: vel[fr].length)   # (GOLPE=39: el fotograma del golpe, si se sabe)
I = P[fi]; d = (P[min(f1, fi + 3)] - P[max(f0, fi - 3)]).normalized()
print('golpe en el fotograma', fi, 'mano a %.1f m/s' % vel[fi].length, 'altura %.2f m' % I.z)
# la pelota: llega desde el lado al que sale (el frontis), a 14 m/s y con algo de comba; sale a 28 m/s
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.032, segments=24, ring_count=12)
bola = bpy.context.object; bola.name = 'pelota'
m = bpy.data.materials.new('cuero'); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
bs.inputs['Base Color'].default_value = (0.86, 0.82, 0.72, 1); bs.inputs['Roughness'].default_value = 0.55
bola.data.materials.append(m)
fps = sc.render.fps; din = Vector((d.x, d.y, 0)).normalized() if Vector((d.x, d.y)).length > 0.2 else d
for fr in range(f0, f1 + 1):
    t = (fr - fi) / fps
    if t <= 0: p = I + din * (-t * 14) + Vector((0, 0, 2.2 * t * t + 0.25 * -t))
    else: p = I + d * (t * 28) + Vector((0, 0, -4.9 * t * t))
    bola.location = p; bola.keyframe_insert('location', frame=fr)
    lejos = (p - I).length > 7
    bola.hide_render = lejos; bola.keyframe_insert('hide_render', frame=fr)
# el sitio: suelo de cancha, fondo oscuro y luz de frontón
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = int(os.environ.get('MUESTRAS', '8')); sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = RW, RH
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True
wd.node_tree.nodes['Background'].inputs[0].default_value = (0.10, 0.17, 0.16, 1); wd.node_tree.nodes['Background'].inputs[1].default_value = 0.7
bpy.ops.mesh.primitive_plane_add(size=16); pl = bpy.context.object; ms = bpy.data.materials.new('suelo'); ms.use_nodes = True
ms.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.09, 0.10, 0.11, 1); pl.data.materials.append(ms)
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(45), 0, math.radians(-25))); bpy.context.object.data.energy = 3.0
bpy.ops.object.light_add(type='AREA', location=(-2, -2, 2.5)); bpy.context.object.data.energy = 150; bpy.context.object.data.size = 3
bpy.ops.object.light_add(type='AREA', location=(2.5, 1.5, 2.2)); bpy.context.object.data.energy = 90; bpy.context.object.data.size = 3
# las cámaras miran a la cadera media del golpe (sin seguirla: así se ve el desplazamiento)
hips = arm.pose.bones[pre + 'Hips']
cad = Vector((0, 0, 0))
for fr in range(f0, f1 + 1): sc.frame_set(fr); cad += Mw @ hips.head
cad /= (f1 - f0 + 1); obj = Vector((cad.x, cad.y, 0.95))
dist = float(os.environ.get('DIST', '4.6')); lado = float(os.environ.get('LADO', '1'))
cams = {}
VISTAS = {'a': Vector((0, -dist, 0.35)), 'b': Vector((lado * dist, 0, 0.35)), 'd': Vector((0, dist, 0.35))}  # (d: por detrás, como los vídeos)
for k, off in ((k, VISTAS[k]) for k in os.environ.get('CAMS', 'a,b').split(',') if k in VISTAS):
    bpy.ops.object.camera_add(location=obj + off); c = bpy.context.object; c.data.lens = 50
    c.rotation_euler = (obj - c.location).to_track_quat('-Z', 'Y').to_euler(); cams[k] = c
os.makedirs(OUT, exist_ok=True)
for k, c in cams.items():
    sc.camera = c
    for fr in range(f0, f1 + 1):
        if os.environ.get('FR') and str(fr - f0 + 1) not in os.environ['FR'].split(','): continue
        sc.frame_set(fr); sc.render.filepath = f'{OUT}/{k}_{fr - f0 + 1:04d}.png'; bpy.ops.render.render(write_still=True)
# (y de cerca, el hombro del brazo que pega y el torso: la cámara sigue el hombro y gira con la cadera, de frente y por su
# lado; CERCA=0 sin ella)
if os.environ.get('CERCA', '1') == '1':
    from mathutils import Matrix
    hb = arm.pose.bones[pre + lado_m + 'Arm']; sg = -1 if lado_m == 'Right' else 1
    bpy.ops.object.camera_add(); ch = bpy.context.object; ch.data.lens = 45; sc.camera = ch
    for fr in range(f0, f1 + 1):
        if os.environ.get('FR') and str(fr - f0 + 1) not in os.environ['FR'].split(','): continue
        sc.frame_set(fr)
        R0 = Mw.to_3x3().normalized(); Rrel = R0 @ hips.matrix.to_3x3().normalized() @ hips.bone.matrix_local.to_3x3().normalized().inverted() @ R0.inverted()
        fw = Rrel @ Vector((0, -1, 0)); fw.z = 0
        R = Matrix.Rotation(math.atan2(fw.y, fw.x) - math.atan2(-1, 0), 3, 'Z') if fw.length > 1e-3 else Matrix.Identity(3)
        o = Mw @ hb.head + Vector((0, 0, -0.06)); ch.location = o + R @ Vector((sg * 0.75, -1.0, 0.3))
        ch.rotation_euler = (o - ch.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = f'{OUT}/h_{fr - f0 + 1:04d}.png'; bpy.ops.render.render(write_still=True)
open(f'{OUT}/golpe.txt', 'w').write(f'{fi - f0 + 1}\n')
print('render hecho', OUT, 'golpe', fi - f0 + 1)
