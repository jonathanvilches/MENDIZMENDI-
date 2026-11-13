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
# Uso: python3 tools/relieve/ortofoto.py bajar <carpeta de teselas>         (baja las que falten, de cuatro en cuatro)
#      python3 tools/relieve/ortofoto.py hacer <carpeta de teselas>         (hace las imágenes; necesita PIL y numpy)
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

def bajar(D):
    os.makedirs(D, exist_ok=True); q = queue.Queue(); hechas = [0]; fallos = []
    for t in teselas():
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

if __name__ == '__main__':
    {'bajar': bajar, 'hacer': hacer}[sys.argv[1]](sys.argv[2])
