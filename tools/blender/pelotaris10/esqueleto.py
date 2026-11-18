# Los 10 pelotaris de siempre (18 de noviembre de 2026): cada uno sale de Meshy como una malla suelta, sin huesos (el
# autor los quiso «bien generados»: dibujados en Higgsfield a partir del pelotari actual y pasados a 3D en Meshy). Aquí
# se les pone EL ESQUELETO DEL PELOTARI DE SIEMPRE, hueso por hueso y en su misma pose de reposo, para que valgan tal
# cual sus animaciones (correr, andar, los golpes de pelotaMoves.js y los reales): no se usa el esqueleto automático de
# Meshy, que daría otros huesos y otras medidas.
#   1. se encaja la malla nueva sobre el pelotari: los pies en el suelo, las puntas de las manos donde las suyas (a lo
#      ancho y a lo alto: la pose es la misma, porque el dibujo salió de un render suyo), sin tocar nada más
#   2. cada punto toma los pesos del punto más cercano de la piel del pelotari (transferencia de datos de Blender)
#      (MANOS=1: a lo alto, por la altura de las manos y no por la camiseta azul: los jueces y el público, que no la
#      llevan; un vaquero azul se tomaba por ella)
#   3. lo que es cabeza o pelo (las piezas sueltas de Meshy que quedan por encima del cuello, o que llegan a lo alto de la
#      cabeza aunque cuelguen, como la coleta y la trenza) va entero al hueso de la cabeza: así el pelo no se estira con
#      la espalda al agacharse ni atraviesa los hombros
# Uso: python3 esqueleto.py -- <pelotari-hd.glb> <meshy.glb> <salida.glb> [vistas_prefijo]
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'chicas'))
from comun import *
argv = sys.argv[sys.argv.index('--') + 1:]; base, nuevo, out = argv[:3]; pref = argv[3] if len(argv) > 3 else None
arm, src = abrir(base); K = Medidas(src); Ms = src.matrix_world
AZ = {}
def azul(o):
    """La altura de cada punto azul (la camiseta), mirando su color en la textura."""
    tex = next(n for n in o.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE').image; w, h = tex.size
    px = np.empty(w * h * 4, np.float32); tex.pixels.foreach_get(px); px = px.reshape(h, w, 4); uv = o.data.uv_layers.active.data; M = o.matrix_world; zs = []; o['azules'] = []; az = set()
    for l in o.data.loops:
        u, v = uv[l.index].uv; c = px[min(h - 1, max(0, int(v * h))), min(w - 1, max(0, int(u * w)))]
        if c[2] > 0.25 and c[2] > 1.6 * c[0] and c[2] > 1.15 * c[1]: zs.append((M @ o.data.vertices[l.vertex_index].co).z); az.add(l.vertex_index)
    AZ[o.name] = az
    return np.array(zs)
def medidas(o):
    # (a lo ancho, las puntas de las manos; a lo alto, del suelo a los hombros de la camiseta: con la altura de las manos
    # la de los rizos, que las trae algo más bajas, salía un 12 % más alta que los demás)
    M = o.matrix_world; P = [M @ v.co for v in o.data.vertices]; xm = max(abs(p.x) for p in P); z0 = min(p.z for p in P)
    mano = [p for p in P if abs(p.x) > 0.9 * xm]; yh = sum(p.y for p in mano) / len(mano); za = azul(o)
    # (los que no van de azul —los jueces y el público, hechos igual—: por la altura de las manos)
    return xm, z0, (float(np.percentile(za, 97)) if len(za) > 300 and not os.environ.get('MANOS') else None, sum(p.z for p in mano) / len(mano)), yh, (max(p.x for p in P) + min(p.x for p in P)) / 2
bpy.ops.import_scene.gltf(filepath=nuevo, merge_vertices=True)
ob = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.data.objects):
    if o.type == 'EMPTY': bpy.data.objects.remove(o)
# ---- 0. lo que sobra: alguna tira suelta que Meshy deja colgando (QUITA="x0,x1,z0,z1;…", en las medidas del archivo
# de Meshy: se borran las piezas sueltas cuya caja cabe entera ahí). Miradas una a una en las vistas ----
if True:
    cajas = [[float(v) for v in c.split(',')] for c in os.environ.get('QUITA', '').split(';') if c]
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table(); visto = set(); fuera = []
    for v in bm.verts:
        if v.index in visto: continue
        pila = [v]; visto.add(v.index); isla = []
        while pila:
            q = pila.pop(); isla.append(q)
            for e in q.link_edges:
                w = e.other_vert(q)
                if w.index not in visto: visto.add(w.index); pila.append(w)
        xs_ = [q.co.x for q in isla]; zs_ = [q.co.z for q in isla]
        ys_ = [q.co.y for q in isla]
        # (y los hilos: piezas finísimas y largas que cuelgan del pelo hasta las piernas, como los de la melena)
        hilo = max(xs_) - min(xs_) < 0.008 and max(ys_) - min(ys_) < 0.008 and max(zs_) - min(zs_) > 0.04
        if hilo or any(min(xs_) >= c[0] and max(xs_) <= c[1] and min(zs_) >= c[2] and max(zs_) <= c[3] for c in cajas): fuera += isla
    if fuera: print('QUITA', len(fuera), 'puntos')
    bmesh.ops.delete(bm, geom=fuera, context='VERTS'); bm.to_mesh(ob.data); bm.free(); ob.data.update()
# ---- 1. el encaje ----
nombre_ob = ob.name; xs, z0s, zhs, yhs, cxs = medidas(src); xn, z0n, zhn, yhn, cxn = medidas(ob)
ia = 0 if zhn[0] is not None else 1; zhs, zhn = zhs[ia], zhn[ia]
sx = xs / xn; sz = (zhs - z0s) / (zhn - z0n); sy = (sx * sz) ** 0.5
for v in ob.data.vertices: v.co = Vector(((v.co.x - cxn) * sx + cxs, (v.co.y - yhn) * sy + yhs, (v.co.z - z0n) * sz + z0s))
ob.data.update(); P = [v.co.copy() for v in ob.data.vertices]
print('ENCAJE', os.path.basename(nuevo), 'ancho ×', round(sx, 3), 'alto ×', round(sz, 3), 'altura', round(max(p.z for p in P), 3), 'frente a', round(K.z1, 3))
# ---- 2. los pesos, del pelotari ----
for g in src.vertex_groups: ob.vertex_groups.new(name=g.name)
dt = ob.modifiers.new('pesos', 'DATA_TRANSFER'); dt.object = src; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'; dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.modifier_apply(modifier='pesos')
# ---- 3. la cabeza y el pelo, enteros a la cabeza ----
azules = AZ[nombre_ob]
bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table(); visto = set(); cab = []
fz = lambda z: (z - K.z0) / K.H
for v in bm.verts:
    if v.index in visto: continue
    pila = [v]; visto.add(v.index); isla = []
    while pila:
        a = pila.pop(); isla.append(a.index)
        for e in a.link_edges:
            b = e.other_vert(a)
            if b.index not in visto: visto.add(b.index); pila.append(b)
    zs = [fz(P[i].z) for i in isla]; xa = max(abs(P[i].x) for i in isla) / K.H
    # (por encima del cuello, o que llega a lo alto de la cabeza sin ser el cuerpo: el cuerpo llega hasta las manos)
    # (lo azul nunca: si el pelo de la nuca toca el cuello de la camiseta, Meshy los da en una sola pieza)
    # (o con el centro por encima del cuello y sin llegar a los brazos: los mechones sueltos junto a la cara y los cabos
    # de la trenza, que si no se iban con los hombros y cruzaban la cara al moverse)
    # (y nunca una pieza que llegue a las piernas: al juez, Meshy le dio la cabeza, el tronco y el pantalón en una sola, sin
    # los brazos, y se quedaba sin pantalón)
    if min(zs) > 0.66 or ((max(zs) > 0.9 or sum(zs) / len(zs) > float(os.environ.get('CENTRO', '0.645'))) and xa < 0.2 and min(zs) > 0.2): cab += [i for i in isla if i not in azules or fz(P[i].z) > 0.7]
bm.free()
# (los hilos: a la de la melena le cuelgan del pelo unos hilos finísimos hasta las piernas; el pelo de ninguno baja del
# pecho, así que lo que sea pelo y esté más abajo se borra)
hilos = [i for i in cab if fz(P[i].z) < float(os.environ.get('HILO', '0.54'))]   # (HILO: más abajo para una coleta larga; CENTRO: más abajo para unas trenzas con la punta suelta)
gh = ob.vertex_groups['mixamorig:Head']
for g in ob.vertex_groups:
    if g != gh: g.remove(cab)
gh.add(cab, 1.0, 'REPLACE')
# (y en la pieza del cuerpo, que trae el cuello y a veces la cara: de la barbilla para arriba, también a la cabeza, fundido)
cs = set(cab)
for v in ob.data.vertices:
    if v.index in cs: continue
    k = suave((fz(v.co.z) - 0.655) / 0.03)
    if k <= 0: continue
    for g in v.groups: g.weight *= (1 - k)
    gh.add([v.index], k + sum(g.weight for g in v.groups if g.group == gh.index), 'REPLACE')
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4); bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
print('CABEZA', len(cab), 'de', len(ob.data.vertices), 'puntos')
if hilos:
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table(); bmesh.ops.delete(bm, geom=[bm.verts[i] for i in hilos], context='VERTS'); bm.to_mesh(ob.data); bm.free(); ob.data.update(); print('HILOS', len(hilos), 'puntos fuera')
ob.parent = arm; ob.matrix_parent_inverse = arm.matrix_world.inverted(); mo = ob.modifiers.new('Armature', 'ARMATURE'); mo.object = arm
ob.name = 'Pelotari'; bpy.data.objects.remove(src)
for p in ob.data.polygons: p.use_smooth = True
if pref:      # (una vista en reposo y otra con los brazos y una pierna movidos: si los pesos están mal, se ve aquí)
    montar(fondo=(0.45, 0.5, 0.56), muestras=24); c = Vector((K.cx, K.cy, K.z0 + K.H * 0.5))
    foto(pref + '-reposo.png', 0, c.z, c, K.H * 2.7, 70, 384, 512)
    arm.data.pose_position = 'POSE'; pb = arm.pose.bones
    for n, e in (('mixamorig:RightArm', (0, 0, 1.2)), ('mixamorig:LeftArm', (-0.9, 0, 0)), ('mixamorig:LeftUpLeg', (-0.9, 0, 0)), ('mixamorig:LeftLeg', (1.0, 0, 0)), ('mixamorig:Head', (0.35, 0.5, 0)), ('mixamorig:Spine1', (0.3, 0, 0.15))):
        pb[n].rotation_mode = 'XYZ'; pb[n].rotation_euler = e
    bpy.context.view_layer.update()
    foto(pref + '-pose.png', 25, c.z, c, K.H * 2.7, 70, 384, 512); foto(pref + '-pose-e.png', 205, c.z, c, K.H * 2.7, 70, 384, 512)
    for b in pb: b.rotation_euler = (0, 0, 0)
    arm.data.pose_position = 'REST'; bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_morph=False, export_yup=True, export_apply=False, export_materials='EXPORT', export_image_format='AUTO')
print('HECHO', out)
salir()
