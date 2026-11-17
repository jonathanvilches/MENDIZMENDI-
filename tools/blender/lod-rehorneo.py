# Versión ligera de un personaje de Meshy con la textura horneada de nuevo (tools/meshy-lod-rehorneo.mjs la llama).
# Los de Meshy traen la textura en cientos de islas: el 91 % de los vértices está en una costura y, sin romper la textura,
# la malla no baja de ~18.000 triángulos. Aquí la malla se simplifica sin mirar la textura, se desenvuelve de nuevo y se
# hornea el color del modelo de cerca sobre ella. Solo sale la malla quieta (vértices en el espacio del glTF, normales,
# coordenadas de textura y triángulos) y la imagen: el esqueleto, los pesos y las animaciones los pone el script de Node,
# del original, para no tocar los huesos (los gestos y el agarre del juego cuentan con sus ejes).
# Uso: blender -b -P lod-rehorneo.py -- entrada.glb salida_prefijo triangulos px
import bpy, sys, struct, json
a = sys.argv[sys.argv.index('--') + 1:]
ENT, SAL, TRIS, PX = a[0], a[1], int(a[2]), int(a[3])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
sc = bpy.context.scene
for o in sc.objects:
    if o.type == 'ARMATURE': o.data.pose_position = 'REST'
ms = [o for o in sc.objects if o.type == 'MESH']
hi = max(ms, key=lambda o: len(o.data.polygons))
for o in ms:
    if o is not hi: o.hide_render = True
# la copia que se simplifica, sin el esqueleto
lo = hi.copy(); lo.data = hi.data.copy(); lo.name = 'ligera'; sc.collection.objects.link(lo)
for m in list(lo.modifiers): lo.modifiers.remove(m)
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = lo; lo.select_set(True)
# (el importador deja los vértices de cada costura de la textura separados: el 91 % en estos modelos. Sin fundirlos, la
# malla se simplificaba a trozos sueltos y el desenvolvido daba una isla por triángulo)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=max(lo.dimensions) * 1e-5); bpy.ops.object.mode_set(mode='OBJECT')
n0 = sum(len(p.vertices) - 2 for p in lo.data.polygons)
d = lo.modifiers.new('simplifica', 'DECIMATE'); d.ratio = min(1.0, TRIS / n0); d.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=d.name)
# textura nueva: se quitan las coordenadas viejas y se desenvuelve
while lo.data.uv_layers: lo.data.uv_layers.remove(lo.data.uv_layers[0])
lo.data.uv_layers.new(name='UV')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, area_weight=0.0)
bpy.ops.uv.pack_islands(margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')
img = bpy.data.images.new('horneada', PX, PX, alpha=False)
mat = bpy.data.materials.new('horneada'); mat.use_nodes = True
nt = mat.node_tree; tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; nt.nodes.active = tex
lo.data.materials.clear(); lo.data.materials.append(mat)
# el de cerca, sin metal (el color difuso sale entero)
for s in hi.material_slots:
    if s.material and s.material.use_nodes:
        for n in s.material.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED': n.inputs['Metallic'].default_value = 0.0
# y una copia suya toda blanca y emisiva: horneada, dice dónde ha acertado el rayo (blanco) y dónde no (negro)
blanco = bpy.data.materials.new('acierto'); blanco.use_nodes = True; bn = blanco.node_tree
for n in list(bn.nodes): bn.nodes.remove(n)
em = bn.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0; em.inputs['Color'].default_value = (1, 1, 1, 1)
out = bn.nodes.new('ShaderNodeOutputMaterial'); bn.links.new(em.outputs[0], out.inputs[0])
propios = [s.material for s in hi.material_slots]
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4
bk = sc.render.bake; bk.use_selected_to_active = True; bk.use_pass_direct = False; bk.use_pass_indirect = False; bk.use_pass_color = True; bk.margin = 0
# (las distancias del horneado, en metros del mundo: el esqueleto de Meshy va a escala 0,01 y las medidas del objeto
# salían cien veces mayores; los rayos salían de lejos, chocaban con los brazos y dejaban manchas negras)
from mathutils import Vector
import numpy as np
zs = [(hi.matrix_world @ Vector(c)).z for c in hi.bound_box]; h = max(zs) - min(zs)
bpy.ops.object.select_all(action='DESELECT'); hi.hide_render = False; hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
def hornea(tipo, extr):
    bk.cage_extrusion = h * extr; bk.max_ray_distance = h * extr * 2.2
    if tipo == 'EMIT': bpy.ops.object.bake(type='EMIT')
    else: bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
    a = np.empty(PX * PX * 4, dtype=np.float32); img.pixels.foreach_get(a); return a.reshape(PX, PX, 4)[:, :, :3].copy()
# varias pasadas: la malla simplificada queda en algunos sitios por dentro del modelo de cerca y el rayo corto no lo
# encontraba (manchas negras en el pantalón blanco del juez). Cada pasada, con más alcance, solo rellena lo que falta;
# la corta va primero porque es la que no se equivoca de pieza (un brazo junto al cuerpo)
res = np.zeros((PX, PX, 3), np.float32); lleno = np.zeros((PX, PX), bool)
for extr in (0.012, 0.03, 0.06, 0.1):
    c = hornea('DIFFUSE', extr)
    for s, m in zip(hi.material_slots, propios): s.material = blanco
    m_ = hornea('EMIT', extr)[:, :, 0] > 0.5
    for s, m in zip(hi.material_slots, propios): s.material = m
    nuevo = m_ & ~lleno; res[nuevo] = c[nuevo]; lleno |= nuevo
    print('PASADA', extr, 'acierto', round(float(m_.mean()) * 100, 1), '% lleno', round(float(lleno.mean()) * 100, 1), '%')
# lo que quede (fuera de las piezas o algún hueco), con el color de lo más cercano ya horneado (12 vueltas, como el margen)
for _ in range(12):
    if lleno.all(): break
    acc = np.zeros_like(res); n = np.zeros((PX, PX), np.float32)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        sh = np.roll(np.roll(lleno, dy, 0), dx, 1); acc += np.roll(np.roll(res, dy, 0), dx, 1) * sh[:, :, None]; n += sh
    nuevo = ~lleno & (n > 0); res[nuevo] = acc[nuevo] / n[nuevo][:, None]; lleno |= nuevo
px = np.ones((PX, PX, 4), np.float32); px[:, :, :3] = res; img.pixels.foreach_set(px.ravel())
img.filepath_raw = SAL + '.png'; img.file_format = 'PNG'; img.save()
# la malla, por esquinas (cada esquina con su coordenada de textura), en el espacio del glTF (Y arriba)
me = lo.data; me.calc_loop_triangles()
uv = me.uv_layers.active.data; clave = {}; P = []; N = []; T = []; I = []
for tri in me.loop_triangles:
    for li, vi in zip(tri.loops, tri.vertices):
        u = uv[li].uv; k = (vi, round(u[0], 5), round(u[1], 5))
        if k not in clave:
            clave[k] = len(P) // 3; co = me.vertices[vi].co; no = me.vertices[vi].normal
            P += [co.x, co.z, -co.y]; N += [no.x, no.z, -no.y]; T += [u[0], 1 - u[1]]
        I.append(clave[k])
# (Blender pone los vértices con la postura de unión del esqueleto aplicada, no como están en el glTF, que además los
# guarda cuantizados: se escribe también la caja del de cerca, en el mismo espacio, y el script de Node la casa con la
# del original para devolver la ligera a su sitio)
hv = [(v.co.x, v.co.z, -v.co.y) for v in hi.data.vertices]
caja = [min(c[k] for c in hv) for k in range(3)] + [max(c[k] for c in hv) for k in range(3)]
with open(SAL + '.bin', 'wb') as f:
    f.write(struct.pack('<III', len(P) // 3, len(I), 0)); f.write(struct.pack('<6f', *caja)); f.write(struct.pack(f'<{len(P)}f', *P)); f.write(struct.pack(f'<{len(N)}f', *N))
    f.write(struct.pack(f'<{len(T)}f', *T)); f.write(struct.pack(f'<{len(I)}I', *I))
print('LIGERA', n0, '->', len(I) // 3, 'triángulos,', len(P) // 3, 'vértices')
