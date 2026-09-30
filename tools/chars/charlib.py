# Biblioteca del generador de personajes de MENDIMENDIZ (Blender 4.x, se ejecuta con `python3`
# gracias al módulo bpy). Construye personajes originales por piezas, con esqueleto compatible
# con Mixamo, pesos calculados, atlas de texturas pintados y clips de animación, y los exporta a
# glTF binario (.glb) siguiendo el encargo técnico:
#   · 1 unidad = 1 m, Z arriba en Blender (Y arriba en glTF), el personaje mira a -Y en Blender
#     (+Z en glTF), origen entre los pies a la altura del suelo.
#   · Mallas separadas con nombres exactos; las variantes de cara y manos se exportan todas y el
#     juego muestra una de cada grupo (propiedad extra `default`).
#   · Máx. 4 influencias por vértice, pesos normalizados, máx. 60 huesos, máx. 4 materiales.
import bpy, bmesh, math, os, json
from mathutils import Vector, Quaternion, Matrix, Euler
from PIL import Image, ImageDraw, ImageFilter

TAU = math.pi * 2

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.fps = 30
    s.unit_settings.system = 'METRIC'; s.unit_settings.scale_length = 1.0

# ------------------------------------------------------------------ esqueleto
class Rig:
    """Esqueleto en pose T. bones: nombre → (cabeza, cola, padre)."""
    def __init__(self, name):
        self.data = bpy.data.armatures.new(name + '_Rig')
        self.obj = bpy.data.objects.new('Armature', self.data)
        bpy.context.collection.objects.link(self.obj)
        self.specs = {}
    def add(self, name, head, tail, parent=None, roll=0.0):
        self.specs[name] = (Vector(head), Vector(tail), parent, roll)
        return self
    def build(self):
        bpy.context.view_layer.objects.active = self.obj
        bpy.ops.object.mode_set(mode='EDIT')
        eb = self.data.edit_bones
        for n, (h, t, p, roll) in self.specs.items():
            b = eb.new(n); b.head = h; b.tail = t; b.roll = roll
        for n, (h, t, p, roll) in self.specs.items():
            if p: eb[n].parent = eb[p]; eb[n].use_connect = False
        bpy.ops.object.mode_set(mode='OBJECT')
        return self
    def rest(self, name):
        return self.data.bones[name].matrix_local
    def socket(self, name, bone, offset=(0, 0, 0)):
        e = bpy.data.objects.new(name, None); e.empty_display_size = 0.05
        bpy.context.collection.objects.link(e)
        e.parent = self.obj; e.parent_type = 'BONE'; e.parent_bone = bone
        # con padre de tipo hueso la posición es relativa a la COLA del hueso
        b = self.data.bones[bone]
        world = self.obj.matrix_world @ b.matrix_local
        tail_w = self.obj.matrix_world @ b.tail_local
        e.matrix_world = Matrix.Translation(tail_w + Vector(offset)) @ Matrix.Identity(4)
        return e

# ------------------------------------------------------------------ geometría
class Part:
    """Una pieza de malla con sus UV (0..1 locales) y sus pesos por vértice."""
    def __init__(self):
        self.verts = []; self.faces = []; self.uvs = []   # uvs por esquina de cara
        self.w = []                                        # lista de dicts hueso→peso por vértice
        self.region = None                                  # zona del atlas: (u0, v0, u1, v1)
    def off(self): return len(self.verts)

def loft(rings, seg, weight_fn, cap0=True, cap1=True, closed=True):
    """rings: lista de (centro, eje_u, eje_v, rx, ry) — secciones elípticas; se unen con quads.
    Devuelve una Part con UV cilíndricas (u alrededor, v a lo largo)."""
    P = Part(); n = len(rings)
    for i, (c, eu, ev, rx, ry) in enumerate(rings):
        for j in range(seg):
            a = j / seg * TAU
            p = c + eu * (math.sin(a) * rx) + ev * (math.cos(a) * ry)
            P.verts.append(p); P.w.append(weight_fn(p, i, n))
    for i in range(n - 1):
        for j in range(seg if closed else seg - 1):
            j2 = (j + 1) % seg
            a, b, cc, d = i * seg + j, i * seg + j2, (i + 1) * seg + j2, (i + 1) * seg + j
            P.faces.append((a, b, cc, d))
            u0, u1 = j / seg, (j + 1) / seg
            v0, v1 = i / (n - 1), (i + 1) / (n - 1)
            P.uvs.append(((u0, v0), (u1, v0), (u1, v1), (u0, v1)))
    for cap, i in ((cap0, 0), (cap1, n - 1)):
        if not cap: continue
        c = rings[i][0]; ci = len(P.verts); P.verts.append(c); P.w.append(weight_fn(c, i, n))
        vv = 0.0 if i == 0 else 1.0
        for j in range(seg):
            j2 = (j + 1) % seg
            a, b = i * seg + j, i * seg + j2
            P.faces.append((a, b, ci) if i else (b, a, ci))
            uv = ((j / seg, vv), ((j + 1) / seg, vv), ((j + 0.5) / seg, vv))
            P.uvs.append(uv if i else (uv[1], uv[0], uv[2]))
    return P

def sphere(center, r, rings=12, seg=16, shape=None, weight_fn=None, squash=(1, 1, 1)):
    """Esfera en quads (polos en triángulos). shape(p_local, lat, lon) → p_local deformado."""
    P = Part(); c = Vector(center)
    for i in range(1, rings):
        lat = math.pi * i / rings - math.pi / 2
        for j in range(seg):
            lon = j / seg * TAU
            # lon = 0 por detrás (+Y), lon = π al frente (-Y): la costura de las UV queda en la nuca
            p = Vector((math.sin(lon) * math.cos(lat), math.cos(lon) * math.cos(lat), math.sin(lat)))
            p = Vector((p.x * r * squash[0], p.y * r * squash[1], p.z * r * squash[2]))
            if shape: p = shape(p, lat, lon)
            P.verts.append(c + p)
    bot = len(P.verts); P.verts.append(c + Vector((0, 0, -r * squash[2])) if not shape else c + shape(Vector((0, 0, -r * squash[2])), -math.pi / 2, 0))
    top = len(P.verts); P.verts.append(c + Vector((0, 0, r * squash[2])) if not shape else c + shape(Vector((0, 0, r * squash[2])), math.pi / 2, 0))
    rr = rings - 1
    for i in range(rr - 1):
        for j in range(seg):
            j2 = (j + 1) % seg
            a, b, cc, d = i * seg + j, i * seg + j2, (i + 1) * seg + j2, (i + 1) * seg + j
            P.faces.append((a, b, cc, d))
            P.uvs.append(((j / seg, i / rr), ((j + 1) / seg, i / rr), ((j + 1) / seg, (i + 1) / rr), (j / seg, (i + 1) / rr)))
    for j in range(seg):
        j2 = (j + 1) % seg
        P.faces.append((j2, j, bot)); P.uvs.append((((j + 1) / seg, 0), (j / seg, 0), ((j + .5) / seg, 0)))
        a, b = (rr - 1) * seg + j, (rr - 1) * seg + j2
        P.faces.append((a, b, top)); P.uvs.append(((j / seg, 1), ((j + 1) / seg, 1), ((j + .5) / seg, 1)))
    wf = weight_fn or (lambda p, *a: {})
    P.w = [wf(v) for v in P.verts]
    return P

def merge(parts):
    out = Part()
    for p in parts:
        o = out.off()
        out.verts += p.verts; out.w += p.w
        for f, uv in zip(p.faces, p.uvs):
            out.faces.append(tuple(i + o for i in f))
            if p.region:
                u0, v0, u1, v1 = p.region
                uv = tuple((u0 + (u1 - u0) * u, v0 + (v1 - v0) * v) for u, v in uv)
            out.uvs.append(uv)
    return out

def to_object(name, part, material, rig=None, extras=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in part.verts]
    uvl = bm.loops.layers.uv.new('UVMap')
    for f, uv in zip(part.faces, part.uvs):
        try: face = bm.faces.new([vs[i] for i in f])
        except ValueError: continue
        face.smooth = smooth
        for loop, (u, v) in zip(face.loops, uv): loop[uvl].uv = (u, v)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(material)
    if rig:
        groups = {}
        for i, w in enumerate(part.w):
            # máx. 4 influencias, normalizadas
            items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
            s = sum(x for _, x in items) or 1
            for b, x in items:
                if x <= 0: continue
                g = groups.get(b) or ob.vertex_groups.new(name=b); groups[b] = g
                g.add([i], x / s, 'REPLACE')
        # sin padre: la malla con esqueleto queda como nodo raíz (sin avisos del validador)
        m = ob.modifiers.new('Armature', 'ARMATURE'); m.object = rig.obj
    for k, v in (extras or {}).items(): ob[k] = v
    return ob

# pesos: mezcla suave entre huesos a lo largo de un segmento
def blend(a, b, t, band=0.25):
    """t en 0..1 a lo largo del segmento a→b; mezcla sólo cerca de la articulación."""
    k = min(1, max(0, (t - (1 - band)) / band)) if b else 0
    k = k * k * (3 - 2 * k)
    return {a: 1 - k, b: k} if b and k > 0 else {a: 1.0}

def smoothstep(a, b, x):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

# ------------------------------------------------------------------ materiales y atlas
def material(name, img_path=None, rough=0.7, metal=0.0, mr_path=None, emissive_img=None, emissive_strength=0.0, alpha_clip=None, clamp=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['Metallic'].default_value = metal
    if img_path:
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(img_path); tex.interpolation = 'Linear'
        if clamp: tex.extension = 'EXTEND'
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        if alpha_clip is not None:
            nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
            m.blend_method = 'CLIP'; m.alpha_threshold = alpha_clip
    if mr_path:
        mt = nt.nodes.new('ShaderNodeTexImage'); mt.image = bpy.data.images.load(mr_path); mt.image.colorspace_settings.name = 'Non-Color'
        sep = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(mt.outputs['Color'], sep.inputs['Color'])
        nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness']); nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    if emissive_img:
        et = nt.nodes.new('ShaderNodeTexImage'); et.image = bpy.data.images.load(emissive_img)
        nt.links.new(et.outputs['Color'], bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = emissive_strength
    return m

class Atlas:
    """Reparte rectángulos en una textura (4 px de margen entre islas) y deja pintarlos por (u, v)."""
    def __init__(self, size, cols, rows, bg=(255, 255, 255, 255)):
        self.size = size; self.cols = cols; self.rows = rows; self.cells = {}; self.pad = 4
        self.img = Image.new('RGBA', (size, size), bg); self.d = ImageDraw.Draw(self.img)
        self.mr = Image.new('RGB', (size, size), (0, 190, 0)); self.dm = ImageDraw.Draw(self.mr)   # G = rugosidad, B = metal
        self.used = [[False] * cols for _ in range(rows)]
    def cell(self, name, span=(1, 1)):
        for r in range(self.rows - span[1] + 1):
            for c in range(self.cols - span[0] + 1):
                if all(not self.used[r + y][c + x] for y in range(span[1]) for x in range(span[0])):
                    for y in range(span[1]):
                        for x in range(span[0]): self.used[r + y][c + x] = True
                    cw, ch = self.size / self.cols, self.size / self.rows
                    x0, y0 = c * cw + self.pad, r * ch + self.pad
                    x1, y1 = (c + span[0]) * cw - self.pad, (r + span[1]) * ch - self.pad
                    self.cells[name] = (x0, y0, x1, y1)
                    return (x0 / self.size, 1 - y1 / self.size, x1 / self.size, 1 - y0 / self.size)
        raise RuntimeError('atlas lleno: ' + name)
    def px(self, name, u, v):
        x0, y0, x1, y1 = self.cells[name]
        return (x0 + (x1 - x0) * u, y0 + (y1 - y0) * (1 - v))
    def fill(self, name, color, rough=0.75, metal=0.0):
        x0, y0, x1, y1 = self.cells[name]; p = self.pad
        self.d.rectangle([x0 - p, y0 - p, x1 + p, y1 + p], fill=color)
        self.dm.rectangle([x0 - p, y0 - p, x1 + p, y1 + p], fill=(0, int(rough * 255), int(metal * 255)))
    def band(self, name, v0, v1, color, rough=0.75, metal=0.0, u0=0.0, u1=1.0):
        """Pinta una franja (v0..v1 a lo largo, u0..u1 alrededor) de una celda."""
        x0, y0 = self.px(name, u0, v1); x1, y1 = self.px(name, u1, v0)
        p = self.pad if (u0 == 0 or u1 == 1) else 0
        self.d.rectangle([x0 - (p if u0 == 0 else 0), y0, x1 + (p if u1 == 1 else 0), y1], fill=color)
        self.dm.rectangle([x0, y0, x1, y1], fill=(0, int(rough * 255), int(metal * 255)))
    def dot(self, name, u, v, r, color, rough=0.5, metal=0.0):
        x, y = self.px(name, u, v)
        self.d.ellipse([x - r, y - r, x + r, y + r], fill=color)
        self.dm.ellipse([x - r, y - r, x + r, y + r], fill=(0, int(rough * 255), int(metal * 255)))
    def save(self, path, mr_path=None):
        self.img.convert('RGB').save(path)
        if mr_path: self.mr.save(mr_path)
        return path

# ------------------------------------------------------------------ animación
class Anim:
    """Clips a 30 fps. pose_fn(t, dur) → {hueso: giro en el mundo respecto al reposo (Quaternion)}
    y opcionalmente '_hips_loc': Vector de desplazamiento de la cadera. Los huesos que no aparecen
    siguen a su padre. Se convierte a giros locales: L = D_padre⁻¹ · D_hueso, P = r⁻¹ · L · r."""
    def __init__(self, rig):
        self.rig = rig; self.obj = rig.obj; self.obj.animation_data_create(); self.clips = []
        self.rest_q = {b.name: b.matrix_local.to_quaternion() for b in rig.data.bones}
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
        self.order = [b.name for b in rig.data.bones]   # los padres van antes que los hijos
    def clip(self, name, dur, pose_fn, loop=True, extras=None):
        act = bpy.data.actions.new(name); self.obj.animation_data.action = act
        frames = max(1, round(dur * 30))
        pbs = self.obj.pose.bones
        for pb in pbs: pb.rotation_mode = 'QUATERNION'
        for f in range(frames + 1):
            # en los ciclos el último fotograma es igual que el primero
            t = ((f % frames) / frames if loop else f / frames) * dur
            pose = pose_fn(t, dur)
            D = {}
            for n in self.order:
                p = self.parent[n]; Dp = D.get(p, Quaternion()) if p else Quaternion()
                D[n] = pose.get(n, Dp if n not in pose else pose[n])
                if n not in pose: D[n] = Dp
                L = Dp.inverted() @ D[n]
                r = self.rest_q[n]
                pb = pbs[n]; pb.rotation_quaternion = r.inverted() @ L @ r
                pb.keyframe_insert('rotation_quaternion', frame=f)
                if n == 'Hips':
                    loc = pose.get('_hips_loc', Vector())
                    pb.location = r.inverted() @ loc
                    pb.keyframe_insert('location', frame=f)
        for k, v in (extras or {}).items(): act[k] = v
        act.use_fake_user = True
        tr = self.obj.animation_data.nla_tracks.new(); tr.name = name
        st = tr.strips.new(name, 0, act); st.name = name
        self.obj.animation_data.action = None
        self.clips.append((name, frames / 30, extras or {}))

def q(axis, ang):
    return Quaternion(Vector(axis).normalized(), ang)

# ------------------------------------------------------------------ exportación
def export(path):
    for o in bpy.data.objects: o.select_set(o.type in ('MESH', 'ARMATURE', 'EMPTY'))
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True,
        export_texcoords=True, export_normals=True, export_tangents=False, export_vertex_color='NONE',
        export_skins=True, export_influence_nb=4, export_all_influences=False,
        export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
        export_morph=False, export_extras=True, export_yup=True, export_lights=False, export_cameras=False,
        export_draco_mesh_compression_enable=False, export_def_bones=False, export_rest_position_armature=True)
