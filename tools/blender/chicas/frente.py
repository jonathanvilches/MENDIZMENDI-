# Vista de frente de la cara, plana (el color de la textura tal cual, sin luces) y ortográfica, con una rejilla cada 0,01
# de la altura (más marcada cada 0,05): para medir dónde van cejas, ojos, nariz y boca, en fracción.
# Uso: python3 frente.py -- <calva.blend> <salida.png> [textura.png] [y_centro=0.8] [lado=0.3]
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *
argv = sys.argv[sys.argv.index('--') + 1:]; src, out = argv[0], argv[1]
tex = argv[2] if len(argv) > 2 and argv[2] != '-' else None; yc = float(argv[3]) if len(argv) > 3 else 0.8; lado = float(argv[4]) if len(argv) > 4 else 0.3
bpy.ops.wm.open_mainfile(filepath=src)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith('Hair'): o.hide_render = True
me = next(o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('Hair'))
K = Medidas(desde=src.split('-coleta')[0].replace('.blend', '') + ('' if '-calva' in src else '-calva') + '-medidas.json') if '-calva' not in src else Medidas(desde=src.replace('.blend', '-medidas.json'))
nt = me.data.materials[0].node_tree; t = next(n for n in nt.nodes if n.type == 'TEX_IMAGE'); outn = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
if tex: im = bpy.data.images.load(tex); t.image = im
em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(t.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], outn.inputs['Surface'])
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.1, 0.1, 0.12, 1)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = lado * K.H; c = K.mundo(Vector((0, yc, 0.5))); cam.location = c; cam.rotation_euler = (math.pi / 2, 0, 0)
N = 1200; sc.render.resolution_x = sc.render.resolution_y = N; sc.render.filepath = out; bpy.ops.render.render(write_still=True)
from PIL import Image, ImageDraw
img = Image.open(out).convert('RGB'); g = ImageDraw.Draw(img)
for k in range(-30, 31):
    v = k * 0.01; px = N / 2 + v / lado * N; py = N / 2 - v / lado * N
    col = (80, 200, 255) if k % 5 == 0 else (60, 90, 120)
    g.line([(px, 0), (px, N)], fill=col, width=1); g.line([(0, py), (N, py)], fill=col, width=1)
    if k % 5 == 0: g.text((px + 2, 2), f'{v:+.2f}', fill=(255, 255, 0)); g.text((2, py + 2), f'{yc + v:.2f}', fill=(255, 255, 0))
img.save(out); print('HECHO')
salir()
