# Paquete de encargo para regenerar las láminas con más calidad en una herramienta de imágenes (ChatGPT u otra): las 110
# referencias actuales de 1280 × 720 en JPEG, hojas de contacto, la lista por prioridad (encargo.csv y encargo.json) con el
# sitio, el título y un prompt por imagen, y el LEEME con las instrucciones exactas (tamaño, estilo, composición, nombres).
# Lee src/data/laminas.js, src/data/levels.js y src/data/comarcas.json sin ejecutarlos (expresiones regulares).
# Uso: python3 -I tools/encargo-portadas.py <salida.zip>
import re, json, sys, io, os, csv, zipfile
from PIL import Image, ImageDraw, ImageFont
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_zip = sys.argv[1] if len(sys.argv) > 1 else 'MENDIMENDIZ-encargo-portadas.zip'
src = open(f'{R}/src/data/laminas.js', encoding='utf-8').read()
lams = []
for m in re.finditer(r"\{ id: '([^']+)'(.*?)\}", src):
    body = m.group(2); f = lambda k: (re.search(k + r": '([^']*)'", body) or [None, None])[1]
    lams.append({'id': m.group(1), 'town': f('town'), 'comarca': f('comarca'), 'group': f('group'), 'kind': f('kind'), 'title': f('title'), 'eu': f('eu'), 'cover': 'cover: true' in body})
lev = {m.group(1): (m.group(2), m.group(3)) for m in re.finditer(r"\{ id: '([^']+)', name: '([^']+)', comarca: '([^']+)'", open(f'{R}/src/data/levels.js', encoding='utf-8').read())}
com = {c['id']: c['name'] for c in json.load(open(f'{R}/src/data/comarcas.json', encoding='utf-8'))}
KIND = {'pueblo': 'portada del pueblo: su monumento con el explorador', 'paisaje': 'paisaje', 'leyenda': 'escena de leyenda', 'oficio': 'oficio de antes, en su taller', 'cosecha': 'cosecha o producto de la tierra', 'fauna': 'animales del lugar', 'fiesta': 'fiesta o danza', 'deporte': 'deporte'}
def sitio(l):
    if l['town'] and l['town'] in lev: n, c = lev[l['town']]; return f"{n} ({com.get(c, c)})"
    if l['comarca']: return f"comarca de {com.get(l['comarca'], l['comarca'])}"
    return {'oficios': 'oficios de antes de Navarra', 'deportes': 'deportes de Navarra'}.get(l['group'] or '', 'Navarra')
def prio(l): return 1 if (l['cover'] or l['kind'] == 'deporte' or (l['kind'] == 'paisaje' and l['comarca'])) else 2
rows = []
for l in lams:
    web = f"{R}/src/assets/laminas/web/{l['id']}.webp"
    if not os.path.exists(web): continue
    rows.append({**l, 'prio': prio(l), 'sitio': sitio(l), 'que': KIND.get(l['kind'], l['kind']), 'web': web})
rows.sort(key=lambda r: (r['prio'], r['kind'] != 'pueblo', r['kind'] != 'paisaje', r['id']))
for i, r in enumerate(rows, 1): r['n'] = i; r['archivo'] = f"{i:03d}-{r['id']}.jpg"; r['entrega'] = f"{r['id']}.png"
PROMPT_GEN = """Eres ilustrador de un videojuego infantil sobre Navarra. Te iré pasando imágenes de referencia de 1280 × 720. Para cada una, genera LA MISMA ESCENA con mucha más resolución y detalle: misma composición, mismo encuadre, mismos personajes, mismos colores, misma luz y mismo estilo (ilustración 3D tipo película de animación, luz suave, colores vivos, sin fotorrealismo). Reglas fijas: formato 16:9 apaisado al mayor tamaño que puedas (2560 × 1440 o más; si tu máximo es 1536 × 1024, usa calidad alta y deja aire arriba y abajo para poder recortar a 16:9). El explorador es siempre el mismo personaje de las referencias: un niño de unos diez años, pelo castaño rizado, camisa caqui de explorador con bolsillos, pantalón corto, mochila y botas; cuando aparece, va abajo y con los pies dentro del encuadre. Lo importante queda en el 60 % central de la imagen (los lados y el cielo se recortan en el móvil). Sin texto, sin letras, sin marcas de agua, sin bordes ni franjas negras. Entrega cada imagen en PNG."""
PROMPT_IMG = "Regenera la imagen adjunta «{title}» ({sitio}; {que}) con la misma composición, los mismos personajes, colores, luz y estilo, en 16:9 al mayor tamaño posible y con mucho más detalle y nitidez. Sin texto ni marcas. Nombre del archivo: {entrega}"
for r in rows: r['prompt'] = PROMPT_IMG.format(**r)
def jpeg(path):
    im = Image.open(path).convert('RGB'); b = io.BytesIO(); im.save(b, 'JPEG', quality=90, optimize=True, subsampling=0); return b.getvalue()
def hojas():
    font = ImageFont.load_default(); out = []; per = 12; W, H = 400, 225
    for s in range(0, len(rows), per):
        chunk = rows[s:s + per]; cols = 4; filas = (len(chunk) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * (W + 8) + 8, filas * (H + 30) + 8), (28, 24, 36)); d = ImageDraw.Draw(sheet)
        for i, r in enumerate(chunk):
            x, y = 8 + (i % cols) * (W + 8), 8 + (i // cols) * (H + 30)
            sheet.paste(Image.open(r['web']).convert('RGB').resize((W, H), Image.LANCZOS), (x, y))
            d.text((x + 2, y + H + 4), f"{r['n']:03d} {r['id']} · {r['title']}"[:60], fill=(255, 255, 255), font=font)
            d.text((x + 2, y + H + 16), f"prioridad {r['prio']} · {r['sitio']}"[:60], fill=(200, 190, 230), font=font)
        b = io.BytesIO(); sheet.save(b, 'JPEG', quality=85); out.append((f"hojas/hoja-{s // per + 1:02d}.jpg", b.getvalue()))
    return out
n1 = sum(1 for r in rows if r['prio'] == 1)
LEEME = f"""# MENDIMENDIZ · Encargo: las láminas con más calidad

Las {len(rows)} láminas del juego se generaron a 1280 × 720 y en un móvil o un ordenador se ven blandas: la portada del inicio
pide más de 2000 píxeles de ancho. Ampliarlas no sirve (ya está probado con Real-ESRGAN): hay que volver a generarlas más
grandes. Este paquete trae todo lo que necesita la herramienta de imágenes.

## Qué hay dentro

- `referencias/`: las {len(rows)} imágenes actuales, numeradas por prioridad (`001-lesaka.jpg`…). Son la referencia de cada escena.
- `hojas/`: hojas de contacto para ver el conjunto de un vistazo.
- `encargo.csv` y `encargo.json`: la lista con el número, el archivo de referencia, el sitio, el título, qué es, la prioridad,
  el nombre con el que hay que entregar cada imagen y el prompt listo para pegar.
- Este LEEME.

## Qué hay que pedir

1. **Tamaño**: 16:9 apaisado al mayor tamaño que dé la herramienta. Lo ideal es 2560 × 1440 o 3840 × 2160. Si la herramienta
   solo genera 1536 × 1024 (es el máximo de ChatGPT hoy), pide ese tamaño con calidad alta y que deje aire arriba y abajo: yo
   recorto a 16:9. Con 1536 la mejora sobre lo actual es pequeña; si tienes una herramienta que genere a 2K o 4K de verdad
   (Midjourney con ampliación, Ideogram, Flux, Firefly…), úsala para las de prioridad 1.
2. **Misma escena**: cada imagen nueva es la referencia con más detalle, no otra idea. Misma composición, encuadre,
   personajes, colores, luz y estilo (ilustración 3D tipo película de animación, luz suave, colores vivos, sin fotorrealismo).
3. **El explorador**: siempre el mismo niño de las referencias (unos diez años, pelo castaño rizado, camisa caqui con
   bolsillos, pantalón corto, mochila, botas). Cuando aparece, va abajo y con los pies dentro del encuadre.
4. **Composición**: lo importante en el 60 % central; los lados y el cielo se recortan en el móvil. Sin texto, sin letras,
   sin marcas de agua, sin bordes ni franjas negras.
5. **Formato y nombres**: PNG (o WebP con calidad 90 o más; nada de JPEG), con el nombre de la columna «entrega»
   (`lesaka.png`, `baztan-valle.png`…). Mándalas en uno o varios zip; yo saco las cuatro medidas que usa el juego.

## Orden

- Prioridad 1 ({n1} imágenes): las portadas de los pueblos, los paisajes de las comarcas y los deportes. Son las que se ven a
  pantalla entera.
- Prioridad 2 ({len(rows) - n1}): leyendas, oficios, cosechas, animales y fiestas. Se ven más pequeñas; pueden esperar.

## Prompt para empezar el chat (pégalo una vez)

{PROMPT_GEN}

## Prompt por imagen (adjunta la referencia y pega su línea de `encargo.csv`, columna «prompt»)

Ejemplo: {rows[0]['prompt']}

## Lista

| N.º | Referencia | Sitio | Título | Qué es | Prioridad | Entregar como |
|---|---|---|---|---|---|---|
""" + "\n".join(f"| {r['n']:03d} | {r['archivo']} | {r['sitio']} | {r['title']} | {r['que']} | {r['prio']} | {r['entrega']} |" for r in rows) + "\n"
with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('LEEME.md', LEEME)
    b = io.StringIO(); w = csv.DictWriter(b, fieldnames=['n', 'archivo', 'prioridad', 'sitio', 'titulo', 'titulo_eu', 'que', 'entrega', 'prompt'], quoting=csv.QUOTE_ALL)
    w.writeheader()
    for r in rows: w.writerow({'n': f"{r['n']:03d}", 'archivo': r['archivo'], 'prioridad': r['prio'], 'sitio': r['sitio'], 'titulo': r['title'], 'titulo_eu': r['eu'] or '', 'que': r['que'], 'entrega': r['entrega'], 'prompt': r['prompt']})
    z.writestr('encargo.csv', '﻿' + b.getvalue())
    z.writestr('encargo.json', json.dumps([{k: r[k] for k in ('n', 'archivo', 'prio', 'sitio', 'title', 'eu', 'kind', 'que', 'entrega', 'prompt')} for r in rows], ensure_ascii=False, indent=1))
    for r in rows: z.writestr(f"referencias/{r['archivo']}", jpeg(r['web']))
    for name, data in hojas(): z.writestr(name, data)
print(out_zip, os.path.getsize(out_zip), 'bytes;', len(rows), 'láminas;', n1, 'de prioridad 1')
