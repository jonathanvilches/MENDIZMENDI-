#!/bin/bash
# Recorre todas las misiones de todos los pueblos: tools/flow-all.sh <salida.log>
OUT=${1:-/tmp/flow-all.log}; BASE=${2:-http://127.0.0.1:5173/}
: > "$OUT"
for t in $(grep -o "{ id: '[a-z-]*'" src/data/levels.js | sed "s/{ id: '//;s/'//"); do
  [ "$t" = "otsagabia-ochagavia" ] && continue
  echo "== $t" >> "$OUT"
  timeout 300 node tools/play.mjs "${BASE}?town=$t" /tmp/flow-$t '[{"wait":3000},{"file":"lab/flow-town.js"},{"wait":300}]' >> "$OUT" 2>&1 || echo "TIMEOUT/ERROR $t" >> "$OUT"
done
echo FIN >> "$OUT"
