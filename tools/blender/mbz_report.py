# MENDIMENDIZ · informe legible (INFORME.md) a partir de informe.json.
# Uso suelto:  python3 tools/blender/mbz_report.py entrega/personajes/<personaje>
import json, os, sys

PARTES = {
    'Head': 'Cabeza', 'Hair': 'Pelo (masa)', 'Mechones': 'Mechones (Hair_01–03)', 'Body': 'Piel visible (cuello, antebrazos, rodillas)',
    'Shirt': 'Camisa', 'Vest': 'Chaleco', 'Shorts': 'Pantalón', 'Socks': 'Calcetines', 'Boots': 'Botas', 'Acc_Scarf': 'Pañuelo',
}

DESVIOS = [
    ('Presupuesto de triángulos',
     'El encargo pide una cage de 1.600–2.000 quads y 6–8k triángulos, pero una Subdivision de nivel 1 multiplica cada quad por 4 '
     '(8 triángulos) y el Solidify de la ropa duplica las caras: 2.000 quads dan unos 16k triángulos antes del Solidify. '
     'Se entregan las dos cosas: el GLB principal con Subdivision y Bevel aplicados, y un GLB LOD al nivel de la cage.'),
    ('Bevel de la ropa',
     'Con el límite por ángulo de 30° sobre una cage tan ligera se biselaban casi todas las aristas. El Bevel (0,012 × 3, harden normals) '
     'se limita por peso a los bordes de las prendas (bajo, cuello, sisas, mangas).'),
    ('Nariz',
     'En lugar de una esfera unida, la nariz se extruye de la cabeza en tres pasos con su bucle de transición: mismo volumen (≈ 0,08) '
     'y ninguna unión con n-gons.'),
    ('Zancada de Walk',
     'Una zancada de 2,15 m no es posible con piernas de 0,5 m. El ciclo de 30 fotogramas (contactos en 0 y 15) avanza alrededor de 1 m (1 m/s); '
     'el juego ajusta la velocidad de reproducción a la velocidad real.'),
    ('Numeración del encargo',
     'Algunas referencias internas del encargo («punto n») no coinciden con la numeración del texto; se ha seguido el contenido de cada apartado.'),
    ('Pesos de la ropa',
     'Los pesos automáticos se calculan sobre una copia entera del cuerpo y se transfieren a la piel y a cada prenda (punto más cercano, '
     'interpolado). Así piel y ropa se doblan juntas; luego Limit Total 4, Normalize All y Clean 0,01 como pide el encargo.'),
    ('Copia del juego',
     'La copia de src/assets/chars se cuantiza (KHR_mesh_quantization, sin Draco) para que pese menos; la de esta carpeta es la exportación '
     'de Blender sin tocar.'),
]

def num(n): return f'{n:,}'.replace(',', '.')
def dec(x, k=2): return f'{x:.{k}f}'.replace('.', ',')

def md(out):
    r = json.load(open(os.path.join(out, 'informe.json'), encoding='utf-8'))
    L = []
    name = r['archivo'].replace('char_', '').replace('.glb', '')
    L.append(f'# {name.capitalize()} · informe de construcción\n')
    L.append('Personaje 100 % original, modelado desde cero con bpy y bmesh (Blender 4.2). Se reconstruye entero con el script de `tools/blender/`.\n')
    L.append('## Resumen\n')
    L.append('| | |\n|---|---|')
    L.append(f"| GLB principal | `{r['archivo']}` · **{dec(r['peso_MB'])} MB** (límite 2 MB) |")
    L.append(f"| GLB LOD (nivel cage) | `{r['lod']['archivo']}` · {dec(r['lod']['peso_MB'])} MB · {num(r['lod']['triangulos_en_archivo'])} triángulos en el archivo |")
    L.append(f"| Triángulos visibles (variantes por defecto) | {num(r['triangulos_visibles'])} |")
    L.append(f"| Triángulos en el archivo (con todas las variantes) | {num(r['triangulos_en_archivo'])} |")
    L.append(f"| Caras de la cage | {num(r['cage_caras'])} |")
    L.append(f"| Huesos | {r['huesos_deformadores']} deformadores de {r['huesos_total']} (máx. 60) |")
    L.append(f"| Materiales | {len(r['materiales'])}: " + ', '.join(f'`{m}`' for m in r['materiales']) + ' |')
    L.append('| Texturas | ' + ', '.join(f'{k} {v} px' for k, v in r['texturas'].items()) + ' (PNG 8 bits sRGB) |')
    L.append(f"| Clips | {len(r['clips'])} |")
    v, rv = r['validador'], r['reimportacion']
    L.append(f"| Validador glTF | {v['errores']} errores, {v['avisos']} avisos, {v['info']} informativos |")
    L.append(f"| Reimportación en Blender limpio | altura {dec(rv['altura_m'], 3)} m, pies en z = {dec(rv['pies_z'], 3)}, mira a −Y: {'sí' if rv['mira_a_-Y'] else 'no'}, "
             f"{len(rv['acciones'])} acciones, {len(rv['variantes'])} variantes |\n")
    L.append('## Triángulos por pieza\n')
    L.append('| Pieza | Triángulos |\n|---|---:|')
    for k, n in r['triangulos_por_parte'].items():
        L.append(f'| {PARTES.get(k, k)} | {num(n)} |')
    L.append(f"| **Total visible** | **{num(r['triangulos_visibles'])}** |\n")
    L.append('## Clips\n')
    L.append('| Clip | Fotogramas | Segundos | Boca | Cejas | Manos |\n|---|---:|---:|---|---|---|')
    for k, c in r['clips'].items():
        e = r['expresiones'].get(k, {})
        L.append(f"| {k} | {c['fotogramas']} | {dec(c['segundos'])} | {e.get('mouth', '')} | {e.get('brows', '')} | {e.get('hands', '')} |")
    L.append('\nLas expresiones de cada clip están también en `' + r['archivo'].replace('.glb', '.faces.json') + '` y en los extras de cada Action.\n')
    L.append('## Variantes intercambiables\n')
    L.append(', '.join(f'`{x}`' for x in rv['variantes']) + '.\n')
    L.append('## Limpieza\n')
    bad = {k: x for k, x in r['limpieza'].items() if x['ngons'] or x['sueltos']}
    L.append('Sin n-gons ni vértices sueltos en ninguna malla.\n' if not bad else 'Revisar: ' + ', '.join(bad) + '\n')
    L.append('## Desviaciones del encargo\n')
    for t, x in DESVIOS: L.append(f'- **{t}.** {x}')
    L.append('\n## Renders\n')
    L.append('Carpeta `renders/`: frente, perfil, tres cuartos, espalda, cara, hoja de expresiones, wireframe de frente y de perfil, y las cuatro poses de prueba '
             '(brazos arriba, brazos cruzados, sentado, paso largo).\n')
    L.append('## Reconstruir\n')
    L.append('```\nblender -b -P tools/blender/build_' + name + '.py\n# o, con el módulo bpy de Python 3.11:\npython3.11 tools/blender/build_' + name + '.py\n```')
    with open(os.path.join(out, 'INFORME.md'), 'w', encoding='utf-8') as f: f.write('\n'.join(L) + '\n')
    return os.path.join(out, 'INFORME.md')

if __name__ == '__main__':
    print(md(sys.argv[1]))
