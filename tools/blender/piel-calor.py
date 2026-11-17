# Pesos de piel nuevos para un personaje de Meshy, calculados por Blender con el calor de cada hueso (los «pesos
# automáticos»): cada hueso calienta la malla desde dentro y el calor se reparte por la superficie, así que un hueso solo
# mueve la carne que lo rodea y el paso de un hueso al siguiente es suave y del ancho de la articulación. Los de Meshy
# repartían la mano por la faja y el pantalón, el brazo por la cintura y el cuello por el pecho: en los golpes el pantalón
# se estiraba en punta, el codo se deformaba y el cuello se alargaba (el autor, 17 de noviembre de 2026: «tienes que
# hacer un cuerpo firme, los hombros, los codos, las muñecas, el cuello»).
# El calor se calcula en una copia con los vértices de las costuras de la textura unidos (el glTF los separa y el calor
# no pasaría de una pieza a otra) y se copia a cada vértice del original desde el de la copia en su mismo sitio. Solo
# cuentan los huesos que ya movían piel (los de punta, como el de la frente, no). Donde el calor no llega (alguna pieza
# suelta), se quedan los pesos de antes. Las piernas, con los de Meshy (sin el peso del brazo que se colaba en ellas).
# Uso: python tools/blender/piel-calor.py -- entrada.glb salida.glb
import bpy, sys, re
from mathutils import kdtree
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ENT, SAL = argv[0], argv[1]
BRAZO = re.compile(r'^(mixamorig:)?(Left|Right)(Arm|ForeArm|ForeArmTwist|Hand)$')
PIERNA = re.compile(r'^(mixamorig:)?(Left|Right)(UpLeg|Leg|Foot|ToeBase)$')
CABEZA = re.compile(r'^(mixamorig:)?(Head|HeadTop_End|headfront)$')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mallas = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
arm.data.pose_position = 'REST'
for me in mallas:
    # (los huesos que mueven piel en el original)
    usados = set()
    for v in me.data.vertices:
        for g in v.groups:
            if g.weight > 0.01: usados.add(me.vertex_groups[g.group].name)
    deform0 = {b.name: b.use_deform for b in arm.data.bones}
    for b in arm.data.bones: b.use_deform = b.name in usados
    # la copia, con las costuras unidas y sin pesos
    cp = me.copy(); cp.data = me.data.copy(); cp.name = 'calor'; bpy.context.scene.collection.objects.link(cp)
    for m in list(cp.modifiers): cp.modifiers.remove(m)
    cp.vertex_groups.clear(); cp.parent = None; cp.matrix_world = me.matrix_world.copy()
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = cp; cp.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=max(cp.dimensions) * 2e-5); bpy.ops.object.mode_set(mode='OBJECT')
    # el calor (a cien veces su tamaño: con el esqueleto a escala 0,01 el cálculo pierde precisión y en algunos modelos
    # no encontraba solución para ningún hueso; los pesos no dependen del tamaño)
    esc0 = arm.scale.copy(); arm.scale = esc0 * 100; bpy.context.view_layer.update()
    cp.matrix_world = me.matrix_world.copy(); bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT'); cp.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    arm.scale = esc0; bpy.context.view_layer.update()
    for b in arm.data.bones: b.use_deform = deform0[b.name]
    # de la copia al original, vértice a vértice (por su sitio, en las coordenadas de la malla, que son las mismas)
    kd = kdtree.KDTree(len(cp.data.vertices))
    for v in cp.data.vertices: kd.insert(v.co, v.index)
    kd.balance()
    nombres = [g.name for g in cp.vertex_groups]
    pesos = [[(nombres[g.group], g.weight) for g in v.groups if g.weight > 1e-4] for v in cp.data.vertices]
    antes = [[(me.vertex_groups[g.group].name, g.weight) for g in v.groups if g.weight > 1e-4] for v in me.data.vertices]
    sin, lejos, nPier, nCab = 0, 0, 0, 0
    nuevo = []
    for v in me.data.vertices:
        co, i, d = kd.find(v.co)
        w = pesos[i] if i is not None else []
        if d is None or d > max(me.dimensions) * 1e-3: lejos += 1
        if sum(x for _, x in w) < 0.5: w = antes[v.index]; sin += 1
        # (las piernas, con los pesos de Meshy sin el brazo colado: el calor no se lleva bien con el zapato metido en la
        # pernera y el pantalón se abría en campana al mover el pie. De la cintura arriba, el calor; entre medias, mezclados
        # según lo que pesan las piernas en el vértice, para que no haya raya)
        # (la cabeza y el pelo, con los de Meshy: el calor no llega bien a las piezas sueltas del pelo y el moño de la
        # pelotari roja le cruzaba la cara al girar la cabeza)
        if sum(x for n, x in antes[v.index] if CABEZA.match(n)) >= 0.6: nuevo.append(antes[v.index]); nCab += 1; continue
        a = [(n, x) for n, x in antes[v.index] if not BRAZO.match(n)]
        piernas = sum(x for n, x in antes[v.index] if PIERNA.match(n)); sa = sum(x for _, x in a)
        if sa > 0.3 and piernas > 0.05:
            t = min(1.0, piernas / 0.5); mezcla = {}
            for n, x in w: mezcla[n] = mezcla.get(n, 0) + x * (1 - t)
            for n, x in a: mezcla[n] = mezcla.get(n, 0) + x / sa * t
            w = sorted(mezcla.items(), key=lambda e: -e[1])[:4]; nPier += 1
        nuevo.append(w)
    for g in list(me.vertex_groups): me.vertex_groups.remove(g)
    grupos = {}
    for v, w in zip(me.data.vertices, nuevo):
        for n, x in w:
            g = grupos.get(n) or grupos.setdefault(n, me.vertex_groups.new(name=n))
            g.add([v.index], x, 'REPLACE')
    bpy.data.objects.remove(cp, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = me; me.select_set(True)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    print(f'PIEL {me.name}: {len(me.data.vertices)} vértices, {len(grupos)} huesos, {sin} con los pesos de antes (sin calor), {nPier} de las piernas y {nCab} de la cabeza con los de Meshy, {lejos} lejos de la copia')
arm.data.pose_position = 'POSE'
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True)
print('exportado', SAL)
