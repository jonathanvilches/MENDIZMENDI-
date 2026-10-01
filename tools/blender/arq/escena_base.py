"""Escena base del encargo de modelado (punto 2): unidades, fps, gestión de color, colecciones raíz,
maniquí de validación de 1,75 m, cámaras CAM_Front / CAM_Side / CAM_34 / CAM_Player y luz de validación."""
import bpy, math
from mathutils import Vector

ROOT_COLS = ('REF', 'BLOCKOUT', 'HIGH', 'LOW', 'LOD', 'RIG', 'COLLIDERS', 'EXPORT')

def configurar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    us = sc.unit_settings; us.system = 'METRIC'; us.scale_length = 1.0; us.length_unit = 'METERS'; us.mass_unit = 'KILOGRAMS'
    sc.render.fps = 30; sc.render.fps_base = 1.0
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    cols = {}
    for n in ROOT_COLS:
        c = bpy.data.collections.new(n); sc.collection.children.link(c); cols[n] = c
    # REF no se exporta ni sale en renders finales
    cols['REF'].hide_render = False
    return sc, cols

def maniqui(col, pos=(0, 0, 0), alto=1.75):
    """Maniquí sencillo de 1,75 m (proporción de 7,5 cabezas), para comparar escalas."""
    import bmesh
    me = bpy.data.meshes.new('REF_Maniqui_175'); bm = bmesh.new()
    k = alto / 1.75
    def caja(cx, cy, cz, sx, sy, sz):
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']: v.co = Vector((cx + v.co.x * sx, cy + v.co.y * sy, cz + v.co.z * sz)) * 1.0
    def esfera(cx, cy, cz, rad):
        r = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=rad)
        for v in r['verts']: v.co += Vector((cx, cy, cz))
    esfera(0, 0, 1.625 * k, 0.115 * k)                      # cabeza (coronilla a 1,75)
    caja(0, 0, 1.25 * k, 0.40 * k, 0.22 * k, 0.50 * k)      # tronco
    caja(0, 0, 0.95 * k, 0.34 * k, 0.20 * k, 0.16 * k)      # cadera
    for s in (-1, 1):
        caja(s * 0.10 * k, 0, 0.46 * k, 0.13 * k, 0.14 * k, 0.86 * k)   # piernas
        caja(s * 0.27 * k, 0, 1.17 * k, 0.09 * k, 0.10 * k, 0.62 * k)   # brazos
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('REF_Maniqui_175', me); ob.location = pos; col.objects.link(ob)
    mat = bpy.data.materials.new('MAT_Ref_Maniqui'); mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.85, 0.35, 0.1, 1)
    me.materials.append(mat)
    return ob

def camara(nombre, col, loc, mira, lens=None, fov_v=None):
    cam = bpy.data.objects.new(nombre, bpy.data.cameras.new(nombre)); col.objects.link(cam)
    cam.location = loc; d = Vector(mira) - Vector(loc); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if fov_v:
        cam.data.sensor_fit = 'VERTICAL'; cam.data.angle_y = math.radians(fov_v)
    elif lens: cam.data.lens = lens
    cam.data.clip_end = 2000
    return cam

def luz_validacion(col):
    """Sun de 3 W/m² a 45° de elevación + cielo neutro de intensidad 1 (sin HDRI externo: no hay acceso a recursos CC0
    desde este entorno, así que se usa un fondo gris neutro uniforme equivalente)."""
    sun = bpy.data.objects.new('LGT_Sun_Validacion', bpy.data.lights.new('LGT_Sun_Validacion', 'SUN'))
    sun.data.energy = 3.0; sun.rotation_euler = (math.radians(45), 0, math.radians(-35)); col.objects.link(sun)
    w = bpy.data.worlds.new('WLD_Neutro'); bpy.context.scene.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.5, 0.5, 0.5, 1); bg.inputs[1].default_value = 1.0
    return sun

def render(cam, ruta, res=(1280, 720), motor='BLENDER_EEVEE_NEXT', muestras=32):
    sc = bpy.context.scene; sc.camera = cam
    sc.render.engine = motor; sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    if motor.startswith('BLENDER_EEVEE'): sc.eevee.taa_render_samples = muestras
    sc.render.filepath = ruta; bpy.ops.render.render(write_still=True)
