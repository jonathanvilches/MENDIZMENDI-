# Pelotaris nuevos (Meshy): estado y cómo retomarlo

Trabajo **parado el 18 de noviembre** a petición del autor, para seguir en otra ventana. Aquí está todo lo necesario
para continuar sin depender de la sesión en la que se hizo.

## Qué hay

| Quién | Archivo base | En el juego |
| --- | --- | --- |
| Chico | `base/chico-unido.glb` | Sí (`pelotari_nuevo`, `pelotari_nuevo_rojo`), con las reglas de piel **anteriores** |
| Chica de moño | `base/mono-unido.glb` | **No.** `pelotari_nueva*` del juego sigue siendo la chica anterior |
| Chica de coleta | `base/coleta-unido.glb` | **No.** `pelotari_nueva3*` del juego sigue siendo la chica anterior |

- `base/*-unido.glb`: el modelo de Meshy ya con huesos y con andar y correr (lo que deja `tools/meshy-rig-vecino.mjs`).
- `laminas/`: las láminas de cuatro vistas de las dos chicas (Higgsfield) de las que salió el 3D. El aspecto de las dos
  está **aprobado** por el autor.
- `mocap/tabar-izquierda-espejo.json`: el gancho de derecha (la izquierda de Tabar en espejo); el resto de golpes
  reales están en `investigacion/movimientos-reales/`.
- `tuberia.sh`: todos los pasos, del modelo base al archivo del juego.
- `diagnostico/`: guiones de comprobación (ver abajo).

Las tareas de Meshy de las chicas (por si aún se pueden volver a bajar; Meshy las borra a los pocos días):
moño `01a1ed6b-b3d9-7421-9ccc-3efc07a85428` (3D) y `01a1ed78-c21e-72e3-b6f9-4fe6973af847` (huesos);
coleta `01a1ed6b-34de-735d-ae48-df68f33d55b1` (3D) y `01a1ed78-d1e7-7178-b535-2ed75b4c1325` (huesos).
Una lámina nueva se pasa a 3D con huesos con `tools/meshy-lamina-3d.py` (unos 41 créditos de Meshy por personaje).

## Cómo se lanza

```bash
python3.13 -m venv /tmp/bl && /tmp/bl/bin/pip install bpy==5.2.3      # Blender como módulo de Python
export BLENDER_PY=/tmp/bl/bin/python TRABAJO=/tmp/pelotaris-nuevos
investigacion/pelotaris-nuevos/tuberia.sh base            # piel por calor y huesos de giro (unos minutos)
investigacion/pelotaris-nuevos/tuberia.sh golpes          # piel rígida y los seis golpes reales (lo más largo)
investigacion/pelotaris-nuevos/tuberia.sh render coleta   # fotogramas de la derecha y la izquierda para revisar
investigacion/pelotaris-nuevos/tuberia.sh glb             # escribe en src/assets: solo con todo revisado
```

Los modelos miran hacia −Y. Los golpes se revisan fotograma a fotograma y de cerca (render a 3× de la zona dudosa):
nada entra en el juego sin haberlo visto.

## Qué está arreglado (y comprobado en render de cerca)

En `tools/blender/piel-rigida.py` y `tools/blender/huesos-extra.py`:

- **Cara y mandíbula sin manchas al girar la cabeza.** Todo lo que queda por encima de la barbilla va entero con el
  hueso de la cabeza (antes había una tolerancia que dejaba miles de puntos de la cara repartidos con el pecho). La
  franja de transición se mide desde la barbilla de cada modelo: 4 cm de cuello por debajo, y sube hacia la nuca.
- **El cuello gira sobre su centro.** Meshy pone las articulaciones del cuello y la cabeza donde quiere (en la coleta,
  7 cm por delante; en el chico, 11,4 cm). `huesos-extra.py` las recoloca en el centro del cuello medido en la malla
  cuando se desvían más de 1,5 cm.
- **Cuello de la camiseta y nuca sin dientes ni solapas.** El pelo que cuelga se reconoce por detrás de la nuca medida y
  nunca se lleva puntos con color de ropa.
- **Punta de la coleta entera.** Detrás de la nuca, todo lo que está unido al pelo y no es ropa va con el pelo, aunque
  sea de un rubio más claro.

## Qué falta

1. **Sobaco y manga**: aleta y pliegue oscuro cuando los brazos se cruzan por delante al acabar el golpe (izquierda,
   fotogramas 41-47; derecha, 34-40, visto de cerca). Les pasa a los tres, también al chico que ya está en el juego.
2. **Muñequera**: algunos picos junto a la muñeca (izquierda, fotograma 47).
3. **Chico**: rehacerlo con estas reglas (su cabeza gira 11,4 cm fuera del centro del cuello).
4. Borde del cuello de la camiseta de la coleta: algo irregular ya en reposo; es de la textura del modelo.
5. Con todo lo anterior bien: `tuberia.sh glb`, poner las alturas en `MESHY_H` de `src/actors/glbChar.js`
   (`pelotari_nueva` 1,71 y `pelotari_nueva3` 1,69), actualizar el comentario de `src/pelota/estiloPelotari.js`, y
   comprobarlo en el estudio y en un partido antes de subirlo.

Reglas del autor que mandan aquí: el modelado tiene que ser perfecto; tronco, cuello y hombros en bloque firme; solo
giros que un cuerpo humano puede hacer; nada que se deforme.

## Guiones de comprobación (`diagnostico/`)

Todos con `$BLENDER_PY guion.py -- modelo.glb …`:

- `cabeza-fuera.py modelo.glb <altura de la barbilla>`: cuántos puntos de la cabeza no van enteros con su hueso (debe dar 0).
- `cabeza-mapa.py`, `cuello-ver.py`, `cuello-camiseta.py`: reparto de pesos en cabeza, cuello y cuello de la camiseta.
- `huesos-vs-malla.py`: distancia de las articulaciones de cuello y cabeza al centro del cuello de la malla.
- `punta-coleta.py`: con qué huesos va la punta de la coleta.
- `hoja-golpe.py`, `vueltas4.py`: hoja de fotogramas de un golpe y cuatro vistas del modelo.
- `montaje.py`: el vídeo comparado (grabación real, de espaldas y de lado) a partir de los fotogramas de `render`.
