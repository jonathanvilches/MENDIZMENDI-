# Del JSON crudo de un pueblo (tools/pueblo-real.py) a los datos que usa el juego (src/data/reales/<id>.json):
#  · el origen pasa al centro de verdad del pueblo (la plaza junto al ayuntamiento; si no hay, el ayuntamiento, la
#    iglesia o el sitio con más casas), porque el punto del nomenclátor a veces cae a 250 m del casco
#  · el relieve real: una rejilla de 51 × 51 alturas cada 20 m (1 km de lado) del modelo digital del terreno EU-DEM
#    (teselas «terrarium» del almacén abierto de AWS; se comprueba la fuente en la cabecera de cada tesela)
#  · los ríos y regatas como líneas, con el nivel del agua bajando siempre en el sentido de la corriente
#  · las calles y caminos con su tipo y ancho, y los tramos que son puente
#  · cada casa como un rectángulo orientado (el mínimo que la contiene), con la fachada mirando a la calle más cercana,
#    su altura (de los datos o de sus plantas) y su nombre si lo tiene
#  · la plaza, la iglesia, el ayuntamiento, el frontón, las fuentes, el cementerio y los usos del suelo (prados,
#    huertas, frutales, campos de deporte)
#  · y el relieve de alrededor, hasta 1,5 km, cada 60 m, para el anillo de montes fuera de la zona de juego
# El JSON sale compacto (versión 2: líneas con diferencias entre puntos, relieve con predicción, casas como listas de
# números; src/data/reales/index.js lo devuelve a la forma de siempre al cargarlo), porque el archivo único del juego
# no tiene sitio para el legible. Con --legible sale el de siempre, para mirarlo.
# Uso: python -I tools/pueblo-real-juego.py <crudo.json> <salida.json> [carpeta de teselas] [--legible]
# Necesita shapely, numpy y Pillow (el venv de tools/pueblo-real.py).
import sys, os, io, json, math, urllib.request
import numpy as np
from PIL import Image
from shapely.geometry import Polygon, LineString, Point, box, MultiLineString, MultiPolygon, GeometryCollection
from shapely.ops import substring, unary_union
from shapely.strtree import STRtree
from shapely.affinity import translate

HALF, STEP = 500, 20
LEGIBLE = '--legible' in sys.argv
ARGS = [a for a in sys.argv if a != '--legible']
crudo, salida = ARGS[1], ARGS[2]
teselas = ARGS[3] if len(ARGS) > 3 else os.path.join(os.path.dirname(os.path.abspath(salida)), '_teselas')
D = json.load(open(crudo))
lat0, lon0 = D['lat'], D['lon']
kx, ky = 111320 * math.cos(math.radians(lat0)), 110574
low = lambda s: (s or '').lower()

# ---------------------------------------------------------------- el centro de verdad
poly = lambda p: Polygon(p) if len(p) >= 3 else None
plazas = [(u, poly(u['p'])) for u in D['usos'] if u['poligono'] and (u['clase'] == 'plaza' or 'plaza' in low(u['nombre']))]
plazas = [(u, g) for u, g in plazas if g is not None and g.is_valid and g.area > 60]
def lugar(*claves):
    return [l for l in D['lugares'] if any(k in low(l['nombre']) for k in claves)]
# (el ayuntamiento de verdad: no la oficina de deportes o de turismo que lleva «ayuntamiento» en el nombre)
ayto = [l for l in lugar('ayuntamiento', 'udala', 'udaletxea', 'casa consistorial') if not any(k in low(l['nombre']) for k in ('deporte', 'polideportivo', 'oficina', 'servicio', 'biblioteca', 'turismo', 'escuela', 'juzgado', 'policía', 'policia', 'almacén', 'almacen'))]
ayto.sort(key=lambda l: (0 if low(l['nombre']).startswith(('ayuntamiento', 'casa consistorial')) or low(l['nombre']).endswith(('udala', 'udaletxea')) else 1, len(l['nombre'])))
edif = [(b, poly(b['p'])) for b in D['edificios']]
edif = [(b, g) for b, g in edif if g is not None and g.is_valid and g.area > 6]
iglesias = [(b, g) for b, g in edif if b['clase'] in ('church', 'chapel', 'cathedral') or any(k in low(b['nombre']) for k in ('eliza', 'iglesia', 'parroquia'))]
# (el sitio con más casas: la celda de 60 m con más edificios cerca del punto del nomenclátor)
def densa():
    best, bp = -1, (0, 0)
    for gx in range(-300, 301, 30):
        for gz in range(-300, 301, 30):
            n = sum(1 for b, g in edif if abs(g.centroid.x - gx) < 60 and abs(g.centroid.y - gz) < 60)
            if n > best: best, bp = n, (gx, gz)
    return Point(bp)
ref = Point(ayto[0]['x'], ayto[0]['z']) if ayto else (max(iglesias, key=lambda t: t[1].area)[1].centroid if iglesias else densa())
# (la plaza principal: cerca del ayuntamiento, pero una grande con nombre a 200 m gana a una placita al lado)
cand = [t for t in plazas if t[1].centroid.distance(ref) <= 220]
plaza = min(cand, key=lambda t: (t[1].centroid.distance(ref) + 15) / math.sqrt(t[1].area) * (1 if t[0]['nombre'] else 1.6)) if cand else None
O = plaza[1].centroid if plaza else ref
hueco = False
if not plaza:
    # (sin plaza en los datos, el punto del ayuntamiento o de la iglesia cae dentro del edificio: el centro pasa al hueco
    # libre más cercano, a 8 m de cualquier casa y junto a una calle, que hace de plaza)
    huellas = unary_union([g for b, g in edif])
    viales0 = unary_union([LineString(c['p']) for c in D['calles'] if c['subtipo'] == 'road' and len(c['p']) >= 2 and c['clase'] not in ('track', 'path', 'footway', 'steps', 'cycleway', 'bridleway')])
    for r in range(0, 120, 3):
        m = max(1, int(2 * math.pi * r / 3)); hit = None
        for k in range(m):
            q = Point(ref.x + r * math.cos(2 * math.pi * k / m), ref.y + r * math.sin(2 * math.pi * k / m))
            if huellas.distance(q) >= 8 and (viales0.is_empty or viales0.distance(q) <= 12): hit = q; break
        if hit: O, hueco = hit, True; break
ox, oz = round(O.x, 1), round(O.y, 1)
lat_c, lon_c = lat0 - oz / ky, lon0 + ox / kx
print('centro:', 'plaza ' + str(plaza[0]['nombre']) if plaza else ('hueco libre junto ' + ('al ayuntamiento' if ayto else 'a la iglesia o las casas') if hueco else 'ayuntamiento' if ayto else 'iglesia o casas'), (ox, oz), 'lat/lon', round(lat_c, 6), round(lon_c, 6))
mv = lambda g: translate(g, -ox, -oz)
CAJA = box(-HALF + 2, -HALF + 2, HALF - 2, HALF - 2)
r1 = lambda v: round(float(v), 1)

# ---------------------------------------------------------------- relieve (EU-DEM en teselas terrarium, nivel 13)
Z = 13
def tile_xy(lat, lon):
    n = 2 ** Z; x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y
os.makedirs(teselas, exist_ok=True); fuentes = set(); cache = {}
def tesela(tx, ty):
    if (tx, ty) in cache: return cache[(tx, ty)]
    f = os.path.join(teselas, f'{Z}-{tx}-{ty}.png'); fm = f + '.txt'
    if not os.path.exists(f) or os.path.getsize(f) == 0:   # (una descarga cortada deja el archivo vacío)
        r = urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png', timeout=60)
        datos = r.read(); open(fm, 'w').write(r.headers.get('x-amz-meta-x-imagery-sources', '')); open(f + '.tmp', 'wb').write(datos); os.replace(f + '.tmp', f)
    src = open(fm).read() if os.path.exists(fm) else ''
    for s in src.split(','):
        if s.strip(): fuentes.add(s.strip().split('/')[0])
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float64)
    cache[(tx, ty)] = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768
    return cache[(tx, ty)]
def alt(lat, lon):
    x, y = tile_xy(lat, lon); X, Y = x * 256 - 0.5, y * 256 - 0.5   # (centro del píxel)
    def px(X, Y):
        tx, ty = int(math.floor(X / 256)), int(math.floor(Y / 256))
        return tesela(tx, ty)[int(Y - ty * 256), int(X - tx * 256)]
    X0, Y0 = math.floor(X), math.floor(Y); fx, fy = X - X0, Y - Y0
    return (px(X0, Y0) * (1 - fx) * (1 - fy) + px(X0 + 1, Y0) * fx * (1 - fy) + px(X0, Y0 + 1) * (1 - fx) * fy + px(X0 + 1, Y0 + 1) * fx * fy)
n = HALF * 2 // STEP + 1
grid = np.zeros((n, n))
for j in range(n):
    for i in range(n):
        x, z = -HALF + i * STEP, -HALF + j * STEP
        grid[j, i] = alt(lat_c - z / ky, lon_c + x / kx)
alt0 = float(grid[n // 2, n // 2])
# (y otra más gruesa, cada 60 m hasta 1,5 km: el anillo de montes que se ve desde el pueblo, fuera de la zona de juego)
FAR, FSTEP = 1500, 60
n2 = FAR * 2 // FSTEP + 1
grid2 = np.zeros((n2, n2))
for j in range(n2):
    for i in range(n2):
        x, z = -FAR + i * FSTEP, -FAR + j * FSTEP
        grid2[j, i] = alt(lat_c - z / ky, lon_c + x / kx)
if fuentes and not all(f.startswith('eudem') or f.startswith('srtm') or f.startswith('gmted') for f in fuentes): print('AVISO: fuentes de relieve inesperadas', fuentes)
def hgrid(x, z):
    fi, fj = (x + HALF) / STEP, (z + HALF) / STEP
    i, j = min(max(int(fi), 0), n - 2), min(max(int(fj), 0), n - 2); a, b = fi - i, fj - j
    return (grid[j, i] * (1 - a) * (1 - b) + grid[j, i + 1] * a * (1 - b) + grid[j + 1, i] * (1 - a) * b + grid[j + 1, i + 1] * a * b) - alt0

def lineas(g):
    if g.is_empty: return []
    if isinstance(g, LineString): return [g]
    if isinstance(g, (MultiLineString, GeometryCollection)): return [x for x in g.geoms if isinstance(x, LineString) and not x.is_empty]
    return []
def poligonos(g):
    if g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if isinstance(g, (MultiPolygon, GeometryCollection)): return [x for x in g.geoms if isinstance(x, Polygon) and not x.is_empty]
    return []
pts = lambda g: [[r1(x), r1(y)] for x, y in g.coords]
ring = lambda g, tol=0.6: [[r1(x), r1(y)] for x, y in g.simplify(tol, preserve_topology=True).exterior.coords[:-1]]

# ---------------------------------------------------------------- agua
RIOS = []
for w in D['agua']:
    if w['poligono'] or w['subtipo'] not in ('river', 'stream', 'canal', 'drain', 'ditch'): continue
    for L in lineas(mv(LineString(w['p'])).intersection(CAJA)):
        if L.length < 15: continue
        # cada 4 m, con la altura del terreno; la corriente baja hacia el extremo más bajo y el nivel nunca sube
        k = max(2, int(L.length / 4)); P = [L.interpolate(i / k, normalized=True) for i in range(k + 1)]
        H = [hgrid(p.x, p.y) for p in P]
        if H[0] < H[-1]: P, H = P[::-1], H[::-1]
        lv, m = [], 1e9
        for h in H: m = min(m, h); lv.append(m)
        cls = w['clase'] or w['subtipo']
        half = 9.0 if cls == 'river' else 3.0 if (w['nombre'] and L.length > 300) else 1.6
        RIOS.append({'n': w['nombre'], 'w': half, 'pts': [[r1(p.x), r1(p.y)] for p in P], 'lv': [r1(v) for v in lv]})
BALSAS = []
for w in D['agua']:
    if not w['poligono'] or w['clase'] in ('swimming_pool',): continue
    for g in poligonos(mv(Polygon(w['p'])).intersection(CAJA)):
        if g.area > 40: BALSAS.append({'n': w['nombre'], 'pts': ring(g, 1.0)})
PISCINAS = [{'pts': ring(g, 0.4)} for w in D['agua'] if w['poligono'] and w['clase'] == 'swimming_pool' for g in poligonos(mv(Polygon(w['p'])).intersection(CAJA))]

# ---------------------------------------------------------------- calles y puentes
TIPO = { 'motorway': ('road', 4.2), 'trunk': ('road', 3.8), 'primary': ('road', 3.6), 'secondary': ('road', 3.2), 'tertiary': ('road', 3.0),
         'residential': ('street', 2.6), 'living_street': ('street', 2.3), 'pedestrian': ('street', 2.4), 'unclassified': ('street', 2.4),
         'unknown': ('street', 2.2), 'service': ('street', 1.9), 'track': ('trail', 1.8), 'path': ('trail', 1.1), 'footway': ('trail', 1.2),
         'steps': ('trail', 1.1), 'cycleway': ('trail', 1.3), 'bridleway': ('trail', 1.2) }
CALLES, PUENTES = [], []
for c in D['calles']:
    if c['subtipo'] != 'road' or len(c['p']) < 2: continue
    t, w = TIPO.get(c['clase'], ('trail', 1.4))
    g0 = mv(LineString(c['p']))
    for L in lineas(g0.intersection(CAJA)):
        if L.length >= 3: CALLES.append({'t': t, 'w': w, 'c': c['clase'], 'n': c['nombre'], 'pts': pts(L.simplify(0.4))})
    for a, b in c['puente'] or []:
        P = substring(g0, a, b, normalized=True)
        if isinstance(P, LineString) and P.length > 2 and CAJA.contains(P.centroid):
            PUENTES.append({'n': c['nombre'], 'w': max(1.6, w), 'pts': pts(P.simplify(0.3))})
viales = [LineString(c['pts']) for c in CALLES if c['t'] != 'trail' or c['c'] in ('footway', 'steps', 'path')]
arbol = STRtree(viales)

# ---------------------------------------------------------------- casas: rectángulo mínimo, fachada a la calle
def tipo_casa(b, g):
    nm, cl = low(b['nombre']), b['clase'] or ''
    if cl in ('church', 'chapel', 'cathedral') or any(k in nm for k in ('eliza', 'iglesia', 'parroquia', 'ermita', 'baseliza')): return 'church'
    if any(k in nm for k in ('pilotaleku', 'frontón', 'fronton', 'trinkete')): return 'fronton'
    if any(k in nm for k in ('udala', 'udaletxea', 'ayuntamiento')): return 'townhall'
    if any(k in nm for k in ('dorrea', 'dorretxea', 'torre')): return 'tower'
    if cl in ('industrial', 'warehouse', 'factory') or g.area > 1200: return 'industrial'
    if cl in ('school',) or (b['subtipo'] == 'education'): return 'school'
    if cl in ('roof', 'shelter', 'garage', 'garages', 'shed', 'greenhouse', 'carport') or g.area < 30: return 'shed'
    if cl in ('farm_auxiliary', 'barn', 'stable', 'cowshed') or 'borda' in nm: return 'borda'
    return 'house'
CASAS = []
for b, g0 in edif:
    g = mv(g0)
    if not CAJA.contains(g.centroid): continue
    r = g.minimum_rotated_rectangle
    if not isinstance(r, Polygon): continue
    cs = list(r.exterior.coords)[:4]
    e1 = np.subtract(cs[1], cs[0]); e2 = np.subtract(cs[2], cs[1]); l1, l2 = np.hypot(*e1), np.hypot(*e2)
    if l1 < 1 or l2 < 1: continue
    u1, u2 = e1 / l1, e2 / l2; c = r.centroid
    # la calle más cercana: hacia ella mira la fachada (la de las cuatro direcciones del rectángulo que más se le acerca)
    i = arbol.nearest(c); v = None
    if i is not None:
        q = viales[i].interpolate(viales[i].project(c)); d = c.distance(q)
        if d < 45 and d > 0.01: v = np.array([q.x - c.x, q.y - c.y]) / d
    if v is None:   # (sin calle cerca: cuesta abajo)
        gx = hgrid(c.x + 2, c.y) - hgrid(c.x - 2, c.y); gz = hgrid(c.x, c.y + 2) - hgrid(c.x, c.y - 2); m = math.hypot(gx, gz) or 1
        v = np.array([-gx / m, -gz / m])
    best = max([(u1, l1, l2), (-u1, l1, l2), (u2, l2, l1), (-u2, l2, l1)], key=lambda t: float(np.dot(t[0], v)))
    f, dd, ww = best   # (fachada hacia f: el fondo d es el lado en esa dirección y el ancho w el otro)
    ry = math.atan2(f[0], f[1])
    h = b['h'] if b['h'] and 2.5 < b['h'] < 60 else (b['plantas'] * 2.9 + 1.2 if b['plantas'] else None)
    k = tipo_casa(b, g)
    CASAS.append({'x': r1(c.x), 'z': r1(c.y), 'w': r1(ww), 'd': r1(dd), 'ry': round(ry, 3), 'h': r1(h) if h else None, 'k': k, 'n': b['nombre'],
                  'a': r1(g.area), 'fill': round(g.area / r.area, 2), 'p': ring(g, 0.5) if (g.area / r.area < 0.8 and g.area > 60) or k in ('church', 'fronton') else None})
CASAS.sort(key=lambda b: math.hypot(b['x'], b['z']))

# ---------------------------------------------------------------- lugares y usos
def cerca(lst, x, z, k='x'):
    return min(lst, key=lambda b: math.hypot(b['x'] - x, b['z'] - z)) if lst else None
L = {}
igl = [b for b in CASAS if b['k'] == 'church']
if igl: L['iglesia'] = max(igl, key=lambda b: b['a'] - 2 * math.hypot(b['x'], b['z']))
if ayto:
    ax, az = ayto[0]['x'] - ox, ayto[0]['z'] - oz
    t = [b for b in CASAS if b['k'] == 'townhall'] or [b for b in CASAS if b['k'] in ('house',) and math.hypot(b['x'] - ax, b['z'] - az) < 25]
    if t: L['ayuntamiento'] = cerca(t, ax, az); L['ayuntamiento']['k'] = 'townhall'
fr = [b for b in CASAS if b['k'] == 'fronton']
fr_uso = [u for u in D['usos'] if any(k in low(u['nombre']) for k in ('pilotaleku', 'frontón', 'fronton'))]
if fr: L['fronton'] = min(fr, key=lambda b: (0 if any(k in low(b['n']) for k in ('pilotaleku', 'frontón', 'fronton')) else 1, math.hypot(b['x'], b['z'])))
elif fr_uso: c = mv(Polygon(fr_uso[0]['p'])).centroid; L['fronton'] = {'x': r1(c.x), 'z': r1(c.y)}
L['fuentes'] = [{'x': r1(i['p'][0][0] - ox), 'z': r1(i['p'][0][1] - oz)} for i in D['infra'] if i['clase'] in ('drinking_water', 'fountain') and len(i['p']) == 1 and abs(i['p'][0][0] - ox) < HALF and abs(i['p'][0][1] - oz) < HALF]
if plaza:
    g = mv(plaza[1]); L['plaza'] = {'x': 0.0, 'z': 0.0, 'r': r1(math.sqrt(g.area / math.pi)), 'n': plaza[0]['nombre'], 'pts': ring(g, 0.5)}
L['plazas'] = [{'n': u['nombre'], 'pts': ring(g, 0.6)} for u, g0 in plazas for g in poligonos(mv(g0).intersection(CAJA))]
USO = {'meadow': 'prado', 'grass': 'cesped', 'farmland': 'cultivo', 'orchard': 'frutales', 'vineyard': 'vina', 'garden': 'huerta', 'allotments': 'huerta',
       'cemetery': 'cementerio', 'grave_yard': 'cementerio', 'pitch': 'deporte', 'playground': 'juegos', 'park': 'parque', 'forest': 'bosque', 'wood': 'bosque',
       'plaza': 'plaza', 'pedestrian': 'plaza', 'industrial': 'industria', 'school': 'escuela'}
USOS = []
for u in D['usos']:
    k = USO.get(u['clase'])
    if not k or not u['poligono'] or len(u['p']) < 3: continue
    g0 = Polygon(u['p'])
    if not g0.is_valid: g0 = g0.buffer(0)
    for g in poligonos(mv(g0).intersection(CAJA)):
        if g.area > 30: USOS.append({'k': k, 'n': u['nombre'], 'pts': ring(g, 1.2)})
NOMBRES = [{'n': l['nombre'], 'x': r1(l['x'] - ox), 'z': r1(l['z'] - oz)} for l in D['lugares'] if l['nombre'] and abs(l['x'] - ox) < HALF and abs(l['z'] - oz) < HALF]
# (para el juego, solo los lugares con nombre de monumento, y nada de bares, hoteles ni tiendas que se llamen igual:
# con ellos el juego pone el castillo, el cerco, la cueva o la casa museo donde están aunque el edificio no tenga nombre)
import re
MONU = re.compile(r'castill|gaztelu|palacio|jauregi|cerco|muralla|harresi|torre|dorre|puente|zubi|ermita|baseliza|capilla|kapera|molino|errota|dolmen|trikuharri|cueva|kobazulo|leize|mirador|begiratoki|museo|monasterio|bas[ií]lica|colegiata|iglesia|eliza|parroquia|silo|h[oó]rreo|ruina|tumba|cruz|gurutze|v[ií]a verde|plazaola|poblado|yacimiento|fuente|iturri|estela|hilarri|palomer|usategi|almad[ií]a')
COMERCIO = re.compile(r'asador|hostal|hotel|\bbar\b|restaurante|jatetxe|apartamento|camping|tienda|denda|bodega|taberna|cafeter|pensi[oó]n|albergue|sidrer|parking|aparcamiento|casa rural|landetxe|farmacia|panader|carnicer|inmobiliaria|peluquer|autoescuela|gasolinera|supermercado|cruz roja|[oó]ptica|audio|cl[ií]nica|dental|\bcalle\b|kalea|avenida|apartment|rural')
MONUMENTOS = [{'n': l['n'], 'x': round(l['x']), 'z': round(l['z'])} for l in NOMBRES if MONU.search(low(l['n'])) and not COMERCIO.search(low(l['n']))]
TORRES = [{'n': i['nombre'], 'x': r1(i['p'][0][0] - ox), 'z': r1(i['p'][0][1] - oz)} for i in D['infra'] if i['clase'] == 'defensive' and i['p']]

out = {
  'id': D['id'], 'fuente': D['fuente'], 'relieve': 'EU-DEM (Copernicus) por teselas terrarium de AWS: ' + ', '.join(sorted(fuentes)),
  'atribucion': '© OpenStreetMap contributors (ODbL) · Overture Maps Foundation · EU-DEM: produced using Copernicus data and information funded by the European Union',
  'lat': round(lat_c, 6), 'lon': round(lon_c, 6), 'alt0': r1(alt0),
  'dem': {'step': STEP, 'n': n, 'h': [int(round((grid[j, i] - alt0) * 10)) for j in range(n) for i in range(n)]},
  'dem2': {'step': FSTEP, 'n': n2, 'h': [int(round(grid2[j, i] - alt0)) for j in range(n2) for i in range(n2)]},
  'rios': RIOS, 'balsas': BALSAS, 'piscinas': PISCINAS, 'calles': CALLES, 'puentes': PUENTES, 'casas': CASAS, 'lugares': L, 'usos': USOS, 'nombres': NOMBRES, 'torres': TORRES,
}

# ---------------------------------------------------------------- versión compacta
def enc(P, q):
    """Una línea como diferencias entre puntos, en unidades de 1/q m: [x0, z0, dx1, dz1, …]."""
    o, px, pz = [], 0, 0
    for x, z in P:
        X, Z = round(x * q), round(z * q); o += [X - px, Z - pz]; px, pz = X, Z
    return o
def pred(h, n):
    """El relieve, cada altura menos la que daría el plano de sus tres vecinas ya escritas (casi todo ceros y unos)."""
    o = []
    for j in range(n):
        for i in range(n):
            k = j * n + i
            p = h[k - 1] + h[k - n] - h[k - n - 1] if i and j else h[k - 1] if i else h[k - n] if j else 0
            o.append(h[k] - p)
    return o
def dp(P, tol, V=None, tolv=None):
    """Douglas-Peucker que devuelve los índices que se quedan; con V, el valor de cada punto (el nivel del río)
    tampoco puede alejarse más de tolv del que saldría interpolando por la longitud."""
    cum = [0.0]
    for i in range(1, len(P)): cum.append(cum[-1] + math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
    keep, st = {0, len(P) - 1}, [(0, len(P) - 1)]
    while st:
        a, b = st.pop()
        if b - a < 2: continue
        ax, az = P[a]; dx, dz = P[b][0] - ax, P[b][1] - az; L2 = dx * dx + dz * dz or 1e-9
        bi, be = -1, 1.0
        for i in range(a + 1, b):
            t = min(1, max(0, ((P[i][0] - ax) * dx + (P[i][1] - az) * dz) / L2))
            e = math.hypot(P[i][0] - ax - t * dx, P[i][1] - az - t * dz) / tol
            if V is not None:
                f = (cum[i] - cum[a]) / ((cum[b] - cum[a]) or 1); e = max(e, abs(V[i] - (V[a] + (V[b] - V[a]) * f)) / tolv)
            if e > be: bi, be = i, e
        if bi >= 0: keep.add(bi); st += [(a, bi), (bi, b)]
    return sorted(keep)
def compactar(o):
    K = ['house', 'shed', 'borda', 'industrial', 'church', 'townhall', 'fronton', 'tower', 'school']
    # (las casas que el juego no levanta: a más de 480 m de la plaza o de menos de 9 m²; la iglesia, el ayuntamiento y
    # el frontón se quedan siempre)
    casas = [b for b in o['casas'] if b['k'] in ('church', 'townhall', 'fronton') or (math.hypot(b['x'], b['z']) <= 480 and b['a'] >= 9)]
    ix = {id(b): i for i, b in enumerate(casas)}
    Lg = dict(o['lugares'])
    for k in ('iglesia', 'ayuntamiento', 'fronton'):
        if k in Lg: Lg[k] = ix[id(Lg[k])] if id(Lg[k]) in ix else {'x': Lg[k]['x'], 'z': Lg[k]['z']}
    Lg['fuentes'] = enc([(f['x'], f['z']) for f in Lg.get('fuentes', [])], 2)
    if 'plaza' in Lg: Lg['plaza'] = {**{k: v for k, v in Lg['plaza'].items() if k != 'pts'}, 'p': enc(Lg['plaza']['pts'], 2)}
    Lg['plazas'] = [{'n': p['n'], 'p': enc(p['pts'], 2)} for p in Lg.get('plazas', [])]
    rios = []
    for r in o['rios']:
        I = dp(r['pts'], 0.5, r['lv'], 0.15)
        rios.append({'n': r['n'], 'w': r['w'], 'p': enc([r['pts'][i] for i in I], 2), 'lv': enc([(r['lv'][i], 0) for i in I], 10)[0::2]})
    return {
      'v': 2, 'id': o['id'], 'fuente': o['fuente'], 'relieve': o['relieve'], 'atribucion': o['atribucion'], 'lat': o['lat'], 'lon': o['lon'], 'alt0': o['alt0'],
      'dem': {**o['dem'], 'h': pred(o['dem']['h'], o['dem']['n'])}, 'dem2': {**o['dem2'], 'h': pred(o['dem2']['h'], o['dem2']['n'])},
      'rios': rios,
      'balsas': [{'n': b['n'], 'p': enc(b['pts'], 2)} for b in o['balsas']],
      'piscinas': [{'p': enc(b['pts'], 5)} for b in o['piscinas']],
      'calles': [{'t': c['t'], 'w': c['w'], 'c': c['c'], 'n': c['n'], 'p': enc(c['pts'], 2)} for c in o['calles']],
      'puentes': [{'n': c['n'], 'w': c['w'], 'p': enc(c['pts'], 5)} for c in o['puentes']],
      'casasK': K,
      'casas': [[round(b['x'] * 10), round(b['z'] * 10), round(b['w'] * 10), round(b['d'] * 10), round(b['ry'] * 100), round(b['h'] * 10) if b['h'] else 0, K.index(b['k']), round(b['a']), b['n'] or 0] for b in casas],
      'lugares': Lg,
      'usos': [{'k': u['k'], 'n': u['n'], 'p': enc(u['pts'], 1)} for u in o['usos']],
      'monumentos': MONUMENTOS,
    }
if not LEGIBLE: out = compactar(out)
os.makedirs(os.path.dirname(os.path.abspath(salida)), exist_ok=True)
json.dump(out, open(salida, 'w'), ensure_ascii=False, separators=(',', ':'))
print(D['id'], 'casas', len(CASAS), 'en el juego', len(out['casas']), {k: sum(1 for b in CASAS if b['k'] == k) for k in ('house', 'shed', 'borda', 'industrial', 'church', 'townhall', 'fronton', 'tower', 'school')},
      'calles', len(CALLES), 'puentes', len(PUENTES), 'ríos', [(r['n'], len(r['pts'])) for r in RIOS], 'usos', len(USOS), 'alt0', round(alt0), 'relieve', round(grid.min() - alt0), round(grid.max() - alt0),
      'lugares', {k: (v.get('n') if isinstance(v, dict) else len(v)) for k, v in L.items()}, os.path.getsize(salida) // 1024, 'KB')
