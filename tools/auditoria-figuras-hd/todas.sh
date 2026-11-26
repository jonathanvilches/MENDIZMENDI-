#!/bin/bash
# Las figuras animadas de los pelotaris al doble (640 × 960), para que en el móvil no se estiren: public/videos/figuras/hd/
# (el autor, 26 de noviembre de 2026: «Quiero calidad en las figuras de pantalla»). Sin generar nada nuevo: cada fotograma
# de la de 320 × 480 pasa por Real-ESRGAN animevideov3 (x4, reducida a x2), el color y la transparencia por separado.
# Lo que hace falta, una vez (fuera del repositorio): pip install onnx onnxruntime, el modelo de
# https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth (licencia BSD-3) y
#   python3 -I tools/auditoria-figuras-hd/pth2onnx.py realesr-animevideov3.pth /tmp/animevideov3.onnx
# Uso, desde la raíz del repositorio: tools/auditoria-figuras-hd/todas.sh /tmp/animevideov3.onnx [solo esta: azul/ane]
# (se salta las que ya están; unos 2 minutos cada una, sobre todo al comprimir)
set -e
M="$1"; [ -s "$M" ] || { echo "falta el modelo .onnx"; exit 1; }
D=$(dirname "$0"); R=public/videos/figuras; TMP=$(mktemp -d)
for c in azul rojo; do mkdir -p $R/hd/$c; for f in $R/$c/*.webp; do id=$(basename $f .webp); o=$R/hd/$c/$id.webp
  [ -n "$2" ] && [ "$2" != "$c/$id" ] && continue; [ -z "$2" ] && [ -s "$o" ] && continue
  J=$(node $D/saca.cjs $f $TMP/a.rgba); W=$(echo $J | node -pe 'JSON.parse(require("fs").readFileSync(0)).w'); H=$(echo $J | node -pe 'JSON.parse(require("fs").readFileSync(0)).h'); N=$(echo $J | node -pe 'JSON.parse(require("fs").readFileSync(0)).n')
  python3 -I $D/amplia.py $TMP/a.rgba $TMP/b.rgba $W $H $N "$M" > /dev/null
  ffmpeg -nostdin -v error -y -f rawvideo -pix_fmt rgba -s $((W*2))x$((H*2)) -framerate 12 -i $TMP/b.rgba -c:v libwebp_anim -lossless 0 -q:v 72 -compression_level 6 -loop 0 -pix_fmt yuva420p $o
  echo "$c/$id $(stat -c %s $o)"
done; done; rm -rf $TMP
