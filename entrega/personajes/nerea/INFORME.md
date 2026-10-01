# Nerea · informe de construcción

Personaje 100 % original, modelado desde cero con bpy y bmesh (Blender 4.2). Se reconstruye entero con el script de `tools/blender/`.

## Resumen

| | |
|---|---|
| GLB principal | `char_nerea.glb` · **2,03 MB** (límite 2 MB) |
| GLB LOD (nivel cage) | `char_nerea_lod.glb` · 1,27 MB · 11.234 triángulos en el archivo |
| Triángulos visibles (variantes por defecto) | 27.128 |
| Triángulos en el archivo (con todas las variantes) | 31.338 |
| Caras de la cage | 2.268 |
| Huesos | 40 deformadores de 44 (máx. 60) |
| Materiales | 4: `MAT_Eyes`, `MAT_Glint`, `MAT_Nerea_Body`, `MAT_Nerea_Face` |
| Texturas | Body 1024 px, Face 512 px, T_Eyes 256 px (PNG 8 bits sRGB) |
| Clips | 13 |
| Validador glTF | 0 errores, 0 avisos, 0 informativos |
| Reimportación en Blender limpio | altura 1,678 m, pies en z = -0,003, mira a −Y: sí, 13 acciones, 21 variantes |

## Triángulos por pieza

| Pieza | Triángulos |
|---|---:|
| Cabeza | 3.184 |
| Pelo (masa) | 2.768 |
| Piel visible (cuello, antebrazos, rodillas) | 1.504 |
| Camisa | 5.132 |
| Chaleco | 2.912 |
| Pantalón | 2.752 |
| Calcetines | 2.592 |
| Botas | 336 |
| Pañuelo | 3.552 |
| Mechones (Hair_01–03) | 212 |
| Cara (ojos, iris, brillos, párpado, cejas, boca) | 776 |
| Manos (abiertas) | 1.408 |
| **Total visible** | **27.128** |

## Clips

| Clip | Fotogramas | Segundos | Boca | Cejas | Manos |
|---|---:|---:|---|---|---|
| Idle | 96 | 3,20 | Neutral | Normal | Open |
| Walk | 30 | 1,00 | Smile | Normal | Open |
| Run | 18 | 0,60 | SmileOpen | Happy | Fist |
| Jump_Start | 9 | 0,30 | SmileOpen | Surprised | Open |
| Jump_Loop | 24 | 0,80 | SmileOpen | Happy | Open |
| Land | 12 | 0,40 | Neutral | Normal | Open |
| Talk | 60 | 2,00 | TalkA | Normal | Open |
| Wave | 54 | 1,80 | SmileOpen | Happy | Open |
| Celebrate | 54 | 1,80 | SmileOpen | Happy | Fist |
| Scared | 48 | 1,60 | Scared | Worried | Open |
| Look_Around | 90 | 3,00 | Neutral | Surprised | Open |
| Ready | 30 | 1,00 | Neutral | Normal | Open |
| Hit | 16 | 0,53 | SmileOpen | Angry | Open |

Las expresiones de cada clip están también en `char_nerea.faces.json` y en los extras de cada Action.

## Variantes intercambiables

`Brow_Angry`, `Brow_Happy`, `Brow_Normal`, `Brow_Surprised`, `Brow_Worried`, `Eyelid_Closed`, `Eyelid_Half`, `Eyelid_Open`, `Hand_L_Fist`, `Hand_L_Open`, `Hand_R_Fist`, `Hand_R_Open`, `Hand_R_Point`, `Mouth_Neutral`, `Mouth_Scared`, `Mouth_Smile`, `Mouth_SmileOpen`, `Mouth_Surprised`, `Mouth_TalkA`, `Mouth_TalkO`, `Mouth_Tired`.

## Limpieza

Sin n-gons ni vértices sueltos en ninguna malla.

## Desviaciones del encargo

- **Presupuesto de triángulos.** El encargo pide una cage de 1.600–2.000 quads y 6–8k triángulos, pero una Subdivision de nivel 1 multiplica cada quad por 4 (8 triángulos) y el Solidify de la ropa duplica las caras: 2.000 quads dan unos 16k triángulos antes del Solidify. Se entregan las dos cosas: el GLB principal con Subdivision y Bevel aplicados, y un GLB LOD al nivel de la cage.
- **Bevel de la ropa.** Con el límite por ángulo de 30° sobre una cage tan ligera se biselaban casi todas las aristas. El Bevel (0,012 × 3, harden normals) se limita por peso a los bordes de las prendas (bajo, cuello, sisas, mangas).
- **Cabeza y cara de juguete.** Por decisión de dirección, la cabeza es un cilindro redondeado de estilo juguete (diseño propio, sin copiar figuras existentes) con la cara pintada como piezas planas pegadas a la cabeza: ojos con blanco, iris castaño con pupila (su textura se desplaza para mirar) y brillo, cejas siempre visibles, nariz de botón y sonrisa de trazo; pelo de una sola pieza con raya al lado, tupé y mechones moldeados. Se mantienen la rejilla 24 × 16, las variantes intercambiables (bocas, cejas, párpados) y el esqueleto; desaparecen las orejas, los globos oculares y los tres mechones (Hair_01–03).
- **Zancada de Walk.** Una zancada de 2,15 m no es posible con piernas de 0,5 m. El ciclo de 30 fotogramas (contactos en 0 y 15) avanza alrededor de 1,15 m (piernas a ±34°, giro de cadera y talón que se levanta al impulsarse); el juego ajusta la velocidad de reproducción a la velocidad real.
- **Numeración del encargo.** Algunas referencias internas del encargo («punto n») no coinciden con la numeración del texto; se ha seguido el contenido de cada apartado.
- **Pesos de la ropa.** Los pesos automáticos se calculan sobre una copia entera del cuerpo y se transfieren a la piel y a cada prenda (punto más cercano, interpolado). Así piel y ropa se doblan juntas; luego Limit Total 4, Normalize All y Clean 0,01 como pide el encargo.
- **Copia del juego.** La copia de src/assets/chars se cuantiza (KHR_mesh_quantization, sin Draco) para que pese menos; la de esta carpeta es la exportación de Blender sin tocar.

## Renders

Carpeta `renders/`: frente, perfil, tres cuartos, espalda, cara, hoja de expresiones, wireframe de frente y de perfil, y las cuatro poses de prueba (brazos arriba, brazos cruzados, sentado, paso largo).

## Reconstruir

```
blender -b -P tools/blender/build_nerea.py
# o, con el módulo bpy de Python 3.11:
python3.11 tools/blender/build_nerea.py
```
