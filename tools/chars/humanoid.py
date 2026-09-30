# Personaje humanoide cabezón (2,5 cabezas de alto) construido por piezas con charlib.
# Todas las medidas salen de la altura H (m); el diseño (dict) fija colores y prendas.
import math
from mathutils import Vector as V, Quaternion
import charlib as C

def V3(x, y, z): return V((x, y, z))
FRONT = math.pi                                     # longitud de las esferas que mira al frente (-Y)

def dims(H, D):
    """Proporciones a partir de la altura: la cabeza ocupa el 40 % de H (2,5 cabezas)."""
    b = D.get('build', 1.0)
    return dict(
        H=H, ankle=0.07 * H, knee=0.19 * H, hipJ=0.32 * H, hips=0.35 * H, waist=0.42 * H, chest=0.5 * H,
        shoulder=0.555 * H, neck=0.585 * H, chin=0.6 * H, headC=0.8 * H,
        headRx=0.215 * H, headRy=0.2 * H, headRz=0.2 * H,
        legX=0.068 * H * b, thighR=0.066 * H * b, kneeR=0.052 * H * b, calfR=0.055 * H * b, ankleR=0.038 * H * b,
        shX=0.125 * H * b, upper=0.12 * H, fore=0.1 * H, armR=0.045 * H * b, wristR=0.034 * H * b, hand=0.105 * H,
        pelvR=0.125 * H * b, bellyR=0.13 * H * b * D.get('belly', 1.0), chestR=0.128 * H * b, depth=0.82,
        footL=0.21 * H, footW=0.088 * H * b, footH=0.075 * H,
    )

# ------------------------------------------------------------------ esqueleto
def build_rig(d, hair_bones=3, scarf=True):
    R = C.Rig('char'); H = d['H']
    R.add('Hips', (0, 0, d['hips']), (0, 0, d['waist']))
    mid = (d['waist'] + d['chest']) / 2
    R.add('Spine', (0, 0, d['waist']), (0, 0, mid), 'Hips')
    R.add('Spine1', (0, 0, mid), (0, 0, d['chest']), 'Spine')
    R.add('Spine2', (0, 0, d['chest']), (0, 0, d['shoulder']), 'Spine1')
    R.add('Neck', (0, 0, d['shoulder']), (0, 0, d['chin']), 'Spine2')
    R.add('Head', (0, 0, d['chin']), (0, 0, d['headC']), 'Neck')
    R.add('HeadTop_End', (0, 0, d['headC']), (0, 0, H), 'Head')
    sz = d['shoulder'] - 0.012 * H
    for s, side in ((1, 'Left'), (-1, 'Right')):
        sx = d['shX']; ex = sx + d['upper']; wx = ex + d['fore']
        R.add(side + 'Shoulder', (s * 0.02 * H, 0, sz), (s * sx, 0, sz), 'Spine2')
        R.add(side + 'Arm', (s * sx, 0, sz), (s * ex, 0, sz), side + 'Shoulder')
        R.add(side + 'ForeArm', (s * ex, 0, sz), (s * wx, 0, sz), side + 'Arm')
        R.add(side + 'Hand', (s * wx, 0, sz), (s * (wx + d['hand'] * 0.5), 0, sz), side + 'ForeArm')
        R.add(side + 'HandThumb1', (s * (wx + 0.015 * H), -0.02 * H, sz), (s * (wx + 0.035 * H), -0.045 * H, sz), side + 'Hand')
        R.add(side + 'HandThumb2', (s * (wx + 0.035 * H), -0.045 * H, sz), (s * (wx + 0.05 * H), -0.06 * H, sz), side + 'HandThumb1')
        R.add(side + 'HandIndex1', (s * (wx + d['hand'] * 0.5), -0.015 * H, sz), (s * (wx + d['hand'] * 0.75), -0.015 * H, sz), side + 'Hand')
        R.add(side + 'HandIndex2', (s * (wx + d['hand'] * 0.75), -0.015 * H, sz), (s * (wx + d['hand']), -0.015 * H, sz), side + 'HandIndex1')
        lx = d['legX']
        R.add(side + 'UpLeg', (s * lx, 0, d['hipJ']), (s * lx, 0, d['knee']), 'Hips')
        R.add(side + 'Leg', (s * lx, 0, d['knee']), (s * lx, 0, d['ankle']), side + 'UpLeg')
        R.add(side + 'Foot', (s * lx, 0, d['ankle']), (s * lx, -d['footL'] * 0.4, d['footH'] * 0.3), side + 'Leg')
        R.add(side + 'ToeBase', (s * lx, -d['footL'] * 0.4, d['footH'] * 0.3), (s * lx, -d['footL'] * 0.65, d['footH'] * 0.3), side + 'Foot')
    e = eye_pos(d, 1)
    R.add('Eye_L', (e.x, e.y + 0.03 * H, e.z), (e.x, e.y - 0.01 * H, e.z), 'Head')
    e = eye_pos(d, -1)
    R.add('Eye_R', (e.x, e.y + 0.03 * H, e.z), (e.x, e.y - 0.01 * H, e.z), 'Head')
    R.add('Jaw', (0, -0.02 * H, d['headC'] - 0.05 * H), (0, -d['headRy'] * 0.8, d['chin'] + 0.02 * H), 'Head')
    for i in range(hair_bones):
        a = (i - (hair_bones - 1) / 2) * 0.55
        base = V3(math.sin(a) * d['headRx'] * 0.35, 0.02 * H, d['headC'] + d['headRz'] * 0.93)
        R.add(f'Hair_0{i + 1}', tuple(base), tuple(base + V3(math.sin(a) * 0.04 * H, -0.02 * H, 0.07 * H)), 'Head')
    if scarf:
        y0 = -d['chestR'] * d['depth'] * 0.95
        R.add('Scarf_01', (0, y0, sz - 0.01 * H), (0, y0 - 0.01 * H, sz - 0.055 * H), 'Spine2')
        R.add('Scarf_02', (0, y0 - 0.01 * H, sz - 0.055 * H), (0, y0 - 0.015 * H, sz - 0.11 * H), 'Scarf_01')
    return R.build()

# ------------------------------------------------------------------ superficie de la cabeza
def head_shape(d):
    """Deformación de la esfera de la cabeza: mofletes, barbilla redonda y cráneo amplio."""
    def f(p, lat, lon):
        x, y, z = p.x, p.y, p.z
        front = max(0.0, -y / d['headRy'])                  # 1 en la cara
        low = max(0.0, -z / d['headRz'])                    # 1 en la barbilla
        cheek = front * math.exp(-((z / d['headRz'] + 0.25) / 0.3) ** 2)
        x *= 1 + 0.08 * cheek; y *= 1 + 0.06 * cheek
        y *= 1 - 0.1 * low * (1 - front)                    # nuca menos saliente abajo
        z *= 1 - 0.06 * low                                 # barbilla algo más corta
        return V3(x, y, z)
    return f

def head_point(d, x, z, lift=0.0):
    """Punto de la superficie frontal de la cara para (x, z) del mundo, algo hacia fuera."""
    zc = d['headC']; rx, ry, rz = d['headRx'], d['headRy'], d['headRz']
    t = 1 - (x / rx) ** 2 - ((z - zc) / rz) ** 2
    y = -ry * math.sqrt(max(0.02, t))
    p = head_shape(d)(V3(x, y, z - zc), 0, 0)
    n = V3(p.x / rx ** 2, p.y / ry ** 2, p.z / rz ** 2).normalized()
    return V3(p.x, p.y, p.z + zc) + n * lift, n

def eye_pos(d, s):
    p, n = head_point(d, s * d['headRx'] * 0.36, d['headC'] + 0.005 * d['H'], 0.0)
    return p

def decal(d, pts2d, region, lift, fan=True):
    """Pieza fina pegada a la cara a partir de un polígono 2D (x, z) convexo o en tira."""
    P = C.Part()
    xs = [x for x, z in pts2d]; zs = [z for x, z in pts2d]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    for x, z in pts2d:
        p, n = head_point(d, x, z, lift); P.verts.append(p)
    uv = lambda i: ((pts2d[i][0] - x0) / max(1e-6, x1 - x0), (pts2d[i][1] - z0) / max(1e-6, z1 - z0))
    if fan:
        cx, cz = sum(xs) / len(xs), sum(zs) / len(zs)
        p, n = head_point(d, cx, cz, lift * 1.3); ci = len(P.verts); P.verts.append(p)
        for i in range(len(pts2d)):
            j = (i + 1) % len(pts2d)
            P.faces.append((i, j, ci)); P.uvs.append((uv(i), uv(j), (0.5, 0.5)))
    else:  # tira: la primera mitad es un borde y la segunda el otro (mismo número de puntos)
        n2 = len(pts2d) // 2
        for i in range(n2 - 1):
            a, b, c, e = i, i + 1, len(pts2d) - 2 - i, len(pts2d) - 1 - i
            P.faces.append((a, b, c, e)); P.uvs.append((uv(a), uv(b), uv(c), uv(e)))
    P.w = [{'Head': 1.0} for _ in P.verts]
    P.region = region
    return P

def ellipse2d(cx, cz, rx, rz, n=16, a0=0, a1=math.tau):
    return [(cx + math.cos(a0 + (a1 - a0) * i / n) * rx, cz + math.sin(a0 + (a1 - a0) * i / n) * rz) for i in range(n + (0 if a1 - a0 >= math.tau - 1e-6 else 1))]

def arc_strip(cx, cz, rx, rz, a0, a1, w_in, w_out, n=12, tilt=0.0, sx=1.0):
    """Tira curva (ceja, sonrisa): borde exterior y borde interior en orden inverso."""
    outer, inner = [], []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        k = math.sin(math.pi * i / n)                          # más gruesa en el centro
        x = cx + math.cos(a) * rx * sx; z = cz + math.sin(a) * rz + tilt * (i / n - 0.5)
        nx, nz = math.cos(a), math.sin(a)
        outer.append((x + nx * w_out * k * 0.5, z + nz * w_out * (0.35 + 0.65 * k)))
        inner.append((x - nx * w_in * k * 0.5, z - nz * w_in * (0.35 + 0.65 * k)))
    return outer + inner[::-1]

# ------------------------------------------------------------------ cuerpo
def build_body(d, D, rig, BA):
    """Tronco, piernas, brazos y botas en una sola malla 'Body' (material del cuerpo)."""
    H = d['H']; parts = []
    # tronco: de la entrepierna al cuello, elíptico, con barriga y hombros
    zs = [d['hipJ'] - 0.035 * H, d['hips'], (d['hips'] + d['waist']) / 2, d['waist'], (d['waist'] + d['chest']) / 2, d['chest'],
          (d['chest'] + d['shoulder']) / 2, d['shoulder'] - 0.006 * H, d['shoulder'] + 0.012 * H, d['neck'], d['chin'] + 0.02 * H]
    rs = [d['pelvR'] * 0.82, d['pelvR'], d['bellyR'] * 0.98, d['bellyR'], d['bellyR'] * 0.97, d['chestR'],
          d['chestR'] * 0.98, d['chestR'] * 0.82, d['chestR'] * 0.45, 0.046 * H, 0.044 * H]
    wx = [1.1, 1.08, 1.02, 1.0, 1.0, 1.05, 1.12, 1.14, 1.0, 1.0, 1.0]
    rings = [(V3(0, 0, z), V3(1, 0, 0), V3(0, 1, 0), r * w, r * d['depth']) for z, r, w in zip(zs, rs, wx)]
    def wt(p, i, n):
        z = p.z
        if z < d['hips']: return {'Hips': 1.0}
        if z > d['shoulder'] + 0.005 * H:
            k = C.smoothstep(d['shoulder'], d['chin'], z); return {'Neck': 0.3 + 0.7 * k, 'Spine2': 0.7 - 0.7 * k}
        bands = [('Hips', d['hips']), ('Spine', d['waist']), ('Spine1', (d['waist'] + d['chest']) / 2), ('Spine2', d['chest']), ('Spine2', d['shoulder'] + 0.01)]
        for (a, za), (b, zb) in zip(bands, bands[1:]):
            if za <= z <= zb:
                k = C.smoothstep(0.35, 1.0, (z - za) / max(1e-6, zb - za)); return {a: 1 - k, b: k} if a != b else {a: 1.0}
        return {'Spine2': 1.0}
    T = C.loft(rings, 24, wt); T.region = BA.cell('torso', (2, 2)); parts.append(T)
    for s, side in ((1, 'Left'), (-1, 'Right')):
        # pierna con 3 bucles en la rodilla
        lx = s * d['legX']; kz = d['knee']
        zz = [d['hipJ'] + 0.01 * H, d['hipJ'] - 0.03 * H, (d['hipJ'] + kz) / 2, kz + 0.018 * H, kz, kz - 0.018 * H, (kz + d['ankle']) / 2, d['ankle'] + 0.015 * H, d['ankle'] - 0.005 * H]
        rr = [d['thighR'] * 1.02, d['thighR'], d['thighR'] * 0.94, d['kneeR'] * 1.03, d['kneeR'], d['kneeR'] * 0.98, d['calfR'], d['ankleR'] * 1.1, d['ankleR']]
        def wl(p, i, n, side=side):
            z = p.z
            if z > d['hipJ'] - 0.01 * H: return {'Hips': 0.55, side + 'UpLeg': 0.45}
            if z > kz + 0.02 * H: return {side + 'UpLeg': 1.0}
            if z > kz - 0.02 * H: t = (kz + 0.02 * H - z) / (0.04 * H); return {side + 'UpLeg': 1 - t, side + 'Leg': t}
            if z < d['ankle'] + 0.008 * H: return {side + 'Leg': 0.4, side + 'Foot': 0.6}
            return {side + 'Leg': 1.0}
        L = C.loft([(V3(lx, 0, z), V3(1, 0, 0), V3(0, 1, 0), r, r) for z, r in zip(zz, rr)], 16, wl, cap0=False, cap1=True)
        L.region = BA.cell('leg_' + side); parts.append(L)
        # brazo en pose T con 3 bucles en el codo
        sz = d['shoulder'] - 0.012 * H; sx = d['shX']; ex = sx + d['upper']
        xs = [sx - 0.035 * H, sx, sx + d['upper'] * 0.5, ex - 0.015 * H, ex, ex + 0.015 * H, ex + d['fore'] * 0.5, ex + d['fore'] - 0.006 * H, ex + d['fore'] + 0.01 * H]
        ar = [d['armR'] * 1.2, d['armR'] * 1.12, d['armR'], d['armR'] * 0.95, d['armR'] * 0.93, d['armR'] * 0.92, d['armR'] * 0.87, d['wristR'], d['wristR'] * 0.95]
        def wa(p, i, n, side=side):
            x = abs(p.x)
            if x < sx - 0.01 * H: return {side + 'Shoulder': 0.5, 'Spine2': 0.5}
            if x < sx + 0.02 * H: return {side + 'Shoulder': 0.35, side + 'Arm': 0.65}
            if x < ex - 0.015 * H: return {side + 'Arm': 1.0}
            if x < ex + 0.015 * H: t = (x - (ex - 0.015 * H)) / (0.03 * H); return {side + 'Arm': 1 - t, side + 'ForeArm': t}
            if x > ex + d['fore'] - 0.01 * H: return {side + 'ForeArm': 0.5, side + 'Hand': 0.5}
            return {side + 'ForeArm': 1.0}
        A = C.loft([(V3(s * x, 0, sz), V3(0, -s, 0), V3(0, 0, 1), r, r) for x, r in zip(xs, ar)], 14, wa, cap0=False, cap1=True)
        A.region = BA.cell('arm_' + side); parts.append(A)
        # bota: puntera redonda alargada, suela plana y caña
        fl, fw, fh = d['footL'], d['footW'], d['footH']
        def shoe(p, lat, lon):
            x, y, z = p.x, p.y, p.z
            if y < 0: y *= 1.55
            if z < 0: z *= 0.35; x *= 1.04
            return V3(x, y, z)
        B = C.sphere((lx, -fl * 0.12, fh * 0.52), 1.0, rings=10, seg=16, squash=(fw, fl * 0.42, fh * 0.62), shape=shoe,
                     weight_fn=lambda p, side=side: ({side + 'Foot': 1.0} if p.y > -fl * 0.3 else {side + 'Foot': 0.35, side + 'ToeBase': 0.65}))
        B.region = BA.cell('boot_' + side); parts.append(B)
        cuff = C.loft([(V3(lx, 0, z), V3(1, 0, 0), V3(0, 1, 0), r, r) for z, r in ((fh * 0.55, d['ankleR'] * 1.35), (fh * 1.25, d['ankleR'] * 1.3), (fh * 1.35, d['ankleR'] * 1.15))],
                      14, lambda p, i, n, side=side: {side + 'Leg': 0.3, side + 'Foot': 0.7}, cap0=False, cap1=False)
        cuff.region = BA.cell('cuff_' + side); parts.append(cuff)
    return C.to_object('Body', C.merge(parts), D['mat_body'], rig)

# ------------------------------------------------------------------ manos (variantes)
def hand(d, s, kind, rig, BA_region, D):
    """Mano grande (1,4×) en pose T: palma, cuatro dedos y pulgar. kind: open | fist | point."""
    H = d['H']; side = 'Left' if s > 0 else 'Right'
    wx = d['shX'] + d['upper'] + d['fore']; sz = d['shoulder'] - 0.012 * H
    hl = d['hand']; parts = []
    palm = C.sphere((s * (wx + hl * 0.3), 0, sz), 1.0, rings=8, seg=12, squash=(hl * 0.3, hl * 0.2, hl * 0.28),
                    weight_fn=lambda p: {side + 'Hand': 1.0})
    parts.append(palm)
    fr = hl * 0.085
    for f in range(4):
        zoff = (1.5 - f) * fr * 2.05
        curled = kind == 'fist' or (kind == 'point' and f > 0)
        base = V3(s * (wx + hl * 0.55), 0, sz + zoff)
        if curled:   # dedo doblado hacia la palma
            pts = [base, base + V3(s * hl * 0.12, -hl * 0.04, 0), base + V3(s * hl * 0.14, -hl * 0.14, 0), base + V3(s * hl * 0.06, -hl * 0.18, 0)]
        else:
            ln = hl * (0.4 if f in (1, 2) else 0.34)
            pts = [base, base + V3(s * ln * 0.5, 0, zoff * 0.12), base + V3(s * ln, 0, zoff * 0.22)]
        bone1 = side + ('HandIndex1' if f == 0 else 'Hand'); bone2 = side + ('HandIndex2' if f == 0 else 'Hand')
        rings = [(p, V3(0, 0, 1), V3(0, 1, 0), fr * (1 - 0.12 * i), fr * (1 - 0.12 * i)) for i, p in enumerate(pts)]
        F = C.loft(rings, 8,
                   lambda p, i, n, b1=bone1, b2=bone2: {b1: 1.0} if i == 0 else {b2: 1.0}, cap0=False, cap1=True)
        parts.append(F)
    # pulgar enfrentado, hacia delante
    tb = V3(s * (wx + hl * 0.18), -hl * 0.14, sz)
    tip = tb + (V3(s * hl * 0.12, -hl * 0.12, 0) if kind != 'fist' else V3(s * hl * 0.2, -hl * 0.05, -hl * 0.08))
    Tm = C.loft([(tb, V3(0, 0, 1), V3(1, 0, 0), fr * 1.15, fr * 1.15), ((tb + tip) / 2, V3(0, 0, 1), V3(1, 0, 0), fr * 1.05, fr * 1.05), (tip, V3(0, 0, 1), V3(1, 0, 0), fr * 0.95, fr * 0.95)], 8,
                lambda p, i, n: {side + 'HandThumb1': 1.0} if i < 2 else {side + 'HandThumb2': 1.0}, cap0=False, cap1=True)
    parts.append(Tm)
    for p in parts: p.region = BA_region
    name = f'Hand_{"L" if s > 0 else "R"}_{ {"open": "Open", "fist": "Fist", "point": "Point"}[kind] }'
    return C.to_object(name, C.merge(parts), D['mat_body'], rig, extras={'group': 'hand_' + ('L' if s > 0 else 'R'), 'default': kind == 'open'})

# ------------------------------------------------------------------ cabeza, pelo y cara
def build_head(d, D, rig, FA):
    H = d['H']; parts = []
    Hd = C.sphere((0, 0, d['headC']), 1.0, rings=22, seg=32, squash=(d['headRx'], d['headRy'], d['headRz']), shape=head_shape(d),
                  weight_fn=lambda p: {'Head': 1.0})
    Hd.region = FA.cell('skin', (2, 2)); parts.append(Hd)
    # nariz redonda y orejas
    np_, n = head_point(d, 0, d['headC'] - 0.045 * H, 0.0)
    nose = C.sphere(np_ + n * 0.012 * H, 1.0, rings=8, seg=12, squash=(0.036 * H, 0.03 * H, 0.03 * H), weight_fn=lambda p: {'Head': 1.0})
    nose.region = FA.cell('nose'); parts.append(nose)
    for s in (1, -1):
        ear = C.sphere((s * d['headRx'] * 0.98, 0.01 * H, d['headC'] - 0.01 * H), 1.0, rings=8, seg=12, squash=(0.018 * H, 0.04 * H, 0.055 * H),
                       weight_fn=lambda p: {'Head': 1.0})
        ear.region = Hd.region
        parts.append(ear)
    # contorno de los ojos (línea oscura detrás del ojo): forma parte de la cabeza
    for s in (1, -1):
        e = eye_pos(d, s); ew, eh = D['eyeW'] * H, D['eyeH'] * H
        rim = decal(d, ellipse2d(e.x, e.z, ew * 1.14, eh * 1.1, 20), FA.cell('line_' + ('L' if s > 0 else 'R')), 0.0035 * H)
        parts.append(rim)
    head = C.to_object('Head', C.merge(parts), D['mat_face'], rig)
    return head

def build_hair(d, D, rig, FA):
    """Pelo moreno alborotado: casquete con nacimiento del pelo y 3 mechones con sus huesos."""
    H = d['H']; P = C.Part(); seg = 28; rows = 9
    rx, ry, rz = d['headRx'] * 1.08, d['headRy'] * 1.1, d['headRz'] * 1.1
    def hairline(lon):                                     # latitud del borde del pelo según el lado
        f = math.cos(lon - FRONT)                          # 1 delante, -1 detrás
        return 0.35 + 0.25 * max(0, f) - 0.75 * max(0, -f) + 0.08 * math.sin(lon * 7)
    for i in range(rows):
        for j in range(seg):
            lon = j / seg * math.tau; lat0 = hairline(lon)
            lat = lat0 + (math.pi / 2 - lat0) * (i / rows)
            k = 0.94 if i == 0 else 1.0 + 0.05 * math.sin(lon * 5 + i) * (i / rows) * 0.6   # borde metido bajo el pelo
            p = V3(math.sin(lon) * math.cos(lat) * rx * k, math.cos(lon) * math.cos(lat) * ry * k, math.sin(lat) * rz * k)
            P.verts.append(p + V3(0, 0, d['headC'])); P.w.append({'Head': 1.0})
    top = len(P.verts); P.verts.append(V3(0, 0, d['headC'] + rz)); P.w.append({'Head': 1.0})
    for i in range(rows - 1):
        for j in range(seg):
            j2 = (j + 1) % seg
            P.faces.append((i * seg + j, i * seg + j2, (i + 1) * seg + j2, (i + 1) * seg + j))
            P.uvs.append(((j / seg, i / rows), ((j + 1) / seg, i / rows), ((j + 1) / seg, (i + 1) / rows), (j / seg, (i + 1) / rows)))
    for j in range(seg):
        j2 = (j + 1) % seg; a, b = (rows - 1) * seg + j, (rows - 1) * seg + j2
        P.faces.append((a, b, top)); P.uvs.append(((j / seg, 0.9), ((j + 1) / seg, 0.9), ((j + .5) / seg, 1)))
    P.region = FA.cell('hair')
    parts = [P]
    # mechones de punta (alborotado), cada uno con su hueso Hair_0x
    for i in range(3):
        b = rig.data.bones[f'Hair_0{i + 1}']
        h, t = b.head_local, b.tail_local
        base = h + V3(0, 0, -0.01 * H)
        pts = [base, base + (t - h) * 0.5, t + (t - h) * 0.3]
        rings = [(p, V3(1, 0, 0), V3(0, 1, 0), r, r * 0.8) for p, r in zip(pts, (0.04 * H, 0.025 * H, 0.006 * H))]
        tf = C.loft(rings, 8, lambda p, i2, n, bn=f'Hair_0{i + 1}': {'Head': 1.0} if i2 == 0 else {bn: 1.0 if i2 == 2 else 0.6, 'Head': 0.0 if i2 == 2 else 0.4}, cap0=False, cap1=True)
        tf.region = P.region; parts.append(tf)
    # flequillo: lámina pegada a la frente con el borde en tres ondas y canto redondeado
    cols, rows_f = 18, 5
    xs = [(-1 + 2 * j / cols) * d['headRx'] * 0.78 for j in range(cols + 1)]
    ztop = d['headC'] + 0.16 * H
    def zbot(x):
        u = x / (d['headRx'] * 0.78)
        return d['headC'] + (0.098 + 0.018 * abs(math.sin(u * math.pi * 1.5)) + 0.03 * u * u) * H
    B = C.Part(); base_i = len(B.verts)
    for i in range(rows_f + 1):
        for x in xs:
            k = i / rows_f; z = ztop + (zbot(x) - ztop) * k
            lift = (0.016 - 0.004 * k) * H if i < rows_f else 0.004 * H     # la última fila se mete: canto grueso
            if i == rows_f: z -= 0.004 * H
            p, n = head_point(d, x, z, lift)
            B.verts.append(p); B.w.append({'Head': 1.0})
    W = cols + 1
    for i in range(rows_f):
        for j in range(cols):
            a = i * W + j
            B.faces.append((a, a + W, a + W + 1, a + 1))
            B.uvs.append(((j / cols, 1 - i / rows_f), (j / cols, 1 - (i + 1) / rows_f), ((j + 1) / cols, 1 - (i + 1) / rows_f), ((j + 1) / cols, 1 - i / rows_f)))
    B.region = P.region; parts.append(B)
    return C.to_object('Hair', C.merge(parts), D['mat_face'], rig)

def build_eyes(d, D, rig, mat_eyes):
    """Discos de ojo con su propio material (textura 256 con iris, pupila y brillo)."""
    H = d['H']; out = []
    for s, nm in ((1, 'Eye_L'), (-1, 'Eye_R')):
        e = eye_pos(d, s); ew, eh = D['eyeW'] * H, D['eyeH'] * H
        _, n = head_point(d, e.x, e.z, 0.0)
        P = C.sphere(V3(0, 0, 0), 1.0, rings=8, seg=16, squash=(ew, 0.01 * H, eh), weight_fn=lambda p, nm=nm: {nm: 1.0})
        # UV planas de frente: el disco usa el centro de la textura (0,25–0,75) para poder mover la mirada
        P.uvs = [tuple((0.5 + P.verts[i].x / ew * 0.25, 0.5 + P.verts[i].z / eh * 0.25) for i in f) for f in P.faces]
        # disco fino orientado según la normal de la cara, casi a ras (no sobresale de perfil)
        rot = V3(0, -1, 0).rotation_difference(n)
        P.verts = [e - n * 0.002 * H + rot @ v for v in P.verts]
        out.append(C.to_object(nm, P, mat_eyes, rig))
    return out

def build_face_sets(d, D, rig, FA):
    """Párpados, cejas y bocas: variantes ya colocadas; el juego enseña una de cada grupo."""
    H = d['H']; objs = []
    lid_r = FA.cell('lid'); brow_r = FA.cell('brow'); dark = FA.cell('mouth'); tongue = FA.cell('tongue'); teeth = FA.cell('teeth'); line = FA.cell('mline')
    # párpados: medio cerrado (cansado, enfado) y cerrado (parpadeo), con la línea de pestañas
    for nm, cover in (('Eyelid_Half', 0.5), ('Eyelid_Closed', 1.0)):
        parts = []
        for s in (1, -1):
            e = eye_pos(d, s); ew, eh = D['eyeW'] * H * 1.1, D['eyeH'] * H * 1.08
            if cover < 1:
                parts.append(decal(d, ellipse2d(e.x, e.z, ew, eh, 14, 0, math.pi), lid_r, 0.0075 * H))
                parts.append(decal(d, [(e.x + ew, e.z + 0.004 * H), (e.x - ew, e.z + 0.004 * H), (e.x - ew, e.z - 0.004 * H), (e.x + ew, e.z - 0.004 * H)], line, 0.0085 * H, fan=False))
            else:
                parts.append(decal(d, ellipse2d(e.x, e.z, ew, eh, 20), lid_r, 0.0075 * H))
                parts.append(decal(d, arc_strip(e.x, e.z + eh * 0.25, ew * 0.95, eh * 0.45, math.pi * 1.1, math.pi * 1.9, 0.004 * H, 0.004 * H, 10), line, 0.0085 * H, fan=False))
        objs.append(C.to_object(nm, C.merge(parts), D['mat_face'], rig, extras={'group': 'lid', 'default': False}))
    # cejas: normal, enfado (el extremo interior baja) y preocupación (el interior sube)
    for nm, tilt in (('Brow_Normal', 0.0), ('Brow_Angry', -1.0), ('Brow_Worried', 1.0)):
        parts = []
        for s in (1, -1):
            e = eye_pos(d, s); w = D['eyeW'] * H * 1.1; bz = e.z + D['eyeH'] * H * 1.35
            pts = arc_strip(e.x, bz - 0.02 * H, w, 0.03 * H, math.pi * 0.2, math.pi * 0.8, 0.008 * H, 0.012 * H, 10)
            def lift(x, z):
                t = min(1, max(0, (abs(e.x) + w - abs(x)) / (2 * w)))       # 0 fuera, 1 junto a la nariz
                return (x, z + tilt * 0.024 * H * (t - 0.5))
            parts.append(decal(d, [lift(x, z) for x, z in pts], brow_r, 0.006 * H, fan=False))
        objs.append(C.to_object(nm, C.merge(parts), D['mat_face'], rig, extras={'group': 'brow', 'default': nm == 'Brow_Normal'}))
    # bocas
    mz = d['headC'] - 0.1 * H
    def open_mouth(w, h, tong=True, tee=True, cz=mz, shape='smile'):
        parts = []
        if shape == 'smile': poly = ellipse2d(0, cz + h * 0.25, w, h, 18, math.pi, 2 * math.pi) + [(w, cz + h * 0.25)]
        else: poly = ellipse2d(0, cz, w, h, 20)
        parts.append(decal(d, poly, dark, 0.004 * H))
        if tee: parts.append(decal(d, ellipse2d(0, cz + (h * 0.12 if shape == 'smile' else h * 0.7), w * 0.7, h * 0.14, 12), teeth, 0.0055 * H))
        if tong: parts.append(decal(d, ellipse2d(0, cz - h * 0.45, w * 0.45, h * 0.3, 12), tongue, 0.0055 * H))
        return parts
    mouths = {
        'Mouth_Normal': [decal(d, arc_strip(0, mz + 0.035 * H, 0.05 * H, 0.04 * H, math.pi * 1.2, math.pi * 1.8, 0.004 * H, 0.005 * H, 12), line, 0.005 * H, fan=False)],
        'Mouth_Happy': open_mouth(0.055 * H, 0.05 * H),
        'Mouth_Surprised': open_mouth(0.025 * H, 0.035 * H, tong=False, tee=False, shape='o'),
        'Mouth_Scared': open_mouth(0.05 * H, 0.022 * H, tong=False, tee=True, shape='o'),
        'Mouth_Talk_A': open_mouth(0.04 * H, 0.04 * H, tee=True, shape='o'),
        'Mouth_Talk_O': open_mouth(0.022 * H, 0.026 * H, tong=False, tee=False, shape='o'),
        'Mouth_Tired': [decal(d, ellipse2d(0, mz, 0.035 * H, 0.008 * H, 14), dark, 0.004 * H)],
    }
    for nm, parts in mouths.items():
        objs.append(C.to_object(nm, C.merge(parts), D['mat_face'], rig, extras={'group': 'mouth', 'default': nm == 'Mouth_Normal'}))
    return objs

def build_scarf(d, D, rig, BA):
    """Pañuelo al cuello con nudo delante y dos puntas (huesos Scarf_01 y Scarf_02)."""
    H = d['H']; parts = []
    sz = d['shoulder'] + 0.01 * H
    ring = C.loft([(V3(0, 0, sz - 0.012 * H), V3(1, 0, 0), V3(0, 1, 0), 0.066 * H, 0.066 * H * d['depth'] * 1.05),
                   (V3(0, 0, sz + 0.006 * H), V3(1, 0, 0), V3(0, 1, 0), 0.07 * H, 0.07 * H * d['depth'] * 1.05),
                   (V3(0, 0, sz + 0.022 * H), V3(1, 0, 0), V3(0, 1, 0), 0.058 * H, 0.058 * H * d['depth'] * 1.05)], 20,
                  lambda p, i, n: {'Neck': 0.5, 'Spine2': 0.5}, cap0=False, cap1=False)
    region = BA.cell('scarf'); ring.region = region; parts.append(ring)
    b1, b2 = rig.data.bones['Scarf_01'], rig.data.bones['Scarf_02']
    knot = C.sphere(b1.head_local + V3(0, -0.012 * H, 0.004 * H), 1.0, rings=6, seg=10, squash=(0.026 * H, 0.02 * H, 0.022 * H), weight_fn=lambda p: {'Spine2': 1.0})
    knot.region = region; parts.append(knot)
    for s in (1, -1):
        pts = [b1.head_local + V3(s * 0.01 * H, -0.01 * H, 0), b1.tail_local + V3(s * 0.02 * H, -0.012 * H, 0), b2.tail_local + V3(s * 0.03 * H, -0.01 * H, 0)]
        tail = C.loft([(p, V3(1, 0, 0), V3(0, 1, 0), w, 0.006 * H) for p, w in zip(pts, (0.018 * H, 0.024 * H, 0.012 * H))], 8,
                      lambda p, i, n: {'Scarf_01': 1.0} if i < 2 else {'Scarf_01': 0.3, 'Scarf_02': 0.7}, cap0=False, cap1=True)
        tail.region = region; parts.append(tail)
    return C.to_object('Acc_Scarf', C.merge(parts), D['mat_body'], rig, extras={'group': 'acc', 'default': True})
