#!/bin/bash
# Como figura-animada.sh, pero el bucle es de ida y vuelta: el vídeo hacia delante y luego hacia atrás, sin repetir el
# primer ni el último fotograma. Para los vídeos que no acaban como empiezan (los que solo parten de la figura, sin
# fotograma final: Grok Video Lite), donde fundir la vuelta dejaba dos figuras a la vez. La figura de 512 × 768 va en
# x = 128, y = 128 de un lienzo verde de 768 × 1024, sacado a 3:4; se quita el verde con su halo y se recorta a su caja de 2:3.
# uso, desde la raíz del repositorio: tools/figura-animada-ida.sh <vídeo> <salida .webp> [ancho] [fps] [calidad]
set -e
IN="$1"; OUT="$2"; W="${3:-320}"; FPS="${4:-12}"; Q="${5:-70}"
IFS=, read VW VH D < <(ffprobe -v error -select_streams v -show_entries stream=width,height,duration -of csv=p=0 "$IN")
CW=$(( VW * 512 / 768 / 2 * 2 )); CH=$(( VH * 768 / 1024 / 2 * 2 )); CX=$(( VW * 128 / 768 )); CY=$(( VH * 128 / 1024 ))
H=$(( W * 3 / 2 ))
# (cuántos fotogramas salen a FPS: la vuelta va del penúltimo al segundo)
NF=$(node -e "console.log(Math.floor(+process.argv[1] * $FPS))" "$D")
ffmpeg -nostdin -v error -y -i "$IN" -filter_complex "
[0:v]fps=$FPS,format=rgb24,crop=$CW:$CH:$CX:$CY,scale=$W:$H:flags=lanczos,split=2[ida][v];
[v]reverse,trim=start_frame=1:end_frame=$(( NF - 1 )),setpts=PTS-STARTPTS[vuelta];
[ida][vuelta]concat=n=2:v=1:a=0,
chromakey=0x00FF00:0.16:0.08,despill=type=green:mix=0.6:expand=0.1,format=yuva420p[out]" -map "[out]" \
  -c:v libwebp_anim -lossless 0 -q:v "$Q" -compression_level 6 -loop 0 -an "$OUT"
ls -la "$OUT" | awk '{print $5}'
