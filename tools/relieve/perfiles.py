# Perfiles reales del relieve para la vista de los prismáticos y para el horizonte de los pueblos.
#
# Con las teselas de relieve de SRTM y GMTED2010 (USGS, dominio público; ver descargar.sh) se calcula, desde cada
# mirador, qué se ve en cada dirección: rayo a rayo, el ángulo de elevación del terreno (con la curvatura de la Tierra y
# la refracción del aire) y su máximo acumulado según la distancia («lo más alto que se ve hasta aquí»). Eso, en unas
# cuantas distancias, basta para dibujar el paisaje tal como se ve desde ese punto: las siluetas de cada término de
# sierras, una detrás de otra. De cada monte de la misión se guarda además su silueta fina y su cumbre con la altitud
# real (el relieve de 450 m por píxel la rebaja), y solo entran los montes que de verdad se ven desde el mirador.
# Para el horizonte de cada pueblo, lo más alto que se ve más allá de 2,5 km, grado a grado.
#
# Uso: python3 -I tools/relieve/perfiles.py <carpeta de teselas> <raíz del proyecto> <salida .js>
import sys, json, math, zlib, base64, re, os
import numpy as np
from PIL import Image

TILES, ROOT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
Z, X0, X1, Y0, Y1 = 8, 125, 128, 93, 95
R, K = 6371.0, 0.13   # radio de la Tierra (km) y coeficiente de refracción

# --- mosaico de alturas (m) ---
ok_src = re.compile(r'^(srtm|gmted|etopo1)/')
H = np.zeros(((Y1 - Y0 + 1) * 256, (X1 - X0 + 1) * 256), np.float32)
for x in range(X0, X1 + 1):
    for y in range(Y0, Y1 + 1):
        hdr = open(os.path.join(TILES, f'{Z}-{x}-{y}.txt'), encoding='latin-1').read()
        srcs = [s.strip() for m in re.findall(r'x-amz-meta-x-imagery-sources:\s*(.*)', hdr, re.I) for s in m.split(',')]
        bad = [s for s in srcs if not ok_src.match(s)]
        if not srcs or bad: sys.exit(f'tesela {x},{y}: fuentes no previstas {bad or "(ninguna)"}')
        im = np.asarray(Image.open(os.path.join(TILES, f'{Z}-{x}-{y}.png')).convert('RGB'), np.float32)
        H[(y - Y0) * 256:(y - Y0 + 1) * 256, (x - X0) * 256:(x - X0 + 1) * 256] = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
H = np.maximum(H, 0)   # el mar, a su nivel

def pix(lat, lon):
    n = 256 * 2 ** Z
    gx = (lon + 180) / 360 * n
    la = np.radians(lat)
    gy = (1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * n
    return gx - X0 * 256 - 0.5, gy - Y0 * 256 - 0.5

def elev(lat, lon):
    px, py = pix(np.asarray(lat, np.float64), np.asarray(lon, np.float64))
    x0 = np.clip(np.floor(px).astype(int), 0, H.shape[1] - 2); y0 = np.clip(np.floor(py).astype(int), 0, H.shape[0] - 2)
    fx = np.clip(px - x0, 0, 1); fy = np.clip(py - y0, 0, 1)
    a = H[y0, x0]; b = H[y0, x0 + 1]; c = H[y0 + 1, x0]; d = H[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def offset(lat0, lon0, b, r):   # punto a r km en el rumbo b (rad), en el plano local (igual que el juego)
    return lat0 + np.degrees(r * np.cos(b) / R), lon0 + np.degrees(r * np.sin(b) / (R * math.cos(math.radians(lat0))))

def rel(lat0, lon0, lat, lon):   # igual que rel() de src/data/miradores.js
    dy = math.radians(lat - lat0) * R; dx = math.radians(lon - lon0) * R * math.cos(math.radians(lat0))
    return math.hypot(dx, dy), (math.degrees(math.atan2(dx, dy)) + 360) % 360

def angle(h, r, h0):   # ángulo de elevación (grados) de un punto de altura h a r km, visto desde la altura h0
    return np.degrees(np.arctan((h - h0 - r * r * (1 - K) / (2 * R) * 1000) / (r * 1000)))

# --- pueblos ---
SET = json.load(open(os.path.join(ROOT, 'src/data/settlements.json'), encoding='utf-8'))
MTS = json.load(open(os.path.join(ROOT, 'src/data/mountains.json'), encoding='utf-8'))
EXTRA = [dict(id='moncayo', altitude=2314, lat=41.787, lon=-1.839), dict(id='anie', altitude=2504, lat=42.946, lon=-0.717)]
src = open(os.path.join(ROOT, 'src/data/levels.js'), encoding='utf-8').read()
LEVELS = [dict(id=m.group(1), name=m.group(2), mapName=(re.search(r"mapName: '([^']*)'", m.group(0)) or [None, None])[1],
               relief=(re.search(r"relief: '([^']*)'", m.group(0)) or [None, None])[1])
          for m in re.finditer(r"\{ id: '([^']+)', name: '([^']+)'[^\n]*", src)]
mir = re.search(r'MIRADOR_TOWNS = \{([^}]*)\}', open(os.path.join(ROOT, 'src/data/miradores.js'), encoding='utf-8').read()).group(1)
MIR = re.findall(r"'?([a-z-]+)'?:", mir)
hz = open(os.path.join(ROOT, 'src/data/horizonte.js'), encoding='utf-8').read()
ALT = {k: float(v) for k, v in re.findall(r"'?([a-z-]+)'?: (\d+)", re.search(r'const ALT = \{([^}]*)\}', hz).group(1))}
COORD = {k: (float(a), float(b)) for k, a, b in re.findall(r"'?([a-z-]+)'?: \[([-\d.]+), ([-\d.]+)\]", re.search(r'const COORD = \{([^}]*)\}', hz).group(1))}
norm = lambda s: re.sub(r'[^a-z]', '', ''.join(c for c in __import__('unicodedata').normalize('NFD', s.lower()) if not __import__('unicodedata').combining(c)))
first = lambda n: n.split(' /')[0].split('-')[0].strip().lower()

def town_ll_mirador(lv):   # como townLatLon() de miradores.js
    names = [norm(x) for x in (lv['mapName'] or lv['name']).split('/')]
    hit = next((s for s in SET if norm(s[2]) in names), None) or next((s for s in SET if norm(s[2]).startswith(names[0])), None)
    return (hit[0], hit[1]) if hit else None

def town_ll_horizon(lv):   # como skylineFor() de horizonte.js
    if lv['id'] in COORD: return COORD[lv['id']]
    hit = next((s for s in SET if first(s[2]) == first(lv['name'])), None)
    return (hit[0], hit[1]) if hit else None

# --- rayos ---
EDGES = json.loads(os.environ.get('EDGES', '[0.3, 1, 2.5, 5, 9, 15, 25, 40, 65, 115]'))   # km: los términos del paisaje
rs = [0.25]
while rs[-1] < 118: rs.append(rs[-1] + max(0.08, rs[-1] * 0.01))
RS = np.array(rs)
UNIT, HUNIT, HSTEP = float(os.environ.get('UNIT', 0.04)), float(os.environ.get('HUNIT', 0.08)), float(os.environ.get('HSTEP', 2))   # grados por unidad (vista del mirador y horizonte del pueblo) y grados entre rumbos del horizonte
EPS = float(os.environ.get('EPS', 5))   # (cerca no hace falta tanta precisión: unos metros)
UNITS = [round(max(UNIT, math.degrees(math.atan(EPS / (e * 1000)))), 3) for e in EDGES]

def rays(lat0, lon0, h0, bear_deg):   # máximo acumulado del ángulo a lo largo de cada rayo: [rumbos, distancias]
    b = np.radians(np.asarray(bear_deg, np.float64))[:, None]
    la, lo = offset(lat0, lon0, b, RS[None, :])
    return np.maximum.accumulate(angle(elev(la, lo), RS[None, :], h0), axis=1)

def at_r(M, r):   # el máximo acumulado hasta r km
    return M[:, min(len(RS) - 1, int(np.searchsorted(RS, r)))]

def varint(v, out):
    while True:
        b = v & 127; v >>= 7
        if v: out.append(b | 128)
        else: out.append(b); return

def zz(v, out): varint((-v << 1) - 1 if v < 0 else v << 1, out)

def deltas(q, out):   # cada valor respecto al anterior
    pv = 0
    for v in q: zz(int(v) - pv, out); pv = int(v)

blob = bytearray(); towns = {}; report = []
for lv in LEVELS:
    if lv['id'] not in MIR: continue
    ll = town_ll_mirador(lv)
    if not ll: report.append(f"{lv['id']}: sin coordenadas"); continue
    lat0, lon0 = ll
    # el mirador: el punto más alto cerca del pueblo (en los valles, en la ladera; en Pamplona, en la muralla)
    # (sin subir más de unas decenas de metros sobre el pueblo: el mirador está a un paseo)
    rad_km, cap = {'hilltop': (1.0, 999), 'valley': (0.9, 70)}.get(lv['relief'], (0.6, 45)) if lv['id'] != 'pamplona' else (0.3, 30)
    e0 = float(elev(lat0, lon0)); best = (e0, lat0, lon0)
    for rr in np.linspace(0.1, rad_km, 8):
        for bb in np.radians(np.arange(0, 360, 10)):
            la, lo = offset(lat0, lon0, bb, rr); e = float(elev(la, lo))
            if best[0] < e <= e0 + cap: best = (e, float(la), float(lo))
    h0 = best[0] + 12; elat, elon = best[1], best[2]
    M = rays(elat, elon, h0, np.arange(0, 360, 1.0))
    base = np.stack([at_r(M, e) for e in EDGES], 1)   # [360, 12] grados
    # montes que se ven: la cumbre (a su altitud real) por encima de lo que tiene delante, sin contar sus propias faldas
    cand = []
    for m in MTS + EXTRA:
        if not m.get('lat'): continue
        km, bear = rel(elat, elon, m['lat'], m['lon'])
        if not (4 < km < (110 if m['altitude'] > 2000 else 60)): continue
        ths = float(angle(m['altitude'], km, h0))
        if ths < -0.3: continue   # (los que quedan por debajo del mirador no destacan)
        Mm = rays(elat, elon, h0, [bear])[0]
        body = min(3.5, max(1.2, km * 0.3)) if km < 15 else max(1.2, km * 0.06)
        front = float(Mm[max(0, int(np.searchsorted(RS, km - body)) - 1)])
        cand.append(dict(m=m, km=km, bear=bear, ths=ths, clear=ths - front))
    vis = [c for c in cand if c['clear'] > 0.12]
    vis.sort(key=lambda c: -(c['m']['altitude'] / math.sqrt(c['km'])) * min(1, c['clear'] / 0.6))
    pick = []
    apart = lambda c: not any(abs(((p['bear'] - c['bear'] + 540) % 360) - 180) < 22 for p in pick)
    for c in vis:
        if len(pick) >= 5: break
        if apart(c): pick.append(c)
    # en el fondo de un valle se ven pocos: se completan con los que asoman casi (el relieve de 450 m rebaja las cumbres)
    for c in sorted([c for c in cand if -1.0 < c['clear'] <= 0.12], key=lambda c: -c['clear']):
        if len(pick) >= 3: break
        if apart(c): pick.append(c)
    off = len(blob)
    for k in range(len(EDGES)): deltas(np.round(base[:, k] / UNITS[k]).astype(int), blob)   # por términos; cada uno, rumbo a rumbo
    mts = []
    for c in pick:   # silueta fina de cada monte, con la cumbre a su altitud real
        km = c['km']; st = round(min(0.4, max(0.08, math.degrees(math.atan(0.15 / km)))), 3)
        w = min(9.0, max(1.2, math.degrees(math.atan(3.0 / km)))); n = int(round(w / st))
        fa = c['bear'] + np.arange(-n, n + 1) * st
        rr = km + max(1.0, km * 0.05)
        ke = next((k for k, e in enumerate(EDGES) if e >= rr), len(EDGES) - 1)
        F = at_r(rays(elat, elon, h0, fa), EDGES[ke])
        # la cumbre, en su rumbo de verdad y a su altitud real (el relieve de 450 m la rebaja y la redondea)
        dd = c['ths'] - F[n]
        if dd > 0: F = F + dd * np.exp(-((fa - c['bear']) / max(0.2, math.degrees(math.atan(0.7 / km)))) ** 2)
        near = np.abs(fa - c['bear']) <= max(0.3, math.degrees(math.atan(0.3 / km)))
        j = int(np.argmax(np.where(near, F, -99)))
        deltas(np.round(F / UNIT).astype(int), blob)   # (la fina, siempre con la unidad más precisa)
        mts.append(dict(id=c['m']['id'], n=n, st=st, k=ke, j=j - n))
        report.append(f"  {lv['id']:22s} {c['m']['id']:22s} {km:6.1f} km  rumbo {c['bear']:6.1f}  cumbre {c['ths']:5.2f}°  despejada {c['clear']:5.2f}°  dem {dd:+.2f}°  ({2 * n + 1} × {st}°)")
    if os.environ.get('CAND') == lv['id']:
        for c in sorted(cand, key=lambda c: -c['clear'])[:14]: print(f"    cand {c['m']['id']:20s} {c['km']:5.1f} km {c['bear']:6.1f}° cumbre {c['ths']:5.2f} despejada {c['clear']:+.2f}")
    hidden = [c['m']['id'] for c in sorted(cand, key=lambda c: -c['m']['altitude'] / math.sqrt(c['km']))[:8] if c['clear'] <= 0.12]
    report.append(f"{lv['id']}: ojo {elat:.4f},{elon:.4f} a {h0:.0f} m · {len(vis)} montes visibles, elegidos {len(pick)} · tapados: {', '.join(hidden)}")
    towns[lv['id']] = dict(lat=round(elat, 5), lon=round(elon, 5), alt=round(h0), o=off, m=mts)

# horizonte de cada pueblo (lo más alto que se ve más allá de 2,5 km), grado a grado
hor = {}
i0 = int(np.searchsorted(RS, 2.5))
for lv in LEVELS:
    ll = town_ll_horizon(lv); h0 = ALT.get(lv['id'])
    if not ll or h0 is None: continue
    la, lo = offset(ll[0], ll[1], np.radians(np.arange(0, 360, HSTEP))[:, None], RS[None, i0:])
    sk = np.max(angle(elev(la, lo), RS[None, i0:], h0 + 10), axis=1)
    hor[lv['id']] = len(blob)
    deltas(np.round(np.maximum(sk, -2) / HUNIT).astype(int), blob)

if os.environ.get('PARTES'):
    for name, a, b in [('miradores', 0, min(hor.values()))]: print(name, b - a, len(zlib.compress(bytes(blob[a:b]), 9)))
    print('horizontes', len(blob) - min(hor.values()), len(zlib.compress(bytes(blob[min(hor.values()):]), 9)))
raw = bytes(blob)
co = zlib.compressobj(9, zlib.DEFLATED, -15); z = co.compress(raw) + co.flush()
b64 = base64.b64encode(z).decode()
meta = dict(edges=EDGES, units=UNITS, fu=UNIT, hunit=HUNIT, hstep=HSTEP, towns=towns, hor=hor)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// Relieve real visto desde los miradores y horizonte real de los pueblos. Lo calcula tools/relieve/perfiles.py con\n')
    f.write('// el relieve de SRTM y GMTED2010 (U.S. Geological Survey, dominio público). Datos comprimidos (deflate y base64).\n')
    f.write('export const RELIEVE = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
    f.write("export const RELIEVE_DATA = '" + b64 + "';\n")
print('\n'.join(report))
print(f'bytes sin comprimir {len(raw)}, comprimidos {len(z)}, base64 {len(b64)}, archivo {os.path.getsize(OUT)}')
