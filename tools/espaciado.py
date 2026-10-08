# Rejilla de espaciado única: lleva cada relleno, margen y hueco (padding, margin, gap) de las hojas de estilo, y del CSS
# escrito dentro de los .js de la interfaz, al paso de 4 px más cercano (0, 1 y 2 px se quedan: son finos ajustes de
# bordes). En un empate (6, 10, 14, 18, 22…) gana el múltiplo de 8, que es la rejilla grande: 6 → 8, 10 → 8, 14 → 16,
# 18 → 16, 22 → 24. También los márgenes con los bordes de la pantalla (top, right, bottom, left de hasta 32 px y los
# «env(safe-area-inset-…) + N px»), para que todo quede a la misma distancia del borde.
# Uso: python3 tools/espaciado.py [--check]
import re, sys
FILES = ['src/style.css', 'src/hub/hub.css', 'src/pelota/hud.js', 'src/pelota/ficha.js', 'src/futbol/hud.js', 'src/futbol/liga.js',
         'src/game/torneo.js', 'src/ui/champion.js', 'src/ui/vermas.js']
def snap(v):
    a = abs(v)
    if a <= 2: return v
    lo, hi = 4 * int(a // 4), 4 * int(a // 4) + 4
    if a - lo < hi - a: n = lo
    elif hi - a < a - lo: n = hi
    else: n = lo if lo % 8 == 0 else hi
    return -n if v < 0 else n
def fmt(n): return str(int(n)) if float(n).is_integer() else str(n)
def px(m):
    v = float(m.group(1)); n = snap(v)
    return f"{fmt(n)}px"
NUM = re.compile(r'(-?\d+(?:\.\d+)?)px')
SPACING = re.compile(r'((?:padding|margin|gap|row-gap|column-gap|grid-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-start|-end)?)?\s*:\s*)([^;}"\'`]+)')
EDGE = re.compile(r'(\b(?:top|right|bottom|left|inset)\s*:\s*)(-?\d+(?:\.\d+)?)px(?=\s*[;}"\'`!])')
ENV = re.compile(r'(env\(safe-area-inset-\w+(?:,\s*0(?:px)?)?\)\s*\+\s*)(\d+(?:\.\d+)?)px')
check = '--check' in sys.argv; total = 0
for f in FILES:
    s = open(f).read(); o = s
    s = SPACING.sub(lambda m: m.group(1) + NUM.sub(px, m.group(2)), s)
    s = EDGE.sub(lambda m: m.group(1) + (fmt(snap(float(m.group(2)))) + 'px' if abs(float(m.group(2))) <= 32 else m.group(2) + 'px'), s)
    s = ENV.sub(lambda m: m.group(1) + fmt(snap(float(m.group(2)))) + 'px', s)
    n = sum(1 for a, b in zip(o.split('\n'), s.split('\n')) if a != b); total += n
    print(f, n, 'líneas')
    if not check and s != o: open(f, 'w').write(s)
print('total', total)
