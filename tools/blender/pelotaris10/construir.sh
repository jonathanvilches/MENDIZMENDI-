#!/bin/bash
# Los 10 pelotaris de siempre, de los modelos de Meshy al juego.
# Uso: tools/blender/pelotaris10/construir.sh <carpeta>   (en ella: pelotari-hd.glb —el pelotari descomprimido, node
#   tools/glb-abrir.mjs src/assets/meshy/pelotari.glb— y meshy/<nombre>.glb de los 22 (inigo.glb … uxue.glb), los de Meshy:
#   entrega/pelotaris-de-siempre-10/LEEME.md dice de qué tarea sale cada uno)
set -e
W=$1; R=$(cd "$(dirname "$0")/../../.." && pwd); mkdir -p "$W/rig"; cd "$R/tools/blender/pelotaris10"
uno() { env $2 python3 esqueleto.py -- "$W/pelotari-hd.glb" "$W/meshy/$1.glb" "$W/rig/$1.glb" "$W/rig/$1" 2>&1 | grep -E "ENCAJE|QUITA|HILOS|Error" | sed "s/^/$1: /"; }
for n in inigo unai ander aitor garazi maialen irati oihana amaia asier jokin ekaitz xabier inaki julen nerea leire miren uxue; do uno $n; done
# (la tira suelta que Meshy dejó colgando de la mano a la cadera de Mikel; la coleta larga de Ane, entera; las trenzas de
# Nahia, con sus puntas, a la cabeza)
uno mikel QUITA=-0.215,-0.02,-0.23,-0.1; uno ane HILO=0.3; uno nahia CENTRO=0.57
# (los jueces y el público: sin camiseta azul, se encajan por la altura de las manos)
if [ -d "$W/gente" ]; then mkdir -p "$W/gente/rig"; for n in juez jueza espectador espectadora abuelo abuela joven chica gafas rubia nino; do MANOS=1 python3 esqueleto.py -- "$W/pelotari-hd.glb" "$W/gente/$n.glb" "$W/gente/rig/$n.glb" 2>&1 | grep -E "ENCAJE|Error" | sed "s/^/$n /"; done; fi
cd "$R" && GENTE=$([ -d "$W/gente/rig" ] && echo "$W/gente/rig") node tools/pelotaris10.mjs "$W/rig"
