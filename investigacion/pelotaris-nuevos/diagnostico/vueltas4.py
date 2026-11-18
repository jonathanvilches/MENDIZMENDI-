# vueltas4.py -- modelo.glb salida.png : frente, tres cuartos, perfil y espalda, en reposo, a buen tamaño
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; ENT, SAL = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ENT)
sc = bpy.context.scene; ms = [o for o in sc.objects if o.type == 'MESH' and len(o.data.vertices) > 1000]
for o in sc.objects:
    if o.type == 'MESH' and o not in ms: o.hide_render = True
for o in sc.objects:
    if o.type == 'ARMATURE' and o.animation_data: o.animation_data.action = None
    if o.type == 'ARMATURE':
        for pb in o.pose.bones: pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get(); mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in ms:
    e = o.evaluated_get(dg)
    for v in e.data.vertices: p = e.matrix_world @ v.co; mn = Vector(map(min, mn, p)); mx = Vector(map(max, mx, p))
cen = (mn + mx) / 2; h = mx.z - mn.z
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = h * 1.08
for e, ang, en in (('sol', (0.95, 0.1, 0.6), 3.2), ('rel', (1.2, 0, 3.6), 1.6), ('fr', (1.3, 0, -0.9), 1.2)):
    L = bpy.data.objects.new(e, bpy.data.lights.new(e, 'SUN')); sc.collection.objects.link(L); L.rotation_euler = ang; L.data.energy = en
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.80, 0.81, 0.84, 1); sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 560, 1080; sc.view_settings.view_transform = 'Standard'
for i, ang in enumerate((0, 40, 90, 180)):
    r = math.radians(ang); d = h * 3
    cam.location = cen + Vector((math.sin(r) * d, -math.cos(r) * d, 0)); cam.rotation_euler = (math.pi / 2, 0, r)
    sc.render.filepath = SAL.replace('.png', f'-{i}.png'); bpy.ops.render.render(write_still=True)
