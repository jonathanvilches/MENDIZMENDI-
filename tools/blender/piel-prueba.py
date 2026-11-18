# Prueba de la piel de un pelotari con un movimiento: cuánto se deforma (cada arista de la malla, fotograma a fotograma,
# frente a su largo en reposo) y primeros planos del hombro, del torso y del cuerpo entero en movimiento.
# Uso: python tools/blender/piel-prueba.py -- personaje.glb movimiento.glb carpeta R|L
#   VOL=1        mezcla con cuaterniones duales («Preserve Volume»: el giro de la articulación sin aplastar el volumen)
#   CLAV=1       el giro de las clavículas pasado al brazo (la piel rígida no tiene clavículas: el hombro no se encoge)
#   RENDER=1     saca los primeros planos (h_ hombro, t_ torso de espaldas, c_ cuerpo entero), FR=10,20 solo esos
#   ANCHO=480
import bpy, sys, os, math, re
import numpy as np
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]
PERS, MOV, OUT, MANO = a[0], a[1], a[2], (a[3] if len(a) > 3 else 'R')
VOL, CLAV, REN = os.environ.get('VOL') == '1', os.environ.get('CLAV') == '1', os.environ.get('RENDER') == '1'
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
# el movimiento: su acción, sin su personaje
bpy.ops.import_scene.gltf(filepath=MOV)
act = bpy.data.actions.get('GolpeReal') or next(x for x in bpy.data.actions if not re.match(r'(Run|Walk)', x.name))
act.use_fake_user = True
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for x in list(bpy.data.actions):
    if x != act: bpy.data.actions.remove(x)
# el personaje
bpy.ops.import_scene.gltf(filepath=PERS)
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT') or (o.type == 'MESH' and o.name.lower().startswith(('icosphere', 'cube'))): bpy.data.objects.remove(o)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
me = next(o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers))
for x in list(bpy.data.actions):
    if x != act: bpy.data.actions.remove(x)
sc = bpy.context.scene
arm.animation_data_create(); arm.animation_data.action = act
if hasattr(arm.animation_data, 'action_slot') and getattr(act, 'slots', None): arm.animation_data.action_slot = act.slots[0]
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1]); sc.frame_start, sc.frame_end = f0, f1
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.pose.bones) else ''
for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
# (las clavículas a su sitio y su giro al brazo: el brazo acaba igual de orientado, girando sobre el hombro quieto)
if CLAV:
    fr_pose = {}
    for fr in range(f0, f1 + 1):
        sc.frame_set(fr)
        fr_pose[fr] = {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in arm.pose.bones}
        for s in ('Left', 'Right'):
            sh, ar = arm.pose.bones[pre + s + 'Shoulder'], arm.pose.bones[pre + s + 'Arm']
            M = ar.matrix.copy(); sh.rotation_quaternion = (1, 0, 0, 0); bpy.context.view_layer.update()
            M.translation = ar.matrix.translation; ar.matrix = M; bpy.context.view_layer.update()
            fr_pose[fr][sh.name] = (sh.rotation_quaternion.copy(), sh.location.copy()); fr_pose[fr][ar.name] = (ar.rotation_quaternion.copy(), ar.location.copy())
    nuevo = bpy.data.actions.new('Clav'); arm.animation_data.action = nuevo
    if hasattr(nuevo, 'slots'):
        try: arm.animation_data.action_slot = nuevo.slots.new(id_type='OBJECT', name='Clav')
        except Exception as e: print('slot', e)
    for fr, d in fr_pose.items():
        for pb in arm.pose.bones:
            q, l = d[pb.name]; pb.rotation_quaternion = q; pb.location = l
            pb.keyframe_insert('rotation_quaternion', frame=fr); pb.keyframe_insert('location', frame=fr)
for m in me.modifiers:
    if m.type == 'ARMATURE': m.use_deform_preserve_volume = VOL
# --- la medida: cuántos centímetros se aparta cada punto de donde lo dejaría su hueso como pieza rígida ---
nv = len(me.data.vertices)
P0 = np.zeros(nv * 3); me.data.vertices.foreach_get('co', P0); P0 = P0.reshape(-1, 3)
nombres = [g.name for g in me.vertex_groups]
dom = np.zeros(nv, dtype=np.int64)
for v in me.data.vertices: dom[v.index] = max(((g.weight, g.group) for g in v.groups), default=(0, 0))[1]
def zona(n):
    b = n.split(':')[-1]
    if re.fullmatch(r'Hips', b): return 'pelvis'
    if re.fullmatch(r'Spine\d?|(Left|Right)Shoulder', b): return 'torso'
    if re.fullmatch(r'Neck', b): return 'cuello'
    if re.fullmatch(r'Head.*|headfront', b): return 'cabeza'
    if re.fullmatch(r'(Left|Right)Arm', b): return 'brazo'
    if re.fullmatch(r'(Left|Right)ForeArm.*', b): return 'antebrazo'
    if re.fullmatch(r'(Left|Right)Hand.*', b): return 'mano'
    return 'piernas'
Z = np.array([zona(nombres[d]) for d in dom]); zonas = ['torso', 'pelvis', 'brazo', 'antebrazo', 'mano', 'cuello', 'cabeza', 'piernas']
A2 = np.array(arm.matrix_world.inverted() @ me.matrix_world); esc = arm.matrix_world.to_scale().x * 100   # (a centímetros)
X0 = (A2[:3, :3] @ P0.T).T + A2[:3, 3]
grupos = {i: np.where(dom == i)[0] for i in np.unique(dom)}
res = {z: [] for z in zonas}; peor = {z: (0.0, 0) for z in zonas}; mas1 = {z: 0 for z in zonas}
for fr in range(f0, f1 + 1):
    sc.frame_set(fr); dg = bpy.context.evaluated_depsgraph_get(); ev = me.evaluated_get(dg); mm = ev.to_mesh()
    P = np.zeros(nv * 3); mm.vertices.foreach_get('co', P); P = P.reshape(-1, 3); ev.to_mesh_clear()
    X = (A2[:3, :3] @ P.T).T + A2[:3, 3]
    dev = np.zeros(nv)
    for i, ix in grupos.items():
        pb = arm.pose.bones.get(nombres[i])
        if pb is None: continue
        B = np.array(pb.matrix @ pb.bone.matrix_local.inverted())
        R = (B[:3, :3] @ X0[ix].T).T + B[:3, 3]
        dev[ix] = np.linalg.norm(X[ix] - R, axis=1) * esc
    for z in zonas:
        d = dev[Z == z]
        if not len(d): continue
        res[z].append(float(np.percentile(d, 99))); mas1[z] = max(mas1[z], int((d > 1.0).sum()))
        if d.max() > peor[z][0]: peor[z] = (float(d.max()), fr)
inf = [f'{os.path.basename(PERS)} con {os.path.basename(MOV)} · volumen {"sí" if VOL else "no"} · clavícula al brazo {"sí" if CLAV else "no"}',
       'cuánto se aparta la piel de su pieza rígida (0 cm = se mueve como un bloque):']
for z in zonas:
    if not res[z]: continue
    n = int((Z == z).sum())
    inf.append(f'  {z:10s} el 99 % de los puntos, como mucho {max(res[z]):5.1f} cm · el peor {peor[z][0]:5.1f} cm (fotograma {peor[z][1] - f0 + 1}) · {mas1[z]} de {n} puntos más de 1 cm')
print('\n'.join(inf)); open(f'{OUT}/medida.txt', 'w').write('\n'.join(inf) + '\n')
if not REN: sys.exit(0)
# --- los primeros planos ---
W = int(os.environ.get('ANCHO', '480'))
if os.environ.get('COLOR') == '1':   # (cada pieza de un color, mezclados en las franjas: para ver de quién es cada trozo)
    COL = {'Hips': (0.9, 0.9, 0.2), 'Spine2': (0.2, 0.4, 1), 'Spine': (0.2, 0.4, 1), 'Spine1': (0.2, 0.4, 1), 'Shoulder': (0.5, 0.2, 1), 'Neck': (1, 0.5, 0), 'Head': (1, 1, 1), 'HeadTop_End': (1, 1, 1),
           'Arm': (1, 0.15, 0.15), 'ForeArm': (0.2, 0.9, 0.3), 'ForeArmTwist': (0.1, 0.6, 0.2), 'Hand': (0.9, 0.2, 0.9), 'UpLeg': (0.3, 0.9, 0.9), 'Leg': (0.6, 0.3, 0.1), 'Foot': (0.4, 0.4, 0.4), 'ToeBase': (0.2, 0.2, 0.2)}
    ca = me.data.color_attributes.new('pieza', 'FLOAT_COLOR', 'POINT')
    for v in me.data.vertices:
        c = Vector((0, 0, 0)); t = 0
        for g in v.groups:
            b = nombres[g.group].split(':')[-1]; b2 = re.sub(r'^(Left|Right)', '', b)
            c += Vector(COL.get(b) or COL.get(b2) or (0.5, 0.5, 0.5)) * g.weight; t += g.weight
        c = c / t if t else c; ca.data[v.index].color = (c.x, c.y, c.z, 1)
    mt = bpy.data.materials.new('pieza'); mt.use_nodes = True; at = mt.node_tree.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'pieza'
    mt.node_tree.links.new(at.outputs['Color'], mt.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    me.data.materials.clear(); me.data.materials.append(mt)
if os.environ.get('MOTOR', 'CYCLES') == 'WB':   # (rápido, para ver la forma: luz de estudio con la textura)
    sc.render.engine = 'BLENDER_WORKBENCH'; sh_ = sc.display.shading; sh_.light = 'STUDIO'; sh_.color_type = 'TEXTURE'; sh_.show_cavity = True; sh_.cavity_type = 'WORLD'
    sh_.background_type = 'VIEWPORT'; sh_.background_color = (0.10, 0.17, 0.16)
else:
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = int(os.environ.get('MUESTRAS', '8')); sc.cycles.use_denoising = True
sc.render.resolution_x = sc.render.resolution_y = W
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True
wd.node_tree.nodes['Background'].inputs[0].default_value = (0.10, 0.17, 0.16, 1); wd.node_tree.nodes['Background'].inputs[1].default_value = 0.8
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(45), 0, math.radians(-25))); bpy.context.object.data.energy = 3.0
bpy.ops.object.light_add(type='AREA', location=(-2, -2, 2.5)); bpy.context.object.data.energy = 150; bpy.context.object.data.size = 3
bpy.ops.object.light_add(type='AREA', location=(2.5, 1.5, 2.2)); bpy.context.object.data.energy = 90; bpy.context.object.data.size = 3
lado = 'Right' if MANO.upper().startswith('R') else 'Left'; sg = -1 if lado == 'Right' else 1
sh, ch, hp = arm.pose.bones[pre + lado + 'Arm'], arm.pose.bones[pre + 'Spine2'], arm.pose.bones[pre + 'Hips']
Mw = arm.matrix_world
bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam
def mira(c, obj): c.rotation_euler = (obj - c.location).to_track_quat('-Z', 'Y').to_euler()
# (la cámara sigue la orientación de la cadera, no la del pecho: así se ve girar el torso sobre ella)
vistas = {
    'h': (lambda: Mw @ sh.head, Vector((sg * 0.55, -0.75, 0.25)), 50),      # el hombro que pega, de frente y de su lado
    'g': (lambda: Mw @ sh.head, Vector((sg * 0.45, 0.80, 0.30)), 50),       # el mismo hombro, por detrás
    't': (lambda: Mw @ ch.head, Vector((0, 1.35, 0.25)), 45),               # el torso entero, de espaldas
    'c': (lambda: Mw @ hp.head + Vector((0, 0, -0.05)), Vector((0, -3.6, 0.5)), 45),  # el cuerpo entero, de frente
}
FR = os.environ.get('FR')
for fr in range(f0, f1 + 1):
    if FR and str(fr - f0 + 1) not in FR.split(','): continue
    sc.frame_set(fr)
    Rrel = Mw.to_3x3().normalized() @ hp.matrix.to_3x3().normalized() @ hp.bone.matrix_local.to_3x3().normalized().inverted() @ Mw.to_3x3().normalized().inverted()
    fw = Rrel @ Vector((0, -1, 0)); fw.z = 0
    R = Matrix.Rotation(math.atan2(fw.y, fw.x) - math.atan2(-1, 0), 3, 'Z') if fw.length > 1e-3 else Matrix.Identity(3)
    for k, (obj, off, lens) in vistas.items():
        o = obj(); cam.location = o + R @ off; cam.data.lens = lens; mira(cam, o)
        if os.environ.get('PICK') and k == 'h':   # (qué hay en ese píxel: vértice, color de textura y pesos)
            bpy.context.view_layer.update(); dgp = bpy.context.evaluated_depsgraph_get()
            from bpy_extras.view3d_utils import region_2d_to_vector_3d
            fx, fy = [float(x) for x in os.environ['PICK'].split(',')]
            fr_ = cam.data.view_frame(scene=sc); tl, bl, br = fr_[0], fr_[2], fr_[1]
            # (esquinas del encuadre en coordenadas de la cámara: [arriba-dcha, abajo-dcha, abajo-izda, arriba-izda])
            q = cam.data.view_frame(scene=sc); ur, lr, ll, ul = q
            pt = ul + (ur - ul) * (fx / W) + (ll - ul) * (fy / W)
            d = (cam.matrix_world.to_3x3() @ pt).normalized()
            hit, loc, nor, fi_, ob, _ = sc.ray_cast(dgp, cam.location, d)
            if hit and ob.name == me.name:
                poly = me.data.polygons[fi_]; uvl = me.data.uv_layers.active.data
                for li, vi in zip(poly.loop_indices, poly.vertices):
                    u_, v_ = uvl[li].uv; print('PICK fr', fr - f0 + 1, 'v', vi, 'uv', round(u_, 4), round(v_, 4), 'pesos', [(nombres[g.group].split(':')[-1], round(g.weight, 2)) for g in me.data.vertices[vi].groups], 'reposo', tuple(round(x, 3) for x in me.matrix_world @ me.data.vertices[vi].co))
            else: print('PICK sin malla', hit, ob.name if hit else None)
        sc.render.filepath = f'{OUT}/{k}_{fr - f0 + 1:04d}.png'; bpy.ops.render.render(write_still=True)
print('render hecho', OUT)
