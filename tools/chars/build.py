# Genera los personajes GLB de MENDIMENDIZ.  Uso:  python3 tools/chars/build.py protagonista
# Salida: public/chars/<archivo>.glb + tools/chars/out/<archivo>.json (informe)
import sys, os, json, math, struct, subprocess, random
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFilter
import charlib as C
import humanoid as HU
import anims as AN

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'src', 'assets', 'chars'); TMP = os.path.join(ROOT, 'tools', 'chars', 'out')
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)

# ------------------------------------------------------------------ diseños (100 % originales)
DESIGNS = {
    # Beñat, joven pastor navarro: pelo moreno alborotado, pañuelo rojo, chaleco ciruela,
    # camisa clara remangada, pantalón corto de lana, calcetines gordos y botas de cuero
    'protagonista': dict(file='char_protagonista', label='Protagonista', H=1.12, build=1.0,
        skin=(241, 196, 160), blush=(236, 128, 118), hair=(58, 36, 24), brow=(44, 26, 16), iris=(96, 58, 28),
        shirt=(238, 232, 216), vest=(106, 40, 84), button=(222, 184, 88), shorts=(92, 78, 64), socks=(234, 226, 206),
        boots=(122, 76, 42), sole=(58, 40, 28), scarf=(200, 34, 42), eyeW=0.034, eyeH=0.047),
}

def paint_body(BA, D, d):
    """Atlas del cuerpo 1024: tronco (camisa, chaleco con botones, pantalón), piernas (pantalón,
    rodilla, calcetines de canalé), brazos (manga remangada), botas, caña y pañuelo."""
    sk, sh, ve, so = D['skin'], D['shirt'], D['vest'], D['shorts']
    dark = lambda c, k=0.8: tuple(int(v * k) for v in c)
    # tronco: v 0 = entrepierna, 1 = cuello; u 0,5 = frente
    BA.fill('torso', ve, 0.75)
    BA.band('torso', 0.0, 0.22, so, 0.8)                                   # pantalón corto de lana
    BA.band('torso', 0.2, 0.24, dark(so, 0.7), 0.6)                        # cinturilla
    BA.band('torso', 0.24, 0.78, sh, 0.75, u0=0.43, u1=0.57)               # camisa por la abertura del chaleco
    BA.band('torso', 0.74, 0.82, sh, 0.75)                                  # cuello de la camisa
    BA.band('torso', 0.82, 1.0, sk, 0.55)                                   # cuello (piel)
    for v in (0.36, 0.48, 0.6):
        BA.dot('torso', 0.425, v, 7, D['button'], 0.35, 0.7)               # botones del chaleco
    for u in (0.43, 0.57):
        x0, y0 = BA.px('torso', u, 0.78); x1, y1 = BA.px('torso', u, 0.24)
        BA.d.line([x0, y0, x1, y1], fill=dark(ve, 0.6), width=3)          # ribete del chaleco
    # costuras laterales pintadas
    for u in (0.25, 0.75):
        x0, y0 = BA.px('torso', u, 0.8); x1, y1 = BA.px('torso', u, 0.24)
        BA.d.line([x0, y0, x1, y1], fill=dark(ve, 0.75), width=2)
    for side in ('Left', 'Right'):
        c = 'leg_' + side                       # v 0 = cadera, 1 = tobillo
        BA.fill(c, D['socks'], 0.8)
        BA.band(c, 0.0, 0.36, so, 0.8); BA.band(c, 0.33, 0.36, dark(so, 0.75), 0.8)       # bajo del pantalón
        BA.band(c, 0.36, 0.56, sk, 0.55)                                                   # rodilla al aire
        for i in range(12):                                                                 # canalé del calcetín
            BA.band(c, 0.56, 1.0, dark(D['socks'], 0.88), 0.85, u0=i / 12, u1=i / 12 + 0.035)
        BA.band(c, 0.56, 0.6, dark(D['socks'], 0.8), 0.85)
        a = 'arm_' + side                       # v 0 = hombro, 1 = muñeca
        BA.fill(a, sk, 0.55)
        BA.band(a, 0.0, 0.46, sh, 0.75)
        BA.band(a, 0.44, 0.57, dark(sh, 0.9), 0.75)                                         # manga remangada
        for v in (0.48, 0.53): BA.band(a, v, v + 0.012, dark(sh, 0.75), 0.75)
        b = 'boot_' + side
        BA.fill(b, D['boots'], 0.5); BA.band(b, 0.0, 0.3, D['sole'], 0.6)
        for i in range(3): BA.band(b, 0.62 + i * 0.08, 0.64 + i * 0.08, (230, 220, 200), 0.7, u0=0.44, u1=0.56)   # cordones
        k = 'cuff_' + side
        BA.fill(k, dark(D['boots'], 0.85), 0.5); BA.band(k, 0.7, 1.0, dark(D['boots'], 0.7), 0.5)
    BA.fill('hand', sk, 0.55)
    BA.fill('scarf', D['scarf'], 0.75)
    for i in range(6): BA.band('scarf', i / 6, i / 6 + 0.03, dark(D['scarf'], 0.78), 0.75)

def paint_face(FA, D):
    """Atlas de cara y pelo 512: piel con colorete, nariz, pelo con mechas, cejas, boca."""
    FA.fill('skin', D['skin'], 0.55)
    x0, y0, x1, y1 = FA.cells['skin']
    blush = Image.new('RGBA', (int(x1 - x0), int(y1 - y0)), (0, 0, 0, 0)); bd = ImageDraw.Draw(blush)
    for u in (0.5 - 0.09, 0.5 + 0.09):
        cx, cy = u * blush.width, (1 - 0.43) * blush.height
        bd.ellipse([cx - 14, cy - 9, cx + 14, cy + 9], fill=D['blush'] + (120,))
    blush = blush.filter(ImageFilter.GaussianBlur(5))
    FA.img.alpha_composite(blush, (int(x0), int(y0)))
    FA.fill('nose', tuple(min(255, int(c * 1.0 + (d - c) * 0.18)) for c, d in zip(D['skin'], D['blush'])), 0.5)
    for nm in ('line_L', 'line_R', 'mline'): FA.fill(nm, (48, 28, 22) if nm != 'mline' else (110, 40, 36), 0.5)
    FA.fill('hair', D['hair'], 0.6)
    x0, y0, x1, y1 = FA.cells['hair']
    rnd = random.Random(3)
    for i in range(14):                                                    # mechas pintadas, suaves
        x = x0 + rnd.random() * (x1 - x0)
        FA.d.line([x, y0, x + rnd.uniform(-4, 4), y1], fill=tuple(min(255, int(c * 1.14)) for c in D['hair']), width=2)
    FA.fill('lid', D['skin'], 0.55)
    FA.fill('brow', D['brow'], 0.6)
    FA.fill('mouth', (92, 26, 30), 0.5); FA.fill('tongue', (226, 104, 110), 0.5); FA.fill('teeth', (252, 248, 240), 0.3)

def eye_texture(path, iris):
    """Textura del ojo 256×256: blanco, iris con degradado, pupila y dos brillos."""
    S = 256; im = Image.new('RGB', (S, S), (250, 250, 248)); d = ImageDraw.Draw(im)
    cx = cy = S / 2; R = 40
    for i in range(R, 0, -1):
        k = i / R; col = tuple(int(c * (0.55 + 0.45 * (1 - k)) + 30 * (1 - k)) for c in iris)
        d.ellipse([cx - i, cy - i * 1.08, cx + i, cy + i * 1.08], fill=col)
    d.ellipse([cx - R, cy - R * 1.08, cx + R, cy + R * 1.08], outline=tuple(int(c * 0.45) for c in iris), width=3)
    d.ellipse([cx - 17, cy - 19, cx + 17, cy + 19], fill=(14, 10, 8))
    d.ellipse([cx - 22, cy - 26, cx - 6, cy - 9], fill=(255, 255, 255))
    d.ellipse([cx + 10, cy + 12, cx + 18, cy + 20], fill=(255, 255, 255))
    im.save(path); return path

def placeholder(path, size):
    Image.new('RGB', (size, size), (255, 255, 255)).save(path); return path

def build(key):
    D = dict(DESIGNS[key]); name = D['file']; H = D['H']
    C.reset()
    tex = lambda n: os.path.join(TMP, f'{name}_{n}.png')
    for n, sz in (('body', 1024), ('body_mr', 1024), ('face', 512), ('face_mr', 512), ('eyes', 256)): placeholder(tex(n), sz)
    Pn = D['label']
    D['mat_body'] = C.material(f'MAT_{Pn}_Body', tex('body'), mr_path=tex('body_mr'))
    D['mat_face'] = C.material(f'MAT_{Pn}_Face', tex('face'), mr_path=tex('face_mr'))
    mat_eyes = C.material(f'MAT_{Pn}_Eyes', tex('eyes'), rough=0.2, clamp=True)
    d = HU.dims(H, D)
    rig = HU.build_rig(d)
    BA = C.Atlas(1024, 4, 4); FA = C.Atlas(512, 4, 4)
    HU.build_body(d, D, rig, BA)
    hr = BA.cell('hand')
    for s in (1, -1):
        for kind in (('open', 'fist') if s > 0 else ('open', 'fist', 'point')):
            HU.hand(d, s, kind, rig, hr, D)
    HU.build_head(d, D, rig, FA)
    HU.build_hair(d, D, rig, FA)
    HU.build_eyes(d, D, rig, mat_eyes)
    HU.build_face_sets(d, D, rig, FA)
    HU.build_scarf(d, D, rig, BA)
    rig.socket('Socket_Head', 'HeadTop_End')
    rig.socket('Socket_Hand_R', 'RightHand')
    rig.socket('Socket_Back', 'Spine2', (0, 0.1 * H, -0.05 * H))
    # texturas definitivas y recarga en Blender
    paint_body(BA, D, d); BA.save(tex('body'), tex('body_mr'))
    paint_face(FA, D); FA.save(tex('face'), tex('face_mr'))
    eye_texture(tex('eyes'), D['iris'])
    for im in bpy.data.images: im.reload()
    A = C.Anim(rig); AN.make_clips(A, H)
    path = os.path.join(OUT, name + '.glb')
    C.export(path)
    report = postprocess(path, A.clips)
    report['altura_m'] = H
    json.dump(report, open(os.path.join(TMP, name + '.json'), 'w'), indent=1, ensure_ascii=False)
    print(json.dumps(report, ensure_ascii=False, indent=1))

def read_glb(path):
    b = open(path, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl]); rest = b[20 + jl:]
    return j, rest
def write_glb(path, j, rest):
    js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + len(rest)
    open(path, 'wb').write(struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + rest)

def postprocess(path, clips):
    """Asegura los 'extras' de cara en cada clip e informa de triángulos, huesos, materiales…"""
    j, rest = read_glb(path)
    ex = {n: e for n, _, e in clips}
    for a in j.get('animations', []):
        if a['name'] in ex: a['extras'] = {**a.get('extras', {}), **{k: v for k, v in ex[a['name']].items()}}
    write_glb(path, j, rest)
    tris = {}
    for m in j['meshes']:
        n = 0
        for p in m['primitives']:
            acc = j['accessors'][p['indices']] if 'indices' in p else j['accessors'][p['attributes']['POSITION']]
            n += acc['count'] // 3
        tris[m['name']] = n
    defaults = [nd['name'] for nd in j['nodes'] if nd.get('extras', {}).get('default') is not False and 'mesh' in nd]
    visible = sum(t for nm, t in tris.items() if nm in defaults or nm not in [nd['name'] for nd in j['nodes'] if nd.get('extras', {}).get('default') is False])
    val = subprocess.run(['node', '-e', f"""const v=require('gltf-validator'),fs=require('fs');v.validateBytes(new Uint8Array(fs.readFileSync('{path}'))).then(r=>console.log(JSON.stringify({{errores:r.issues.numErrors,avisos:r.issues.numWarnings,info:r.issues.numInfos,mensajes:r.issues.messages.filter(m=>m.severity<2).slice(0,8).map(m=>m.code+': '+m.message)}})))"""],
                         capture_output=True, text=True, cwd=ROOT)
    try: validator = json.loads(val.stdout.strip().splitlines()[-1])
    except Exception: validator = {'error': val.stderr[-400:]}
    return {
        'archivo': os.path.basename(path), 'peso_MB': round(os.path.getsize(path) / 1e6, 2),
        'triangulos_por_malla': tris, 'triangulos_total': sum(tris.values()), 'triangulos_visibles_por_defecto': visible,
        'huesos': len(j['skins'][0]['joints']) if j.get('skins') else 0,
        'materiales': [m['name'] for m in j['materials']],
        'texturas': [(im.get('name'), im.get('mimeType')) for im in j.get('images', [])],
        'clips': {a['name']: round(max(j['accessors'][s['input']]['max'][0] for s in a['samplers']), 2) for a in j.get('animations', [])},
        'validador': validator,
    }

if __name__ == '__main__':
    for k in (sys.argv[1:] or ['protagonista']): build(k)
