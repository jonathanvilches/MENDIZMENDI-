# Los lugares emblemáticos del mapa del inicio, con su forma de verdad: la Ciudadela de Pamplona y El Sadar, el Palacio Real
# de Olite, el castillo de Javier, los puentes de Burgui y de Puente la Reina y Castildetierra en las Bardenas. Lee lo que
# tools/pueblo-real.py saca de Overture Maps (edificios, infraestructuras y usos del suelo, que vienen de OpenStreetMap)
# alrededor de cada sitio y escribe src/data/reales/emblemas.json: para cada uno, su punto (lat, lon) y sus piezas en metros
# desde ese punto (x hacia el este, z hacia el sur), como los pueblos reales. Lo que no está en los datos, como las torres
# de Olite una por una o la altura de Castildetierra, lo pone src/hub/emblemas.js, con lo que se sabe de cada sitio.
#
# Uso: python -I tools/pueblo-real.py pueblo <cache> centros.json <salida> 500   (con estos centros)
#      python -I tools/emblemas-real.py <salida> src/data/reales/emblemas.json
# centros.json: ciudadela 42.8122 -1.6497 · sadar 42.79667 -1.63694 · olite-palacio 42.48162 -1.649286 ·
#   javier-castillo 42.594045 -1.215757 · burgui-puente 42.718644 -1.004608 · puente-reina 42.671125 -1.818792 ·
#   castildetierra 42.2102 -1.5158 (este último, de tres fuentes de senderismo que coinciden; no tiene forma en los datos)
# LICENCIA DE LOS DATOS: ODbL 1.0 (© OpenStreetMap contributors, Overture Maps Foundation), como el resto de la carpeta.
import json, math, sys

src, dst = sys.argv[1], sys.argv[2]
L = lambda i: json.load(open(f'{src}/{i}.json'))
r1 = lambda v: round(v, 1)
plano = lambda p: [r1(c) for xz in p for c in xz]
dentro = lambda p, R: all(math.hypot(x, z) < R for x, z in p)
nombre = lambda e, pat: pat in (e.get('nombre') or '')
out = {'v': 1, 'fuente': 'Overture Maps ' + L('ciudadela')['fuente']['overture'] + ' (OpenStreetMap)', 'licencia': 'ODbL 1.0 (© OpenStreetMap contributors, Overture Maps Foundation)', 'emblemas': {}}

# la Ciudadela: los muros de los baluartes, revellines y fosos que quedan (los dos baluartes que miraban a la ciudad se
# derribaron con el Primer Ensanche, en 1888), los edificios de dentro con su altura y el parque que la rodea
d = L('ciudadela')
muros = [e['p'] for e in d['infra'] if e.get('subtipo') == 'barrier' and e.get('clase') in ('city_wall', 'wall') and dentro(e['p'], 340)]
parque = next(u['p'] for u in d['usos'] if nombre(u, 'Ingurunearen'))
edif = [{'n': e.get('nombre'), 'h': r1(e['h']), 'p': plano(e['p'])} for e in d['edificios'] if e.get('h') and dentro(e['p'], 170)]
out['emblemas']['ciudadela'] = {'lat': d['lat'], 'lon': d['lon'], 'muros': [plano(p) for p in muros], 'parque': plano(parque), 'edificios': edif}

# El Sadar: el estadio (su caja, 30 m) y el campo
d = L('sadar')
est = next(e for e in d['edificios'] if e.get('clase') == 'stadium')
campo = next(u for u in d['usos'] if nombre(u, 'CA Osasuna'))
out['emblemas']['sadar'] = {'lat': d['lat'], 'lon': d['lon'], 'estadio': plano(est['p']), 'h': r1(est['h']), 'campo': plano(campo['p'])}

# el Palacio Real de Olite: su contorno, el Palacio Viejo y la muralla de la villa que lo toca
d = L('olite-palacio')
pal = next(e for e in d['edificios'] if e.get('nombre') == 'Palacio Real de Olite')
viejo = next(e for e in d['edificios'] if e.get('nombre') == 'Palacio Viejo')
mur = [e['p'] for e in d['infra'] if e.get('clase') == 'city_wall']
out['emblemas']['olite'] = {'lat': d['lat'], 'lon': d['lon'], 'palacio': plano(pal['p']), 'viejo': plano(viejo['p']), 'muros': [plano(p) for p in mur if dentro(p, 260)]}

# el castillo de Javier: el castillo, la torre del homenaje y su muralla
d = L('javier-castillo')
cas = next(e for e in d['edificios'] if e.get('nombre') == 'Castillo de Javier')
hom = next(e for e in d['edificios'] if e.get('nombre') == 'Torre del Homenaje')
mur = next(e for e in d['infra'] if e.get('clase') == 'city_wall')
out['emblemas']['javier'] = {'lat': d['lat'], 'lon': d['lon'], 'castillo': plano(cas['p']), 'homenaje': plano(hom['p']), 'muralla': plano(mur['p'])}

# los puentes: su contorno, con los tajamares
for k, pat, arcos in (('burgui', 'Burgiko zubia', 4), ('puente-reina', 'Puente Románico de Puente la Reina', 6)):
    d = L({'burgui': 'burgui-puente', 'puente-reina': 'puente-reina'}[k])
    b = next(e for e in d['infra'] if e.get('subtipo') == 'bridge' and e.get('poligono') and e.get('nombre') == pat)
    out['emblemas'][k] = {'lat': d['lat'], 'lon': d['lon'], 'puente': plano(b['p']), 'arcos': arcos}

d = L('castildetierra')
out['emblemas']['castildetierra'] = {'lat': d['lat'], 'lon': d['lon']}

json.dump(out, open(dst, 'w'), ensure_ascii=False, separators=(',', ':'))
print({k: len(json.dumps(v)) for k, v in out['emblemas'].items()})
