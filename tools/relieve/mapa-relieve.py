# El relieve y los ríos del mapa 3D del inicio (src/data/mapa-relieve.js), en las coordenadas del mapa de comarcas
# (comarcas.json, viewBox 10 10 725 780; src/util/geo.js mapaXY).
#
# - Relieve: una rejilla de alturas cada 3 unidades del mapa (unos 620 m), de las teselas de relieve de SRTM y GMTED2010
#   (USGS, dominio público; ver descargar.sh). Cada punto, la media de 9 lecturas alrededor, en decenas de metros (un byte).
# - Ríos: los principales de Navarra, de OpenStreetMap por Overture Maps (ODbL 1.0: «© OpenStreetMap contributors,
#   Overture Maps Foundation»), unidos, recortados al contorno de Navarra y simplificados; y los embalses grandes.
# - Sombreado: el relieve fino (unos 155 m) en una imagen gris, de las teselas de nivel 10, que en Navarra salen de
#   Copernicus EU-DEM («Produced using Copernicus data and information funded by the European Union - EU-DEM layers»).
# - Detalle: el relieve de cada comarca a unos 28 m (EU-DEM, teselas de nivel 12), ya pintado; solo para la web.
# - Sierras: dónde va el nombre de cada una (puesto a mano, comprobado con el relieve: se imprime su altura).
#
# Uso:  python -I tools/relieve/mapa-relieve.py rios <índice agua.json de pueblo-real.py> <rios.json>
#           (lee de Overture los tramos de río con nombre de la zona; necesita pyarrow, fsspec y shapely)
#       python -I tools/relieve/mapa-relieve.py mapa <teselas> <teselas10> <teselas12> <rios.json> <raíz del proyecto> <salida .js>
#           <sombra .webp> <carpeta del detalle>
#           (teselas: las de descargar.sh; teselas10: las mismas de nivel 10, x 504 a 510 e y 375 a 380; teselas12: las de
#           nivel 12 que tocan Navarra, x 2018 a 2041 e y 1499 a 1523)
import sys, os, re, json, math, base64

def rios(indice, salida):
    import fsspec, pyarrow.parquet as pq
    from shapely import from_wkb
    BUCKET = 'https://overturemaps-us-west-2.s3.amazonaws.com/'
    x0, x1, y0, y1 = -2.56, -0.70, 41.88, 43.34
    idx = json.load(open(indice)); fs = fsspec.filesystem('https'); out = []
    for k, rgs in idx.items():
        sel = [i for i, b in enumerate(rgs) if b is None or (b[0] <= x1 and b[1] >= x0 and b[2] <= y1 and b[3] >= y0)]
        if not sel: continue
        with fs.open(BUCKET + k, 'rb', block_size=4 * 1024 * 1024) as f:
            pf = pq.ParquetFile(f)
            for i in sel:
                for r in pf.read_row_group(i, columns=['id', 'geometry', 'bbox', 'subtype', 'class', 'names']).to_pylist():
                    b = r['bbox']
                    if b['xmax'] < x0 or b['xmin'] > x1 or b['ymax'] < y0 or b['ymin'] > y1: continue
                    n = (r['names'] or {}).get('primary')
                    if not n: continue
                    g = from_wkb(r['geometry'])
                    # (los ríos, en líneas; los embalses y lagunas grandes, en contornos: más de medio kilómetro cuadrado)
                    if r['class'] in ('river', 'stream') and g.geom_type in ('LineString', 'MultiLineString'): out.append({'id': r['id'], 'c': r['class'], 'n': n, 'w': g.wkt})
                    elif r['class'] in ('lake', 'reservoir', 'lagoon') and g.geom_type in ('Polygon', 'MultiPolygon') and g.area > 5.5e-5: out.append({'id': r['id'], 'c': r['class'], 'n': n, 'w': g.wkt})
    json.dump({'fuente': idx and list(idx)[0].split('/')[1], 'tramos': out}, open(salida, 'w'))
    print(len(out), 'tramos de río y embalses con nombre')

# los ríos que salen en el mapa: el nombre que se enseña, su rango (1 los grandes, 2 los medianos con nombre en el mapa,
# 3 los afluentes, sin nombre) y cómo se llaman sus tramos en OpenStreetMap
RIOS = [
    ('Ebro', 1, ['Río Ebro', 'Rio Ebro', 'Ebro ibaia']),
    ('Aragón', 1, ['Río Aragón', 'Aragoi ibaia']),
    ('Arga', 1, ['Arga', 'Arga ibaia']),
    ('Ega', 1, ['Ega', 'Ego', 'Ego Ibaia', 'Ego ibaia']),
    ('Irati', 2, ['Irati', 'Irati ibaia']),
    ('Bidasoa', 2, ['Bidasoa / La Bidassoa', 'Bidasoa Ibaia', 'Bidasoa ibaia', 'Baztan ibaia']),
    ('Salazar', 2, ['Río Salazar', 'Zaraitzu ibaia']),
    ('Esca', 2, ['Esca', 'Ezka']),
    ('Arakil', 2, ['Arakil ibaia']),
    ('Cidacos', 2, ['Río Cidacos', 'Zidakos']),
    ('Alhama', 2, ['Río Alhama']),
    ('Queiles', 2, ['Río Queiles']),
    ('Ultzama', 2, ['Ultzama', 'Ultzama ibaia', 'Ultzamako ibaia']),
    ('Urederra', 3, ['Urederra ibaia']),
    ('Larraun', 3, ['Larraun', 'Larraun ibaia']),
    ('Erro', 3, ['Erro', 'Erro ibaia']),
    ('Urrobi', 3, ['Urrobi']),
    ('Areta', 3, ['Areta']),
    ('Elortz', 3, ['Elortz']),
    ('Ezkurra', 3, ['Ezkurra', 'Ezkurra ibaia']),
    ('Leitzaran', 3, ['Leitzaran', 'Leitzaran ibaia']),
    ('Urumea', 3, ['Urumea', 'Urumea ibaia']),
    ('Odrón', 3, ['Odrón']),
    ('Linares', 3, ['Linares', 'Río Linares']),
    ('Onsella', 3, ['Onsella', 'Río Onsella', 'Arroyo Onsella']),
    ('Robo', 3, ['Robo']),
]
# los embalses y lagunas: el nombre que se enseña, si sale en el mapa, y cómo se llaman en OpenStreetMap
LAGOS = [
    ('Embalse de Yesa', True, ['Embalse de Yesa']), ('Embalse de Itoiz', True, ['Itoizko urtegia']),
    ('Embalse de Alloz', True, ['Allozko urtegia']), ('Embalse de Eugi', True, ['Eugiko urtegia']),
    ('Embalse de Irabia', True, ['Irabiako urtegia']), ('Balsa de Ezkoritz', False, ['Balsa de Ezkoritz']),
    ('Embalse del Ferial', False, ['Embalse del Ferial']),
]
# las sierras: el nombre y dónde va (latitud, longitud)
SIERRAS = [
    ('Pirineo', 42.925, -0.86), ('Aralar', 42.985, -2.02), ('Urbasa', 42.835, -2.17), ('Andia', 42.86, -1.95),
    ('Sierra de Codés', 42.625, -2.36), ('Sierra de Lokiz', 42.73, -2.15), ('Sierra del Perdón', 42.74, -1.75),
    ('Sierra de Alaiz', 42.685, -1.57), ('Sierra de Izco', 42.63, -1.38), ('Sierra de Leyre', 42.645, -1.15),
    ('Abodi', 42.935, -1.12), ('Quinto Real', 43.0, -1.45), ('Saioa', 43.03, -1.62), ('Bardenas Reales', 42.19, -1.47),
]

XY = lambda lat, lon: (19 + (lon + 2.52) / 1.80 * 709, 17 + (43.325 - lat) / 1.43 * 765)   # (= mapaXY)
LATLON = lambda x, y: (43.325 - (y - 17) / 765 * 1.43, (x - 19) / 709 * 1.80 - 2.52)
PASO = 3.0

def mosaico(teselas, Z, X0, X1, Y0, Y1, fuentes, sueltas=False):
    """Las teselas «terrarium» de una zona, juntas (como perfiles.py); devuelve la altura (m) de cualquier punto. Con
    sueltas, la zona puede tener huecos (solo se bajan las que tocan Navarra): lo que falta, a cero."""
    import numpy as np
    from PIL import Image
    ok_src = re.compile(fuentes)
    H = np.zeros(((Y1 - Y0 + 1) * 256, (X1 - X0 + 1) * 256), np.float32)
    for x in range(X0, X1 + 1):
        for y in range(Y0, Y1 + 1):
            if sueltas and not os.path.exists(os.path.join(teselas, f'{Z}-{x}-{y}.png')): continue
            hdr = open(os.path.join(teselas, f'{Z}-{x}-{y}.txt'), encoding='latin-1').read()
            srcs = [s.strip() for m in re.findall(r'x-amz-meta-x-imagery-sources:\s*(.*)', hdr, re.I) for s in m.split(',')]
            bad = [s for s in srcs if not ok_src.match(s)]
            if not srcs or bad: sys.exit(f'tesela {x},{y}: fuentes no previstas {bad or "(ninguna)"}')
            im = np.asarray(Image.open(os.path.join(teselas, f'{Z}-{x}-{y}.png')).convert('RGB'), np.float32)
            H[(y - Y0) * 256:(y - Y0 + 1) * 256, (x - X0) * 256:(x - X0 + 1) * 256] = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
    H = np.maximum(H, 0)
    def elev(lat, lon):
        n = 256 * 2 ** Z; la = np.radians(lat)
        px = (lon + 180) / 360 * n - X0 * 256 - 0.5; py = (1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * n - Y0 * 256 - 0.5
        x0 = np.clip(np.floor(px).astype(int), 0, H.shape[1] - 2); y0 = np.clip(np.floor(py).astype(int), 0, H.shape[0] - 2)
        fx = np.clip(px - x0, 0, 1); fy = np.clip(py - y0, 0, 1)
        return (H[y0, x0] * (1 - fx) + H[y0, x0 + 1] * fx) * (1 - fy) + (H[y0 + 1, x0] * (1 - fx) + H[y0 + 1, x0 + 1] * fx) * fy
    return elev

def sombreado(elev, nav, salida):
    """El sombreado del relieve, como en los mapas físicos: luz del noroeste, cada ladera según su pendiente (exagerada
    cuatro veces) y los fondos de valle algo más oscuros. Se calcula cada 0,75 unidades del mapa (unos 155 m) y se guarda
    cada 1,5 (dos veces más pequeño, mezclado), en gris, fuera de Navarra liso. En el juego: sombra = gris / 255 × 1,7."""
    import numpy as np
    from PIL import Image, ImageDraw
    P, F = 1.5, 0.75
    bx0, by0, bx1, by1 = nav.buffer(6).bounds
    x0 = math.floor(bx0 / P) * P; y0 = math.floor(by0 / P) * P; w = int(math.ceil((bx1 - x0) / P)); h = int(math.ceil((by1 - y0) / P))
    gx, gy = np.meshgrid(x0 + (np.arange(2 * w) + 0.5) * F - F, y0 + (np.arange(2 * h) + 0.5) * F - F)
    lat, lon = LATLON(gx, gy); alt = elev(lat, lon).astype(np.float64)
    m = F * 207.6
    dz, dx = np.gradient(alt * 4, m)
    n = np.stack([-dx, np.ones_like(dx), -dz], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    L = np.array([-0.6, 0.62, -0.5]); L /= np.linalg.norm(L)
    d = np.clip((n * L).sum(-1), 0, 1)
    lap = (np.roll(alt, 1, 0) + np.roll(alt, -1, 0) + np.roll(alt, 1, 1) + np.roll(alt, -1, 1) - 4 * alt) * (207 / m) ** 2
    ao = np.clip(1 + np.clip(lap, -60, 60) / 200, 0.7, 1.25)
    s = (0.3 + 1.05 * d) * ao
    im = Image.fromarray(np.clip(s / 1.7 * 255, 0, 255).astype(np.uint8), 'L').resize((w, h), Image.LANCZOS)
    masc = Image.new('L', (w, h), 0); dib = ImageDraw.Draw(masc)
    for g in (lambda z: z.geoms if hasattr(z, 'geoms') else [z])(nav.buffer(3)): dib.polygon([((x - x0) / P, (y - y0) / P) for x, y in g.exterior.coords], fill=255)
    a = np.asarray(im).copy(); a[np.asarray(masc) == 0] = 142; os.makedirs(os.path.dirname(salida), exist_ok=True)
    Image.fromarray(a, 'L').save(salida, 'WEBP', quality=72, method=6)
    print('sombreado', w, 'x', h, os.path.getsize(salida), 'bytes')
    return {'x0': x0, 'y0': y0, 'paso': P, 'w': w, 'h': h}

# la paleta de los mapas físicos (la misma que PALETA de src/hub/mapa3d.js): metros y color
PALETA = [(0, (62, 140, 58)), (250, (92, 160, 62)), (450, (128, 172, 78)), (650, (170, 178, 102)), (850, (184, 160, 112)),
          (1100, (160, 126, 90)), (1400, (132, 104, 82)), (1700, (140, 128, 120)), (2000, (205, 200, 198)), (2400, (245, 244, 244))]

def desenfoque(a, r):
    """Casi gaussiano: tres pasadas de una media de radio r en cada eje."""
    import numpy as np
    def caja(a, eje):
        p = np.pad(a, [(r + 1, r) if i == eje else (0, 0) for i in range(2)], mode='edge'); c = np.cumsum(p, axis=eje)
        n = c.shape[eje]; return (np.take(c, range(2 * r + 1, n), axis=eje) - np.take(c, range(0, n - 2 * r - 1), axis=eje)) / (2 * r + 1)
    for _ in range(3): a = caja(caja(a, 0), 1)
    return a

def detalle(elev, com, carpeta):
    """El relieve de cada comarca a la resolución de los datos (unos 28 m, EU-DEM): ya pintado como un mapa físico (el
    color de su altura, la luz del noroeste en cada ladera con la pendiente exagerada dos veces y media, y los fondos de
    valle algo más oscuros), en color, en dos tamaños: «full» (28 m) y «medio» (56 m, para el móvil). Fuera de la comarca,
    liso. Va solo en la web: el archivo único lo pide a ella cuando hay conexión (src/web/hd.js)."""
    import numpy as np
    from PIL import Image, ImageDraw
    P = 0.135; ks = np.array([p[0] for p in PALETA], float); cs = np.array([p[1] for p in PALETA], float) / 255
    L = np.array([-0.6, 0.62, -0.5]); L /= np.linalg.norm(L); out = {}
    for cid, pol in com:
        bx0, by0, bx1, by1 = pol.buffer(2).bounds
        x0 = math.floor(bx0); y0 = math.floor(by0); w = int(math.ceil((bx1 - x0) / P)); h = int(math.ceil((by1 - y0) / P))
        gx, gy = np.meshgrid(x0 + (np.arange(w) + 0.5) * P, y0 + (np.arange(h) + 0.5) * P)
        lat, lon = LATLON(gx, gy); alt = elev(lat, lon).astype(np.float64)
        m = P * 207.6; dz, dx = np.gradient(alt * 2.5, m)
        n = np.stack([-dx, np.ones_like(dx), -dz], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
        d = np.clip((n * L).sum(-1), 0, 1)
        b = desenfoque(alt, 3); lap = (np.roll(b, 1, 0) + np.roll(b, -1, 0) + np.roll(b, 1, 1) + np.roll(b, -1, 1) - 4 * b) * (207 / (m * 3)) ** 2
        ao = np.clip(1 + np.clip(lap, -60, 60) / 200, 0.7, 1.25)
        col = np.stack([np.interp(alt, ks, cs[:, i]) for i in range(3)], -1)
        c = col * ((0.3 + 1.05 * d) * ao)[..., None] + 0.35 * (d ** 8)[..., None]
        a = (np.clip(c, 0, 1) * 255).astype(np.uint8)
        masc = Image.new('L', (w, h), 0); dib = ImageDraw.Draw(masc)
        for g in (lambda z: z.geoms if hasattr(z, 'geoms') else [z])(pol.buffer(1.5)): dib.polygon([((x - x0) / P, (y - y0) / P) for x, y in g.exterior.coords], fill=255)
        a[np.asarray(masc) == 0] = (120, 140, 90)
        im = Image.fromarray(a, 'RGB'); tam = []
        for nombre, k in (('full', 1), ('medio', 2)):
            f = os.path.join(carpeta, nombre, cid + '.webp'); os.makedirs(os.path.dirname(f), exist_ok=True)
            (im if k == 1 else im.resize((w // 2, h // 2), Image.LANCZOS)).save(f, 'WEBP', quality=80, method=6); tam.append(os.path.getsize(f))
        out[cid] = {'x0': x0, 'y0': y0, 'paso': P, 'w': w, 'h': h}
        print(f'detalle {cid}: {w}x{h}, {tam[0] // 1024} KB y {tam[1] // 1024} KB')
    return out

def mapa(teselas, teselas10, teselas12, rios_json, raiz, salida, salida_sombra, carpeta_detalle):
    import numpy as np
    from PIL import Image
    from shapely import wkt
    from shapely.geometry import Polygon, LineString, MultiLineString, Point
    from shapely.ops import unary_union, linemerge, transform
    elev = mosaico(teselas, 8, 125, 128, 93, 95, r'^(srtm|gmted|etopo1)/')
    # --- Navarra: las comarcas juntas ---
    COM = json.load(open(os.path.join(raiz, 'src/data/comarcas.json'), encoding='utf-8'))
    pols = []
    for c in COM:
        if not c.get('path'): continue
        n = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', c['path'])]
        pols.append(Polygon(list(zip(n[0::2], n[1::2]))).buffer(0))
    com = [(c['id'], p) for c, p in zip([c for c in COM if c.get('path')], pols)]
    nav = unary_union(pols)
    bx0, by0, bx1, by1 = nav.bounds
    x0 = math.floor(bx0 / PASO) * PASO - PASO; y0 = math.floor(by0 / PASO) * PASO - PASO
    nx = int(math.ceil((bx1 - x0) / PASO)) + 2; ny = int(math.ceil((by1 - y0) / PASO)) + 2
    gx, gy = np.meshgrid(x0 + np.arange(nx) * PASO, y0 + np.arange(ny) * PASO)
    acc = np.zeros_like(gx)
    for dx in (-PASO / 3, 0, PASO / 3):
        for dy in (-PASO / 3, 0, PASO / 3):
            lat, lon = LATLON(gx + dx, gy + dy); acc += elev(lat, lon)
    alt = acc / 9
    q = np.clip(np.round(alt / 10), 0, 255).astype(np.uint8)
    # (de cada fila solo se guarda el tramo que toca Navarra, con un margen: lo de fuera no se dibuja nunca)
    zona = nav.buffer(2 * PASO); filas, datos = [], []
    for j in range(ny):
        y = y0 + j * PASO; tramo = zona.intersection(LineString([(x0 - 1, y), (x0 + nx * PASO + 1, y)]))
        if tramo.is_empty: filas += [0, 0]; continue
        a, _, b, _ = tramo.bounds; i0 = max(0, int(math.floor((a - x0) / PASO))); i1 = min(nx - 1, int(math.ceil((b - x0) / PASO)))
        filas += [i0, i1 - i0 + 1]; datos.append(q[j, i0:i1 + 1])
    q = np.concatenate(datos)
    print('rejilla', nx, 'x', ny, 'alturas', int(alt.min()), '-', int(alt.max()), 'm;', len(q), 'puntos guardados')
    # --- los ríos ---
    R = json.load(open(rios_json)); por = {}
    for t in R['tramos']: por.setdefault(t['n'], []).append(t['w'])
    aXY = lambda lon, lat, z=None: XY(lat, lon)
    dentro = nav.buffer(1.5); rios_out = []
    for nombre, rango, alias in RIOS:
        ls = [transform(aXY, wkt.loads(w)) for a in alias for w in por.get(a, [])]
        if not ls: print('sin tramos:', nombre); continue
        lineas = []
        for g in ls: lineas += list(g.geoms) if isinstance(g, MultiLineString) else [g]
        m = linemerge(lineas).intersection(dentro).simplify(0.5)
        partes = [p for p in (m.geoms if hasattr(m, 'geoms') else [m]) if isinstance(p, LineString) and p.length > 4]
        if not partes: print('fuera de Navarra:', nombre); continue
        larga = max(partes, key=lambda p: p.length); lab = larga.interpolate(0.5, normalized=True)
        rios_out.append({'n': nombre, 'k': rango, 'l': [round(lab.x, 1), round(lab.y, 1)],
                         'p': [[v for x, y in p.coords for v in (round(x, 1), round(y, 1))] for p in partes]})
        print(f'{nombre}: {len(partes)} trozos, {round(sum(p.length for p in partes) * 0.207)} km en el mapa, {sum(len(p.coords) for p in partes)} puntos')
    # --- las sierras ---
    # --- los embalses ---
    lagos_out = []
    for nombre, con_nombre, alias in LAGOS:
        ps = [transform(aXY, wkt.loads(w)) for a in alias for w in por.get(a, [])]
        if not ps: print('sin embalse:', nombre); continue
        m = unary_union(ps).intersection(nav.buffer(1.5)).simplify(0.3)
        partes = [g for g in (m.geoms if hasattr(m, 'geoms') else [m]) if isinstance(g, Polygon) and g.area > 2]
        if not partes: print('fuera de Navarra:', nombre); continue
        lab = max(partes, key=lambda g: g.area).representative_point()
        # (el nivel del agua: lo bajo de la orilla, leída cada media unidad; y la orilla ensanchada unos 250 m, la zona
        # donde el relieve se allana a ese nivel para que el agua no quede debajo de las laderas de la rejilla)
        def nivel(g):
            anillo = g.exterior.segmentize(0.5); xs, ys = np.array(anillo.coords).T; lat, lon = LATLON(xs, ys)
            return int(round(float(np.percentile(elev(lat, lon), 25))))
        anillo = lambda g: [v for x, y in g.exterior.coords[:-1] for v in (round(x, 1), round(y, 1))]
        lagos_out.append({'n': nombre, 'k': 1 if con_nombre else 0, 'l': [round(lab.x, 1), round(lab.y, 1)], 'p': [anillo(g) for g in partes],
                          'h': [nivel(g) for g in partes], 'b': [anillo(g.buffer(1.2, join_style='round').simplify(0.4)) for g in partes]})
        print(f'{nombre}: {round(sum(g.area for g in partes) * 0.207 ** 2, 1)} km², {sum(len(g.exterior.coords) for g in partes)} puntos, agua a {lagos_out[-1]["h"]} m')
    # (el nombre, en lo más alto que haya a menos de 3 km del sitio puesto a mano, dentro de Navarra: así cae en la sierra)
    sierras = []
    for nombre, lat, lon in SIERRAS:
        x, y = XY(lat, lon); r = 3 / 0.207
        cerca = (gx - x) ** 2 + (gy - y) ** 2 < r * r
        cerca &= np.vectorize(lambda a, b: nav.contains(Point(a, b)))(gx, gy) if cerca.any() else cerca
        if cerca.any():
            k = np.argmax(np.where(cerca, alt, -1)); x, y = float(gx.flat[k]), float(gy.flat[k])
        print(f'{nombre}: {round(float(alt.flat[k]) if cerca.any() else 0)} m', '' if nav.contains(Point(x, y)) else '(¡fuera de Navarra!)')
        sierras.append({'n': nombre, 'x': round(x, 1), 'y': round(y, 1)})
    # --- el sombreado fino, de las teselas de nivel 10 (Copernicus EU-DEM y, en los bordes, SRTM y GMTED2010) ---
    sombra = sombreado(mosaico(teselas10, 10, 504, 510, 375, 380, r'^(eudem|srtm|gmted|etopo1)/'), nav, salida_sombra)
    # --- el relieve fino de cada comarca, de las teselas de nivel 12 (EU-DEM, unos 28 m) ---
    det = detalle(mosaico(teselas12, 12, 2018, 2041, 1499, 1523, r'^(eudem|srtm|gmted|etopo1)/', sueltas=True), com, carpeta_detalle)
    D = {'x0': x0, 'y0': y0, 'paso': PASO, 'nx': nx, 'ny': ny, 'u': 10, 'filas': filas, 'sombra': sombra, 'detalle': det, 'rios': rios_out, 'lagos': lagos_out, 'sierras': sierras}
    with open(salida, 'w', encoding='utf-8') as f:
        f.write('// El relieve y los ríos del mapa 3D del inicio, en las coordenadas del mapa de comarcas. Lo calcula\n'
                '// tools/relieve/mapa-relieve.py. Relieve: SRTM y GMTED2010 (U.S. Geological Survey, dominio público), una altura cada\n'
                f'// {PASO:g} unidades del mapa, en decenas de metros (un byte cada una, en base64; fila a fila de norte a sur, y de\n'
                '// cada fila solo el tramo que toca Navarra: filas = [primer punto, cuántos, …]).\n'
                f'// Ríos: © OpenStreetMap contributors, Overture Maps Foundation ({R["fuente"]}), ODbL 1.0\n'
                '// (https://www.openstreetmap.org/copyright): una base de datos derivada, que se comparte con la misma licencia.\n'
                '// rios: [{ n: nombre, k: 1 grande, 2 mediano, 3 afluente, l: dónde va el nombre, p: [[x, y, x, y…] por trozo] }];\n'
                '// lagos: los embalses, igual (k: 1 con nombre en el mapa; p: el contorno de cada trozo, h: su nivel del agua en m,\n'
                '// b: la orilla ensanchada, donde el relieve se allana a ese nivel); sierras: [{ n, x, y }]\n')
        f.write('export const MAPA_RELIEVE = ' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n')
        f.write("export const MAPA_ALTURAS = '" + base64.b64encode(q.tobytes()).decode() + "';\n")
    print('escrito', salida, os.path.getsize(salida), 'bytes')

if __name__ == '__main__':
    if sys.argv[1:2] == ['rios']: rios(*sys.argv[2:4])
    elif sys.argv[1:2] == ['mapa']: mapa(*sys.argv[2:10])
    else: sys.exit('uso: mapa-relieve.py rios <agua.json> <rios.json> | mapa <teselas> <teselas10> <teselas12> <rios.json> <raíz> <salida.js> <sombra.webp> <carpeta detalle>')
