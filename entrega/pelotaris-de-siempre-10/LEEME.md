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
| juez (de verde, como los de verdad: polo verde y pantalón oscuro) | src/assets/meshy/lod/juez_hombre.glb | 01a1ee0f-48b0-7260-b768-12bc0a3bc87d |
| jueza (de verde) | src/assets/meshy/lod/juez_mujer.glb | 01a1ee0f-4d2a-72eb-83fd-632ba09c39f1 |
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

## Afición añadida el 18 de noviembre (Meshy, imagen → 3D)

| Figura | Tarea de imagen | Tarea 3D |
|---|---|---|
| aficion_joven | 01a1ee26-4e51-742a-8a8c-1f7076910af6 | 01a1ee27-8062-733c-8568-acc9ba498fa5 |
| aficion_chica | 01a1ee26-5694-7738-adee-6659b363c71c | 01a1ee27-842f-74ac-9e29-f3766caf8b35 |
| aficion_gafas | 01a1ee26-5c55-7063-accc-1c44ad15268a | 01a1ee27-875d-7191-9528-396837b08c07 |
| aficion_rubia | 01a1ee26-6306-7587-83da-d10d4d782a5c | 01a1ee27-8bd6-72ba-8503-b9b5d7835899 |
| aficion_nino | 01a1ee26-6988-7161-b8c6-eac2f129a536 | 01a1ee27-8f55-7036-9c10-ded59b405155 |

## Queseros rehechos el 18 de noviembre (Meshy: imagen → 3D → esqueleto → animaciones)

Con el estilo detallado de los vecinos de siempre (referencia: el hombre y la mujer del pueblo).

| Vecino | Imagen | 3D | Esqueleto | Quieto (Alert) | Charla |
|---|---|---|---|---|---|
| quesero | 01a1ee37-63ab-700f-bf28-0ff5f6560e1e | 01a1eede-ae4c-7546-b74c-e6cf0fc0b9b6 | 01a1eeee-7699-7027-a9c1-2c7c24e0b1d4 | 01a1eeef-03b9-743c-a00e-508e6aed89c8 | 01a1eeef-0627-742f-a5e0-84188457d87e |
| quesera | 01a1ee37-6b26-73a2-a8d1-6f6872d37801 | 01a1eede-b1fc-7376-8181-859bcb18e30f | 01a1eeee-87a7-711a-ad96-b4ad42956ad3 | 01a1eeef-0817-734e-adf4-1dea20fb2f22 | 01a1eeef-0a7f-70e8-87f2-2bf722da3930 |

El 3D, sin pedir la pose en cruz (cambiaba las proporciones); la textura, oscurecida con tools/vecino-tono.mjs.

## Campesinos y panaderos rehechos el 18 de noviembre (igual que los queseros)

| Vecino | Imagen | 3D | Esqueleto | Quieto (Alert) | Charla |
|---|---|---|---|---|---|
| campesino | 01a1eeee-5968-737c-aacb-aa49733a2202 | 01a1eef2-17d1-7649-bafb-22a28309c261 | 01a1eef8-c8b7-7153-b507-8403ceafa423 | 01a1eef9-8714-77e3-98b8-6a76b0daabf6 | 01a1eef9-885e-7685-aea5-ae303a561472 |
| campesina | 01a1eeee-6846-7793-98d1-943026c44cf9 | 01a1eef2-1db9-74e8-91ee-e8e5116411aa | 01a1eef8-d8d6-7163-b612-b25e4219e6a3 | 01a1eef9-89db-714f-aba2-8b2955578e0f | 01a1eef9-8b17-7787-9a36-f195b0994b6c |
| panadero | 01a1eeee-6075-72a9-8864-6789438f7026 | 01a1eef2-2194-71b3-956d-09f822e32758 | 01a1eef8-e735-76ce-95f2-db7e3da37970 | 01a1eef9-8c22-7375-a249-e7726d0fa92e | 01a1eef9-8db5-7089-aa95-6a9cf5dceaca |
| panadera | 01a1eeee-6f57-75b1-9e2e-15f3335f74de | 01a1eef2-26fc-7662-ab92-2e54ae9ef1d1 | 01a1eef8-f463-76e4-b9d5-38bba59caa85 | 01a1eef9-8ec4-7305-a5bc-b5dc6d52909b | 01a1eef9-9034-7600-ba53-959faccbc30c |

Montaje de cada uno: tools/meshy-rig-vecino.mjs → tools/vecinos-glb.mjs → tools/vecino-tono.mjs (rellena los huecos de
la textura y la oscurece) → FUENTE=src/assets/meshy/vecinos SOLO=<nombre> node tools/meshy-lod.mjs 0.5 512 (la ligera a
la mitad de triángulos: con menos, la cara salía con manchas) → tools/meshy-costuras.mjs → tools/vecinos-cerca.mjs.
