#!/bin/sh
# Descarga las teselas de relieve (formato «terrarium», nivel 8, unos 450 m por píxel) de la zona de Navarra y alrededores
# desde el almacén abierto de AWS (Terrain Tiles). En este nivel, en Navarra, salen de SRTM y GMTED2010 (USGS, dominio
# público): se guarda la cabecera de cada tesela con sus fuentes para comprobarlo (perfiles.py rechaza cualquier otra).
# Con «espana», las de toda la península a nivel 7 (unos 900 m por píxel), para el suelo de la entrada del mapa.
# Uso: sh tools/relieve/descargar.sh <carpeta nueva y vacía> [espana]
set -e
D="$1"; [ -n "$D" ] || { echo "uso: descargar.sh <carpeta> [espana]"; exit 1; }
mkdir -p "$D"
if [ "$2" = espana ]; then Z=7; XS="60 61 62 63 64 65"; YS="46 47 48 49 50"; else Z=8; XS="125 126 127 128"; YS="93 94 95"; fi
for x in $XS; do for y in $YS; do
  curl -sS --fail --max-time 60 -D "$D/$Z-$x-$y.txt" -o "$D/$Z-$x-$y.png" "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/$Z/$x/$y.png"
done; done
grep -h -i "x-amz-meta-x-imagery-sources" "$D"/*.txt | tr ',' '\n' | sed 's/.*: //; s/^ *//' | sed 's#/.*##' | sort | uniq -c
