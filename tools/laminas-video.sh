#!/bin/bash
# Un vídeo de Higgsfield (1344×768, recorte «cover» de la lámina de 1672×941: toda la altura y 13 px menos a cada lado)
# pasado al encuadre exacto de la lámina fija de 1280×720 (web/), para que al fundirse encima no salte nada: el vídeo
# escalado a 1260×720 va en x=10 sobre la propia lámina, que rellena las dos tiras de 10 px. Luego, el bucle sin salto:
# el último medio segundo se funde con el primero. Sin sonido, H.264 con faststart (Safari del iPhone lo reproduce en línea).
# uso, desde la raíz del repositorio: tools/laminas-video.sh <vídeo de Higgsfield> <lámina web .webp> <salida .mp4> [crf]
set -e
IN="$1"; LAM="$2"; OUT="$3"; CRF="${4:-29}"
T=$(mktemp -d)
node -e "require(process.cwd() + '/node_modules/sharp')(process.argv[1]).resize(1280,720,{fit:'fill'}).png().toFile(process.argv[2])" "$LAM" "$T/fija.png"
D=$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$IN")
X=0.5
E=$(node -e "console.log((+process.argv[1]).toFixed(3))" "$D")
ffmpeg -nostdin -v error -y -loop 1 -framerate 24 -i "$T/fija.png" -i "$IN" -filter_complex "
[1:v]fps=24,scale=1260:720:flags=lanczos,setsar=1[v];
[0:v][v]overlay=10:0:shortest=1,format=yuv420p,split=3[a][b][c];
[a]trim=start=$X:end=$(node -e "console.log((+process.argv[1]-$X).toFixed(3))" "$E"),setpts=PTS-STARTPTS[cuerpo];
[b]trim=start=$(node -e "console.log((+process.argv[1]-$X).toFixed(3))" "$E"):end=$E,setpts=PTS-STARTPTS[cola];
[c]trim=start=0:end=$X,setpts=PTS-STARTPTS[cabeza];
[cola][cabeza]xfade=transition=fade:duration=$X:offset=0[paso];
[cuerpo][paso]concat=n=2:v=1:a=0[out]" -map "[out]" -an -c:v libx264 -preset slow -crf "$CRF" -profile:v high -level 4.0 -pix_fmt yuv420p -r 24 -movflags +faststart "$OUT"
rm -r "$T"
ls -la "$OUT" | awk '{print $5}'
