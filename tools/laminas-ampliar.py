# Amplía imágenes al doble con Real-ESRGAN (modelo realesr-animevideov3-x2, en CPU; paquete realesrgan-ncnn-py). La
# llama tools/laminas-grandes.mjs por tandas, con pares entrada y salida; carga el modelo una vez por tanda.
# Uso: python3 -I tools/laminas-ampliar.py <entrada> <salida.png> [<entrada> <salida.png>…]
import sys
from PIL import Image
from realesrgan_ncnn_py import Realesrgan

pares = sys.argv[1:]
if len(pares) < 2 or len(pares) % 2:
    sys.exit('uso: laminas-ampliar.py <entrada> <salida.png> …')
modelo = Realesrgan(gpuid=-1, model=0)
for src, out in zip(pares[::2], pares[1::2]):
    modelo.process_pil(Image.open(src).convert('RGB')).save(out)
    print(out, flush=True)
