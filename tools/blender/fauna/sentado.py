"""Pose «Sentado» para los perros (ShibaInu y Husky de Quaternius, que no la traen): el cuerpo gira hacia arriba
sobre la cadera, que baja hasta el suelo; las patas delanteras quedan rectas bajo el pecho, la cabeza mira al
frente y la cola descansa en el suelo. Se guarda como acción «Sit» (y unos segundos de respiración) y se exporta a
/tmp/fauna_der/<Perro>.glb; luego tools/animalpack.mjs la empaqueta con las demás.
Uso: python3.11 tools/blender/fauna/sentado.py [render]"""
import bpy, math, os, sys
from mathutils import Matrix, Vector

SRC = os.path.join(os.getcwd(), 'src', 'assets', 'animals')
ANG, NECK, THIGH, SHIN, FRONT = [float(v) for v in os.environ.get('SIT', '38,-30,-40,60,38').split(',')]
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
    foot = (rest['FrontLowerLeg.L'] @ Vector((0, arm.data.bones['FrontLowerLeg.L'].length, 0))).z
    sh0 = (rest['FrontUpperLeg.L'].to_translation() + rest['FrontUpperLeg.R'].to_translation()) / 2
    def pose(t):
        # las pezuñas son huesos sueltos (quedan en el suelo): basta con bajar la grupa girando el cuerpo sobre
        # los hombros; las patas traseras quedan dobladas bajo la cadera y las delanteras rectas
        breath = math.sin(t * math.pi * 2) * 0.01
        ang = math.radians(-ANG)
        T = Matrix.Translation(Vector((0, sh0.y, sh0.z + breath))) @ Matrix.Rotation(ang, 4, 'X') @ Matrix.Translation(-Vector((0, sh0.y, sh0.z)))
        pb['Body'].matrix = T @ rest['Body']; bpy.context.view_layer.update()
        for n, a in (('Neck1', NECK), ('Neck2', NECK * 0.5)):
            if n in pb: pb[n].rotation_quaternion = Matrix.Rotation(math.radians(a), 4, 'X').to_quaternion()
        for s in ('L', 'R'):
            if 'FrontUpperLeg.' + s in pb: pb['FrontUpperLeg.' + s].rotation_quaternion = Matrix.Rotation(math.radians(FRONT), 4, 'X').to_quaternion()
            for n, a in (('BackUpperLeg.' + s, THIGH), ('BackLowerLeg.' + s, SHIN)):
                if n in pb: pb[n].rotation_quaternion = Matrix.Rotation(math.radians(a), 4, 'X').to_quaternion()
        for n, a in (('Tail1', -30), ('Tail2', -15)):
            if n in pb: pb[n].rotation_quaternion = Matrix.Rotation(math.radians(a), 4, 'X').to_quaternion()
        bpy.context.view_layer.update()
        # todo baja hasta que las manos (punta de la pata delantera) tocan el suelo
        tip = min((pb['FrontLowerLeg.' + s].matrix @ Vector((0, pb['FrontLowerLeg.' + s].length, 0))).z for s in ('L', 'R'))
        pb['Body'].matrix = Matrix.Translation(Vector((0, 0, foot - tip))) @ pb['Body'].matrix; bpy.context.view_layer.update()
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
        cam.location = (11, -0.5, 1.6); cam.rotation_euler = (math.radians(86), 0, math.radians(90)); bpy.context.scene.camera = cam
        sun = bpy.data.objects.new('SUN', bpy.data.lights.new('SUN', 'SUN')); bpy.context.scene.collection.objects.link(sun); sun.rotation_euler = (0.6, 0.3, 0.8)
        sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE_NEXT'; sc.render.resolution_x = 640; sc.render.resolution_y = 480; sc.render.filepath = f'/tmp/fauna_der/{name}_sit.png'
        bpy.ops.render.render(write_still=True)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_yup=True, export_force_sampling=True)
    print('SENTADO', name)

if __name__ == '__main__':
    for n in ([a for a in sys.argv[1:] if a in ('ShibaInu', 'Husky')] or ['ShibaInu', 'Husky']): sentar(n, 'render' in sys.argv)
