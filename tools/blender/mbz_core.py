# MENDIMENDIZ · utilidades de Blender (4.2) para construir personajes desde cero con bpy y bmesh.
# Convenciones de la escena: Z arriba, el personaje mira a −Y, pies en z = 0 y centrado en x = 0.
# +X es la izquierda del personaje (los objetos y huesos «Left»/«_L» están en x > 0).
import bpy, bmesh, math, os, sys, json, subprocess
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

V = Vector
TAU = math.tau

def script_args():
    """Argumentos tras «--» (vale para «blender -b -P script.py -- …» y para «python script.py …»)."""
    a = sys.argv
    return a[a.index('--') + 1:] if '--' in a else a[1:]

def smooth01(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

# ------------------------------------------------------------------ escena y colecciones
def new_scene(char):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'; sc.unit_settings.scale_length = 1.0; sc.unit_settings.length_unit = 'METERS'
    sc.render.fps = 30; sc.render.fps_base = 1.0
    bpy.context.preferences.filepaths.save_version = 0      # sin copias .blend1
    root = bpy.data.collections.new(f'CHAR_{char}'); sc.collection.children.link(root)
    cols = {'ROOT': root}
    for n in ('GEO', 'FACE_VARIANTS', 'HAND_VARIANTS', 'ACC', 'RIG'):
        c = bpy.data.collections.new(n); root.children.link(c); cols[n] = c
    ref = bpy.data.collections.new('REF'); sc.collection.children.link(ref); cols['REF'] = ref
    return cols

def ref_image(path, name, coll, size, location, rotation):
    """Empty tipo Image con la lámina de referencia (medidas marcadas)."""
    img = bpy.data.images.load(path, check_existing=True)
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'IMAGE'; e.data = img; e.empty_display_size = size
    e.empty_image_offset = (-0.5, 0.0)
    e.location = location; e.rotation_euler = rotation
    e.show_in_front = False; e.color[3] = 0.5; e.use_empty_image_alpha = True
    e.hide_render = True
    coll.objects.link(e)
    return e

# ------------------------------------------------------------------ bmesh
def bm_new():
    return bmesh.new()

def obj_from_bm(bm, name, coll):
    me = bpy.data.meshes.new(name)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob)
    return ob

def bm_from_obj(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); return bm

def keep_half(bm, eps=1e-5):
    """Deja la mitad x ≥ 0 (la otra la hace el modificador Mirror) y pega al plano los vértices del centro."""
    kill = [v for v in bm.verts if v.co.x < -eps]
    if kill: bmesh.ops.delete(bm, geom=kill, context='VERTS')
    for v in bm.verts:
        if abs(v.co.x) < 1e-4: v.co.x = 0.0

def ring_verts(bm, pts):
    return [bm.verts.new(p) for p in pts]

def bridge(bm, a, b, closed=True, flip=False):
    """Quads entre dos anillos con el mismo número de vértices."""
    n = len(a); faces = []
    for i in range(n if closed else n - 1):
        j = (i + 1) % n
        q = (a[i], a[j], b[j], b[i]) if not flip else (a[i], b[i], b[j], a[j])
        faces.append(bm.faces.new(q))
    return faces

def region_boundary_loop(faces):
    """Vértices del borde de una región de caras, en orden (un solo bucle)."""
    fs = set(faces)
    edges = [e for f in faces for e in f.edges if sum(1 for lf in e.link_faces if lf in fs) == 1]
    nxt = {}
    for e in edges:
        # orientado según la cara de la región para que el bucle tenga sentido constante
        f = next(lf for lf in e.link_faces if lf in fs)
        for l in f.loops:
            if l.edge == e: nxt[l.vert] = l.link_loop_next.vert
    start = next(iter(nxt)); loop = [start]; v = nxt[start]
    while v != start and len(loop) <= len(nxt):
        loop.append(v); v = nxt[v]
    return loop

def inset_rings(bm, faces, n, thickness):
    """Inset de una región n veces: devuelve [anillo_exterior, …, anillo_interior] y las caras finales."""
    rings = [region_boundary_loop(faces)]
    for _ in range(n):
        r = bmesh.ops.inset_region(bm, faces=faces, thickness=thickness, depth=0.0, use_even_offset=True)
        rings.append(region_boundary_loop(faces))
    return rings, faces

def extrude(bm, faces):
    """Extruye una región (como E en Blender): devuelve las caras nuevas y borra las originales."""
    r = bmesh.ops.extrude_face_region(bm, geom=faces)
    new = [g for g in r['geom'] if isinstance(g, bmesh.types.BMFace)]
    bmesh.ops.delete(bm, geom=faces, context='FACES_ONLY')
    return new

def smooth_verts(bm, verts, factor=0.5, repeat=5):
    for _ in range(repeat):
        bmesh.ops.smooth_vert(bm, verts=verts, factor=factor, use_axis_x=True, use_axis_y=True, use_axis_z=True)

def poke_ngons(bm):
    ng = [f for f in bm.faces if len(f.verts) > 4]
    if ng: bmesh.ops.poke(bm, faces=ng)

def clean_bm(bm, dist=0.0001):
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=dist)
    loose = [v for v in bm.verts if not v.link_faces]
    if loose: bmesh.ops.delete(bm, geom=loose, context='VERTS')
    le = [e for e in bm.edges if not e.link_faces]
    if le: bmesh.ops.delete(bm, geom=le, context='EDGES')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])

# ------------------------------------------------------------------ modificadores
def mod_mirror(ob, clip=True):
    m = ob.modifiers.new('Mirror', 'MIRROR')
    m.use_axis = (True, False, False); m.use_clip = clip; m.use_mirror_merge = True; m.merge_threshold = 0.0001
    m.use_mirror_vertex_groups = True
    return m

def mod_subsurf(ob, levels=1):
    m = ob.modifiers.new('Subdivision', 'SUBSURF')
    m.subdivision_type = 'CATMULL_CLARK'; m.levels = levels; m.render_levels = levels; m.quality = 3
    m.uv_smooth = 'PRESERVE_BOUNDARIES'
    return m

def mod_wnormal(ob):
    m = ob.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL'); m.weight = 50; m.keep_sharp = True
    return m

def mod_solidify(ob, thickness=0.01, offset=1.0):
    m = ob.modifiers.new('Solidify', 'SOLIDIFY')
    m.thickness = thickness; m.offset = offset; m.use_even_offset = True; m.use_quality_normals = True; m.use_rim = True
    return m

def mod_bevel(ob, width=0.012, segments=3):
    """Bevel de 0,012 con 3 segmentos y Harden Normals. En una cage de pocas caras el límite por ángulo (30°)
    achaflanaría casi todas las aristas, así que se limita al peso de bevel puesto en los bordes de la prenda."""
    m = ob.modifiers.new('Bevel', 'BEVEL')
    m.width = width; m.segments = segments; m.harden_normals = True
    m.angle_limit = math.radians(30); m.limit_method = 'WEIGHT'
    return m

def mark_rim_bevel(ob):
    """Peso de bevel 1 en los bordes de verdad de la prenda (cuello, puños, dobladillos, aberturas), no en el plano del Mirror."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bw = bm.edges.layers.float.get('bevel_weight_edge') or bm.edges.layers.float.new('bevel_weight_edge')
    for e in bm.edges:
        on_plane = abs(e.verts[0].co.x) < 1e-4 and abs(e.verts[1].co.x) < 1e-4
        e[bw] = 1.0 if (e.is_boundary and not on_plane) else 0.0
    bm.to_mesh(ob.data); bm.free()

def mod_shrinkwrap(ob, target, offset=0.006, method='TARGET_PROJECT'):
    m = ob.modifiers.new('Shrinkwrap', 'SHRINKWRAP')
    m.target = target; m.wrap_method = method; m.offset = offset
    return m

def apply_mod(ob, name):
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=name)

def cage_mods(ob, mirror=True, subsurf=True):
    """Pila del encargo para mallas simétricas: Mirror → Subdivision Surface → Weighted Normal."""
    if mirror: mod_mirror(ob)
    if subsurf: mod_subsurf(ob)
    mod_wnormal(ob)

def shade_smooth(ob):
    for p in ob.data.polygons: p.use_smooth = True

def mark_material_seams_sharp(ob):
    """Bordes duros solo en las costuras entre materiales."""
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    for e in bm.edges:
        e.smooth = True
        if len(e.link_faces) == 2 and e.link_faces[0].material_index != e.link_faces[1].material_index: e.smooth = False
    bm.to_mesh(me); bm.free()

def link_to(ob, coll):
    for c in list(ob.users_collection): c.objects.unlink(ob)
    coll.objects.link(ob)

def delete_obj(ob):
    me = ob.data if ob.type in ('MESH', 'CURVE') else None
    bpy.data.objects.remove(ob, do_unlink=True)
    if me and me.users == 0:
        (bpy.data.meshes if isinstance(me, bpy.types.Mesh) else bpy.data.curves).remove(me)

# ------------------------------------------------------------------ superficie de referencia (rayos)
class Surface:
    """BVH de una malla evaluada para proyectar puntos sobre ella."""
    def __init__(self, ob):
        dg = bpy.context.evaluated_depsgraph_get()
        ev = ob.evaluated_get(dg); me = ev.to_mesh()
        mw = ob.matrix_world
        verts = [mw @ v.co for v in me.vertices]; polys = [tuple(p.vertices) for p in me.polygons]
        self.bvh = BVHTree.FromPolygons(verts, polys)
        ev.to_mesh_clear()
    def nearest(self, p):
        loc, n, i, d = self.bvh.find_nearest(p)
        return loc, n
    def ray(self, origin, direction):
        loc, n, i, d = self.bvh.ray_cast(origin, direction.normalized())
        return loc, n

# ------------------------------------------------------------------ materiales (solo Principled + Image Texture en Base Color)
def principled_material(name, image=None, rough=0.5, metal=0.0, emission=None, emission_strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Specular IOR Level'].default_value = 0.5
    if image is not None:
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image; tex.location = (-400, 250)
        tex.interpolation = 'Linear'
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if emission is not None:
        bsdf.inputs['Base Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return m

def new_image(name, size, path, color=(0.5, 0.5, 0.5, 1)):
    img = bpy.data.images.new(name, size, size, alpha=False)
    img.generated_color = color
    img.filepath_raw = path; img.file_format = 'PNG'
    img.colorspace_settings.name = 'sRGB'
    return img

# ------------------------------------------------------------------ esqueleto
def pose_matrix_parent(arm, bone_name):
    """Matriz de mundo del padre cuando se emparenta a un hueso (se toma la cola del hueso)."""
    b = arm.data.bones[bone_name]
    return arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))

def parent_to_bone(ob, arm, bone_name):
    """Parent → Bone sin mover la malla: la inversa queda en matrix_parent_inverse y la transformación a cero."""
    ob.parent = arm; ob.parent_type = 'BONE'; ob.parent_bone = bone_name
    ob.matrix_parent_inverse = pose_matrix_parent(arm, bone_name).inverted()
    ob.matrix_basis = Matrix.Identity(4)

def set_deform(arm, names):
    for b in arm.data.bones: b.use_deform = b.name in names

def auto_weights(ob, arm, deform_bones, all_deform):
    """Parent with Automatic Weights solo con los huesos indicados; luego Clean 0,01, Limit Total 4 y Normalize All."""
    set_deform(arm, deform_bones)
    for o in bpy.context.view_layer.objects: o.select_set(False)
    ob.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    set_deform(arm, all_deform)
    ob.parent = None; ob.matrix_world = Matrix.Identity(4)
    weights_cleanup(ob)
    move_armature_mod_last(ob)

def weights_cleanup(ob):
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
        bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.01, keep_single=True)
        bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)

def armature_mod(ob, arm):
    m = ob.modifiers.get('Armature') or ob.modifiers.new('Armature', 'ARMATURE')
    m.object = arm; m.use_vertex_groups = True
    move_armature_mod_last(ob)
    return m

def move_armature_mod_last(ob):
    for m in ob.modifiers:
        if m.type == 'ARMATURE':
            with bpy.context.temp_override(object=ob):
                bpy.ops.object.modifier_move_to_index(modifier=m.name, index=len(ob.modifiers) - 1)

def set_weights(ob, fn):
    """fn(co) → {hueso: peso}; crea los grupos y asigna (manual, para pelo y pañuelo)."""
    groups = {}
    for v in ob.data.vertices:
        w = fn(v.co)
        s = sum(w.values()) or 1.0
        for n, x in w.items():
            if x <= 0: continue
            g = groups.get(n) or ob.vertex_groups.get(n) or ob.vertex_groups.new(name=n); groups[n] = g
            g.add([v.index], x / s, 'REPLACE')

# ------------------------------------------------------------------ animación
class Poser:
    """Poses como giros en el mundo respecto al reposo {hueso: Quaternion} (los que faltan siguen al padre).
    Se pasan a giros locales: L = D_padre⁻¹ · D_hueso ; P = r⁻¹ · L · r (r = orientación del hueso en reposo)."""
    def __init__(self, arm):
        self.arm = arm
        self.rest_q = {b.name: b.matrix_local.to_quaternion() for b in arm.data.bones}
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
        self.order = [b.name for b in arm.data.bones]
        for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    def apply(self, pose):
        D = {}; pbs = self.arm.pose.bones
        for n in self.order:
            p = self.parent[n]; Dp = D.get(p, Quaternion()) if p else Quaternion()
            D[n] = pose.get(n, Dp)
            L = Dp.inverted() @ D[n]; r = self.rest_q[n]
            pbs[n].rotation_quaternion = r.inverted() @ L @ r
            if n == 'Hips':
                loc = pose.get('_hips_loc', V())
                pbs[n].location = r.inverted() @ loc
    def rest(self):
        for pb in self.arm.pose.bones:
            pb.rotation_quaternion = Quaternion(); pb.location = V(); pb.scale = V((1, 1, 1))

def make_action(poser, name, frames, pose_fn, loop=True, step=2, props=None):
    """Una Action por clip, con Fake User, claves Bézier con asas Auto Clamped y ciclo cerrado (último = primero)."""
    arm = poser.arm
    arm.animation_data_create()
    act = bpy.data.actions.new(name); act.use_fake_user = True
    arm.animation_data.action = act
    keys = sorted(set(list(range(0, frames, step)) + [frames]))
    for f in keys:
        t = (f % frames if loop else f) / 30.0
        poser.apply(pose_fn(t, frames / 30.0))
        for pb in arm.pose.bones:
            pb.keyframe_insert('rotation_quaternion', frame=f, group=pb.name)
            if pb.name == 'Hips': pb.keyframe_insert('location', frame=f, group=pb.name)
    # los huesos que no se mueven del reposo en todo el clip no llevan curva (el GLB pesa menos);
    # ojos, pelo y pañuelo se conservan siempre porque el juego los retoca después del mixer
    rest = (1.0, 0.0, 0.0, 0.0)
    for pb in arm.pose.bones:
        if pb.name.startswith(('Eye_', 'Hair_', 'Scarf_')): continue
        path = f'pose.bones["{pb.name}"].rotation_quaternion'
        fcs = [act.fcurves.find(path, index=i) for i in range(4)]
        if all(fc and all(abs(k.co[1] - rest[i]) < 1e-4 for k in fc.keyframe_points) for i, fc in enumerate(fcs)):
            for fc in fcs: act.fcurves.remove(fc)
    for fc in act.fcurves:
        for k in fc.keyframe_points:
            k.interpolation = 'BEZIER'; k.handle_left_type = 'AUTO_CLAMPED'; k.handle_right_type = 'AUTO_CLAMPED'
        fc.update()
    act.frame_range = (0, frames); act.use_frame_range = True
    for k, v in (props or {}).items(): act[k] = v
    arm.animation_data.action = None
    poser.rest()
    return act

# ------------------------------------------------------------------ exportación
def export_glb(path, objects):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objects:
        o.hide_set(False); o.hide_viewport = False; o.select_set(True)
    bpy.context.view_layer.objects.active = next(o for o in objects if o.type == 'ARMATURE')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB',
        use_selection=True, export_extras=True, export_cameras=False, export_lights=False,
        export_yup=True, export_apply=True,
        export_texcoords=True, export_normals=True, export_tangents=False, export_vertex_color='NONE',
        export_materials='EXPORT', export_image_format='AUTO',
        export_morph=False,
        export_rest_position_armature=True, export_def_bones=False, export_hierarchy_flatten_bones=False,
        export_skins=True, export_all_influences=False, export_influence_nb=4,
        export_draco_mesh_compression_enable=False,
        export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1,
        export_optimize_animation_size=True, export_optimize_animation_keep_anim_armature=False, export_anim_single_armature=True, export_reset_pose_bones=True,
    )

def export_copy(objs, name, coll, arm, skip=()):
    """Copia para exportar: aplica todos los modificadores salvo Armature (y los de `skip`) y une las piezas en una malla."""
    copies = []
    for ob in objs:
        c = ob.copy(); c.data = ob.data.copy(); coll.objects.link(c)
        for m in list(c.modifiers):
            if m.type == 'ARMATURE' or m.type in skip: c.modifiers.remove(m); continue
            apply_mod(c, m.name)
        copies.append(c)
    base = copies[0]
    if len(copies) > 1:
        with bpy.context.temp_override(active_object=base, object=base, selected_objects=copies, selected_editable_objects=copies):
            bpy.ops.object.join()
    base.name = name; base.data.name = name
    armature_mod(base, arm)
    return base

def validate(path, root):
    code = ("const v=require('gltf-validator'),fs=require('fs');"
            "v.validateBytes(new Uint8Array(fs.readFileSync(process.argv[1]))).then(r=>console.log(JSON.stringify({"
            "errores:r.issues.numErrors,avisos:r.issues.numWarnings,info:r.issues.numInfos,"
            "mensajes:r.issues.messages.filter(m=>m.severity<3).slice(0,12).map(m=>m.code+' '+m.pointer+': '+m.message)})))")
    r = subprocess.run(['node', '-e', code, path], capture_output=True, text=True, cwd=root)
    try: return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: return {'error': (r.stderr or r.stdout)[-600:]}

def glb_json(path):
    import struct
    b = open(path, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]
    return json.loads(b[20:20 + n])

# ------------------------------------------------------------------ render (Eevee)
def setup_render(res=(900, 1200), samples=24, world=(0.72, 0.8, 0.88)):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.eevee.taa_render_samples = samples
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    if not sc.world: sc.world = bpy.data.worlds.new('World')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*world, 1); bg.inputs['Strength'].default_value = 0.9
    return sc

def add_lights(coll):
    out = []
    for name, rot, energy, color in (('Key', (0.9, 0.15, 0.55), 3.2, (1, 0.96, 0.9)), ('Fill', (1.1, 0.0, -0.9), 1.1, (0.85, 0.9, 1.0)),
                                      ('Rim', (-0.9, 0.0, 2.8), 2.0, (1, 1, 1))):
        l = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN')); l.data.energy = energy; l.data.color = color
        l.rotation_euler = rot; coll.objects.link(l); out.append(l)
    return out

def camera(coll, name='Cam', lens=85):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name)); c.data.lens = lens; c.data.clip_start = 0.05; c.data.clip_end = 100
    coll.objects.link(c); bpy.context.scene.camera = c
    return c

def aim(cam, target, yaw, dist, height=None, pitch=0.0):
    """Cámara a una distancia del objetivo; yaw 0 = de frente (desde −Y), π/2 = perfil izquierdo."""
    t = V(target)
    h = t.z if height is None else height
    cam.location = V((t.x + math.sin(yaw) * dist, t.y - math.cos(yaw) * dist, h))
    d = t - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
