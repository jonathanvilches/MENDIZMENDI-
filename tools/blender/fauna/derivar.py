"""Especies que faltan en el pack de Quaternius, derivadas en Blender de sus modelos (mismo estilo y mismas
animaciones): se cambian las proporciones con los huesos (cuello, patas, cabeza), se fija esa forma como nueva
pose de reposo (las animaciones siguen valiendo), se colorea la raza navarra y se añaden piezas (cuernos, barba,
colmillos) unidas al hueso de la cabeza. Salida: /tmp/fauna_der/<especie>.glb (luego tools/animalpack.mjs).
Uso: python3.11 tools/blender/fauna/derivar.py [especie…]"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

SRC = os.path.join(os.getcwd(), 'src', 'assets', 'animals')
OUT = '/tmp/fauna_der'

LEGS = ['FrontUpperLeg.L', 'FrontLowerLeg.L', 'FrontUpperLeg.R', 'FrontLowerLeg.R', 'BackLeg.L', 'BackUpperLeg.L', 'BackLowerLeg.L', 'BackLeg.R', 'BackUpperLeg.R', 'BackLowerLeg.R']
NECK = ['Neck1', 'Neck2', 'Neck3']
RECETAS = {
    # oveja latxa: lana blanca y cara, orejas y patas negras; cuello corto, patas más cortas, cuernos en espiral (carnero)
    'sheep': dict(base='Alpaca', neck=0.42, legs=0.72, head=0.95, col={'Main': '#ece4d2', 'Main_Light': '#f2ebdc', 'Main_Dark': '#1f1915', 'Muzzle': '#1f1915', 'Hooves': '#1a1512'},
                  horns='espiral', horn_col='#cdbb94'),
    # cabra pirenaica: pelo pardo, patas cortas, cuernos hacia atrás y barba
    'goat': dict(base='Deer', neck=0.85, legs=0.7, head=1.05, col={'Main': '#4a3a2e', 'Main_Light': '#8a6a4a', 'Main_Dark': '#2a1e18', 'Hooves': '#15100e'},
                 horns='atras', horn_col='#4a3e30', beard=True),
    # cerdo: rosado, patas cortas, cuello corto, sin cuernos
    'pig': dict(base='Cow', neck=0.45, legs=0.5, head=0.82, col={'Main': '#f0b4a2', 'Main_Light': '#f6c8b8', 'Muzzle': '#e89a8a', 'Hooves': '#7a5a4a'}, no_horns=True),
    # jabalí: pardo oscuro, cabeza grande, patas cortas, colmillos
    'jabali': dict(base='Cow', neck=0.5, legs=0.52, head=0.95, col={'Main': '#3a2e26', 'Main_Light': '#4e4034', 'Muzzle': '#2a221e', 'Hooves': '#1a1512'}, no_horns=True, tusks=True),
}

def hexcol(h):
    h = h.lstrip('#'); return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)) + (1,)

def derivar(nombre, R):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, R['base'] + '.glb'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
    if arm.animation_data: arm.animation_data.action = None
    for pb in arm.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
    # la cabeza y lo que cuelga de ella no heredan la escala del cuello (cambia el largo, no el tamaño)
    keep = [b for b in arm.data.bones if b.name.startswith(('Head', 'Ear', 'FFB', 'FF.', 'IK'))]
    saved = {b.name: b.inherit_scale for b in arm.data.bones}
    for b in keep: b.inherit_scale = 'NONE'
    for n in NECK:
        if n in arm.pose.bones: arm.pose.bones[n].scale = (1, R['neck'], 1)
    for n in LEGS:
        if n in arm.pose.bones: arm.pose.bones[n].scale = (1, R['legs'], 1)
    if 'Head' in arm.pose.bones: arm.pose.bones['Head'].scale = (R['head'],) * 3
    bpy.context.view_layer.update()
    # la malla deformada pasa a ser la de reposo
    for ob in meshes:
        mod = next(m for m in ob.modifiers if m.type == 'ARMATURE')
        with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active = arm
    with bpy.context.temp_override(object=arm, active_object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
        bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
    for b in arm.data.bones: b.inherit_scale = saved[b.name]
    for ob in meshes:
        m = ob.modifiers.new('Armature', 'ARMATURE'); m.object = arm
    body = max(meshes, key=lambda o: len(o.data.vertices))
    # colores de la raza
    for mat in bpy.data.materials:
        c = R['col'].get(mat.name)
        if c and mat.use_nodes:
            bs = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bs: bs.inputs['Base Color'].default_value = hexcol(c)
    # sin cuernos (cerdo, jabalí): se borran las caras del material de los cuernos
    if R.get('no_horns'):
        idx = [i for i, m in enumerate(body.data.materials) if m and m.name.lower().startswith('horn')]
        if idx:
            bm = bmesh.new(); bm.from_mesh(body.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in idx], context='FACES')
            bm.to_mesh(body.data); bm.free()
    # piezas nuevas unidas a la cabeza
    head = arm.data.bones['Head']
    hm = arm.matrix_world @ head.matrix_local
    hp, hr = hm.to_translation(), hm.to_3x3()
    size = (arm.matrix_world.to_3x3() @ Vector((0, head.length, 0))).length
    extra = []
    def pieza(nombre_p, color, verts_fn):
        me = bpy.data.meshes.new(nombre_p); bm = bmesh.new(); verts_fn(bm); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(nombre_p, me); bpy.context.scene.collection.objects.link(ob)
        mat = bpy.data.materials.new('MAT_' + nombre_p); mat.use_nodes = True
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = hexcol(color); mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
        me.materials.append(mat); extra.append(ob); return ob
    def cono(bm, base, tip, r0, r1, seg=8, curve=None, steps=6):
        pts = []
        for i in range(steps + 1):
            t = i / steps; p = base.lerp(tip, t)
            if curve: p = p + curve(t)
            pts.append(p)
        rings = []
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, steps)] - pts[max(i - 1, 0)]).normalized(); a = d.orthogonal().normalized(); b = d.cross(a)
            r = r0 + (r1 - r0) * (i / steps)
            rings.append([bm.verts.new(p + (a * math.cos(k / seg * 6.283) + b * math.sin(k / seg * 6.283)) * r) for k in range(seg)])
        for i in range(steps):
            for k in range(seg): bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
        bm.faces.new(rings[0][::-1]); c = bm.verts.new(pts[-1]);
        for k in range(seg): bm.faces.new((rings[-1][k], rings[-1][(k + 1) % seg], c))
    up, fw, side = hr @ Vector((0, 1, 0)), hr @ Vector((0, 0, 1)), hr @ Vector((1, 0, 0))
    # en el espacio del mundo de Blender: la cabeza mira hacia −Y del modelo y arriba es +Z
    U, F, S = Vector((0, 0, 1)), Vector((0, -1, 0)), Vector((1, 0, 0))
    top = hp + U * size * 0.9
    if R.get('horns') == 'espiral':
        def mk(bm):
            for s in (-1, 1):
                b0 = top + S * s * size * 0.35 - F * size * 0.1
                cono(bm, b0, b0 + S * s * size * 0.55 - U * size * 0.6 + F * size * 0.35, size * 0.16, size * 0.05, 10,
                     curve=lambda t, s=s: (-F * math.sin(t * 3.0) * size * 0.35 + U * math.sin(t * 3.0) * size * 0.25), steps=10)
        pieza('ANI_Sheep_Cuernos', R['horn_col'], mk)
    if R.get('horns') == 'atras':
        def mk(bm):
            for s in (-1, 1):
                b0 = top + S * s * size * 0.2
                cono(bm, b0, b0 + U * size * 0.9 - F * size * 0.9 + S * s * size * 0.15, size * 0.11, size * 0.02, 8, curve=lambda t: -U * math.sin(t * 3.1) * size * 0.1)
        pieza('ANI_Goat_Cuernos', R['horn_col'], mk)
    if R.get('beard'):
        pieza('ANI_Goat_Barba', '#2a2018', lambda bm: cono(bm, hp + F * size * 1.6 - U * size * 0.2, hp + F * size * 1.5 - U * size * 0.9, size * 0.12, size * 0.02, 8))
    if R.get('tusks'):
        def mk(bm):
            for s in (-1, 1):
                b0 = hp + F * size * 2.1 + S * s * size * 0.3 - U * size * 0.25
                cono(bm, b0, b0 + U * size * 0.45 + S * s * size * 0.12 - F * size * 0.08, size * 0.08, size * 0.015, 8)
        pieza('ANI_Jabali_Colmillos', '#f2ead2', mk)
    for ob in extra:
        vg = ob.vertex_groups.new(name='Head'); vg.add([v.index for v in ob.data.vertices], 1.0, 'REPLACE')
    if extra:
        with bpy.context.temp_override(active_object=body, selected_editable_objects=[body] + extra, selected_objects=[body] + extra):
            bpy.ops.object.join()
    os.makedirs(OUT, exist_ok=True)
    for o in bpy.data.objects: o.select_set(o == arm or o.type == 'MESH')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, nombre + '.glb'), export_format='GLB', use_selection=True, export_animations=True,
                              export_animation_mode='ACTIONS', export_skins=True, export_yup=True, export_apply=False, export_force_sampling=True)
    print('DERIVADO', nombre, R['base'], len(body.data.vertices))

if __name__ == '__main__':
    pedidos = [a for a in sys.argv[1:] if a in RECETAS] or list(RECETAS)
    for n in pedidos: derivar(n, RECETAS[n])
