#!/usr/bin/env bash
# La segunda voz del comentario de pelota: el ex pelotari que explica la jugada (las frases «e» de src/pelota/comenta.js).
# Sale de la grabación del autor (src/assets/voz/hombre/<idioma>/), más grave y algo más pausada, con el timbre de otra
# persona (rubberband: 2,6 semitonos abajo con los formantes desplazados), más cálida y con algo de radio, y al mismo
# volumen que el narrador (-16 LUFS). Uso: bash tools/segunda-voz.sh [es|eu]   (rehace todas las de ese idioma)
set -euo pipefail
cd "$(dirname "$0")/.."
LANG_=${1:-es}
SRC=src/assets/voz/hombre/$LANG_ OUT=src/assets/voz/hombre2/$LANG_
mkdir -p "$OUT"
F="rubberband=pitch=0.86:tempo=0.97:formant=shifted,highpass=f=90,lowpass=f=9000,equalizer=f=220:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=-2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-1.5:LRA=11"
IDS=$(node --input-type=module -e "const m = await import('$PWD/src/pelota/comenta.js'); for (const [k, L] of Object.entries(m.F['$LANG_'])) L.forEach(([r], i) => { if (r === 'e') console.log(k + '-' + (i + 1)); });" 2>/dev/null)
n=0
for id in $IDS; do
  [ -f "$SRC/$id.mp3" ] || { echo "sin grabar: $id"; continue; }
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$SRC/$id.mp3" -af "$F" -ar 44100 -ac 1 -b:a 96k "$OUT/$id.mp3"; n=$((n + 1))
done
echo "segunda voz: $n frases en $OUT"
