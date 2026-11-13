# La ortofoto de Navarra para el mapa del inicio: el color de verdad del suelo (campos, bosques, ríos, pueblos y roca).
#
# Las teselas salen del servicio WMTS «pnoa-ma» del Instituto Geográfico Nacional (ortoimágenes del PNOA de máxima
# actualidad y Sentinel-2), licencia CC BY 4.0 (scne.es): «PNOA cedido por © Instituto Geográfico Nacional». Se bajan en la
# rejilla de Google (GoogleMapsCompatible) y se pasan a la del mapa del juego (las unidades del SVG de Navarra, src/util/geo.js
# mapaXY), con un remuestreo bilineal desde el nivel de tesela más fino que haga falta.
#
# Salen tres cosas:
#   src/assets/relieve/orto.webp            toda Navarra, cada 0,45 unidades (unos 93 m), para la vista de lejos
#   src/assets/relieve/hd/orto/<id>.webp    cada comarca, en la rejilla de su relieve de detalle (unos 28 m), de cerca
#   src/assets/relieve/hd/orto-medio/<id>.webp  lo mismo a 56 m, para el móvil
# y el recuadro de cada imagen en src/data/mapa-orto.js.
#
# Y, para el zoom de los pueblos, la ortofoto fina de cada uno (nivel 18, medio metro por píxel): el cuadrado de su núcleo,
# de lado 2R (R: su radio en metros, como lo calcula haceNucleo en mapa3d.js; casi siempre 700 m), centrado en su centro y
# en sus metros (los de tools/pueblo-real.py: x al este, z al sur), a 2.048 px (hd/orto-pueblos) y a 1.024 (hd/orto-pueblos-medio),
# y el radio de cada imagen en src/data/mapa-orto-pueblos.js. La lista de los pueblos ([{ id, lat, lon, R }]) sale del
# juego: tools/relieve/pueblos-lista.mjs.
#
# Uso: python3 tools/relieve/ortofoto.py bajar <carpeta de teselas>         (baja las que falten, de cuatro en cuatro)
#      python3 tools/relieve/ortofoto.py hacer <carpeta de teselas>         (hace las imágenes; necesita PIL y numpy)
#      python3 tools/relieve/ortofoto.py pueblos-bajar <carpeta de teselas> <lista.json>
#      python3 tools/relieve/ortofoto.py pueblos-hacer <carpeta de teselas> <lista.json>
import sys, os, math, json, re, time, threading, queue, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDA = os.environ.get('SALIDA', ROOT)   # (dónde escribir; por defecto, el propio proyecto)
UA = 'Mozilla/5.0 (compatible; EducationalGameResearch/1.0)'
URL = 'https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&version=1.0.0&layer=OI.OrthoimageCoverage&style=default&tilematrixset=GoogleMapsCompatible&tilematrix={z}&tilerow={y}&tilecol={x}&format=image/jpeg'
Z = 13   # (unos 14 m por píxel en Navarra: de él se sacan las de 28 m, 56 m y 93 m)

# la rejilla del mapa del juego (src/util/geo.js): x = 19 + (lon + 2,52) / 1,80 · 709; y = 17 + (43,325 − lat) / 1,43 · 765
def lonlat(sx, sy): return (sx - 19) * 1.80 / 709 - 2.52, 43.325 - (sy - 17) * 1.43 / 765
def tilexy(lon, lat, z):   # (vale para números sueltos y, con numpy, para tablas)
    try: import numpy as m
    except ImportError: m = math
    n = 2 ** z; la = m.radians(lat)
    return (lon + 180) / 360 * n, (1 - m.log(m.tan(la) + 1 / m.cos(la)) / math.pi) / 2 * n

NAV = (15.0, 12.0, 735.0, 789.0)   # (lo que ocupa Navarra en el SVG, con margen)

def teselas():
    lo0, la0 = lonlat(NAV[0], NAV[1]); lo1, la1 = lonlat(NAV[2], NAV[3])
    x0, y0 = tilexy(lo0, la0, Z); x1, y1 = tilexy(lo1, la1, Z)
    return [(Z, x, y) for x in range(int(x0) - 1, int(x1) + 2) for y in range(int(y0) - 1, int(y1) + 2)]

def bajar(D, lista=None):
    os.makedirs(D, exist_ok=True); q = queue.Queue(); hechas = [0]; fallos = []
    for t in (lista or teselas()):
        p = os.path.join(D, '%d-%d-%d.jpg' % t)
        if not (os.path.exists(p) and os.path.getsize(p) > 0): q.put(t)
    total = q.qsize(); print('faltan', total, flush=True)
    def obrero():
        while True:
            try: z, x, y = q.get_nowait()
            except queue.Empty: return
            p = os.path.join(D, '%d-%d-%d.jpg' % (z, x, y))
            for intento in range(4):
                try:
                    req = urllib.request.Request(URL.format(z=z, x=x, y=y), headers={'User-Agent': UA})
                    with urllib.request.urlopen(req, timeout=40) as r: b = r.read()
                    if b[:2] != b'\xff\xd8': raise ValueError('no es JPEG')
                    open(p + '.tmp', 'wb').write(b); os.replace(p + '.tmp', p); break
                except Exception as e:
                    if intento == 3: fallos.append(((z, x, y), str(e)[:80]))
                    time.sleep(1.5 * (intento + 1))
            hechas[0] += 1
            if hechas[0] % 100 == 0: print(hechas[0], '/', total, flush=True)
    hs = [threading.Thread(target=obrero) for _ in range(4)]
    for h in hs: h.start()
    for h in hs: h.join()
    print('hecho', hechas[0], 'fallos', len(fallos), fallos[:5], flush=True)

def hacer(D):
    import numpy as np
    from PIL import Image
    cache = {}
    def tesela(x, y):
        k = (x, y)
        if k not in cache:
            p = os.path.join(D, '%d-%d-%d.jpg' % (Z, x, y))
            cache[k] = np.asarray(Image.open(p).convert('RGB'), np.float32) if os.path.exists(p) else np.zeros((256, 256, 3), np.float32)
        return cache[k]
    def muestra(sx, sy):   # (sx, sy: rejillas del SVG; bilineal en el mosaico de nivel Z)
        lon, lat = lonlat(sx, sy); gx, gy = tilexy(lon, lat, Z); gx = gx * 256 - 0.5; gy = gy * 256 - 0.5
        x0 = np.floor(gx).astype(np.int64); y0 = np.floor(gy).astype(np.int64); fx = (gx - x0)[..., None]; fy = (gy - y0)[..., None]
        out = np.zeros(sx.shape + (3,), np.float32)
        def at(px, py):
            r = np.zeros(px.shape + (3,), np.float32); tx = px // 256; ty = py // 256
            for a, b in set(zip(tx.ravel().tolist(), ty.ravel().tolist())):
                m = (tx == a) & (ty == b); t = tesela(a, b); r[m] = t[py[m] - b * 256, px[m] - a * 256]
            return r
        out = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy
        return out
    def imagen(x0, y0, paso, w, h, sub=2):   # (cada píxel, media de sub × sub lecturas: sin dientes de sierra)
        acc = np.zeros((h, w, 3), np.float32)
        for i in range(sub):
            for j in range(sub):
                xs = x0 + (np.arange(w) + (i + 0.5) / sub) * paso; ys = y0 + (np.arange(h) + (j + 0.5) / sub) * paso
                SX, SY = np.meshgrid(xs, ys)
                for r0 in range(0, h, 256): acc[r0:r0 + 256] += muestra(SX[r0:r0 + 256], SY[r0:r0 + 256])
        return np.clip(acc / (sub * sub), 0, 255).astype(np.uint8)
    REL = json.loads(re.search(r'export const MAPA_RELIEVE = (\{.*?\});\n', open(os.path.join(ROOT, 'src/data/mapa-relieve.js'), encoding='utf-8').read(), re.S).group(1))
    meta = {}
    # toda Navarra
    paso = 0.45; w = int((NAV[2] - NAV[0]) / paso); h = int((NAV[3] - NAV[1]) / paso)
    im = imagen(NAV[0], NAV[1], paso, w, h, 2)
    out = os.path.join(SALIDA, 'src/assets/relieve/orto.webp'); os.makedirs(os.path.dirname(out), exist_ok=True); Image.fromarray(im).save(out, 'WEBP', quality=82, method=6)
    meta['navarra'] = {'x0': NAV[0], 'y0': NAV[1], 'paso': paso, 'w': w, 'h': h}; print('navarra', w, h, os.path.getsize(out), flush=True)
    # cada comarca, en la rejilla de su relieve de detalle y a la mitad
    for carpeta, k, q in (('orto', 1, 80), ('orto-medio', 2, 80)):
        os.makedirs(os.path.join(SALIDA, 'src/assets/relieve/hd', carpeta), exist_ok=True)
    for cid, d in REL['detalle'].items():
        im = imagen(d['x0'], d['y0'], d['paso'], d['w'], d['h'], 2)
        Image.fromarray(im).save(os.path.join(SALIDA, 'src/assets/relieve/hd/orto', cid + '.webp'), 'WEBP', quality=80, method=6)
        Image.fromarray(im).resize((d['w'] // 2, d['h'] // 2), Image.LANCZOS).save(os.path.join(SALIDA, 'src/assets/relieve/hd/orto-medio', cid + '.webp'), 'WEBP', quality=80, method=6)
        print(cid, d['w'], d['h'], flush=True)
    (os.makedirs(os.path.join(SALIDA, 'src/data'), exist_ok=True), open(os.path.join(SALIDA, 'src/data/mapa-orto.js'), 'w', encoding='utf-8'))[1].write(
        '// La ortofoto del mapa del inicio (tools/relieve/ortofoto.py): dónde cae la imagen de toda Navarra, en unidades del SVG.\n'
        '// Las de cada comarca van en la rejilla de su relieve de detalle (MAPA_RELIEVE.detalle). PNOA cedido por © Instituto\n'
        '// Geográfico Nacional (CC BY 4.0, scne.es).\n'
        'export const MAPA_ORTO = ' + json.dumps(meta['navarra']) + ';\n')

# ---------- los pueblos ----------
ZP = 18; KY = 110574.0
def _pueblos(lista): return [p for p in json.load(open(lista, encoding='utf-8')) if not p.get('sin')]
def _ll(p, x, z):   # (metros del pueblo → lon, lat; vale con tablas de numpy)
    return p['lon'] + x / (111320.0 * math.cos(math.radians(p['lat']))), p['lat'] - z / KY

def pueblos_bajar(D, lista):
    T = set()
    for p in _pueblos(lista):
        R = p['R'] + 8; (lo0, la0), (lo1, la1) = _ll(p, -R, -R), _ll(p, R, R)
        x0, y0 = tilexy(lo0, la0, ZP); x1, y1 = tilexy(lo1, la1, ZP)
        for x in range(int(x0), int(x1) + 1):
            for y in range(int(y0), int(y1) + 1): T.add((ZP, x, y))
    bajar(D, sorted(T))

def pueblos_hacer(D, lista):
    import numpy as np
    from PIL import Image
    for carpeta in ('orto-pueblos', 'orto-pueblos-medio'): os.makedirs(os.path.join(SALIDA, 'src/assets/relieve/hd', carpeta), exist_ok=True)
    meta = {}; N = 2048
    # (el tono de cada una, igualado al de la ortofoto de toda Navarra en su sitio: las del nivel 18 son de otros vuelos, más
    # oscuras y azuladas, y el pueblo salía como un parche de otro color en medio del verde de la comarca)
    base = np.asarray(Image.open(os.path.join(ROOT, 'src/assets/relieve/orto.webp')).convert('RGB'), np.float32)
    def tono_de(p):
        sx = 19 + (p['lon'] + 2.52) / 1.80 * 709; sy = 17 + (43.325 - p['lat']) / 1.43 * 765
        i = int((sx - NAV[0]) / 0.45); j = int((sy - NAV[1]) / 0.45); r = 22   # (unos 2 km a cada lado)
        v = base[max(0, j - r):j + r, max(0, i - r):i + r].reshape(-1, 3)
        return v.mean(0) if len(v) else None
    for p in _pueblos(lista):
        R = p['R']; c = -R + (np.arange(N) + 0.5) * (2 * R / N); X, Zm = np.meshgrid(c, c)
        lon, lat = _ll(p, X, Zm); gx, gy = tilexy(lon, lat, ZP); gx = gx * 256 - 0.5; gy = gy * 256 - 0.5
        # (el mosaico de las teselas del pueblo, de una vez, y de él, cada píxel con interpolación bilineal)
        tx0, ty0, tx1, ty1 = int(gx.min()) // 256, int(gy.min()) // 256, int(gx.max() + 1) // 256, int(gy.max() + 1) // 256
        M = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256, 3), np.float32)
        for ty in range(ty0, ty1 + 1):
            for tx in range(tx0, tx1 + 1):
                f = os.path.join(D, '%d-%d-%d.jpg' % (ZP, tx, ty))
                if os.path.exists(f): M[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = np.asarray(Image.open(f).convert('RGB'), np.float32)
                else: print('  falta', f, flush=True)
        gx -= tx0 * 256; gy -= ty0 * 256
        x0 = np.clip(np.floor(gx).astype(np.int64), 0, M.shape[1] - 2); y0 = np.clip(np.floor(gy).astype(np.int64), 0, M.shape[0] - 2); fx = (gx - x0)[..., None]; fy = (gy - y0)[..., None]
        acc = (M[y0, x0] * (1 - fx) + M[y0, x0 + 1] * fx) * (1 - fy) + (M[y0 + 1, x0] * (1 - fx) + M[y0 + 1, x0 + 1] * fx) * fy
        t = tono_de(p)
        if t is not None:
            m = acc.reshape(-1, 3).mean(0); g = np.clip(t / np.maximum(m, 1), 0.7, 1.7); g = 1 + (g - 1) * 0.8
            acc = acc * g
        im = Image.fromarray(np.clip(acc, 0, 255).astype(np.uint8))
        im.save(os.path.join(SALIDA, 'src/assets/relieve/hd/orto-pueblos', p['id'] + '.webp'), 'WEBP', quality=78, method=6)
        im.resize((N // 2, N // 2), Image.LANCZOS).save(os.path.join(SALIDA, 'src/assets/relieve/hd/orto-pueblos-medio', p['id'] + '.webp'), 'WEBP', quality=80, method=6)
        meta[p['id']] = round(R, 1); print(p['id'], R, flush=True)
    os.makedirs(os.path.join(SALIDA, 'src/data'), exist_ok=True)
    open(os.path.join(SALIDA, 'src/data/mapa-orto-pueblos.js'), 'w', encoding='utf-8').write(
        '// La ortofoto fina de cada pueblo del mapa del inicio (tools/relieve/ortofoto.py pueblos-hacer): el radio, en metros,\n'
        '// del cuadrado que cubre su imagen, centrado en el centro del pueblo. PNOA cedido por © Instituto Geográfico Nacional\n'
        '// (CC BY 4.0, scne.es).\n'
        'export const ORTO_PUEBLOS = ' + json.dumps(meta, separators=(',', ':')) + ';\n')

if __name__ == '__main__':
    {'bajar': bajar, 'hacer': hacer, 'pueblos-bajar': pueblos_bajar, 'pueblos-hacer': pueblos_hacer}[sys.argv[1]](*sys.argv[2:])
