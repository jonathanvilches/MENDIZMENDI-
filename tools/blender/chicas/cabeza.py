# Paso 1 de las chicas: el cráneo liso. El pelo del chico es parte de la misma malla que la cara (mechones gruesos,
# pintados de castaño): se reconoce por el color de su textura en la cabeza, fuera de la cara, y sus puntos se llevan a
# una superficie lisa: primero dentro del cráneo (un elipsoide) y luego alisados entre la piel de alrededor, que no se
# mueve (frente, sienes, orejas, nuca). Encima irá el pelo nuevo, modelado aparte.
# Uso: python3 cabeza.py -- <modelo-hd.glb> <salida.blend> [vistas_prefijo]
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *
argv = sys.argv[sys.argv.index('--') + 1:]; glb, out = argv[0], argv[1]; pref = argv[2] if len(argv) > 2 else None
arm, me = abrir(glb); K = Medidas(me); K.guardar(out.replace('.blend', '-medidas.json')); M = me.matrix_world; Mi = M.inverted(); mesh = me.data; V = mesh.vertices
TEX, _ = textura(me); TH, TW = TEX.shape[:2]
key, grupos = copias(me); G = len(grupos)
P = np.array([tuple(K.frac(M @ v.co)) for v in V])            # (en fracción: x, y desde los pies, z hacia delante)
wh = pesos(me, 'mixamorig:Head') + pesos(me, 'headfront') + pesos(me, 'mixamorig:HeadTop_End')
# color de la textura en cada vértice (la media de sus esquinas)
uvl = mesh.uv_layers.active.data; col = np.zeros((len(V), 3)); cnt = np.zeros(len(V))
for l in mesh.loops:
    u, v = uvl[l.index].uv; x = min(TW - 1, max(0, int(u * TW))); y = min(TH - 1, max(0, int((1 - v) * TH)))
    col[l.vertex_index] += TEX[y, x]; cnt[l.vertex_index] += 1
col /= np.maximum(cnt, 1)[:, None]; c = col / 255
mx = c.max(1); mn = c.min(1); l = 0.3 * c[:, 0] + 0.59 * c[:, 1] + 0.11 * c[:, 2]
castano = ((c[:, 0] - c[:, 2]) / np.maximum(c[:, 0], 0.004) > 0.22) & (c[:, 2] <= c[:, 1] + 0.04) & (mx < 0.45)
negro = mx < 0.06
cara = (P[:, 2] > 0.03) & (P[:, 1] < 0.825) & (np.abs(P[:, 0]) < 0.105)
# (y lo que sobresale del cráneo sin ser piel ni oreja: las puntas de los mechones traen colores de otras piezas de la
# textura, rojos o azules, y quedaban de púas)
Cc0 = np.array([0.0, 0.8, -0.022]); Rr0 = np.array([0.152, 0.183, 0.163])
sv = np.linalg.norm((P - Cc0) / Rr0, axis=1)
piel = (mx > 0.5) & (c[:, 0] > c[:, 2] + 0.08) & (c[:, 0] >= c[:, 1])
oreja = (np.abs(P[:, 0]) > 0.115) & (P[:, 1] > 0.71) & (P[:, 1] < 0.83) & (P[:, 2] > -0.08) & (P[:, 2] < 0.05) & piel
pelo_v = (wh > 0.5) & (P[:, 1] > 0.68) & ~cara & ((castano | negro) | ((sv > 1.0) & ~oreja & ~piel) | ((sv > 1.06) & ~oreja))
# por grupo de copias (todas las del mismo sitio, a la vez)
gp = np.zeros(G); gn = np.zeros(G); np.add.at(gp, key, pelo_v); np.add.at(gn, key, 1)
pelo = gp / gn > 0.5
Pg = np.array([P[g[0]] for g in grupos])
# (un punto suelto rodeado de pelo también es pelo: dos pasadas)
nb0 = [set() for _ in range(G)]
for e in mesh.edges:
    a, b = key[e.vertices[0]], key[e.vertices[1]]
    if a != b: nb0[a].add(b); nb0[b].add(a)
sg = np.linalg.norm((Pg - Cc0) / Rr0, axis=1)
for _ in range(2):
    fr = np.array([np.mean([pelo[j] for j in nb0[i]]) if nb0[i] else 0 for i in range(G)])
    pelo = pelo | ((fr > 0.6) & (Pg[:, 1] > 0.7) & (sg > 0.97))
print('vertices', len(V), 'grupos', G, 'pelo', int(pelo.sum()))
# vecinos (por aristas, entre grupos)
nb = [set() for _ in range(G)]
for e in mesh.edges:
    a, b = key[e.vertices[0]], key[e.vertices[1]]
    if a != b: nb[a].add(b); nb[b].add(a)
# el cráneo: elipsoide en fracción (el de trajes.js, medido en el sanferminero)
Cc = np.array([0.0, 0.8, -0.022]); Rr = np.array([0.152, 0.183, 0.163]) * float(os.environ.get('CRANEO_K', '1'))
def dentro(p, k=0.985):
    d = (p - Cc) / Rr; s = np.linalg.norm(d, axis=-1, keepdims=True)
    return np.where(s > k, Cc + d / np.maximum(s, 1e-9) * k * Rr, p)
idx = np.nonzero(pelo)[0]; Q = Pg.copy(); Q[idx] = dentro(Q[idx])
nbl = [np.array(sorted(nb[i]), int) for i in range(G)]
for it in range(60):
    avg = np.array([Q[n].mean(0) if len(n) else Q[i] for i, n in ((i, nbl[i]) for i in idx)])
    Q[idx] = Q[idx] * 0.5 + avg * 0.5; Q[idx] = dentro(Q[idx])
# (y el cráneo, liso de verdad: los mechones aplastados dejaban púas, hoyos y escalones que el pelo nuevo copiaba. Se
# suaviza solo la distancia al centro (cada punto sigue en su dirección): sin encogerse y sin bultos. Entra el pelo y,
# de lo demás, lo de atrás y lo de arriba sobre el cráneo (no el cuello ni las orejas ni la cara))
og0 = np.zeros(G); np.add.at(og0, key, oreja); og0 = og0 > 0
# (la oreja es la pieza grande de cada lado; los trocitos sueltos de color piel entre los mechones no: se alisan)
def piezas(m):
    vis = np.zeros(G, bool); out_ = []
    for i0 in np.nonzero(m)[0]:
        if vis[i0]: continue
        pila = [i0]; vis[i0] = True; comp = []
        while pila:
            i = pila.pop(); comp.append(i)
            for j in nb0[i]:
                if m[j] and not vis[j]: vis[j] = True; pila.append(j)
        out_.append(comp)
    return out_
og1 = np.zeros(G, bool)
for lado in (1, -1):
    cs = piezas(og0 & (np.sign(Pg[:, 0]) == lado))
    if cs:
        mx_ = max(len(c) for c in cs)
        for c in cs:
            if len(c) >= 0.3 * mx_: og1[c] = True
print('oreja', int(og0.sum()), '->', int(og1.sum())); og0 = og1
for _ in range(int(os.environ.get('OREJA_N', '0'))):
    og0 = og0 | np.array([any(og0[j] for j in nb0[i]) and 0.69 < Pg[i, 1] < 0.835 and abs(Pg[i, 0]) > 0.1 for i in range(G)])
wg = np.zeros(G); np.add.at(wg, key, wh); wg /= np.bincount(key, minlength=G)
sq = np.linalg.norm((Q - Cc) / Rr, axis=1)
frente_v = (np.abs(Q[:, 0]) < 0.09) & (Q[:, 1] > 0.79) & (Q[:, 2] > 0.0)
cara_v = (Q[:, 2] > 0.0) & (Q[:, 1] < 0.84) & (np.abs(Q[:, 0]) < 0.125)
# (y las sienes, entre la cola de la ceja y la oreja: las patillas del chico dejaban allí escalones)
ax_ = np.abs(Q[:, 0]); # (por fuera del rabillo del ojo, que llega a x 0,095, desde más abajo)
sien = (ax_ > 0.088) & (ax_ < 0.14) & (Q[:, 1] > 0.775 + 0.055 * np.clip((0.112 - ax_) / 0.024, 0, 1)) & (Q[:, 1] < 0.9) & (Q[:, 2] > -0.04)
# (y la frente, de las cejas al nacimiento: la piel que asomaba entre los mechones y los mechones, en una sola superficie)
# (desde justo encima del párpado: el chico tenía las cejas modeladas en relieve, gruesas; las de la chica van pintadas)
ss_ = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
frente2 = (ax_ < 0.125) & (Q[:, 2] > 0.0) & (Q[:, 1] > float(os.environ.get('CEJA0', '0.827')) - 0.010 * ss_(0.072, 0.096, ax_))
S = (wg > 0.5) & (Q[:, 1] > 0.62) & ~og0 & (pelo | ((sq > 0.76) & (sien | frente2 | ~cara_v)))
iS = np.nonzero(S)[0]; u = (Q - Cc) / Rr; sr = np.linalg.norm(u, axis=1); u /= sr[:, None]
# (vecinos también los de otras piezas de la malla en la misma dirección: el mechón y la piel de debajo no comparten
# aristas, y cada uno, alisado por su cuenta, dejaba un escalón con una rendija entre los dos)
from mathutils.kdtree import KDTree
cand = np.nonzero((wg > 0.5) & (Q[:, 1] > 0.6) & ~og0 & (sq > 0.76))[0]
kdu = KDTree(len(cand))
for j, i in enumerate(cand): kdu.insert(Vector(tuple(u[i])), j)
kdu.balance()
nbs = {}
for i in iS:
    cerca = [cand[j] for (_, j, _) in sorted(kdu.find_range(Vector(tuple(u[i])), 0.02), key=lambda t: t[2]) if cand[j] != i][:16]
    nbs[i] = np.unique(np.concatenate([nbl[i], np.array(cerca, int)])) if cerca else nbl[i]
for it in range(400):
    avg = np.array([sr[nbs[i]].mean() if len(nbs[i]) else sr[i] for i in iS])
    sr[iS] = sr[iS] * 0.3 + avg * 0.7; sr[iS] = np.minimum(sr[iS], 0.985)
# (y al final, la distancia al centro como función de la dirección solamente: en una rejilla de direcciones por toda
# la esfera, lo que no se alisa (la cara, el cuello) fija su valor, el resto toma lo alisado y se suaviza con sus
# vecinas. Cada capa que se solapaba (el mechón sobre la piel) queda en la misma superficie, sin escalón ni rendija)
NF = 60000; ii = np.arange(NF) + 0.5; phi = np.arccos(1 - 2 * ii / NF); th = np.pi * (1 + 5 ** 0.5) * ii
Dm = np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)
kdm = KDTree(NF)
for j in range(NF): kdm.insert(Vector(tuple(Dm[j])), j)
kdm.balance()
fijo = np.full(NF, -1.0); dato = np.zeros(NF); ndato = np.zeros(NF)
for i in cand:
    if S[i]: continue
    _, j, _ = kdm.find(Vector(tuple(u[i]))); fijo[j] = max(fijo[j], sr[i])
for i in iS:
    _, j, _ = kdm.find(Vector(tuple(u[i]))); dato[j] += sr[i]; ndato[j] += 1
tiene = ndato > 0; dato[tiene] /= ndato[tiene]
vec = np.array([[j for (_, j, _) in sorted(kdm.find_n(Vector(tuple(Dm[k])), 9), key=lambda t: t[2])[1:]] for k in range(NF)])
R = np.where(fijo > 0, fijo, np.where(tiene, dato, 0.95)); libre = fijo <= 0
for it in range(300):
    m = R[vec].mean(1); R[libre] = np.where(tiene[libre], 0.85 * m[libre] + 0.15 * dato[libre], m[libre])
for i in iS:
    nn = kdm.find_n(Vector(tuple(u[i])), 3); w = np.array([1 / (d + 1e-4) for (_, _, d) in nn])
    sr[i] = min(0.985, float(sum(R[j] * wk for (_, j, _), wk in zip(nn, w)) / w.sum()))
Q[iS] = Cc + u[iS] * sr[iS, None] * Rr
idx = np.unique(np.concatenate([idx, iS])); print('cráneo liso', len(iS))
# (la nuca: las puntas del pelo del chico, pesadas al cuello y no a la cabeza, colgaban por debajo del cráneo como una
# gorguera. Entre el cráneo y el cuello, por detrás, todo lo que no es el cuello se alisa en 3D, con el cuello y el
# cráneo fijos: una transición suave, como la de verdad)
# (lo que pesa a la cabeza bajo el cráneo, por detrás: lo pesado al cuello, el cuello, no se mueve)
N = (wg > 0.5) & ~S & ~og0 & (Q[:, 1] > 0.655) & (Q[:, 1] < 0.76) & (Q[:, 2] < -0.01) & (np.abs(Q[:, 0]) < 0.13)
iN = np.nonzero(N)[0]
for it in range(150):
    avg = np.array([Q[nbl[i]].mean(0) if len(nbl[i]) else Q[i] for i in iN])
    Q[iN] = Q[iN] * 0.4 + avg * 0.6
idx = np.unique(np.concatenate([idx, iN])); print('nuca', len(iN))
if os.environ.get('DEPURA'): np.save(out.replace('.blend', '-S.npy'), S); np.save(out.replace('.blend', '-wg.npy'), wg)
# (el flequillo aplastado quedaba por delante de la piel de la frente, que seguía debajo: un escalón. Donde hay piel
# debajo de un punto del pelo, ese punto se lleva por detrás de ella y se ve la piel)
from mathutils.bvhtree import BVHTree
VIEJO = os.environ.get('VIEJO')
caras_piel = [tuple(f.vertices) for f in mesh.polygons if not any(pelo[key[v]] for v in f.vertices) and min(P[v, 1] for v in f.vertices) > 0.7]
bvh_p = BVHTree.FromPolygons([tuple(K.mundo(Vector(Q[key[i]]))) for i in range(len(V))], caras_piel)
Cw = K.mundo(Vector((0, 0.8, -0.022))); detras = 0
for gi in (idx if VIEJO else []):
    if Q[gi, 1] < 0.76 or Q[gi, 2] < -0.04: continue
    pw = K.mundo(Vector(Q[gi])); d = (Cw - pw).normalized()
    loc, nor, fi, dist = bvh_p.ray_cast(pw, d, 0.03 * K.H)
    if loc is not None:
        Q[gi] = np.array(tuple(K.frac(loc + d * 0.003 * K.H))); detras += 1
print('detras de la piel', detras)
# (la frente, lisa: una superficie z(x, y) ajustada a la piel buena de encima de los ojos y al cráneo de arriba; lo que
# sobresale de ella en la frente (bordes del flequillo, el relieve de las cejas del chico) se lleva a ella)
Qa = np.array([Q[key[i]] for i in range(len(V))])
win_ok = (wh > 0.5) & (np.abs(Qa[:, 0]) < 0.11)
pel_v = np.array([pelo[key[i]] for i in range(len(V))])
ceja_box = (np.abs(Qa[:, 0]) > 0.012) & (np.abs(Qa[:, 0]) < 0.1) & (Qa[:, 1] > 0.826) & (Qa[:, 1] < 0.858)
d1 = win_ok & (Qa[:, 1] > 0.80) & (Qa[:, 1] < 0.9) & (Qa[:, 2] > 0.06) & ~pel_v & ~ceja_box
xs, ys, zs = list(Qa[d1, 0]), list(Qa[d1, 1]), list(Qa[d1, 2])
for xx in np.linspace(-0.1, 0.1, 21):
    for yy in np.linspace(0.9, 0.95, 6):
        dd = 1 - (xx / Rr[0]) ** 2 - ((yy - Cc[1]) / Rr[1]) ** 2
        if dd > 0: xs.append(xx); ys.append(yy); zs.append(Cc[2] + Rr[2] * math.sqrt(dd) * 0.985)
xs, ys, zs = map(np.array, (xs, ys, zs))
A = np.stack([np.ones_like(xs), xs ** 2, ys, ys ** 2, xs ** 2 * ys, xs ** 4], 1); coef = np.linalg.lstsq(A, zs, rcond=None)[0]
def zf(x, y): return coef @ np.array([1, x * x, y, y * y, x * x * y, x ** 4])
plano = 0
for gi in (range(G) if VIEJO else []):
    x, y, z = Q[gi]
    if abs(x) > 0.108 or y < 0.826 or y > 0.905 or z < 0.02: continue
    zt = zf(x, y) - (0.0007 if pelo[gi] else 0.0)
    # (la piel que asomaba entre los mechones quedaba hundida bajo ellos: surcos oscuros. Sobre las cejas también sube)
    hundida = not pelo[gi] and zt - 0.015 < z < zt - 0.0005 and y > 0.838
    if pelo[gi] or z > zt + 0.0005 or hundida:
        # (con un borde suave a los lados y abajo)
        k = min(1.0, (0.108 - abs(x)) / 0.012) * min(1.0, (y - 0.826) / 0.008)
        if hundida and not z > zt: k *= suave((y - 0.838) / 0.012)
        Q[gi, 2] = z + (zt - z) * k; plano += 1
idx = np.unique(np.concatenate([idx, np.arange(G)[(np.abs(Q[:, 0]) <= 0.108) & (Q[:, 1] >= 0.826) & (Q[:, 1] <= 0.905)]]))
print('frente lisa', plano, 'puntos')
mov = np.linalg.norm(Q - Pg, axis=1); print('movido medio', round(float(mov[idx].mean()), 4), 'max', round(float(mov.max()), 4))
for gi in idx:
    w = K.mundo(Vector(Q[gi]))
    for vi in grupos[gi]: V[vi].co = Mi @ w
# (las dos capas de cada mechón quedan una sobre otra en el cráneo liso, y donde la malla se doblaba al llevarla a él
# queda un pliegue; lo de abajo, del revés, asomaba en rayas y manchas negras: se le da la vuelta y, con la misma
# textura repintada encima, no se distingue de lo de arriba)
movido = np.zeros(G, bool); movido[idx] = np.linalg.norm(Q[idx] - Pg[idx], axis=1) > 1e-5
bm = bmesh.new(); bm.from_mesh(mesh); bm.faces.ensure_lookup_table(); rev = []
Cw = K.mundo(Vector((0, 0.8, -0.022)))
for f in bm.faces:
    if not any(movido[key[v.index]] for v in f.verts): continue
    c = sum((M @ v.co for v in f.verts), Vector()) / len(f.verts)
    if K.frac(c).y < 0.62: continue
    if (M.to_3x3() @ f.normal) @ (c - Cw).normalized() < 0: rev.append(f)
ln0 = np.array([tuple(c.vector) for c in mesh.corner_normals])        # (las normales de antes, para lo que no se mueve)
bmesh.ops.reverse_faces(bm, faces=rev); bm.to_mesh(mesh); bm.free(); print('del revés', len(rev))
mesh.update()
# (las normales de lo movido, de nuevo: el modelo trae las suyas, las del pelo del chico, y en el cráneo liso daban
# manchas de luz y sombra. Cada sitio (todas sus copias) toma la media de sus caras, vueltas hacia fuera)
anillo = movido.copy()
for i in np.nonzero(movido)[0]:
    for j in nb[i]: anillo[j] = True
Cl = np.array(tuple(Mi @ K.mundo(Vector(tuple(Cc)))))
acc = np.zeros((G, 3))
for f in mesh.polygons:
    gs = {int(key[v]) for v in f.vertices}
    if not any(anillo[g] for g in gs): continue
    n = np.array(tuple(f.normal)) * f.area
    if any(movido[g] for g in gs) and n @ (np.array(tuple(f.center)) - Cl) < 0: n = -n
    for g in gs: acc[g] += n
ln = ln0.copy()
for l in mesh.loops:
    g = key[l.vertex_index]
    if not anillo[g]: continue
    n = acc[g] / max(np.linalg.norm(acc[g]), 1e-12)
    ln[l.index] = n if movido[g] else (n + ln0[l.index]) / max(np.linalg.norm(n + ln0[l.index]), 1e-12)
mesh.normals_split_custom_set([tuple(x) for x in ln]); print('normales nuevas', int(anillo.sum()))
np.save(out.replace('.blend', '-pelo.npy'), pelo); np.save(out.replace('.blend', '-key.npy'), key)
# (las orejas, ensanchadas un poco: el pelo nuevo no se apoya en ellas, pasa por detrás)
og = og0.copy()
for _ in range(2):
    og = og | np.array([any(og[j] for j in nb0[i]) and Pg[i, 1] > 0.7 and abs(Pg[i, 0]) > 0.1 for i in range(G)])
np.save(out.replace('.blend', '-oreja.npy'), og)
# el cráneo para apoyar el pelo: como el liso, pero también con las orejas llevadas a él (sin huecos ni bultos)
idx2 = np.nonzero(og & ~pelo)[0]; Q2 = Q.copy(); Q2[idx2] = dentro(Q2[idx2], 0.985)
for it in range(80):
    avg = np.array([Q2[nbl[i]].mean(0) if len(nbl[i]) else Q2[i] for i in idx2])
    Q2[idx2] = Q2[idx2] * 0.4 + avg * 0.6; Q2[idx2] = dentro(Q2[idx2], 0.985)
np.save(out.replace('.blend', '-craneo.npy'), Q2)
bpy.ops.wm.save_as_mainfile(filepath=out)
if pref:
    montar(muestras=24); cc = K.mundo(Vector((0, 0.8, 0)))
    for tag, yaw in (('frente', 0), ('lado', 90), ('atras', 180), ('tres', 35)): foto(f'{pref}-{tag}.png', yaw, cc.z + 0.02, cc, K.H * 0.75, 70, 420, 420)
salir()
