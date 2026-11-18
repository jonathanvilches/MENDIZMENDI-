# Los 10 pelotaris de siempre (5 chicos y 5 chicas) — borrador, 18 de noviembre de 2026

- `lamina-10-pelotaris.jpg`: la primera propuesta, con el pelo modelado en Blender sobre el pelotari actual (dentro del juego).
- `higgsfield-10-pelotaris.jpg` y `higgsfield/`: los 10 dibujados en Higgsfield (GPT Image 2.6) a partir del pelotari y la
  pelotari actuales: mismo cuerpo, misma pose y misma ropa; cambia el pelo y, en dos, la piel.
- `meshy-10-pelotaris.jpg`: los 10 pasados a 3D en Meshy (meshy-t2.5, 30.000 triángulos, textura meshy-n1), sin esqueleto aún.

Los modelos de Meshy no van en el repositorio (3-4 MB cada uno, sin comprimir): se vuelven a bajar por su tarea
(`GET https://api.meshy.ai/openapi/v1/image-to-3d/<tarea>`):

| nº | aspecto | tarea de Meshy |
|---|---|---|
| 1 | chico, rizos | 01a1edcc-284d-74cc-8ed2-30ac88778814 |
| 2 | chico, corto | 01a1edcc-3594-7552-82c7-7cf66c2933c1 |
| 3 | chico, de punta | 01a1edcc-4316-7095-8f15-59dab03c0e8f |
| 4 | chico, rapado | 01a1edcc-5219-7404-88ca-ff7d70568dcf |
| 5 | chico, melenita | 01a1edcc-5fc7-7493-9dd8-38b5958cf8eb |
| 6 | chica, coleta | 01a1edcc-9f49-77ac-9c4a-6b2d6d9123f1 |
| 7 | chica, trenza (rehecha sin mechones sobre la cara) | 01a1ede4-04c0-77a5-a923-87d0b0e6e3d8 |
| 8 | chica, moño | 01a1edcc-b485-7149-a125-a5f972a8d8b9 |
| 9 | chica, melena corta (rehecha: la primera traía hilos colgando) | 01a1ede4-1183-7321-884d-03847cdb330c |
| 10 | chica, rizos | 01a1edcc-caff-77d6-ad4a-147066ee1a5c |

Los jueces y el público del mismo estilo (imágenes hechas en Meshy a partir de estos pelotaris, y luego a 3D):

| figura | archivo del juego | tarea de Meshy (3D) |
|---|---|---|
| juez | src/assets/meshy/lod/juez_hombre.glb | 01a1ede6-4905-74f8-ad45-95ffe0c37622 |
| jueza | src/assets/meshy/lod/juez_mujer.glb | 01a1ede6-4f30-7116-8653-a5652dc25820 |
| espectador de la txapela | aficion_hombre.glb | 01a1ede6-5444-7102-853e-e7cb92d507b7 |
| espectadora del pañuelo | aficion_mujer.glb | 01a1ede6-57e6-754a-bde6-59be5308d551 |
| abuelo | aficion_abuelo.glb | 01a1ede6-5b3a-74cb-b2a9-6ff55d96abb1 |
| abuela | aficion_abuela.glb | 01a1ede6-5e48-712c-b3ca-7f10c9dd00e7 |

Los bailes: esqueleto de Meshy sobre el nº 1 (tarea 01a1edd5-5032-72fe-9219-8d4f4aa7f27c) y diez bailes de su biblioteca
(tarea 01a1edd8-c62f-71e5-875f-4992c57ea4ce), pasados al esqueleto del pelotari con tools/pelotaris10-bailes.mjs.

Cómo se rehace todo: tools/blender/pelotaris10/construir.sh (esqueleto del pelotari a cada malla) y tools/pelotaris10.mjs
(archivos del juego). `en-el-juego.jpg`: los 10 dentro del juego, con el golpe, su baile y corriendo.

## Los 22 (18 de noviembre, por la tarde)

El autor: «deben coincidir las cards de los jugadores con los propios jugadores. Genérame todos». Cada nombre de la
plantilla tiene ya su modelo (src/assets/meshy/pelotari_<nombre>.glb) y su carta sale del mismo dibujo
(higgsfield/<nombre>.webp). Los 10 primeros son: inigo, unai, ander, aitor, mikel, garazi, maialen, irati, oihana, amaia
(las tareas de la tabla de arriba, en ese orden). Los 12 nuevos:

| nombre | tarea de Meshy |
|---|---|
| asier | 01a1edff-fc3c-7674-9f64-a7fb78a13948 |
| jokin | 01a1ee00-03b4-709f-97ea-6bf4f359838a |
| ekaitz | 01a1ee00-10c5-732b-bc49-05e610c1c7d9 |
| xabier | 01a1ee00-1db9-7027-9f65-93bca331e4e5 |
| inaki | 01a1ee00-e754-74b1-8a5d-39696a3b7f01 |
| julen | 01a1ee00-f478-7351-9230-69c7efeeb766 |
| nerea | 01a1ee01-01b3-76d7-ad8d-03dacfc1782b |
| ane | 01a1ee01-0e72-70c9-af64-de2eb78f1833 |
| nahia | 01a1ee01-84d8-702d-b575-6c727a892e11 |
| leire | 01a1ee01-92d8-763f-94a4-17f61a89a594 |
| miren | 01a1ee01-99e8-76d7-b897-2b57dd60a508 |
| uxue | 01a1ee01-a698-742b-9de6-ad25754b118b |

`los-22-cartas-y-juego.jpg`: las 22 cartas y los 22 en el juego, en el mismo orden.
