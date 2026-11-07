#!/bin/bash
# Una figura de jugador animada en Higgsfield sobre verde (la figura de 512 × 768 puesta en x = 128, y = 128 de un lienzo
# verde de 768 × 1024, sacado a 3:4) pasada a WebP animado con transparencia, en la misma caja que la figura fija: el
# bucle sin salto (el último medio segundo fundido con el primero, aún sobre verde), el verde fuera con su halo y la
# figura recortada a su caja de 2:3. El WebP animado con transparencia lo enseñan Safari 14 y los demás navegadores como
# una imagen más, sin <video>, así que va donde iba la figura fija.
# uso, desde la raíz del repositorio: tools/figura-animada.sh <vídeo de Higgsfield> <salida .webp> [ancho] [fps] [calidad]
set -e
IN="$1"; OUT="$2"; W="${3:-384}"; FPS="${4:-15}"; Q="${5:-72}"
IFS=, read VW VH D < <(ffprobe -v error -select_streams v -show_entries stream=width,height,duration -of csv=p=0 "$IN")
X=0.5
E=$(node -e "console.log((+process.argv[1]).toFixed(3))" "$D"); C=$(node -e "console.log((+process.argv[1]-$X).toFixed(3))" "$D")
# (la caja de la figura dentro del vídeo: 128/768 desde la izquierda y desde arriba, 512/768 de ancho y 768/1024 de alto)
CW=$(( VW * 512 / 768 / 2 * 2 )); CH=$(( VH * 768 / 1024 / 2 * 2 )); CX=$(( VW * 128 / 768 )); CY=$(( VH * 128 / 1024 ))
H=$(( W * 3 / 2 ))
ffmpeg -nostdin -v error -y -i "$IN" -filter_complex "
[0:v]fps=$FPS,format=rgb24,split=3[a][b][c];
[a]trim=start=$X:end=$C,setpts=PTS-STARTPTS[cuerpo];
[b]trim=start=$C:end=$E,setpts=PTS-STARTPTS[cola];
[c]trim=start=0:end=$X,setpts=PTS-STARTPTS[cabeza];
[cola][cabeza]xfade=transition=fade:duration=$X:offset=0[paso];
[cuerpo][paso]concat=n=2:v=1:a=0,crop=$CW:$CH:$CX:$CY,scale=$W:$H:flags=lanczos,
chromakey=0x00FF00:0.16:0.08,despill=type=green:mix=0.6:expand=0.1,format=yuva420p[out]" -map "[out]" \
  -c:v libwebp_anim -lossless 0 -q:v "$Q" -compression_level 6 -loop 0 -an "$OUT"
ls -la "$OUT" | awk '{print $5}'
