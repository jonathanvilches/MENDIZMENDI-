# MENDIMENDIZ · acciones del humanoide (30 fps, en el sitio). Reposo en pose A (brazos 38° bajo la horizontal).
# Las poses son giros en el mundo respecto al reposo; mbz_core.Poser los pasa a giros locales.
# Ejes: X = izquierda del personaje, −Y = delante, Z = arriba.
#   Rx(+a): lo que apunta abajo va hacia atrás.  Ry(+a): el brazo izquierdo baja (el derecho sube).  Rz(+a): gira a su izquierda.
import math
from mathutils import Quaternion, Vector
import mbz_core as C

TAU = math.tau
def R(axis, a): return Quaternion(Vector(axis), a)
def Rx(a): return R((1, 0, 0), a)
def Ry(a): return R((0, 1, 0), a)
def Rz(a): return R((0, 0, 1), a)
DOWN = 0.62      # de la pose A a brazos caídos junto al cuerpo

def arms(p, swingL=0.0, swingR=0.0, elbL=0.25, elbR=0.25, outL=0.0, outR=0.0, fwdL=0.0, fwdR=0.0):
    """Brazos: swing (Rx, + hacia atrás), codo doblado hacia delante, out separa del cuerpo."""
    p['LeftArm'] = Rx(swingL) @ Rz(-fwdL) @ Ry(DOWN - outL)
    p['RightArm'] = Rx(swingR) @ Rz(fwdR) @ Ry(-(DOWN - outR))
    p['LeftForeArm'] = Rx(-elbL) @ p['LeftArm']; p['RightForeArm'] = Rx(-elbR) @ p['RightArm']
    p['LeftHand'] = p['LeftForeArm']; p['RightHand'] = p['RightForeArm']
    return p

def legs(p, upL, upR, kL, kR):
    """Piernas: up (Rx, − hacia delante), rodilla (+ dobla hacia atrás). El pie queda casi plano."""
    p['LeftUpLeg'] = Rx(upL); p['RightUpLeg'] = Rx(upR)
    p['LeftLeg'] = Rx(kL) @ p['LeftUpLeg']; p['RightLeg'] = Rx(kR) @ p['RightUpLeg']
    # giro en el mundo: el pie se queda casi plano (solo un 12 % de la inclinación de la espinilla:
    # punta arriba al apoyar el talón delante y talón levantado detrás)
    p['LeftFoot'] = Rx((upL + kL) * 0.12); p['RightFoot'] = Rx((upR + kR) * 0.12)
    p['LeftToeBase'] = p['LeftFoot']; p['RightToeBase'] = p['RightFoot']
    return p

def spine(p, lean=0.0, yaw=0.0, roll=0.0, head=None, hips=None):
    base = hips or Quaternion()
    # lean > 0: se inclina hacia delante (Rx(+a) lleva lo que apunta arriba hacia −Y)
    q = base @ Rz(yaw) @ Rx(lean) @ Ry(roll)
    if hips is not None: p['Hips'] = hips
    p['Spine'] = base @ Rz(yaw * 0.35) @ Rx(lean * 0.45); p['Spine1'] = base @ Rz(yaw * 0.7) @ Rx(lean * 0.8); p['Spine2'] = q
    p['Neck'] = q; p['Head'] = (q @ head) if head is not None else q @ Rx(-lean * 0.4)
    return p

def F(mouth='Neutral', brows='Normal', hands='Open'):
    return {'mouth': mouth, 'brows': brows, 'hands': hands}

def clips(H=1.62):
    """(nombre, fotogramas, función de pose, bucle, expresión)"""
    out = []
    def idle(t, T):
        ph = TAU * t / T; p = {}
        spine(p, lean=0.015 * math.sin(2 * ph), roll=0.025 * math.sin(ph), head=Rx(0.02 * math.sin(2 * ph + 1)) @ Rz(0.06 * math.sin(ph + 0.4)), hips=Ry(0.025 * math.sin(ph)))
        p['_hips_loc'] = Vector((0, 0, -0.004 * (1 + math.cos(2 * ph))))
        arms(p, 0.04 * math.sin(2 * ph), 0.04 * math.sin(2 * ph + 0.6), 0.3, 0.3, 0.05, 0.05)
        legs(p, 0, 0, 0.03 * (1 + math.sin(ph)), 0.03 * (1 - math.sin(ph)))
        return p
    out.append(('Idle', 96, idle, True, F('Neutral')))
    # paso: contacto del talón izquierdo en 0 y del derecho en 15
    def walk(t, T, amp=0.5, knee=0.95, lean=0.06, arm=0.42, bob=0.018):
        ph = TAU * t / T; p = {}
        upL, upR = -amp * math.cos(ph), amp * math.cos(ph)
        kL = 0.06 + knee * max(0, -math.sin(ph)) ** 1.2; kR = 0.06 + knee * max(0, math.sin(ph)) ** 1.2
        spine(p, lean=lean, yaw=0.08 * math.cos(ph), head=Rx(-0.02 * math.sin(2 * ph)), hips=Rz(-0.12 * math.cos(ph)))
        p['_hips_loc'] = Vector((0, 0, -bob * math.cos(2 * ph) - bob))
        arms(p, arm * math.cos(ph), -arm * math.cos(ph), 0.35, 0.35, 0.06, 0.06)
        legs(p, upL, upR, kL, kR)
        return p
    out.append(('Walk', 30, walk, True, F('Smile')))
    def run(t, T):
        ph = TAU * t / T
        p = walk(t, T, amp=0.85, knee=1.6, lean=0.3, arm=0.8, bob=0.035)
        arms(p, 0.8 * math.cos(ph), -0.8 * math.cos(ph), 1.5, 1.5, 0.12, 0.12)
        return p
    out.append(('Run', 18, run, True, F('SmileOpen', 'Happy', 'Fist')))
    def jstart(t, T):
        k = t / T; c = math.sin(math.pi * min(1.0, k * 1.5)) if k < 0.66 else 0.0; up = max(0.0, (k - 0.55) / 0.45)
        p = {'_hips_loc': Vector((0, 0, -0.09 * c + 0.04 * up))}
        spine(p, lean=0.3 * c - 0.1 * up)
        arms(p, 1.0 * c - 1.6 * up, 1.0 * c - 1.6 * up, 0.4, 0.4, 0.15, 0.15)
        legs(p, -0.6 * c, -0.6 * c, 1.2 * c, 1.2 * c)
        return p
    out.append(('Jump_Start', 9, jstart, False, F('SmileOpen', 'Surprised')))
    def jloop(t, T):
        ph = TAU * t / T; p = {'_hips_loc': Vector((0, 0, 0.012 * math.sin(ph)))}
        spine(p, lean=-0.05)
        arms(p, -1.3 + 0.1 * math.sin(ph), -1.3 + 0.1 * math.sin(ph + 1), 0.35, 0.35, 0.45, 0.45)
        legs(p, -0.7 + 0.05 * math.sin(ph), -0.3 - 0.05 * math.sin(ph), 1.2, 0.6)
        return p
    out.append(('Jump_Loop', 24, jloop, True, F('SmileOpen', 'Happy')))
    def land(t, T):
        k = t / T; c = math.sin(math.pi * min(1.0, k * 1.25))
        p = {'_hips_loc': Vector((0, 0, -0.1 * c))}
        spine(p, lean=0.25 * c)
        arms(p, -0.3 * c, -0.3 * c, 0.45, 0.45, 0.45 * c, 0.45 * c)
        legs(p, -0.65 * c, -0.65 * c, 1.3 * c, 1.3 * c)
        return p
    out.append(('Land', 12, land, False, F('Neutral')))
    # hablar: gestos con las manos, asiente y gira la cabeza
    def talk(t, T):
        ph = TAU * t / T; p = idle(t % 3.2, 3.2)
        spine(p, lean=0.03 * math.sin(2 * ph), yaw=0.08 * math.sin(ph), head=Rx(-0.08 * math.sin(2 * ph)) @ Rz(0.12 * math.sin(ph + 0.5)))
        p['RightArm'] = Rz(0.5 + 0.2 * math.sin(ph)) @ Rx(-0.35) @ Ry(-DOWN * 0.7)
        p['RightForeArm'] = Rx(-1.2 - 0.35 * math.sin(2 * ph)) @ p['RightArm']; p['RightHand'] = p['RightForeArm']
        p['LeftArm'] = Rz(-0.3 - 0.15 * math.sin(ph + 2)) @ Rx(-0.2) @ Ry(DOWN * 0.8)
        p['LeftForeArm'] = Rx(-0.8 - 0.25 * math.sin(2 * ph + 1)) @ p['LeftArm']; p['LeftHand'] = p['LeftForeArm']
        return p
    out.append(('Talk', 60, talk, True, F('TalkA')))
    def wave(t, T):
        ph = TAU * t / T; p = idle(t % 3.2, 3.2)
        spine(p, roll=0.05, head=Rz(-0.1) @ Ry(-0.06))
        p['RightArm'] = Rx(-0.3) @ Ry(0.9)                                   # brazo en alto, algo por delante
        p['RightForeArm'] = Ry(0.4 * math.sin(2 * ph)) @ Ry(0.9) @ p['RightArm']; p['RightHand'] = p['RightForeArm']
        return p
    out.append(('Wave', 54, wave, True, F('SmileOpen', 'Happy')))
    def celebrate(t, T):
        ph = TAU * t / T; j = abs(math.sin(ph)); p = {'_hips_loc': Vector((0, 0, 0.1 * j - 0.02))}
        spine(p, lean=-0.1, head=Rx(0.12))
        p['LeftArm'] = Rx(-0.3) @ Ry(-(1.3 + 0.15 * j)); p['RightArm'] = Rx(-0.3) @ Ry(1.3 + 0.15 * j)   # brazos en V
        p['LeftForeArm'] = Ry(-0.35) @ p['LeftArm']; p['RightForeArm'] = Ry(0.35) @ p['RightArm']
        p['LeftHand'] = p['LeftForeArm']; p['RightHand'] = p['RightForeArm']
        legs(p, -0.35 * (1 - j), -0.35 * (1 - j), 0.7 * (1 - j), 0.7 * (1 - j))
        return p
    out.append(('Celebrate', 54, celebrate, True, F('SmileOpen', 'Happy', 'Fist')))
    def scared(t, T):
        ph = TAU * t / T; sh = 0.03 * math.sin(ph * 10); p = {'_hips_loc': Vector((0, 0, -0.06))}
        spine(p, lean=-0.18 + sh, head=Rx(-0.1 + sh))
        p['LeftArm'] = Rx(-0.4) @ Rz(-1.0 + sh) @ Ry(0.2); p['RightArm'] = Rx(-0.4) @ Rz(1.0 - sh) @ Ry(-0.2)
        p['LeftForeArm'] = Rx(-1.2) @ p['LeftArm']; p['RightForeArm'] = Rx(-1.2) @ p['RightArm']
        p['LeftHand'] = p['LeftForeArm']; p['RightHand'] = p['RightForeArm']
        legs(p, -0.35, -0.3, 0.75, 0.7)
        return p
    out.append(('Scared', 48, scared, True, F('Scared', 'Worried')))
    def look(t, T):
        ph = TAU * t / T; p = idle(t % 3.2, 3.2)
        spine(p, yaw=0.18 * math.sin(ph), head=Rz(0.55 * math.sin(ph)) @ Rx(0.08 * math.cos(ph)))
        return p
    out.append(('Look_Around', 90, look, True, F('Neutral', 'Surprised')))
    return out

# poses de prueba antes de exportar
def test_poses():
    def up(p): arms(p, -2.9, -2.9, 0.1, 0.1, 0.4, 0.4); return p
    def crossed(p):
        # por direcciones: brazo colgando algo adelantado y antebrazos cruzados delante del pecho (el izquierdo encima)
        u0, f0 = Vector((0.18, 0, -0.14)).normalized(), Vector((0.14, 0, -0.12)).normalized()
        for s, name, fore in ((1, 'Left', (-0.86, -0.34, 0.38)), (-1, 'Right', (0.86, -0.46, 0.22))):
            m = Vector((s, 1, 1))
            p[name + 'Arm'] = (u0 * m).rotation_difference(Vector((0.02 * s, -0.5, -0.87)).normalized())
            p[name + 'ForeArm'] = (f0 * m).rotation_difference(Vector(fore).normalized())
            p[name + 'Hand'] = p[name + 'ForeArm']
        return p
    def sit(p):
        p['_hips_loc'] = Vector((0, 0, -0.2)); legs(p, -1.45, -1.45, 1.5, 1.5); spine(p, lean=0.1); arms(p, -0.3, -0.3, 0.9, 0.9, 0.2, 0.2); return p
    def step(p): legs(p, -0.95, 0.75, 0.15, 0.35); p['_hips_loc'] = Vector((0, 0, -0.08)); arms(p, 0.5, -0.5, 0.3, 0.3); return p
    return [('brazos_arriba', up), ('brazos_cruzados', crossed), ('sentado', sit), ('paso_largo', step)]
