# Relieve de detalle alrededor de cada mirador, para la vista de los prismáticos.
#
# Las alturas reales del terreno en una malla polar centrada en el ojo del mirador: rumbos cada cuarto de grado entre 6 y
# 30 km (cada grado al pie del mirador y cada medio grado en medio y más lejos) y anillos cada vez más separados con la
# distancia (25 m al pie del mirador, un 1,1 % de la distancia hasta 30 km y un 1,8 % más allá, hasta 110 km). Así el
# juego dibuja las laderas, los lomos, los barrancos y las cumbres tal como son, y no solo la silueta de cada sierra. Las teselas («terrarium» de AWS Terrain Tiles; descargar-detalle.sh) salen de EU-DEM (Copernicus),
# SRTM, GMTED2010 y ETOPO1: se usa la más fina cerca (unos 28 m por píxel hasta 6 km, 56 m hasta 25 km y 112 m más
# lejos) y se comprueba la fuente de cada una.
#
# Cada altura se guarda con la precisión que hace falta a su distancia (medio metro cerca, unos metros lejos), como
# diferencia con lo que se espera de sus vecinas ya guardadas (la del rumbo anterior más lo que sube la del anillo de
# antes); luego comprimido (deflate y base64), un archivo por mirador (el juego solo abre el del pueblo en el que está).
#
# Uso: python3 -I tools/relieve/polar.py <carpeta de teselas> <relieve.js> <carpeta de salida: src/data/polar>
# (con LISTA=1, solo escribe las teselas que hacen falta: sh tools/relieve/descargar-detalle.sh las baja)
import sys, json, math, re, os, zlib, base64
import numpy as np
from PIL import Image

TILES, RELJS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
REL = json.loads(re.search(r'export const RELIEVE = (\{[\s\S]*?\});\n', open(RELJS, encoding='utf-8').read()).group(1))
ok_src = re.compile(r'^(eudem|srtm|gmted|etopo1)/')
NB = int(os.environ.get('NB', 1440))
RMAX = float(os.environ.get('RMAX', 110))
ZOOMS = ((12, 6.0, 7.0), (11, 25.0, 27.0), (10, RMAX + 5, RMAX + 5))   # (zoom, hasta km, se funde con la siguiente hasta km)

def rings():   # (más allá de 30 km, algo más separados: allí la bruma ya no deja ver tanto)
    r, out = 0.1, []
    while r <= RMAX: out.append(r); r += max(0.025, r * (0.011 if r < 30 else 0.018))
    return np.array(out)

QK = float(os.environ.get('QK', 0.3))
def quantum(r):   # metros por unidad a r km (0,3 m por km: ni medio píxel con los prismáticos)
    return float(np.clip(r * QK, 0.5, 10.0))

def nbear(r):   # rumbos del anillo: cerca, con menos basta (a 1 km, un grado son 17 m y el relieve más fino es de 28 m)
    return NB // 4 if r < 1.5 else NB // 2 if r < 6 or r >= 30 else NB

cache, need = {}, set()
LISTA = os.environ.get('LISTA')   # (solo la lista de teselas que hacen falta, para descargar-detalle.sh)
def tile(z, x, y):
    k = (z, x, y)
    if LISTA: need.add(k); return np.zeros((256, 256), np.float32)
    if k not in cache:
        p = os.path.join(TILES, f'{z}-{x}-{y}')
        hdr = open(p + '.txt', encoding='latin-1').read()
        srcs = [s.strip() for m in re.findall(r'x-amz-meta-x-imagery-sources:\s*(.*)', hdr, re.I) for s in m.split(',')]
        bad = [s for s in srcs if not ok_src.match(s)]
        if not srcs or bad: sys.exit(f'tesela {z}/{x}/{y}: fuentes no previstas {bad or "(ninguna)"}')
        im = np.asarray(Image.open(p + '.png').convert('RGB'), np.float32)
        cache[k] = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
    return cache[k]

def elev(z, lat, lon):   # bilineal en el mosaico de ese zoom (las teselas que hagan falta)
    n = 256 * 2 ** z
    gx = (lon + 180) / 360 * n - 0.5
    la = np.radians(lat); gy = (1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * n - 0.5
    x0 = np.floor(gx).astype(np.int64); y0 = np.floor(gy).astype(np.int64); fx = gx - x0; fy = gy - y0
    def at(px, py):
        out = np.empty(px.shape, np.float32)
        tx, ty = px // 256, py // 256
        for (a, b) in set(zip(tx.ravel().tolist(), ty.ravel().tolist())):
            m = (tx == a) & (ty == b)
            out[m] = tile(z, a, b)[py[m] - b * 256, px[m] - a * 256]
        return out
    h = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy
    return np.maximum(h, 0)

def grid(lat0, lon0):   # alturas de cada anillo, rumbo a rumbo (m)
    RS = rings(); H = []
    for j, r in enumerate(RS):
        b = np.radians(np.arange(nbear(r)) * 360 / nbear(r)); H.append(np.zeros(len(b), np.float32))
        lat = lat0 + np.degrees(r * np.cos(b) / 6371.0); lon = lon0 + np.degrees(r * np.sin(b) / (6371.0 * math.cos(math.radians(lat0))))
        for k, (z, r1, r2) in enumerate(ZOOMS):
            if r <= r1: H[j][:] = elev(z, lat, lon); break
            if r < r2:   # (entre dos zooms, mezclados: sin escalón)
                t = (r - r1) / (r2 - r1); z2 = ZOOMS[k + 1][0]
                H[j][:] = elev(z, lat, lon) * (1 - t) + elev(z2, lat, lon) * t; break
    return RS, H

def varint(v, out):
    while True:
        b = v & 127; v >>= 7
        if v: out.append(b | 128)
        else: out.append(b); return

def up(a, n):   # un anillo con n rumbos a partir de otro con menos (interpolado)
    if len(a) == n: return a
    x = np.arange(n) * len(a) / n; i = np.floor(x).astype(int); f = x - i
    return a[i % len(a)] * (1 - f) + a[(i + 1) % len(a)] * f

def encode(RS, H):   # diferencias con lo esperado, con la precisión de cada anillo (lo reconstruido es lo que verá el juego)
    # (lo esperado: como en los PNG sin pérdida, la mediana entre la vecina del rumbo anterior, la del anillo de antes y
    # lo que dan las dos juntas; así se sigue mejor un lomo o un cortado)
    out = bytearray(); rec = []
    for j in range(len(RS)):
        q = quantum(RS[j]); row = H[j].astype(np.float64); n = len(row); r = np.zeros(n)
        prev = up(rec[j - 1], n) if j else None; last = 0.0
        for i in range(n):
            if not j: pred = last
            elif not i: pred = prev[0]
            else:
                a, b_, c = last, prev[i], prev[i - 1]
                pred = min(a, b_) if c >= max(a, b_) else max(a, b_) if c <= min(a, b_) else a + b_ - c
            v = int(round((row[i] - pred) / q)); r[i] = pred + v * q; last = r[i]
            varint((-v << 1) - 1 if v < 0 else v << 1, out)
        rec.append(r)
    return out, rec

# --- el ojo del mirador ---
# El de relieve.js se eligió con el relieve grueso (450 m por píxel): con el fino, a veces queda en una hondonada o con
# una loma cercana delante de los montes de la misión. Se busca, a menos de 1,2 km y sin subir más de 200 m sobre él
# (en un valle cerrado, hasta 3 km y 500 m), el punto (a 10 m del suelo, como en un mirador) desde el que mejor se ven
# todos los montes de la misión, sin alejarse sin necesidad.
MT = {m['id']: m for m in json.load(open(os.path.join(os.path.dirname(RELJS), 'mountains.json'), encoding='utf-8'))}
MT.update(moncayo=dict(lat=41.787, lon=-1.839, altitude=2314), anie=dict(lat=42.946, lon=-0.717, altitude=2504))

def ray_h(lat0, lon0, b, rs):   # alturas a lo largo de un rayo, con el zoom de cada tramo
    hs = np.zeros(len(rs))
    for z, a, c in ((12, 0, 6), (11, 6, 25), (10, 25, 999)):
        sel = (rs >= a) & (rs < c)
        if sel.any():
            lat = lat0 + np.degrees(rs[sel] * np.cos(b) / 6371.0); lon = lon0 + np.degrees(rs[sel] * np.sin(b) / (6371.0 * math.cos(math.radians(lat0))))
            hs[sel] = elev(z, lat, lon)
    return hs

def clearance(lat0, lon0, eye, m):   # grados que asoma la cumbre por encima de lo que tiene delante
    dy = math.radians(m['lat'] - lat0) * 6371.0; dx = math.radians(m['lon'] - lon0) * 6371.0 * math.cos(math.radians(lat0))
    km = math.hypot(dx, dy); b = math.atan2(dx, dy)
    rs = np.concatenate([np.arange(0.04, min(km * 0.97, 5), 0.02), np.arange(5, km * 0.97, 0.06)])
    cv = lambda r: r * r * (1 - 0.13) / (2 * 6371.0) * 1000
    ang = np.degrees(np.arctan((ray_h(lat0, lon0, b, rs) - eye - cv(rs)) / (rs * 1000)))
    return math.degrees(math.atan((m['altitude'] - eye - cv(km)) / (km * 1000))) - float(ang.max())

def best_eye(t, rmax=1.2, up=200):
    lat0, lon0 = t['lat'], t['lon']; g0 = float(elev(12, np.array([lat0]), np.array([lon0]))[0])
    ms = [MT[x['id']] for x in t['m'] if x['id'] in MT]
    best = None
    for r in np.arange(0, rmax + 0.01, 0.075):
        for bd in (np.arange(0, 360, max(4.0, math.degrees(0.075 / r))) if r else [0]):
            b = math.radians(bd)
            lat = lat0 + math.degrees(r * math.cos(b) / 6371.0); lon = lon0 + math.degrees(r * math.sin(b) / (6371.0 * math.cos(math.radians(lat0))))
            g = float(elev(12, np.array([lat]), np.array([lon]))[0])
            if g > g0 + up: continue
            eye = g + 10; cl = min(clearance(lat, lon, eye, m) for m in ms) if ms else 0
            sc = min(cl, 0.5) - 0.25 * r
            if best is None or sc > best[0]: best = (sc, lat, lon, eye, cl, r)
    # (en el fondo de un valle cerrado, más lejos y más arriba: hasta 3 km y 500 m)
    if best[4] < 0.05 and rmax < 3: best = max(best, best_eye(t, 3.0, 500), key=lambda x: x[4])
    return best

# (lo que el juego necesita para rehacer la malla y descifrar las alturas: src/world/relieve.js)
META = dict(nb=NB, qk=QK, qmin=0.5, qmax=10.0, r0=0.1, rmax=RMAX, step=0.025, f1=0.011, rsplit=30, f2=0.018, near=[1.5, 6])
if not LISTA: os.makedirs(OUT, exist_ok=True)
only = os.environ.get('SOLO'); total = 0
for tid, t in REL['towns'].items():
    if only and tid != only: continue
    if LISTA:   # (todas las teselas a la distancia de cada zoom, con 3,5 km de margen: el ojo se puede mover)
        for z, r1, r2 in ZOOMS:
            for r in np.arange(0, min(r2, RMAX) + 3.5, 0.25):
                b = np.radians(np.arange(0, 360, 0.5)); lat = t['lat'] + np.degrees(r * np.cos(b) / 6371.0); lon = t['lon'] + np.degrees(r * np.sin(b) / (6371.0 * math.cos(math.radians(t['lat']))))
                n = 256 * 2 ** z; gx = (lon + 180) / 360 * n; la = np.radians(lat); gy = (1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * n
                for x, y in set(zip((gx // 256).astype(int).tolist(), (gy // 256).astype(int).tolist())):
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1): need.add((z, x + dx, y + dy))
        continue
    sc, t['lat'], t['lon'], t['alt'], cl, rr = best_eye(t)
    print(f'{tid:22s} ojo a {rr:.2f} km del de antes, a {t["alt"]:.0f} m · el monte que menos asoma, {cl:+.2f}°', flush=True)
    RS, H = grid(t['lat'], t['lon'])
    data, rec = encode(RS, H)
    co = zlib.compressobj(9, zlib.DEFLATED, -15); z = co.compress(bytes(data)) + co.flush()
    b64 = base64.b64encode(z).decode(); total += len(z)
    err = max(float(np.abs(a - b).max()) for a, b in zip(rec, H))
    with open(os.path.join(OUT, f'{tid}.js'), 'w', encoding='utf-8') as f:
        f.write('// Relieve de detalle alrededor del mirador (alturas reales en malla polar): tools/relieve/polar.py, con EU-DEM\n')
        f.write('// (Copernicus), SRTM y GMTED2010 (U.S. Geological Survey) y ETOPO1 (NOAA). Comprimido (deflate y base64).\n')
        f.write('export default ' + json.dumps(dict(META, alt=round(t['alt'], 1), lat=round(t['lat'], 6), lon=round(t['lon'], 6), rings=len(RS)), separators=(',', ':'))[:-1] + ",\"data\":'" + b64 + "'};\n")
    print(f'{tid:22s} {len(RS)} anillos · {sum(len(h) for h in H)} alturas · {len(z)} bytes comprimidos · error máx {err:.2f} m', flush=True)
if LISTA:
    for z, x, y in sorted(need): print(z, x, y)
    sys.exit(0)
print(f'total comprimido {total}')
