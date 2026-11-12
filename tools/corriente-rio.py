#!/usr/bin/env python3
"""El nivel del agua de un río de un pueblo, en el sentido en que baja de verdad (noviembre de 2026).

tools/pueblo-real-juego.py orienta cada tramo de río para que empiece por el extremo más alto según el relieve y le pone
de nivel el mínimo de lo que lleva recorrido. En un valle estrecho el relieve de 20-25 m ve más alto el fondo de lo que
es (en la Foz de Burgui, las paredes) y el tramo del Esca que pasa por Burgui quedaba al revés: subía 9 m hacia la Foz,
y la corriente se pintaba río arriba. Aquí se le da la vuelta a los tramos que se digan, encadenados en el sentido de la
corriente, y el nivel se rehace con el mínimo del cauce (lo más bajo del relieve a 12 m del eje) visto hasta ese punto,
y bajando además un 0,2 % para que se vea correr. Nunca queda por encima del suelo.

Con --presa x,z,salto, una presa en ese punto del río: desde ella, el agua queda `salto` metros más baja, con dos puntos
más a su lado para que el escalón sea corto (la de Burgui, antes del puente, la que saltan las almadías;
src/world/presas.js la levanta).

Uso: python3 -I tools/corriente-rio.py <pueblo> <río> <x,z de la fuente aguas arriba> [--presa x,z,salto]
p. ej.: python3 -I tools/corriente-rio.py burgui-burgi Ezka 498,-278 --presa 51.3,149.8,1.1
Después de volver a sacar el pueblo con tools/pueblo-real-juego.py hay que pasarlo otra vez.
"""
import json, math, sys

pueblo, rio, fuente = sys.argv[1], sys.argv[2], tuple(float(v) for v in sys.argv[3].split(','))
presa = tuple(float(v) for v in sys.argv[sys.argv.index('--presa') + 1].split(',')) if '--presa' in sys.argv else None
ruta = f'src/data/reales/{pueblo}.json'
D = json.load(open(ruta))


def unpred(h, n):
    o = [0] * len(h)
    for j in range(n):
        for i in range(n):
            k = j * n + i
            o[k] = h[k] + ((o[k - 1] + o[k - n] - o[k - n - 1]) if i and j else o[k - 1] if i else o[k - n] if j else 0)
    return o


g1, g2 = D['dem'], D['dem2']
H1, H2 = [v / 10 for v in unpred(g1['h'], g1['n'])], unpred(g2['h'], g2['n'])
half1, half2 = (g1['n'] - 1) * g1['step'] / 2, (g2['n'] - 1) * g2['step'] / 2


def samp(H, n, st, half, x, z):
    fx = min(max((x + half) / st, 0), n - 1.0001); fz = min(max((z + half) / st, 0), n - 1.0001)
    i, j = int(fx), int(fz); tx, tz = fx - i, fz - j
    a, b = H[j * n + i], H[j * n + min(i + 1, n - 1)]
    c, e = H[min(j + 1, n - 1) * n + i], H[min(j + 1, n - 1) * n + min(i + 1, n - 1)]
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz


def relieve(x, z):
    return samp(H1, g1['n'], g1['step'], half1, x, z) if max(abs(x), abs(z)) < half1 - 40 else samp(H2, g2['n'], g2['step'], half2, x, z)


def cauce(x, z):
    return min(relieve(x + dx, z + dz) for dx in range(-12, 13, 4) for dz in range(-12, 13, 4))


def dec(p, q):
    o, x, z = [], 0, 0
    for i in range(0, len(p) - 1, 2):
        x += p[i]; z += p[i + 1]; o.append([x, z])   # (en enteros, en 1/q m)
    return o


def enc_pts(P):
    o, px, pz = [], 0, 0
    for x, z in P:
        o += [x - px, z - pz]; px, pz = x, z
    return o


tramos = [r for r in D['rios'] if r['n'] == rio]
for r in tramos:
    r['_P'] = dec(r['p'], 2)
# encadenarlos desde la fuente: cada vez, el tramo que empieza (o acaba) donde acabó el anterior
cerca = lambda a, b: math.hypot(a[0] / 2 - b[0], a[1] / 2 - b[1])
orden, punta, quedan = [], fuente, tramos[:]
while quedan:
    r = min(quedan, key=lambda r: min(cerca(r['_P'][0], punta), cerca(r['_P'][-1], punta)))
    if cerca(r['_P'][-1], punta) < cerca(r['_P'][0], punta):
        r['_P'] = r['_P'][::-1]; r['_vuelta'] = True
    orden.append(r); quedan.remove(r); punta = (r['_P'][-1][0] / 2, r['_P'][-1][1] / 2)
# la presa: el tramo y el sitio del río más cercanos, con un punto 0,8 m antes y otro 1,6 m después
if presa:
    best = None
    for r in orden:
        P = r['_P']
        for i in range(len(P) - 1):
            ax, az, bx, bz = P[i][0] / 2, P[i][1] / 2, P[i + 1][0] / 2, P[i + 1][1] / 2
            vx, vz = bx - ax, bz - az; l2 = vx * vx + vz * vz or 1
            t = min(1, max(0, ((presa[0] - ax) * vx + (presa[1] - az) * vz) / l2)); dd = math.hypot(presa[0] - ax - vx * t, presa[1] - az - vz * t)
            if not best or dd < best[0]: best = (dd, r, i, t, math.sqrt(l2))
    _, r, i, t, l = best; P = r['_P']
    def en(tt): return [round(P[i][0] + (P[i + 1][0] - P[i][0]) * tt), round(P[i][1] + (P[i + 1][1] - P[i][1]) * tt)]
    t0, t1 = max(0.0, t - 0.8 / l), min(1.0, t + 1.6 / l)
    nuevos = [q for q in (en(t0), en(t1)) if all(math.hypot(q[0] - o[0], q[1] - o[1]) > 0.6 for o in P)]
    P[i + 1:i + 1] = nuevos
    r['_presa'] = P[i + len(nuevos)] if nuevos else P[i + 1]   # (desde este punto, el agua más baja)
# el nivel: el mínimo del cauce visto hasta aquí, bajando un 0,2 % desde la fuente (y, pasada la presa, su salto menos)
m, d, prev, n0, baja = 1e9, 0.0, None, None, 0.0
for r in orden:
    lv = []
    for x2, z2 in r['_P']:
        if presa and r.get('_presa') == [x2, z2]: baja = presa[2]
        x, z = x2 / 2, z2 / 2
        if prev: d += math.hypot(x - prev[0], z - prev[1])
        prev = (x, z)
        c = cauce(x, z)
        if n0 is None: n0 = c
        m = min(m, c); lv.append(min(m, n0 - 0.002 * d) - baja)
    vs, o, pv = [round(v * 10) for v in lv], [], 0
    for v in vs:
        o.append(v - pv); pv = v
    print(f"{rio}: {len(lv)} puntos{' (al revés)' if r.get('_vuelta') else ''}, de {lv[0]:.1f} a {lv[-1]:.1f}")
    r['p'], r['lv'] = enc_pts(r['_P']), o
    for k in ('_P', '_vuelta', '_presa'):
        r.pop(k, None)
json.dump(D, open(ruta, 'w'), ensure_ascii=False, separators=(',', ':'))
