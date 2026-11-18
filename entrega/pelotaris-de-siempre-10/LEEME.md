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
| 7 | chica, trenza | 01a1edcc-a6fb-7234-8267-8160a970c49e |
| 8 | chica, moño | 01a1edcc-b485-7149-a125-a5f972a8d8b9 |
| 9 | chica, melena corta | 01a1edcc-c05e-75d1-9eed-2ab550319383 |
| 10 | chica, rizos | 01a1edcc-caff-77d6-ad4a-147066ee1a5c |

Falta: ponerles el esqueleto del pelotari actual (para que valgan sus mismas animaciones), la camiseta colorada, las
versiones ligeras para el móvil y probarlos en un partido.
