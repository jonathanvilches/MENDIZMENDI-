# Renderiza un personaje GLB (o la escena ya montada por otro guion) en cuatro vistas y un primer plano de la cara.
# Uso: python3 vistas.py -- <entrada.glb> <prefijo_salida> [ancho]
import bpy, sys, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]; W = int(argv[2]) if len(argv) > 2 and argv[2].isdigit() else 640

def escena(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)

def montar():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
    sc.render.film_transparent = False; sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.16, 0.12, 0.24, 1); bg.inputs[1].default_value = 0.6
    def luz(nombre, tipo, pos, energia, color=(1, 1, 1), size=1.5):
        d = bpy.data.lights.new(nombre, tipo); d.energy = energia; d.color = color
        if tipo == 'AREA': d.size = size
        o = bpy.data.objects.new(nombre, d); sc.collection.objects.link(o); o.location = pos
        o.rotation_euler = (Vector((0, 0, 0.9)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    luz('clave', 'AREA', (1.6, -2.4, 2.6), 420, (1, 0.96, 0.9), 2.2)
    luz('relleno', 'AREA', (-2.4, -1.6, 1.4), 160, (0.85, 0.9, 1.0), 2.5)
    luz('contra', 'AREA', (0.4, 2.6, 2.4), 260, (1, 0.85, 1.0), 1.5)
    # suelo
    bpy.ops.mesh.primitive_plane_add(size=8); s = bpy.context.object; m = bpy.data.materials.new('suelo'); m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.2, 0.16, 0.3, 1); s.data.materials.append(m)

def caja():
    pts = [o.matrix_world @ Vector(c) for o in bpy.data.objects if o.type == 'MESH' and o.name != 'Plane' for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx

def render(nombre, yaw, alto, foco, dist, lente=50, h=None):
    sc = bpy.context.scene
    cam = bpy.data.objects.get('cam') or bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
    sc.camera = cam; cam.data.lens = lente
    a = math.radians(yaw); cam.location = Vector((math.sin(a) * dist, -math.cos(a) * dist, alto))
    cam.rotation_euler = (foco - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = W; sc.render.resolution_y = h or int(W * 4 / 3)
    sc.render.filepath = f'{out}-{nombre}.png'; bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    if src.endswith('.glb'): escena(src)
    else: bpy.ops.wm.open_mainfile(filepath=src)
    montar(); mn, mx = caja(); H = mx.z - mn.z; c = Vector((0, 0, mn.z + H * 0.5))
    print('ALTO', round(H, 3), 'ANCHO', round(mx.x - mn.x, 3))
    for n, y in (('frente', 0), ('tres-cuartos', 35), ('lado', 90), ('espalda', 180)): render(n, y, mn.z + H * 0.55, c, H * 2.7)
    render('cara', 20, mn.z + H * 0.84, Vector((0, 0, mn.z + H * 0.82)), H * 0.95, 70, W)
