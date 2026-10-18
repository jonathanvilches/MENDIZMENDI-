# Paquete de encargo de las ilustraciones de los personajes de Navarra para una herramienta de imágenes (ChatGPT u otra):
# la lista completa (personajes.csv, personajes.json y prompts.md) con quién es cada uno, su pueblo en el juego, el nombre
# de archivo que espera el juego y un prompt por personaje en castellano y en inglés; las ilustraciones que ya hay, como
# referencia de estilo (referencias/ y una hoja de contacto); y el LEEME con las instrucciones (tamaño, estilo, nombres).
# Lee src/data/personajes.js y src/data/levels.js sin ejecutarlos (expresiones regulares).
# Uso: python3 -I tools/encargo-personajes.py <salida.zip>
import re, json, sys, os, io, csv, zipfile
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_zip = sys.argv[1] if len(sys.argv) > 1 else 'MENDIMENDIZ-encargo-personajes.zip'
src = open(f'{R}/src/data/personajes.js', encoding='utf-8').read()
body = src[src.index('export const PERSONAJES = {'):src.index('// Dónde está cada personaje')]
P = []
for m in re.finditer(r"\n  (\w+): \{\n(.*?)\n  \},", body, re.S):
    pid, b = m.group(1), m.group(2)
    f = lambda k: (re.search(k + r": '((?:[^'\\]|\\.)*)'", b) or [None, None])[1]
    pages = re.findall(r"^      '((?:[^'\\]|\\.)*)',$", b, re.M)
    host = (re.search(r"host: GUIA\('([^']+)'", b) or [None, None])[1]
    P.append({'id': pid, 'name': f('name'), 'eu': f('eu'), 'years': f('years'), 'kicker': f('kicker'), 'women': 'women: true' in b, 'host': host, 'pages': pages, 'today': f('today')})
towns = {}
ft = src[src.index('export const FIGURE_TOWNS'):]
for m in re.finditer(r"'?([\w-]+)'?: \[([^\]]*)\]", ft):
    for pid in re.findall(r"'(\w+)'", m.group(2)): towns[pid] = m.group(1)
lev = {m.group(1): m.group(2) for m in re.finditer(r"\{ id: '([^']+)', name: '([^']+)'", open(f'{R}/src/data/levels.js', encoding='utf-8').read())}
has = {f[:-5] for f in os.listdir(f'{R}/src/assets/personajes/1536') if f.endswith('.webp')}
# la escena de cada ilustración (castellano e inglés): quién, qué hace y dónde; sin parecido con personas reales
ESCENA = {
  'sarasate': ('Pablo Sarasate, violinista del siglo XIX, tocando el violín en un salón de conciertos de Pamplona lleno de público', 'Pablo Sarasate, a 19th-century violinist, playing the violin in a Pamplona concert hall full of people'),
  'indurain': ('Miguel Induráin en bicicleta subiendo un puerto de montaña navarro con el maillot amarillo y gente animando en la cuneta', 'Miguel Induráin cycling up a Navarrese mountain pass in the yellow jersey, with people cheering on the roadside'),
  'gayarre': ('Julián Gayarre, tenor del siglo XIX, cantando en un gran teatro de ópera; al fondo, las montañas del valle de Roncal', 'Julián Gayarre, a 19th-century tenor, singing in a grand opera house; the mountains of the Roncal valley in the background'),
  'blanca': ('Blanca I de Navarra, reina del siglo XV, con corona y manto, en el patio del palacio de Olite con su corte', 'Blanca I of Navarre, a 15th-century queen with crown and mantle, in the courtyard of the Olite palace with her court'),
  'javier': ('Francisco de Javier joven en el castillo de Javier, mirando al horizonte; un barco lejano en el mar', 'Young Francis Xavier at Javier castle, gazing at the horizon; a distant ship at sea'),
  'sancho': ('Sancho VII el Fuerte, rey navarro altísimo con cota de malla, sosteniendo las cadenas rotas de las Navas de Tolosa', 'Sancho VII the Strong, a very tall Navarrese king in chain mail, holding the broken chains of Las Navas de Tolosa'),
  'azpilcueta': ('Martín de Azpilcueta, el Doctor Navarro, sabio del siglo XVI estudiando entre libros y monedas de oro y plata en Salamanca', 'Martín de Azpilcueta, the Navarrese Doctor, a 16th-century scholar studying among books and gold and silver coins in Salamanca'),
  'benjamin': ('Benjamín de Tudela, viajero judío del siglo XII, con su libro de viajes ante las murallas de Tudela y un camino que se pierde hacia Oriente', 'Benjamin of Tudela, a 12th-century Jewish traveller, with his travel book before the walls of Tudela and a road fading towards the East'),
  'julia': ('Julia Álvarez Resano, maestra y abogada de los años treinta, enseñando a niñas y niños en una escuela de la Ribera de Navarra', 'Julia Álvarez Resano, a 1930s teacher and lawyer, teaching girls and boys in a school in the Ribera of Navarre'),
  'golondrinas': ('Un grupo de chicas jóvenes del valle de Roncal cruzando a pie un paso nevado del Pirineo en otoño, con hatillos, camino de Mauleón; golondrinas en el cielo', 'A group of young women from the Roncal valley crossing a snowy Pyrenean pass on foot in autumn, carrying bundles, on their way to Mauléon; swallows in the sky'),
  'toda': ('La reina Toda de Pamplona, siglo X, mujer madura con corona y manto, recibiendo a embajadores en una sala de piedra; estandartes de Pamplona y de Córdoba', 'Queen Toda of Pamplona, 10th century, a mature woman with crown and mantle, receiving ambassadors in a stone hall; banners of Pamplona and Córdoba'),
  'berenguela': ('Berenguela de Navarra, joven reina del siglo XII, en la cubierta de un barco medieval rumbo a Chipre, con la costa a lo lejos', 'Berengaria of Navarre, a young 12th-century queen, on the deck of a medieval ship bound for Cyprus, the coast far away'),
  'catalina': ('Catalina de Foix, reina de Navarra hacia 1500, con corona y vestido de la época, en una sala del palacio de Olite; por la ventana, los Pirineos', 'Catherine of Foix, queen of Navarre around 1500, with crown and period dress, in a hall of the Olite palace; the Pyrenees through the window'),
  'josefa': ('Josefa Úriz Pi, maestra de principios del siglo XX, dando clase al aire libre a niñas y niños en el campo navarro, con cuadernos y una pizarra portátil', 'Josefa Úriz Pi, an early-20th-century teacher, holding an outdoor class for girls and boys in the Navarrese countryside, with notebooks and a portable blackboard'),
  'etxekoandreak': ('Una etxekoandre, la señora de un caserío de la Montaña de Navarra, en la puerta de su casa de piedra con la llave en la mano; gallinas, huerta y el valle verde detrás', 'An etxekoandre, the lady of a farmhouse in the Navarrese mountains, at the door of her stone house holding the key; hens, a vegetable garden and the green valley behind'),
  'conserveras': ('Mujeres de la Ribera de Navarra hacia 1920 pelando pimientos rojos asados y llenando latas en una fábrica de conservas luminosa', 'Women of the Ribera of Navarre around 1920 peeling roasted red peppers and filling tins in a bright canning factory'),
  'arrieta': ('Emilio Arrieta, compositor del siglo XIX, dirigiendo una orquesta en un teatro; a un lado, el puente románico de Puente la Reina', 'Emilio Arrieta, a 19th-century composer, conducting an orchestra in a theatre; to one side, the Romanesque bridge of Puente la Reina'),
  'carmenbaroja': ('Carmen Baroja, escritora de principios del siglo XX, en el salón de un caserón vasco estudiando encajes y joyas antiguas sobre una mesa llena de libros', 'Carmen Baroja, an early-20th-century writer, in the parlour of a Basque manor house studying old lace and jewellery on a table full of books'),
  'carobaroja': ('Julio Caro Baroja, estudioso con gafas y cuaderno, observando a los joaldunak de Ituren con sus cencerros y gorros de cintas en una calle de invierno', 'Julio Caro Baroja, a scholar with glasses and a notebook, watching the joaldunak of Ituren with their cowbells and ribboned hats in a winter street'),
  'baquedano': ('Isabel Baquedano, pintora, en su taller luminoso pintando un cuadro sereno con una figura quieta y un paisaje de la Ribera', 'Isabel Baquedano, a painter, in her bright studio painting a serene picture with a still figure and a Ribera landscape'),
  'oiza': ('Francisco Javier Sáenz de Oiza, arquitecto del siglo XX, con planos y la maqueta de una torre de hormigón de balcones redondos; al fondo, una basílica moderna entre montañas', 'Francisco Javier Sáenz de Oiza, a 20th-century architect, with blueprints and the model of a concrete tower with round balconies; in the background, a modern basilica among mountains'),
  'asins': ('Elena Asins, artista, en su casa de un pueblo de montaña navarro, trabajando con líneas y cuadrados geométricos en blanco y negro junto a un ordenador antiguo', 'Elena Asins, an artist, in her house in a Navarrese mountain village, working with black-and-white geometric lines and squares next to an old computer'),
  'pastores': ('Pastores del Roncal con txapela y capa bajando un gran rebaño de ovejas por la Cañada Real hacia las Bardenas, con perros y burros, paisaje de otoño', 'Shepherds from Roncal with berets and capes driving a large flock of sheep down the drove road towards the Bardenas, with dogs and donkeys, autumn landscape'),
  'huertas': ('Hortelanos y hortelanas de la Ribera de Navarra recogiendo alcachofas y espárragos al amanecer, acequias de agua y el Ebro al fondo', 'Men and women market gardeners of the Ribera of Navarre picking artichokes and asparagus at dawn, irrigation channels and the Ebro river in the background'),
}
ESTILO_ES = 'Ilustración digital cálida y luminosa, estilo de cuento infantil con volumen suave, como las imágenes de referencia. Formato horizontal 16:9, 2560 × 1440 píxeles. Ropa de la época y un entorno reconocible de Navarra. Sin texto, sin letras, sin logotipos ni marcas de agua. No es un retrato documental: una interpretación artística amable, sin buscar el parecido con la persona real.'
ESTILO_EN = 'Warm, luminous digital illustration in a soft, rounded children’s storybook style, matching the reference images. Horizontal 16:9, 2560 × 1440 pixels. Period clothing and a recognisable Navarre setting. No text, no letters, no logos or watermarks. Not a documentary portrait: a kind artistic interpretation, without seeking a likeness of the real person.'
rows = []
for i, p in enumerate(P, 1):
    es, en = ESCENA.get(p['id'], (p['name'], p['name']))
    cat = p['kicker'].split('·')[-1].strip()
    rows.append({'n': i, 'id': p['id'], 'archivo': f"{p['id']}.png", 'estado': 'ya tiene ilustración' if p['id'] in has else 'FALTA', 'nombre': p['name'], 'euskera': p['eu'] or '', 'años': p['years'], 'categoría': cat, 'grupo': 'Mujeres de Navarra' if p['women'] else 'Personajes de Navarra',
                 'pueblo': lev.get(towns.get(p['id'], ''), towns.get(p['id'], '')), 'quién': ' '.join(p['pages']), 'escena_es': es, 'escena_en': en, 'prompt_es': f"{es}. {ESTILO_ES}", 'prompt_en': f"{en}. {ESTILO_EN}"})
faltan = [r for r in rows if r['estado'] == 'FALTA']; hechas = [r for r in rows if r['estado'] != 'FALTA']
LEEME = f"""MENDIMENDIZ · Encargo de las ilustraciones de los personajes de Navarra
=====================================================================

Hay {len(rows)} personajes en el juego ({sum(1 for r in rows if r['grupo'] == 'Mujeres de Navarra')} mujeres y {sum(1 for r in rows if r['grupo'] != 'Mujeres de Navarra')} hombres o colectivos).
{len(hechas)} ya tienen ilustración (están en referencias/, para copiar el estilo). FALTAN {len(faltan)}: son las primeras de la lista.

Cómo generarlas
- Una imagen por personaje, horizontal 16:9, 2560 × 1440 píxeles (si la herramienta no llega, la mayor que permita; 1536 × 1024 vale y se amplía después).
- Mismo estilo que las {len(hechas)} referencias: ilustración digital cálida, volumen suave de cuento infantil, luz amable, colores vivos.
- Ropa de la época y un entorno de Navarra reconocible. El personaje en acción, no un retrato posado.
- Sin texto, sin letras, sin logotipos ni marcas de agua. Sin parecido con la persona real: es una interpretación artística.
- Nombre de archivo exacto (columna «archivo»): es el id que usa el juego. En PNG.
- En prompts.md está el prompt de cada una en castellano y en inglés, listo para copiar. En personajes.csv y personajes.json, lo mismo en tabla.

Cómo entregarlas
- Un ZIP con los PNG con sus nombres. En el juego se guardan en src/assets/personajes (2560, 1536 y 320) con tools/personajes-importar (o se piden al asistente).
- Si se regeneran también las que ya tienen ilustración, que sea con el mismo prompt para que no cambie el estilo.

Nota legal
- Miguel Induráin es una persona viva: su ilustración necesita su permiso antes de publicar o vender el juego (legal/estado-legal.md). Los demás personajes son históricos o colectivos.
- Las imágenes generadas son del autor del proyecto; conviene anotar la herramienta y sus condiciones (legal/registro-licencias.csv).

Lista
"""
for r in faltan + hechas: LEEME += f"- {r['n']:2d}. {r['nombre']} ({r['años']}) · {r['grupo']} · {r['categoría']} · {r['pueblo']} · {r['archivo']} · {r['estado']}\n"
MD = "# Personajes de Navarra: prompts para las ilustraciones\n\nPrimero los que faltan; después los que ya tienen ilustración (por si se quieren rehacer con el mismo estilo).\n\n"
for titulo, lista in (("## Faltan", faltan), ("## Ya tienen ilustración", hechas)):
    MD += titulo + "\n\n"
    for r in lista:
        MD += f"### {r['n']}. {r['nombre']} · {r['años']}\n\n- Grupo: {r['grupo']} · {r['categoría']} · en el juego: {r['pueblo']}\n- Archivo: `{r['archivo']}`\n- Quién es: {r['quién']}\n\n**Prompt (castellano):** {r['prompt_es']}\n\n**Prompt (English):** {r['prompt_en']}\n\n"
z = zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED)
z.writestr('LEEME.txt', LEEME); z.writestr('prompts.md', MD)
z.writestr('personajes.json', json.dumps(faltan + hechas, ensure_ascii=False, indent=1))
buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=list(rows[0].keys())); w.writeheader(); [w.writerow(r) for r in faltan + hechas]; z.writestr('personajes.csv', '﻿' + buf.getvalue())
thumbs = []
for r in hechas:
    im = Image.open(f"{R}/src/assets/personajes/1536/{r['id']}.webp").convert('RGB'); b = io.BytesIO(); im.save(b, 'JPEG', quality=90); z.writestr(f"referencias/{r['id']}.jpg", b.getvalue()); thumbs.append((r['nombre'], im.resize((384, 216))))
if thumbs:
    cols = 4; rws = (len(thumbs) + cols - 1) // cols; sheet = Image.new('RGB', (cols * 392, rws * 240), (245, 242, 236)); d = ImageDraw.Draw(sheet)
    for i, (n, t) in enumerate(thumbs): x, y = (i % cols) * 392 + 4, (i // cols) * 240 + 4; sheet.paste(t, (x, y)); d.text((x + 4, y + 220), n, fill=(30, 30, 40))
    b = io.BytesIO(); sheet.save(b, 'JPEG', quality=88); z.writestr('referencias/hoja-de-contacto.jpg', b.getvalue())
z.close()
print(out_zip, os.path.getsize(out_zip) // 1024, 'KB ·', len(rows), 'personajes,', len(faltan), 'faltan,', len(hechas), 'con ilustración')
