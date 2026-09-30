# MENDIMENDIZ · piezas de la cara: ojos, iris, brillos, párpados, cejas y bocas (variantes intercambiables).
import bpy, bmesh, math
from mathutils import Vector, Matrix, Quaternion
import mbz_core as C
import mbz_human as Hm

V = Vector
rad = math.radians

# ------------------------------------------------------------------ ojo
def eye_frame(d, side, info):
    """Centro del ojo (hundido 0,008 en la órbita), giro que lleva −Y local a la normal de la cara, semiejes."""
    p, n = info['eyes'][side]
    rot = V((0, -1, 0)).rotation_difference(n)
    ea, eb, ed = d['eye_w'] / 2, d['eye_h'] / 2, d.get('eye_depth', 0.022)
    center = p - n * 0.008
    return center, rot, (ea, ed, eb)

def uv_sphere_grid(seg, rings):
    """Esfera UV unitaria: lista de anillos (de arriba abajo) con `seg` puntos y los dos polos."""
    rows = []
    for i in range(1, rings):
        la = math.pi / 2 - math.pi * i / rings
        rows.append([(math.sin(2 * math.pi * j / seg) * math.cos(la), -math.cos(2 * math.pi * j / seg) * math.cos(la), math.sin(la)) for j in range(seg)])
    return rows

def build_eye(d, side, info):
    """Ojo: UV Sphere de 16 × 12 escalada al óvalo 0,085 × 0,11."""
    c, rot, (ax, ay, az) = eye_frame(d, side, info)
    bm = bmesh.new()
    rows = uv_sphere_grid(16, 12)
    T = lambda q: c + rot @ V((q[0] * ax, q[1] * ay, q[2] * az))
    vr = [[bm.verts.new(T(q)) for q in row] for row in rows]
    top = bm.verts.new(T((0, 0, 1))); bot = bm.verts.new(T((0, 0, -1)))
    for a, b in zip(vr, vr[1:]):
        for j in range(16): bm.faces.new((a[j], a[(j + 1) % 16], b[(j + 1) % 16], b[j]))
    for j in range(16):
        bm.faces.new((top, vr[0][(j + 1) % 16], vr[0][j])); bm.faces.new((bot, vr[-1][j], vr[-1][(j + 1) % 16]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # UV plana de frente: el blanco del ojo
    return bm, (c, rot, (ax, ay, az))

def disc(bm, center, rot, rx, rz, n):
    """Círculo de n vértices relleno en abanico (triángulos, sin n-gons), en el plano local XZ."""
    ring = [bm.verts.new(center + rot @ V((math.cos(2 * math.pi * i / n) * rx, 0, math.sin(2 * math.pi * i / n) * rz))) for i in range(n)]
    mid = bm.verts.new(center)
    for i in range(n): bm.faces.new((mid, ring[(i + 1) % n], ring[i]))
    return ring, mid

def build_iris(d, side, frame):
    c, rot, (ax, ay, az) = frame
    bm = bmesh.new()
    front = c + rot @ V((0, -ay - 0.004, 0))
    disc(bm, front, rot, ax * 0.62, az * 0.62, 24)
    return bm

def build_glints(d, side, frame):
    """Dos brillos: grande arriba y pequeño abajo (del mismo lado en los dos ojos)."""
    c, rot, (ax, ay, az) = frame
    out = {}
    for nm, (ox, oz, r) in (('Big', (0.30, 0.34, 0.0085)), ('Small', (-0.18, -0.26, 0.0042))):
        bm = bmesh.new()
        p = c + rot @ V((ox * ax * 2 * 0.5 * (1 if side > 0 else 1), -ay - 0.006, oz * az))
        disc(bm, p, rot, r, r, 12)
        out[nm] = bm
    return out

def build_lid(d, side, frame, lat_limit):
    """Párpado: copia del casquete superior del ojo (solo la mitad de delante) hasta lat_limit (grados)."""
    c, rot, (ax, ay, az) = frame
    bm = bmesh.new()
    k = 1.03
    cols = [-112.5 + 22.5 * j for j in range(11)]            # de −112,5° a 112,5° desde delante
    lats = [75 - 15 * i for i in range(11) if 75 - 15 * i >= lat_limit - 0.01]
    T = lambda lo, la: c + rot @ V((math.sin(rad(lo)) * math.cos(rad(la)) * ax * k, -math.cos(rad(lo)) * math.cos(rad(la)) * ay * k, math.sin(rad(la)) * az * k))
    top = bm.verts.new(c + rot @ V((0, 0, az * k)))
    rows = [[bm.verts.new(T(lo, la)) for lo in cols] for la in lats]
    for j in range(len(cols) - 1): bm.faces.new((top, rows[0][j + 1], rows[0][j]))
    for a, b in zip(rows, rows[1:]):
        for j in range(len(cols) - 1): bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        if f.normal.dot(f.calc_center_median() - c) < 0: f.normal_flip()
    return bm, len(lats)

# ------------------------------------------------------------------ cejas (curva Bézier de 3 puntos → malla)
BROWS = {  # desplazamientos en z (interior, centro, exterior) y giro
    'Normal': (0.0, 0.012, -0.002), 'Happy': (0.006, 0.024, 0.004), 'Angry': (-0.018, 0.004, 0.013),
    'Worried': (0.02, 0.01, -0.012), 'Surprised': (0.03, 0.044, 0.022),
}
def build_brow(d, kind, coll, taper):
    dz = BROWS[kind]; zb = d['eye_z'] + d.get('brow_dz', d['eye_h'] / 2 + 0.03)
    xs = d.get('brow_xs', (0.052, 0.105, 0.158))
    k = d.get('brow_k', 1.0)                         # la cara de juguete lleva las cejas algo menos marcadas
    pts = [Hm.face_point(d, x, zb + z * k, d.get('brow_lift', 0.013))[0] for x, z in zip(xs, dz)]
    cu = Hm.bezier_tube('Brow_' + kind, pts, d.get('brow_r', 0.011), taper, coll, tilt=0.0, res=4)
    return cu

# ------------------------------------------------------------------ bocas (encajan en el hueco de la cabeza)
MOUTHS = ['Neutral', 'Smile', 'SmileOpen', 'Surprised', 'Scared', 'TalkA', 'TalkO', 'Tired']
CLOSED = {'Neutral', 'Smile', 'Tired'}

def mouth_shape(kind, x, a, top):
    """Altura (respecto al centro de la boca) de la abertura en x, para el borde de arriba o el de abajo."""
    u = max(-1.0, min(1.0, x / a)); q = u * u
    if kind == 'Neutral': return 0.006 * q - 0.002 + (0.003 if top else -0.003)
    if kind == 'Smile': return 0.03 * q - 0.011 + (0.0032 if top else -0.0032)      # comisuras bien arriba: se lee de lejos
    if kind == 'Tired': return -0.008 * q + 0.002 + (0.0026 if top else -0.0026)
    if kind == 'SmileOpen': return (0.005 + 0.006 * q) if top else (-0.032 * (1 - q) + 0.004 * q)
    if kind == 'Surprised': return (0.026 if top else -0.03) * math.sqrt(max(0.0, 1 - q))
    if kind == 'Scared': return (0.009 - 0.003 * q) if top else (-0.022 + 0.01 * q)
    if kind == 'TalkA': return (0.018 if top else -0.03) * math.sqrt(max(0.0, 1 - q))
    if kind == 'TalkO': return (0.02 if top else -0.024) * math.sqrt(max(0.0, 1 - q))
    return 0.0

def mouth_width(kind, d):
    a = d['mouth_w'] / 2
    return {'Neutral': 0.8, 'Smile': 1.0, 'Tired': 0.7, 'SmileOpen': 0.95, 'Surprised': 0.42, 'Scared': 0.92, 'TalkA': 0.62, 'TalkO': 0.4}[kind] * a

def zipper(bm, T, B):
    """Cose dos polilíneas ordenadas en x (con distinto número de puntos) con triángulos, de izquierda a derecha."""
    faces, i, j = [], 0, 0
    while i < len(T) - 1 or j < len(B) - 1:
        if i < len(T) - 1 and (j == len(B) - 1 or T[i + 1].co.x <= B[j + 1].co.x):
            faces.append(bm.faces.new((T[i], T[i + 1], B[j]))); i += 1
        else:
            faces.append(bm.faces.new((T[i], B[j + 1], B[j]))); j += 1
    return faces

def build_mouth(d, kind, hole):
    """Labios (del borde del hueco a la abertura), interior, lengua y dientes de arriba como piezas separadas.
    Índices de material: 0 = cara (labios), 1 = ojos/boca (interior, lengua, dientes)."""
    bm = bmesh.new()
    part = bm.faces.layers.int.new('part')          # 0 labio, 1 interior, 2 lengua, 3 dientes
    mz = d['mouth_z']
    A = [bm.verts.new(p) for p in hole]
    # arriba o abajo según el ángulo alrededor del centro de la boca (el bucle tiene 3 puntos arriba y 7 abajo)
    nh = len(hole)
    is_top = [math.atan2(p.z - mz, p.x) > 0 for p in hole]
    a = mouth_width(kind, d)
    def opening(p, top):
        x = p.x / max(1e-4, max(abs(q.x) for q in hole)) * a
        z = mz + mouth_shape(kind, x, a, top)
        return Hm.face_point(d, x, z, -0.002)[0]
    Bv, Cv = [], []
    for p, top in zip(hole, is_top):
        pc = opening(p, top)
        pb = p.lerp(pc, 0.45); n = Hm.face_point(d, pb.x, pb.z, 0)[1]; pb = pb + n * 0.004
        Bv.append(bm.verts.new(pb)); Cv.append(bm.verts.new(pc))
    lips = C.bridge(bm, A, Bv) + C.bridge(bm, Bv, Cv)
    for f in lips: f[part] = 0; f.material_index = 0
    tops = sorted([i for i in range(nh) if is_top[i]], key=lambda i: hole[i].x)
    bots = sorted([i for i in range(nh) if not is_top[i]], key=lambda i: hole[i].x)
    if kind in CLOSED:
        # línea de la boca: tira oscura entre el borde de arriba y el de abajo
        for f in zipper(bm, [Cv[i] for i in tops], [Cv[i] for i in bots]): f[part] = 1; f.material_index = 1
    else:
        # interior: la abertura se hunde y se cierra por detrás
        cen = sum((v.co for v in Cv), V()) / nh
        nrm = Hm.face_point(d, 0, mz, 0)[1]
        Dv = [bm.verts.new(cen + (v.co - cen) * 0.75 - nrm * 0.03) for v in Cv]
        for f in C.bridge(bm, Cv, Dv): f[part] = 1; f.material_index = 1
        for f in zipper(bm, [Dv[i] for i in tops], [Dv[i] for i in bots]): f[part] = 1; f.material_index = 1
        # dientes de arriba: tira justo detrás del labio superior
        tt = [Cv[i].co - nrm * 0.004 + V((0, 0, -0.001)) for i in tops]
        tb = [p + V((0, 0, -0.011)) for p in tt]
        T1 = [bm.verts.new(p) for p in tt]; T2 = [bm.verts.new(p) for p in tb]
        for j in range(len(T1) - 1):
            f = bm.faces.new((T1[j], T1[j + 1], T2[j + 1], T2[j])); f[part] = 3; f.material_index = 1
        # lengua: esfera aplastada abajo
        lb = sum((Cv[i].co for i in bots), V()) / len(bots)
        tc = lb - nrm * 0.018 + V((0, 0, 0.006))
        rows = uv_sphere_grid(8, 6)
        tw = max(0.012, a * 0.55)
        vr = [[bm.verts.new(tc + V((q[0] * tw, q[1] * 0.016, q[2] * 0.006))) for q in row] for row in rows]
        tp = bm.verts.new(tc + V((0, 0, 0.006))); bt = bm.verts.new(tc + V((0, 0, -0.006)))
        for r1, r2 in zip(vr, vr[1:]):
            for j in range(8):
                f = bm.faces.new((r1[j], r1[(j + 1) % 8], r2[(j + 1) % 8], r2[j])); f[part] = 2; f.material_index = 1
        for j in range(8):
            f = bm.faces.new((tp, vr[0][(j + 1) % 8], vr[0][j])); f[part] = 2; f.material_index = 1
            f = bm.faces.new((bt, vr[-1][j], vr[-1][(j + 1) % 8])); f[part] = 2; f.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm

# ------------------------------------------------------------------ cara de juguete: pintada con piezas planas pegadas
# a la superficie de la cabeza (ojos de punto con brillo, párpados para parpadear y bocas de trazo)
def _outward(bm, d):
    """Todas las caras mirando hacia fuera de la cabeza."""
    c = V((0, 0, d['head_c']))
    for f in bm.faces:
        if f.normal.dot(f.calc_center_median() - c) < 0: f.normal_flip()
    bm.normal_update()

def decal_ellipse(bm, d, cx, cz, rx, rz, lift, n=16, mat=0, a0=0.0, a1=math.tau, part=None, val=0):
    """Elipse (o sector a0–a1) en abanico sobre la cara, separada `lift` de la piel."""
    full = abs(a1 - a0 - math.tau) < 1e-6
    angs = [a0 + (a1 - a0) * i / n for i in range(n if full else n + 1)]
    ring = [bm.verts.new(Hm.face_point(d, cx + math.cos(a) * rx, cz + math.sin(a) * rz, lift)[0]) for a in angs]
    mid = bm.verts.new(Hm.face_point(d, cx, cz, lift)[0])
    out = []
    for i in range(len(ring) if full else len(ring) - 1):
        f = bm.faces.new((mid, ring[i], ring[(i + 1) % len(ring)])); f.material_index = mat
        if part is not None: f[part] = val
        out.append(f)
    return out

def decal_strip(bm, d, pts_top, pts_bot, lift, mat=0, part=None, val=0):
    """Tira entre dos polilíneas (x, z) de la cara."""
    T = [bm.verts.new(Hm.face_point(d, x, z, lift)[0]) for x, z in pts_top]
    B = [bm.verts.new(Hm.face_point(d, x, z, lift)[0]) for x, z in pts_bot]
    out = []
    for i in range(len(T) - 1):
        f = bm.faces.new((T[i], T[i + 1], B[i + 1], B[i])); f.material_index = mat
        if part is not None: f[part] = val
        out.append(f)
    return out

def toy_eye(d, side):
    """Ojo de punto: óvalo oscuro (se colorea con la pupila del atlas de ojos)."""
    bm = bmesh.new()
    decal_ellipse(bm, d, side * d['eye_x'], d['eye_z'], d['eye_w'] / 2, d['eye_h'] / 2, 0.0015, n=20)
    _outward(bm, d); return bm

def toy_glints(d, side):
    ex, ez, ew, eh = side * d['eye_x'], d['eye_z'], d['eye_w'] / 2, d['eye_h'] / 2
    out = {}
    for nm, (ox, oz, r) in (('Big', (0.34, 0.36, 0.3)), ('Small', (-0.3, -0.42, 0.14))):
        bm = bmesh.new()
        decal_ellipse(bm, d, ex + ox * ew, ez + oz * eh, r * ew, r * ew, 0.0028, n=12)
        _outward(bm, d); out[nm] = bm
    return out

def toy_lid(d, kind):
    """Párpados de los dos ojos: piel que tapa el ojo (material 0) y la raya del ojo cerrado (material 1)."""
    bm = bmesh.new()
    for side in (1, -1):
        ex, ez, ew, eh = side * d['eye_x'], d['eye_z'], d['eye_w'] / 2 * 1.2, d['eye_h'] / 2 * 1.2
        if kind == 'Open':
            decal_ellipse(bm, d, ex, ez + eh * 0.9, ew * 0.3, eh * 0.08, -0.004, n=6)      # escondido: el ojo se ve entero
        elif kind == 'Half':
            decal_ellipse(bm, d, ex, ez, ew, eh, 0.0036, n=10, a0=0.0, a1=math.pi)      # la mitad de arriba tapada
            xs = [ex - ew + 2 * ew * i / 8 for i in range(9)]
            decal_strip(bm, d, [(x, ez + 0.0022) for x in xs], [(x, ez - 0.0022) for x in xs], 0.0042, mat=1)
        else:
            decal_ellipse(bm, d, ex, ez, ew, eh, 0.0036, n=16)                           # tapado entero
            xs = [ex - ew * 0.85 + 1.7 * ew * i / 10 for i in range(11)]
            arc = lambda x: ez - 0.006 * (1 - ((x - ex) / (ew * 0.85)) ** 2)            # raya en arco «‿»
            decal_strip(bm, d, [(x, arc(x) + 0.0024) for x in xs], [(x, arc(x) - 0.0024) for x in xs], 0.0042, mat=1)
    _outward(bm, d); return bm

def build_mouth_decal(d, kind):
    """Boca de trazo: las cerradas son una raya; las abiertas, un hueco oscuro con lengua y, a veces, dientes.
    part: 1 interior/raya, 2 lengua, 3 dientes (los tres con el atlas común de ojos y bocas)."""
    bm = bmesh.new(); part = bm.faces.layers.int.new('part')
    mz = d['mouth_z']; a = mouth_width(kind, d); N = 14
    xs = [-a + 2 * a * i / N for i in range(N + 1)]
    T = [(x, mz + mouth_shape(kind, x, a, True)) for x in xs]
    B = [(x, mz + mouth_shape(kind, x, a, False)) for x in xs]
    if kind in CLOSED:
        # raya con los extremos redondeados: más fina en las comisuras
        mid = [((zt + zb) / 2) for (_, zt), (_, zb) in zip(T, B)]
        th = [(zt - zb) / 2 * (0.45 + 0.55 * math.sqrt(max(0.0, 1 - (x / a) ** 2))) for (x, zt), (_, zb) in zip(T, B)]
        decal_strip(bm, d, [(x, m + t) for x, m, t in zip(xs, mid, th)], [(x, m - t) for x, m, t in zip(xs, mid, th)], 0.0016, mat=1, part=part, val=1)
    else:
        decal_strip(bm, d, T, B, 0.0016, mat=1, part=part, val=1)
        inner = [i for i, x in enumerate(xs) if abs(x) <= a * 0.62]
        if kind not in ('Surprised', 'TalkO'):
            tb = [B[i] for i in inner]; tt = [(x, zb + (zt - zb) * 0.42) for (x, zt), (_, zb) in zip([T[i] for i in inner], tb)]
            decal_strip(bm, d, tt, [(x, zb + 0.0012) for x, zb in tb], 0.0024, mat=1, part=part, val=2)
        if kind in ('SmileOpen', 'TalkA'):
            ti = [i for i, x in enumerate(xs) if abs(x) <= a * 0.8]
            top = [(T[i][0], T[i][1] - 0.0012) for i in ti]
            decal_strip(bm, d, top, [(x, z - min(0.007, (z - B[i][1]) * 0.35)) for (x, z), i in zip(top, ti)], 0.0024, mat=1, part=part, val=3)
    C.clean_bm(bm, dist=0.00005)
    _outward(bm, d); return bm
