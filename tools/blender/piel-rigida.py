# Piel de cuerpo firme para los pelotaris nuevos: cada parte del cuerpo es un bloque que solo gira en su articulación.
# El autor, 17 de noviembre de 2026: «ni el torso ni el hombro se tienen que deformar; solo es movimiento de giro, de
# hombro y de cadera; el cuerpo es un bloque sólido; no debe deformarse nada, ni un poco».
#
# El cuello va en el bloque del torso: la cabeza gira encima de él (su giro pasa a la cabeza: tools/blender/clavicula.py).
# Parte de la piel de calor (tools/blender/piel-calor.py + huesos-extra.py + meshy-pesos.mjs), que dice bien qué carne
# es de qué hueso, y la convierte en piezas rígidas:
#   pelvis (Hips) · torso entero, del cinturón al cuello, con los hombros, las clavículas y el cuello (Spine2) ·
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
    (r'Hips', 'pelvis'), (r'Spine|Spine1|Spine2|LeftShoulder|RightShoulder|Neck', 'pecho'),
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
ART[frozenset(('pecho', 'cabeza'))] = 2.5   # (el cuello va en el bloque del torso; la cabeza gira encima)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENT)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
pre = 'mixamorig:' if any(b.name.startswith('mixamorig:') for b in arm.data.bones) else ''
HUESO = {'pelvis': 'Hips', 'pecho': 'Spine2', 'cabeza': 'Head'}
for s in ('Left', 'Right'):
    HUESO.update({s + 'clav': s + 'Shoulder', s + 'brazo': s + 'Arm', s + 'mano': s + 'Hand', s + 'muslo': s + 'UpLeg', s + 'pierna': s + 'Leg', s + 'pie': s + 'Foot', s + 'punta': s + 'ToeBase'})
HUESO = {k: pre + v for k, v in HUESO.items()}
mallas = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
inf = []
from mathutils import Vector
suave = lambda a, b, x: 0.0 if x <= a else 1.0 if x >= b else (lambda q: q * q * (3 - 2 * q))((x - a) / (b - a))
# (la costura del hombro: CORTE metros por dentro de la articulación, con una franja de ±FRANJA)
CORTE, FRANJA = float(__import__('os').environ.get('CORTE', '0.015')), float(__import__('os').environ.get('FRANJA', '0.012'))
import os, math
MODO = os.environ.get('HOMBRO', 'eje')   # eje (por defecto) | angulo | costura (el de antes)
TH0, TH1 = float(os.environ.get('TH0', '34')), float(os.environ.get('TH1', '58'))
T0, T1 = float(os.environ.get('T0', '0.04')), float(os.environ.get('T1', '0.07'))   # (la franja, en la manga: de 4 a 7 cm del centro del giro)
KS = float(os.environ.get('KS', '1.5'))   # (cuánto se aprieta la franja del sobaco)
CLAVI = os.environ.get('CLAVI', '0') == '1'   # (probado el 18 nov: no quitaba la solapa; el torso sigue entero)
CL0, CL1 = float(os.environ.get('CL0', '0.25')), float(os.environ.get('CL1', '0.8'))   # (a lo largo de la clavícula: de dónde a dónde pasa del torso a ella)
CZ0, CZ1 = float(os.environ.get('CZ0', '0.13')), float(os.environ.get('CZ1', '0.05'))  # (y de alto: de la axila hacia arriba)
CLAV_G = [(s, arm.matrix_world @ arm.data.bones[pre + s + 'Arm'].head_local, arm.matrix_world @ arm.data.bones[pre + s + 'Shoulder'].head_local) for s in ('Left', 'Right')]
HOMBRO = [(s, arm.matrix_world @ arm.data.bones[pre + s + 'Arm'].head_local, arm.matrix_world @ arm.data.bones[pre + s + 'ForeArm'].head_local) for s in ('Left', 'Right')]
# (la cadera: la altura de la articulación de la pierna; la cintura: del principio de la columna a 9 cm más arriba)
Z_CAD = max((arm.matrix_world @ arm.data.bones[pre + s + 'UpLeg'].head_local).z for s in ('Left', 'Right'))
Z_CINT0 = (arm.matrix_world @ arm.data.bones[pre + 'Spine'].head_local).z + 0.03; Z_CINT1 = Z_CINT0 + 0.09
# LA CABEZA Y EL PELO, ENTEROS CON LA CABEZA. Meshy no siempre cuelga la cabeza de su hueso: a la pelotari de la coleta
# (18 nov) le colgó media cabeza y toda la coleta del hueso del cuello, que aquí va con el torso; al inclinar la cabeza
# en los golpes, la cara giraba y el pelo se quedaba con el tronco: el flequillo le tapaba la cara, la coleta se partía y
# unos puntos de la punta, repartidos al brazo, salían estirados desde la mano. Dos reglas, iguales para todos:
#  - por encima de la barbilla (donde nace el hueso de la cabeza) todo es cabeza, con una franja corta de paso al cuello;
#  - por debajo, lo que tiene el color del pelo (el de la coronilla, leído de la textura) y no el de la piel del cuello ni
#    el de la camiseta es pelo que cuelga (coleta, melena, trenza) y va también con la cabeza.
import numpy as np
P_CAB = arm.matrix_world @ arm.data.bones[pre + 'Head'].head_local; P_CUE = arm.matrix_world @ arm.data.bones[pre + 'Neck'].head_local
Z_PECHO = (arm.matrix_world @ arm.data.bones[pre + 'Spine2'].head_local).z
CODO = [(s, arm.matrix_world @ arm.data.bones[pre + s + 'ForeArm'].head_local, arm.matrix_world @ arm.data.bones[pre + s + 'Hand'].head_local) for s in ('Left', 'Right')]
MUNECA = [(s, arm.matrix_world @ arm.data.bones[pre + s + 'Hand'].head_local, ((arm.matrix_world @ arm.data.bones[pre + s + 'Hand'].head_local) - (arm.matrix_world @ arm.data.bones[pre + s + 'ForeArm'].head_local)).normalized()) for s in ('Left', 'Right')]
def colores(me):
    try:
        img = next(n.image for m in me.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
        c = img.copy(); c.scale(512, 512); px = np.empty(512 * 512 * 4, np.float32); c.pixels.foreach_get(px); bpy.data.images.remove(c)
        px = px.reshape(512, 512, 4)[:, :, :3]; uv = me.data.uv_layers.active.data; col = np.zeros((len(me.data.vertices), 3), np.float32)
        for l in me.data.loops:
            u_, v_ = uv[l.index].uv; col[l.vertex_index] = px[int(min(511, max(0, v_ * 512))), int(min(511, max(0, u_ * 512)))]
        W = [me.matrix_world @ v.co for v in me.data.vertices]; top = max(p.z for p in W)
        med = lambda idx: np.median(col[idx], axis=0) if len(idx) >= 20 else None
        pelo = med([i for i, p in enumerate(W) if p.z > top - 0.035])
        frente = min(p.y for p in W if p.z > P_CAB.z)   # (el personaje mira a −Y: lo más adelantado de la cabeza es la cara)
        piel = med([i for i, p in enumerate(W) if P_CAB.z + 0.02 < p.z < P_CAB.z + 0.10 and p.y < frente + 0.035 and abs(p.x) < 0.03])   # (la piel, la de la cara: barbilla, boca y nariz)
        ropa = med([i for i, p in enumerate(W) if Z_PECHO - 0.10 < p.z < Z_PECHO and p.y < P_CAB.y and abs(p.x) < 0.10])
        if pelo is None or piel is None or ropa is None: print('sin colores de referencia: pelo, piel, ropa =', pelo, piel, ropa); return None
        print('colores  pelo', np.round(pelo, 2), ' piel', np.round(piel, 2), ' ropa', np.round(ropa, 2))
        def es_pelo(i):
            dh, ds, dr = (float(np.linalg.norm(col[i] - r_)) for r_ in (pelo, piel, ropa))
            return dh < 0.22 and dh < 0.8 * ds and dh < 0.6 * dr
        # (solo el pelo UNIDO al de la cabeza: se baja desde el pelo de encima de la barbilla, de punto en punto por las
        # aristas, mientras el color siga siendo de pelo. Con el color a secas, los pliegues en sombra de la camiseta
        # colorada pasaban por pelo castaño y, colgados de la cabeza, salían de la camiseta como pinchos)
        # (al bajar, el pelo en sombra también cuenta —el de debajo de la coleta sale más oscuro en la textura—, y lo que
        # cuelga claramente por detrás de la espalda; nunca lo que está dentro del cuello, que es piel aunque esté en
        # sombra, y por debajo de los hombros solo con el color claro de pelo, para no coger la camiseta)
        refs = (pelo, pelo * 0.6, piel, ropa, ropa * 0.6); eje = P_CAB - P_CUE
        def sigue(i):
            p_ = W[i]; atras = p_.y > P_CAB.y + 0.15
            if p_.z < P_CUE.z: return atras or es_pelo(i)
            c_ = P_CUE + eje * ((p_.z - P_CUE.z) / max(1e-6, eje.z))
            if ((p_.x - c_.x) ** 2 + (p_.y - c_.y) ** 2) ** 0.5 < 0.07: return False
            return atras or int(np.argmin([float(np.linalg.norm(col[i] - r_)) for r_ in refs])) < 2
        rep = {}; llave = {}
        for i, p_ in enumerate(W): rep[i] = llave.setdefault((round(p_.x, 4), round(p_.y, 4), round(p_.z, 4)), i)
        ady = {}; grupo = {}
        for e in me.data.edges:
            a_, b_ = rep[e.vertices[0]], rep[e.vertices[1]]
            if a_ != b_: ady.setdefault(a_, set()).add(b_); ady.setdefault(b_, set()).add(a_)
        for i, r_ in rep.items(): grupo.setdefault(r_, []).append(i)
        Z0 = P_CAB.z - 0.015
        cola = [r_ for r_ in grupo if W[r_].z > Z0 and es_pelo(r_)]; visto = set(cola); cuelga = set()
        while cola:
            x_ = cola.pop()
            for y_ in ady.get(x_, ()):
                if y_ in visto or W[y_].z > Z0: continue
                if W[y_].z > P_CUE.z - 0.25 and abs(W[y_].x) < 0.2 and sigue(y_): visto.add(y_); cola.append(y_); cuelga.update(grupo[y_])
        return cuelga
    except Exception as e: print('sin colores:', e); return None
for me in mallas:
    COL = colores(me)
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
        # LA CINTURA Y LA CADERA, POR ALTURA, IGUAL EN TODAS LAS CAPAS: la camiseta, la faja y la cinturilla del pantalón son
        # capas una encima de otra, y el calor (y Meshy en las piernas) les daba pesos distintos a la misma altura: al girar
        # el tronco o mover la pierna, cada capa iba por su lado y asomaban la cinturilla blanca por encima de la faja y la
        # piel por debajo de la camiseta. La pierna no llega más arriba de 6 cm por encima de su articulación (nada de la faja);
        # y de la pelvis al torso se pasa solo por la altura, por encima de la faja, donde ya solo hay camiseta
        if res and all(p in ('pelvis', 'pecho', 'Leftmuslo', 'Rightmuslo') for p in res):
            z = (me.matrix_world @ v.co).z
            pier = {p: x * (1 - suave(Z_CAD, Z_CAD + 0.06, z)) for p, x in res.items() if p.endswith('muslo')}
            tronco = 1 - sum(pier.values())
            if 'pecho' in res or 'pelvis' in res or tronco > 1e-6:
                tp = suave(Z_CINT0, Z_CINT1, z) if z > Z_CAD + 0.06 else (res.get('pecho', 0) / max(1e-6, res.get('pecho', 0) + res.get('pelvis', 0)) if ('pecho' in res or 'pelvis' in res) else 0.0)
                nuevo_r = {p: x for p, x in pier.items() if x > 1e-4}
                if tronco * (1 - tp) > 1e-4: nuevo_r['pelvis'] = tronco * (1 - tp)
                if tronco * tp > 1e-4: nuevo_r['pecho'] = tronco * tp
                res = nuevo_r; cuenta['cintura'] = cuenta.get('cintura', 0) + 1
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
                u = (F - A).normalized(); c = A + u * (P - A).dot(u); w_ = P - c; m_ = Vector((-sg, 0, 0))
                if MODO == 'eje':
                    # (el corte, un plano perpendicular al brazo: del brazo, lo que queda más allá a lo largo de su eje; la
                    # parte de arriba del hombro, por encima del centro del giro, va con el torso y no gira con el brazo,
                    # así que no asoma por detrás al subirlo. La manga y la piel de debajo están a la misma altura a lo
                    # largo del brazo: el corte las lleva juntas y la piel no se sale de la manga. La franja de mezcla va
                    # en la manga, de 4 a 7 cm del centro: pegada al hombro, con el brazo arriba del todo, los puntos que
                    # giraban a medias se quedaban levantados encima del hombro como una solapa)
                    g = suave(T0, T1, (P - A).dot(u))
                elif MODO == 'angulo':
                    d_ = P - A; th = math.degrees(d_.angle(u)) if d_.length > 1e-6 else 0.0
                    g = 1 - suave(TH0, TH1, th)
                else: g = suave(sg * A.x - CORTE - FRANJA, sg * A.x - CORTE + FRANJA, ele)
                medial = w_.normalized().dot(m_) if w_.length > 1e-6 else 0
                hr = suave(0.2, 0.5, medial) * (1 - suave(A.z - 0.06, A.z - 0.02, P.z))
                otro = sum(x for p, x in res.items() if p not in ('pecho', s + 'brazo'))
                # (en el sobaco, el calor apretado menos que en el resto: KS veces. Al subir el brazo hacia delante, la
                # tela de debajo de la manga y la del costado se separaban en una franja tan estrecha que se abría un
                # hueco; con la franja algo más ancha el sobaco se estira entero, como la tela de verdad)
                rb_, rp_ = S.get(s + 'brazo', 0), S.get('pecho', 0)
                if rb_ + rp_ > 1e-6:
                    tb = min(1.0, max(0.0, 0.5 - (0.5 - rb_ / (rb_ + rp_)) * KS)); tb = tb * tb * (3 - 2 * tb)
                else: tb = res.get(s + 'brazo', 0) / max(1e-6, 1 - otro)
                fa = (hr * tb + (1 - hr) * g) * (1 - otro)
                nuevo_res = {p: x for p, x in res.items() if p not in ('pecho', s + 'brazo')}
                if fa > 1e-4: nuevo_res[s + 'brazo'] = fa
                if 1 - otro - fa > 1e-4: nuevo_res['pecho'] = 1 - otro - fa
                res = nuevo_res; cuenta['hombro'] = cuenta.get('hombro', 0) + 1
        # EL HOMBRO QUE SUBE (CLAVI=1): al subir el brazo por encima de la horizontal, en una persona sube también el hombro
        # entero (la clavícula y el omóplato); si no, el brazo tiene que girar demasiado en su articulación y la tela de
        # encima del hombro se pliega como una solapa. La parte de arriba del torso junto a cada hombro (de media
        # clavícula hacia fuera y de la axila hacia arriba) va con la clavícula, a la que se le deja girar un poco
        # (tools/blender/clavicula.py TOPE); el cuello, el pecho y la espalda siguen enteros con el torso. El autor, 18 nov:
        # «rígidos tampoco: que tengan algo de movimiento, pero lo necesario para la dinámica del golpe»
        if CLAVI and res.get('pecho', 0) > 1e-4:
            P = me.matrix_world @ v.co
            for s_, A_, C_ in CLAV_G:
                d_ = A_ - C_; lam = (P - C_).dot(d_) / d_.length_squared
                k_ = suave(CL0, CL1, lam) * suave(A_.z - CZ0, A_.z - CZ1, P.z)
                if k_ > 1e-4:
                    x_ = res.pop('pecho'); res['pecho'] = x_ * (1 - k_); res[s_ + 'clav'] = res.get(s_ + 'clav', 0) + x_ * k_
                    if res['pecho'] < 1e-4: res.pop('pecho')
                    cuenta['clavicula'] = cuenta.get('clavicula', 0) + 1; break
        Pc = me.matrix_world @ v.co
        if Pc.z > P_CAB.z - 0.015:
            tc = suave(P_CAB.z - 0.015, P_CAB.z + 0.025, Pc.z)
            # (el paso al cuello, solo dentro del cuello: fuera de él —la mandíbula, el pelo que cruza a esa altura— todo
            # es cabeza; si no, la coleta se partía justo a la altura de la barbilla)
            cx_ = P_CUE + (P_CAB - P_CUE) * ((Pc.z - P_CUE.z) / max(1e-6, P_CAB.z - P_CUE.z))
            if ((Pc.x - cx_.x) ** 2 + (Pc.y - cx_.y) ** 2) ** 0.5 > 0.07: tc = 1.0
            if res.get('cabeza', 0) < tc - 0.25:
                res = {p: x for p, x in (('cabeza', tc), ('pecho', 1 - tc)) if x > 1e-4}; cuenta['cabeza'] = cuenta.get('cabeza', 0) + 1
        elif COL is not None and v.index in COL and res.get('cabeza', 0) < 0.99:
            res = {'cabeza': 1.0}; cuenta['pelo'] = cuenta.get('pelo', 0) + 1
        # LA MANO, ENTERA: lo que queda más allá de la muñeca, a lo largo del antebrazo, es mano. A la pelotari de la coleta
        # (18 nov) el reparto por calor le dejó las puntas de los dedos de la mano derecha colgadas del hueso del brazo: al
        # mover el brazo salía una línea larga desde la mano (los triángulos estirados de los dedos al sitio de reposo)
        if not any(p.endswith('muslo') or p == 'pelvis' for p in res):
            for s_, Wm, um in MUNECA:
                dm = Pc - Wm; lm = dm.dot(um)
                # (solo lo que está claramente mal: lo que no es ni mano ni antebrazo; el paso de la muñeca no se toca)
                if lm > 0.03 and (dm - um * lm).length < 0.10 and res.get(s_ + 'mano', 0) + res.get(s_ + 'antebrazo', 0) < 0.5:
                    res = {s_ + 'mano': 1.0}; cuenta['mano'] = cuenta.get('mano', 0) + 1
            # EL ANTEBRAZO, ENTERO: lo que está a lo largo del antebrazo (pasados 6 cm del codo) no puede colgar del brazo. A
            # la pelotari del moño el calor le dejó puntos de la muñequera con el hueso del brazo: al doblar el codo se
            # quedaban atrás y salían como picos junto a la muñeca. Pasan al antebrazo, repartidos entre su hueso y el
            # de giro como el resto (de nada en el codo a todo en la muñeca: tools/blender/huesos-extra.py)
            for s_, Ec, Wm in CODO:
                d_ = Wm - Ec; L_ = d_.length; u_ = d_ / L_; l_ = (Pc - Ec).dot(u_)
                if 0.06 < l_ <= L_ + 0.03 and ((Pc - Ec) - u_ * l_).length < 0.06 and res.get(s_ + 'brazo', 0) > 0.5:
                    tw_ = suave(0.0, 1.0, min(1.0, l_ / L_)); res = {s_ + 'antebrazo': 1.0}; ante.clear()
                    ante[pre + s_ + 'ForeArm'] = 1 - tw_; ante[pre + s_ + 'ForeArmTwist'] = tw_; cuenta['codo'] = cuenta.get('codo', 0) + 1
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
    inf.append(f'{me.name}: {len(me.data.vertices)} vértices, {cuenta["entero"]} enteros en su pieza, {cuenta["franja"]} en una franja de articulación, {cuenta["sin_art"]} con mezcla entre piezas que no se tocan (quitada), {cuenta.get("cintura", 0)} de cintura y cadera por altura, {cuenta.get("hombro", 0)} del hombro por la costura, {cuenta.get("clavicula", 0)} del hombro que sube con la clavícula, {cuenta.get("cabeza", 0)} de la cabeza y {cuenta.get("pelo", 0)} de pelo colgante pasados a la cabeza, {cuenta.get("mano", 0)} de más allá de la muñeca pasados a la mano, {cuenta.get("codo", 0)} del antebrazo quitados al brazo')
arm.data.pose_position = 'POSE'
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=SAL, export_format='GLB', export_animations=True)
print('PIEL RÍGIDA', SAL); print('\n'.join(inf))
if len(argv) > 2: open(argv[2], 'w').write('\n'.join(inf) + '\n')
