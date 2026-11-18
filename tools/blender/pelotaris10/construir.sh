#!/bin/bash
# Los 10 pelotaris de siempre, de los modelos de Meshy al juego.
# Uso: tools/blender/pelotaris10/construir.sh <carpeta>   (en ella: pelotari-hd.glb —el pelotari descomprimido, node
#   tools/glb-abrir.mjs src/assets/meshy/pelotari.glb— y meshy/01-rizos.glb … 10-rizos.glb, los de Meshy:
#   entrega/pelotaris-de-siempre-10/LEEME.md dice de qué tarea sale cada uno)
set -e
W=$1; R=$(cd "$(dirname "$0")/../../.." && pwd); mkdir -p "$W/rig"; cd "$R/tools/blender/pelotaris10"
uno() { QUITA="$2" python3 esqueleto.py -- "$W/pelotari-hd.glb" "$W/meshy/$1.glb" "$W/rig/$1.glb" "$W/rig/$1" 2>&1 | grep -E "ENCAJE|QUITA|CABEZA|Error" | sed "s/^/$1 /"; }
for n in 01-rizos 02-corto 03-punta 04-rapado 06-coleta 07-trenza 08-mono 10-rizos; do uno $n; done
# (las tiras sueltas que Meshy dejó colgando: una rosa de la mano a la cadera del rubio y una azul junto a la mano de la
# de la melena; se veían al golpear)
uno 05-melenita "-0.215,-0.02,-0.23,-0.1"; uno 09-melena "0.18,0.255,-0.085,-0.012"
cd "$R" && node tools/pelotaris10.mjs "$W/rig"
