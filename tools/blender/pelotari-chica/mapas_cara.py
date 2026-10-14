# Vista frontal ortográfica de la cabeza: el color de la textura tal cual (cara-color.png) y, píxel a píxel, la UV y lo
# de frente que mira la superficie (cara-uv.exr: R = u, G = v, B = frente). Sirve para pintar en la vista y llevarlo a la textura.
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import *
argv = sys.argv[sys.argv.index('--') + 1:]
glb, out = argv[0], argv[1]; N = 2048
arm, me = abrir(glb)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0
sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.render.filter_size = 0.01
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 0.68; cam.location = (0, -3, 1.42); cam.rotation_euler = (math.pi / 2, 0, 0)
sc.render.resolution_x = sc.render.resolution_y = N
mat = me.data.materials[0]; nt = mat.node_tree
tex = next(n for n in nt.nodes if n.type == 'TEX_IMAGE'); outn = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], outn.inputs['Surface'])
sc.cycles.samples = 16; sc.render.filepath = out + '-color.png'; sc.render.image_settings.file_format = 'PNG'; bpy.ops.render.render(write_still=True)
# UV y frente
uv = nt.nodes.new('ShaderNodeUVMap'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); geo = nt.nodes.new('ShaderNodeNewGeometry')
sepn = nt.nodes.new('ShaderNodeSeparateXYZ'); neg = nt.nodes.new('ShaderNodeMath'); neg.operation = 'MULTIPLY'; neg.inputs[1].default_value = -1
comb = nt.nodes.new('ShaderNodeCombineXYZ')
nt.links.new(uv.outputs['UV'], sep.inputs[0]); nt.links.new(geo.outputs['Normal'], sepn.inputs[0]); nt.links.new(sepn.outputs['Y'], neg.inputs[0])
nt.links.new(sep.outputs['X'], comb.inputs['X']); nt.links.new(sep.outputs['Y'], comb.inputs['Y']); nt.links.new(neg.outputs[0], comb.inputs['Z'])
nt.links.new(comb.outputs[0], em.inputs['Color'])
sc.view_settings.view_transform = 'Raw'; sc.cycles.samples = 1; sc.cycles.use_denoising = False
sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '32'
sc.render.filepath = out + '-uv.exr'; bpy.ops.render.render(write_still=True)
# profundidad: la Y del mundo de lo que se ve en cada píxel (R)
pos = nt.nodes.new('ShaderNodeNewGeometry'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); cb = nt.nodes.new('ShaderNodeCombineXYZ')
nt.links.new(pos.outputs['Position'], sp.inputs[0]); nt.links.new(sp.outputs['Y'], cb.inputs['X']); nt.links.new(cb.outputs[0], em.inputs['Color'])
sc.render.filepath = out + '-prof.exr'; bpy.ops.render.render(write_still=True)
img = tex.image; img.filepath_raw = out + '-textura.png'; img.file_format = 'PNG'; img.save()
print('HECHO')
sys.stdout.flush(); os._exit(0)  # bpy como módulo se cae al cerrarse: salida limpia
