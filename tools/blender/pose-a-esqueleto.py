# Pasa al esqueleto de un personaje (mixamorig) un movimiento real sacado de vídeo con tools/pose-video.mjs.
# Por cada fotograma: la cadera y el pecho se orientan con la línea de caderas / hombros, los brazos y piernas con la
# dirección de cada segmento (el codo y la rodilla doblan como bisagra, en su plano), los pies tocan el suelo.
# Necesita bpy 5.x (Blender como módulo de Python 3.13) y un GLB sin meshopt (tools/glb-descomprime.mjs).
# python tools/blender/pose-a-esqueleto.py -- entrada.glb pose.json salida.glb [carpeta_render|-] [desde] [hasta] [ancho] [alto]
# (variables: QUIEN=azul|rojo el pelotari a seguir, SIGMA suavizado en fotogramas, DIST distancia de cámara, MUESTRAS de Cycles, FR=1,20,40 solo esos fotogramas)
import bpy, sys, json, math, os
from mathutils import Matrix, Quaternion, Vector
a = sys.argv[sys.argv.index('--') + 1:]
ENT, POSE, SAL = a[0], a[1], a[2]
REN = a[3] if len(a) > 3 and a[3] != '-' else None
F0 = int(a[4]) if len(a) > 4 else 0
F1 = int(a[5]) if len(a) > 5 else 10 ** 9
RW = int(a[6]) if len(a) > 6 else 600
RH = int(a[7]) if len(a) > 7 else 560
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and (o.name.lower().startswith('icosphere') or o.name.lower().startswith('cube')): bpy.data.objects.remove(o)
    elif o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
sc = bpy.context.scene
P = arm.pose.bones; B = arm.data.bones
for pb in P: pb.rotation_mode = 'QUATERNION'
arm.animation_data_create(); arm.animation_data.action = None
def mx(n): return 'mixamorig:' + n

# ---- la pose del vídeo, en el espacio del esqueleto (Z arriba, X a la izquierda del jugador si mira a cámara)
J = json.load(open(POSE))
fotos = [f for f in J['fotos']][F0:F1]
QUIEN = os.environ.get('QUIEN')  # con tools/pose-video.mjs SEGUIR=azul,rojo: el pelotari de ese color
def elige(F, prev):  # la persona: la más parecida (por centro) a la del fotograma anterior
    g = [p for p in F['gente'] if not QUIEN or p.get('quien') == QUIEN]
    if not g: return None
    if prev is None: return max(g, key=lambda p: sum(q[2] for q in p['img']))
    return min(g, key=lambda p: (p['cx'] - prev['cx']) ** 2 + (p['cy'] - prev['cy']) ** 2)
sel = []; prev = None
for F in fotos:
    p = elige(F, prev); sel.append(p); prev = p or prev
# relleno de huecos con el anterior
for i in range(len(sel)):
    if sel[i] is None: sel[i] = sel[i - 1] if i else next(s for s in sel if s)
N = len(sel)
img = [[list(q) for q in p['img']] for p in sel]
mun = [[list(q) for q in p['mundo']] for p in sel]
CRUDO = os.environ.get('CRUDO')  # (como antes: las marcas en metros del detector, tal cual)
if CRUDO:
    W = [[Vector((q[0], q[2], -q[1])) for q in m] for m in mun]
else:
    # 1) Marcas fiables: las que el detector ve poco o caen fuera de la imagen (un pie tapado, el jugador saliéndose del
    #    encuadre) no se usan: se rellenan con las de los fotogramas buenos de al lado. Si no, se inventa piernas.
    def fiable(q): return q[2] >= 0.08 and 0.01 < q[0] < 0.99 and 0.005 < q[1] < 0.995  # (de espaldas, codos y muñecas tapados dan poca visibilidad pero bien situados)
    ok = [[fiable(q) for q in fila] for fila in img]
    rell = 0
    for k in range(33):
        buenos = [i for i in range(N) if ok[i][k]]
        if not buenos: continue
        for i in range(N):
            if ok[i][k]: continue
            a = max((j for j in buenos if j < i), default=None); b = min((j for j in buenos if j > i), default=None)
            a = b if a is None else a; b = a if b is None else b
            t = 0 if a == b else (i - a) / (b - a); rell += 1
            img[i][k] = [img[a][k][c] * (1 - t) + img[b][k][c] * t for c in range(2)] + [0.0]
            mun[i][k] = [mun[a][k][c] * (1 - t) + mun[b][k][c] * t for c in range(3)]
    print('marcas rellenadas', rell, 'de', N * 33)
    # 2) La forma, de la imagen (lo fiable); la profundidad, de la longitud de cada hueso: si un hueso se ve más corto de
    #    lo que mide es que va hacia la cámara o hacia el fondo, y cuánto lo dice el teorema de Pitágoras. Del detector
    #    sólo se toma hacia qué lado (su profundidad es lo que más falla, sobre todo de espaldas).
    VIRT = {'mc': (23, 24), 'mh': (11, 12), 'mo': (7, 8)}
    def gi(i, j):  # en la imagen (x, y), de 0 a 1
        if j in VIRT: a, b = VIRT[j]; return [(img[i][a][c] + img[i][b][c]) / 2 for c in range(2)]
        return img[i][j][:2]
    def gw(i, j):
        if j in VIRT: a, b = VIRT[j]; return [(mun[i][a][c] + mun[i][b][c]) / 2 for c in range(3)]
        return mun[i][j]
    ARBOL = [('mc', 23), ('mc', 24), ('mc', 'mh'), ('mh', 11), ('mh', 12), ('mh', 'mo'), ('mo', 7), ('mo', 8), ('mo', 0),
             (11, 13), (13, 15), (15, 17), (15, 19), (15, 21), (12, 14), (14, 16), (16, 18), (16, 20), (16, 22),
             (23, 25), (25, 27), (27, 29), (27, 31), (24, 26), (26, 28), (28, 30), (28, 32)]
    def med(xs): xs = sorted(xs); return xs[len(xs) // 2] if xs else 1.0
    if J.get('ancho') and J.get('alto'): ASP = J['alto'] / J['ancho']
    else:  # (sin tamaño guardado: la proporción de la imagen, comparando las marcas en metros con las de la imagen)
        rx, ry = [], []
        for i in range(N):
            for a, b in ARBOL:
                dxi, dyi = gi(i, b)[0] - gi(i, a)[0], gi(i, b)[1] - gi(i, a)[1]; dxw, dyw = gw(i, b)[0] - gw(i, a)[0], gw(i, b)[1] - gw(i, a)[1]
                if abs(dxi) > 0.02: rx.append(abs(dxw / dxi))
                if abs(dyi) > 0.01: ry.append(abs(dyw / dyi))
        ASP = med(ry) / med(rx)
    L = {e: med([math.dist(gw(i, e[0]), gw(i, e[1])) for i in range(N)]) for e in ARBOL}
    esc = []
    for i in range(N):  # metros por unidad de imagen, en cada fotograma (el jugador se acerca y se aleja)
        r = []
        for a, b in ARBOL:
            dxi, dyi = gi(i, b)[0] - gi(i, a)[0], (gi(i, b)[1] - gi(i, a)[1]) * ASP
            li = math.hypot(dxi, dyi)
            if li > 0.012: r.append(math.hypot(gw(i, b)[0] - gw(i, a)[0], gw(i, b)[1] - gw(i, a)[1]) / li)
        esc.append(med(r))
    esc = [sum(esc[j] * math.exp(-0.5 * ((j - i) / 4) ** 2) for j in range(N)) / sum(math.exp(-0.5 * ((j - i) / 4) ** 2) for j in range(N)) for i in range(N)]
    W = []
    for i in range(N):
        s = esc[i]; pos = {'mc': Vector((0, 0, 0))}
        for a, b in ARBOL:
            dX = (gi(i, b)[0] - gi(i, a)[0]) * s; dZ = -(gi(i, b)[1] - gi(i, a)[1]) * ASP * s
            dz = math.sqrt(max(L[(a, b)] ** 2 - dX * dX - dZ * dZ, 0))
            lado = math.tanh((gw(i, b)[2] - gw(i, a)[2]) / 0.06)
            pos[b] = pos[a] + Vector((dX, dz * lado, dZ))
        # la rodilla sólo se dobla hacia delante: de espaldas a la cámara esa flexión va toda en la profundidad y el detector
        # a veces la pone al revés; de las cuatro combinaciones de hacia dónde van muslo y espinilla, la primera que cumple
        izq_ = pos[23] - pos[24]; arr_ = pos['mh'] - pos['mc']; dl_ = izq_.cross(arr_).normalized() if izq_.cross(arr_).length > 1e-6 else Vector((0, -1, 0))
        for ca, ro, to, pies in ((23, 25, 27, (29, 31)), (24, 26, 28, (30, 32))):
            def tramo(a, b, sg):
                dX = (gi(i, b)[0] - gi(i, a)[0]) * s; dZ = -(gi(i, b)[1] - gi(i, a)[1]) * ASP * s
                return Vector((dX, math.sqrt(max(L[(a, b)] ** 2 - dX * dX - dZ * dZ, 0)) * sg, dZ))
            st = 1 if gw(i, ro)[2] >= gw(i, ca)[2] else -1; ss = 1 if gw(i, to)[2] >= gw(i, ro)[2] else -1
            mejor = None
            for a1, a2 in ((st, ss), (st, -ss), (-st, ss), (-st, -ss)):
                k_ = pos[ca] + tramo(ca, ro, a1); t_ = k_ + tramo(ro, to, a2)
                fw = (k_ - (pos[ca] + t_) * 0.5).dot(dl_)
                if mejor is None or fw > mejor[0] + 1e-9: mejor = (fw, k_, t_)
                if fw >= -0.015: mejor = (fw, k_, t_); break
            mov = mejor[2] - pos[to]; pos[ro], pos[to] = mejor[1], mejor[2]
            for pk in pies: pos[pk] = pos[pk] + mov
        W.append([pos[k] if k in pos else Vector((mun[i][k][0], mun[i][k][2], -mun[i][k][1])) for k in range(33)])
# suavizado en el tiempo (gaussiano, sigma ~1 fotograma): quita el temblor sin comerse el golpe
def suaviza(W, s=1.0):
    k = [math.exp(-0.5 * (d / s) ** 2) for d in range(-3, 4)]
    out = []
    for i in range(len(W)):
        acc = [Vector((0, 0, 0)) for _ in range(33)]; ws = 0
        for d, kw in zip(range(-3, 4), k):
            j = min(max(i + d, 0), len(W) - 1); ws += kw
            for m in range(33): acc[m] += W[j][m] * kw
        out.append([v / ws for v in acc])
    return out
W = suaviza(W, float(os.environ.get('SIGMA', '1.2')))
print('fotogramas', len(W))

# ---- el esqueleto en reposo
rest = {b.name: b.matrix_local.copy() for b in B}
H0 = {b.name: b.head_local.copy() for b in B}
def basis(left, up):
    x = left.normalized(); z = (up - up.dot(x) * x).normalized(); y = z.cross(x)
    return Matrix((x, y, z)).transposed()  # columnas
mid = lambda a, b: (a + b) * 0.5
hips0 = basis(H0[mx('LeftUpLeg')] - H0[mx('RightUpLeg')], mid(H0[mx('LeftArm')], H0[mx('RightArm')]) - mid(H0[mx('LeftUpLeg')], H0[mx('RightUpLeg')]))
chest0 = basis(H0[mx('LeftArm')] - H0[mx('RightArm')], mid(H0[mx('LeftArm')], H0[mx('RightArm')]) - mid(H0[mx('LeftUpLeg')], H0[mx('RightUpLeg')]))
head0 = basis(Vector((1, 0, 0)), H0[mx('Head')] - H0[mx('Neck')])
FWD, BACK = Vector((0, -1, 0)), Vector((0, 1, 0))
def cabeza(n):  # cabeza del hueso, posada
    return P[n].matrix.to_translation()
def gira(n, R):  # rota el hueso n en el espacio del esqueleto alrededor de su cabeza
    M = P[n].matrix.copy(); t = M.to_translation()
    R3 = R.to_matrix() if isinstance(R, Quaternion) else R.to_3x3()
    N = (R3 @ M.to_3x3()).to_4x4(); N.translation = t
    P[n].matrix = N; bpy.context.view_layer.update()
def apunta(n, hijo, d):  # el hueso n, con giro mínimo, hacia la dirección d (su hijo marca hacia dónde mira ahora)
    cur = (cabeza(hijo) - cabeza(n)).normalized()
    gira(n, cur.rotation_difference(d.normalized()))
def bisagra(n, hijo, nieto, u, f, fwd0, prevn, ref):
    # el hueso n mira hacia u y gira sobre sí mismo para que la bisagra (codo/rodilla) quede en el plano de u y f
    cur_u = (cabeza(hijo) - cabeza(n)).normalized()
    Q = P[n].matrix.to_3x3() @ rest[n].to_3x3().inverted()  # giro actual respecto al reposo (heredado del padre)
    u0 = (H0[hijo] - H0[n]).normalized(); n0 = u0.cross(fwd0).normalized()
    cur_n = (Q @ n0); cur_n = (cur_n - cur_n.dot(cur_u) * cur_u).normalized()
    u = u.normalized(); fn = f.normalized(); c = u.cross(fn); s = c.length
    fb = cur_u.rotation_difference(u) @ cur_n  # sólo balanceo, sin giro propio
    refn = prevn if prevn is not None else fb
    refn = (refn - refn.dot(u) * u).normalized()
    if s > 1e-4:
        nc = c / s
        if nc.dot(refn) < 0 and s < 0.35: nc = -nc
    else: nc = refn
    w = min(max((s - 0.1) / 0.25, 0), 1)
    nn = nc * w + refn * (1 - w); nn = (nn - nn.dot(u) * u).normalized()
    Bc = Matrix((cur_u, cur_n, cur_u.cross(cur_n))).transposed(); Bt = Matrix((u, nn, u.cross(nn))).transposed()
    gira(n, (Bt @ Bc.transposed()).to_4x4())
    return nn
L = dict(nariz=0, oreL=7, oreR=8, hL=11, hR=12, cL=13, cR=14, mL=15, mR=16, meL=17, meR=18, iL=19, iR=20,
         caL=23, caR=24, rL=25, rR=26, tL=27, tR=28, taL=29, taR=30, pL=31, pR=32)
prevn = {}
ankle0 = {s: H0[mx(s + 'Foot')].z for s in ('Left', 'Right')}; toe0 = {s: H0[mx(s + 'ToeBase')].z for s in ('Left', 'Right')}
act = bpy.data.actions.new('GolpeReal'); arm.animation_data.action = act
if hasattr(act, 'slots'):
    try:
        sl = act.slots.new(id_type='OBJECT', name='GolpeReal'); arm.animation_data.action_slot = sl
    except Exception as e: print('slot', e)
for i, w in enumerate(W):
    for pb in P: pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    g = lambda k: w[L[k]]
    mh = mid(g('caL'), g('caR')); ms = mid(g('hL'), g('hR'))
    Rh = basis(g('caL') - g('caR'), ms - mh) @ hips0.transposed()
    # el pecho gira respecto a la cadera sólo lo que da el cuerpo (y con los brazos arriba, menos: entonces los hombros se
    # suben y se juntan, y el detector cree que el tronco está girado)
    up = (ms - mh).normalized()
    def plano(v): v = v - v.dot(up) * up; return v.normalized() if v.length > 1e-6 else Vector((1, 0, 0))
    hl, sl = plano(g('caL') - g('caR')), plano(g('hL') - g('hR'))
    th = math.atan2(hl.cross(sl).dot(up), hl.dot(sl))
    brazos = max(g('cL').z - g('hL').z, g('cR').z - g('hR').z) > 0.05
    th = max(-math.radians(35), min(math.radians(35), th * (0.35 if brazos else 0.7)))
    Rc = basis(Quaternion(up, th) @ hl, ms - mh) @ chest0.transposed()
    # la cabeza: de cara a la cámara, la de la cara; de espaldas (la cara se la inventa el detector), derecha y mirando
    # adonde mira el pecho, como quien sigue la pelota
    me = mid(g('oreL'), g('oreR'))
    de_cara = (g('caL') - g('caR')).normalized().x > 0.3
    if de_cara: Rk = basis(g('oreL') - g('oreR'), me - ms) @ head0.transposed()
    else:
        cl = Rc @ chest0 @ Vector((1, 0, 0)); cl.z = 0
        Rk = basis(cl if cl.length > 1e-6 else Vector((1, 0, 0)), Vector((0, 0, 1))) @ head0.transposed()
    gira(mx('Hips'), Rh.to_4x4())
    q = (Rc @ Rh.transposed()).to_quaternion(); q3 = Quaternion().slerp(q, 1 / 3)
    for n in ('Spine', 'Spine1', 'Spine2'): gira(mx(n), q3)
    qk = (Rk @ Rc.transposed()).to_quaternion()
    ang = qk.angle if qk.angle <= math.pi else 2 * math.pi - qk.angle
    f = (0.6 if de_cara else 1.0) * min(1, math.radians(50 if not de_cara else 35) / max(ang, 1e-6))  # (con tope)
    q2 = Quaternion().slerp(qk, f / 2)
    for n in ('Neck', 'Head'): gira(mx(n), q2)
    for s, k in (('Left', 'L'), ('Right', 'R')):
        u = g('c' + k) - g('h' + k); f = g('m' + k) - g('c' + k)
        prevn['a' + k] = bisagra(mx(s + 'Arm'), mx(s + 'ForeArm'), mx(s + 'Hand'), u, f, FWD, prevn.get('a' + k), None)
        apunta(mx(s + 'ForeArm'), mx(s + 'Hand'), f)
        hand = mid(g('me' + k), g('i' + k)) - g('m' + k)
        # (la mano no tiene hijo en el esqueleto: su dirección de reposo, de la muñeca hacia los dedos, es la del antebrazo)
        Mh = P[mx(s + 'Hand')].matrix; Q = Mh.to_3x3() @ rest[mx(s + 'Hand')].to_3x3().inverted()
        d0 = (H0[mx(s + 'Hand')] - H0[mx(s + 'ForeArm')]).normalized()
        gira(mx(s + 'Hand'), Quaternion().slerp((Q @ d0).rotation_difference(hand.normalized()), 0.5))  # (la muñeca, firme)
        u = g('r' + k) - g('ca' + k); f = g('t' + k) - g('r' + k)
        prevn['p' + k] = bisagra(mx(s + 'UpLeg'), mx(s + 'Leg'), mx(s + 'Foot'), u, f, BACK, prevn.get('p' + k), None)
        apunta(mx(s + 'Leg'), mx(s + 'Foot'), f)
        apunta(mx(s + 'Foot'), mx(s + 'ToeBase'), g('p' + k) - g('t' + k))
    # los pies, al suelo: baja (o sube) la cadera para que el pie más bajo apoye
    suelo = min(min(cabeza(mx(s + 'Foot')).z - ankle0[s], cabeza(mx(s + 'ToeBase')).z - toe0[s]) for s in ('Left', 'Right'))
    M = P[mx('Hips')].matrix.copy(); M.translation = M.translation - Vector((0, 0, suelo)); P[mx('Hips')].matrix = M
    bpy.context.view_layer.update()
    for pb in P:
        pb.keyframe_insert('rotation_quaternion', frame=i + 1)
        if pb.name == mx('Hips'): pb.keyframe_insert('location', frame=i + 1)
sc.frame_start, sc.frame_end = 1, len(W)
print('animación hecha', len(W))
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True)
print('exportado', SAL)
if REN:
    os.makedirs(REN, exist_ok=True)
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = int(os.environ.get('MUESTRAS', '10')); sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = RW, RH
    wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True
    wd.node_tree.nodes['Background'].inputs[0].default_value = (0.10, 0.17, 0.16, 1); wd.node_tree.nodes['Background'].inputs[1].default_value = 0.7
    bpy.ops.mesh.primitive_plane_add(size=12); pl = bpy.context.object; m = bpy.data.materials.new('suelo'); m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.09, 0.10, 0.11, 1); pl.data.materials.append(m)
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(45), 0, math.radians(-25))); bpy.context.object.data.energy = 3.0
    bpy.ops.object.light_add(type='AREA', location=(-2, -2, 2.5)); bpy.context.object.data.energy = 150; bpy.context.object.data.size = 3
    # la cámara, como la del vídeo: delante (en -Y del esqueleto) mirando hacia +Y, un poco por encima de la cadera
    Mw = arm.matrix_world; alto = H0[mx('Head')].z
    dist = float(os.environ.get('DIST', '5.2'))
    obj = Mw @ Vector((0, 0, alto * 0.55)); camp = obj + Vector((0, -dist, 0.25))
    bpy.ops.object.camera_add(location=camp); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 50
    cam.rotation_euler = (obj - camp).to_track_quat('-Z', 'Y').to_euler()
    frs = [int(x) for x in os.environ['FR'].split(',')] if os.environ.get('FR') else range(1, len(W) + 1)
    for fr in frs:
        sc.frame_set(fr); sc.render.filepath = f'{REN}/{fr:04d}.png'; bpy.ops.render.render(write_still=True)
    print('render hecho', REN)
