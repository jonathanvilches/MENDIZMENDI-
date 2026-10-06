# Cambia la textura (la primera imagen) de un GLB por otra imagen WebP, rehaciendo el binario.
# Uso: python3 tools/glb-textura.py modelo.glb textura.webp salida.glb
import json, struct, sys
src, tex, dst = sys.argv[1:4]
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
bl = struct.unpack('<I', b[20 + jl:24 + jl])[0]; binc = b[28 + jl:28 + jl + bl]
new = open(tex, 'rb').read()
iv = j['images'][0]['bufferView']
views = j['bufferViews']
# trozos del búfer 0: vistas normales y vistas comprimidas con meshopt (sus datos van en la extensión)
chunks = []
for i, v in enumerate(views):
    e = v.get('extensions', {}).get('EXT_meshopt_compression')
    if e and e.get('buffer', 0) == 0: chunks.append((e.get('byteOffset', 0), i, e))
    elif not e and v.get('buffer', 0) == 0: chunks.append((v.get('byteOffset', 0), i, v))
out = bytearray()
for off, i, holder in sorted(chunks, key=lambda c: c[0]):
    data = new if i == iv else binc[off:off + holder['byteLength']]
    while len(out) % 4: out.append(0)
    holder['byteOffset'] = len(out); holder['byteLength'] = len(data); out += data
while len(out) % 4: out.append(0)
j['buffers'][0]['byteLength'] = len(out)
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
total = 12 + 8 + len(js) + 8 + len(out)
open(dst, 'wb').write(struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + out)
print(dst, total)
