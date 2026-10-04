"""Cerdo (euskal txerria) y jabalí con cuerpo propio sobre el esqueleto y las animaciones de la vaca de Quaternius.
Antes se derivaban de la vaca solo encogiendo patas y cuello y seguían pareciendo vacas. Aquí se conserva el esqueleto
(con las proporciones de la receta) y se modela un cuerpo nuevo con secciones elípticas a lo largo de los huesos:
  · cerdo: tronco en barril largo, cuello corto y grueso, cabeza cónica con el disco del hocico, orejas grandes caídas
    sobre los ojos, patas cortas y finas, rabo enroscado; rosado con la cabeza y la grupa negras (la raza vasca)
  · jabalí: cuartos delanteros altos y macizos, grupa estrecha y caída, cabeza en cuña larga, crin de cerdas en el
    lomo, orejas pequeñas tiesas, colmillos, patas finas y oscuras, rabo recto con borla; pardo grisáceo
Los pesos se calculan con el calor de los huesos (como en Blender al emparentar «con pesos automáticos»).
Salida: /tmp/fauna_der/{pig,jabali}.glb → node tools/animalpack.mjs Pig Jabali
Uso: python3 tools/blender/fauna/cerdos.py [pig|jabali]"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

SRC = os.path.join(os.getcwd(), 'lab', 'ref', 'packs', 'quaternius', 'Cow.gltf')
OUT = '/tmp/fauna_der'
LEGS = ['FrontUpperLeg.L', 'FrontLowerLeg.L', 'FrontUpperLeg.R', 'FrontLowerLeg.R', 'BackLeg.L', 'BackUpperLeg.L', 'BackLowerLeg.L', 'BackLeg.R', 'BackUpperLeg.R', 'BackLowerLeg.R']
NECK = ['Neck1', 'Neck2', 'Neck3']

def hexcol(h):
    h = h.lstrip('#'); return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)) + (1,)

def ymap(y, R):
    d = R.get('acortar', 0); t = min(1, max(0, y / 1.6)); return y - d * t * t * (3 - 2 * t)

def esqueleto(R):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    if arm.animation_data: arm.animation_data.action = None
    for pb in arm.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
    keep = [b for b in arm.data.bones if b.name.startswith(('Head', 'Ear', 'FFB', 'FF.', 'IK'))]
    saved = {b.name: b.inherit_scale for b in arm.data.bones}
    for b in keep: b.inherit_scale = 'NONE'
    for n in NECK: arm.pose.bones[n].scale = (1, R['neck'], 1)
    for n in LEGS: arm.pose.bones[n].scale = (1, R['legs'], 1)
    arm.pose.bones['Head'].scale = (R['head'],) * 3
    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active = arm
    with bpy.context.temp_override(object=arm, active_object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
        bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
    for b in arm.data.bones: b.inherit_scale = saved[b.name]
    # tronco más corto: la parte de atrás (lomo, patas traseras con su IK, rabo) se acerca a las delanteras; el
    # esqueleto de la vaca tiene las patas muy separadas y el cuerpo salía largo como un salchichón
    if R.get('acortar'):
        with bpy.context.temp_override(object=arm, active_object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
            bpy.ops.object.mode_set(mode='EDIT')
            for eb in arm.data.edit_bones:
                eb.head.y = ymap(eb.head.y, R); eb.tail.y = ymap(eb.tail.y, R)
            bpy.ops.object.mode_set(mode='OBJECT')
    # fuera la malla de la vaca
    for o in [o for o in bpy.data.objects if o.type == 'MESH']: bpy.data.objects.remove(o, do_unlink=True)
    return arm


# ---------- modelado ----------
X = Vector((1, 0, 0))
def loft(bm, rings, seg=14, cap0=True, cap1=True, side=X, flat1=False):
    """rings: [(posición, ancho, alto)] a lo largo de una línea; secciones elípticas (ancho en «side»)."""
    pts = [r[0] for r in rings]; out = []
    for i, (p, rx, rz) in enumerate(rings):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = (side - t * side.dot(t)).normalized(); b = t.cross(a)
        out.append([bm.verts.new(p + a * math.cos(k / seg * 6.2832) * rx + b * math.sin(k / seg * 6.2832) * rz) for k in range(seg)])
    faces = []
    for i in range(len(out) - 1):
        for k in range(seg): faces.append(bm.faces.new((out[i][k], out[i][(k + 1) % seg], out[i + 1][(k + 1) % seg], out[i + 1][k])))
    caps = []
    if cap0: c = bm.verts.new(pts[0] - (pts[1] - pts[0]).normalized() * min(rings[0][1], rings[0][2]) * 0.4); caps += [bm.faces.new((out[0][(k + 1) % seg], out[0][k], c)) for k in range(seg)]
    if cap1:
        if flat1: caps.append(bm.faces.new(out[-1]))
        else: c = bm.verts.new(pts[-1] + (pts[-1] - pts[-2]).normalized() * min(rings[-1][1], rings[-1][2]) * 0.4); caps += [bm.faces.new((out[-1][k], out[-1][(k + 1) % seg], c)) for k in range(seg)]
    return faces, caps

def pieza(nombre, fn, mats, sub=1):
    me = bpy.data.meshes.new(nombre); bm = bmesh.new(); fn(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nombre, me); bpy.context.scene.collection.objects.link(ob)
    for m in mats: me.materials.append(m)
    if sub:
        mod = ob.modifiers.new('sub', 'SUBSURF'); mod.levels = sub
        with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]): bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in me.polygons: poly.use_smooth = True
    return ob

def material(nombre, color):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    m.use_nodes = True; bs = m.node_tree.nodes.get('Principled BSDF') or next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = hexcol(color); bs.inputs['Roughness'].default_value = 0.8
    return m

def cuerpo(R):
    """Tronco, cuello, cabeza y hocico de una pieza; R['rings']: (y, z centro, ancho, alto) de atrás adelante."""
    def fn(bm):
        loft(bm, [(Vector((0, y, z)), rx, rz) for (y, z, rx, rz) in R['rings']], seg=18, flat1=True)
    return fn

def construir(nombre, R):
    arm = esqueleto(R)
    for b in arm.data.bones:
        if b.name.startswith(('Pole', 'IK')): b.use_deform = False
    M = {k: material(k, c) for k, c in R['col'].items()}
    obs = []
    obs.append(pieza('cuerpo', cuerpo(R), [M['Main']], sub=2))   # más fino: el borde de las manchas sale menos escalonado
    # patas: de dentro del tronco a la pezuña, finas; la punta con el material de la pezuña
    def patas(bm):
        for s in (-1, 1):
            for chain in R['patas']:
                loft(bm, [(Vector((s * x, y, z)), r, r * 1.05) for (x, y, z, r) in chain], seg=10)
    obs.append(pieza('patas', patas, [M['Main']]))
    for extra in R['extras']: obs.append(extra(M))
    # ojos
    def ojos(bm):
        for s in (-1, 1):
            e = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=7, radius=R['eye'][3])
            bmesh.ops.translate(bm, verts=e['verts'], vec=Vector((s * R['eye'][0], R['eye'][1], R['eye'][2])))
    obs.append(pieza('ojos', ojos, [M['Eye_Black']], sub=0))
    # unir y repartir materiales por zonas
    with bpy.context.temp_override(active_object=obs[0], selected_editable_objects=obs, selected_objects=obs): bpy.ops.object.join()
    body = obs[0]; body.name = nombre
    me = body.data
    names = [m.name for m in me.materials]
    for poly in me.polygons:
        c = poly.center; cur = names[poly.material_index]
        if cur in ('Eye_Black',): continue
        z = R['zona'](c, poly.normal, cur)
        if z and z in names: poly.material_index = names.index(z)
        elif z: me.materials.append(M[z]); names.append(z); poly.material_index = len(names) - 1
    # manchas por vértice (borde suave, sin escalones): color del vértice que el juego multiplica por el de la raza
    if R.get('manchas'):
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        dark = R['manchas_col']
        mats = [m.name for m in me.materials]
        onmain = set()
        for poly in me.polygons:
            if mats[poly.material_index] == 'Main':
                onmain.update(poly.vertices)
        for v in me.vertices:
            m = R['manchas'](v.co) if v.index in onmain else 0.0
            ca.data[v.index].color = tuple(1 + (d - 1) * m for d in dark) + (1,)
        me.color_attributes.active_color = ca
    for v in me.vertices: v.co.y = ymap(v.co.y, R)
    # pesos automáticos (calor de los huesos)
    for o in bpy.data.objects: o.select_set(False)
    body.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    with bpy.context.temp_override(active_object=arm, selected_objects=[body, arm], selected_editable_objects=[body, arm]):
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    sinpeso = sum(1 for v in me.vertices if not v.groups)
    # piezas sueltas a las que el calor no llega (cerdas, colmillos): los pesos del vértice con peso más cercano
    if sinpeso:
        con = [v for v in me.vertices if v.groups]
        for v in [v for v in me.vertices if not v.groups]:
            w = min(con, key=lambda u: (u.co - v.co).length_squared)
            for g in w.groups: body.vertex_groups[g.group].add([v.index], g.weight, 'REPLACE')
    os.makedirs(OUT, exist_ok=True)
    for o in bpy.data.objects: o.select_set(o == arm or o == body)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, nombre + '.glb'), export_format='GLB', use_selection=True, export_animations=True,
                              export_animation_mode='ACTIONS', export_skins=True, export_yup=True, export_apply=False, export_force_sampling=True,
                              export_vertex_color='ACTIVE' if R.get('manchas') else 'MATERIAL')
    print('HECHO', nombre, len(me.vertices), 'vértices', len(me.polygons), 'caras · sin peso:', sinpeso, '· materiales:', names)

def tubo(bm, pts, r0, r1, seg=8):
    n = len(pts); loft(bm, [(p, r0 + (r1 - r0) * i / (n - 1), r0 + (r1 - r0) * i / (n - 1)) for i, p in enumerate(pts)], seg=seg)

# ---------- cerdo: euskal txerria ----------
def ext_cerdo(M):
    def orejas(bm):
        # orejas grandes y caídas hacia delante, tapando los ojos
        for s in (-1, 1):
            loft(bm, [(Vector((s * 0.36, -2.72, 3.02)), 0.16, 0.05), (Vector((s * 0.5, -3.05, 3.0)), 0.36, 0.05), (Vector((s * 0.6, -3.35, 2.78)), 0.34, 0.045), (Vector((s * 0.63, -3.55, 2.5)), 0.2, 0.04), (Vector((s * 0.6, -3.62, 2.36)), 0.05, 0.03)], seg=10,
                 side=Vector((1, 0, 0)))
    o = pieza('orejas', orejas, [M['Main_Dark']])
    def rabo(bm):
        pts = [Vector((0, 2.9, 2.85))]
        for i in range(1, 14):
            a = i / 13 * 6.2832 * 1.4
            pts.append(Vector((math.sin(a) * 0.13, 3.02 + 0.06 * i / 13 + math.cos(a) * 0.05, 2.85 - i / 13 * 0.3 + (1 - math.cos(a)) * 0.08)))
        tubo(bm, pts, 0.06, 0.03, seg=6)
    r = pieza('rabo', rabo, [M['Main_Dark']], sub=0)
    def narinas(bm):
        for s in (-1, 1):
            e = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.075)
            bmesh.ops.scale(bm, vec=Vector((1, 0.4, 1.3)), verts=e['verts'])
            bmesh.ops.translate(bm, verts=e['verts'], vec=Vector((s * 0.11, -4.24, 2.17)))
    n = pieza('narinas', narinas, [M['Eye_Black']], sub=0)
    return o if False else _join([o, r, n])

def _join(obs):
    with bpy.context.temp_override(active_object=obs[0], selected_editable_objects=obs, selected_objects=obs): bpy.ops.object.join()
    return obs[0]

def zona_cerdo(c, n, cur):
    if cur == 'Main_Dark' or cur == 'Eye_Black': return None
    if c.z < 0.16 and abs(c.x) > 0.3: return 'Hooves'
    if c.y < -4.15: return 'Muzzle'
    return None

def manchas_cerdo(p):
    """0 rosado · 1 negro: la cabeza con el cuello y la grupa con las patas de atrás, con el borde irregular"""
    if p.y < -4.15: return 0.0
    edge_h = -2.3 + 0.22 * math.sin(p.z * 3.1 + p.x * 2.3) + 0.1 * math.sin(p.x * 9.0 + p.z * 4.0)
    edge_r = 1.7 + 0.3 * math.sin(p.z * 2.7 - p.x * 1.9) + 0.12 * math.sin(p.x * 8.0 + p.z * 5.0)
    k = 0.09
    a = 1 - min(1, max(0, (p.y - edge_h) / k + 0.5)); b = min(1, max(0, (p.y - edge_r) / k + 0.5))
    return max(a, b)

CERDO = dict(neck=0.45, legs=1.0, head=0.82, acortar=1.2,
    col={'Main': '#efc4b4', 'Main_Light': '#f6d4c6', 'Main_Dark': '#2a2422', 'Muzzle': '#d9a094', 'Hooves': '#5e4a40', 'Eye_Black': '#0d0b0b'},
    rings=[(3.05, 2.3, 0.35, 0.45), (2.9, 2.25, 0.9, 1.05), (2.55, 2.2, 1.17, 1.27), (1.6, 2.2, 1.24, 1.3), (0.5, 2.2, 1.25, 1.32), (-0.6, 2.22, 1.2, 1.28),
           (-1.5, 2.3, 1.1, 1.2), (-2.2, 2.4, 0.95, 1.05), (-2.75, 2.45, 0.8, 0.88), (-3.25, 2.4, 0.63, 0.67), (-3.75, 2.28, 0.46, 0.47), (-4.12, 2.18, 0.34, 0.34), (-4.25, 2.16, 0.33, 0.33)],
    patas=[[(0.55, -1.9, 1.9, 0.34), (0.6, -1.97, 1.15, 0.24), (0.61, -1.9, 0.35, 0.19), (0.61, -1.88, 0.12, 0.2), (0.61, -1.88, -0.1, 0.18)],
          [(0.5, 1.9, 2.1, 0.4), (0.57, 2.45, 1.3, 0.25), (0.57, 2.38, 0.35, 0.19), (0.57, 2.36, 0.12, 0.2), (0.57, 2.34, -0.1, 0.18)]],
    eye=(0.43, -3.28, 2.72, 0.07),
    extras=[lambda M: ext_cerdo(M)], zona=zona_cerdo, manchas=manchas_cerdo, manchas_col=(0.03, 0.033, 0.036))

# ---------- jabalí ----------
def ext_jabali(M):
    import random; rnd = random.Random(7)
    def crin(bm):
        # cerdas del lomo: una cresta de mechones que va de la nuca a media espalda
        for i in range(26):
            t = i / 25; y = -2.55 + t * 3.4
            ztop = 4.05 - 0.18 * max(0, t - 0.45) * 2.0 - (0.12 if t < 0.12 else 0)
            h = 0.22 + rnd.random() * 0.16
            base = Vector((0, y, ztop - 0.12))
            loft(bm, [(base, 0.07, 0.11), (base + Vector((0, 0.05, h * 0.6)), 0.05, 0.08), (base + Vector((0, 0.1, h)), 0.012, 0.02)], seg=5, side=Vector((1, 0, 0)))
    c = pieza('crin', crin, [M['Main_Dark']], sub=0)
    def orejas(bm):
        for s in (-1, 1):
            loft(bm, [(Vector((s * 0.36, -2.78, 3.42)), 0.17, 0.05), (Vector((s * 0.44, -2.72, 3.65)), 0.15, 0.045), (Vector((s * 0.5, -2.62, 3.9)), 0.04, 0.02)], seg=8, side=Vector((0, 1, 0.3)).normalized())
    o = pieza('orejas', orejas, [M['Main_Dark']])
    def colmillos(bm):
        for s in (-1, 1):
            pts = [Vector((s * 0.22, -4.28, 1.78)), Vector((s * 0.3, -4.33, 1.92)), Vector((s * 0.36, -4.25, 2.05)), Vector((s * 0.37, -4.12, 2.12))]
            tubo(bm, pts, 0.055, 0.012, seg=6)
    k = pieza('colmillos', colmillos, [material('Tusk', '#efe6cf')], sub=0)
    def rabo(bm):
        tubo(bm, [Vector((0, 2.85, 2.95)), Vector((0, 2.98, 2.7)), Vector((0, 3.0, 2.35)), Vector((0, 2.98, 2.05))], 0.06, 0.035, seg=6)
        e = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.1)
        bmesh.ops.scale(bm, vec=Vector((0.8, 0.8, 1.8)), verts=e['verts']); bmesh.ops.translate(bm, verts=e['verts'], vec=Vector((0, 2.98, 1.9)))
    r = pieza('rabo', rabo, [M['Main_Dark']], sub=0)
    def narinas(bm):
        for s in (-1, 1):
            e = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.055)
            bmesh.ops.scale(bm, vec=Vector((1, 0.4, 1.3)), verts=e['verts'])
            bmesh.ops.translate(bm, verts=e['verts'], vec=Vector((s * 0.08, -4.79, 1.72)))
    n = pieza('narinas', narinas, [M['Eye_Black']], sub=0)
    return _join([c, o, k, r, n])

def zona_jabali(c, n, cur):
    if cur in ('Main_Dark', 'Eye_Black', 'Tusk'): return None
    if c.z < 0.16 and abs(c.x) > 0.3: return 'Hooves'
    if c.y < -4.62: return 'Muzzle'
    if abs(c.x) > 0.25 and c.z < 1.45 + 0.1 * math.sin(c.y * 3): return 'Main_Dark'       # patas oscuras
    if c.y < -3.9: return 'Main_Dark'                                                       # hocico oscuro
    if c.y < -2.9 and abs(c.x) > 0.3 and c.z < 2.6: return 'Main_Light'                     # carrillos canosos
    return None

JABALI = dict(neck=0.5, legs=1.0, head=0.95, acortar=0.75,
    col={'Main': '#5a4a3c', 'Main_Light': '#7f6e5b', 'Main_Dark': '#221c18', 'Muzzle': '#3b3431', 'Hooves': '#151210', 'Eye_Black': '#0d0b0b'},
    rings=[(2.88, 2.55, 0.3, 0.42), (2.65, 2.5, 0.72, 0.9), (2.25, 2.52, 0.88, 1.03), (1.25, 2.58, 0.98, 1.15), (0.2, 2.66, 1.06, 1.27), (-0.8, 2.7, 1.14, 1.5),
           (-1.6, 2.74, 1.12, 1.53), (-2.2, 2.7, 1.02, 1.36), (-2.8, 2.58, 0.8, 1.05), (-3.4, 2.36, 0.58, 0.76), (-4.0, 2.06, 0.4, 0.5), (-4.5, 1.83, 0.27, 0.32), (-4.8, 1.72, 0.22, 0.25)],
    patas=[[(0.5, -1.92, 2.0, 0.34), (0.6, -1.99, 1.2, 0.24), (0.61, -1.9, 0.35, 0.17), (0.61, -1.88, 0.12, 0.17), (0.61, -1.88, -0.1, 0.15)],
          [(0.46, 1.85, 2.3, 0.38), (0.57, 2.48, 1.35, 0.22), (0.57, 2.38, 0.35, 0.16), (0.57, 2.36, 0.12, 0.17), (0.57, 2.34, -0.1, 0.15)]],
    eye=(0.37, -3.45, 2.62, 0.055),
    extras=[lambda M: ext_jabali(M)], zona=zona_jabali)

if __name__ == '__main__':
    pedidos = [a for a in sys.argv[1:] if a in ('pig', 'jabali')] or ['pig', 'jabali']
    for n in pedidos: construir(n, CERDO if n == 'pig' else JABALI)
