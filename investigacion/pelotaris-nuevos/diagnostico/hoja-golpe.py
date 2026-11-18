# hoja-golpe.py <rp> <salida.jpg> [paso=4] : los fotogramas de alrededor del golpe, las tres cámaras, en una hoja
import sys, os
from PIL import Image, ImageDraw, ImageFont
rp, out = sys.argv[1], sys.argv[2]; paso = int(sys.argv[3]) if len(sys.argv) > 3 else 4
gi = int(open(f'{rp}/golpe.txt').read()); nr = len([f for f in os.listdir(rp) if f.startswith('a_')])
frs = [f for f in range(max(1, gi - 20), min(nr, gi + 16) + 1, paso)]
if gi not in frs: frs.append(gi); frs.sort()
W, H = 300, 375; im = Image.new('RGB', (W * len(frs), H * 3 + 24), (20, 24, 24)); d = ImageDraw.Draw(im); F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
for i, fr in enumerate(frs):
    for j, cam in enumerate('abh'):
        p = f'{rp}/{cam}_{fr:04d}.png'
        if os.path.exists(p): im.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), (W * i, 24 + H * j))
    d.text((W * i + 8, 2), f'f{fr}' + (' GOLPE' if fr == gi else ''), font=F, fill=(255, 210, 90) if fr == gi else (230, 230, 230))
im.save(out, quality=88); print(out, frs)
