#!/bin/bash
# Los planos rodados a 12 fotogramas por segundo (planos-v3.mjs, fps: 12) pasados a 24 con interpolación de movimiento
# (minterpolate), y los de 24 enlazados tal cual. Uso: bash tools/trailer/v3/interpola.sh <rodado> <planos> [plano…]
set -e
RAW=$1; OUT=$2; shift 2
cd "$(dirname "$0")/../../.."
FPS=$(node -e "import('${PLANOS:-./tools/trailer/v3/planos-v3.mjs}').then(m=>{for(const [k,v] of Object.entries(m.PLANOS)) console.log(k+' '+(v.fps||24))})")
for d in ${@:-$(ls "$RAW")}; do
  [ -d "$RAW/$d" ] || continue
  f=$(echo "$FPS" | awk -v k="$d" '$1==k{print $2}')
  rm -rf "$OUT/$d"
  if [ "$f" = "12" ]; then
    mkdir -p "$OUT/$d"
    ffmpeg -v error -framerate 12 -start_number 0 -i "$RAW/$d/%04d.jpg" -vf "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -q:v 2 -start_number 0 "$OUT/$d/%04d.jpg"
  else
    ln -s "$RAW/$d" "$OUT/$d"
  fi
  echo "$d $f → $(ls "$OUT/$d/" | wc -l)"
done
