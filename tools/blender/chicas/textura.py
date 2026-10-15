# Paso 3 de las chicas: la textura de la cabeza. Con el pelo del chico aplastado, su pintura (castaño, a mechones) queda
# en el cráneo: por encima del nacimiento de la chica (comun.Nacimiento) se pinta del castaño de base del pelo, que se ve
# entre los mechones nuevos y que el juego tiñe del color de cada una (chicas.js le da su brillo de referencia); por debajo (la frente que tapaba el flequillo, las
# patillas, la nuca) se pinta de piel, con el tono de la piel de alrededor. Las cejas y la cara no se tocan aquí.
# Cada punto de la textura se sitúa en el cuerpo (en reposo, ya liso) para saber dónde cae.
# Uso: python3 textura.py -- <calva.blend> <salida.png>
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *
from PIL import Image
argv = sys.argv[sys.argv.index('--') + 1:]; src, out = argv[0], argv[1]
bpy.ops.wm.open_mainfile(filepath=src)
me = next(o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('Hair'))
K = Medidas(desde=src.replace('.blend', '-medidas.json')); NAC = Nacimiento(src.replace('.blend', '-nacimiento.json'))
M = me.matrix_world; mesh = me.data; mesh.calc_loop_triangles()
TEX, _ = textura(me); TH, TW = TEX.shape[:2]; OUT = TEX.copy()
uvl = mesh.uv_layers.active.data; P = np.array([tuple(K.frac(M @ v.co)) for v in mesh.vertices])
wh = pesos(me, 'mixamorig:Head') + pesos(me, 'headfront') + pesos(me, 'mixamorig:HeadTop_End') + pesos(me, 'mixamorig:Neck') * 0.6
Cc = np.array([0.0, 0.8, -0.022])
Ev = np.vectorize(NAC.e)
CEJA_X, CEJA_Y1 = float(os.environ.get('CEJA_X', '0.108')), float(os.environ.get('CEJA_Y1', '0.85'))
# ---- cada punto de la textura de la cabeza y el cuello: dónde cae (fracción) ----
pelo_g = np.load(src.replace('.blend', '-pelo.npy')); oreja_g = np.load(src.replace('.blend', '-oreja.npy')); key = np.load(src.replace('.blend', '-key.npy'))
def texeles(t):
    tx = np.array([[uvl[l].uv.x * TW, (1 - uvl[l].uv.y) * TH] for l in t.loops]); a, b, c = tx
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-9: return None
    X0, Y0 = np.clip(np.floor(tx.min(0)).astype(int), 0, [TW - 1, TH - 1]); X1, Y1 = np.clip(np.ceil(tx.max(0)).astype(int), 0, [TW - 1, TH - 1])
    gx, gy = np.meshgrid(np.arange(X0, X1 + 1) + 0.5, np.arange(Y0, Y1 + 1) + 0.5)
    l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den; l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den
    ins = (l0 >= -0.01) & (l1 >= -0.01) & (1 - l0 - l1 >= -0.01)
    return (gx[ins] - 0.5).astype(int), (gy[ins] - 0.5).astype(int)
# (las puntas del pelo del chico usaban a veces la textura de otra pieza (la camiseta, roja): al repintarlas de pelo o
# de piel se mancharía la camiseta, y sin repintar quedaban motas rojas. Esos triángulos toman el color de un triángulo
# vecino de la cabeza que no comparte su textura: sus tres esquinas, en el centro de la de él)
es_cabeza = lambda t: max(wh[i] for i in t.vertices) >= 0.3 and min(P[i, 1] for i in t.vertices) >= 0.62
otros = np.zeros((TH, TW), bool); cab = []
for t in mesh.loop_triangles:
    if es_cabeza(t): cab.append(t); continue
    r = texeles(t)
    if r is not None: otros[r[1], r[0]] = True
malos, buenos = [], []
# (y los que no tienen ni un texel propio: puntas con la textura en el borde de la imagen, que toma el color de lo de al
# lado, a menudo la camiseta)
for t in cab:
    r = texeles(t)
    if r is None or len(r[0]) < 3: malos.append(t); continue
    (malos if otros[r[1], r[0]].mean() > 0.3 else buenos).append(t)
from mathutils.kdtree import KDTree
# (del mismo lado del nacimiento del pelo: por debajo, de los de piel del chico; si no, una cara diminuta de la frente
# tomaba el castaño de un mechón de encima y salía una mota oscura)
def bajo_nac(t):
    c = P[list(t.vertices)].mean(0) - np.array([0.0, 0.8, -0.022]); r_ = np.linalg.norm(c)
    return np.degrees(np.arcsin(np.clip(c[1] / max(r_, 1e-9), -1, 1))) < NAC.e(np.degrees(np.arctan2(c[0], c[2])) % 360) - 0.5
de_piel = lambda t: bajo_nac(t) and np.mean([pelo_g[key[i]] for i in t.vertices]) <= 0.5
grupos = {True: [t for t in buenos if de_piel(t)], False: [t for t in buenos if not bajo_nac(t)]}
kds = {}
for lado, lista in grupos.items():
    kd_ = KDTree(max(1, len(lista)))
    for j, t in enumerate(lista): kd_.insert(Vector(tuple(P[list(t.vertices)].mean(0))), j)
    kd_.balance(); kds[lado] = kd_
# (por caras enteras: los dos triángulos de un cuadrado comparten esquinas)
bp = {t.polygon_index for t in malos}; cus = {}
for t in malos:
    lado = bool(bajo_nac(t)); lado = lado if grupos[lado] else not lado
    _, j, _ = kds[lado].find(Vector(tuple(P[list(t.vertices)].mean(0)))); b_ = grupos[lado][j]
    cus.setdefault(t.polygon_index, Vector(tuple(sum((uvl[l].uv for l in b_.loops), Vector((0, 0))) / 3)))
for pi in bp:
    for l in mesh.polygons[pi].loop_indices: uvl[l].uv = cus[pi]
mesh.update(); mesh.calc_loop_triangles(); print('caras con la textura de otra pieza', len(bp))
bpy.ops.wm.save_as_mainfile(filepath=src)
X, Y, Fx, Fy, Fz, TP, TO = [], [], [], [], [], [], []
for t in mesh.loop_triangles:
    vs = t.vertices
    if max(wh[i] for i in vs) < 0.3 or min(P[i, 1] for i in vs) < 0.62: continue
    tp = np.mean([pelo_g[key[i]] for i in vs]) > 0.5; to = any(oreja_g[key[i]] for i in vs)
    tx = np.array([[uvl[l].uv.x * TW, (1 - uvl[l].uv.y) * TH] for l in t.loops]); a, b, c = tx
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-9: continue
    X0, Y0 = np.clip(np.floor(tx.min(0)).astype(int), 0, [TW - 1, TH - 1]); X1, Y1 = np.clip(np.ceil(tx.max(0)).astype(int), 0, [TW - 1, TH - 1])
    gx, gy = np.meshgrid(np.arange(X0, X1 + 1) + 0.5, np.arange(Y0, Y1 + 1) + 0.5)
    l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den; l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den; l2 = 1 - l0 - l1
    ins = (l0 >= -0.01) & (l1 >= -0.01) & (l2 >= -0.01)
    if not ins.any(): continue
    p = l0[ins, None] * P[vs[0]] + l1[ins, None] * P[vs[1]] + l2[ins, None] * P[vs[2]]
    X.append((gx[ins] - 0.5).astype(int)); Y.append((gy[ins] - 0.5).astype(int)); Fx.append(p[:, 0]); Fy.append(p[:, 1]); Fz.append(p[:, 2])
    TP.append(np.full(len(p), tp)); TO.append(np.full(len(p), to))
X = np.concatenate(X); Y = np.concatenate(Y); F = np.stack([np.concatenate(Fx), np.concatenate(Fy), np.concatenate(Fz)], 1); TP = np.concatenate(TP); TO = np.concatenate(TO)
# (cada texel una vez)
k = Y * TW + X; _, u = np.unique(k, return_index=True); X, Y, F, TP, TO = X[u], Y[u], F[u], TP[u], TO[u]
d = F - Cc; r = np.linalg.norm(d, axis=1); az = np.degrees(np.arctan2(d[:, 0], d[:, 2])) % 360; el = np.degrees(np.arcsin(np.clip(d[:, 1] / r, -1, 1)))
borde = Ev(az)
col = TEX[Y, X] / 255; mx = col.max(1)
castano = ((col[:, 0] - col[:, 2]) / np.maximum(col[:, 0], 0.004) > 0.2) & (col[:, 2] <= col[:, 1] + 0.05) & (mx < 0.5)
oscuro = mx < 0.08
# (lo que era pelo: los triángulos aplastados, sea cual sea su color, y lo castaño pintado en la piel: las patillas)
# (y, junto a la oreja, lo que no tiene color de piel: motas rojas y rayas oscuras de los mechones)
sat1 = (col.max(1) - col.min(1)) / np.maximum(col.max(1), 1e-3)
no_piel = ~((mx > 0.5) & (col[:, 0] > col[:, 2] + 0.05) & (sat1 > 0.08) & (sat1 < 0.5) & (col[:, 0] >= col[:, 1]))
pelo_viejo = TP | castano | oscuro | (TO & no_piel)
cejas = (F[:, 2] > 0.04) & (np.abs(F[:, 0]) < CEJA_X) & (F[:, 1] < CEJA_Y1) & (F[:, 1] > 0.79) & ~TP
cara = (F[:, 2] > 0.03) & (F[:, 1] < 0.8) & (np.abs(F[:, 0]) < 0.11)
# ---- la piel de alrededor, en una rejilla por dirección (1°): la media de la piel que se ve, rellenando los huecos ----
# (solo lo que tiene color de piel: en la nuca, el cuello de la camiseta también pesa en la cabeza y teñía de rojo)
sat0 = (col.max(1) - col.min(1)) / np.maximum(col.max(1), 1e-3)
# (sin la oreja, más rosada y clara: la patilla repintada salía como una mancha pálida delante de ella)
piel = ~pelo_viejo & ~oscuro & (mx > 0.5) & (el < borde - 2) & ~cejas & (col[:, 0] > col[:, 2] + 0.05) & (sat0 > 0.1) & (sat0 < 0.45) & (col[:, 0] >= col[:, 1]) & ~TO
GA, GE = 360, 181; acc = np.zeros((GE, GA, 3)); cnt = np.zeros((GE, GA))
ia = az.astype(int) % GA; ie = np.clip((el + 90).astype(int), 0, GE - 1)
np.add.at(acc, (ie[piel], ia[piel]), col[piel]); np.add.at(cnt, (ie[piel], ia[piel]), 1)
have = cnt > 0; G = np.where(have[..., None], acc / np.maximum(cnt, 1)[..., None], 0)
for _ in range(400):          # (difusión: los huecos toman la media de sus vecinos)
    sh = [np.roll(G, 1, 1), np.roll(G, -1, 1), np.vstack([G[:1], G[:-1]]), np.vstack([G[1:], G[-1:]])]
    hv = [np.roll(have, 1, 1), np.roll(have, -1, 1), np.vstack([have[:1], have[:-1]]), np.vstack([have[1:], have[-1:]])]
    s_ = sum(a * h[..., None] for a, h in zip(sh, hv)); n_ = sum(h.astype(float) for h in hv)
    nuevo = ~have & (n_ > 0); G[nuevo] = s_[nuevo] / n_[nuevo][:, None]; have = have | nuevo
    if have.all(): break
from PIL import ImageFilter
Gi = Image.fromarray((np.clip(G, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)); G = np.asarray(Gi).astype(np.float32) / 255
skin = G[ie, ia]
# ---- el castaño de base del pelo, con algo de veta (se ve entre mechones y en el borde) ----
veta = np.ones(len(az))   # (liso: bajo el pelo apenas se ve y así la capa del juego ocupa poco)
# (el tono medio del pelo de la chica, algo más oscuro, como las raíces: en la nuca y detrás de las orejas, donde el pelo
# va pegado y se ve la cabeza pintada, casa con él; antes era tres veces más oscuro y se veía una franja casi negra)
CAST = np.array([0.306, 0.196, 0.129])
base = CAST[None, :] * veta[:, None]
# cuánto es pelo cada punto: del nacimiento hacia arriba, con un borde suave de 2,5°
h = np.clip((el - (borde - 1.0)) / 2.5, 0, 1); h = h * h * (3 - 2 * h)
nuevo = col.copy()
pintar_pelo = (h > 0) & ~cejas & ~cara & ~(TO & ~pelo_viejo)   # (junto a la oreja, solo lo que era pelo: la oreja, no)
nuevo[pintar_pelo] = col[pintar_pelo] * (1 - h[pintar_pelo, None]) + base[pintar_pelo] * h[pintar_pelo, None]
protegido = (F[:, 2] > 0.03) & (np.abs(F[:, 0]) < 0.1) & (F[:, 1] < 0.83) & ~TP     # (ojos, nariz y boca)
# (con el borde fundido: lo que era pelo, entero; la piel de alrededor, cada vez menos hasta 1,5° de él. Recortado por el
# color, el borde salía en dientes de sierra)
GP = 2; PVa = np.zeros((GE * GP, GA * GP)); PVn = np.zeros_like(PVa); ja = (az * GP).astype(int) % (GA * GP); je = np.clip(((el + 90) * GP).astype(int), 0, GE * GP - 1)
np.add.at(PVa, (je, ja), pelo_viejo & ~TO); np.add.at(PVn, (je, ja), 1)
PVg = np.where(PVn > 0, PVa / np.maximum(PVn, 1), 0)
PVg = np.asarray(Image.fromarray((PVg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(GP * 0.8))).astype(np.float32) / 255
suelto = np.clip(PVg[je, ja] * 1.6, 0, 1)
fundir = np.where(pelo_viejo, 1.0, suelto)
pintar_piel = (h < 1) & (fundir > 0.01) & ~protegido & (el > borde - 40) & ~(TO & ~TP & ~no_piel)
w = ((1 - h) * fundir)[pintar_piel][:, None]
nuevo[pintar_piel] = nuevo[pintar_piel] * (1 - w) + skin[pintar_piel] * w
# ---- la cara de chica (en la vista de frente: x, y en fracción) ----
import json
MODELO = os.environ.get('MODELO', 'osasuna'); PAR = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parpados.json')))[MODELO]
fx, fy, fz = F[:, 0], F[:, 1], F[:, 2]; ax = np.abs(fx); delante = fz > 0.02
def ss(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
lid = sorted([q for q in PAR[0] if q[2] > -1], key=lambda q: abs(q[0])); lx = np.array([abs(q[0]) for q in lid]); ly = np.array([q[1] for q in lid])
ly = np.convolve(np.pad(ly, 2, mode='edge'), np.ones(5) / 5, mode='valid')
# relleno de piel en la vista de frente: una rejilla (cada 0,0008) con el color de la piel que se queda, que se extiende
# hacia lo que se quita (como quien pasa el pulgar desde la piel de al lado): sin parches de otro tono
GX0, GY0, GS = -0.135, 0.70, 0.0008; GW, GH = int(0.27 / GS), int(0.2 / GS)
def rellenar(quitar, valido):
    gi = ((fx - GX0) / GS).astype(int); gj = ((fy - GY0) / GS).astype(int); ok = (gi >= 0) & (gi < GW) & (gj >= 0) & (gj < GH) & delante
    acc = np.zeros((GH, GW, 3)); cn = np.zeros((GH, GW)); m = ok & valido & ~quitar
    np.add.at(acc, (gj[m], gi[m]), nuevo[m]); np.add.at(cn, (gj[m], gi[m]), 1)
    have = cn > 0; G2 = np.where(have[..., None], acc / np.maximum(cn, 1)[..., None], 0)
    for _ in range(300):
        sh = [np.roll(G2, 1, 1), np.roll(G2, -1, 1), np.roll(G2, 1, 0), np.roll(G2, -1, 0)]
        hv = [np.roll(have, 1, 1), np.roll(have, -1, 1), np.roll(have, 1, 0), np.roll(have, -1, 0)]
        s_ = sum(a_ * h_[..., None] for a_, h_ in zip(sh, hv)); n_ = sum(h_.astype(float) for h_ in hv)
        nv = ~have & (n_ > 0); G2[nv] = s_[nv] / n_[nv][:, None]; have = have | nv
        if have.all(): break
    # (suavizado solo de lo rellenado: la piel que queda, tal cual)
    Gs = G2.copy()
    for _ in range(6): Gs = (Gs + np.roll(Gs, 1, 0) + np.roll(Gs, -1, 0) + np.roll(Gs, 1, 1) + np.roll(Gs, -1, 1)) / 5
    return np.where(ok[:, None], Gs[np.clip(gj, 0, GH - 1), np.clip(gi, 0, GW - 1)], nuevo)
# 1. las cejas del chico, la sombra del flequillo que Meshy pintó en la frente y lo que quede del pelo viejo, fuera:
# toda la frente, del párpado (su raya arqueada llega a y 0,82) al nacimiento, de la piel limpia de alrededor
# (el borde: la raya del párpado medida en cada modelo, de los dos ojos, algo por encima; por fuera del ojo, bajando un
# poco, que la cola de la ceja vieja bajaba más)
Y_PARP = float(os.environ.get('Y_PARP', '0.007'))
_lid = sorted([(abs(q[0]), q[1]) for ojo in PAR for q in ojo if q[2] > -1]); _lx = np.array([a for a, b in _lid]); _ly = np.array([b for a, b in _lid])
_ly = np.convolve(np.pad(_ly, 3, mode='edge'), np.ones(7) / 7, mode='valid')
y_parp = np.interp(ax, _lx, _ly) + Y_PARP - 0.45 * np.clip(ax - _lx[-1], 0, None)
y_parp = np.minimum(y_parp, 0.824 - 0.010 * ss(0.072, 0.096, ax))
lum = nuevo @ np.array([0.3, 0.59, 0.11]); sat = (nuevo.max(1) - nuevo.min(1)) / np.maximum(nuevo.max(1), 1e-3)
pielc = (nuevo.max(1) > 0.55) & (nuevo[:, 0] > nuevo[:, 2] + 0.05) & (sat > 0.1) & (sat < 0.45)
FR = delante & (ax < 0.118) & (fy > y_parp) & (h < 0.7)
med = np.median(lum[FR & pielc & (fy > 0.86)]) if (FR & pielc & (fy > 0.86)).any() else np.median(lum[FR & pielc])
_ref = FR & pielc & (fy > 0.86); medc = np.median(nuevo[_ref if _ref.any() else (FR & pielc)], axis=0)
# (también por el color: las sombras rosadas que Meshy pintó en la frente tienen el mismo brillo y se quedaban)
limpia = pielc & (np.abs(lum - med) < 0.035) & (np.abs(nuevo - medc).sum(1) < 0.07)
kb = ss(y_parp, y_parp + 0.004, fy) * (1 - ss(0.112, 0.118, ax)) * delante * (1 - h)
# (y, del rabillo del ojo a la sien, las rayas oscuras que pintó Meshy alargando el ojo hacia la patilla del chico)
x_fin = max(abs(q[0]) for ojo in PAR for q in ojo if q[2] > -1)
sien = delante & (ax > x_fin + 0.006) & (ax < 0.14) & (fy > 0.772) & (fy < y_parp + 0.012) & (lum < med - 0.12) & (h < 0.5)
quitar = FR | sien      # (toda la frente, lisa: la sombra pintada del flequillo dejaba manchas)
rell = rellenar(quitar, pielc & (np.abs(lum - med) < 0.08) & ~quitar | (FR & limpia))
kq = np.where(FR, kb, np.where(sien, 1 - h, 0))
nuevo = nuevo * (1 - kq[:, None]) + rell * kq[:, None]
# (y por el lado, de la sien a la patilla, donde la vista de frente no llega: las rayas oscuras que quedan, de la piel
# de alrededor, por dirección; ni las pestañas pintadas, ni la cola de la ceja, ni la oreja)
lum2 = nuevo @ np.array([0.3, 0.59, 0.11])
lado = (ax > max(x_fin + 0.009, 0.1)) & (fy > 0.772) & (h < 0.6) & (lum2 < med - 0.10) & ~protegido & ~TO & (el < borde)
wl = (1 - h[lado])[:, None]
nuevo[lado] = nuevo[lado] * (1 - wl) + skin[lado] * wl
# 2. cejas finas y arqueadas, del color del pelo, con el borde suave y un poco de veta de pelo
def ceja_y(x):
    t = np.clip((x - 0.024) / (0.094 - 0.024), 0, 1); return 0.834 + 0.012 * np.sin(np.pi * np.clip(t * 1.15, 0, 1)) ** 0.8 - 0.004 * t
t_c = np.clip((ax - 0.024) / (0.094 - 0.024), 0, 1)
# (más gruesa en el primer tercio, fina en la cola y redondeada en la punta de dentro)
grosor_c = (0.0050 * np.sin(np.pi * np.clip(0.12 + t_c * 0.95, 0, 1)) ** 0.55 * (1 - 0.55 * t_c) + 0.0012) * ss(0.0, 0.08, t_c + 0.02)
dc = np.abs(fy - ceja_y(ax)) - grosor_c * 0.5
veta = 0.86 + 0.14 * np.sin(fx * 700 + np.sin(fy * 900) * 2)
kc = (1 - ss(-0.0006, 0.0010, dc)) * ss(0.021, 0.027, ax) * (1 - ss(0.090, 0.098, ax)) * delante * veta
COL_CEJA = np.array([0.32, 0.19, 0.12])
nuevo = nuevo * (1 - 0.9 * kc[:, None]) + COL_CEJA * 0.9 * kc[:, None]
# 3. las pestañas, pintadas: la raya del párpado de arriba más gruesa hacia fuera, que se alarga un poco hacia la sien
# subiendo, y tres pestañas sueltas en el rabillo, curvadas hacia arriba y hacia fuera (en 3D, unas tiras finas sobre
# un párpado medido a saltos salían a trozos y cruzaban el blanco del ojo)
PEST = float(os.environ.get('PEST_Y', '0.0006'))
x_in, x_out = lx[0], lx[-1]; t_l = np.clip((ax - x_in) / (x_out - x_in), 0, 1)
yc = np.interp(ax, lx, ly) + PEST + 0.32 * np.clip(ax - x_out, 0, None)
gr = (0.0012 + 0.0020 * t_l ** 1.3) * (1 - ss(x_out + 0.002, x_out + 0.0065, ax))
dl = np.abs(fy - yc) - gr * 0.5
kr = (1 - ss(-0.0003, 0.0005, dl)) * ss(x_in + 0.001, x_in + 0.004, ax) * delante
for t0, L_ in ((0.70, 0.0042), (0.83, 0.0054), (0.95, 0.0062)):
    x0 = x_in + t0 * (x_out - x_in); y0 = np.interp(x0, lx, ly) + PEST + 0.0008
    q = np.linspace(0, 1, 12); px_ = x0 + L_ * (0.45 * q + 0.25 * q * q); py_ = y0 + L_ * (0.9 * q - 0.25 * q * q)
    for a_ in range(11):
        # (cada tramo de la pestaña: la distancia a él, con el grosor que se afina hacia la punta)
        ax_, ay_, bx_, by_ = px_[a_], py_[a_], px_[a_ + 1], py_[a_ + 1]; vx, vy = bx_ - ax_, by_ - ay_
        u_ = np.clip(((ax - ax_) * vx + (fy - ay_) * vy) / (vx * vx + vy * vy), 0, 1); dd = np.hypot(ax - (ax_ + u_ * vx), fy - (ay_ + u_ * vy))
        w_ = 0.0006 * (1 - 0.75 * (a_ + u_) / 11)
        kr = np.maximum(kr, (1 - ss(w_ - 0.00025, w_ + 0.00035, dd)) * delante)
nuevo = nuevo * (1 - kr[:, None]) + np.array([0.075, 0.045, 0.04]) * kr[:, None]
# 4. los labios: color rosado suave en el de abajo y una línea fina arriba, con un brillo pequeño
BOCA = json.loads(os.environ.get('BOCA', '{"ancho": 0.047, "medio": 0.7265, "esquina": 0.737}'))
yb = BOCA['medio'] + (BOCA['esquina'] - BOCA['medio']) * (ax / BOCA['ancho']) ** 2
k_abajo = delante * ss(yb - 0.0068, yb - 0.004, fy) * (1 - ss(yb - 0.0014, yb - 0.0002, fy)) * (1 - ss(0.016, 0.026, ax))
k_arriba = delante * ss(yb + 0.0004, yb + 0.0012, fy) * (1 - ss(yb + 0.0022, yb + 0.0034, fy)) * (1 - ss(0.018, 0.027, ax))
LAB = np.array([0.78, 0.40, 0.42])
kl = np.clip(k_abajo * 0.36 + k_arriba * 0.24, 0, 1)
nuevo = nuevo * (1 - kl[:, None]) + LAB * kl[:, None]
brillo = delante * np.exp(-(((fy - (yb - 0.0042)) / 0.0011) ** 2 + ((ax - 0.006) / 0.006) ** 2)) * 0.16
nuevo = np.clip(nuevo + brillo[:, None], 0, 1)
kp = kr
OUT[Y, X] = nuevo * 255
print('texeles', len(X), 'pelo', int(pintar_pelo.sum()), 'piel', int(pintar_piel.sum()), 'ceja', int((kc > 0.5).sum()), 'pestañas', int((kp > 0.5).sum()))
# ---- márgenes de las piezas de la textura: los texeles de fuera que rodean a uno cambiado toman su color ----
ch = np.zeros((TH, TW), bool); ch[Y, X] = np.abs(OUT[Y, X] - TEX[Y, X]).sum(1) > 3
cub = np.zeros((TH, TW), bool)
for t in mesh.loop_triangles:
    tx = np.array([[uvl[l].uv.x * TW, (1 - uvl[l].uv.y) * TH] for l in t.loops]); a, b, c = tx
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-9: continue
    X0, Y0 = np.clip(np.floor(tx.min(0)).astype(int), 0, [TW - 1, TH - 1]); X1, Y1 = np.clip(np.ceil(tx.max(0)).astype(int), 0, [TW - 1, TH - 1])
    gx, gy = np.meshgrid(np.arange(X0, X1 + 1) + 0.5, np.arange(Y0, Y1 + 1) + 0.5)
    l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den; l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den
    cub[Y0:Y1 + 1, X0:X1 + 1] |= (l0 >= -0.01) & (l1 >= -0.01) & (1 - l0 - l1 >= -0.01)
# (todo el margen de fuera de las piezas, rehecho desde la pieza más cercana: así cada borde se mezcla con su propio
# color al filtrar la textura, también en los niveles pequeños; desde lo cambiado solo, se colaba el de otra pieza)
colr = OUT.copy(); have = cub.copy()
# (y de cada texel de margen, si le llega color de algo repintado: solo esos van a la capa del juego)
fuente = (np.abs(OUT - TEX).max(2) > 0.5) & cub
for _ in range(48):
    acc = np.zeros_like(colr); cn = np.zeros(have.shape, np.float32); fa = np.zeros(have.shape, bool)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        hs = np.roll(np.roll(have, dy, 0), dx, 1); cs = np.roll(np.roll(colr, dy, 0), dx, 1); acc += cs * hs[..., None]; cn += hs
        fa |= hs & np.roll(np.roll(fuente, dy, 0), dx, 1)
    nv = (~have) & (cn > 0)
    if not nv.any(): break
    colr[nv] = acc[nv] / cn[nv][:, None]; have |= nv; fuente |= nv & fa
OUT[~cub & have & fuente] = colr[~cub & have & fuente]
guardar_png(OUT, out)
# (y qué texeles cambian, para el juego: tools/chicas/parche.mjs pone solo eso encima de la textura del chico)
# (lo repintado y, de los márgenes, solo los que rodean a lo repintado: los demás márgenes también se rehicieron, pero
# junto a piezas que no cambian dan lo mismo y harían la capa del juego mucho más grande)
ch = (np.abs(OUT - TEX).max(2) > 0.5) & cub
mask = ch | (fuente & ~cub & (np.abs(OUT - TEX).max(2) > 0.5))
guardar_png(np.repeat((mask * 255)[..., None], 3, 2).astype(np.float32), out.replace('.png', '-mascara.png')); print('máscara', int(mask.sum()))
# (y, de eso, lo que es el castaño liso de debajo del pelo: el juego lo rellena de un color, sin imagen)
BASE = CAST * 255
liso = mask & (np.abs(OUT - BASE).max(2) < 1.0)
guardar_png(np.repeat((liso * 255)[..., None], 3, 2).astype(np.float32), out.replace('.png', '-liso.png')); print('liso', int(liso.sum()))
# (vista de frente de la cara, plana, con una rejilla cada 0,01 de la altura: para medir dónde van cejas, ojos y boca)
if os.environ.get('FRENTE'):
    S = 2400; img = np.full((S, S, 3), 40, np.float32); zb = np.full((S, S), -9.0)
    x0, y0, sz = -0.15, 0.68, 0.30
    fr = F[:, 2] > -0.02; ix = ((F[fr, 0] - x0) / sz * S).astype(int); iy = ((1 - (F[fr, 1] - y0) / sz) * S).astype(int); ok = (ix >= 0) & (ix < S) & (iy >= 0) & (iy < S)
    ix, iy, zz, cc = ix[ok], iy[ok], F[fr, 2][ok], OUT[Y[fr][ok], X[fr][ok]]
    o = np.argsort(zz); img[iy[o], ix[o]] = cc[o]
    for g in range(31):
        p_ = int(g / 30 * S); img[:, p_:p_ + 2] = (80, 200, 255) if g % 5 == 0 else (60, 90, 120); img[p_:p_ + 2, :] = (80, 200, 255) if g % 5 == 0 else (60, 90, 120)
    guardar_png(img[::2, ::2], os.environ['FRENTE'])
print('HECHO', out)
salir()
