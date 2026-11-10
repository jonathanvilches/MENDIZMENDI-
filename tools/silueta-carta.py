# Silueta de las cartas (src/ui/neon.css): la de escudo de las cartas de los juegos de fútbol, con la corona arriba
# (esquinas cóncavas, hombros y un pico en medio) y la punta abajo. Saca los polygon() de CSS con las curvas muestreadas:
# clip-path: path() no se estira con la caja y shape() aún no lo tiene todo Safari, así que van como polígonos.
#
#   python3 -I tools/silueta-carta.py            imprime las variables --fifa y --corona de .gx-card y --fifa de .sport
#
# Cada punto es una combinación lineal (porcentaje de la caja + píxeles): las curvas de Bézier son lineales en sus puntos
# de control, así que una curva entre un punto en píxeles y otro en porcentaje sigue siendo un polygon() válido con calc().
# .gx-card escala con su ancho: todo en porcentaje, sobre una carta de 100 x ALTO unidades (su alto en CSS, sport.css).
# .sport cambia de ancho y de alto: la corona y la punta van en píxeles desde los bordes y el centro.
import math

ALTO = 148          # alto de la carta de pelotari por cada 100 de ancho (sport.css: height: calc(var(--w) * 1.48))
CINTA = 3.6         # grosor de la cinta de color del equipo que sigue la corona, en las mismas unidades


class P:
    """Un punto: x = xp % + xa px, y = yp % + ya px."""
    def __init__(s, xp=0.0, xa=0.0, yp=0.0, ya=0.0): s.xp, s.xa, s.yp, s.ya = xp, xa, yp, ya
    def __add__(s, o): return P(s.xp + o.xp, s.xa + o.xa, s.yp + o.yp, s.ya + o.ya)
    def __mul__(s, k): return P(s.xp * k, s.xa * k, s.yp * k, s.ya * k)
    __rmul__ = __mul__
    def espejo(s): return P(100 - s.xp, -s.xa, s.yp, s.ya)


def quad(a, c, b, n):
    """Bézier cuadrática de a a b con control c, n tramos (sin el punto a)."""
    return [a * ((1 - t) ** 2) + c * (2 * t * (1 - t)) + b * (t * t) for t in (i / n for i in range(1, n + 1))]


def num(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def eje(p, a):
    """Una coordenada en CSS: 12.5%, 9px o calc(50% - 18px)."""
    p, a = round(p, 2), round(a, 2)
    if abs(a) < 0.005: return f'{num(p)}%' if p else '0'
    if abs(p) < 0.005: return f'{num(a)}px'
    return f'calc({num(p)}% {"+" if a > 0 else "-"} {num(abs(a))}px)'


def poly(pts):
    out, prev = [], None
    for q in pts:
        s = f'{eje(q.xp, q.xa)} {eje(q.yp, q.ya)}'
        if s != prev: out.append(s)
        prev = s
    return 'polygon(' + ', '.join(out) + ')'


# ---------- la carta de pelotari, en unidades (100 de ancho, ALTO de alto) ----------
def u(x, y): return P(x, 0, y * 100 / ALTO, 0)

R_ESQ, HOMBRO, HOMBRO_C, PICO_X, LADO_FIN, PUNTA_Y = 8, 6, 5.5, 32, 121, ALTO


def corona_u():
    """El borde de arriba en unidades, de la esquina de abajo de la curva izquierda al pico (mitad izquierda)."""
    pts = []
    for i in range(0, 9):                       # la esquina cóncava: un cuarto de círculo con el centro en la esquina
        th = i / 8 * math.pi / 2
        pts.append((R_ESQ * math.sin(th), HOMBRO + R_ESQ * math.cos(th)))
    pts.append((PICO_X, HOMBRO_C))              # el hombro, que sube un poco hacia el centro
    a, c, b = (PICO_X, HOMBRO_C), (44, HOMBRO_C), (50, 0)
    for i in range(1, 11):                      # el flanco del pico, cóncavo
        t = i / 10
        pts.append(((1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]))
    return pts


def punta_u():
    """El borde de abajo en unidades, del final del lado izquierdo a la punta (mitad izquierda)."""
    a, c, b = (0, LADO_FIN), (0, LADO_FIN + 7.5), (8, LADO_FIN + 10.5)
    pts = []
    for i in range(0, 7):                       # la esquina redondeada
        t = i / 6
        pts.append(((1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]))
    pts.append((50, PUNTA_Y))                   # y recto hasta la punta
    return pts


def gx_card():
    top = corona_u()
    izq_arriba = top                                            # del lado izquierdo al pico
    der_arriba = [(100 - x, y) for x, y in reversed(top[:-1])]  # del pico al lado derecho
    abajo = punta_u()
    der_abajo = [(100 - x, y) for x, y in abajo[:-1]]           # del lado derecho a la punta
    izq_abajo = [(x, y) for x, y in reversed(abajo)]            # de la punta al lado izquierdo
    pts = izq_arriba + der_arriba + der_abajo + izq_abajo[:]
    return poly([u(x, y) for x, y in pts])


def cinta():
    """La cinta del equipo: el borde de la corona y, por dentro, el mismo borde a CINTA de distancia. La esquina cóncava
    llega al hombro en ángulo recto: por dentro, el arco (de radio R_ESQ + CINTA) se corta donde toca la paralela al
    hombro; y en el pico las dos mitades se cruzan, así que la de la izquierda se corta en el centro."""
    top = corona_u()
    (hx0, hy0), (hx1, hy1) = (R_ESQ, HOMBRO), (PICO_X, HOMBRO_C)
    L = math.hypot(hx1 - hx0, hy1 - hy0); dx, dy = (hx1 - hx0) / L, (hy1 - hy0) / L
    nx, ny = -dy, dx                                            # la normal del hombro, hacia dentro (abajo)
    if ny < 0: nx, ny = -nx, -ny
    dist = lambda x, y: (x - hx0) * nx + (y - hy0) * ny         # distancia a la línea del hombro, positiva hacia dentro
    arco = lambda th: (math.sin(th) * (R_ESQ + CINTA), HOMBRO + math.cos(th) * (R_ESQ + CINTA))
    lo, hi = 0.0, math.pi / 2                                   # el ángulo donde el arco de dentro toca la paralela
    for _ in range(60):
        mid = (lo + hi) / 2
        if dist(*arco(mid)) > CINTA: lo = mid
        else: hi = mid
    dentro = [arco(i / 8 * lo) for i in range(9)]               # el arco de dentro, hasta el corte
    a, c, b = (PICO_X, HOMBRO_C), (44, HOMBRO_C), (50, 0)
    for i in range(0, 11):                                      # el flanco del pico, desplazado en su normal
        t = i / 10
        x = (1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0]; y = (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]
        tx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]); ty = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1])
        m = math.hypot(tx, ty); qx, qy = -ty / m, tx / m
        if qy < 0: qx, qy = -qx, -qy
        dentro.append((x + qx * CINTA, y + qy * CINTA))
    corte = []
    for i, (x, y) in enumerate(dentro):
        if x >= 50:
            x0, y0 = dentro[i - 1]; k = (50 - x0) / (x - x0); corte.append((50, y0 + (y - y0) * k)); break
        corte.append((x, y))
    fuera = top + [(100 - x, y) for x, y in reversed(top[:-1])]  # por fuera, del lado izquierdo al derecho
    der = [(100 - x, y) for x, y in corte]                       # por dentro, del lado derecho al centro
    izq = list(reversed(corte[:-1]))                             # y del centro al lado izquierdo
    return poly([u(x, y) for x, y in fuera + der + izq])


# ---------- las cartas de Torneos, en píxeles desde los bordes ----------
S_R, S_HOMBRO, S_HOMBRO_C, S_PICO, S_LADO, S_ESQ_X, S_ESQ_Y = 14, 12, 11, 84, 30, 12, 21.5


def sport():
    pts = []
    for i in range(0, 9):
        th = i / 8 * math.pi / 2
        pts.append(P(0, S_R * math.sin(th), 0, S_HOMBRO + S_R * math.cos(th)))
    a = P(50, -S_PICO, 0, S_HOMBRO_C); pts.append(a)
    pts += quad(a, P(50, -S_PICO / 3, 0, S_HOMBRO_C), P(50, 0, 0, 0), 12)
    izq_arriba = pts
    der_arriba = [q.espejo() for q in reversed(pts[:-1])]
    a, c, b = P(0, 0, 100, -S_LADO), P(0, 0, 100, -S_LADO + 7), P(0, S_ESQ_X, 100, -S_ESQ_Y)
    ab = [a] + quad(a, c, b, 6) + [P(50, 0, 100, 0)]
    der_abajo = [q.espejo() for q in ab[:-1]]
    izq_abajo = list(reversed(ab))
    return poly(izq_arriba + der_arriba + der_abajo + izq_abajo)


if __name__ == '__main__':
    print(f'.gx-card --fifa: {gx_card()};')
    print(f'.gx-card --corona: {cinta()};')
    print(f'.sport --fifa: {sport()};')
