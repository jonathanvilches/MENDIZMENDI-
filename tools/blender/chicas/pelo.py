# Paso 2 de las chicas: el pelo nuevo, modelado sobre el cráneo liso (cabeza.py) en mechones gruesos como los del modelo
# (el mismo estilo de figura de plastilina pulida). Peinados:
#   coleta: todo el pelo recogido hacia atrás en una coleta alta, con su coletero y dos mechones sueltos junto a la cara
# Los mechones salen del nacimiento del pelo medido en la textura (nacimiento.py) y van, por el cráneo, hasta donde se
# recogen; la coleta lleva tres huesos (Hair_1..3, hijos de la cabeza) que el juego mueve como muelles al correr.
# Uso: python3 pelo.py -- <calva.blend> <salida.blend> <peinado> [vistas_prefijo]
import os, sys, json, random; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]; src, out, peinado = argv[0], argv[1], argv[2]; pref = argv[3] if len(argv) > 3 else None
bpy.ops.wm.open_mainfile(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); me = next(o for o in bpy.data.objects if o.type == 'MESH')
K = Medidas(desde=src.replace('.blend', '-medidas.json')); M = me.matrix_world; H = K.H; D = os.path.dirname(src)
if os.environ.get('TEX'):        # (la textura de la cabeza ya repintada: textura.py)
    _t = next(n for n in me.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE'); _im = bpy.data.images.load(os.environ['TEX']); _im.pack(); _t.image = _im
nace = json.load(open(src.replace('.blend', '-nacimiento.json')))
mesh = me.data; Pw = [M @ v.co for v in mesh.vertices]
# (el cráneo sin las orejas: el pelo pasa por encima y por detrás de ellas, no las tapa)
oreja = np.load(src.replace('.blend', '-oreja.npy')); key = np.load(src.replace('.blend', '-key.npy'))
Qc = np.load(src.replace('.blend', '-craneo.npy'))
Pc = [K.mundo(Vector(Qc[key[i]])) for i in range(len(mesh.vertices))]
bvh = BVHTree.FromPolygons([tuple(p) for p in Pc], [tuple(f.vertices) for f in mesh.polygons])
CR_C, CR_R = Vector((0, 0.8, -0.022)), Vector((0.152, 0.183, 0.163))
C = K.mundo(Vector((0, 0.8, -0.022)))
UP, BACK = Vector((0, 0, 1)), Vector((0, 1, 0))      # (en Blender: arriba Z, atrás +Y)
random.seed(5)

dirv = dir_ae
def cuero(d):
    """El cráneo en la dirección d desde el centro de la cabeza: la primera salida desde dentro (bajo las orejas, la
    cabeza y no la oreja). Devuelve el punto y la normal hacia fuera."""
    d = d.normalized(); loc, nor, fi, dist = bvh.ray_cast(C + d * 0.002, d)
    if loc is None or (loc - C).length > 0.22 * H:
        # (por el hueco de la oreja: el elipsoide del cráneo)
        df = Vector((d.x, d.z, -d.y)); q = Vector((df.x / CR_R.x, df.y / CR_R.y, df.z / CR_R.z)); r = 1 / q.length
        loc = C + d * r * H; nor = Vector((q.x / CR_R.x, -q.z / CR_R.z, q.y / CR_R.y)).normalized()
    if nor.dot(d) < 0: nor = -nor
    return loc, nor.normalized()
def slerp(a, b, t):
    om = math.acos(max(-1, min(1, a.dot(b))))
    if om < 1e-5: return a.copy()
    return (a * math.sin((1 - t) * om) + b * math.sin(t * om)) / math.sin(om)

# ---------- la malla del pelo: tubos de sección aplastada a lo largo de un camino ----------
class Malla:
    def __init__(s, nombre): s.bm = bmesh.new(); s.uv = s.bm.loops.layers.uv.new('UVMap'); s.nombre = nombre; s.pes = []   # (pesos por vértice: {hueso: w})
    def tubo(s, pts, nor, ancho, grueso, ring=8, abajo=0.4, pesos=None, rep=0.08, giro=0.0, punta=True):
        """pts: el eje; nor: la normal (hacia fuera del cráneo) en cada punto; ancho y grueso: funciones de t (0..1);
        abajo: lo aplastada que va la cara de debajo; pesos(i): huesos de cada anillo."""
        bm = s.bm; n = len(pts); T = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
        anillos = []; largo = [0.0]
        for i in range(1, n): largo.append(largo[-1] + (pts[i] - pts[i - 1]).length)
        Np = None
        for i in range(n):
            t = i / (n - 1); N = nor[i] - T[i] * nor[i].dot(T[i])
            # (si el camino va casi por la normal, el marco se volcaba: se sigue con el del punto anterior)
            if N.length < 0.35 and Np is not None: N = Np - T[i] * Np.dot(T[i])
            if Np is not None and N.normalized().dot(Np) < 0.2: N = (Np - T[i] * Np.dot(T[i])).lerp(N.normalized(), 0.3)
            N = N.normalized(); Np = N; B = T[i].cross(N)
            w, g = ancho(t) / 2, grueso(t) / 2; a0 = giro * t; anillo = []
            for j in range(ring):
                ph = 2 * math.pi * j / ring; c, sn = math.cos(ph), math.sin(ph)
                yy = sn * g * (1.0 if sn > 0 else abajo)
                rot = (B * math.cos(a0) + N * math.sin(a0), N * math.cos(a0) - B * math.sin(a0))
                v = bm.verts.new(pts[i] + rot[0] * c * w + rot[1] * yy); anillo.append(v); s.pes.append(pesos(i) if pesos else {'mixamorig:Head': 1.0})
            anillos.append(anillo)
        caras = []
        for i in range(n - 1):
            for j in range(ring):
                f = bm.faces.new((anillos[i][j], anillos[i][(j + 1) % ring], anillos[i + 1][(j + 1) % ring], anillos[i + 1][j]))
                for lp, (uu, vv) in zip(f.loops, ((j / ring, largo[i] / (rep * H)), ((j + 1) / ring, largo[i] / (rep * H)), ((j + 1) / ring, largo[i + 1] / (rep * H)), (j / ring, largo[i + 1] / (rep * H)))): lp[s.uv].uv = (uu, vv)
        for k, anillo in ((0, anillos[0]), (n - 1, anillos[-1])):
            f = bm.faces.new(anillo if k else anillo[::-1])
            for lp in f.loops: lp[s.uv].uv = (0.5, largo[k] / (rep * H))
    def objeto(s, mat, suavizar=1):
        m = bpy.data.meshes.new(s.nombre); s.bm.normal_update(); s.bm.to_mesh(m); s.bm.free()
        o = bpy.data.objects.new(s.nombre, m); bpy.context.scene.collection.objects.link(o)
        for p in m.polygons: p.use_smooth = True
        m.materials.append(mat)
        grupos = {}
        for vi, pw in enumerate(s.pes):
            for hb, w in pw.items():
                if w <= 0: continue
                g = grupos.get(hb) or o.vertex_groups.new(name=hb); grupos[hb] = g; g.add([vi], w, 'REPLACE')
        if suavizar:
            sd = o.modifiers.new('sub', 'SUBSURF'); sd.levels = sd.render_levels = suavizar
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='sub')
        o.parent = arm; o.matrix_parent_inverse = arm.matrix_world.inverted()
        mo = o.modifiers.new('Armature', 'ARMATURE'); mo.object = arm
        return o

def material(nombre, color, imagen=None, normal=None, rough=0.55):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Base Color'].default_value = color
    if imagen:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(imagen); t.image.pack()
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1.0
        nt.links.new(t.outputs['Color'], mix.inputs['A']); mix.inputs['B'].default_value = color; nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    if normal:
        t2 = nt.nodes.new('ShaderNodeTexImage'); t2.image = bpy.data.images.load(normal); t2.image.pack(); t2.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.8
        nt.links.new(t2.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m

CASTANO = (0.20, 0.105, 0.06, 1)
mpelo = material('Pelo', CASTANO, f'{D}/pelo-color.png', f'{D}/pelo-relieve.png', 0.5)

# ---------- la nariz, más pequeña (hacia su base, y algo más estrecha), con todas las copias de cada punto a la vez ----------
if os.environ.get('NARIZ', '1') != '0':
    keyn = np.load(src.replace('.blend', '-key.npy')); Pf = np.array([tuple(K.frac(M @ v.co)) for v in mesh.vertices])
    cand = np.nonzero((np.abs(Pf[:, 0]) < 0.03) & (Pf[:, 1] > 0.735) & (Pf[:, 1] < 0.79))[0]
    tip = Pf[cand[np.argmax(Pf[cand, 2])]]; base = tip + np.array([0.0, 0.006, -0.034])
    dist = np.linalg.norm((Pf - tip) * np.array([1.0, 1.0, 0.8]), axis=1)
    w = 1 - np.clip((dist - 0.020) / 0.030, 0, 1); w = w * w * (3 - 2 * w); w[Pf[:, 2] < tip[2] - 0.06] = 0
    k = float(os.environ.get('NARIZ_K', '0.30'))
    Q = base + (Pf - base) * (1 - k * w)[:, None]; Q[:, 0] = Pf[:, 0] * (1 - (k * 0.55) * w)
    Mi_ = M.inverted()
    for i, v in enumerate(mesh.vertices):
        if w[i] > 0: v.co = Mi_ @ K.mundo(Vector(Q[i]))
    mesh.update(); print('nariz', round(float(tip[2]), 4), int((w > 0).sum()), 'puntos')
    Pw = [M @ v.co for v in mesh.vertices]

# ---------- las orejas: por dónde caen, vistas desde el centro de la cabeza (el pelo pasa fino y pegado por debajo) ----------
from mathutils.kdtree import KDTree
_iv = [i for i in range(len(mesh.vertices)) if oreja[key[i]]]
kdo = KDTree(max(1, len(_iv)))
for j, i in enumerate(_iv): kdo.insert((Pw[i] - C).normalized(), j)
kdo.balance()
def bajo_oreja(d):
    """0 lejos de la oreja, 1 en su sombra (la dirección d pasa por la oreja)."""
    if not _iv: return 0.0
    _, _, dist = kdo.find(d.normalized()); return 1 - suave((dist - 0.03) / 0.05)

# ---------- el nacimiento (común a todos los peinados: comun.Nacimiento) ----------
NAC = Nacimiento(src.replace('.blend', '-nacimiento.json')); nacimiento = NAC.e
def dentro_pelo(d, margen=1.0):
    """La dirección d, subida si hace falta para quedar por encima del nacimiento: un mechón de la patilla que va hacia
    atrás pasa por encima de la oreja, no por debajo."""
    a, e = ae_dir(d); lim = nacimiento(a) + margen
    return dir_ae(a, lim) if e < lim else d.normalized()

# ---------- piezas comunes ----------
def rejilla(nombre, filas, cols, punto, cerrar_u=True, pesos=None, rep_u=1.0, rep_v=0.08):
    """Una superficie de filas × cols puntos (punto(i, j) → posición), cerrada a lo largo de u si cerrar_u. Las UV:
    u a lo ancho (rep_u vueltas de la textura) y v por la distancia recorrida a lo largo (cada rep_v de la altura)."""
    m = Malla(nombre); bm = m.bm; V = [[None] * cols for _ in range(filas)]; Pt = [[punto(i, j) for j in range(cols)] for i in range(filas)]
    for i in range(filas):
        for j in range(cols): V[i][j] = bm.verts.new(Pt[i][j]); m.pes.append(pesos(i, j) if pesos else {'mixamorig:Head': 1.0})
    # (distancia a lo largo de cada columna, para la v de la textura)
    Lv = [[0.0] * cols for _ in range(filas)]
    for j in range(cols):
        for i in range(1, filas): Lv[i][j] = Lv[i - 1][j] + (Pt[i][j] - Pt[i - 1][j]).length
    jj = cols if cerrar_u else cols - 1
    for i in range(filas - 1):
        for j in range(jj):
            j2 = (j + 1) % cols
            f = bm.faces.new((V[i][j], V[i + 1][j], V[i + 1][j2], V[i][j2]))
            uu = (j / cols * rep_u, j / cols * rep_u, (j + 1) / cols * rep_u, (j + 1) / cols * rep_u)
            vv = (Lv[i][j], Lv[i + 1][j], Lv[i + 1][j2], Lv[i][j2])
            for lp, u_, v_ in zip(f.loops, uu, vv): lp[m.uv].uv = (u_, v_ / (rep_v * H))
    return m
def catmull(ctrl, n):
    P = [ctrl[0] + (ctrl[0] - ctrl[1])] + list(ctrl) + [ctrl[-1] + (ctrl[-1] - ctrl[-2])]; o = []
    for i in range(n):
        t = i / (n - 1) * (len(ctrl) - 1); k = min(int(t), len(ctrl) - 2); u = t - k
        p0, p1, p2, p3 = P[k], P[k + 1], P[k + 2], P[k + 3]
        o.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return o
def cresta(x, agudo=0.55):
    """Perfil de los mechones a lo ancho (x en mechones): 1 en la cresta, 0 en el fondo del surco (estrecho)."""
    return abs(math.sin(math.pi * x)) ** agudo
def contorno(sube=0.8, n=720):
    """El nacimiento del pelo como una vuelta cerrada: (dirección desde el centro, punto) repartidos por igual a lo largo."""
    raiz = []
    for k in range(n):
        a = k * 360 / n; e = nacimiento(a) + sube; p, nn = cuero(dirv(a, e)); raiz.append(((p - C).normalized(), p))
    L = [0.0]
    for k in range(1, n): L.append(L[-1] + (raiz[k][1] - raiz[k - 1][1]).length)
    tot = L[-1] + (raiz[0][1] - raiz[-1][1]).length
    def en(u):
        x = (u % 1) * tot; k = max(0, min(n - 2, next((q for q in range(n) if L[q] > x), n) - 1)); f = (x - L[k]) / max(1e-9, L[k + 1] - L[k])
        return (raiz[k][0].lerp(raiz[k + 1][0], f)).normalized()
    return en, tot
def coletero(c0, t0, radio, nombre='HairLazo'):
    bm = bmesh.new(); nx = t0.cross(UP).normalized(); ny = t0.cross(nx)
    RA, ra, U_, V_ = radio, 0.0085 * H, 40, 10; ring = []
    for i in range(U_):
        a = 2 * math.pi * i / U_; rv = nx * math.cos(a) + ny * math.sin(a); ctr = c0 + rv * RA
        rr2 = ra * (1 + 0.22 * math.sin(a * 11)); ring.append([bm.verts.new(ctr + (rv * math.cos(b) + t0 * math.sin(b)) * rr2) for b in (2 * math.pi * j / V_ for j in range(V_))])
    for i in range(U_):
        for j in range(V_): bm.faces.new((ring[i][j], ring[(i + 1) % U_][j], ring[(i + 1) % U_][(j + 1) % V_], ring[i][(j + 1) % V_]))
    mc = bpy.data.meshes.new(nombre); bm.to_mesh(mc); bm.free(); oc = bpy.data.objects.new(nombre, mc); bpy.context.scene.collection.objects.link(oc)
    for p in mc.polygons: p.use_smooth = True
    mc.materials.append(material('Lazo', (0.55, 0.04, 0.06, 1), rough=0.8))
    g = oc.vertex_groups.new(name='Hair_1'); g.add(range(len(mc.vertices)), 1.0, 'REPLACE')
    oc.parent = arm; oc.matrix_parent_inverse = arm.matrix_world.inverted(); mo = oc.modifiers.new('Armature', 'ARMATURE'); mo.object = arm
def huesos_pelo(pts):
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    Ai = arm.matrix_world.inverted(); prev = arm.data.edit_bones['mixamorig:Head']
    for k in range(len(pts) - 1):
        b = arm.data.edit_bones.new(f'Hair_{k + 1}'); b.head = Ai @ pts[k]; b.tail = Ai @ pts[k + 1]; b.parent = prev; b.use_connect = k > 0; prev = b
    bpy.ops.object.mode_set(mode='OBJECT')
def coleta_tubo(Mp, eje, radio, pesos_u, nr=9, surcos=9, puntas=9):
    """La coleta: un haz con surcos a lo largo (los mechones), que gira un poco y se abre al final en puntas sueltas."""
    ne = len(eje); Te = [(eje[min(i + 1, ne - 1)] - eje[max(i - 1, 0)]).normalized() for i in range(ne)]
    Nn = [Te[0].cross(UP).normalized()]
    for i in range(1, ne): Nn.append((Nn[-1] - Te[i] * Nn[-1].dot(Te[i])).normalized())
    corte = int(ne * 0.8); cols = surcos * 6
    def punto(i, j):
        u = i / (ne - 1); a = 2 * math.pi * j / cols + 0.7 * u; B = Te[i].cross(Nn[i])
        r = radio(u) * (0.74 + 0.26 * cresta(j / cols * surcos + 0.15 * math.sin(u * 7)))
        return eje[i] + (Nn[i] * math.cos(a) + B * math.sin(a)) * r
    m = rejilla('HairColetaTubo', corte, cols, punto, pesos=lambda i, j: pesos_u(i / (ne - 1)), rep_u=surcos / 2)
    # (el principio, cerrado por dentro del coletero)
    for i in range(puntas):
        a0 = 2 * math.pi * (i + 0.5) / puntas; pts, nors = [], []; k0 = int(ne * 0.62); L_ = random.uniform(0.9, 1.0)
        for k in range(k0, int(k0 + (ne - k0) * L_)):
            u = k / (ne - 1); B = Te[k].cross(Nn[k]); f = suave((u - 0.62) / 0.38)
            rr = max(radio(u), radio(0.6) * (1 - 0.5 * f)) * (0.55 - 0.2 * f); a = a0 + 0.7 * u + 0.35 * f * math.sin(i * 2.1)
            off = (Nn[k] * math.cos(a) + B * math.sin(a)) * rr
            pts.append(eje[k] + off + off.normalized() * 0.006 * H * f); nors.append(off.normalized())
        us = [(k0 + q) / (ne - 1) for q in range(len(pts))]
        Mp.tubo(pts, nors, lambda t: 0.034 * H * (1 - 0.92 * suave(t)), lambda t: 0.024 * H * (1 - 0.92 * suave(t)), ring=8, abajo=0.9,
                pesos=lambda q, us=us: pesos_u(us[q]), giro=random.uniform(-0.6, 0.6))
    return m

# ---------- coleta ----------
if peinado == 'coleta':
    dT = dirv(180, 30); Tp, Tn = cuero(dT); T = Tp + Tn * 0.004 * H     # (donde se recoge: atrás y arriba)
    en, tot = contorno(0.6); dt = (T - C).normalized()
    NL = 34                                         # (mechones alrededor)
    filas, cols = 30, NL * 5
    fase = [random.uniform(-0.2, 0.2) for _ in range(NL)]; amp = [random.uniform(0.7, 1.1) for _ in range(NL)]
    def punto(i, j):
        u = j / cols; v = (i / (filas - 1)) ** 1.15; dR = en(u)
        # (los mechones serpentean un poco al ir hacia atrás)
        lk = u * NL; k = int(lk) % NL; lk2 = lk + 0.12 * math.sin(v * 5 + k)
        d = dentro_pelo(slerp(dR, dt, v), 0.6 + 3 * suave(v / 0.15)); p, nn = cuero(d)
        arriba = max(0.0, d.z) ** 1.5; so = bajo_oreja(d)
        grosor = (0.0012 + (0.006 + 0.004 * arriba) * suave(v / 0.07) * (1 - 0.25 * v) * (1 - 0.85 * so)) * H
        surco = 1 - 0.5 * amp[k] * (1 - cresta(lk2 + fase[k])) * suave(v / 0.05) * (1 - 0.6 * suave((v - 0.7) / 0.3))
        q = p + nn * grosor * surco
        return q.lerp(T, suave((v - 0.9) / 0.1) * 0.8)
    Mc = rejilla('HairColeta', filas, cols, punto, rep_u=NL / 2)
    # los dos mechones sueltos junto a la cara (de las sienes hasta media mejilla, curvándose hacia ella)
    for s in ((-1, 1) if os.environ.get('MECHONES') else ()):
        a0 = 36 if s > 0 else 324; e0 = nacimiento(a0) + 1.5
        pts, nors = [], []
        for j in range(18):
            t = j / 17; q, qn = cuero(dirv(a0 + s * 12 * t, e0 - 44 * t))
            q = q + qn * (0.003 + 0.010 * math.sin(math.pi * t * 0.9)) * H + Vector((0, -1, 0)) * 0.005 * H * math.sin(math.pi * t)
            pts.append(q); nors.append(qn)
        Mc.tubo(pts, nors, lambda t: (0.026 - 0.020 * t) * H, lambda t: (0.008 - 0.005 * t) * H * (0.4 + 0.6 * suave(t / 0.1)), ring=8, abajo=0.5, giro=s * 1.4)
    # la coleta
    eje_c = [T, T + Tn * 0.045 * H + UP * 0.012 * H, T + Tn * 0.075 * H - UP * 0.04 * H, T + Tn * 0.08 * H - UP * 0.11 * H,
             T + Tn * 0.07 * H - UP * 0.18 * H, T + Tn * 0.065 * H - UP * 0.235 * H]
    eje = catmull(eje_c, 44); ne = len(eje)
    hb = [eje[0], eje[int(ne * 0.36)], eje[int(ne * 0.7)], eje[-1]]
    def pesos_u(u):
        c = [0.0, 0.36, 0.7]
        if u <= c[0]: return {'Hair_1': 1.0}
        for k in range(2):
            if c[k] <= u <= c[k + 1]: f = (u - c[k]) / (c[k + 1] - c[k]); return {f'Hair_{k + 1}': 1 - f, f'Hair_{k + 2}': f}
        return {'Hair_3': 1.0}
    radio = lambda u: (0.022 + 0.030 * suave(u / 0.16) - 0.012 * suave((u - 0.3) / 0.5) - 0.03 * suave((u - 0.62) / 0.2)) * H
    Mt = coleta_tubo(Mc, eje, radio, pesos_u)
    o1 = Mc.objeto(mpelo, suavizar=0); o2 = Mt.objeto(mpelo, suavizar=0)
    bpy.ops.object.select_all(action='DESELECT'); o1.select_set(True); o2.select_set(True); bpy.context.view_layer.objects.active = o1; bpy.ops.object.join()
    Te1 = (eje[2] - eje[0]).normalized(); coletero(eje[1], Te1, 0.024 * H)
    huesos_pelo(hb)
    print('coleta', len(o1.data.vertices), 'vertices', len(o1.data.polygons), 'caras')

# ---------- pestañas (piezas finas sobre el párpado de arriba, con su textura de pelos y transparencia) ----------
if os.environ.get('PESTANAS', '1') != '0':
    import json as _j
    PAR = _j.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parpados.json')))[os.environ.get('MODELO', 'osasuna')]
    from PIL import Image as _I, ImageDraw as _D
    S_ = 4; Wt, Ht = 512 * S_, 128 * S_; im = _I.new('RGBA', (Wt, Ht), (20, 12, 10, 0)); g = _D.Draw(im); rnd = random.Random(4)
    for k in range(64):
        t = k / 63; x = (6 + t * 500) * S_; L = Ht * (0.5 + 0.48 * t ** 0.8) * rnd.uniform(0.85, 1.0); lean = (10 + 46 * t) * S_
        pts = [(x + lean * q * q, Ht - L * q) for q in [i / 10 for i in range(11)]]
        for i in range(10): g.line([pts[i], pts[i + 1]], fill=(22, 14, 12, 255), width=max(1, int((3.2 - 2.4 * i / 10) * S_)))
    g.rectangle([0, Ht - 7 * S_, Wt, Ht], fill=(18, 11, 9, 255))
    im = im.resize((512, 128), _I.LANCZOS); rp = f'{D}/pestanas.png'; im.save(rp)
    mp = bpy.data.materials.new('Pestanas'); mp.use_nodes = True; nt = mp.node_tree; bs = nt.nodes['Principled BSDF']
    tt = nt.nodes.new('ShaderNodeTexImage'); tt.image = bpy.data.images.load(rp); tt.image.pack()
    nt.links.new(tt.outputs['Color'], bs.inputs['Base Color']); nt.links.new(tt.outputs['Alpha'], bs.inputs['Alpha']); bs.inputs['Roughness'].default_value = 0.7
    mp.blend_method = 'CLIP'; mp.alpha_threshold = 0.4; mp.use_backface_culling = False
    bm = bmesh.new(); uvl_ = bm.loops.layers.uv.new('UVMap')
    Cc_ = Vector((0, 0.79, -0.03))
    for ojo in PAR:
        pts = sorted([Vector(q) for q in ojo if q[2] > -1], key=lambda q: abs(q.x)); n = len(pts)
        sm = [Vector((p_.x, (pts[max(0, i - 1)].y + 2 * p_.y + pts[min(n - 1, i + 1)].y) / 4, p_.z)) for i, p_ in enumerate(pts)]
        # (se alarga un poco hacia fuera, donde las pestañas son más largas: el rabito)
        e = sm[-1] + (sm[-1] - sm[-3]) * 0.6; sm.append(Vector((e.x, e.y + 0.0015, e.z - 0.002)))
        fila = []
        for i, p_ in enumerate(sm):
            t = i / (len(sm) - 1); nor = (p_ - Cc_).normalized(); side = Vector((math.copysign(1, p_.x), 0, 0))
            dirl = (nor * 0.55 + Vector((0, 1, 0)) * 0.8 + side * (0.2 + 0.45 * t)).normalized()
            b0 = p_ + nor * 0.0013 - Vector((0, 0.0010, 0)); tip_ = b0 + dirl * (0.008 + 0.011 * t ** 1.1)
            fila.append((bm.verts.new(K.mundo(b0)), bm.verts.new(K.mundo(tip_)), t))
        for i in range(len(fila) - 1):
            a0, a1, ta = fila[i]; b0_, b1, tb = fila[i + 1]
            f = bm.faces.new((a0, b0_, b1, a1))
            for lp, uv in zip(f.loops, ((ta, 0), (tb, 0), (tb, 1), (ta, 1))): lp[uvl_].uv = uv
    mm = bpy.data.meshes.new('HairPestanas'); bm.to_mesh(mm); bm.free(); op = bpy.data.objects.new('HairPestanas', mm); bpy.context.scene.collection.objects.link(op)
    mm.materials.append(mp); gg = op.vertex_groups.new(name='mixamorig:Head'); gg.add(range(len(mm.vertices)), 1.0, 'REPLACE')
    op.parent = arm; op.matrix_parent_inverse = arm.matrix_world.inverted(); mo = op.modifiers.new('Armature', 'ARMATURE'); mo.object = arm

bpy.ops.wm.save_as_mainfile(filepath=out)
if pref:
    montar(muestras=32); cc = K.mundo(Vector((0, 0.79, 0)))
    for tag, yaw in (('frente', 0), ('tres', 35), ('lado', 90), ('tres-atras', 145), ('atras', 180)): foto(f'{pref}-{tag}.png', yaw, cc.z + 0.02, cc + Vector((0, 0, -0.02)), K.H * 0.95, 70, 480, 480)
    cf = K.mundo(Vector((0, 0.79, 0.05)))
    for tag, yaw in (('cara', 12), ('cara-lado', 62)): foto(f'{pref}-{tag}.png', yaw, cf.z + 0.01, cf, K.H * 0.42, 70, 480, 480)
salir()
