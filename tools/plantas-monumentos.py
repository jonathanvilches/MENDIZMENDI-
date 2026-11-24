# Plantas de verdad de los monumentos con nombre (castillos, palacios, basílicas…) para levantarlos en el juego sobre su
# contorno real y no sobre un rectángulo: src/data/reales/plantas.json, que lee src/world/monumentosReales.js.
#
# Salen de Overture Maps (edificios y partes de edificio, que vienen de OpenStreetMap: ODbL 1.0, «© OpenStreetMap
# contributors, Overture Maps Foundation», como el resto de src/data/reales; ver LICENCIA.txt) en metros locales como los
# usa el juego (x hacia el este, z hacia el sur, origen en el centro del pueblo: el lat/lon de su src/data/reales/<id>.json).
#
# Uso:  python -I tools/plantas-monumentos.py bajar <partes.json> [radio en m, 450]
#           (lee del almacén público de AWS solo los grupos de filas que tocan algún pueblo; tarda unos minutos)
#       python -I tools/plantas-monumentos.py elegir <partes.json>
#           (de lo bajado, las plantas de ELEGIR, redondeadas a 10 cm, a src/data/reales/plantas.json)
# Necesita pyarrow, fsspec, aiohttp y shapely (en un venv).
import sys, os, json, math, urllib.parse, urllib.request, xml.etree.ElementTree as ET, time

REALES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'reales')
# pueblo → {clave en el juego: nombre del edificio en los datos}
ELEGIR = {
    'javier': {'castillo': 'Castillo de Javier', 'torre': 'Torre del Homenaje', 'basilica': 'Basílica de San Francisco Javier'},
    'olite': {'palacio': 'Palacio Real de Olite', 'viejo': 'Palacio Viejo', 'santamaria': 'Iglesia de Santa María'},
}

# plantas sacadas de otras: el cuerpo del castillo de Javier, su contorno metido 4,5 m (lo de fuera es el recinto bajo, con
# la barbacana y el adarve) y unido al recinto de la torre del Homenaje
DERIVADAS = {'javier': {'cuerpo': lambda P: P['castillo'].buffer(-4.5, join_style=2, mitre_limit=2).union(P['torre']).simplify(0.6)}}

def elegir(fin):
    from shapely.geometry import Polygon
    d = json.load(open(fin)); out = {}
    for pid, sel in ELEGIR.items():
        E = d.get(pid, {}).get('edificios', [])
        for k, nombre in sel.items():
            e = next((e for e in E if e.get('n') == nombre), None)
            if not e: print('no está', pid, nombre); continue
            # (sin los vértices que no doblan: la fachada de la basílica de Javier venía en dos tramos en línea)
            g = Polygon(e['p'][0]).simplify(0.15)
            out.setdefault(pid, {})[k] = [[round(x, 1), round(z, 1)] for x, z in list(g.exterior.coords)[:-1]]
    for pid, der in DERIVADAS.items():
        P = {k: Polygon(v) for k, v in out.get(pid, {}).items()}
        for k, f in der.items():
            g = f(P); out[pid][k] = [[round(x, 1), round(z, 1)] for x, z in list(g.exterior.coords)[:-1]]
    json.dump(out, open(os.path.join(REALES, 'plantas.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print({p: list(v) for p, v in out.items()})

def bajar(OUT, R):
    import fsspec, pyarrow.parquet as pq
    from shapely import from_wkb
    from shapely.geometry import Polygon, MultiPolygon
    BUCKET = 'https://overturemaps-us-west-2.s3.amazonaws.com/'
    REL = 'release/2026-11-18.0/'
    pueblos = []
    for f in sorted(os.listdir(REALES)):
        if not f.endswith('.json') or f in ('emblemas.json',): continue
        d = json.load(open(os.path.join(REALES, f)))
        if 'lat' in d: pueblos.append({'id': d['id'], 'lat': d['lat'], 'lon': d['lon']})
    print(len(pueblos), 'pueblos')
    def caja(p):
        dl = R / 111320; dn = R / (111320 * math.cos(math.radians(p['lat'])))
        return (p['lon'] - dn, p['lon'] + dn, p['lat'] - dl, p['lat'] + dl)
    CAJAS = [(p, caja(p)) for p in pueblos]
    def listar(prefix):
        keys, token = [], None
        while True:
            u = f'{BUCKET}?list-type=2&prefix={urllib.parse.quote(prefix)}' + (f'&continuation-token={urllib.parse.quote(token)}' if token else '')
            root = ET.fromstring(urllib.request.urlopen(u, timeout=90).read()); ns = {'s': root.tag.split('}')[0].strip('{')}
            keys += [c.find('s:Key', ns).text for c in root.findall('s:Contents', ns)]
            t = root.find('s:NextContinuationToken', ns); token = t.text if t is not None else None
            if not token: return keys
    fs = fsspec.filesystem('https')
    res = {p['id']: {'partes': [], 'edificios': []} for p in pueblos}
    def local(p, lon, lat):
        return ((lon - p['lon']) * 111320 * math.cos(math.radians(p['lat'])), -(lat - p['lat']) * 111320)
    def anillo(p, g):
        polys = [g] if isinstance(g, Polygon) else list(g.geoms) if isinstance(g, MultiPolygon) else []
        out = []
        for q in polys:
            pts = [local(p, x, y) for x, y in list(q.exterior.coords)[:-1]]
            out.append([[round(a, 2), round(b, 2)] for a, b in pts])
        return out
    def nombre(n):
        try: return (n or {}).get('primary')
        except Exception: return None
    for tipo, cols in [('building_part', ['id', 'geometry', 'bbox', 'building_id', 'height', 'min_height', 'num_floors', 'min_floor', 'roof_shape', 'roof_height', 'roof_direction', 'roof_orientation', 'facade_material', 'roof_material', 'facade_color', 'roof_color', 'names']),
                       ('building', ['id', 'geometry', 'bbox', 'height', 'min_height', 'num_floors', 'roof_shape', 'roof_height', 'class', 'subtype', 'names', 'facade_material', 'roof_material', 'has_parts'])]:
        keys = listar(REL + f'theme=buildings/type={tipo}/'); t0 = time.time(); leidos = 0
        print(tipo, len(keys), 'archivos')
        for k in keys:
            with fs.open(BUCKET + k, 'rb', block_size=2 * 1024 * 1024) as f:
                pf = pq.ParquetFile(f); md = pf.metadata; names = [c.path for c in pf.schema]
                ix = {nm: names.index(nm) for nm in ('bbox.xmin', 'bbox.xmax', 'bbox.ymin', 'bbox.ymax')}
                rgs = []
                for i in range(md.num_row_groups):
                    rg = md.row_group(i); st = {nm: rg.column(j).statistics for nm, j in ix.items()}
                    if any(s is None or not s.has_min_max for s in st.values()): continue
                    x0, x1, y0, y1 = st['bbox.xmin'].min, st['bbox.xmax'].max, st['bbox.ymin'].min, st['bbox.ymax'].max
                    if any(x0 <= c[1] and x1 >= c[0] and y0 <= c[3] and y1 >= c[2] for _, c in CAJAS): rgs.append(i)
                if not rgs: continue
                have = [c for c in cols if c in pf.schema_arrow.names]
                t = pf.read_row_groups(rgs, columns=have).to_pylist(); leidos += len(rgs)
                for r in t:
                    b = r['bbox']; cx, cy = (b['xmin'] + b['xmax']) / 2, (b['ymin'] + b['ymax']) / 2
                    for p, c in CAJAS:
                        if not (c[0] <= cx <= c[1] and c[2] <= cy <= c[3]): continue
                        g = from_wkb(r['geometry']); area = g.area * (111320 ** 2) * math.cos(math.radians(p['lat']))
                        nm = nombre(r.get('names'))
                        if tipo == 'building':
                            # (solo los que sirven para monumentos: con nombre, con partes, de clase monumental o grandes)
                            cl = r.get('class') or ''; st2 = r.get('subtype') or ''
                            if not (nm or r.get('has_parts') or cl in ('church', 'cathedral', 'chapel', 'castle', 'tower', 'palace', 'monastery', 'basilica', 'religious') or st2 in ('religious', 'civic') or area > 900): continue
                        o = {'id': r['id'], 'n': nm, 'p': anillo(p, g), 'area': round(area)}
                        for kk in cols:
                            if kk in ('id', 'geometry', 'bbox', 'names') or r.get(kk) is None: continue
                            o[kk] = r[kk]
                        res[p['id']]['partes' if tipo == 'building_part' else 'edificios'].append(o)
            print(f'  {k.split("/")[-1][:30]} grupos {len(rgs)} · {time.time() - t0:.0f} s', flush=True)
    json.dump(res, open(OUT, 'w'), ensure_ascii=False)
    for pid, v in res.items(): print(pid, 'partes', len(v['partes']), 'edificios', len(v['edificios']))

if __name__ == '__main__':
    if sys.argv[1] == 'bajar': bajar(sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 450)
    else: elegir(sys.argv[2])
