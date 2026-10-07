# Escala tipográfica única: lleva cada tamaño de letra, interlineado e interletrado de las hojas de estilo (y del CSS
# escrito dentro de los .js de la interfaz) al paso más cercano de la escala. Uso: python3 tools/tipografia.py [--check]
import re, sys, glob
FS = [12, 13, 14, 16, 18, 20, 24, 28, 32, 40, 48]
def fs(v):
    v = float(v)
    if v > 50: return None              # rótulos gigantes: se quedan como están
    if v < 12: return 12                # nada por debajo de 12 px
    return min(FS, key=lambda s: (abs(s - v), -s))   # empate: el mayor
def lh(v):
    v = float(v)
    if v <= 1.05: return '1'
    if v <= 1.22: return '1.15'
    if v <= 1.37: return '1.3'
    return '1.45'
def ls(v):
    v = float(v.replace('em', '') or 0)
    if v <= 0.025: return '0'
    if v <= 0.065: return '.04em'
    if v <= 0.18: return '.1em'
    return '.2em'
FILES = ['src/style.css', 'src/hub/hub.css', 'src/futbol/hud.js', 'src/pelota/hud.js', 'src/futbol/liga.js', 'src/game/torneo.js', 'src/hub/hub.js']
check = '--check' in sys.argv; total = 0
for f in FILES:
    s = open(f).read(); o = s; js = f.endswith('.js')
    def rfs(m):
        n = fs(m.group(2)); return m.group(0) if n is None else f"{m.group(1)}{n}px"
    s = re.sub(r'(font-size: ?)(\d+(?:\.\d+)?)px', rfs, s)
    s = re.sub(r'(line-height: ?)(\d*\.?\d+)(?=[;\s}"\'`])', lambda m: m.group(1) + lh(m.group(2)), s)
    s = re.sub(r'(letter-spacing: ?)(-?\d*\.?\d+(?:em)?|0)(?=[;\s}"\'`])', lambda m: m.group(1) + ls(m.group(2)), s)
    if not js:   # atajo font: 900 12px/1.3 'Nunito' (en los .js, «font:» puede ser de un lienzo: no se toca)
        def rsh(m):
            n = fs(m.group(2)); size = m.group(2) if n is None else str(n)
            return f"{m.group(1)}{size}px" + (('/' + lh(m.group(4))) if m.group(4) else '')
        s = re.sub(r'(font: (?:italic )?(?:\d{3} )?)(\d+(?:\.\d+)?)px(/(\d*\.?\d+))?', rsh, s)
    n = sum(1 for a, b in zip(o.split('\n'), s.split('\n')) if a != b); total += n
    print(f, n, 'líneas'); 
    if not check and s != o: open(f, 'w').write(s)
print('total', total)
