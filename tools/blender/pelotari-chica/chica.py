# La pelotari: la misma base que el pelotari del juego (su malla, su esqueleto, su textura y sus medidas) y, encima,
# lo que la hace chica, hecho para ella y no pegado: la cara repintada en su textura (cejas finas, raya y pestañas, algo
# de color en el labio), la nariz un poco más pequeña y dos coletas de mechones rizados, por detrás de las orejas, cada
# una con su coletero. Todo el pelo nuevo va unido al hueso de la cabeza: se mueve con las animaciones del juego.
# Uso: python3 chica.py -- <pelotari.glb> <carpeta> <chica|chico> [ancho]
# Pasos, en una carpeta de trabajo (con Blender 4.2 como módulo de Python, bpy):
#   1. node tools/glb-abrir.mjs src/assets/meshy/pelotari.glb <carpeta>/pelotari-hd.glb   (sin compresión: Blender no la lee)
#   2. python3 mapas_cara.py -- <carpeta>/pelotari-hd.glb <carpeta>/cara    (vista frontal: color, UV y profundidad)
#   3. python3 -I cara_editar.py <carpeta>                                  (cejas, pestañas y labio, pintados en la vista)
#   4. python3 -I mechones_tex.py <carpeta>/mechones.png                     (textura de los mechones)
#   5. python3 proyectar.py -- <carpeta>/pelotari-hd.glb <carpeta>           (los retoques, a la textura del modelo)
#   6. python3 chica.py -- <carpeta>/pelotari-hd.glb <carpeta> chica 640     (el modelo pelotari_chica.glb y sus vistas;
#      con «chico», las mismas vistas del pelotari, para comparar)
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import *
from mathutils.bvhtree import BVHTree
import random, os
argv = sys.argv[sys.argv.index('--') + 1:]
glb, d, modo = argv[0], argv[1], argv[2]; W = int(argv[3]) if len(argv) > 3 else 640
arm, me = abrir(glb)
M = me.matrix_world; Mi = M.inverted()
C = Vector((0, 0, 1.42))   # centro de la cabeza

def suave(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

def catmull(ctrl, n):
    """Puntos a lo largo de una curva que pasa por los de control (Catmull-Rom), n muestras."""
    P = [ctrl[0] + (ctrl[0] - ctrl[1])] + list(ctrl) + [ctrl[-1] + (ctrl[-1] - ctrl[-2])]
    out = []
    for i in range(n):
        t = i / (n - 1) * (len(ctrl) - 1); k = min(int(t), len(ctrl) - 2); u = t - k
        p0, p1, p2, p3 = P[k], P[k + 1], P[k + 2], P[k + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return out

def material(nombre, color=None, imagen=None, rough=0.65, spec=0.3):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Specular IOR Level'].default_value = spec
    if imagen:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(imagen); t.image.pack(); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = color
    return m

def a_la_cabeza(o):
    """El objeto, unido al hueso de la cabeza del esqueleto (peso 1)."""
    g = o.vertex_groups.new(name='mixamorig:Head'); g.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
    o.parent = arm; o.matrix_parent_inverse = arm.matrix_world.inverted()
    mo = o.modifiers.new('Armature', 'ARMATURE'); mo.object = arm

def tubo(nombre, pts, radio, mat, ring=10, plano=0.72, giro=0.0):
    """Un mechón: un tubo a lo largo de pts, de sección algo aplastada, que adelgaza según radio(t) y acaba en punta."""
    me2 = bpy.data.meshes.new(nombre); bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    n = len(pts); T = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    up = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0)); Nn = T[0].cross(up).normalized()
    rings = []
    for i in range(n):
        if i: Nn = (Nn - T[i] * Nn.dot(T[i])).normalized()        # (marco que acompaña a la curva)
        B = T[i].cross(Nn); t = i / (n - 1); r = radio(t)
        if i == n - 1: rings.append([bm.verts.new(pts[i])]); break
        ring_v = []
        for j in range(ring):
            a = 2 * math.pi * j / ring + giro * t
            ring_v.append(bm.verts.new(pts[i] + (Nn * math.cos(a) + B * math.sin(a) * plano) * r))
        rings.append(ring_v)
    for i in range(n - 2):
        for j in range(ring):
            a, b2, c, e = rings[i][j], rings[i][(j + 1) % ring], rings[i + 1][(j + 1) % ring], rings[i + 1][j]
            f = bm.faces.new((a, b2, c, e))
            for lp, (uu, vv) in zip(f.loops, ((j / ring, i / (n - 1)), ((j + 1) / ring, i / (n - 1)), ((j + 1) / ring, (i + 1) / (n - 1)), (j / ring, (i + 1) / (n - 1)))): lp[uvl].uv = (uu, vv)
    tip = rings[-1][0]
    for j in range(ring):
        f = bm.faces.new((rings[n - 2][j], rings[n - 2][(j + 1) % ring], tip))
        for lp, (uu, vv) in zip(f.loops, ((j / ring, (n - 2) / (n - 1)), ((j + 1) / ring, (n - 2) / (n - 1)), ((j + 0.5) / ring, 1.0))): lp[uvl].uv = (uu, vv)
    cap = bm.faces.new(rings[0][::-1])
    for lp in cap.loops: lp[uvl].uv = (0.5, 0.0)
    bm.to_mesh(me2); bm.free()
    o = bpy.data.objects.new(nombre, me2); bpy.context.scene.collection.objects.link(o)
    for p in me2.polygons: p.use_smooth = True
    me2.materials.append(mat)
    sd = o.modifiers.new('sub', 'SUBSURF'); sd.levels = sd.render_levels = 1
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='sub')
    return o

if modo == 'chica':
    # 1. la textura con la cara repintada
    mat0 = me.data.materials[0]; tex = next(n for n in mat0.node_tree.nodes if n.type == 'TEX_IMAGE')
    im = bpy.data.images.load(f'{d}/textura-chica.png'); im.pack(); tex.image = im
    # 2. la nariz, un 16 % más pequeña hacia su base, con un borde suave
    w = pesos(me, 'mixamorig:Head'); V = me.data.vertices; P = [M @ v.co for v in V]
    tipi = min((i for i, p in enumerate(P) if w[i] > 0.5 and abs(p.x) < 0.05 and 1.22 < p.z < 1.38), key=lambda i: P[i].y)
    tip = P[tipi].copy(); base = tip + Vector((0, 0.06, 0.012)); R = 0.085
    for i, p in enumerate(P):          # (sin mirar el peso de cada copia: todas las del mismo punto se mueven igual)
        dd = (p - tip).length
        if dd < R and p.y < tip.y + 0.07 and abs(p.x) < 0.2 and not os.environ.get('SIN_NARIZ'):
            f = 1 - suave(dd / R); V[i].co = Mi @ (base + (p - base) * (1 - 0.16 * f))
    # el relieve de las cejas gruesas (estaban esculpidas, no solo pintadas): se alisa la malla donde estaban
    from PIL import Image as PImage, ImageFilter as PF
    import numpy as np
    MO = np.asarray(PImage.open(f'{d}/cara-cejas-viejas.png').filter(PF.MaxFilter(15)).filter(PF.GaussianBlur(10)), np.float32) / 255
    # (el modelo trae cada punto repetido en las costuras de su textura troceada: se alisa por posición, con todas sus
    # copias a la vez; alisando cada copia por su lado se abrían grietas)
    P = [M @ v.co for v in V]
    from mathutils.kdtree import KDTree
    kd = KDTree(len(P))
    for i, p in enumerate(P): kd.insert(p, i)
    kd.balance(); key = [None] * len(P); G = {}
    for i, p in enumerate(P):          # (copias: a menos de 0,02 mm; agrupadas por distancia, no redondeando)
        if key[i] is not None: continue
        for (_, j, _) in kd.find_range(p, 2e-5):
            if key[j] is None: key[j] = i
        G.setdefault(i, [])
    for i, k in enumerate(key): G[k].append(i)
    gid = {k: n for n, k in enumerate(G)}; gv = [i for i in range(len(V))]; gpos = [P[G[k][0]].copy() for k in G]; gnb = [set() for _ in G]
    for e in me.data.edges:
        a, b = gid[key[e.vertices[0]]], gid[key[e.vertices[1]]]
        if a != b: gnb[a].add(b); gnb[b].add(a)
    kw = {}
    for k, n in gid.items():
        p = gpos[n]; i0 = G[k][0]
        if w[i0] < 0.5 or p.y > -0.12: continue
        px = int((p.x + 0.34) / 0.68 * 2048); py = int((1.76 - p.z) / 0.68 * 2048)
        if 0 <= px < 2048 and 0 <= py < 2048 and MO[py, px] > 0.02: kw[n] = float(MO[py, px])
    # (solo se aplana el relieve: cada punto se mueve en la dirección de su normal, no de lado, y los puntos del borde de
    # una pieza no se tocan; si no, se abrían rendijas entre piezas que solo se tocan)
    ecount = {}
    for f in me.data.polygons:
        vs = [gid[key[i]] for i in f.vertices]
        for a, b in zip(vs, vs[1:] + vs[:1]):
            if a != b: e = (min(a, b), max(a, b)); ecount[e] = ecount.get(e, 0) + 1
    borde = set()
    for (a, b), c in ecount.items():
        if c == 1: borde.add(a); borde.add(b)
    R3 = M.to_3x3(); gnor = {}
    for k_, n in gid.items():
        if n in kw: gnor[n] = (R3 @ V[G[k_][0]].normal).normalized()
    for n in list(kw):
        if n in borde: del kw[n]
    for _ in range(0 if os.environ.get('SIN_ALISAR') else 10):
        Q = {}
        for n, k in kw.items():
            if not gnb[n]: continue
            dlt = sum((gpos[j] for j in gnb[n]), Vector()) / len(gnb[n]) - gpos[n]; nn = gnor[n]
            Q[n] = gpos[n] + nn * dlt.dot(nn) * 0.5 * k
        for n, q in Q.items(): gpos[n] = q
    for k, n in gid.items():
        if n in kw:
            for i in G[k]: V[i].co = Mi @ gpos[n]
    print('ALISADOS', len(kw), 'puntos (de', len(G), ')')
    me.data.update(); P = [M @ v.co for v in V]
    bvh = BVHTree.FromPolygons([tuple(p) for p in P], [tuple(f.vertices) for f in me.data.polygons])
    def fuera(pts, radio, desde=0.1, hueco=0.006):
        """Aparta de la piel y del pelo los puntos que quedarían dentro o rozando (salvo la raíz, que va metida)."""
        pts = [p.copy() for p in pts]
        for _ in range(4):
            for i, p in enumerate(pts):
                t = i / (len(pts) - 1)
                if t < desde: continue
                loc, nor, _, dist = bvh.find_nearest(p)
                if loc is None: continue
                need = radio(t) * 0.9 + hueco; inside = (p - loc).dot(nor) < 0
                if inside or dist < need: pts[i] = loc + nor * need
            pts = [pts[0]] + [(pts[i - 1] + pts[i] * 2 + pts[i + 1]) / 4 for i in range(1, len(pts) - 1)] + [pts[-1]]
        return pts
    def superficie(dirv):
        dirv = dirv.normalized(); hit = bvh.ray_cast(C + dirv * 0.9, -dirv)
        return hit[0] if hit[0] is not None else C + dirv * 0.3
    mpelo = material('pelo', imagen=f'{d}/mechones.png', rough=0.62, spec=0.28)
    mcolet = material('coletero', color=(0.62, 0.035, 0.05, 1), rough=0.85, spec=0.15)
    random.seed(11)
    # 3. dos coletas a los lados, por detrás de las orejas: un haz de mechones rizados que sale de su coletero y cae
    # hasta los hombros (se leen de frente, de lado y de espaldas, que es como se ve casi siempre al jugador)
    def coletero(nombre, c0, t0):
        bm = bmesh.new(); nx = t0.cross(Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))).normalized(); ny = t0.cross(nx)
        RA, ra, U, Vn = 0.034, 0.015, 48, 12; ring = []
        for i in range(U):
            a = 2 * math.pi * i / U; rad_v = (nx * math.cos(a) + ny * math.sin(a)); ctr = c0 + rad_v * RA
            rr2 = ra * (1 + 0.28 * math.sin(a * 9)); ring.append([bm.verts.new(ctr + (rad_v * math.cos(b) + t0 * math.sin(b)) * rr2) for b in (2 * math.pi * j / Vn for j in range(Vn))])
        for i in range(U):
            for j in range(Vn): bm.faces.new((ring[i][j], ring[(i + 1) % U][j], ring[(i + 1) % U][(j + 1) % Vn], ring[i][(j + 1) % Vn]))
        mc = bpy.data.meshes.new(nombre); bm.to_mesh(mc); bm.free(); oc = bpy.data.objects.new(nombre, mc); bpy.context.scene.collection.objects.link(oc)
        for p in mc.polygons: p.use_smooth = True
        mc.materials.append(mcolet)
    for s in (-1, 1):
        A = superficie(Vector((0.74 * s, 0.50, 0.26)))
        ctrl = [A, A + Vector((0.05 * s, 0.03, -0.005)), A + Vector((0.085 * s, 0.045, -0.08)), A + Vector((0.09 * s, 0.035, -0.18)), A + Vector((0.07 * s, 0.015, -0.27)), A + Vector((0.08 * s, -0.005, -0.32))]
        eje = catmull(ctrl, 34); ne = len(eje)
        Te = [(eje[min(i + 1, ne - 1)] - eje[max(i - 1, 0)]).normalized() for i in range(ne)]
        n0 = Te[0].cross(Vector((0, 0, 1))).normalized()
        nh = 8
        for k in range(nh):
            ang = 2 * math.pi * k / nh + random.uniform(-0.25, 0.25); L = random.uniform(0.8, 1.0); rr = random.uniform(0.85, 1.15)
            curl = random.choice((-1, 1)) * random.uniform(2.5, 4.0)
            Nn = n0.copy(); pts = []; m_ = int(ne * L)
            for i in range(m_):
                if i: Nn = (Nn - Te[i] * Nn.dot(Te[i])).normalized()
                B = Te[i].cross(Nn); t = i / (m_ - 1)
                abre = 0.012 + 0.032 * suave(t / 0.35) - 0.012 * suave((t - 0.6) / 0.4)        # el haz se abre y se vuelve a juntar
                a = ang + 0.6 * t
                off = (Nn * math.cos(a) + B * math.sin(a)) * abre * rr
                if t > 0.55:                                                                    # rizo en la punta
                    c = (t - 0.55) / 0.45; ca = curl * c * math.pi
                    off += (Nn * math.cos(ca + ang) + B * math.sin(ca + ang)) * 0.028 * c
                pts.append(eje[i] + off)
            rad = lambda t: (0.022 + 0.011 * suave(t / 0.3)) * (1 - suave((t - 0.5) / 0.5)) + 0.002
            pts = fuera(pts, rad, desde=0.1)
            tubo(f'coleta{s}{k}', pts, rad, mpelo, plano=0.68, giro=random.uniform(-1.5, 1.5))
        core = lambda t: (0.027 + 0.01 * suave(t / 0.3)) * (1 - suave((t - 0.4) / 0.5)) + 0.002
        tubo(f'coleta{s}-alma', fuera(eje[:26], core, desde=0.1), core, mpelo, ring=12, plano=0.85)
        coletero(f'coletero{s}', eje[2], Te[2])
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and (o.name.startswith(('coleta', 'mechon', 'coletero')))]: a_la_cabeza(o)
    bpy.ops.wm.save_as_mainfile(filepath=f'{d}/chica.blend')
    # el modelo para el juego: mismo esqueleto y mismas animaciones
    for o in bpy.data.objects: o.select_set(o.type in ('MESH', 'ARMATURE'))
    arm.data.pose_position = 'POSE'
    bpy.ops.export_scene.gltf(filepath=f'{d}/pelotari_chica.glb', export_format='GLB', use_selection=True, export_skins=True, export_animations=True, export_apply=False)
    arm.data.pose_position = 'REST'

# vistas
import vistas
vistas.W = W; vistas.out = f'{d}/{modo}'
vistas.montar(); mn, mx = vistas.caja(); H = 1.70; c = Vector((0, 0, H * 0.5))
for n, y in (('frente', 0), ('tres-cuartos', 35), ('lado', 90), ('tres-cuartos-atras', 145), ('espalda', 180)): vistas.render(n, y, H * 0.55, c, H * 2.55)
vistas.render('cara', 20, H * 0.84, Vector((0, 0, H * 0.82)), H * 0.95, 70, W)
vistas.render('cara-lado', 70, H * 0.84, Vector((0, 0.03, H * 0.82)), H * 1.05, 70, W)
print('HECHO', modo)
sys.stdout.flush(); os._exit(0)  # bpy como módulo se cae al cerrarse: salida limpia
