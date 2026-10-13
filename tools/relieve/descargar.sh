#!/bin/sh
# Descarga las teselas de relieve (formato «terrarium», nivel 8, unos 450 m por píxel) de la zona de Navarra y alrededores
# desde el almacén abierto de AWS (Terrain Tiles). En este nivel, en Navarra, salen de SRTM y GMTED2010 (USGS, dominio
# público): se guarda la cabecera de cada tesela con sus fuentes para comprobarlo (perfiles.py rechaza cualquier otra).
# Uso: sh tools/relieve/descargar.sh <carpeta nueva y vacía>
set -e
D="$1"; [ -n "$D" ] || { echo "uso: descargar.sh <carpeta>"; exit 1; }
mkdir -p "$D"
for x in 125 126 127 128; do for y in 93 94 95; do
  curl -sS --fail --max-time 60 -D "$D/8-$x-$y.txt" -o "$D/8-$x-$y.png" "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/8/$x/$y.png"
done; done
grep -h -i "x-amz-meta-x-imagery-sources" "$D"/*.txt | tr ',' '\n' | sed 's/.*: //; s/^ *//' | sed 's#/.*##' | sort | uniq -c
