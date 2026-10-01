# MENDIMENDIZ · construcción de un humanoide cabezón por modelado de subdivisión (cage + Subdivision Surface).
# Todas las piezas se construyen con bmesh, primero completas y simétricas, y luego se deja la mitad x ≥ 0
# para el modificador Mirror. Convenciones: +X = izquierda del personaje, −Y = delante, Z = arriba.
import bpy, bmesh, math
from mathutils import Vector, Matrix, Quaternion
import mbz_core as C

V = Vector
rad = math.radians

# ================================================================== CABEZA
# Esfera UV de 24 segmentos y 16 anillos, radio 0,29, escala (1; 0,93; 1,07).
# Las columnas y anillos se reparten (como con «edge slide») para dar más densidad a la cara.
LON = [0, 10, 21, 33, 47, 62, 78, 93, 109, 126, 144, 162, 180]          # grados, de la cara (0) a la nuca (180)
LAT = [78.75, 67.5, 56.25, 45, 33.75, 22.5, 11, 0, -10, -20, -27, -38, -50, -62, -76]

def head_axes(d):
    if 'head_axes' in d: return d['head_axes']
    return d['head_r'] * d['head_scale'][0], d['head_r'] * d['head_scale'][1], d['head_r'] * d['head_scale'][2]

# Cabeza de juguete (d['head_style'] == 'toy'): cilindro redondeado. En horizontal es una elipse y de perfil una
# superelipse de exponente n: ((x/rx)² + (y/ry)²)^(n/2) + |z/rz|^n = 1. Con n = 2 vuelve a ser el elipsoide.
def _n(d): return d.get('head_n', 2.0) if d.get('head_style') == 'toy' else 2.0
def _sp(v, e): return math.copysign(abs(v) ** e, v)

def sph(d, lon, lat, r_extra=0.0):
    """Punto de la superficie de la cabeza (sin detalles) para longitud/latitud en grados."""
    rx, ry, rz = head_axes(d); lo, la = rad(lon), rad(lat); e = 2.0 / _n(d)
    c, s = _sp(math.cos(la), e), _sp(math.sin(la), e)
    p = V((rx * math.sin(lo) * c, -ry * math.cos(lo) * c, rz * s))
    if r_extra: p += head_normal(d, p) * r_extra
    return p + V((0, 0, d['head_c']))

def head_normal(d, p_local):
    rx, ry, rz = head_axes(d); n = _n(d)
    R = math.hypot(p_local.x / rx, p_local.y / ry)
    k = R ** (n - 2) if R > 1e-6 else 0.0
    return V((k * p_local.x / rx ** 2, k * p_local.y / ry ** 2, _sp(p_local.z / rz, n - 1) / rz)).normalized()

def face_point(d, x, z, lift=0.0):
    """Punto de la cara (delante) con esas x y z del mundo, y su normal."""
    rx, ry, rz = head_axes(d); zc = d['head_c']; n = _n(d)
    s = max(0.0, 1 - abs((z - zc) / rz) ** n) ** (2 / n)
    t = s - (x / rx) ** 2
    y = -ry * math.sqrt(max(0.01, t))
    loc = V((x, y, z - zc)); nn = head_normal(d, loc)
    return V((x, y, z)) + nn * lift, nn

def lonlat_of(d, p):
    rx, ry, rz = head_axes(d); q = p - V((0, 0, d['head_c'])); n = _n(d)
    x, y, z = q.x / rx, q.y / ry, q.z / rz
    return math.degrees(math.atan2(x, -y)), math.degrees(math.atan2(_sp(z, n / 2), math.hypot(x, y) ** (n / 2)))

def hairline(lon, d=None):
    """Latitud (grados) donde nace el pelo, según el lado: frente, sienes, encima de la oreja y nuca."""
    a = abs(lon)
    if d is not None and d.get('hair_style') == 'side':
        return hairline_side(lon)
    if d is not None and d.get('head_style') == 'toy':
        # casco de pelo de juguete: flequillo en tres puntas suaves, patillas hasta la altura de los ojos y nuca baja
        if a < 42: return 29 - 5 * (0.5 + 0.5 * math.cos(rad(lon) * 8.5))
        if a < 75: return 23 - (a - 42) / 33 * 21
        if a < 105: return 2
        return 2 - C.smooth01((a - 105) / 70) * 46
    if a < 30: return 36
    if a < 60: return 36 - (a - 30) / 30 * 18
    if a < 100: return 18 - (a - 60) / 40 * 4
    return 14 - C.smooth01((a - 100) / 80) * 52

# Peinado de juguete con raya a un lado (lon > 0 = izquierda del personaje): flequillo que baja en diagonal hacia el
# otro lado con un mechón en punta sobre la ceja, patillas cortas y nuca rematada en tres picos.
PART_LON = 26
def hairline_side(lon):
    a = abs(lon); g = lambda x, m, w: math.exp(-((x - m) / w) ** 2)
    if a <= 45:
        s = C.smooth01((45 - lon) / 90)                       # 0 en el lado de la raya, 1 en el otro
        return 33 - 10 * s - 8.5 * g(lon, -25, 10) - 3.5 * g(lon, -6, 6)
    front_end = 33 - 10 * C.smooth01((45 - math.copysign(45, lon)) / 90)
    if a < 80: return front_end + (4 - front_end) * C.smooth01((a - 45) / 35)
    if a < 108: return 4
    back = 4 - 46 * C.smooth01((a - 108) / 72)
    return back - 8 * max(0.0, math.cos(rad(a - 180) * 6)) ** 2 * C.smooth01((a - 135) / 20)

def hair_shape_side(lo, la):
    """Grosor del casco en cada punto: volumen arriba, tupé que barre hacia el otro lado, raya hundida y mechones
    moldeados (surcos en la dirección del peinado)."""
    g = lambda x, m, w: math.exp(-((x - m) / w) ** 2)
    base = 0.013 + 0.024 * C.smooth01((la - 5) / 60)
    swoop = 0.036 * C.smooth01((la - 16) / 24) * (1 - C.smooth01((la - 64) / 14)) * C.smooth01((PART_LON + 6 - lo) / 50) * (1 - C.smooth01((abs(lo) - 62) / 18))
    part = -0.014 * g(lo, PART_LON, 5) * C.smooth01((la - 30) / 10)
    if lo < PART_LON:     # el flequillo baja desde la raya hacia el otro lado
        u = (-(lo - PART_LON) * 38 + (la - 60) * 56) / 67.7
    elif abs(lo) < 110:   # del lado de la raya baja hacia la sien
        u = ((lo - PART_LON) * 40 + (la - 60) * 40) / 56.6
    else:                 # atrás caen de la coronilla a la nuca
        u = lo * 0.8
    groove = -0.011 * (0.5 - 0.5 * math.cos(math.tau * u / 26)) ** 1.5 * C.smooth01((la + 20) / 30)
    return base + swoop + part + groove

def reshape_ring(d, loop, cx, cz, a, b, depth, lift_fn=None):
    """Lleva un bucle de vértices a una elipse (a, b) proyectada en la cara, a una profundidad dada."""
    xs = [v.co.x for v in loop]; zs = [v.co.z for v in loop]
    a0 = max(1e-4, (max(xs) - min(xs)) / 2); b0 = max(1e-4, (max(zs) - min(zs)) / 2)
    for v in loop:
        phi = math.atan2((v.co.z - cz) / b0, (v.co.x - cx) / a0)
        x, z = cx + a * math.cos(phi), cz + b * math.sin(phi)
        p, n = face_point(d, x, z, depth + (lift_fn(phi) if lift_fn else 0))
        v.co = p

def build_toy_head(d):
    """Cabeza de juguete: la rejilla de 24 × 16 sobre el cilindro redondeado, sin rasgos modelados
    (la cara va pintada encima como piezas planas). info['eyes'][lado] = (punto, normal) del centro de cada ojo."""
    bm = bmesh.new()
    cols = list(range(-11, 13))
    lonk = lambda k: math.copysign(LON[abs(k)], k) if abs(k) < 12 else 180
    grid = {}
    for i, la in enumerate(LAT):
        for k in cols: grid[(k, i)] = bm.verts.new(sph(d, lonk(k), la))
    top = bm.verts.new(sph(d, 0, 90)); bot = bm.verts.new(sph(d, 0, -90))
    nxt = lambda k: k + 1 if k < 12 else -11
    for i in range(len(LAT) - 1):
        for k in cols: bm.faces.new((grid[(k, i)], grid[(nxt(k), i)], grid[(nxt(k), i + 1)], grid[(k, i + 1)]))
    for k in cols:
        bm.faces.new((top, grid[(nxt(k), 0)], grid[(k, 0)]))
        bm.faces.new((bot, grid[(k, len(LAT) - 1)], grid[(nxt(k), len(LAT) - 1)]))
    bm.normal_update()
    info = {'eyes': {side: face_point(d, side * d['eye_x'], d['eye_z'], 0.0) for side in (1, -1)}}
    return bm, info

def build_head(d):
    """Devuelve (bm completo de la cabeza, info) con ojos, nariz, boca (hueco), orejas y pómulos."""
    bm = bmesh.new()
    cols = list(range(-11, 13))   # 24 columnas
    lonk = lambda k: math.copysign(LON[abs(k)], k) if abs(k) < 12 else 180
    grid = {}
    for i, la in enumerate(LAT):
        for k in cols: grid[(k, i)] = bm.verts.new(sph(d, lonk(k), la))
    top = bm.verts.new(sph(d, 0, 90)); bot = bm.verts.new(sph(d, 0, -90))
    nxt = lambda k: k + 1 if k < 12 else -11
    faces = {}
    for i in range(len(LAT) - 1):
        for k in cols:
            faces[(k, i)] = bm.faces.new((grid[(k, i)], grid[(nxt(k), i)], grid[(nxt(k), i + 1)], grid[(k, i + 1)]))
    for k in cols:
        bm.faces.new((top, grid[(nxt(k), 0)], grid[(k, 0)]))
        bm.faces.new((bot, grid[(k, len(LAT) - 1)], grid[(nxt(k), len(LAT) - 1)]))
    bm.faces.ensure_lookup_table()
    info = {'eyes': {}}
    # --- órbitas: tres bucles concéntricos (Inset de 0,008 tres veces) y el fondo hundido
    for side in (1, -1):
        ks = (1, 2) if side > 0 else (-3, -2)
        region = [faces[(k, i)] for k in ks for i in (6, 7)]
        rings, region = C.inset_rings(bm, region, 3, 0.008)
        ex, ez = side * d['eye_x'], d['eye_z']
        ea, eb = d['eye_w'] / 2, d['eye_h'] / 2
        for r, (k, dep) in enumerate(zip((1.45, 1.26, 1.12, 1.04), (0.0, -0.002, -0.005, -0.009))):
            reshape_ring(d, rings[r], ex, ez, ea * k, eb * k, dep)
        inner = {v for f in region for v in f.verts} - set(rings[3])
        for v in inner:
            p, n = face_point(d, ex, ez, -0.03); v.co = p
        p, n = face_point(d, ex, ez, 0.0)
        info['eyes'][side] = (p, n)
    # --- nariz: extrusión de dos caras en tres pasos, con su bucle de transición
    region = [faces[(-1, 8)], faces[(0, 8)]]
    nose_c, nose_n = face_point(d, 0, d['nose_z'], 0.0)
    steps = ((0.02, 1.08, -0.002), (0.02, 0.98, -0.005), (0.012, 0.66, -0.002))     # botón redondo (≈ esfera de 0,08), sin punta
    for dist, sc, dz in steps:
        region = C.extrude(bm, region)
        vs = {v for f in region for v in f.verts}
        c = sum((v.co for v in vs), V()) / len(vs)
        for v in vs:
            off = v.co - c
            v.co = c + V((off.x * sc, off.y, off.z * sc)) + nose_n * dist + V((0, 0, dz))
    # --- boca: tres bucles alrededor y el hueco donde encajan las variantes
    region = [faces[(k, 10)] for k in (-2, -1, 0, 1)]
    rings, region = C.inset_rings(bm, region, 3, 0.008)
    mx, mz = 0.0, d['mouth_z']; ma, mb = d['mouth_w'] / 2, d['mouth_h'] / 2
    for r, (sa, sb, dep) in enumerate(((ma + 0.035, mb + 0.034, 0.0), (ma + 0.022, mb + 0.022, 0.004), (ma + 0.011, mb + 0.011, 0.003), (ma, mb, -0.004))):
        reshape_ring(d, rings[r], mx, mz, sa, sb, dep)
    hole = rings[3]
    info['mouth_hole'] = [v.co.copy() for v in hole]
    bmesh.ops.delete(bm, geom=region, context='FACES')
    # --- orejas: extrusión en C con dos bucles y el hueco interior (Inset 0,01 hundido 0,012)
    for side in (1, -1):
        k = 6 if side > 0 else -7
        region = [faces[(k, 6)], faces[(k, 7)]]
        for dist, sy, sz, back in ((0.018, 1.05, 1.1, 0.004), (0.022, 0.95, 1.22, 0.01)):
            region = C.extrude(bm, region)
            vs = {v for f in region for v in f.verts}
            c = sum((v.co for v in vs), V()) / len(vs)
            for v in vs:
                off = v.co - c
                v.co = c + V((off.x * 0.6, off.y * sy, off.z * sz)) + V((side * dist, back, 0))
        # forma de C: el borde delantero se curva hacia dentro
        vs = {v for f in region for v in f.verts}
        c = sum((v.co for v in vs), V()) / len(vs)
        for v in vs:
            if v.co.y < c.y: v.co.x -= side * 0.006
        bmesh.ops.inset_region(bm, faces=region, thickness=0.01, depth=-0.012, use_even_offset=True)
    # --- pómulos: Proportional Editing «Smooth», radio 0,08, +0,015 hacia fuera
    for side in (1, -1):
        cp = sph(d, side * 38, -18)
        for v in bm.verts:
            dd = (v.co - cp).length
            if dd < 0.08:
                t = 1 - dd / 0.08; w = t * t * (3 - 2 * t)
                v.co += head_normal(d, v.co - V((0, 0, d['head_c']))) * 0.015 * w
    # --- barbilla algo más estrecha y redonda
    for v in bm.verts:
        lo, la = lonlat_of(d, v.co)
        if la < -35 and abs(lo) < 70:
            k = C.smooth01((-35 - la) / 40)
            v.co.x *= 1 - 0.07 * k; v.co.y -= 0.01 * k * math.cos(rad(lo))
    bm.normal_update()
    return bm, info

def split_hair(d, head_bm):
    """Masa del pelo: copia de la parte de arriba y de atrás de la cabeza. Quita de la cabeza lo que tapa."""
    me = bpy.data.meshes.new('_tmp'); head_bm.to_mesh(me)
    hb = bmesh.new(); hb.from_mesh(me); bpy.data.meshes.remove(me)
    toy = d.get('head_style') == 'toy'
    def in_hair(f, margin):
        lo, la = lonlat_of(d, f.calc_center_median())
        return la > hairline(lo, d) + margin
    bmesh.ops.delete(hb, geom=[f for f in hb.faces if not in_hair(f, 0)], context='FACES')
    C.clean_bm(hb)
    # volumen: algo más en la coronilla y la nuca; flequillo en ondas sobre la frente
    if d.get('hair_style') == 'side':
        # más resolución para el mechón en punta y los surcos: una subdivisión, y cada vértice vuelve a la
        # superficie de la cabeza (queda tan liso como con Subdivision, sin su coste)
        bmesh.ops.subdivide_edges(hb, edges=hb.edges[:], cuts=1, use_grid_fill=True)
        for v in hb.verts:
            lo, la = lonlat_of(d, v.co); v.co = sph(d, lo, la)
    boundary = {v for e in hb.edges if e.is_boundary for v in e.verts}
    off_side = {}
    if toy:
        # borde limpio: los vértices del borde van justo a la línea del pelo (sin escalones de la rejilla)
        for v in boundary:
            if abs(v.co.x) < 1e-5 and v.co.z < d['head_c']: continue
            lo, la = lonlat_of(d, v.co)
            v.co = sph(d, lo, hairline(lo, d))
        # los escalones de la rejilla dejan vértices del borde en el mismo punto: se funden para que no salgan dientes
        bmesh.ops.remove_doubles(hb, verts=[v for v in boundary if v.is_valid], dist=0.004)
        boundary = {v for e in hb.edges if e.is_boundary for v in e.verts}
    for v in hb.verts:
        lo, la = lonlat_of(d, v.co)
        n = head_normal(d, v.co - V((0, 0, d['head_c'])))
        if d.get('hair_style') == 'side':
            off_side[v] = (n, hair_shape_side(lo, la))
            continue
        if toy:
            # volumen de casco: más arriba, un tupé suave delante y el borde algo separado de la piel
            extra = 0.014 + 0.026 * C.smooth01((la - 5) / 60) + 0.016 * C.smooth01((la - 30) / 30) * (1 - C.smooth01((abs(lo) - 25) / 40))
            v.co += n * extra
            continue
        extra = 0.004 + 0.03 * C.smooth01((la - 15) / 55) + 0.012 * C.smooth01((abs(lo) - 90) / 60)
        v.co += n * extra
        if v in boundary and abs(lo) < 45:
            wave = 0.5 + 0.5 * math.cos(rad(lo) * 9)
            v.co += V((0, -0.012, -0.022 * wave))
    if off_side:
        # grosor suavizado (dos pasadas con los vecinos): mechones redondeados en lugar de bultos
        off = {v: o for v, (n, o) in off_side.items()}
        for _ in range(2):
            off = {v: 0.5 * o + 0.5 * sum(off[e.other_vert(v)] for e in v.link_edges) / max(1, len(v.link_edges)) for v, o in off.items()}
        for v, (n, _) in off_side.items(): v.co += n * off[v]
    # cabeza: fuera las caras que quedan bajo el pelo (se deja una fila de margen)
    def under_hair(f, margin):
        lo, la = lonlat_of(d, f.calc_center_median())
        return la > max(hairline(lo, d), hairline(-lo, d)) + margin
    bmesh.ops.delete(head_bm, geom=[f for f in head_bm.faces if under_hair(f, 8 if toy else 11)], context='FACES')
    C.clean_bm(head_bm)
    return hb

# ================================================================== CUERPO (cilindro de 16 lados)
TH = [i * 22.5 for i in range(16)]        # ángulos de los 16 vértices del anillo (0 = delante)

def ring16(z, rx, ry, cy=0.0, sq=2.4):
    out = []
    for a in TH:
        s, c = math.sin(rad(a)), math.cos(rad(a))
        # superelipse: hombros y caderas algo cuadrados
        k = (abs(s) ** sq + abs(c) ** sq) ** (-1 / sq)
        out.append(V((rx * s * k, cy - ry * c * k, z)))
    return out

def tube_rings(bm, first_loop, centers, radii, axis_fn, seam_layer=None, seam_angle=-math.pi / 2):
    """Extrusión de un tubo (brazo/pierna) desde un bucle: anillos con el mismo orden angular que el bucle."""
    c0 = sum((v.co for v in first_loop), V()) / len(first_loop)
    e1, e2 = axis_fn(0)
    angs = [math.atan2((v.co - c0).dot(e2), (v.co - c0).dot(e1)) for v in first_loop]
    prev = first_loop; rings = []
    for idx, (c, r) in enumerate(zip(centers, radii)):
        e1, e2 = axis_fn(idx + 1)
        rx, ry = (r, r) if not isinstance(r, tuple) else r
        cur = [bm.verts.new(c + e1 * (rx * math.cos(a)) + e2 * (ry * math.sin(a))) for a in angs]
        C.bridge(bm, prev, cur)
        rings.append(cur); prev = cur
    if seam_layer is not None:
        # costura por la línea de vértices más cercana a la dirección e2 negativa (parte de dentro / de abajo)
        i = min(range(len(angs)), key=lambda j: abs(math.atan2(math.sin(angs[j] - seam_angle), math.cos(angs[j] - seam_angle))))
        for rg in [first_loop] + rings: rg[i][seam_layer] = 1
    return rings

def build_body(d):
    """Cuerpo completo: tronco, cuello, piernas y brazos. Devuelve (bm, info con anillos para la ropa)."""
    bm = bmesh.new()
    seam = bm.verts.layers.int.new('seam')
    zone = bm.faces.layers.int.new('zone')          # 1 tronco, 2 cuello, 3 pierna, 4 brazo, 5 entrepierna
    T = d['torso']                                   # [(z, rx, ry, cy)]
    rings = [C.ring_verts(bm, ring16(*r)) for r in T]
    for a, b in zip(rings, rings[1:]):
        for f in C.bridge(bm, a, b): f[zone] = 1
    # cuello (16 lados) que entra en la cabeza
    for r in d['neck']:
        nr = C.ring_verts(bm, ring16(*r, sq=2.0));
        for f in C.bridge(bm, rings[-1], nr): f[zone] = 2
        rings.append(nr)
    # tapa de abajo en rejilla 6 × 2: las piernas salen de las caras de los lados
    b = rings[0]
    F = [b[j] for j in (13, 14, 15, 0, 1, 2, 3)]; B = [b[j] for j in (11, 10, 9, 8, 7, 6, 5)]
    zb = T[0][0] - 0.02
    M = [b[12]] + [bm.verts.new(V((F[k].co.x, T[0][3], zb))) for k in (1, 2, 3, 4, 5)] + [b[4]]
    cap = {}
    for k in range(6):
        cap[(k, 0)] = bm.faces.new((F[k], F[k + 1], M[k + 1], M[k])); cap[(k, 1)] = bm.faces.new((M[k], M[k + 1], B[k + 1], B[k]))
    for f in cap.values(): f[zone] = 5
    info = {'torso_rings': rings, 'legs': {}, 'arms': {}}
    # piernas
    for side in (1, -1):
        ks = (4, 5) if side > 0 else (0, 1)
        region = [cap[(k, r)] for k in ks for r in (0, 1)]
        loop = C.region_boundary_loop(region)
        bmesh.ops.delete(bm, geom=region, context='FACES_ONLY')
        lx = side * d['leg_x']
        cs = [V((lx, 0.0, z)) for z, r in d['leg']]
        rs = [r for z, r in d['leg']]
        rg = tube_rings(bm, loop, cs, rs, lambda i: (V((1, 0, 0)) * side, V((0, 1, 0))), seam, math.pi)   # costura por dentro
        for f in {f for ring in rg for v in ring for f in v.link_faces}:
            if f[zone] == 0: f[zone] = 3
        info['legs'][side] = [loop] + rg
    # brazos: extrusión desde el lado del tronco, siguiendo los huesos del brazo en pose A
    for side in (1, -1):
        ia = d['arm_rings']                # primer anillo del tronco del que sale el brazo
        js = (3, 4) if side > 0 else (11, 12)
        region = []
        for ri in (ia, ia + 1):
            for j in js:
                a1, a2 = rings[ri], rings[ri + 1]
                f = bm.faces.get((a1[j], a1[(j + 1) % 16], a2[(j + 1) % 16], a2[j]))
                region.append(f)
        loop = C.region_boundary_loop(region)
        bmesh.ops.delete(bm, geom=region, context='FACES_ONLY')
        path = [V((side * x, 0, z)) for x, z in d['arm_path']]
        rs = [r for r in d['arm_r']]
        def axis(i, path=path):
            a = path[max(0, i - 1)]; b = path[min(len(path) - 1, i)]
            t = (b - a).normalized() if (b - a).length > 1e-6 else V((side, 0, -0.6)).normalized()
            e1 = V((0, 1, 0)); e2 = t.cross(e1).normalized()
            return e1, e2
        rg = tube_rings(bm, loop, path, rs, axis, seam)
        for f in {f for ring in rg for v in ring for f in v.link_faces}:
            if f[zone] == 0: f[zone] = 4
        info['arms'][side] = [loop] + rg
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    info['zone'] = zone; info['seam'] = seam
    return bm, info

def mark_seams(bm):
    lay = bm.verts.layers.int.get('seam')
    if lay is None: return
    for e in bm.edges:
        if e.verts[0][lay] and e.verts[1][lay]: e.seam = True

# ================================================================== ROPA
def garment_from(body_ob, name, coll, face_test, offset, shape_fn=None, extra_fn=None):
    """Prenda: copia de las caras del cuerpo que cumplen face_test(f), ajustada con Shrinkwrap (0,006)
    y separada `offset` para ir por encima de la capa de debajo. Devuelve el objeto (sin Mirror ni resto)."""
    bm = bmesh.new(); bm.from_mesh(body_ob.data)
    zone = bm.faces.layers.int.get('zone')
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not face_test(f, zone)], context='FACES')
    C.clean_bm(bm)
    if extra_fn: extra_fn(bm)
    ob = C.obj_from_bm(bm, name, coll)
    orig = [v.co.copy() for v in ob.data.vertices]
    # Shrinkwrap al cuerpo (Target Normal Project, 0,006) y se aplica: la prenda queda modelada encima
    C.mod_shrinkwrap(ob, body_ob, offset=0.006)
    C.apply_mod(ob, 'Shrinkwrap')
    bm = C.bm_from_obj(ob)
    bm.verts.ensure_lookup_table(); bm.normal_update()
    for v in bm.verts:
        if (v.co - orig[v.index]).length > 0.03: v.co = orig[v.index] + v.normal * 0.006
    bm.normal_update()
    for v in bm.verts:
        n = v.normal.copy(); n.x = 0 if abs(v.co.x) < 1e-4 else n.x
        v.co += n * (offset - 0.006)
        if abs(v.co.x) < 2e-4: v.co.x = 0.0
    if shape_fn: shape_fn(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data); bm.free()
    return ob

# ================================================================== MANOS
def hand_frame(d, side):
    """Marco de la mano izquierda (side=1) o derecha (−1): origen en la muñeca, L a lo largo, W hacia el pulgar, N palma."""
    w0 = V((side * d['wrist'][0], 0, d['wrist'][1])); w1 = V((side * d['hand_end'][0], 0, d['hand_end'][1]))
    L = (w1 - w0).normalized(); W = V((0, -1, 0)); N = L.cross(W).normalized() * side
    return w0, L, W, N

def build_hand(d, side, kind):
    """Palma de cubo subdividido (4 × 2 × 1), cuatro dedos de 4 lados con 2 bucles y el pulgar separado 35°.
    La mano derecha es el espejo exacto de la izquierda."""
    if side < 0:
        bm = build_hand(d, 1, kind)
        for v in bm.verts: v.co.x = -v.co.x
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        return bm
    bm = bmesh.new()
    o, L, W, N = hand_frame(d, side)
    pl, pw, pt = d['palm']            # largo, ancho, grosor
    # rejilla de la palma: i a lo ancho (0..4), j a lo largo (0..2), k grosor (0..1)
    P = {}
    for i in range(5):
        for j in range(3):
            for k in range(2):
                w = (i / 4 - 0.5) * pw; l = j / 2 * pl; t = (k - 0.5) * pt
                P[(i, j, k)] = bm.verts.new(o + L * (l + 0.012) + W * w + N * t)
    def q(a, b, c, e): return bm.faces.new((P[a], P[b], P[c], P[e]))
    tips = {}
    for i in range(4):
        for j in range(2):
            q((i, j, 0), (i + 1, j, 0), (i + 1, j + 1, 0), (i, j + 1, 0)); q((i, j, 1), (i, j + 1, 1), (i + 1, j + 1, 1), (i + 1, j, 1))
    for j in range(2):
        q((0, j, 0), (0, j + 1, 0), (0, j + 1, 1), (0, j, 1)); q((4, j, 0), (4, j, 1), (4, j + 1, 1), (4, j + 1, 0))
    for i in range(4): q((i, 0, 0), (i, 0, 1), (i + 1, 0, 1), (i + 1, 0, 0))   # muñeca
    # dedos desde el borde de delante (j = 2): cada cara de 4 lados se extruye en 3 tramos (2 bucles)
    lens = d['fingers']                # [índice, corazón, anular, meñique] del lado del pulgar al otro
    curl = {'open': [0.12, 0.12, 0.12, 0.12], 'fist': [1.45, 1.5, 1.5, 1.45], 'point': [0.05, 1.5, 1.5, 1.45]}[kind]
    for fi in range(4):
        i = 3 - fi                     # el índice va del lado del pulgar (W+)
        base = [P[(i, 2, 0)], P[(i + 1, 2, 0)], P[(i + 1, 2, 1)], P[(i, 2, 1)]]
        c = sum((v.co for v in base), V()) / 4
        seg = [lens[fi] * f for f in (0.42, 0.33, 0.25)]
        dirv = L.copy(); pos = c.copy(); spread = (fi - 1.5) * 0.05 * (0.2 if kind != 'open' else 1)
        dirv = (Quaternion(N, spread) @ dirv).normalized()
        prev = base; rr = d['finger_r'] * (1.0 - fi * 0.05)
        for s, sl in enumerate(seg):
            ang = curl[fi] / 3
            dirv = (Quaternion(W, -ang * side) @ dirv).normalized()
            pos = pos + dirv * sl
            side2 = N.cross(dirv).normalized()
            k = rr * (1 - s * 0.1)
            cur = [bm.verts.new(pos + side2 * (sx * k) + N * (sy * k)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            # ordenar como la base (misma orientación)
            C.bridge(bm, prev, cur)
            prev = cur
        bm.faces.new(prev[::-1])
    # pulgar: desde la cara lateral (lado W+) junto a la muñeca, separado 35°
    tb = [P[(4, 0, 0)], P[(4, 1, 0)], P[(4, 1, 1)], P[(4, 0, 1)]]
    face = bm.faces.get(tb) or bm.faces.get(tb[::-1])
    if face: bm.faces.remove(face)
    c = sum((v.co for v in tb), V()) / 4
    tdir = (Quaternion(N, rad(35) * side) @ W).normalized()
    if kind == 'fist': tdir = (tdir + L * 0.9 - N * 0.7).normalized()
    prev = tb; pos = c.copy()
    for s, sl in enumerate((0.022, 0.018, 0.014)):
        pos = pos + tdir * sl
        side2 = N.cross(tdir).normalized(); k = d['finger_r'] * 1.1 * (1 - s * 0.1)
        cur = [bm.verts.new(pos + L * (sx * k) + N * (sy * k)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        C.bridge(bm, prev, cur); prev = cur
        if kind == 'fist': tdir = (Quaternion(N, -0.35 * side) @ tdir).normalized()
    bm.faces.new(prev[::-1])
    C.clean_bm(bm)
    return bm

# ================================================================== BOTAS
def build_boot(d):
    """Bota izquierda: cubo con 2 bucles a lo largo, caña hacia arriba y puntera redondeada (Smooth Vertices 0,5 × 5)."""
    bm = bmesh.new()
    bl, bw, bh = d['boot']['len'], d['boot']['w'], d['boot']['h']
    heel = d['boot']['heel_y']
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = V((d['leg_x'] + v.co.x * bw, heel - (v.co.y + 0.5) * bl, (v.co.z + 0.5) * bh))
    # 2 bucles a lo largo (eje Y)
    edges = [e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) > bl * 0.5]
    bmesh.ops.subdivide_edges(bm, edges=edges, cuts=2, use_grid_fill=True)
    # caña: la cara de arriba del tramo de atrás sube hasta el tobillo
    top_back = [f for f in bm.faces if f.normal.z > 0.9 and f.calc_center_median().y > heel - bl / 3]
    for zt, sc in ((d['boot']['shaft'] * 0.55, 1.32), (d['boot']['shaft'], 1.0)):
        top_back = C.extrude(bm, top_back)
        vs = {v for f in top_back for v in f.verts}
        c = sum((v.co for v in vs), V()) / len(vs)
        for v in vs: v.co = V((c.x + (v.co.x - c.x) * sc, c.y + (v.co.y - c.y) * sc, zt))
    bmesh.ops.delete(bm, geom=top_back, context='FACES_ONLY')      # abierta arriba (el calcetín entra)
    # puntera redondeada
    toe = [v for v in bm.verts if v.co.y < heel - bl * 0.62]
    zs = {v: v.co.z for v in toe}
    C.smooth_verts(bm, toe, 0.5, 5)
    for v in toe:
        if zs[v] < 1e-4: v.co.z = 0.0                               # la suela sigue plana
    C.clean_bm(bm)
    # pliegue (crease) en el borde de la suela: la subdivisión no la levanta del suelo
    cr = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    for e in bm.edges:
        if e.verts[0].co.z < 1e-4 and e.verts[1].co.z < 1e-4: e[cr] = 1.0
    return bm

# ================================================================== PELO: mechones con curvas
def taper_object(name, pts, coll):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, (x, y) in zip(sp.bezier_points, pts):
        p.co = (x, y, 0); p.handle_left_type = p.handle_right_type = 'AUTO'
    ob = bpy.data.objects.new(name, cu); coll.objects.link(ob)
    return ob

def curve_to_mesh(ob, name, coll):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    me.name = name
    new = bpy.data.objects.new(name, me); coll.objects.link(new)
    return new

def bezier_tube(name, pts, depth, taper, coll, tilt=0.0, res=4):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_mode = 'ROUND'; cu.bevel_depth = depth; cu.bevel_resolution = res; cu.resolution_u = res
    cu.use_fill_caps = True; cu.taper_object = taper
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, co in zip(sp.bezier_points, pts):
        p.co = co; p.handle_left_type = p.handle_right_type = 'AUTO'; p.tilt = tilt
    ob = bpy.data.objects.new(name + '_curve', cu); coll.objects.link(ob)
    return ob

def close_tip(bm):
    """Cierra y redondea la punta de un mechón: las tapas (n-gon) pasan a abanico de triángulos."""
    C.poke_ngons(bm)
