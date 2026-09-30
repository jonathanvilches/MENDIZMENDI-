# MENDIMENDIZ · montaje de un personaje: escena, geometría, ropa, cara, manos, pelo, esqueleto, pesos,
# UV y horneado, materiales, acciones, exportación, validación, renders e informe.
import os, sys, math, json, time
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion
import mbz_core as C
import mbz_human as Hm
import mbz_face as F

V = Vector

def log(*a): print('[mbz]', *a, flush=True)

# ================================================================== lámina de referencia
def make_reference(d, out_dir):
    """Lámina de frente y de perfil con las medidas marcadas (alturas de la tabla de huesos)."""
    from PIL import Image, ImageDraw, ImageFont
    S = 700 / 1.8                      # píxeles por metro (lámina de 1,8 m de alto)
    W, Hpx = 700, 700
    marks = [(0.0, 'suelo'), (0.10, 'tobillo 0,10'), (0.30, 'rodilla 0,30'), (0.52, 'cadera 0,52'), (0.68, 'cintura 0,68'),
             (0.94, 'hombro 0,94'), (1.01, 'cuello 1,01'), (d['head_c'], f"centro cabeza {d['head_c']:.2f}"), (d['head_c'] + d['head_r'] * d['head_scale'][2], 'coronilla')]
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    except Exception: font = ImageFont.load_default()
    paths = []
    for view in ('front', 'side'):
        im = Image.new('RGBA', (W, Hpx), (250, 248, 240, 255)); g = ImageDraw.Draw(im)
        X = lambda x: W / 2 + x * S; Y = lambda z: Hpx - 20 - z * S
        for z, label in marks:
            g.line([(20, Y(z)), (W - 20, Y(z))], fill=(180, 190, 210), width=1); g.text((24, Y(z) - 15), label, fill=(60, 70, 100), font=font)
        rx, ry, rz = Hm.head_axes(d)
        hw = rx if view == 'front' else ry
        g.ellipse([X(-hw), Y(d['head_c'] + rz), X(hw), Y(d['head_c'] - rz)], outline=(40, 40, 60), width=2)
        for z, a, b, cy in d['torso']:
            w = a if view == 'front' else b
            g.line([(X(-w + (0 if view == 'front' else cy)), Y(z)), (X(w + (0 if view == 'front' else cy)), Y(z))], fill=(120, 60, 90), width=2)
        for s in ((1, -1) if view == 'front' else (1,)):
            lx = s * d['leg_x'] if view == 'front' else 0
            for z, r in d['leg']: g.line([(X(lx - r), Y(z)), (X(lx + r), Y(z))], fill=(90, 80, 60), width=2)
            if view == 'front':
                for (x, z), r in zip(d['arm_path'], d['arm_r']): g.ellipse([X(s * x - r), Y(z + r), X(s * x + r), Y(z - r)], outline=(90, 120, 90), width=1)
        g.text((W - 200, 20), f"{d['name']} · {'frente' if view == 'front' else 'perfil'}", fill=(20, 20, 30), font=font)
        p = os.path.join(out_dir, f"ref_{d['key']}_{view}.png"); im.save(p); paths.append(p)
    return paths

# ================================================================== geometría
# variantes intercambiables y las que se ven por defecto
SWITCHABLE = ('Eyelid_', 'Brow_', 'Mouth_', 'Hand_')
DEFAULT_VARIANTS = {'Eyelid_Open', 'Brow_Normal', 'Mouth_Neutral', 'Hand_L_Open', 'Hand_R_Open'}

def assign_mat(ob, mats):
    # materials.clear() pone todos los índices de material a 0: se guardan y se reponen
    idx = [0] * len(ob.data.polygons); ob.data.polygons.foreach_get('material_index', idx)
    ob.data.materials.clear()
    for m in mats: ob.data.materials.append(m)
    ob.data.polygons.foreach_set('material_index', [min(i, len(mats) - 1) for i in idx])

def boundary_loops(bm, pred=lambda v: True):
    """Bucles de borde (aristas con una sola cara) cuyos vértices cumplen pred, ordenados."""
    edges = [e for e in bm.edges if e.is_boundary and pred(e.verts[0]) and pred(e.verts[1])]
    adj = {}
    for e in edges:
        a, b = e.verts; adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    seen, loops = set(), []
    for start in adj:
        if start in seen: continue
        loop = [start]; seen.add(start); prev, cur = None, start
        while True:
            nx = [v for v in adj[cur] if v != prev and v not in seen]
            if not nx: break
            prev, cur = cur, nx[0]; loop.append(cur); seen.add(cur)
        loops.append(loop)
    return loops

def add_ring_band(bm, loop, fn):
    """Crea un anillo nuevo a partir de un bucle de borde (fn(v) → posición) y lo une con quads."""
    new = [bm.verts.new(fn(v)) for v in loop]
    for i in range(len(loop) - 1):
        bm.faces.new((loop[i], loop[i + 1], new[i + 1], new[i]))
    return new

def build_geometry(d, cols, mats):
    G = {}
    # ---------------- cabeza y pelo
    toy = d.get('head_style') == 'toy'
    hbm, info = Hm.build_toy_head(d) if toy else Hm.build_head(d)
    hair_bm = Hm.split_hair(d, hbm)
    Hm_mark = None
    asym = d.get('hair_style') == 'side'                  # peinado con raya: el pelo se hace entero, sin Mirror
    C.keep_half(hbm)
    if not asym: C.keep_half(hair_bm)
    C.clean_bm(hbm); C.clean_bm(hair_bm)
    head = C.obj_from_bm(hbm, 'Head', cols['GEO']); C.cage_mods(head); assign_mat(head, [mats['face']]); G['Head'] = head
    hair = C.obj_from_bm(hair_bm, 'Hair', cols['GEO'])
    if not asym: C.mod_mirror(hair); C.mod_subsurf(hair)
    C.mod_solidify(hair, 0.012, 1.0); C.mod_wnormal(hair); assign_mat(hair, [mats['face']]); G['Hair'] = hair
    G['info'] = info
    # mechones: curvas Bézier (Bevel 0,06, Resolution 4, Taper en gota, Tilt 20°) convertidas a malla
    taper = Hm.taper_object('Taper_Drop', [(0, 1.0), (0.55, 0.78), (1.0, 0.25)], cols['GEO'])
    tufts = []
    for i, (lo, la, dirv, length) in enumerate(d['tufts']):
        root = Hm.sph(d, lo, la, 0.01)
        dv = V(dirv).normalized()
        mid = root + dv * (length * 0.55) + V((0, 0, length * 0.12))
        tip = root + dv * length + V((0, 0, length * 0.05))
        cu = Hm.bezier_tube(f'Hair_Tuft_{i + 1}', [root - dv * 0.04, mid, tip], 0.06 * d.get('tuft_scale', 1.0), taper, cols['GEO'], tilt=math.radians(20))
        me_ob = Hm.curve_to_mesh(cu, f'Hair_Tuft_{i + 1}', cols['GEO'])
        bm = C.bm_from_obj(me_ob); C.poke_ngons(bm)
        # punta cerrada y redondeada
        far = [v for v in bm.verts if (v.co - root).length > length * 0.92]
        C.smooth_verts(bm, far, 0.5, 3)
        C.clean_bm(bm); bm.to_mesh(me_ob.data); bm.free()
        C.delete_obj(cu); C.mod_wnormal(me_ob); assign_mat(me_ob, [mats['face']])
        me_ob['tuft'] = i + 1; me_ob['root'] = list(root); me_ob['tip'] = list(tip)
        tufts.append(me_ob)
    C.delete_obj(taper)
    G['tufts'] = tufts
    # ---------------- cuerpo
    bbm, binfo = Hm.build_body(d)
    Hm.mark_seams(bbm)
    C.keep_half(bbm); C.clean_bm(bbm)
    body = C.obj_from_bm(bbm, 'Body', cols['GEO']); C.cage_mods(body); assign_mat(body, [mats['body']])
    bpy.context.view_layer.update()
    # ---------------- ropa (Shrinkwrap 0,006 + separación por capas, luego Solidify 0,01 y Bevel 0,012)
    ARM_J = V((0.175, 0.0, 0.90))
    def arm_x(f): return abs(f.calc_center_median().x)
    def shirt_test(f, zone):
        c = f.calc_center_median()
        return (f[zone] == 1 and c.z > 0.69) or (f[zone] == 4 and arm_x(f) < 0.435)
    def shorts_test(f, zone):
        c = f.calc_center_median()
        return (f[zone] == 1 and c.z < 0.735) or f[zone] == 5 or (f[zone] == 3 and c.z > 0.33)
    def vest_open(c):
        # escote en V que se abre hasta el ancho del cuello y sube recto hasta el hombro
        hw = min(0.072, 0.018 + max(0.0, c.z - 0.74) * 0.4)
        return c.y < 0 and abs(c.x) < hw and c.z > 0.74
    def vest_test(f, zone):
        # chaleco: del talle a los hombros (tirantes entre el cuello y la sisa), con sisas y escote
        c = f.calc_center_median()
        if f[zone] != 1 or c.z < 0.655: return False
        if vest_open(c): return False
        return (V((abs(c.x), c.y, c.z)) - ARM_J).length > 0.085
    def socks_test(f, zone):
        c = f.calc_center_median()
        return f[zone] == 3 and 0.075 < c.z < 0.275

    def roll(bm, pred, out, along):
        """Vuelta de tela en un borde (manga remangada, calcetín doblado): dos anillos hacia fuera."""
        for loop in boundary_loops(bm, pred):
            if len(loop) < 3: continue
            c = sum((v.co for v in loop), V()) / len(loop)
            def fn1(v): r = (v.co - c); r = r - along * r.dot(along); return v.co + r.normalized() * out + along * 0.006
            r1 = add_ring_band(bm, loop, fn1)
            def fn2(v, r1=r1, loop=loop): i = loop.index(v); return r1[i].co + along * -0.024
            add_ring_band(bm, r1, lambda v: v.co - along * 0.026)
    def shirt_shape(bm):
        # mangas remangadas justo por debajo del codo
        for s in (1,):
            E = V((0.42, 0, 0.80)); Wr = V((0.56, 0, 0.68)); along = (Wr - E).normalized()
            roll(bm, lambda v: abs(v.co.x) > 0.36, 0.016, -along)
        # cuello de la camisa: sube un poco y se abre
        for loop in boundary_loops(bm, lambda v: v.co.z > 0.965):
            add_ring_band(bm, loop, lambda v: v.co + V((v.co.x * 0.25, v.co.y * 0.25, 0.022)))
    def shorts_shape(bm):
        # bajo del pantalón con algo de vuelo
        for loop in boundary_loops(bm, lambda v: v.co.z < 0.36):
            c = sum((v.co for v in loop), V()) / len(loop)
            for v in loop: v.co = c + (v.co - c) * 1.1
    def socks_shape(bm):
        # vuelta del calcetín: el borde sube un poco y se abre, y la tela baja por fuera (sin doblez cerrado)
        for loop in boundary_loops(bm, lambda v: v.co.z > 0.25):
            c = sum((v.co for v in loop), V()) / len(loop)
            r1 = add_ring_band(bm, loop, lambda v: c + (v.co - c) * 1.12 + V((0, 0, 0.01)))
            add_ring_band(bm, r1, lambda v: c + (v.co - c) * 1.06 + V((0, 0, -0.022)))
    shirt = Hm.garment_from(body, 'Shirt', cols['GEO'], shirt_test, 0.006, shirt_shape)
    shorts = Hm.garment_from(body, 'Shorts', cols['GEO'], shorts_test, 0.02, shorts_shape)
    vest = Hm.garment_from(body, 'Vest', cols['GEO'], vest_test, 0.034)
    socks = Hm.garment_from(body, 'Socks', cols['GEO'], socks_test, 0.008, socks_shape)
    for g_ob, th in ((shirt, 0.01), (shorts, 0.01), (vest, 0.01), (socks, 0.01)):
        C.mark_rim_bevel(g_ob)
        C.mod_mirror(g_ob); C.mod_subsurf(g_ob); C.mod_solidify(g_ob, th, 1.0); C.mod_bevel(g_ob); C.mod_wnormal(g_ob)
        assign_mat(g_ob, [mats['body']])
    # camisa: se borran las caras que quedan del todo bajo el chaleco (delante solo asoma la abertura)
    bm = C.bm_from_obj(shirt)
    szone = bm.faces.layers.int.get('zone')
    kill = []
    for f in bm.faces:
        c = f.calc_center_median()
        covered = (szone is None or f[szone] == 1) and 0.675 < c.z < 0.945 and (V((abs(c.x), c.y, c.z)) - ARM_J).length > 0.1
        opening = c.y < 0 and abs(c.x) < min(0.1, 0.05 + max(0.0, c.z - 0.72) * 0.6) and c.z > 0.72
        if covered and not opening: kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context='FACES'); C.clean_bm(bm); bm.to_mesh(shirt.data); bm.free()
    # copia completa del cuerpo: de ella salen los pesos de la piel y de la ropa (así se doblan juntas)
    proxy = body.copy(); proxy.data = body.data.copy(); proxy.name = '_WeightProxy'; cols['GEO'].objects.link(proxy)
    G['_proxy'] = proxy
    # cuerpo: se borran las caras tapadas por la ropa (queda el cuello, los antebrazos y las rodillas)
    bm = C.bm_from_obj(body); zone = bm.faces.layers.int.get('zone')
    keep = lambda f: f[zone] == 2 or (f[zone] == 4 and arm_x(f) > 0.405) or (f[zone] == 3 and 0.24 < f.calc_center_median().z < 0.355)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f)], context='FACES'); C.clean_bm(bm); bm.to_mesh(body.data); bm.free()
    G.update(Body=body, Shirt=shirt, Shorts=shorts, Vest=vest, Socks=socks)
    # ---------------- botas
    boot = C.obj_from_bm(Hm.build_boot(d), 'Boots', cols['GEO'])
    C.mod_mirror(boot, clip=False); C.mod_subsurf(boot); C.mod_wnormal(boot); assign_mat(boot, [mats['body']])
    G['Boots'] = boot
    # ---------------- pañuelo (accesorio)
    G['Acc_Scarf'] = build_scarf(d, cols['ACC'], mats['body'])
    # ---------------- cara
    face = {}
    if toy:
        G['face'] = face = toy_face(d, cols, mats)
    for side, s in (() if toy else ((1, 'L'), (-1, 'R'))):
        ebm, frame = F.build_eye(d, side, info)
        eo = C.obj_from_bm(ebm, f'Eye_{s}', cols['FACE_VARIANTS']); assign_mat(eo, [mats['eyes']]); face[f'Eye_{s}'] = eo
        eo['frame'] = [list(frame[0]), list(frame[1]), list(frame[2])]
        io = C.obj_from_bm(F.build_iris(d, side, frame), f'Iris_{s}', cols['FACE_VARIANTS']); assign_mat(io, [mats['eyes']])
        C.mod_shrinkwrap(io, eo, offset=0.001, method='NEAREST_SURFACEPOINT'); face[f'Iris_{s}'] = io
        for nm, gbm in F.build_glints(d, side, frame).items():
            go = C.obj_from_bm(gbm, f'Glint_{s}_{nm}', cols['FACE_VARIANTS']); assign_mat(go, [mats['glint']])
            C.mod_shrinkwrap(go, eo, offset=0.002, method='NEAREST_SURFACEPOINT'); face[f'Glint_{s}_{nm}'] = go
        if side == 1: lframe = frame
    for kind, lat in (() if toy else (('Open', 45), ('Half', 0), ('Closed', -60))):
        lbm, rows = F.build_lid(d, 1, lframe, lat)
        lo = C.obj_from_bm(lbm, f'Eyelid_{kind}', cols['FACE_VARIANTS'])
        C.mod_mirror(lo, clip=False); C.mod_solidify(lo, 0.01, 1.0); C.mod_wnormal(lo); assign_mat(lo, [mats['face']])
        face[f'Eyelid_{kind}'] = lo
    btaper = None if toy else Hm.taper_object('Taper_Brow', [(0, 0.55), (0.5, 1.0), (1.0, 0.55)], cols['FACE_VARIANTS'])
    for kind in (() if toy else F.BROWS):
        cu = F.build_brow(d, kind, cols['FACE_VARIANTS'], btaper)
        bo = Hm.curve_to_mesh(cu, f'Brow_{kind}', cols['FACE_VARIANTS']); C.delete_obj(cu)
        bm = C.bm_from_obj(bo); C.poke_ngons(bm); C.clean_bm(bm); bm.to_mesh(bo.data); bm.free()
        C.mod_mirror(bo, clip=False); C.mod_wnormal(bo); assign_mat(bo, [mats['face']]); face[f'Brow_{kind}'] = bo
    if btaper: C.delete_obj(btaper)
    for kind in (() if toy else F.MOUTHS):
        mbm = F.build_mouth(d, kind, info['mouth_hole'])
        C.keep_half(mbm); C.clean_bm(mbm)
        mo = C.obj_from_bm(mbm, f'Mouth_{kind}', cols['FACE_VARIANTS']); C.cage_mods(mo); assign_mat(mo, [mats['face'], mats['eyes']])
        face[f'Mouth_{kind}'] = mo
    G['face'] = face
    # ---------------- manos
    hands = {}
    for side, s in ((1, 'L'), (-1, 'R')):
        for kind in (('open', 'fist') if side > 0 else ('open', 'fist', 'point')):
            nm = f"Hand_{s}_{kind.capitalize()}"
            ho = C.obj_from_bm(Hm.build_hand(d, side, kind), nm, cols['HAND_VARIANTS'])
            C.mod_subsurf(ho); C.mod_wnormal(ho); assign_mat(ho, [mats['body']]); hands[nm] = ho
    G['hands'] = hands
    for ob in bpy.data.objects:
        if ob.type == 'MESH': C.shade_smooth(ob)
    return G

def toy_face(d, cols, mats):
    """Cara de juguete: ojos de punto con brillo, párpados, cejas y bocas de trazo (piezas planas sobre la cabeza)."""
    face = {}
    V_ = cols['FACE_VARIANTS']
    for side, s in ((1, 'L'), (-1, 'R')):
        eo = C.obj_from_bm(F.toy_eye(d, side), f'Eye_{s}', V_); assign_mat(eo, [mats['eyes']]); face[f'Eye_{s}'] = eo
        for nm, gbm in F.toy_glints(d, side).items():
            go = C.obj_from_bm(gbm, f'Glint_{s}_{nm}', V_); assign_mat(go, [mats['glint']]); face[f'Glint_{s}_{nm}'] = go
    for kind in ('Open', 'Half', 'Closed'):
        lo = C.obj_from_bm(F.toy_lid(d, kind), f'Eyelid_{kind}', V_); assign_mat(lo, [mats['face'], mats['eyes']])
        face[f'Eyelid_{kind}'] = lo
    btaper = Hm.taper_object('Taper_Brow', [(0, 0.5), (0.5, 1.0), (1.0, 0.5)], V_)
    for kind in F.BROWS:
        cu = F.build_brow(d, kind, V_, btaper)
        bo = Hm.curve_to_mesh(cu, f'Brow_{kind}', V_); C.delete_obj(cu)
        bm = C.bm_from_obj(bo); C.poke_ngons(bm); C.clean_bm(bm); bm.to_mesh(bo.data); bm.free()
        C.mod_mirror(bo, clip=False); C.mod_wnormal(bo); assign_mat(bo, [mats['face']]); face[f'Brow_{kind}'] = bo
    C.delete_obj(btaper)
    for kind in F.MOUTHS:
        mo = C.obj_from_bm(F.build_mouth_decal(d, kind), f'Mouth_{kind}', V_); assign_mat(mo, [mats['face'], mats['eyes']])
        C.mod_wnormal(mo); face[f'Mouth_{kind}'] = mo
    return face

def build_scarf(d, coll, mat):
    """Pañuelo rojo al cuello: banda, nudo delante y dos puntas (huesos Scarf_01 y Scarf_02)."""
    bm = bmesh.new()
    nz, nr = 0.99, (0.112, 0.102)
    rings = []
    for z, k in ((0.952, 1.0), (0.982, 0.97), (1.008, 0.9)):
        rings.append([bm.verts.new(V((math.sin(a) * nr[0] * k, 0.006 - math.cos(a) * nr[1] * k, z - 0.012 * math.cos(a)))) for a in [i * math.tau / 16 for i in range(16)]])
    for a, b in zip(rings, rings[1:]): C.bridge(bm, a, b)
    # nudo: esfera pequeña delante
    kc = V((0.0, -0.112, 0.94)); rows = F.uv_sphere_grid(8, 5)
    vr = [[bm.verts.new(kc + V((q[0] * 0.03, q[1] * 0.024, q[2] * 0.026))) for q in row] for row in rows]
    tp = bm.verts.new(kc + V((0, 0, 0.026))); bt = bm.verts.new(kc + V((0, 0, -0.026)))
    for r1, r2 in zip(vr, vr[1:]):
        for j in range(8): bm.faces.new((r1[j], r1[(j + 1) % 8], r2[(j + 1) % 8], r2[j]))
    for j in range(8): bm.faces.new((tp, vr[0][(j + 1) % 8], vr[0][j])); bm.faces.new((bt, vr[-1][j], vr[-1][(j + 1) % 8]))
    # dos puntas que cuelgan del nudo, un poco abiertas
    for sx, ang in ((1, 0.28), (-1, -0.22)):
        prev = None
        for i in range(5):
            t = i / 4
            c = kc + V((sx * (0.012 + 0.03 * t) + math.sin(ang) * 0.02 * t, -0.006 - 0.02 * t, -0.02 - 0.1 * t))
            w = 0.028 * (1 - t) + 0.004
            cur = [bm.verts.new(c + V((-w, 0, 0))), bm.verts.new(c + V((w, 0, 0)))]
            if prev: bm.faces.new((prev[0], prev[1], cur[1], cur[0]))
            prev = cur
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ob = C.obj_from_bm(bm, 'Acc_Scarf', coll)
    C.mod_subsurf(ob); C.mod_solidify(ob, 0.008, 1.0); C.mod_wnormal(ob); assign_mat(ob, [mat])
    return ob

# ================================================================== materiales de trabajo (vista previa)
def preview_materials(d):
    cl = d['colors']
    lin = lambda c: tuple((x / 255) ** 2.2 for x in c) + (1,)
    mats = {
        'body': bpy.data.materials.new(f"MAT_{d['name']}_Body"), 'face': bpy.data.materials.new(f"MAT_{d['name']}_Face"),
        'eyes': bpy.data.materials.new('MAT_Eyes'), 'glint': bpy.data.materials.new('MAT_Glint'),
    }
    mats['body'].diffuse_color = lin(cl['vest']); mats['face'].diffuse_color = lin(cl['skin'])
    mats['eyes'].diffuse_color = (0.95, 0.95, 0.95, 1); mats['glint'].diffuse_color = (1, 1, 1, 1)
    return mats

def preview_render(d, out_dir, tag):
    """Render rápido en Workbench (frente, perfil y cara) para revisar formas."""
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'OBJECT'; sh.show_cavity = True
    sc.render.resolution_x, sc.render.resolution_y = 700, 900
    coll = bpy.data.collections.get('_PREVIEW') or bpy.data.collections.new('_PREVIEW')
    if coll.name not in sc.collection.children: sc.collection.children.link(coll)
    cam = bpy.data.objects.get('PrevCam') or C.camera(coll, 'PrevCam', 50)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.9; sc.camera = cam
    colors = {'Head': (0.94, 0.77, 0.63), 'Hair': (0.23, 0.14, 0.09), 'Body': (0.94, 0.77, 0.63), 'Shirt': (0.95, 0.93, 0.88),
              'Vest': (0.42, 0.16, 0.33), 'Shorts': (0.36, 0.31, 0.25), 'Socks': (0.92, 0.89, 0.81), 'Boots': (0.48, 0.3, 0.16), 'Acc_Scarf': (0.78, 0.13, 0.16)}
    for ob in bpy.data.objects:
        if ob.type != 'MESH': continue
        base = ob.name.split('.')[0]
        c = colors.get(base) or ((0.23, 0.14, 0.09) if base.startswith(('Hair', 'Brow')) else (0.94, 0.77, 0.63) if base.startswith(('Hand', 'Eyelid')) else (0.98, 0.98, 0.98) if base.startswith(('Eye_', 'Glint')) else (0.35, 0.22, 0.1) if base.startswith('Iris') else (0.8, 0.4, 0.4))
        ob.color = (*c, 1)
    for ob in bpy.data.objects:
        n = ob.name
        if n.startswith(SWITCHABLE): ob.hide_render = n not in DEFAULT_VARIANTS
    paths = []
    for name, yaw, tgt, scale in (('frente', 0, (0, 0, 0.84), 1.9), ('perfil', math.pi / 2, (0, 0, 0.84), 1.9), ('cara', 0.35, (0, 0, 1.26), 0.75),
                                  ('espalda', math.pi, (0, 0, 0.84), 1.9), ('pies', 0.6, (0, -0.05, 0.16), 0.55)):
        cam.data.ortho_scale = scale
        C.aim(cam, tgt, yaw, 6.0)
        p = os.path.join(out_dir, f'prev_{tag}_{name}.png'); C.render(p); paths.append(p)
    return paths

# ================================================================== esqueleto
MAIN_BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'] + [f'{s}{b}' for s in ('Left', 'Right') for b in ('Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase')]
FINGERS = ['HandThumb1', 'HandThumb2', 'HandIndex1', 'HandIndex2', 'HandFingers1', 'HandFingers2']
NON_DEFORM = ['HeadTop_End', 'Socket_Head', 'Socket_Hand_R', 'Socket_Back', 'Socket_Halo', 'Socket_Smoke']

def build_rig(d, cols, G):
    """Armature manual con la tabla de huesos; los del lado derecho salen de Symmetrize y se renombran sin sufijo."""
    arm_data = bpy.data.armatures.new(f"RIG_{d['name']}")
    arm = bpy.data.objects.new(f"RIG_{d['name']}", arm_data); cols['RIG'].objects.link(arm)
    arm_data.display_type = 'STICK'
    for o in bpy.context.view_layer.objects: o.select_set(False)
    arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones
    def B(name, h, t, parent=None, connect=False, deform=True):
        b = eb.new(name); b.head = V(h); b.tail = V(t); b.roll = 0.0
        if parent: b.parent = eb[parent]; b.use_connect = connect
        b.use_deform = deform
        return b
    s = d.get('rig_scale', 1.0)
    P = lambda x, y, z: (x * s, y * s, z * s)
    B('Hips', P(0, 0, 0.55), P(0, 0, 0.68))
    B('Spine', P(0, 0, 0.68), P(0, 0, 0.80), 'Hips', True)
    B('Spine1', P(0, 0, 0.80), P(0, 0, 0.90), 'Spine', True)
    B('Spine2', P(0, 0, 0.90), P(0, 0, 0.97), 'Spine1', True)
    B('Neck', P(0, 0, 0.97), P(0, 0, 1.01), 'Spine2', True)
    B('Head', P(0, 0, 1.01), P(0, 0, 1.58), 'Neck', True)
    B('HeadTop_End', P(0, 0, 1.58), P(0, 0, 1.64), 'Head', True, deform=False)
    B('Shoulder.L', P(0.05, 0, 0.94), P(0.20, 0, 0.94), 'Spine2')
    B('Arm.L', P(0.24, 0, 0.94), P(0.42, 0, 0.80), 'Shoulder.L')
    B('ForeArm.L', P(0.42, 0, 0.80), P(0.56, 0, 0.68), 'Arm.L', True)
    B('Hand.L', P(0.56, 0, 0.68), P(0.64, 0, 0.61), 'ForeArm.L', True)
    # dedos: pulgar, índice y los otros tres juntos, sobre la geometría de la mano
    o, L, W, N = Hm.hand_frame(d, 1)
    pl, pw, pt = d['palm']
    tb = o + L * (0.012 + pl * 0.25) + W * (pw / 2)
    tdir = (Quaternion(N, math.radians(35)) @ W).normalized()
    B('HandThumb1.L', tb, tb + tdir * 0.024, 'Hand.L'); B('HandThumb2.L', tb + tdir * 0.024, tb + tdir * 0.05, 'HandThumb1.L', True)
    ib = o + L * (0.012 + pl) + W * (pw * 0.375)
    fl = d['fingers']
    B('HandIndex1.L', ib, ib + L * fl[0] * 0.42, 'Hand.L'); B('HandIndex2.L', ib + L * fl[0] * 0.42, ib + L * fl[0], 'HandIndex1.L', True)
    fb = o + L * (0.012 + pl) - W * (pw * 0.125)
    B('HandFingers1.L', fb, fb + L * fl[1] * 0.42, 'Hand.L'); B('HandFingers2.L', fb + L * fl[1] * 0.42, fb + L * fl[1], 'HandFingers1.L', True)
    B('UpLeg.L', P(0.08, 0, 0.52), P(0.08, 0, 0.30), 'Hips')
    B('Leg.L', P(0.08, 0, 0.30), P(0.08, 0, 0.10), 'UpLeg.L', True)
    B('Foot.L', P(0.08, 0, 0.10), P(0.08, -0.12, 0.03), 'Leg.L', True)
    B('ToeBase.L', P(0.08, -0.12, 0.03), P(0.08, -0.19, 0.03), 'Foot.L', True)
    ec, en = G['info']['eyes'][1]
    ec = ec - en * 0.008
    B('Eye.L', ec, ec + V((0, -0.05, 0)), 'Head')
    B('Jaw', P(0, -0.04, 1.2), P(0, -0.2, 1.1), 'Head')
    for tuft in G['tufts']:
        i = tuft['tuft']; r, t = V(tuft['root']), V(tuft['tip'])
        B(f'Hair_0{i}', r, t, 'Head')
    kc = V((0.0, -0.112, 0.94))
    B('Scarf_01', kc, kc + V((0.012, -0.012, -0.05)), 'Spine2')
    B('Scarf_02', kc + V((0.012, -0.012, -0.05)), kc + V((0.024, -0.024, -0.1)), 'Scarf_01', True)
    B('Socket_Head', P(0, 0, 1.64), P(0, 0, 1.70), 'Head', deform=False)
    B('Socket_Back', P(0, 0.13, 0.86), P(0, 0.19, 0.86), 'Spine2', deform=False)
    if d.get('creature'):
        B('Socket_Halo', P(0, 0, 1.75), P(0, 0, 1.85), 'Head', deform=False); B('Socket_Smoke', P(0, 0, 0.3), P(0, 0, 0.4), 'Hips', deform=False)
    # Symmetrize (.L → .R)
    for b in eb: b.select = b.select_head = b.select_tail = b.name.endswith('.L')
    bpy.ops.armature.symmetrize(direction='POSITIVE_X')
    # la mano derecha lleva el socket
    hr = eb['Hand.R']; mid = (hr.head + hr.tail) / 2
    B('Socket_Hand_R', mid + V((0, 0, -0.02)), mid + V((0, 0, -0.07)), 'Hand.R', deform=False)
    # nombres finales sin sufijo
    for b in list(eb):
        n = b.name
        if n in ('Eye.L', 'Eye.R'): b.name = 'Eye_' + n[-1]
        elif n.endswith('.L'): b.name = 'Left' + n[:-2]
        elif n.endswith('.R'): b.name = 'Right' + n[:-2]
    bpy.ops.object.mode_set(mode='OBJECT')
    for b in arm_data.bones: b.use_deform = b.name not in NON_DEFORM
    return arm

def rig_and_weights(d, arm, G):
    all_deform = [b.name for b in arm.data.bones if b.name not in NON_DEFORM]
    body_bones = MAIN_BONES
    proxy = G.pop('_proxy')
    C.auto_weights(proxy, arm, body_bones, all_deform); fill_missing_weights(proxy, arm, body_bones)
    for name in ('Body', 'Shirt', 'Vest', 'Shorts', 'Socks'):
        transfer_weights(proxy, G[name], arm)
    C.delete_obj(proxy)
    C.auto_weights(G['Boots'], arm, body_bones, all_deform); fill_missing_weights(G['Boots'], arm, body_bones)
    C.auto_weights(G['Head'], arm, ['Neck', 'Head'], all_deform)
    fill_missing_weights(G['Head'], arm, ['Head'])
    # pelo: la masa va con la cabeza; cada mechón pasa de la cabeza a su hueso Hair_0x
    C.set_weights(G['Hair'], lambda co: {'Head': 1.0}); C.armature_mod(G['Hair'], arm)
    for t in G['tufts']:
        r, tip = V(t['root']), V(t['tip']); bn = f"Hair_0{t['tuft']}"
        def wf(co, r=r, tip=tip, bn=bn):
            k = max(0.0, min(1.0, (co - r).dot((tip - r).normalized()) / (tip - r).length))
            return {'Head': 1 - C.smooth01(k * 1.6), bn: C.smooth01(k * 1.6)}
        C.set_weights(t, wf); C.armature_mod(t, arm)
    # pañuelo: banda con el cuello, nudo con el pecho y las puntas con Scarf_01 y Scarf_02
    def scarf_w(co):
        if co.z > 0.95 and co.y > -0.09: return {'Neck': 0.5, 'Spine2': 0.5}
        k = max(0.0, min(1.0, (0.935 - co.z) / 0.1))
        if k <= 0: return {'Spine2': 1.0}
        if k < 0.5: return {'Spine2': 1 - k * 2, 'Scarf_01': k * 2}
        return {'Scarf_01': 2 - k * 2, 'Scarf_02': k * 2 - 1}
    C.set_weights(G['Acc_Scarf'], scarf_w); C.armature_mod(G['Acc_Scarf'], arm)
    for ob in [G['Hair'], G['Acc_Scarf']] + G['tufts']: C.weights_cleanup(ob)
    # variantes de cara y manos: Parent → Bone (sin pesos)
    for n, ob in G['face'].items():
        bone = 'Eye_L' if n.endswith(('_L', 'L_Big', 'L_Small')) and n.startswith(('Eye', 'Iris', 'Glint')) else 'Eye_R' if n.startswith(('Eye', 'Iris', 'Glint')) else 'Head'
        if d.get('head_style') == 'toy': bone = 'Head'          # ojos pintados: van con la cabeza (girarlos los despegaría)
        C.parent_to_bone(ob, arm, bone)
    for n, ob in G['hands'].items():
        C.parent_to_bone(ob, arm, 'LeftHand' if '_L_' in n else 'RightHand')

def transfer_weights(src, dst, arm):
    """Pesos del punto más cercano de la superficie de `src` (interpolados en su triángulo) → `dst`."""
    from mathutils.bvhtree import BVHTree
    from mathutils.interpolate import poly_3d_calc
    bm = bmesh.new(); bm.from_mesh(src.data); bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    tree = BVHTree.FromBMesh(bm)
    names = {g.index: g.name for g in src.vertex_groups}
    sw = [{names[g.group]: g.weight for g in v.groups} for v in src.data.vertices]
    for g in list(dst.vertex_groups): dst.vertex_groups.remove(g)
    out = {}
    for v in dst.data.vertices:
        loc, _n, fi, _d = tree.find_nearest(v.co)
        f = bm.faces[fi]
        acc = {}
        for u, k in zip(f.verts, poly_3d_calc([u.co for u in f.verts], loc)):
            for n, w in sw[u.index].items(): acc[n] = acc.get(n, 0.0) + w * k
        for n, w in acc.items():
            if w > 1e-4: out.setdefault(n, []).append((v.index, w))
    bm.free()
    # todos los grupos del origen, también los vacíos: el Mirror solo pasa Left→Right si el grupo Right existe
    for g in src.vertex_groups: dst.vertex_groups.new(name=g.name)
    for n, lst in out.items():
        g = dst.vertex_groups[n]
        for i, w in lst: g.add([i], w, 'REPLACE')
    C.weights_cleanup(dst); C.armature_mod(dst, arm)

def fill_missing_weights(ob, arm, bones):
    """Si el calor no llega a algún vértice, se le da el hueso más cercano (para que ninguno quede sin peso)."""
    segs = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in arm.data.bones if b.name in bones}
    names = {g.index: g.name for g in ob.vertex_groups}
    for v in ob.data.vertices:
        if any(g.weight > 1e-4 for g in v.groups): continue
        best, bd = None, 1e9
        for n, (h, t) in segs.items():
            ab = t - h; k = max(0.0, min(1.0, (v.co - h).dot(ab) / max(1e-9, ab.length_squared)))
            dd = (v.co - (h + ab * k)).length
            if dd < bd: best, bd = n, dd
        g = ob.vertex_groups.get(best) or ob.vertex_groups.new(name=best)
        g.add([v.index], 1.0, 'REPLACE')

# ================================================================== UV
def srgb2lin(c): return tuple(((x / 255) ** 2.2) for x in c)

def mark_angle_seams(ob, angle=66):
    bm = C.bm_from_obj(ob)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(angle): e.seam = True
    bm.to_mesh(ob.data); bm.free()

def tuft_seams(ob):
    """Costura a lo largo del mechón (una línea de vértices del perfil) y en las tapas."""
    bm = C.bm_from_obj(ob); bm.verts.ensure_lookup_table()
    prof = 12
    for e in bm.edges:
        a, b = e.verts
        if a.index % prof == 0 and b.index % prof == 0 and a.index < len(bm.verts) - 2: e.seam = True
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(60): e.seam = True
    bm.to_mesh(ob.data); bm.free()

def unwrap_diag(objs):
    bad = []
    for o in objs:
        for x in bpy.context.view_layer.objects: x.select_set(False)
        o.hide_set(False); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        import io, contextlib
        bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.005)
        bpy.ops.object.mode_set(mode='OBJECT')
        me = o.data; uv = me.uv_layers.active.data
        zero = sum(1 for p in me.polygons if all((uv[li].uv - uv[p.loop_indices[0]].uv).length < 1e-7 for li in p.loop_indices))
        if zero: bad.append((o.name, zero))
    return bad

def unwrap_pack(objs, margin=0.005):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs:
        o.hide_set(False); o.select_set(True)
        if not o.data.uv_layers: o.data.uv_layers.new(name='UVMap')
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')      # sin esto, las islas no seleccionadas en UV no se empaquetan y se solapan
    bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=margin)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')

def set_uv(ob, fn):
    """fn(face, loop) → (u, v) para cada esquina."""
    me = ob.data
    if not me.uv_layers: me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.active.data
    part = me.attributes.get('part')
    for p in me.polygons:
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = fn(p, co, part.data[p.index].value if part else 0)

EYES = {'white': (0.02, 0.52, 0.48, 0.98), 'iris': (0.52, 0.52, 0.98, 0.98), 'dark': (0.02, 0.02, 0.23, 0.23), 'tongue': (0.27, 0.02, 0.48, 0.23), 'teeth': (0.52, 0.02, 0.73, 0.23)}
# rincones de color plano (fuera de la zona empaquetada, que ocupa [0, 0.92]²)
LIPS = (0.935, 0.005, 0.995, 0.065)      # atlas de la cara: labios
BROWS = (0.935, 0.085, 0.995, 0.145)     # atlas de la cara: cejas
HANDS = (0.935, 0.005, 0.995, 0.065)     # atlas del cuerpo: manos

def box_uv(r, u, v): return (r[0] + (r[2] - r[0]) * u, r[1] + (r[3] - r[1]) * v)

def uv_all(d, G):
    # costuras: las de construcción (bajo los brazos, dentro de las piernas) + ángulo en las piezas cerradas
    for n in ('Boots',): mark_angle_seams(G[n], 60)
    mark_angle_seams(G['Acc_Scarf'], 70); mark_angle_seams(G['Head'], 80)
    for t in G['tufts']: tuft_seams(t)
    body_objs = [G[n] for n in ('Body', 'Shirt', 'Vest', 'Shorts', 'Socks', 'Boots', 'Acc_Scarf')]
    face_objs = [G['Head'], G['Hair']] + G['tufts'] + [o for n, o in G['face'].items() if n.startswith('Eyelid_')]
    unwrap_pack(body_objs); unwrap_pack(face_objs)
    # los atlas dejan libre una franja para los rincones de color plano
    for ob in face_objs + body_objs:
        for l in ob.data.uv_layers.active.data: l.uv = l.uv * 0.92
    # manos y cejas: proyección plana dentro de su rincón (color plano)
    def flat(region):
        def fn(p, co, part):
            return box_uv(region, 0.5 + 0.4 * math.sin(co.x * 37 + co.y * 11), 0.5 + 0.4 * math.sin(co.z * 29 + co.y * 17))
        return fn
    for ob in G['hands'].values(): set_uv(ob, flat(HANDS))
    for n, ob in G['face'].items():
        if n.startswith('Brow_'): set_uv(ob, flat(BROWS))
    # bocas: labios a su rincón del atlas de la cara; interior, lengua y dientes al atlas común de ojos y bocas
    mz, mw = d['mouth_z'], d['mouth_w']
    def mouth_uv(p, co, part):
        u = 0.5 + co.x / (mw * 1.6); v = 0.5 + (co.z - mz) / (mw * 1.6)
        if part == 0: return box_uv(LIPS, u, v)
        return box_uv(EYES[{1: 'dark', 2: 'tongue', 3: 'teeth'}[part]], 0.5, 0.5)
    for n, ob in G['face'].items():
        if n.startswith('Mouth_'): set_uv(ob, mouth_uv)
    if d.get('head_style') == 'toy':
        # ojos de punto: la pupila del atlas; párpados: la raya (material 1) también a la pupila
        pupil = box_uv(EYES['iris'], 0.5, 0.5)
        for s in ('L', 'R'):
            set_uv(G['face'][f'Eye_{s}'], lambda p, co, part: pupil)
            for nm in ('Big', 'Small'): set_uv(G['face'][f'Glint_{s}_{nm}'], lambda p, co, part: (0.99, 0.99))
        for n, ob in G['face'].items():
            if n.startswith('Eyelid_'):
                uv = ob.data.uv_layers.active.data
                for p in ob.data.polygons:
                    if p.material_index == 1:
                        for li in p.loop_indices: uv[li].uv = pupil
        return
    # ojos: blanco e iris con proyección de frente en su marco local
    for s in ('L', 'R'):
        eo = G['face'][f'Eye_{s}']; c = V(eo['frame'][0]); rot = Quaternion(eo['frame'][1]); ax, ay, az = eo['frame'][2]
        inv = rot.inverted()
        def white(p, co, part, c=c, inv=inv, ax=ax, az=az):
            q = inv @ (co - c); return box_uv(EYES['white'], 0.5 + q.x / ax * 0.5, 0.5 + q.z / az * 0.5)
        def iris(p, co, part, c=c, inv=inv, ax=ax, az=az):
            q = inv @ (co - c); return box_uv(EYES['iris'], 0.5 + q.x / (ax * 0.62) * 0.5, 0.5 + q.z / (az * 0.62) * 0.5)
        set_uv(eo, white); set_uv(G['face'][f'Iris_{s}'], iris)
        for nm in ('Big', 'Small'): set_uv(G['face'][f'Glint_{s}_{nm}'], lambda p, co, part: (0.99, 0.99))

# ================================================================== pintura y horneado
def paint(ob, fn):
    """Colores planos por cara (atributo de color de cara «PaintCol»)."""
    me = ob.data
    a = me.color_attributes.get('PaintCol') or me.color_attributes.new('PaintCol', 'FLOAT_COLOR', 'FACE')
    for p in me.polygons:
        c = fn(p)
        a.data[p.index].color = (*srgb2lin(c), 1.0)

def paint_all(d, G):
    cl = d['colors']
    paint(G['Body'], lambda p: cl['skin'])
    for ob in G['hands'].values(): paint(ob, lambda p: cl['skin'])
    paint(G['Shirt'], lambda p: cl['shirt'])
    paint(G['Vest'], lambda p: cl['vest'])
    paint(G['Shorts'], lambda p: tuple(int(x * 0.82) for x in cl['shorts']) if p.center.z > 0.69 else cl['shorts'])
    paint(G['Socks'], lambda p: cl['socks'])
    paint(G['Boots'], lambda p: cl['sole'] if (p.center.z < 0.02 and p.normal.z < -0.5) else cl['boots'])
    paint(G['Acc_Scarf'], lambda p: cl['scarf'])
    paint(G['Head'], lambda p: cl['skin'])
    for ob in [G['Hair']] + G['tufts']: paint(ob, lambda p: cl['hair'])
    for n, ob in G['face'].items():
        if n.startswith('Brow_'): paint(ob, lambda p: cl['brow'])
        elif n.startswith('Eyelid_') and d.get('head_style') == 'toy': paint(ob, lambda p: cl['skin'])
        elif n.startswith('Eyelid_'):
            zs = [v.co.z for v in ob.data.vertices]; zmin = min(zs)
            paint(ob, lambda p, zmin=zmin: (70, 40, 30) if p.center.z < zmin + 0.012 else cl['skin'])
        elif n.startswith('Mouth_'): paint(ob, lambda p: cl['lips'])

def solid_mods(on):
    for ob in bpy.data.objects:
        for m in getattr(ob, 'modifiers', []):
            if m.type in ('SOLIDIFY', 'BEVEL'): m.show_render = on

def bake_setup(mat, target, extra=None):
    """Árbol de trabajo para hornear: Principled con el color pintado (+ extras) y la imagen destino activa."""
    mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    col = nt.nodes.new('ShaderNodeAttribute'); col.attribute_type = 'GEOMETRY'; col.attribute_name = 'PaintCol'
    sock = col.outputs['Color']
    if extra: sock = extra(nt, sock)
    nt.links.new(sock, bsdf.inputs['Base Color'])
    tgt = nt.nodes.new('ShaderNodeTexImage'); tgt.image = target; nt.nodes.active = tgt; tgt.select = True
    return nt

def mul_color(nt, a, b):
    m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = 'MULTIPLY'; m.inputs['Factor'].default_value = 1.0
    nt.links.new(a, m.inputs[6]); nt.links.new(b, m.inputs[7]); return m.outputs[2]

def mix_color(nt, a, color, fac):
    m = nt.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = 'MIX'
    nt.links.new(fac, m.inputs['Factor']); nt.links.new(a, m.inputs[6]); m.inputs[7].default_value = (*color, 1)
    return m.outputs[2]

def color_extras(d, ao_img, zlo, zhi, blush=None, dots=None):
    """Oclusión al 20 %, degradado de ±6 % (claro arriba, oscuro abajo), rubor y puntos pintados (botones)."""
    def fn(nt, sock):
        geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = zlo; mr.inputs['From Max'].default_value = zhi
        mr.inputs['To Min'].default_value = 0.94; mr.inputs['To Max'].default_value = 1.06; nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
        grad = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(mr.outputs['Result'], grad.inputs[i]) for i in range(3)]
        sock = mul_color(nt, sock, grad.outputs[0])
        ao = nt.nodes.new('ShaderNodeTexImage'); ao.image = ao_img
        mf = nt.nodes.new('ShaderNodeMapRange'); mf.inputs['To Min'].default_value = 0.8; mf.inputs['To Max'].default_value = 1.0
        bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(ao.outputs['Color'], bw.inputs[0]); nt.links.new(bw.outputs[0], mf.inputs['Value'])
        aoc = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(mf.outputs['Result'], aoc.inputs[i]) for i in range(3)]
        sock = mul_color(nt, sock, aoc.outputs[0])
        if blush:
            for p in blush['pts']:
                dist = nt.nodes.new('ShaderNodeVectorMath'); dist.operation = 'DISTANCE'; dist.inputs[1].default_value = p
                nt.links.new(geo.outputs['Position'], dist.inputs[0])
                f = nt.nodes.new('ShaderNodeMapRange'); f.inputs['From Min'].default_value = 0.0; f.inputs['From Max'].default_value = blush['r']
                f.inputs['To Min'].default_value = blush['k']; f.inputs['To Max'].default_value = 0.0; f.interpolation_type = 'SMOOTHSTEP'
                nt.links.new(dist.outputs['Value'], f.inputs['Value'])
                sock = mix_color(nt, sock, srgb2lin(blush['color']), f.outputs['Result'])
        if dots:
            for p in dots['pts']:
                dist = nt.nodes.new('ShaderNodeVectorMath'); dist.operation = 'DISTANCE'; dist.inputs[1].default_value = p
                nt.links.new(geo.outputs['Position'], dist.inputs[0])
                f = nt.nodes.new('ShaderNodeMapRange'); f.inputs['From Min'].default_value = dots['r'] * 0.8; f.inputs['From Max'].default_value = dots['r']
                f.inputs['To Min'].default_value = 1.0; f.inputs['To Max'].default_value = 0.0
                nt.links.new(dist.outputs['Value'], f.inputs['Value'])
                sock = mix_color(nt, sock, srgb2lin(dots['color']), f.outputs['Result'])
        return sock
    return fn

def bake_image(name, size, path, non_color=False):
    img = bpy.data.images.new(name, size, size, alpha=True)
    img.generated_color = (0, 0, 0, 0)
    img.filepath_raw = path; img.file_format = 'PNG'
    img.colorspace_settings.name = 'Non-Color' if non_color else 'sRGB'
    return img

def png_rgb(path):
    from PIL import Image
    Image.open(path).convert('RGB').save(path, optimize=True, compress_level=9)

def dilate(img, px, fill=None):
    """Margen de `px` píxeles: extiende cada isla hacia los píxeles vacíos (alfa 0) sin pisar otras islas.
    (Blender hornea los objetos uno a uno y su margen invadía las islas vecinas.)"""
    import numpy as np
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(a); a = a.reshape(h, w, 4)
    rgb, al = a[..., :3], a[..., 3] > 0.5
    for _ in range(px):
        acc = np.zeros_like(rgb); cnt = np.zeros((h, w), np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(al, dy, 0), dx, 1); sc = np.roll(np.roll(rgb, dy, 0), dx, 1)
            acc += sc * sh[..., None]; cnt += sh
        grow = (~al) & (cnt > 0)
        rgb[grow] = acc[grow] / cnt[grow][:, None]; al = al | grow
    if fill is not None: rgb[~al] = fill
    out = np.concatenate([rgb, np.ones((h, w, 1), np.float32)], axis=2)
    img.pixels.foreach_set(out.ravel()); img.update()

def select_only(objs):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def bake_atlases(d, G, mats, tex_dir):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    if not sc.world: sc.world = bpy.data.worlds.new('World')
    sc.world.light_settings.distance = 0.1                   # distancia de la oclusión ambiental
    sc.render.bake.margin = 16
    name = d['name']
    variants = [o for n, o in G['face'].items()] + list(G['hands'].values())
    body_main = [G[n] for n in ('Body', 'Shirt', 'Vest', 'Shorts', 'Socks', 'Boots', 'Acc_Scarf')]
    face_main = [G['Head'], G['Hair']] + G['tufts']
    body_all = body_main + list(G['hands'].values())
    face_all = face_main + [o for n, o in G['face'].items() if n.startswith(('Brow_', 'Eyelid_', 'Mouth_'))]
    eyes_dummy = bpy.data.images.new('_descarte', 16, 16)
    imgs = {}
    solid_mods(False)
    for key, main, allo, size, zr, extras in (
        ('Body', body_main, body_all, 1024, (0.0, 1.05), dict(dots={'pts': [(0.034, -0.162, z) for z in (0.69, 0.735, 0.78)], 'r': 0.0095, 'color': d['colors']['button']})),
        ('Face', face_main, face_all, 512, (0.98, 1.68), dict(blush={'pts': [tuple(Hm.sph(d, s * d.get('blush_ll', (38, -18))[0], d.get('blush_ll', (38, -18))[1])) for s in (1, -1)], 'r': 0.06, 'k': 0.45, 'color': d['colors']['blush']})),
    ):
        mat = mats['body' if key == 'Body' else 'face']
        ao = bake_image(f'AO_{name}_{key}', size, os.path.join(tex_dir, f'AO_{name}_{key}.png'), non_color=True)
        col = bake_image(f'T_{name}_{key}', size, os.path.join(tex_dir, f'T_{name}_{key}.png'))
        # 1) oclusión ambiental (Cycles, 128 muestras, distancia 0,1, margen 16) de las piezas principales; las variantes
        #    por defecto (boca, párpado, cejas, ojos, manos) tapan los huecos y hacen de oclusores: sin ellas, los rayos
        #    entraban por el hueco de la boca y oscurecían su contorno
        for v in variants: v.hide_render = v.name.startswith(SWITCHABLE) and v.name not in DEFAULT_VARIANTS
        bake_setup(mat, ao)
        if key == 'Face': bake_setup(mats['eyes'], eyes_dummy)
        sc.cycles.samples = 128
        select_only(main)
        bpy.ops.object.bake(type='AO', margin=0, use_clear=True)
        dilate(ao, 16, fill=(1, 1, 1))
        for v in variants: v.hide_render = False
        # 2) color final: planos × oclusión al 20 % × degradado ± 6 % (+ rubor / botones) → Bake Diffuse, solo Color
        bake_setup(mat, col, color_extras(d, ao, *zr, **extras))
        sc.cycles.samples = 4
        select_only(allo)
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, margin=0, use_clear=True)
        dilate(col, 16)
        col.save(); ao.save()
        png_rgb(col.filepath_raw); col.reload()             # PNG de 8 bits RGB (sin alfa) y comprimido: el GLB incrusta este archivo
        imgs[key] = col
    solid_mods(True)
    bpy.data.images.remove(eyes_dummy)
    return imgs

def paint_eyes_atlas(d, path):
    """Atlas común de ojos y bocas (256): blanco del ojo, iris con pupila, interior de la boca, lengua y dientes."""
    from PIL import Image, ImageDraw
    S = 256; im = Image.new('RGB', (S, S), (200, 60, 70)); g = ImageDraw.Draw(im)
    R = lambda r: (int(r[0] * S), int((1 - r[3]) * S), int(r[2] * S), int((1 - r[1]) * S))
    x0, y0, x1, y1 = R(EYES['white'])
    for i in range(y1 - y0):   # blanco con una sombra suave arriba (el párpado)
        k = i / (y1 - y0); c = int(236 + 16 * min(1, k * 2.2)); g.line([(x0, y0 + i), (x1, y0 + i)], fill=(c, c, min(255, c + 2)))
    x0, y0, x1, y1 = R(EYES['iris']); cx, cy, r = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2
    g.rectangle([x0, y0, x1, y1], fill=(245, 245, 245))
    ir, dk = d['colors']['iris'], d['colors']['iris_dark']
    for k in range(int(r), 0, -1):
        t = k / r
        c = tuple(int(dk[i] + (ir[i] - dk[i]) * (1 - abs(t - 0.55) / 0.55)) for i in range(3)) if t > 0.9 else tuple(int(ir[i] * (0.8 + 0.35 * (1 - t))) for i in range(3))
        g.ellipse([cx - k, cy - k, cx + k, cy + k], fill=c)
    g.ellipse([cx - r * 0.42, cy - r * 0.42, cx + r * 0.42, cy + r * 0.42], fill=(18, 12, 10))
    g.rectangle(R(EYES['dark']), fill=(78, 22, 28)); g.rectangle(R(EYES['tongue']), fill=(224, 108, 116)); g.rectangle(R(EYES['teeth']), fill=(250, 248, 240))
    im.save(path)
    img = bpy.data.images.load(path); img.colorspace_settings.name = 'sRGB'
    return img

def final_materials(d, mats, imgs, eyes_img):
    for key, mat, img in (('body', mats['body'], imgs['Body']), ('face', mats['face'], imgs['Face']), ('eyes', mats['eyes'], eyes_img)):
        mat.use_nodes = True
        nt = mat.node_tree; nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = d['rough'][key]; bsdf.inputs['Metallic'].default_value = 0.0
        bsdf.inputs['Specular IOR Level'].default_value = 0.5
    g = mats['glint']; g.use_nodes = True; nt = g.node_tree; bs = nt.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (1, 1, 1, 1); bs.inputs['Emission Color'].default_value = (1, 1, 1, 1); bs.inputs['Emission Strength'].default_value = 1.5
    bs.inputs['Roughness'].default_value = 0.2

# ================================================================== acciones
def build_actions(d, arm, out_dir):
    import mbz_anim as A
    poser = C.Poser(arm)
    faces = {}
    for name, frames, fn, loop, face in A.clips():
        C.make_action(poser, name, frames, fn, loop=loop, step=2, props=face)
        faces[name] = face
    with open(os.path.join(out_dir, f"{d['file']}.faces.json"), 'w', encoding='utf-8') as f: json.dump(faces, f, ensure_ascii=False, indent=1)
    return faces

# ================================================================== variantes y limpieza
GROUPS = {'Mouth_': ('mouth', 'Mouth_Neutral'), 'Brow_': ('brow', 'Brow_Normal'), 'Eyelid_': ('lid', 'Eyelid_Open'),
          'Hand_L_': ('hand_L', 'Hand_L_Open'), 'Hand_R_': ('hand_R', 'Hand_R_Open')}
def tag_variants(G):
    for ob in list(G['face'].values()) + list(G['hands'].values()):
        for pre, (grp, default) in GROUPS.items():
            if ob.name.startswith(pre):
                ob['group'] = grp; ob['default'] = ob.name == default
                ob.hide_viewport = False; ob.hide_set(ob.name != default); ob.hide_render = ob.name != default

def cleanup_checks(objs):
    """Merge by Distance 0,0001, Recalculate Outside, sin n-gons, sin vértices sueltos; devuelve un resumen."""
    rep = {}
    for ob in objs:
        bm = C.bm_from_obj(ob)
        n0 = len(bm.verts)
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0001)
        loose = [v for v in bm.verts if not v.link_faces]
        if loose: bmesh.ops.delete(bm, geom=loose, context='VERTS')
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        ngons = sum(1 for f in bm.faces if len(f.verts) > 4)
        bm.to_mesh(ob.data); bm.free()
        rep[ob.name] = {'fusionados': n0 - len(ob.data.vertices), 'sueltos': len(loose), 'ngons': ngons}
    return rep

# ================================================================== exportación
def export_character(d, arm, G, glb_path, lod=False):
    """lod=True: la misma pieza sin Subdivision ni Bevel (nivel de la cage), para lejos o móviles modestos."""
    skip = ('SUBSURF', 'BEVEL') if lod else ()
    toggled = []
    if lod:
        for ob in bpy.data.objects:
            for m in getattr(ob, 'modifiers', []):
                if m.type in skip and m.show_viewport: m.show_viewport = False; toggled.append(m)
    tmp = bpy.data.collections.new('_EXPORT'); bpy.context.scene.collection.children.link(tmp)
    body = C.export_copy([G[n] for n in ('Body', 'Shirt', 'Vest', 'Shorts', 'Socks', 'Boots')], 'Body', tmp, arm, skip)
    head = C.export_copy([G['Head']], 'Head', tmp, arm, skip)
    hair = C.export_copy([G['Hair']] + G['tufts'], 'Hair', tmp, arm, skip)
    scarf = C.export_copy([G['Acc_Scarf']], 'Acc_Scarf', tmp, arm, skip)
    scarf['group'] = 'acc'; scarf['default'] = True
    variants = list(G['face'].values()) + list(G['hands'].values())
    for v in variants: v.hide_set(False); v.hide_viewport = False; v.hide_render = False
    # los originales se renombran un momento para que los nombres de las copias queden exactos
    originals = [G[n] for n in ('Body', 'Head', 'Hair', 'Acc_Scarf')]
    for o in originals: o.name = '_orig_' + o.name
    for c, n in ((body, 'Body'), (head, 'Head'), (hair, 'Hair'), (scarf, 'Acc_Scarf')): c.name = n; c.data.name = n
    C.export_glb(glb_path, [arm, body, head, hair, scarf] + variants)
    for c in (body, head, hair, scarf): C.delete_obj(c)
    for o, n in zip(originals, ('Body', 'Head', 'Hair', 'Acc_Scarf')): o.name = n
    bpy.data.collections.remove(tmp)
    for m in toggled: m.show_viewport = True
    tag_variants(G)

def reimport_check(glb_path):
    """Importa el GLB en un Blender nuevo (otro proceso) y comprueba escala, orientación, animaciones y variantes."""
    import subprocess
    code = f"""
import bpy, json
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath={glb_path!r})
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
dg = bpy.context.evaluated_depsgraph_get()
zs, ys = [], []
for o in meshes:
    if not o.name.startswith(('Body', 'Head', 'Hair')): continue
    ev = o.evaluated_get(dg).to_mesh()
    for v in ev.vertices:
        w = o.matrix_world @ v.co; zs.append(w.z); ys.append(w.y)
nose = min(ys)
print('REIMPORT', json.dumps({{'altura_m': round(max(zs) - min(zs), 3), 'pies_z': round(min(zs), 3), 'mira_a_-Y': nose < -0.2,
  'acciones': sorted(a.name for a in bpy.data.actions), 'mallas': len(meshes), 'huesos': len(arm.data.bones),
  'variantes': sorted(o.name for o in meshes if o.name.startswith(('Mouth_', 'Brow_', 'Eyelid_', 'Hand_')))}}))
"""
    exe = sys.executable
    cmd = [exe, '-b', '--python-expr', code] if 'blender' in os.path.basename(exe).lower() else [exe, '-c', code]
    r = subprocess.run(cmd, capture_output=True, text=True)
    for line in r.stdout.splitlines():
        if line.startswith('REIMPORT '): return json.loads(line[9:])
    return {'error': (r.stderr or r.stdout)[-800:]}

# ================================================================== renders (Eevee)
def render_setup():
    sc = C.setup_render(res=(900, 1200), samples=24)
    coll = bpy.data.collections.get('_RENDER') or bpy.data.collections.new('_RENDER')
    if coll.name not in sc.collection.children: sc.collection.children.link(coll)
    if not bpy.data.objects.get('Key'): C.add_lights(coll)
    cam = bpy.data.objects.get('Cam') or C.camera(coll, 'Cam', 85)
    floor = bpy.data.objects.get('_Suelo')
    if not floor:
        me = bpy.data.meshes.new('_Suelo'); bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, radius=2.5, segments=48); bm.to_mesh(me); bm.free()
        floor = bpy.data.objects.new('_Suelo', me); coll.objects.link(floor)
        m = bpy.data.materials.new('_Suelo'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.62, 0.5, 1); me.materials.append(m)
    return sc, cam, coll

def render_views(d, out_dir):
    sc, cam, coll = render_setup(); H = d.get('height', 1.64)
    paths = {}
    for name, yaw, tgt, dist, h in (('frente', 0.0, (0, 0, H * 0.5), 5.2, H * 0.55), ('perfil', math.pi / 2, (0, 0, H * 0.5), 5.2, H * 0.55),
                                     ('tres_cuartos', 0.62, (0, 0, H * 0.5), 5.2, H * 0.6), ('espalda', math.pi, (0, 0, H * 0.5), 5.2, H * 0.55)):
        sc.render.resolution_x, sc.render.resolution_y = 900, 1200
        C.aim(cam, tgt, yaw, dist, h); p = os.path.join(out_dir, f'{name}.png'); C.render(p); paths[name] = p; log('render', name)
    sc.render.resolution_x, sc.render.resolution_y = 900, 900
    C.aim(cam, (0, 0, d['head_c'] - 0.02), 0.28, 2.0, d['head_c'] + 0.02); p = os.path.join(out_dir, 'cara.png'); C.render(p); paths['cara'] = p
    return paths

def show_variant(G, group_prefix, name):
    for n, ob in list(G['face'].items()) + list(G['hands'].items()):
        if n.startswith(group_prefix): ob.hide_render = n != name

def render_expressions(d, G, out_dir):
    """Hoja de expresiones: las 8 bocas, las 5 cejas y los 3 párpados, con la cara de frente."""
    from PIL import Image, ImageDraw, ImageFont
    sc, cam, coll = render_setup()
    sc.render.resolution_x = sc.render.resolution_y = 360; sc.eevee.taa_render_samples = 16
    C.aim(cam, (0, 0, d['head_c'] - 0.03), 0.0, 2.2, d['head_c'] - 0.01)
    import mbz_face as F
    combos = [(f'Mouth_{m}', 'Brow_Normal', 'Eyelid_Open', m) for m in F.MOUTHS] + [('Mouth_Neutral', f'Brow_{b}', 'Eyelid_Open', 'Cejas ' + b) for b in F.BROWS] + \
             [('Mouth_Neutral', 'Brow_Normal', f'Eyelid_{l}', 'Párpado ' + l) for l in ('Open', 'Half', 'Closed')]
    tiles = []
    for mouth, brow, lid, label in combos:
        show_variant(G, 'Mouth_', mouth); show_variant(G, 'Brow_', brow); show_variant(G, 'Eyelid_', lid)
        p = os.path.join(out_dir, '_expr.png'); C.render(p); tiles.append((Image.open(p).convert('RGB').copy(), label))
    show_variant(G, 'Mouth_', 'Mouth_Neutral'); show_variant(G, 'Brow_', 'Brow_Normal'); show_variant(G, 'Eyelid_', 'Eyelid_Open')
    cols = 4; rows = (len(tiles) + cols - 1) // cols; S = 360
    sheet = Image.new('RGB', (cols * S, rows * (S + 34)), (250, 248, 240)); g = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
    except Exception: font = ImageFont.load_default()
    for i, (im, label) in enumerate(tiles):
        x, y = (i % cols) * S, (i // cols) * (S + 34)
        sheet.paste(im, (x, y)); g.text((x + 12, y + S + 6), label, fill=(40, 30, 60), font=font)
    p = os.path.join(out_dir, 'hoja_expresiones.png'); sheet.save(p); os.remove(os.path.join(out_dir, '_expr.png'))
    return p

def render_wireframes(d, G, out_dir):
    """Wireframe de frente y de perfil: la cage (con el Mirror aplicado, sin subdivisión) sobre el modelo."""
    sc, cam, coll = render_setup(); H = d.get('height', 1.64)
    wire_mat = bpy.data.materials.get('_Wire') or bpy.data.materials.new('_Wire')
    wire_mat.use_nodes = True; bs = wire_mat.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (0.02, 0.02, 0.05, 1); bs.inputs['Emission Color'].default_value = (0.02, 0.02, 0.06, 1); bs.inputs['Emission Strength'].default_value = 1.0
    wires = []
    srcs = [G[n] for n in ('Head', 'Hair', 'Body', 'Shirt', 'Vest', 'Shorts', 'Socks', 'Boots', 'Acc_Scarf')] + G['tufts'] + [G['hands']['Hand_L_Open'], G['hands']['Hand_R_Open']]
    for ob in srcs:
        c = ob.copy(); c.data = ob.data.copy(); c.parent = None; coll.objects.link(c)
        c.matrix_world = ob.matrix_world
        for m in list(c.modifiers):
            if m.type != 'MIRROR': c.modifiers.remove(m)
        w = c.modifiers.new('Wire', 'WIREFRAME'); w.thickness = 0.0016; w.use_replace = True; w.use_even_offset = True
        c.data.materials.clear(); c.data.materials.append(wire_mat)
        if ob.parent_type == 'BONE' and ob.parent: c.matrix_world = ob.matrix_world
        wires.append(c)
    paths = []
    for name, yaw in (('wireframe_frente', 0.0), ('wireframe_perfil', math.pi / 2)):
        sc.render.resolution_x, sc.render.resolution_y = 1000, 1300
        C.aim(cam, (0, 0, H * 0.5), yaw, 5.0, H * 0.55); p = os.path.join(out_dir, f'{name}.png'); C.render(p); paths.append(p)
    for c in wires: C.delete_obj(c)
    return paths

def render_test_poses(d, arm, out_dir):
    import mbz_anim as A
    sc, cam, coll = render_setup(); H = d.get('height', 1.64)
    poser = C.Poser(arm); paths = []
    for name, fn in A.test_poses():
        poser.apply(fn({})); bpy.context.view_layer.update()
        sc.render.resolution_x, sc.render.resolution_y = 800, 1000
        C.aim(cam, (0, 0, H * 0.45), 0.6, 5.0, H * 0.55); p = os.path.join(out_dir, f'pose_{name}.png'); C.render(p); paths.append(p)
    poser.rest(); bpy.context.view_layer.update()
    return paths

# ================================================================== informe
def tri_count(ob):
    dg = bpy.context.evaluated_depsgraph_get(); me = ob.evaluated_get(dg).to_mesh(); me.calc_loop_triangles()
    n = len(me.loop_triangles); ob.evaluated_get(dg).to_mesh_clear(); return n

def cage_quads(ob):
    n = sum(1 for p in ob.data.polygons)
    return n * (2 if any(m.type == 'MIRROR' for m in ob.modifiers) else 1)

# ================================================================== principal
def build_character(d, root, solo_geo=False, renders=True):
    t0 = time.time()
    out = os.path.join(root, 'entrega', 'personajes', d['key']); tex = os.path.join(out, 'texturas'); rdir = os.path.join(out, 'renders')
    for sub in (out, tex, rdir): os.makedirs(sub, exist_ok=True)
    cols = C.new_scene(d['name'])
    refs = make_reference(d, out)
    C.ref_image(refs[0], 'REF_Frente', cols['REF'], 1.8, (0, 0.8, 0), (math.pi / 2, 0, 0))
    C.ref_image(refs[1], 'REF_Perfil', cols['REF'], 1.8, (-0.8, 0, 0), (math.pi / 2, 0, math.pi / 2))
    mats = preview_materials(d)
    G = build_geometry(d, cols, mats)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('_')]
    clean = cleanup_checks(meshes)
    log('geometría', f'{time.time() - t0:.1f} s')
    if solo_geo:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, f"{d['file']}_geo.blend"))
        if renders: log('vista previa', preview_render(d, rdir, 'geo'))
        return G
    arm = build_rig(d, cols, G); rig_and_weights(d, arm, G); log('esqueleto y pesos', f'{time.time() - t0:.1f} s')
    uv_all(d, G); paint_all(d, G); log('UV', f'{time.time() - t0:.1f} s')
    imgs = bake_atlases(d, G, mats, tex)
    eyes_img = paint_eyes_atlas(d, os.path.join(tex, 'T_Eyes.png'))
    final_materials(d, mats, imgs, eyes_img); log('texturas', f'{time.time() - t0:.1f} s')
    for ob in meshes:
        a = ob.data.color_attributes.get('PaintCol')
        if a: ob.data.color_attributes.remove(a)
    faces = build_actions(d, arm, out); log('acciones', f'{time.time() - t0:.1f} s')
    tag_variants(G)
    # escena limpia: sin cámaras ni objetos auxiliares; rutas relativas
    for c in ('_PREVIEW', '_RENDER'):
        col = bpy.data.collections.get(c)
        if col:
            for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.collections.remove(col)
    blend = os.path.join(out, f"{d['file']}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, relative_remap=True)
    bpy.ops.file.make_paths_relative(); bpy.ops.wm.save_mainfile()
    glb = os.path.join(out, f"{d['file']}.glb")
    export_character(d, arm, G, glb)
    glb_lod = os.path.join(out, f"{d['file']}_lod.glb"); export_character(d, arm, G, glb_lod, lod=True)
    import shutil
    shutil.copy(glb_lod, os.path.join(root, 'src', 'assets', 'chars', f"{d['file']}_lod.glb"))
    game_glb = os.path.join(root, 'src', 'assets', 'chars', f"{d['file']}.glb"); os.makedirs(os.path.dirname(game_glb), exist_ok=True); shutil.copy(glb, game_glb)
    shutil.copy(os.path.join(out, f"{d['file']}.faces.json"), os.path.join(root, 'src', 'assets', 'chars', f"{d['file']}.faces.json"))
    # copia del juego: atributos cuantizados (KHR_mesh_quantization, sin Draco); la de entrega queda tal cual sale de Blender
    import subprocess
    for g in (game_glb, os.path.join(root, 'src', 'assets', 'chars', f"{d['file']}_lod.glb")):
        r = subprocess.run(['node', os.path.join(root, 'tools', 'blender', 'optimize.mjs'), g], cwd=root, capture_output=True, text=True)
        log('juego', (r.stdout or r.stderr).strip()[-200:])
    val = C.validate(glb, root); rei = reimport_check(glb); log('validador', val, 'reimportación', rei)
    val_lod = C.validate(glb_lod, root)
    def glb_tris(path):
        j = C.glb_json(path); t = 0
        for m in j['meshes']:
            for pr in m['primitives']: t += j['accessors'][pr['indices']]['count'] // 3
        return t
    # recuentos (lo visible por defecto)
    parts = {}
    for n in ('Head', 'Hair', 'Body', 'Shirt', 'Vest', 'Shorts', 'Socks', 'Boots', 'Acc_Scarf'): parts[n] = tri_count(G[n])
    parts['Mechones'] = sum(tri_count(t) for t in G['tufts'])
    face_default = [o for n, o in G['face'].items() if not n.startswith(('Mouth_', 'Brow_', 'Eyelid_')) or o.get('default')]
    parts['Cara (ojos, iris, brillos, párpado, cejas, boca)'] = sum(tri_count(o) for o in face_default)
    parts['Manos (abiertas)'] = tri_count(G['hands']['Hand_L_Open']) + tri_count(G['hands']['Hand_R_Open'])
    variants_all = sum(tri_count(o) for o in list(G['face'].values()) + list(G['hands'].values()))
    cage = sum(cage_quads(G[n]) for n in ('Head', 'Hair', 'Body', 'Shirt', 'Vest', 'Shorts', 'Socks', 'Boots', 'Acc_Scarf')) + sum(cage_quads(o) for o in G['hands'].values() if o.get('default'))
    report = {
        'archivo': os.path.basename(glb), 'peso_MB': round(os.path.getsize(glb) / 1e6, 2),
        'triangulos_visibles': sum(parts.values()), 'triangulos_por_parte': parts, 'triangulos_con_todas_las_variantes': sum(parts.values()) - parts['Cara (ojos, iris, brillos, párpado, cejas, boca)'] - parts['Manos (abiertas)'] + variants_all,
        'cage_caras': cage,
        'huesos_deformadores': sum(1 for b in arm.data.bones if b.use_deform), 'huesos_total': len(arm.data.bones),
        'materiales': sorted(m.name for m in mats.values()), 'texturas': {k: v.size[0] for k, v in imgs.items()} | {'T_Eyes': 256},
        'clips': {n: {'fotogramas': fr, 'segundos': round(fr / 30, 2)} for n, fr, *_ in __import__('mbz_anim').clips()},
        'expresiones': faces, 'limpieza': clean, 'validador': val, 'reimportacion': rei,
        'lod': {'archivo': os.path.basename(glb_lod), 'peso_MB': round(os.path.getsize(glb_lod) / 1e6, 2), 'triangulos_en_archivo': glb_tris(glb_lod), 'validador': val_lod},
        'triangulos_en_archivo': glb_tris(glb),
    }
    with open(os.path.join(out, 'informe.json'), 'w', encoding='utf-8') as f: json.dump(report, f, ensure_ascii=False, indent=1)
    __import__('mbz_report').md(out)
    log('informe', json.dumps({k: report[k] for k in ('peso_MB', 'triangulos_visibles', 'triangulos_en_archivo', 'cage_caras', 'huesos_deformadores', 'lod')}, ensure_ascii=False))
    if renders:
        render_views(d, rdir); render_expressions(d, G, rdir); render_wireframes(d, G, rdir); render_test_poses(d, arm, rdir)
        for c in ('_RENDER',):
            col = bpy.data.collections.get(c)
            if col:
                for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)
                bpy.data.collections.remove(col)
    log('fin', f'{time.time() - t0:.1f} s')
    return G
