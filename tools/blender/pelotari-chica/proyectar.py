# Lleva los retoques pintados en la vista frontal (cara-nueva.png + cara-mascara.png) a la textura del modelo: cada
# punto de la textura de la cabeza se sitúa en la vista (por su posición en el cuerpo en reposo) y solo cambia si es el
# que se ve en ese píxel (su UV coincide con la del mapa cara-uv.exr). Escribe textura-chica.png.
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import *
import numpy as np
from PIL import Image
argv = sys.argv[sys.argv.index('--') + 1:]; glb, d = argv[0], argv[1]
arm, me = abrir(glb)
N = 2048; ORTHO = 0.68; CZ = 1.42
im = bpy.data.images.load(f'{d}/cara-uv.exr'); buf = np.empty(im.size[0] * im.size[1] * 4, np.float32); im.pixels.foreach_get(buf)
UVM = buf.reshape(im.size[1], im.size[0], 4)[::-1]
im2 = bpy.data.images.load(f'{d}/cara-prof.exr'); buf2 = np.empty(im2.size[0] * im2.size[1] * 4, np.float32); im2.pixels.foreach_get(buf2)
DEP = buf2.reshape(im2.size[1], im2.size[0], 4)[::-1][..., 0]
NEW = np.asarray(Image.open(f'{d}/cara-nueva.png').convert('RGB'), np.float32)
MSK = np.asarray(Image.open(f'{d}/cara-mascara.png').convert('L'), np.float32) / 255
TEX = np.asarray(Image.open(f'{d}/cara-textura.png').convert('RGB'), np.float32); TH, TW = TEX.shape[:2]
out = TEX.copy()
M = me.matrix_world; mesh = me.data; mesh.calc_loop_triangles()
uvl = mesh.uv_layers.active.data; w = pesos(me, 'mixamorig:Head')
P = [M @ v.co for v in mesh.vertices]
done = 0
for t in mesh.loop_triangles:
    if min(w[i] for i in t.vertices) < 0.5: continue
    ps = [P[i] for i in t.vertices]
    if max(p.y for p in ps) > 0.05: continue                                   # (solo lo de delante)
    uv = [uvl[l].uv for l in t.loops]
    tx = np.array([[u.x * TW, (1 - u.y) * TH] for u in uv]); sx = np.array([[(p.x + ORTHO / 2) / ORTHO * N, (CZ + ORTHO / 2 - p.z) / ORTHO * N] for p in ps])
    if sx[:, 0].max() < 0 or sx[:, 0].min() > N or sx[:, 1].max() < 0 or sx[:, 1].min() > N: continue
    # ¿toca algún retoque? (mirando la máscara en el triángulo de la vista)
    x0, y0 = np.clip(sx.min(0).astype(int), 0, N - 1); x1, y1 = np.clip(sx.max(0).astype(int) + 1, 0, N - 1)
    if MSK[y0:y1 + 1, x0:x1 + 1].max() < 0.01: continue
    a, b, c = tx; den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-9: continue
    X0, Y0 = np.floor(tx.min(0)).astype(int); X1, Y1 = np.ceil(tx.max(0)).astype(int)
    gx, gy = np.meshgrid(np.arange(X0, X1 + 1) + 0.5, np.arange(Y0, Y1 + 1) + 0.5)
    l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den; l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den; l2 = 1 - l0 - l1
    ins = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
    if not ins.any(): continue
    px = l0 * sx[0, 0] + l1 * sx[1, 0] + l2 * sx[2, 0]; py = l0 * sx[0, 1] + l1 * sx[1, 1] + l2 * sx[2, 1]
    ix = np.clip(px.astype(int), 0, N - 1); iy = np.clip(py.astype(int), 0, N - 1)
    S = UVM[iy, ix]; ty_ = l0 * ps[0].y + l1 * ps[1].y + l2 * ps[2].y
    vis = ins & (S[..., 3] > 0.5) & (np.abs(ty_ - DEP[iy, ix]) < 0.012)   # (se ve si está a la profundidad de lo que se ve ahí)
    k = MSK[iy, ix] * np.clip(S[..., 2] * 8, 0, 1) * vis   # (también en los lados de la frente, que se ven de refilón)
    sel = k > 0.003
    if not sel.any(): continue
    ty = np.clip((gy[sel] - 0.5).astype(int), 0, TH - 1); txi = np.clip((gx[sel] - 0.5).astype(int), 0, TW - 1)
    out[ty, txi] = out[ty, txi] * (1 - k[sel][:, None]) + NEW[iy[sel], ix[sel]] * k[sel][:, None]; done += int(sel.sum())
# márgenes de las islas de la textura: los puntos de fuera de todo triángulo que rodean a uno cambiado toman su color
# nuevo (al filtrar la textura en el borde de una isla se mezcla con ellos; si no, asomaba la ceja vieja en las costuras)
cub = np.zeros((TH, TW), bool)
for t in mesh.loop_triangles:
    tx = np.array([[uvl[l].uv.x * TW, (1 - uvl[l].uv.y) * TH] for l in t.loops]); a, b, c = tx
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-9: continue
    X0, Y0 = np.clip(np.floor(tx.min(0)).astype(int), 0, [TW - 1, TH - 1]); X1, Y1 = np.clip(np.ceil(tx.max(0)).astype(int), 0, [TW - 1, TH - 1])
    gx, gy = np.meshgrid(np.arange(X0, X1 + 1) + 0.5, np.arange(Y0, Y1 + 1) + 0.5)
    l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den; l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den
    cub[Y0:Y1 + 1, X0:X1 + 1] |= (l0 >= -0.01) & (l1 >= -0.01) & (1 - l0 - l1 >= -0.01)
ch = np.abs(out - TEX).sum(-1) > 3; col = out.copy(); have = ch.copy()
for _ in range(5):
    acc = np.zeros_like(col); cnt = np.zeros(have.shape, np.float32)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
        sh = np.roll(np.roll(have, dy, 0), dx, 1); sc_ = np.roll(np.roll(col, dy, 0), dx, 1)
        acc += sc_ * sh[..., None]; cnt += sh
    nuevo = (~have) & (~cub) & (cnt > 0)
    col[nuevo] = acc[nuevo] / cnt[nuevo][:, None]; have |= nuevo
gut = have & ~ch; out[gut] = col[gut]
print('MARGENES', int(gut.sum()))
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(f'{d}/textura-chica.png')
print('TEXELES', done)
sys.stdout.flush(); os._exit(0)  # bpy como módulo se cae al cerrarse: salida limpia
