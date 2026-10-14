# Textura de los mechones: castaño del pelo pintado del modelo, con hebras más oscuras y más claras a lo largo y la
# raíz algo más oscura. (u: alrededor del mechón; v: a lo largo, 0 en la raíz)
import sys, numpy as np
from PIL import Image, ImageFilter
out = sys.argv[1]; W, H = 256, 1024; rng = np.random.default_rng(7)
base = np.array([46, 12, 2.]); img = np.tile(base, (H, W, 1)).astype(np.float32)
u = np.arange(W)
for _ in range(36):   # hebras: bandas finas a lo largo, oscuras o claras
    c = rng.uniform(0, W); w = rng.uniform(1.5, 6); k = rng.uniform(-1, 1)
    band = np.exp(-(((u - c + W / 2) % W - W / 2) / w) ** 2)
    col = np.array([30, 6, 1.]) if k < 0.2 else np.array([78, 30, 12.])
    a = band * (0.32 if k < 0.2 else 0.26) * rng.uniform(0.4, 1)
    img = img * (1 - a[None, :, None]) + col[None, None, :] * a[None, :, None]
v = np.linspace(0, 1, H)[:, None, None]
img = img * (0.78 + 0.22 * np.clip(v / 0.25, 0, 1))          # raíz más oscura
img = img * (1 + 0.12 * np.clip((v - 0.75) / 0.25, 0, 1))      # puntas un poco más claras
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)).save(out)
