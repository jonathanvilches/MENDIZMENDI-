#!/bin/bash
# Una chica de principio a fin: de un personaje de Meshy de chico a lo que el juego le pone encima (src/assets/chicas).
#   1. tools/blender/chicas/cabeza.py: el cráneo liso (sin el pelo de chico), la frente, la nuca
#   2. nacimiento.py: dónde nace el pelo
#   3. textura.py: la textura de la cabeza repintada (castaño liso bajo el pelo, piel, cejas finas, labios)
#   4. pelo.py: el peinado (y la nariz más pequeña, las pestañas), con sus vistas de prueba
#   5. exportar.py: la malla del chico y la de la chica, y el pelo en su GLB
#   6. tools/chicas/parche.mjs: lo que cambia, para cada versión del juego
# Uso: tools/chicas/construir.sh <modelo> <peinado> <carpeta de trabajo>   (en la carpeta: <modelo>-hd.glb, el modelo de
#   src/assets/meshy descomprimido; y pelo-color.png y pelo-relieve.png de texpelo.py)
set -e
M=$1; P=$2; W=$3; R=$(cd "$(dirname "$0")/../.." && pwd); B=$R/tools/blender/chicas
cd "$B"
python3 cabeza.py -- "$W/$M-hd.glb" "$W/$M-calva.blend" 2>&1 | grep -E "liso|nuca|oreja|Error" || true
python3 nacimiento.py -- "$W/$M-calva.blend" > /dev/null 2>&1
MODELO=$M python3 textura.py -- "$W/$M-calva.blend" "$W/$M-tex1.png" 2>&1 | grep -E "texeles|caras|máscara|Error" || true
MODELO=$M TEX="$W/$M-tex1.png" python3 pelo.py -- "$W/$M-calva.blend" "$W/$M-$P.blend" "$P" "$W/$P-$M" 2>&1 | grep -E "Error|^coleta|^nariz" || true
mkdir -p "$W/export"
python3 exportar.py -- "$W/$M-hd.glb" "$W/export/$M-chico" 2>&1 | grep -E "malla|Error" || true
python3 exportar.py -- "$W/$M-$P.blend" "$W/export/$M-$P" 2>&1 | grep -E "malla|pelo|Error" || true
cd "$R"
node tools/chicas/parche.mjs "$M" "$P" "$W/export" "$W/$M-tex1.png" 2>&1 | grep -vE "^(prune|quantize|weld|simplify)"
