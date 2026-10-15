# Lo común a los guiones de las chicas: abrir un personaje de Meshy en reposo (con el esqueleto tal cual, para que
# sirvan sus mismas animaciones), medirlo, leer su textura y renderizar vistas de prueba.
# Coordenadas: las de Blender (Z arriba, delante es -Y). «Fracción»: dividido por la altura H, con y desde los pies,
# como en el juego (src/actors/trajes.js): fx = x / H, fy = (z - z0) / H, fz = -y / H (delante, positivo).
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix
import numpy as np

def abrir(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # (con 'BLENDER' los huesos salen tal cual: el modelo nuevo usa las animaciones del original sin tocarlas)
    bpy.ops.import_scene.gltf(filepath=glb, bone_heuristic='BLENDER')
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); arm.data.pose_position = 'REST'
    me = next(o for o in bpy.data.objects if o.type == 'MESH'); bpy.context.view_layer.update()
    return arm, me

class Medidas:
    """La caja del cuerpo en reposo y el paso a fracción de la altura y de vuelta. Las del modelo original se guardan
    (guardar) y los pasos siguientes las leen (desde): sin el pelo del chico la cabeza es más baja y cambiaría todo."""
    def __init__(self, me=None, desde=None):
        if desde:
            import json; d = json.load(open(desde)); self.z0, self.z1, self.H, self.cx, self.cy = d['z0'], d['z1'], d['H'], d['cx'], d['cy']; return
        M = me.matrix_world; P = [M @ v.co for v in me.data.vertices]
        self.z0 = min(p.z for p in P); self.z1 = max(p.z for p in P); self.H = self.z1 - self.z0
        self.cx = (min(p.x for p in P) + max(p.x for p in P)) / 2; self.cy = (min(p.y for p in P) + max(p.y for p in P)) / 2
    def guardar(self, ruta):
        import json; json.dump({'z0': self.z0, 'z1': self.z1, 'H': self.H, 'cx': self.cx, 'cy': self.cy}, open(ruta, 'w'))
    def frac(self, p): return Vector(((p.x - self.cx) / self.H, (p.z - self.z0) / self.H, -(p.y - self.cy) / self.H))
    def mundo(self, f): return Vector((self.cx + f.x * self.H, self.cy - f.z * self.H, self.z0 + f.y * self.H))

def pesos(me, nombre):
    g = me.vertex_groups.get(nombre); i = g.index if g else -1
    return np.array([next((x.weight for x in v.groups if x.group == i), 0.0) for v in me.data.vertices], np.float32)

def textura(me):
    """La imagen de la textura del cuerpo como matriz (alto, ancho, 3) en sRGB 0..255 (fila 0 arriba) y su nodo."""
    nt = me.data.materials[0].node_tree; tex = next(n for n in nt.nodes if n.type == 'TEX_IMAGE'); im = tex.image
    w, h = im.size; buf = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(buf)
    a = buf.reshape(h, w, 4)[::-1, :, :3]
    return (np.clip(a, 0, 1) * 255).astype(np.float32), tex

def guardar_png(a, ruta):
    from PIL import Image
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(ruta)

def copias(me, tol=2e-5):
    """Los vértices repetidos en las costuras de la textura: grupo de cada vértice (mismo sitio) y lista de grupos."""
    from mathutils.kdtree import KDTree
    M = me.matrix_world; V = me.data.vertices; P = [M @ v.co for v in V]
    kd = KDTree(len(P))
    for i, p in enumerate(P): kd.insert(p, i)
    kd.balance(); key = [-1] * len(P); grupos = []
    for i, p in enumerate(P):
        if key[i] >= 0: continue
        g = len(grupos); miembros = []
        for (_, j, _) in kd.find_range(p, tol):
            if key[j] < 0: key[j] = g; miembros.append(j)
        grupos.append(miembros)
    return np.array(key), grupos

# ---------- renders de prueba (Cycles en la CPU) ----------
def montar(fondo=(0.16, 0.12, 0.24), muestras=40):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = muestras; sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (*fondo, 1); bg.inputs[1].default_value = 0.6
    def luz(nombre, pos, energia, color, size):
        d = bpy.data.lights.new(nombre, 'AREA'); d.energy = energia; d.color = color; d.size = size
        o = bpy.data.objects.new(nombre, d); sc.collection.objects.link(o); o.location = pos
        o.rotation_euler = (Vector((0, 0, 0.9)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    luz('clave', (1.6, -2.4, 2.6), 420, (1, 0.96, 0.9), 2.2)
    luz('relleno', (-2.4, -1.6, 1.4), 160, (0.85, 0.9, 1.0), 2.5)
    luz('contra', (0.4, 2.6, 2.4), 260, (1, 0.85, 1.0), 1.5)

def foto(ruta, yaw, alto, foco, dist, lente=50, w=640, h=None):
    sc = bpy.context.scene
    cam = bpy.data.objects.get('cam') or bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
    sc.camera = cam; cam.data.lens = lente; cam.data.clip_start = 0.01
    a = math.radians(yaw); cam.location = Vector((foco.x + math.sin(a) * dist, foco.y - math.cos(a) * dist, alto))
    cam.rotation_euler = (foco - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = w; sc.render.resolution_y = h or int(w * 4 / 3)
    sc.render.filepath = ruta; bpy.ops.render.render(write_still=True)

def salir():
    sys.stdout.flush(); os._exit(0)   # (bpy como módulo se cae al cerrarse: salida limpia)

# ---------- el nacimiento del pelo de la chica (el mismo para todos sus peinados) ----------
def suave(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
class Nacimiento:
    """El nacimiento del pelo medido en el cráneo liso (nacimiento.py), suavizado y hecho de chica: patillas cortas y la
    nuca en su sitio (el chico lo traía hasta el cuello). e(a): elevación en grados en la dirección a (grados, 0 delante,
    90 a su izquierda)."""
    def __init__(self, ruta_json):
        import json
        nace = json.load(open(ruta_json)); E = [r['nace'][0] if r['nace'] else -60 for r in nace]
        for _ in range(2): E = [sum(E[(i + k) % len(E)] * wk for k, wk in ((-2, 1), (-1, 2), (0, 3), (1, 2), (2, 1))) / 9 for i in range(len(E))]
        self.E = E
    def e(self, a):
        E = self.E; x = (a % 360) / 360 * len(E); i = int(x) % len(E); f = x - int(x)
        e = E[i] * (1 - f) + E[(i + 1) % len(E)] * f
        # (la frente despejada: el flequillo del chico, aplastado, bajaba hasta las cejas)
        fr = abs(((a + 180) % 360) - 180)
        if fr < 56: e = max(e, 30 - 5 * suave(fr / 40) - 20 * suave((fr - 34) / 22))
        # (por los lados y atrás, una línea de chica, suave: la patilla corta delante de la oreja, por encima y por
        # detrás de ella, bajando a la nuca, donde el cráneo se encuentra con el cuello)
        if fr >= 56:
            ex = [(56, max(e, 5.0)), (62, -7), (80, -15), (100, -22), (118, -34), (135, -48), (152, -56), (180, -56)]
            for (a0, e0), (a1, e1) in zip(ex, ex[1:]):
                if a0 <= fr <= a1: t = suave((fr - a0) / (a1 - a0)); e = e0 + (e1 - e0) * t; break
        return e
def dir_ae(a_deg, e_deg):
    a, e = math.radians(a_deg), math.radians(e_deg)
    return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
def ae_dir(d):
    d = d.normalized(); return math.degrees(math.atan2(d.x, -d.y)) % 360, math.degrees(math.asin(max(-1, min(1, d.z))))
