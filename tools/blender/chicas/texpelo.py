# Textura del pelo de las chicas (color y relieve), pintada aquí: mechones finos a lo largo (v), cada uno con su tono, más
# oscuros en el fondo de los surcos y con un brillo suave a lo largo de la cresta. Gris cálido: el juego le da el color
# de cada chica multiplicando (así sirve una para todas). Escribe pelo-color.png y pelo-relieve.png (mapa de normales).
# Uso: python3 -I texpelo.py <carpeta>
import sys, numpy as np
from PIL import Image
d = sys.argv[1]; W, H = 256, 512; rng = np.random.default_rng(7)
x = np.arange(W); y = np.arange(H)
# altura: surcos de mechones (de varias anchuras) que serpentean un poco a lo largo
alt = np.zeros((H, W), np.float32); col = np.zeros((H, W), np.float32)
for capa, (n, fuerza, ancho) in enumerate([(9, 1.0, 1.0), (23, 0.45, 0.45), (61, 0.18, 0.2)]):
    fase = rng.uniform(0, 2 * np.pi, 4)
    for k in range(n):
        x0 = (k + rng.uniform(-0.3, 0.3)) / n * W; amp = rng.uniform(1, 4) * ancho; per = rng.uniform(0.6, 1.4)
        cx = x0 + amp * np.sin(y / H * 2 * np.pi * per + fase[k % 4])          # (cierra el ciclo a lo largo: se repite)
        dx = (x[None, :] - cx[:, None] + W / 2) % W - W / 2; s = W / n * 0.5
        alt += fuerza * np.exp(-(dx / s) ** 2) * rng.uniform(0.7, 1.0)
        col += (fuerza * 0.6) * np.exp(-(dx / (s * 0.6)) ** 2) * rng.uniform(-1, 1)
alt = (alt - alt.min()) / (alt.max() - alt.min())
# color: gris cálido, surcos oscuros, mechones de tonos algo distintos y vetas claras finas
base = 0.62 + 0.30 * alt + 0.06 * col / max(1e-6, np.abs(col).max())
vetas = np.zeros_like(base)
for k in range(140):
    xc = rng.uniform(0, W); amp = rng.uniform(0.5, 2.5)
    cx = xc + amp * np.sin(y / H * 2 * np.pi * rng.integers(1, 3) + rng.uniform(0, 6.28))
    dx = (x[None, :] - cx[:, None] + W / 2) % W - W / 2
    vetas += np.exp(-(dx / 0.7) ** 2) * rng.uniform(-0.08, 0.1)
base = np.clip(base + vetas, 0, 1)
rgb = np.stack([base * 1.0, base * 0.93, base * 0.86], -1)
Image.fromarray((rgb * 255).astype(np.uint8)).save(f'{d}/pelo-color.png')
# normales del relieve (con la x a lo ancho y la y a lo largo; cierra en los dos sentidos)
gx = (np.roll(alt, -1, 1) - np.roll(alt, 1, 1)) * 2.2; gy = (np.roll(alt, -1, 0) - np.roll(alt, 1, 0)) * 0.6
n = np.stack([-gx, gy, np.ones_like(gx)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)).save(f'{d}/pelo-relieve.png')
print('ok')
