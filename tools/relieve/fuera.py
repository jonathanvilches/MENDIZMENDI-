# El suelo de alrededor de Navarra y el de toda la península, en color de verdad, para el mapa del inicio de día.
#
# Hasta el 14 de noviembre de 2026 eran dos imágenes de relieve pintado, hechas para el mapa de noche (entorno.webp y
# espana.webp, de tools/relieve/mapa-relieve.py): al lado de la ortofoto de Navarra, lo de fuera era otro dibujo. Ahora
# son imagen de verdad, del mismo servicio que la ortofoto: el WMS «pnoa-ma» del Instituto Geográfico Nacional (CC BY 4.0,
# scne.es: «PNOA cedido por © Instituto Geográfico Nacional»; su capa de fondo es el Blue Marble de la NASA, de MODIS, de
# dominio público).
# El servicio da dos capas: la ortoimagen, que solo cubre España, y un fondo de satélite de todo el mundo, más oscuro. Se
# pide cada una ya en la rejilla del mapa del juego (que es lineal en longitud y latitud: src/util/geo.js), se lleva el
# fondo al tono de la ortoimagen (canal a canal, por sus histogramas en lo que las dos cubren) y se juntan con el borde
# fundido: al cruzar la frontera con Francia o con Portugal no cambia el color.
#
#   src/assets/relieve/entorno-sat.webp        de Bilbao a Zaragoza y del Cantábrico al Moncayo: 2000 × 1520 unidades del
#                                              mapa alrededor de (372, 400), a 2.048 px; con transparencia hacia el borde
#   src/assets/relieve/entorno-sat-medio.webp  lo mismo a 1.280 px, para el móvil
#   src/assets/relieve/espana-sat.webp         toda la península, a 2.048 px
#
# El relieve se saca de las imágenes de antes: sus luces y sombras, sin su color. El mar, que en el servicio es un morado
# plano, se pinta de azul, más claro junto a la costa.
#
# Uso: python3 tools/relieve/fuera.py bajar <carpeta>
#      python3 tools/relieve/fuera.py hacer <carpeta>          (necesita PIL y numpy)
import sys, os, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UA = 'Mozilla/5.0 (compatible; EducationalGameResearch/1.0)'
WMS = 'https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS={capa}&STYLES=&SRS=EPSG:4326&BBOX={bbox}&WIDTH={w}&HEIGHT={h}&FORMAT={fmt}{extra}'

# la rejilla del mapa del juego (src/util/geo.js), como en ortofoto.py
def lonlat(sx, sy): return (sx - 19) * 1.80 / 709 - 2.52, 43.325 - (sy - 17) * 1.43 / 765

PIEZAS = {'entorno': (372 - 1000, 400 - 760, 372 + 1000, 400 + 760), 'espana': (-3006, -451, 2824, 4150)}   # (unidades del mapa)
W = 2048
def alto(rect): return round(W * (rect[3] - rect[1]) / (rect[2] - rect[0]))

def bajar(D):
    os.makedirs(D, exist_ok=True)
    for n, rect in PIEZAS.items():
        lo0, la1 = lonlat(rect[0], rect[1]); lo1, la0 = lonlat(rect[2], rect[3]); bbox = '%.6f,%.6f,%.6f,%.6f' % (lo0, la0, lo1, la1)
        for capa, fmt, ext, extra in (('fondo', 'image/jpeg', 'jpg', ''), ('OI.OrthoimageCoverage', 'image/png', 'png', '&TRANSPARENT=TRUE')):
            p = os.path.join(D, '%s-%s.%s' % (n, capa.split('.')[-1], ext))
            if os.path.exists(p) and os.path.getsize(p) > 20000: continue
            for intento in range(4):
                try:
                    req = urllib.request.Request(WMS.format(capa=capa, bbox=bbox, w=W, h=alto(rect), fmt=fmt, extra=extra), headers={'User-Agent': UA})
                    with urllib.request.urlopen(req, timeout=180) as r: b = r.read()
                    if b[:2] != b'\xff\xd8' and b[:4] != b'\x89PNG': raise ValueError('no es una imagen: ' + repr(b[:80]))
                    open(p, 'wb').write(b); print(os.path.basename(p), len(b), flush=True); break
                except Exception as e:
                    print('fallo', n, capa, str(e)[:120], flush=True); time.sleep(3 * (intento + 1))

def hacer(D):
    import numpy as np
    from PIL import Image, ImageFilter
    R = os.path.join(ROOT, 'src/assets/relieve')
    borra = lambda a, s: np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(s)), np.float32) / 255
    def relieve_de(viejo, w, h):   # (las luces y sombras de la imagen de antes, sin su color: lo que se aparta de su media)
        L = np.asarray(Image.open(os.path.join(R, viejo)).convert('L').resize((w, h), Image.LANCZOS), np.float32) + 1
        B = np.asarray(Image.fromarray(np.clip(L, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(3, w / 180))), np.float32) + 1
        return np.clip(L / B, 0.62, 1.45)
    def pieza(n, viejo):
        F = np.asarray(Image.open(os.path.join(D, n + '-fondo.jpg')).convert('RGB'), np.float32)
        O = np.asarray(Image.open(os.path.join(D, n + '-OrthoimageCoverage.png')).convert('RGBA'), np.float32)
        h, w = F.shape[:2]; esp = (O[..., 3] > 250) & (O[..., :3].sum(-1) < 740)   # (donde hay ortoimagen de verdad)
        # el mar del fondo: un morado oscuro plano
        ref = np.array([32, 26, 38], np.float32); mar = (np.abs(F - ref).sum(-1) < 26) & ~esp
        # el fondo, al tono de la ortoimagen: canal a canal, por sus histogramas en lo que las dos cubren
        G = F.copy()
        for k in range(3):
            a = np.clip(F[..., k][esp], 0, 255).astype(np.uint8); b = np.clip(O[..., k][esp], 0, 255).astype(np.uint8)
            ca = np.cumsum(np.bincount(a, minlength=256)) / a.size; cb = np.cumsum(np.bincount(b, minlength=256)) / b.size
            lut = np.interp(ca, cb, np.arange(256)).astype(np.float32)
            lut = np.convolve(np.pad(lut, 4, mode='edge'), np.ones(9) / 9, 'valid')   # (sin escalones)
            G[..., k] = lut[np.clip(F[..., k], 0, 255).astype(np.uint8)]
        # juntas, con el borde fundido (unos píxeles hacia dentro de España, para no coger el filo blanco de su recorte)
        m = esp.astype(np.float32); dentro = borra(m, 2.0) > 0.97; k = borra(dentro.astype(np.float32), 3.0)[..., None]
        T = O[..., :3] * k + G * (1 - k)
        s = relieve_de(viejo, w, h); T = np.clip(T * (1 + (s[..., None] - 1) * 0.5), 0, 255)   # (el relieve, a medias: la foto ya trae sus sombras)
        # el mar: más claro junto a la costa, más hondo lejos
        mm = borra(mar.astype(np.float32), 1.2); lejos = np.clip((borra(mar.astype(np.float32), max(6, w / 60)) - 0.5) * 2, 0, 1)[..., None]
        azul = np.array([62, 128, 178], np.float32) * (1 - lejos) + np.array([30, 84, 142], np.float32) * lejos
        return T * (1 - mm[..., None]) + azul * mm[..., None]
    E = pieza('espana', 'espana.webp'); out = os.path.join(R, 'espana-sat.webp')
    Image.fromarray(E.astype(np.uint8), 'RGB').save(out, 'WEBP', quality=80, method=6); print('españa', E.shape[1], E.shape[0], os.path.getsize(out), flush=True)
    N = pieza('entorno', 'entorno.webp'); h, w = N.shape[:2]
    A = np.asarray(Image.open(os.path.join(R, 'entorno.webp')).split()[-1].resize((w, h), Image.LANCZOS), np.float32)
    im = Image.fromarray(np.concatenate([N, A[..., None]], -1).astype(np.uint8), 'RGBA')
    out = os.path.join(R, 'entorno-sat.webp'); im.save(out, 'WEBP', quality=82, method=6); print('entorno', w, h, os.path.getsize(out), flush=True)
    out = os.path.join(R, 'entorno-sat-medio.webp'); im.resize((1280, round(1280 * h / w)), Image.LANCZOS).save(out, 'WEBP', quality=80, method=6); print('entorno medio', os.path.getsize(out), flush=True)

if __name__ == '__main__':
    if sys.argv[1:2] == ['bajar']: bajar(sys.argv[2])
    elif sys.argv[1:2] == ['hacer']: hacer(sys.argv[2])
    else: sys.exit('uso: fuera.py bajar|hacer <carpeta>')
