#!/bin/sh
# Descarga las teselas de relieve de detalle que necesita polar.py (formato «terrarium» de AWS Terrain Tiles, niveles 10 a
# 12). En Navarra salen de EU-DEM (Copernicus), SRTM, GMTED2010 y ETOPO1: se guarda la cabecera de cada tesela con sus
# fuentes para comprobarlo (polar.py rechaza cualquier otra).
# Uso: sh tools/relieve/descargar-detalle.sh <carpeta> <lista>   (la lista: LISTA=1 python3 -I tools/relieve/polar.py …)
set -e
D="$1"; L="$2"; [ -n "$D" ] && [ -f "$L" ] || { echo "uso: descargar-detalle.sh <carpeta> <lista>"; exit 1; }
mkdir -p "$D"
while read z x y; do
  [ -s "$D/$z-$x-$y.png" ] && continue
  curl -sS --fail --max-time 60 -D "$D/$z-$x-$y.txt" -o "$D/$z-$x-$y.png" "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/$z/$x/$y.png"
done < "$L"
grep -h -i "x-amz-meta-x-imagery-sources" "$D"/*.txt | tr ',' '\n' | sed 's/.*: //; s/^ *//' | sed 's#/.*##' | sort | uniq -c
