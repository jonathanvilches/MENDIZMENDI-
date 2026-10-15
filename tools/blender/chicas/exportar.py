# Paso 4 de las chicas: lo que cambia del chico, para el juego. El cuerpo de la chica es el del chico con la cabeza
# rehecha (cráneo liso, frente, nariz, normales y algunas UV), así que no se guarda entero: se guarda su malla tal
# cual sale de Blender (posición, normal y UV de cada esquina de cada triángulo, en el orden de los triángulos del
# modelo original) y la herramienta del juego (tools/chicas/parche.mjs) saca la diferencia con el modelo del chico. El
# pelo va aparte, en su propio GLB con los huesos que usa (la cabeza y los de la coleta).
# Uso: python3 exportar.py -- <chica.blend | modelo.glb> <prefijo de salida>   (con el .glb del chico, solo su malla: la
#   referencia para pasar de las coordenadas de Blender a las del modelo)
#   escribe <prefijo>-malla.bin (float32: por esquina x, y, z, nx, ny, nz, u, v; mundo de Blender), <prefijo>-malla.json
#   y <prefijo>-pelo.glb
import os, sys, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *
argv = sys.argv[sys.argv.index('--') + 1:]; src, pref = argv[0], argv[1]
if src.endswith('.glb'): arm, me = abrir(src)
else:
    bpy.ops.wm.open_mainfile(filepath=src)
    me = next(o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('Hair'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
M = me.matrix_world; Mn = M.to_3x3().inverted().transposed(); mesh = me.data; uvl = mesh.uv_layers.active.data
cn = mesh.corner_normals
out = np.zeros((len(mesh.loops), 8), np.float32); tri = []
for p in mesh.polygons:
    if p.loop_total != 3: raise SystemExit(f'cara {p.index} con {p.loop_total} lados: el modelo original es de triángulos')
    tri.append([int(mesh.loops[l].vertex_index) for l in p.loop_indices])
    for l in p.loop_indices:
        v = mesh.vertices[mesh.loops[l].vertex_index]; w = M @ v.co; n = (Mn @ cn[l].vector).normalized(); uv = uvl[l].uv
        out[l] = (w.x, w.y, w.z, n.x, n.y, n.z, uv.x, uv.y)
out.tofile(pref + '-malla.bin')
json.dump({'loops': len(mesh.loops), 'tris': len(tri), 'verts': len(mesh.vertices), 'loop_start': [p.loop_start for p in mesh.polygons][:1]}, open(pref + '-malla.json', 'w'))
np.array(tri, np.int32).tofile(pref + '-tris.bin')
print('malla', len(mesh.loops), 'esquinas', len(tri), 'triángulos')
if src.endswith('.glb'): salir()
# el pelo: sus mallas y el esqueleto (los huesos que no usa se exportan igual: los nombres casan con los del chico)
bpy.ops.object.select_all(action='DESELECT')
pelo = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Hair')]
for o in pelo: o.select_set(True)
arm.select_set(True); bpy.context.view_layer.objects.active = arm
arm.data.pose_position = 'REST'
bpy.ops.export_scene.gltf(filepath=pref + '-pelo.glb', export_format='GLB', use_selection=True, export_animations=False, export_skins=True,
                          export_morph=False, export_yup=True, export_apply=False, export_materials='EXPORT', export_image_format='AUTO')
print('pelo', [o.name for o in pelo])
salir()
