# Funciones comunes: abrir el pelotari en reposo y medir la cabeza
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix
def abrir(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); arm.data.pose_position = 'REST'
    me = next(o for o in bpy.data.objects if o.type == 'MESH'); bpy.context.view_layer.update()
    return arm, me
def pesos(me, nombre):
    g = me.vertex_groups.get(nombre); i = g.index if g else -1
    return [next((x.weight for x in v.groups if x.group == i), 0.0) for v in me.data.vertices]
def cabeza(arm, me):
    M = me.matrix_world; w = pesos(me, 'mixamorig:Head'); P = [M @ v.co for v in me.data.vertices]
    H = [p for p, k in zip(P, w) if k > 0.9]
    mn = Vector((min(p.x for p in H), min(p.y for p in H), min(p.z for p in H))); mx = Vector((max(p.x for p in H), max(p.y for p in H), max(p.z for p in H)))
    hb = arm.data.bones['mixamorig:Head']; hp = arm.matrix_world @ hb.head_local
    return mn, mx, hp
