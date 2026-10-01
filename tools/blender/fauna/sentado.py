"""Pose «Sentado» para los perros (ShibaInu y Husky de Quaternius, que no la traen): el cuerpo gira hacia arriba
sobre la cadera, que baja hasta el suelo; las patas delanteras quedan rectas bajo el pecho, la cabeza mira al
frente y la cola descansa en el suelo. Se guarda como acción «Sit» (y unos segundos de respiración) y se exporta a
/tmp/fauna_der/<Perro>.glb; luego tools/animalpack.mjs la empaqueta con las demás.
Uso: python3.11 tools/blender/fauna/sentado.py [render]"""
import bpy, math, os, sys
from mathutils import Matrix, Vector

SRC = os.path.join(os.getcwd(), 'src', 'assets', 'animals')
OUT = '/tmp/fauna_der'

def sentar(name, render=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, name + '.glb'))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    arm.animation_data_create()
    act = bpy.data.actions.new('Sit'); arm.animation_data.action = act
    pb = arm.pose.bones
    for b in pb: b.location = (0, 0, 0); b.rotation_quaternion = (1, 0, 0, 0); b.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    rest = {b.name: b.bone.matrix_local.copy() for b in pb}
    hip = (rest['BackLeg.L'].to_translation() + rest['BackLeg.R'].to_translation()) / 2
    def pose(t):
        breath = math.sin(t * math.pi * 2) * 0.012
        ang = math.radians(-38)
        # el cuerpo gira sobre la cadera, que baja casi al suelo
        T = Matrix.Translation(Vector((0, 0.1, hip.z * 0.32 + breath))) @ Matrix.Rotation(ang, 4, 'X') @ Matrix.Translation(-Vector((0, hip.y, hip.z)))
        pb['Body'].matrix = T @ rest['Body']; bpy.context.view_layer.update()
        # cabeza y cuello compensan para mirar al frente
        for n, a in (('Neck1', 18), ('Neck2', 10), ('Head', 8)):
            if n in pb: pb[n].rotation_quaternion = Matrix.Rotation(math.radians(a), 4, 'X').to_quaternion()
        # patas delanteras: las pezuñas (huesos IK sueltos) bajo los hombros, en el suelo
        bpy.context.view_layer.update()
        for s in ('L', 'R'):
            sh = (arm.matrix_world.inverted() @ arm.matrix_world @ pb['FrontUpperLeg.' + s].matrix).to_translation()
            ik = 'IKFrontLeg.' + s
            if ik in pb:
                m = rest[ik].copy(); m.translation = Vector((m.translation.x, sh.y - 0.05, rest[ik].translation.z)); pb[ik].matrix = m
            # pata trasera recogida: el muslo hacia delante, pegado al suelo
            for n, a in (('BackUpperLeg.' + s, -35), ('BackLowerLeg.' + s, 40)):
                if n in pb: pb[n].rotation_quaternion = Matrix.Rotation(math.radians(a), 4, 'X').to_quaternion()
            ikb = 'IKBackLeg.' + s
            if ikb in pb:
                m = rest[ikb].copy(); m.translation = Vector((m.translation.x, m.translation.y - 0.25, m.translation.z)); pb[ikb].matrix = m
        for n, a in (('Tail1', -40), ('Tail2', -20), ('Tail3', -10)):
            if n in pb: pb[n].rotation_quaternion = Matrix.Rotation(math.radians(a), 4, 'X').to_quaternion()
        bpy.context.view_layer.update()
    for f, t in ((1, 0), (13, 0.5), (25, 1.0)):
        pose(t)
        for b in pb:
            b.keyframe_insert('location', frame=f); b.keyframe_insert('rotation_quaternion', frame=f)
    act.use_fake_user = True
    # las demás acciones siguen en el archivo (el exportador las incluye todas)
    for a in bpy.data.actions: a.use_fake_user = True
    if render:
        bpy.context.scene.frame_set(1)
        cam = bpy.data.objects.new('CAM', bpy.data.cameras.new('CAM')); bpy.context.scene.collection.objects.link(cam)
        cam.location = (9, -2, 2); cam.rotation_euler = (math.radians(84), 0, math.radians(90)); bpy.context.scene.camera = cam
        sun = bpy.data.objects.new('SUN', bpy.data.lights.new('SUN', 'SUN')); bpy.context.scene.collection.objects.link(sun); sun.rotation_euler = (0.6, 0.3, 0.8)
        sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE_NEXT'; sc.render.resolution_x = 640; sc.render.resolution_y = 480; sc.render.filepath = f'/tmp/fauna_der/{name}_sit.png'
        bpy.ops.render.render(write_still=True)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_yup=True, export_force_sampling=True)
    print('SENTADO', name)

if __name__ == '__main__':
    for n in ('ShibaInu', 'Husky'): sentar(n, 'render' in sys.argv)
