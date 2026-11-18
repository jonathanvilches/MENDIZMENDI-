# Lámina de 4 vistas -> Meshy multi-image-to-3d (máxima calidad) -> esqueleto -> andar y correr.
# La lámina (una imagen con el personaje de frente, tres cuartos, perfil derecho y espalda, sobre fondo liso, en A) se
# hace con Higgsfield (gpt_image_2_6) tomando de referencia de estilo la lámina de un pelotari nuevo; se corta en las
# cuatro vistas por las columnas vacías y se mandan frente, perfil y espalda a Meshy (modelo 'latest'; las chicas del
# 18 de noviembre de 2026 salieron así). Si la API contesta «Input task mode ... is not supported», le ha llegado un
# cuerpo de pedido equivocado (de otra tarea): cada pedido va en su propio archivo temporal.
# La clave de Meshy la pone el proxy de la sesión (Authorization: Bearer dummy); nunca se escribe ni se muestra.
# Salen en 3d/: <nombre>.glb, <nombre>-rig.glb, -walking.glb y -running.glb. Después:
#   node tools/meshy-rig-vecino.mjs 3d/<nombre>-unido.glb 3d/<nombre>-walking.glb:Walking 3d/<nombre>-running.glb:Running
# Uso: DIR=<carpeta de trabajo> python3 tools/meshy-lamina-3d.py nombre:altura [nombre:altura ...]
#   (las láminas en <carpeta>/laminas/<nombre>.png; necesita numpy, ffmpeg e identify)
import json, subprocess, time, os, sys, base64
import numpy as np
D = os.environ.get('DIR', os.getcwd()); os.chdir(D)
for d_ in ('laminas', 'vistas', '3d'): os.makedirs(d_, exist_ok=True)
def api(method, path, body=None):
    cmd = ['curl', '-sS', '-m', '120', '-X', method, 'https://api.meshy.ai/openapi/v1/' + path, '-H', 'Authorization: Bearer dummy']
    if body is not None:
        cuerpo = f'/tmp/_meshy-{os.getpid()}.json'; open(cuerpo, 'w').write(json.dumps(body)); cmd += ['-H', 'Content-Type: application/json', '--data-binary', '@' + cuerpo]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    try: return json.loads(out)
    except Exception: return {'raw': out[:300]}
def vistas(n):
    f = f'laminas/{n}.png'
    W, H = map(int, subprocess.run(['identify', '-format', '%w %h', f], capture_output=True, text=True).stdout.split())
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(int)
    bg = np.median(a[5:40, 5:40].reshape(-1, 3), 0); m = np.abs(a - bg).sum(2) > 40; col = m.sum(0) > 3
    grupos, ini, hueco = [], None, 0
    for x, c in enumerate(col):
        if c:
            if ini is None: ini = x
            hueco = 0; fin = x
        elif ini is not None:
            hueco += 1
            if hueco > 30: grupos.append((ini, fin)); ini = None
    if ini is not None: grupos.append((ini, fin))
    grupos = [g for g in grupos if g[1] - g[0] > 80]
    if len(grupos) != 4: print(n, 'AVISO: grupos', grupos, flush=True)
    filas = np.where(m.sum(1) > 3)[0]; y0, y1 = max(0, filas[0] - 30), min(H, filas[-1] + 30)
    out = {}
    for (x0, x1), v in zip(grupos, ['frente', 'tres-cuartos', 'perfil', 'espalda']):
        lado = max(x1 - x0 + 120, y1 - y0); o = f'vistas/{n}-{v}.jpg'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f, '-vf',
            f'crop={x1 - x0 + 24}:{y1 - y0}:{max(0, x0 - 12)}:{y0},pad={lado}:{lado}:(ow-iw)/2:(oh-ih)/2:color=0x{int(bg[0]):02x}{int(bg[1]):02x}{int(bg[2]):02x},scale=1024:1024', '-q:v', '3', o])
        out[v] = o
    return out
pedidos = [a.split(':') for a in sys.argv[1:]]
tareas = {}
for n, alt in pedidos:
    tf = f'3d/{n}-task.json'
    if os.path.exists(tf): tareas[n] = json.load(open(tf))['result']; continue
    v = vistas(n)
    if not all(k in v for k in ('frente', 'perfil', 'espalda')): print(n, 'sin vistas', flush=True); continue
    urls = ['data:image/jpeg;base64,' + base64.b64encode(open(v[k], 'rb').read()).decode() for k in ('frente', 'perfil', 'espalda')]
    body = {'image_urls': urls, 'ai_model': 'latest', 'geometry_resolution': '2k', 'topology': 'triangle', 'target_polycount': 100000, 'symmetry_mode': 'auto',
            'should_remesh': True, 'should_texture': True, 'enable_pbr': False, 'pose_mode': 'a-pose', 'texture_resolution': '4k'}
    r = api('POST', 'multi-image-to-3d', body); print(time.strftime('%H:%M:%S'), n, 'pedido', r, flush=True)
    if r.get('result'): json.dump(r, open(tf, 'w')); tareas[n] = r['result']
ALT = dict(pedidos); rig = {}
while len(rig) < len(tareas):
    for n, t in tareas.items():
        if n in rig: continue
        if os.path.exists(f'3d/{n}-rigtask.json'): rig[n] = json.load(open(f'3d/{n}-rigtask.json'))['result']; continue
        d = api('GET', 'multi-image-to-3d/' + t); st = d.get('status'); print(time.strftime('%H:%M:%S'), n, st, d.get('progress'), flush=True)
        if st == 'SUCCEEDED':
            json.dump(d, open(f'3d/{n}-estado.json', 'w')); subprocess.run(['curl', '-sS', '-o', f'3d/{n}.glb', d['model_urls']['glb']])
            r = api('POST', 'rigging', {'input_task_id': t, 'height_meters': float(ALT[n])}); print(n, 'rig', r, flush=True)
            if r.get('result'): json.dump(r, open(f'3d/{n}-rigtask.json', 'w')); rig[n] = r['result']
            else: rig[n] = None
        elif st in ('FAILED', 'CANCELED'): print(n, 'FALLO', d.get('task_error'), flush=True); rig[n] = None
    time.sleep(20)
listo = set()
rig = {n: r for n, r in rig.items() if r}
while len(listo) < len(rig):
    for n, r in rig.items():
        if n in listo: continue
        if os.path.exists(f'3d/{n}-running.glb'): listo.add(n); continue
        d = api('GET', 'rigging/' + r); st = d.get('status'); print(time.strftime('%H:%M:%S'), n, 'rig', st, d.get('progress'), flush=True)
        if st == 'SUCCEEDED':
            json.dump(d, open(f'3d/{n}-rig-estado.json', 'w')); res = d['result']
            subprocess.run(['curl', '-sS', '-o', f'3d/{n}-rig.glb', res['rigged_character_glb_url']])
            subprocess.run(['curl', '-sS', '-o', f'3d/{n}-walking.glb', res['basic_animations']['walking_glb_url']])
            subprocess.run(['curl', '-sS', '-o', f'3d/{n}-running.glb', res['basic_animations']['running_glb_url']])
            listo.add(n)
        elif st in ('FAILED', 'CANCELED'): print(n, 'rig FALLO', d.get('task_error'), flush=True); listo.add(n)
    time.sleep(15)
print('TODO LISTO', flush=True)
