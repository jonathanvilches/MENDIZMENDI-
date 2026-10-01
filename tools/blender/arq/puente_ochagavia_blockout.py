"""Blockout del puente medieval de Ochagavía / Otsagabia sobre el río Anduña (fase 1 del encargo).
Eje del puente = X (de orilla a orilla); el río corre a lo largo de Y y viene de +Y (aguas arriba).
Medidas documentadas: ~20 m de largo, 3,20 m de ancho, dos arcos rebajados tipo carpanel, luces ~8 m,
tajamar agudo aguas arriba. Lo no documentado va como supuesto en P (y en la ficha)."""
import bpy, bmesh, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import escena_base as EB
from mathutils import Vector

P = dict(
    largo=20.0, ancho=3.20,
    luces=(8.0, 7.0),          # documentado: «luces de 8 m» y «ojos de distinta amplitud» -> 8,0 y 7,0 (supuesto)
    flechas=(2.9, 2.6),        # rebajado: ~0,36 de la luz (supuesto)
    arranque=1.1,              # altura del arranque de los arcos sobre el agua media (supuesto)
    rosca=0.55,                # canto de las dovelas en clave (supuesto)
    relleno=0.30,              # relleno + pavimento sobre la clave (supuesto)
    pila=2.2,                  # grosor de la pila central (supuesto)
    tajamar=2.6,               # saliente del tajamar aguas arriba, ángulo agudo (~50°) (supuesto)
    pretil_h=0.85, pretil_e=0.40,   # pretiles de piedra (supuesto, típico de la zona)
    lomo=0.25,                 # el tablero sube un poco hacia la pila (supuesto)
)

def perfil_arco(x0, luz, flecha, z0, n=24, extra=0.0):
    """Intradós (o trasdós con extra) de un arco rebajado aproximado por semielipse."""
    a, b = luz / 2 + extra, flecha + extra
    cx = x0 + luz / 2
    return [(cx - a * math.cos(math.pi * i / n), z0 + b * math.sin(math.pi * i / n)) for i in range(n + 1)]

def alzado():
    """Polígono del alzado (sin agujeros: los arcos se abren por abajo)."""
    L, l1, l2, pila = P['largo'], *P['luces'], P['pila']
    estribo = (L - l1 - l2 - pila) / 2
    x1 = -L / 2 + estribo; x2 = x1 + l1 + pila
    za = P['arranque']
    zt_c = za + max(P['flechas']) + P['rosca'] + P['relleno']
    # tablero: sube del extremo (zt_c - lomo) a la pila (zt_c)
    xp = x1 + l1 + pila / 2
    def ztab(x): return zt_c - P['lomo'] * min(1, abs(x - xp) / (L / 2 + abs(xp)))
    pts = [(-L / 2, -0.6)]
    for i in range(21): x = -L / 2 + L * i / 20; pts.append((x, ztab(x)))
    pts.append((L / 2, -0.6))
    # de vuelta por abajo: arco 2 (derecha) y arco 1 (izquierda), con los arranques en vertical hasta el lecho
    ab = perfil_arco(x2, l2, P['flechas'][1], za)[::-1]
    pts += [(ab[0][0], -0.6)] + ab + [(ab[-1][0], -0.6)]
    aa = perfil_arco(x1, l1, P['flechas'][0], za)[::-1]
    pts += [(aa[0][0], -0.6)] + aa + [(aa[-1][0], -0.6)]
    return pts, (x1, x2, xp, za, ztab)

def extruir(nombre, pts2d, y0, y1, col, mat):
    me = bpy.data.meshes.new(nombre); bm = bmesh.new()
    f = [bm.verts.new((x, y0, z)) for x, z in pts2d]
    b = [bm.verts.new((x, y1, z)) for x, z in pts2d]
    bm.faces.new(f[::-1]); bm.faces.new(b)
    n = len(pts2d)
    for i in range(n): j = (i + 1) % n; bm.faces.new((f[i], f[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nombre, me); col.objects.link(ob); me.materials.append(mat); return ob

def prisma(nombre, base2d, z0, z1, col, mat, cumbre=None):
    """Prisma vertical de base poligonal (en XY); cumbre: punto (x,y,z) al que converge la tapa (tajamar)."""
    me = bpy.data.meshes.new(nombre); bm = bmesh.new()
    a = [bm.verts.new((x, y, z0)) for x, y in base2d]
    b = [bm.verts.new((x, y, z1)) for x, y in base2d]
    bm.faces.new(a[::-1]); n = len(base2d)
    for i in range(n): j = (i + 1) % n; bm.faces.new((a[i], a[j], b[j], b[i]))
    if cumbre:
        c = bm.verts.new(cumbre)
        for i in range(n): j = (i + 1) % n; bm.faces.new((b[i], b[j], c))
    else: bm.faces.new(b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nombre, me); col.objects.link(ob); me.materials.append(mat); return ob

def mat(nombre, rgb, rough=0.85):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = rough; return m

def construir(out):
    sc, cols = EB.configurar(); B = cols['BLOCKOUT']
    piedra = mat('MAT_Arq_Mamposteria_Blockout', (0.52, 0.47, 0.40))
    agua_m = mat('MAT_Ref_Agua', (0.16, 0.28, 0.30), 0.1); tierra = mat('MAT_Ref_Orilla', (0.30, 0.33, 0.20))
    W = P['ancho']; pts, (x1, x2, xp, za, ztab) = alzado()
    extruir('BLD_Otsagabia_PuenteMedieval_Blockout', pts, -W / 2, W / 2, B, piedra)
    # pretiles sobre el tablero
    e, h = P['pretil_e'], P['pretil_h']
    pre = [(x, ztab(x) + h) for x in [-P['largo'] / 2 + P['largo'] * i / 20 for i in range(21)]]
    for s, nm in ((1, 'Arriba'), (-1, 'Abajo')):
        poly = [(x, z - h) for x, z in pre] + [(x, z) for x, z in pre[::-1]]
        extruir(f'BLD_Otsagabia_PuenteMedieval_Pretil{nm}_Blockout', poly, s * W / 2 - (e if s > 0 else 0), s * W / 2 + (0 if s > 0 else e), B, piedra)
    # tajamar aguas arriba (+Y): triángulo agudo desde la cara de la pila, coronado en pirámide
    xa, xb = x1 + P['luces'][0], x1 + P['luces'][0] + P['pila']
    zc = za + 0.75 * min(P['flechas'])
    prisma('BLD_Otsagabia_PuenteMedieval_Tajamar_Blockout', [(xa, W / 2), (xb, W / 2), (xp, W / 2 + P['tajamar'])], -0.6, zc, B, piedra,
           cumbre=(xp, W / 2 + 0.2, zc + 1.2))
    # aguas abajo: estribo de la pila (espolón rectangular corto, supuesto)
    prisma('BLD_Otsagabia_PuenteMedieval_Espolon_Blockout', [(xa + 0.3, -W / 2), (xa + 0.3, -W / 2 - 0.6), (xb - 0.3, -W / 2 - 0.6), (xb - 0.3, -W / 2)], -0.6, za, B, piedra)
    # contexto (REF): cauce, agua y orillas con muros de río
    R = cols['REF']
    bpy.ops.mesh.primitive_plane_add(size=1); agua = bpy.context.active_object; agua.name = 'REF_Agua_Anduna'; agua.scale = (P['largo'] - 1.5, 60, 1); agua.location = (0, 0, 0.0)
    for c in agua.users_collection: c.objects.unlink(agua)
    R.objects.link(agua); agua.data.materials.append(agua_m)
    for s in (-1, 1):
        prisma(f'REF_Orilla_{"E" if s > 0 else "O"}', [(s * (P['largo'] / 2 - 0.3), -30), (s * 30, -30), (s * 30, 30), (s * (P['largo'] / 2 - 0.3), 30)], -0.6, ztab(s * P['largo'] / 2) - 0.05, R, tierra)
    # maniquí en el centro del tablero
    EB.maniqui(R, (xp - 3.0, 0.3, ztab(xp - 3.0)))
    # cámaras de validación
    ctr = Vector((0, 0, 2.5)); man = Vector((xp - 3.0, 0.3, ztab(xp - 3.0)))
    cams = {
        'CAM_Front': EB.camara('CAM_Front', R, (0, -34, 3.2), ctr, lens=35),        # alzado aguas abajo
        'CAM_Side': EB.camara('CAM_Side', R, (0, 30, 3.4), (0, 0, 2.6), lens=35),    # perfil desde aguas arriba: tajamar y anchura
        'CAM_34': EB.camara('CAM_34', R, (13, 22, 7.5), ctr, lens=30),               # tres cuartos aguas arriba (tajamar)
        'CAM_Player': EB.camara('CAM_Player', R, (man.x - 6, man.y, man.z + 1.6), (man.x + 4, man.y, man.z + 1.0), fov_v=55),
    }
    EB.luz_validacion(R)
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'bld_otsagabia_puentemedieval_v001.blend'))
    for n, c in cams.items(): EB.render(c, os.path.join(out, f'blockout_{n}.png'))
    print('PUENTE_OK', {k: round(v, 2) if isinstance(v, float) else v for k, v in dict(x1=x1, x2=x2, xp=xp, tablero_clave=ztab(xp), tablero_extremo=ztab(-10)).items()})

if __name__ == '__main__':
    construir(sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(os.getcwd(), 'entrega', 'arquitectura', 'puente_ochagavia'))
