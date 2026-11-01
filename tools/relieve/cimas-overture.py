# Las cimas con nombre (natural=peak de OpenStreetMap) de Navarra y alrededores, de Overture Maps (base/land, clase
# peak), leídas por rangos HTTP: solo los grupos de filas que tocan el recuadro. Escribe un JSON con nombre, altura,
# lat y lon. Datos ODbL (© OpenStreetMap contributors, Overture Maps Foundation).
# Uso: python -I tools/relieve/cimas-overture.py <salida .json> [release/AAAA-MM-DD.N/]   (necesita pyarrow y fsspec en un venv)
import sys, json, urllib.parse, urllib.request, xml.etree.ElementTree as ET
import fsspec, pyarrow.parquet as pq
BUCKET = 'https://overturemaps-us-west-2.s3.amazonaws.com/'
REL = sys.argv[2] if len(sys.argv) > 2 else 'release/2026-09-23.1/'
PREFIX = REL + 'theme=base/type=land/'
X0, X1, Y0, Y1 = -2.62, -0.62, 41.88, 43.36
def listar(prefix):
    keys, token = [], None
    while True:
        u = f'{BUCKET}?list-type=2&prefix={urllib.parse.quote(prefix)}' + (f'&continuation-token={urllib.parse.quote(token)}' if token else '')
        root = ET.fromstring(urllib.request.urlopen(u, timeout=90).read()); ns = {'s': root.tag.split('}')[0].strip('{')}
        keys += [c.find('s:Key', ns).text for c in root.findall('s:Contents', ns)]
        t = root.find('s:NextContinuationToken', ns); token = t.text if t is not None else None
        if not token: return keys
keys = [k for k in listar(PREFIX) if k.endswith('.parquet')]
print(len(keys), 'archivos', file=sys.stderr)
fs = fsspec.filesystem('https'); out = []
for n, k in enumerate(keys):
    with fs.open(BUCKET + k, 'rb', block_size=2 * 1024 * 1024) as f:
        pf = pq.ParquetFile(f); md = pf.metadata; names = [c.path for c in pf.schema]
        ix = {nm: names.index(nm) for nm in ('bbox.xmin', 'bbox.xmax', 'bbox.ymin', 'bbox.ymax')}
        rgs = []
        for i in range(md.num_row_groups):
            rg = md.row_group(i); st = {nm: rg.column(j).statistics for nm, j in ix.items()}
            if any(s is None or not s.has_min_max for s in st.values()) or not (st['bbox.xmax'].max < X0 or st['bbox.xmin'].min > X1 or st['bbox.ymax'].max < Y0 or st['bbox.ymin'].min > Y1): rgs.append(i)
        if not rgs: continue
        cols = [c for c in ['id', 'bbox', 'subtype', 'class', 'names', 'elevation', 'geometry'] if c in pf.schema_arrow.names]
        t = pf.read_row_groups(rgs, columns=cols).to_pylist()
        for r in t:
            b = r['bbox']
            if r.get('class') not in ('peak', 'volcano', 'hill', 'saddle', 'mountain_range', 'ridge', 'cliff', 'rock'): continue
            if b['xmin'] > X1 or b['xmax'] < X0 or b['ymin'] > Y1 or b['ymax'] < Y0: continue
            nm = r.get('names') or {}
            out.append({'n': nm.get('primary'), 'otros': {k2: v for k2, v in (nm.get('common') or {}).items()} if isinstance(nm.get('common'), dict) else nm.get('common'),
                        'k': r['class'], 'h': r.get('elevation'), 'lon': (b['xmin'] + b['xmax']) / 2, 'lat': (b['ymin'] + b['ymax']) / 2, 'id': r['id']})
    print(n, k.split('/')[-1][:30], len(out), file=sys.stderr, flush=True)
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False)
print('cimas', sum(1 for o in out if o['k'] == 'peak'), 'con nombre', sum(1 for o in out if o['k'] == 'peak' and o['n']), file=sys.stderr)
