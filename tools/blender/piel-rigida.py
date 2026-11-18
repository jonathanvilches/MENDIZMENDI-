# Piel de cuerpo firme para los pelotaris nuevos: cada parte del cuerpo es un bloque que solo gira en su articulación.
# El autor, 17 de noviembre de 2026: «ni el torso ni el hombro se tienen que deformar; solo es movimiento de giro, de
# hombro y de cadera; el cuerpo es un bloque sólido; no debe deformarse nada, ni un poco».
#
# Parte de la piel de calor (tools/blender/piel-calor.py + huesos-extra.py + meshy-pesos.mjs), que dice bien qué carne
# es de qué hueso, y la convierte en piezas rígidas:
#   pelvis (Hips) · torso entero, del cinturón al cuello, con los hombros y las clavículas (Spine2) · cuello (Neck) ·
#   cabeza y pelo (Head) · brazo (Arm) · antebrazo (ForeArm y su hueso de giro, con el reparto de siempre a lo largo del
#   antebrazo) · mano (Hand) · muslo · pierna · pie · punta del pie.
# Cada vértice queda entero en su pieza, salvo una franja estrecha en cada articulación donde pasa de una a la siguiente
# (la del calor apretada K veces: K=3 deja un tercio de la franja de antes). Entre piezas que no se tocan (la mano y la
# faja, el antebrazo y el pecho) no hay mezcla: el vértice va entero a la suya. Las vértebras y las clavículas no
# mueven piel, así que su giro hay que pasarlo al hueso de debajo (actors/glbChar.js, clavícula): el torso no se dobla
# ni se encoge, gira entero sobre la cintura, y el brazo gira entero sobre el hombro.
# En el juego y en Blender la mezcla de cada franja es con cuaterniones duales (giro sin aplastar ni vaciar el volumen:
# actors/glbChar.js dqs, y en Blender «Preserve Volume»).
# Uso: python tools/blender/piel-rigida.py -- entrada.glb salida.glb [informe.txt]
import bpy, sys, re
argv = sys.argv[sys.argv.index('--') + 1:]
ENT, SAL = argv[0], argv[1]
PIEZA = [  # (patrón del hueso sin «mixamorig:», pieza)
    (r'Hips', 'pelvis'), (r'Spine|Spine1|Spine2|LeftShoulder|RightShoulder', 'pecho'), (r'Neck', 'cuello'),
    (r'Head|HeadTop_End|headfront', 'cabeza'),
    (r'(Left|Right)Arm', r'\1brazo'), (r'(Left|Right)ForeArm(Twist)?', r'\1antebrazo'), (r'(Left|Right)Hand.*', r'\1mano'),
    (r'(Left|Right)UpLeg', r'\1muslo'), (r'(Left|Right)Leg', r'\1pierna'), (r'(Left|Right)Foot', r'\1pie'), (r'(Left|Right)ToeBase', r'\1punta'),
]
def pieza(n):
    b = n.split(':')[-1]
    for p, s in PIEZA:
        m = re.fullmatch(p, b)
        if m: return m.expand(s)
    return None
# las articulaciones (pares de piezas que se tocan) y cuánto se aprieta su franja
ART = {}
for s in ('Left', 'Right'):
    ART[frozenset(('pecho', s + 'brazo'))] = 3.0
    ART[frozenset((s + 'brazo', s + 'antebrazo'))] = 3.0
    ART[frozenset((s + 'antebrazo', s + 'mano'))] = 3.0
    ART[frozenset(('pelvis', s + 'muslo'))] = 2.0
    ART[frozenset((s + 'muslo', s + 'pierna'))] = 2.5
    ART[frozenset((s + 'pierna', s + 'pie'))] = 3.0
    ART[frozenset((s + 'pie', s + 'punta'))] = 3.0
ART[frozenset(('pelvis', 'pecho'))] = 2.5
ART[frozenset(('pecho', 'cuello'))] = 2.5
ART[frozenset(('cuello', 'cabeza'))] = 2.5
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
HUESO = {'pelvis': 'Hips', 'pecho': 'Spine2', 'cuello': 'Neck', 'cabeza': 'Head'}
for s in ('Left', 'Right'):
    HUESO.update({s + 'brazo': s + 'Arm', s + 'mano': s + 'Hand', s + 'muslo': s + 'UpLeg', s + 'pierna': s + 'Leg', s + 'pie': s + 'Foot', s + 'punta': s + 'ToeBase'})
HUESO = {k: pre + v for k, v in HUESO.items()}
mallas = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
inf = []
from mathutils import Vector
suave = lambda a, b, x: 0.0 if x <= a else 1.0 if x >= b else (lambda q: q * q * (3 - 2 * q))((x - a) / (b - a))
# (la costura del hombro: CORTE metros por dentro de la articulación, con una franja de ±FRANJA)
CORTE, FRANJA = float(__import__('os').environ.get('CORTE', '0.015')), float(__import__('os').environ.get('FRANJA', '0.012'))
HOMBRO = [(s, arm.matrix_world @ arm.data.bones[pre + s + 'Arm'].head_local, arm.matrix_world @ arm.data.bones[pre + s + 'ForeArm'].head_local) for s in ('Left', 'Right')]
for me in mallas:
    nombres = [g.name for g in me.vertex_groups]
    nuevo = []; cuenta = {'franja': 0, 'entero': 0, 'sin_art': 0}
    for v in me.data.vertices:
        w = [(nombres[g.group], g.weight) for g in v.groups if g.weight > 1e-5]
        S = {}; ante = {}
        for n, x in w:
            p = pieza(n)
            if p is None: continue
            S[p] = S.get(p, 0) + x
            if p.endswith('antebrazo'): ante[n] = ante.get(n, 0) + x
        if not S: nuevo.append(w); continue
        orden = sorted(S.items(), key=lambda e: -e[1])
        (pa, a) = orden[0]
        res = {pa: 1.0}
        if len(orden) > 1:
            (pb, b) = orden[1]
            k = ART.get(frozenset((pa, pb)))
            if k is None: cuenta['sin_art'] += 1
            else:
                t = b / (a + b); t = min(1.0, max(0.0, 0.5 - (0.5 - t) * k)); t = t * t * (3 - 2 * t)
                if t > 1e-4: res = {pa: 1 - t, pb: t}; cuenta['franja'] += 1
                else: cuenta['entero'] += 1
        else: cuenta['entero'] += 1
        # EL HOMBRO, POR LA COSTURA DE LA CAMISETA: el calor deja la parte de arriba de la manga con el torso (la tela va
        # suelta, lejos del hueso) y la de abajo con el brazo, y al subir el brazo la manga se abría por la mitad y se veía
        # el hueco de dentro. Por fuera, por delante, por detrás y por encima del brazo, el corte va en la costura del
        # hombro (un poco por dentro de la articulación): toda la manga es del brazo. En el sobaco y por dentro del brazo
        # (donde la carne del brazo toca el costado), el reparto del calor, que ahí sí distingue bien brazo y costado
        if any(p in res for p in ('pecho', 'Leftbrazo', 'Rightbrazo')):
            P = me.matrix_world @ v.co
            for s, A, F in HOMBRO:
                if (P - A).length > 0.22 or not any(p in res for p in ('pecho', s + 'brazo')): continue
                sg = 1 if s == 'Left' else -1; ele = sg * P.x
                g = suave(sg * A.x - CORTE - FRANJA, sg * A.x - CORTE + FRANJA, ele)
                u = (F - A).normalized(); c = A + u * (P - A).dot(u); w_ = P - c; m_ = Vector((-sg, 0, 0))
                medial = w_.normalized().dot(m_) if w_.length > 1e-6 else 0
                hr = suave(0.2, 0.5, medial) * (1 - suave(A.z - 0.06, A.z - 0.02, P.z))
                otro = sum(x for p, x in res.items() if p not in ('pecho', s + 'brazo'))
                fa = (hr * res.get(s + 'brazo', 0) / max(1e-6, 1 - otro) + (1 - hr) * g) * (1 - otro)
                nuevo_res = {p: x for p, x in res.items() if p not in ('pecho', s + 'brazo')}
                if fa > 1e-4: nuevo_res[s + 'brazo'] = fa
                if 1 - otro - fa > 1e-4: nuevo_res['pecho'] = 1 - otro - fa
                res = nuevo_res; cuenta['hombro'] = cuenta.get('hombro', 0) + 1
        # de pieza a hueso (el antebrazo, repartido entre su hueso y el de giro como venía)
        out = {}
        for p, x in res.items():
            if p.endswith('antebrazo'):
                st = sum(ante.values())
                for n, y in ante.items(): out[n] = out.get(n, 0) + x * y / st
            else: out[HUESO[p]] = out.get(HUESO[p], 0) + x
        out = sorted(out.items(), key=lambda e: -e[1])[:4]; s = sum(x for _, x in out)
        nuevo.append([(n, x / s) for n, x in out])
    for g in list(me.vertex_groups): me.vertex_groups.remove(g)
    grupos = {}
    for v, w in zip(me.data.vertices, nuevo):
        for n, x in w:
            g = grupos.get(n) or grupos.setdefault(n, me.vertex_groups.new(name=n))
            g.add([v.index], x, 'REPLACE')
    # (los huesos sin piel siguen en el esqueleto: el juego y las animaciones los usan)
    for b in arm.data.bones:
        if b.name not in grupos: me.vertex_groups.new(name=b.name)
    inf.append(f'{me.name}: {len(me.data.vertices)} vértices, {cuenta["entero"]} enteros en su pieza, {cuenta["franja"]} en una franja de articulación, {cuenta["sin_art"]} con mezcla entre piezas que no se tocan (quitada)')
arm.data.pose_position = 'POSE'
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True)
print('PIEL RÍGIDA', SAL); print('\n'.join(inf))
if len(argv) > 2: open(argv[2], 'w').write('\n'.join(inf) + '\n')
