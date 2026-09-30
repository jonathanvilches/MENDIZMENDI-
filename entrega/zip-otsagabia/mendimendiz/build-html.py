# Genera mendimendiz.html: un solo archivo con los estilos, la fuente, el motor de pelota, el juego y el modelo 3D incrustados.
# three.js r128, GLTFLoader y SkeletonUtils siguen llegando por CDN. Uso: python build-html.py
import base64, os, re
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda p, mode='r': open(os.path.join(here, p), mode + ('' if mode == 'rb' else ''), **({} if mode == 'rb' else {'encoding': 'utf-8'})).read()
b64 = lambda p: base64.b64encode(rd(p, 'rb')).decode()

html = rd('index.html')
css = rd('css/styles.css').replace("url('../assets/fonts/grozel.woff2')", 'url(data:font/woff2;base64,' + b64('assets/fonts/grozel.woff2') + ')')
game = rd('js/game.js')
fetch = "fetch('assets/models/pastor.glb').then(r => { if (!r.ok) throw new Error('GLB'); return r.arrayBuffer(); }).then(ab => new THREE.GLTFLoader().parse(ab, '', gltf => {"
assert fetch in game, 'no encuentro la carga del modelo en game.js'
game = game.replace(fetch, "const bin = atob('" + b64('assets/models/pastor.glb') + "'), buf = new Uint8Array(bin.length);\n    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);\n    new THREE.GLTFLoader().parse(buf.buffer, '', gltf => {")
game = game.replace("    }, () => done(false))).catch(() => done(false));", "    }, () => done(false));")
html = html.replace('<link rel="stylesheet" href="css/styles.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="js/pelota.js"></script>', '<script>\n' + rd('js/pelota.js') + '\n</script>')
html = html.replace('<script src="js/game.js"></script>', '<script>\n' + game.replace('</script', '<\\/script') + '\n</script>')
out = os.path.join(here, '..', 'mendimendiz.html')
open(out, 'w', encoding='utf-8').write(html)
print('mendimendiz.html', round(os.path.getsize(out) / 1e6, 2), 'MB')
