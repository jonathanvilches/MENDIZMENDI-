# Clips de animación de los humanoides (a 30 fps, en el sitio, sin desplazamiento de raíz).
# Las poses se escriben como giros en el mundo respecto a la pose T (charlib.Anim los pasa a
# locales). Ejes de Blender: X = izquierda del personaje, -Y = delante, Z = arriba.
#   Rx(+a): lo que apunta hacia abajo va hacia atrás; lo que apunta arriba va hacia delante.
#   Ry(+a): el brazo izquierdo (+X) baja; el derecho (-X) sube.
#   Rz(+a): gira hacia la izquierda del personaje.
import math
from mathutils import Quaternion, Vector

def R(axis, a): return Quaternion(Vector(axis), a)
def Rx(a): return R((1, 0, 0), a)
def Ry(a): return R((0, 1, 0), a)
def Rz(a): return R((0, 0, 1), a)
TAU = math.tau
DOWN = 1.22           # brazos caídos junto al cuerpo (desde la pose T)

def arms_down(p, swingL=0.0, swingR=0.0, elbL=0.2, elbR=0.2, outL=0.0, outR=0.0):
    p['LeftArm'] = Rx(swingL) @ Ry(DOWN - outL)
    p['RightArm'] = Rx(swingR) @ Ry(-(DOWN - outR))
    p['LeftForeArm'] = Rx(-elbL) @ p['LeftArm']
    p['RightForeArm'] = Rx(-elbR) @ p['RightArm']
    p['LeftHand'] = p['LeftForeArm']; p['RightHand'] = p['RightForeArm']
    return p

def legs(p, upL, upR, kL, kR, hips=None):
    base = hips or Quaternion()
    p['LeftUpLeg'] = Rx(upL); p['RightUpLeg'] = Rx(upR)
    p['LeftLeg'] = Rx(kL) @ p['LeftUpLeg']; p['RightLeg'] = Rx(kR) @ p['RightUpLeg']
    p['LeftFoot'] = Rx(-0.15 * max(0, -upL)); p['RightFoot'] = Rx(-0.15 * max(0, -upR))   # pies casi planos
    return p

def spine(p, lean=0.0, yaw=0.0, roll=0.0, head=None):
    q = Rz(yaw) @ Rx(lean) @ Ry(roll)
    p['Spine'] = Rz(yaw * 0.4) @ Rx(lean * 0.5); p['Spine1'] = Rz(yaw * 0.7) @ Rx(lean * 0.8); p['Spine2'] = q
    p['Neck'] = q; p['Head'] = head if head is not None else Rx(-lean * 0.5) @ Rz(-yaw * 0.3)
    return p

def make_clips(A, H, fast=1.0):
    """Clips del encargo con la propiedad 'face' para que el juego cambie la cara."""
    F = lambda face, brow='Normal', hand='Open': {'face': face, 'brow': brow, 'hand': hand}
    # Idle: respiración y peso que pasa de una pierna a otra
    def idle(t, T):
        ph = TAU * t / T; p = {}
        p['Hips'] = Ry(0.03 * math.sin(ph)); p['_hips_loc'] = Vector((0.01 * H * math.sin(ph), 0, -0.004 * H * (1 + math.cos(2 * ph))))
        spine(p, lean=0.02 * math.sin(2 * ph), roll=-0.02 * math.sin(ph), head=Rx(0.02 * math.sin(2 * ph + 1)) @ Rz(0.05 * math.sin(ph * 0.5 + 0.3)))
        arms_down(p, 0.04 * math.sin(2 * ph), 0.04 * math.sin(2 * ph + 0.5), 0.25, 0.25)
        legs(p, 0, 0, 0.04 * (1 + math.sin(ph)), 0.04 * (1 - math.sin(ph)))
        return p
    A.clip('Idle', 2.5, idle, extras=F('Normal'))
    # Walk: ciclo de 1 s, brazos contrarios a las piernas, rodilla doblada al pasar
    def walk(t, T, amp=0.55, knee=0.8, lean=0.06, arm=0.45, bob=0.014):
        ph = TAU * t / T; p = {}
        sL, sR = -amp * math.sin(ph), amp * math.sin(ph)
        kL = 0.08 + knee * max(0, math.cos(ph)) ** 1.3; kR = 0.08 + knee * max(0, -math.cos(ph)) ** 1.3
        p['Hips'] = Rz(0.12 * math.sin(ph)); p['_hips_loc'] = Vector((0, 0, -bob * H * math.cos(2 * ph) - bob * H))
        spine(p, lean=lean, yaw=0.05 * math.sin(ph), head=Rx(0.02 * math.sin(2 * ph)))
        arms_down(p, arm * math.sin(ph), -arm * math.sin(ph), 0.35, 0.35, 0.08, 0.08)
        legs(p, sL, sR, kL, kR)
        return p
    A.clip('Walk', 1.0, walk, extras={**F('Normal'), 'stride': 1.0})
    # Run: ciclo de 0,6 s, más inclinado, rodillas altas y brazos doblados
    def run(t, T):
        ph = TAU * t / T; p = walk(t, T, amp=0.95, knee=1.45, lean=0.28, arm=0.85, bob=0.03)
        arms_down(p, 0.85 * math.sin(ph), -0.85 * math.sin(ph), 1.5, 1.5, 0.15, 0.15)
        return p
    A.clip('Run', 0.6, run, extras={**F('Happy'), 'stride': 1.0})
    # salto: impulso, en el aire y caída
    def jstart(t, T):
        k = t / T; c = math.sin(math.pi * min(1, k * 1.6)) if k < 0.62 else 0; up = max(0, (k - 0.55) / 0.45)
        p = {'_hips_loc': Vector((0, 0, -0.06 * H * c + 0.03 * H * up))}
        spine(p, lean=0.25 * c - 0.1 * up)
        arms_down(p, 0.9 * c - 1.6 * up, 0.9 * c - 1.6 * up, 0.4, 0.4, 0.2, 0.2)
        legs(p, -0.5 * c, -0.5 * c, 1.0 * c, 1.0 * c)
        return p
    A.clip('Jump_Start', 0.3, jstart, loop=False, extras=F('Happy'))
    def jloop(t, T):
        ph = TAU * t / T; p = {'_hips_loc': Vector((0, 0, 0.01 * H * math.sin(ph)))}
        spine(p, lean=-0.05)
        arms_down(p, -1.4 + 0.1 * math.sin(ph), -1.4 + 0.1 * math.sin(ph + 1), 0.3, 0.3, 0.5, 0.5)
        legs(p, -0.6 + 0.05 * math.sin(ph), -0.3 - 0.05 * math.sin(ph), 1.1, 0.6)
        return p
    A.clip('Jump_Loop', 0.8, jloop, extras=F('Happy'))
    def land(t, T):
        k = t / T; c = math.sin(math.pi * min(1, k * 1.3))
        p = {'_hips_loc': Vector((0, 0, -0.07 * H * c))}
        spine(p, lean=0.2 * c)
        arms_down(p, -0.3 * c, -0.3 * c, 0.4, 0.4, 0.5 * c, 0.5 * c)
        legs(p, -0.55 * c, -0.55 * c, 1.1 * c, 1.1 * c)
        return p
    A.clip('Land', 0.35, land, loop=False, extras=F('Normal'))
    # Talk: gestos de manos, asiente y gira un poco la cabeza
    def talk(t, T):
        ph = TAU * t / T; p = idle(t % 2.5, 2.5)
        spine(p, lean=0.03 * math.sin(2 * ph), yaw=0.08 * math.sin(ph), head=Rx(0.08 * math.sin(2 * ph)) @ Rz(0.12 * math.sin(ph + 0.5)))
        p['RightArm'] = Rz(0.6 + 0.2 * math.sin(ph)) @ Rx(-0.2) @ Ry(-DOWN * 0.8)
        p['RightForeArm'] = Rx(-1.2 - 0.35 * math.sin(2 * ph)) @ p['RightArm']; p['RightHand'] = p['RightForeArm']
        p['LeftArm'] = Rz(-0.3 - 0.15 * math.sin(ph + 2)) @ Ry(DOWN * 0.85)
        p['LeftForeArm'] = Rx(-0.8 - 0.25 * math.sin(2 * ph + 1)) @ p['LeftArm']; p['LeftHand'] = p['LeftForeArm']
        return p
    A.clip('Talk', 2.0, talk, extras=F('Talk_A'))
    # Wave: brazo derecho arriba y la mano saluda de lado a lado
    def wave(t, T):
        ph = TAU * t / T; p = idle(t % 2.5, 2.5)
        spine(p, roll=0.05, head=Rz(0.1) @ Ry(0.06))
        p['RightArm'] = Rx(0.3) @ Ry(0.7)                     # brazo en alto, algo por delante de la cara
        p['RightForeArm'] = Ry(0.4 * math.sin(2 * ph)) @ Ry(0.8) @ p['RightArm']; p['RightHand'] = p['RightForeArm']
        return p
    A.clip('Wave', 1.8, wave, extras=F('Happy'))
    # Celebrate: salta con los puños arriba
    def celebrate(t, T):
        ph = TAU * t / T; j = abs(math.sin(ph)); p = {'_hips_loc': Vector((0, 0, 0.09 * H * j - 0.02 * H))}
        spine(p, lean=-0.1, head=Rx(-0.15))
        p['LeftArm'] = Rx(0.3) @ Ry(-0.65 - 0.15 * j); p['RightArm'] = Rx(0.3) @ Ry(0.65 + 0.15 * j)   # brazos en V
        p['LeftForeArm'] = Ry(-0.3) @ p['LeftArm']; p['RightForeArm'] = Ry(0.3) @ p['RightArm']
        p['LeftHand'] = p['LeftForeArm']; p['RightHand'] = p['RightForeArm']
        legs(p, -0.35 * (1 - j), -0.35 * (1 - j), 0.7 * (1 - j), 0.7 * (1 - j))
        return p
    A.clip('Celebrate', 1.8, celebrate, extras=F('Happy', 'Normal', 'Fist'))
    # Scared: se encoge, se echa atrás y se protege con los brazos, temblando
    def scared(t, T):
        ph = TAU * t / T; sh = 0.03 * math.sin(ph * 12); p = {'_hips_loc': Vector((0, 0.02 * H, -0.05 * H))}
        spine(p, lean=-0.18 + sh, head=Rx(0.12 + sh))
        p['LeftArm'] = Rx(0.2) @ Rz(-1.1 + sh) @ Ry(0.5); p['RightArm'] = Rx(0.2) @ Rz(1.1 - sh) @ Ry(-0.5)
        p['LeftForeArm'] = Rx(-1.1) @ p['LeftArm']; p['RightForeArm'] = Rx(-1.1) @ p['RightArm']
        p['LeftHand'] = p['LeftForeArm']; p['RightHand'] = p['RightForeArm']
        legs(p, -0.35, -0.3, 0.75, 0.7)
        return p
    A.clip('Scared', 1.6, scared, extras=F('Scared', 'Worried', 'Open'))
    # Look_Around: mira a un lado y a otro
    def look(t, T):
        ph = TAU * t / T; p = idle(t % 2.5, 2.5)
        spine(p, yaw=0.18 * math.sin(ph), head=Rz(0.55 * math.sin(ph)) @ Rx(-0.08 * math.cos(ph)))
        return p
    A.clip('Look_Around', 3.0, look, extras=F('Normal', 'Worried'))
