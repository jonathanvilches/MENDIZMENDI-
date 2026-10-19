# Datos reales de cada pueblo para el juego: los contornos de las casas (con su altura cuando la hay y el nombre de la
# casa si lo tiene), las calles y caminos, los ríos, regatas y balsas, los puentes, los usos del suelo (plazas, huertas,
# prados, cementerio, campos de deporte) y los lugares (iglesia, frontón,
# fuente, ayuntamiento…) en un cuadrado alrededor del centro de cada localidad, en metros locales como los usa el juego
# (x hacia el este, z hacia el sur, origen en el centro del pueblo). Salen de Overture Maps (archivos parquet en el
# almacén público de AWS, que se leen por rangos HTTP: solo los grupos de filas que tocan el pueblo).
#
# LICENCIA DE LOS DATOS: edificios, calles, agua e infraestructuras son ODbL 1.0 (vienen de OpenStreetMap: hay que
# atribuir «© OpenStreetMap contributors, Overture Maps Foundation» y la base de datos derivada, estos JSON, se comparte
# con la misma licencia); los lugares son CDLA-Permissive-2.0. Este programa no mete nada en el juego: escribe los JSON
# en la carpeta que se le dé. Meterlos en src/data/reales es una decisión aparte, con la licencia aceptada.
#
# Uso:  python -I tools/pueblo-real.py indice <cache>
#           (una vez por versión de Overture: lee el pie de cada parquet y guarda el recuadro de cada grupo de filas;
#            tarda unos dos minutos por colección y se puede interrumpir y seguir)
#       python -I tools/pueblo-real.py pueblo <cache> <centros.json> <salida> [radio en m, 450] [id id…]
#           (centros.json: [{id, lat, lon}…], el de tools/… o el que escribe el juego; sin ids, todos)
# Necesita pyarrow, fsspec, aiohttp, requests y shapely (en un venv: python -m venv v && v/bin/pip install …).
import sys, os, json, math, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
import fsspec, pyarrow.parquet as pq, pyarrow.compute as pc
from shapely import from_wkb
from shapely.ops import transform
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, Point

BUCKET = 'https://overturemaps-us-west-2.s3.amazonaws.com/'
RELEASE = 'release/2026-09-23.1/'
PARTS = { 'edificios': 'theme=buildings/type=building/', 'calles': 'theme=transportation/type=segment/', 'agua': 'theme=base/type=water/',
          'infra': 'theme=base/type=infrastructure/', 'usos': 'theme=base/type=land_use/', 'lugares': 'theme=places/type=place/' }
COLS = { 'edificios': ['id', 'geometry', 'bbox', 'height', 'num_floors', 'class', 'subtype', 'names'],
         'calles': ['id', 'geometry', 'bbox', 'subtype', 'class', 'names', 'road_flags', 'road_surface', 'routes'],
         'agua': ['id', 'geometry', 'bbox', 'subtype', 'class', 'names'],
         'infra': ['id', 'geometry', 'bbox', 'subtype', 'class', 'names'],
         'usos': ['id', 'geometry', 'bbox', 'subtype', 'class', 'names', 'surface'],
         'lugares': ['id', 'geometry', 'bbox', 'names', 'categories'] }
FUENTE = { 'overture': RELEASE.strip('/').split('/')[-1], 'licencia': 'ODbL 1.0 (© OpenStreetMap contributors, Overture Maps Foundation); lugares: CDLA-Permissive-2.0' }

def listar(prefix):
    keys, token = [], None
    while True:
        u = f'{BUCKET}?list-type=2&prefix={urllib.parse.quote(prefix)}' + (f'&continuation-token={urllib.parse.quote(token)}' if token else '')
        root = ET.fromstring(urllib.request.urlopen(u, timeout=90).read()); ns = {'s': root.tag.split('}')[0].strip('{')}
        keys += [c.find('s:Key', ns).text for c in root.findall('s:Contents', ns)]
        t = root.find('s:NextContinuationToken', ns); token = t.text if t is not None else None
        if not token: return keys

def indice(cache):
    os.makedirs(cache, exist_ok=True); fs = fsspec.filesystem('https')
    for part, prefix in PARTS.items():
        f_cache = os.path.join(cache, part + '.json')
        done = json.load(open(f_cache)) if os.path.exists(f_cache) else {}
        keys = listar(RELEASE + prefix); t0 = time.time(); n = 0
        for k in keys:
            if k in done: continue
            with fs.open(BUCKET + k, 'rb', block_size=4 * 1024 * 1024) as f:
                pf = pq.ParquetFile(f); md = pf.metadata; names = [c.path for c in pf.schema]
                ix = {nm: names.index(nm) for nm in ('bbox.xmin', 'bbox.xmax', 'bbox.ymin', 'bbox.ymax')}
                rgs = []
                for i in range(md.num_row_groups):
                    rg = md.row_group(i); st = {nm: rg.column(j).statistics for nm, j in ix.items()}
                    if any(s is None for s in st.values()): rgs.append(None); continue
                    rgs.append([round(st['bbox.xmin'].min, 5), round(st['bbox.xmax'].max, 5), round(st['bbox.ymin'].min, 5), round(st['bbox.ymax'].max, 5)])
                done[k] = rgs; n += 1
            if n % 25 == 0: json.dump(done, open(f_cache, 'w'))
        json.dump(done, open(f_cache, 'w'))
        print(part, len(keys), 'archivos,', sum(len(v) for v in done.values()), 'grupos de filas, nuevos', n, 'en', round(time.time() - t0), 's', flush=True)

def texto(v):
    """Los nombres y categorías de Overture vienen en estructuras: el primario o nada."""
    if v is None: return None
    if isinstance(v, dict): return v.get('primary') or v.get('common') or None
    return str(v)

def banderas(v, out=None):
    out = [] if out is None else out
    if isinstance(v, dict): [banderas(x, out) for x in v.values()]
    elif isinstance(v, (list, tuple)): [banderas(x, out) for x in v]
    elif isinstance(v, str) and v.startswith('is_'): out.append(v)
    return out

def tramos(v, flag):
    """Overture marca los puentes y túneles por tramos del segmento: [{values: [...], between: [a, b] o None}]. Devuelve
    los tramos (fracciones de 0 a 1) que llevan esa marca."""
    out = []
    for it in v or []:
        if isinstance(it, dict) and flag in (it.get('values') or []):
            b = it.get('between'); out.append([round(b[0], 4), round(b[1], 4)] if b else [0, 1])
    return out

def pueblo(cache, centros, salida, radio, ids):
    os.makedirs(salida, exist_ok=True); fs = fsspec.filesystem('https')
    C = [c for c in json.load(open(centros)) if c.get('lat') and (not ids or c['id'] in ids)]
    IDX = {part: json.load(open(os.path.join(cache, part + '.json'))) for part in PARTS}
    for c in C:
        lat0, lon0 = c['lat'], c['lon']; kx = 111320 * math.cos(math.radians(lat0)); ky = 110574
        x0, x1, y0, y1 = lon0 - radio / kx, lon0 + radio / kx, lat0 - radio / ky, lat0 + radio / ky
        # (primero a metros locales y luego se simplifica, con la tolerancia en metros: en grados se comía las casas)
        aloc = lambda lon, lat, z=None: ((lon - lon0) * kx, -(lat - lat0) * ky)   # (norte = −z)
        r1 = lambda v: round(v, 1)
        def coords(g, tol=0.3):
            g = transform(aloc, g).simplify(tol, preserve_topology=True)
            if isinstance(g, (Polygon,)): return [[[r1(x), r1(y)] for x, y in g.exterior.coords[:-1]]], True
            if isinstance(g, MultiPolygon): return [[[r1(x), r1(y)] for x, y in p.exterior.coords[:-1]] for p in g.geoms], True
            if isinstance(g, LineString): return [[[r1(x), r1(y)] for x, y in g.coords]], False
            if isinstance(g, MultiLineString): return [[[r1(x), r1(y)] for x, y in l.coords] for l in g.geoms], False
            if isinstance(g, Point): return [[[r1(g.x), r1(g.y)]]], False
            return [], False
        out = {'id': c['id'], 'lat': lat0, 'lon': lon0, 'radio': radio, 'fuente': FUENTE, 'edificios': [], 'calles': [], 'agua': [], 'infra': [], 'usos': [], 'lugares': []}
        t0 = time.time()
        for part in PARTS:
            cand = [(k, i) for k, rgs in IDX[part].items() for i, b in enumerate(rgs) if b is None or (b[0] <= x1 and b[1] >= x0 and b[2] <= y1 and b[3] >= y0)]
            por_archivo = {}
            for k, i in cand: por_archivo.setdefault(k, []).append(i)
            for k, rgs in por_archivo.items():
                with fs.open(BUCKET + k, 'rb', block_size=8 * 1024 * 1024) as f:
                    pf = pq.ParquetFile(f); cols = [cn for cn in COLS[part] if cn in pf.schema_arrow.names]
                    for i in rgs:
                        tb = pf.read_row_group(i, columns=cols); bb = tb.column('bbox').combine_chunks()
                        xmin, xmax, ymin, ymax = [bb.field(fn) for fn in ('xmin', 'xmax', 'ymin', 'ymax')]
                        mask = pc.and_(pc.and_(pc.less_equal(xmin, x1), pc.greater_equal(xmax, x0)), pc.and_(pc.less_equal(ymin, y1), pc.greater_equal(ymax, y0)))
                        for r in tb.filter(mask).to_pylist():
                            g = from_wkb(r['geometry'])
                            if part == 'agua' and r.get('subtype') in ('physical', 'ocean') : continue
                            partes, poli = coords(g)
                            for p in partes:
                                if part == 'edificios': out[part].append({'p': p, 'h': r.get('height'), 'plantas': r.get('num_floors'), 'nombre': texto(r.get('names')), 'clase': r.get('class'), 'subtipo': r.get('subtype')})
                                elif part == 'calles':
                                    rf = r.get('road_flags')
                                    out[part].append({'p': p, 'clase': r.get('class'), 'subtipo': r.get('subtype'), 'nombre': texto(r.get('names')), 'puente': tramos(rf, 'is_bridge'), 'tunel': tramos(rf, 'is_tunnel')})
                                elif part == 'agua': out[part].append({'p': p, 'poligono': poli, 'subtipo': r.get('subtype'), 'clase': r.get('class'), 'nombre': texto(r.get('names'))})
                                elif part in ('infra', 'usos'): out[part].append({'p': p, 'poligono': poli, 'subtipo': r.get('subtype'), 'clase': r.get('class'), 'nombre': texto(r.get('names'))})
                                else:
                                    cat = r.get('categories'); out[part].append({'x': p[0][0], 'z': p[0][1], 'nombre': texto(r.get('names')), 'categoria': (cat or {}).get('primary') if isinstance(cat, dict) else None})
        fo = os.path.join(salida, c['id'] + '.json'); json.dump(out, open(fo, 'w'), ensure_ascii=False, separators=(',', ':'))
        print(c['id'], {k: len(v) for k, v in out.items() if isinstance(v, list)}, os.path.getsize(fo) // 1024, 'KB en', round(time.time() - t0), 's', flush=True)

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] not in ('indice', 'pueblo'): print(__doc__ or 'uso: indice <cache> | pueblo <cache> <centros.json> <salida> [radio] [id…]'); sys.exit(1)
    if a[0] == 'indice': indice(a[1])
    else:
        radio = float(a[4]) if len(a) > 4 and a[4].replace('.', '').isdigit() else 450
        ids = [x for x in a[4:] if not x.replace('.', '').isdigit()]
        pueblo(a[1], a[2], a[3], radio, ids)
