# El centro de verdad de cada pueblo con su trazado (la plaza que eligió tools/pueblo-real-juego.py), para el mapa del
# inicio: allí va su baliza, que es donde se levanta su maqueta. Lee los JSON de src/data/reales y de src/data/reales/mapa
# y escribe src/data/reales/centros.js. Uso: python -I tools/reales-centros.py
import json, glob, os
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'reales')
C = {}
for f in sorted(glob.glob(os.path.join(raiz, '*.json')) + glob.glob(os.path.join(raiz, 'mapa', '*.json'))):
    d = json.load(open(f)); C[os.path.basename(f)[:-5]] = [round(d['lat'], 6), round(d['lon'], 6)]
with open(os.path.join(raiz, 'centros.js'), 'w') as o:
    o.write('// El centro de verdad de cada pueblo con su trazado (su plaza), para su baliza en el mapa del inicio.\n// Lo escribe tools/reales-centros.py a partir de los JSON de esta carpeta y de mapa/.\n')
    o.write('export const CENTROS = {\n' + ''.join(f"  '{k}': [{v[0]}, {v[1]}],\n" for k, v in C.items()) + '};\n')
print(len(C), 'centros')
