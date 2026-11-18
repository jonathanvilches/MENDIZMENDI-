#!/bin/bash
# Pelotaris nuevos de Meshy (chico, chica de moño y chica de coleta): del modelo con huesos al archivo del juego.
#   BLENDER_PY=/ruta/al/python-con-bpy  [TRABAJO=/tmp/pelotaris-nuevos]  investigacion/pelotaris-nuevos/tuberia.sh <paso>
#   base            piel por calor y huesos de giro (antebrazo, cuello centrado) de los tres
#   golpes          piel rígida, manga y los seis golpes reales de los tres
#   solo <quien>    lo mismo que «golpes», solo de chico | mono | coleta
#   render <quien>  fotogramas de la derecha y de la izquierda para revisarlos (480×600, 10 muestras)
#   glb             ESCRIBE EN src/assets: solo cuando lo anterior esté revisado y dado por bueno
# Se lanza desde la raíz del repositorio. BLENDER_PY es un Python 3.13 con «pip install bpy==5.2.3» (Blender como módulo).
set -u
cd "$(dirname "$0")/../.."; AQUI=investigacion/pelotaris-nuevos; PY=${BLENDER_PY:?falta BLENDER_PY}; T=${TRABAJO:-/tmp/pelotaris-nuevos}
R=investigacion/movimientos-reales; P=$T/piel; G=$T/rigida; J=$T/juego; mkdir -p $P $G $J $T/render
ret(){ timeout 900 $PY tools/blender/pose-a-esqueleto.py -- $G/$1.glb $2 $3 - 2>&1 | grep -o "límites humanos.*" | cut -c1-160 | sed "s|^|$(basename $3): |"; timeout 300 $PY tools/blender/clavicula.py -- $3 $3 >/dev/null 2>&1; }
base(){ q=$1
  $PY tools/blender/piel-calor.py -- $AQUI/base/$q-unido.glb $P/$q-calor.glb 2>&1 | grep -E "exportado|Traceback|vértices" | sed "s/^/$q: /"
  $PY tools/blender/huesos-extra.py -- $P/$q-calor.glb $P/$q-giro.glb 2>&1 | grep -E "exportado|Traceback" | sed "s/^/$q: /"; }
uno(){ q=$1
  $PY tools/blender/piel-rigida.py -- $P/$q-giro.glb $G/$q-r.glb 2>&1 | grep -o "barbilla.*\|cuello:.*\|pelo que cuelga.*\|[0-9]* de la cabeza.*\|Traceback.*" | sed "s/^/$q: /"
  $PY tools/blender/manga-textura.py -- $G/$q-r.glb $G/$q.glb 2>&1 | grep -E "píxeles|Traceback" | sed "s/^/$q: /"
  ret $q $R/tabar-derecha-3.json $J/$q-der.glb; ret $q $R/tabar-izquierda-2.json $J/$q-izq.glb
  ret $q $R/tabar-izquierda.json $J/$q-gancho-izq.glb; ret $q $AQUI/mocap/tabar-izquierda-espejo.json $J/$q-gancho-der.glb
  ret $q $R/jaka-golpe-por-arriba.json $J/$q-volea-der.glb; ret $q $R/jaka-izquierda-por-arriba.json $J/$q-volea-izq.glb
  $PY tools/blender/golpe-corto.py -- $J/$q-der.glb $J/$q-dejada.glb 0.45 1.25 >/dev/null 2>&1; $PY tools/blender/golpe-corto.py -- $J/$q-izq.glb $J/$q-dejada-izq.glb 0.45 1.25 >/dev/null 2>&1
  timeout 900 $PY tools/blender/golpes-al-juego.py -- $G/$q.glb $J/$q-reales.glb Hit:$J/$q-der.glb:R:26 HitL:$J/$q-izq.glb:L:33 High:$J/$q-volea-der.glb:R HighL:$J/$q-volea-izq.glb:L Volea:$J/$q-volea-der.glb:R VoleaL:$J/$q-volea-izq.glb:L Gancho:$J/$q-gancho-der.glb:R:44 GanchoL:$J/$q-gancho-izq.glb:L:44 Dejada:$J/$q-dejada.glb:R:33 DejadaL:$J/$q-dejada-izq.glb:L:41 2>&1 | grep -E "exportado|Traceback" | cut -c1-90 | sed "s/^/$q: /"
  echo "$q LISTO"; }
render(){ q=$1
  r(){ rm -rf $T/render/$q-$1; DIST=3.4 GOLPE=$3 MUESTRAS=10 timeout 3000 $PY tools/blender/golpe-render.py -- $J/$q-$1.glb $T/render/$q-$1 $2 480 600 2>&1 | grep -E "golpe en|Traceback" | sed "s/^/$q-$1: /"; }
  r der R 26 & r izq L 33 & wait; echo "fotogramas en $T/render/$q-der y $T/render/$q-izq"; }
hacer(){ q=$1; nom=$2; col=$3
  REALES=$J/$q-reales.glb COLOR=$col PX=2048 RATIO=1 node tools/pelotari-nuevo-glb.mjs $G/$q.glb src/assets/meshy/$nom.glb 2>&1 | tail -1 | grep -o "[0-9]* KB"
  REALES=$J/$q-reales.glb COLOR=$col PX=1024 RATIO=0.5 node tools/pelotari-nuevo-glb.mjs $G/$q.glb src/assets/meshy-1024/$nom.glb 2>&1 | tail -1 | grep -o "[0-9]* KB"
  REALES=$J/$q-reales.glb COLOR=$col PX=512 RATIO=0.26 node tools/pelotari-nuevo-glb.mjs $G/$q.glb src/assets/meshy/lod/$nom.glb 2>&1 | tail -1 | grep -o "[0-9]* KB"; }
case "${1:-}" in
  base) base chico & base mono & base coleta & wait; echo BASE LISTA;;
  golpes) uno chico & uno mono & uno coleta & wait; echo GOLPES LISTOS;;
  solo) uno $2; echo SOLO LISTO;;
  render) render $2;;
  glb) hacer chico pelotari_nuevo ""; hacer chico pelotari_nuevo_rojo rojo; hacer mono pelotari_nueva ""; hacer mono pelotari_nueva_azul azul; hacer coleta pelotari_nueva3 ""; hacer coleta pelotari_nueva3_azul azul; echo GLB LISTOS;;
  *) sed -n 2,9p "$0";;
esac
