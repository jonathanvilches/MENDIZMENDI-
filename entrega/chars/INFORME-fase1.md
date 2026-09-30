# Sistema de personajes 3D · Fase 1: protagonista

## Archivo `src/assets/chars/char_protagonista.glb`

| Dato | Valor |
|---|---|
| Altura | 1,12 m (niño). En el juego se escala ×1,2 para igualar a la cuadrilla actual (≈1,36 m). |
| Triángulos | 8.056 en total; 6.408 visibles a la vez (una variante por grupo) |
| Reparto | Cuerpo 2.236 · Cabeza 1.888 · Pelo 776 · Manos 368–432 cada una · Ojos 224 cada uno · Pañuelo 260 |
| Huesos | 39: el esqueleto de Mixamo, más Eye_L/R, Jaw, Hair_01–03 y Scarf_01–02 |
| Influencias | Como máximo 4 por vértice, normalizadas |
| Sockets | Socket_Head, Socket_Hand_R, Socket_Back |
| Materiales | 3: MAT_Protagonista_Body, _Face, _Eyes |
| Texturas | Atlas de cuerpo 1024 y de cara 512 (color + metal/rugosidad), ojo 256 |
| Clips a 30 fps | Idle 2,5 s · Walk 1,0 s · Run 0,6 s · Jump_Start 0,3 s · Jump_Loop 0,8 s · Land 0,33 s · Talk 2,0 s · Wave 1,8 s · Celebrate 1,8 s · Scared 1,6 s · Look_Around 3,0 s |
| Datos de cara por clip | `face`, `brow` y `hand` en los extras de cada clip |
| Peso | 0,59 MB, sin Draco. Usa KHR_mesh_quantization, que three.js lee sin decodificador. |
| Validador Khronos | 0 errores, 0 avisos, 3 notas informativas |

## Mallas con nombre exacto

- **Siempre visibles:** Body, Head, Hair, Eye_L, Eye_R.
- **Grupos con una sola variante visible a la vez:**

  | Grupo | Variantes |
  |---|---|
  | Párpados | Eyelid_Half, Eyelid_Closed |
  | Cejas | Brow_Normal, Brow_Angry, Brow_Worried |
  | Bocas | Mouth_Normal, Mouth_Happy, Mouth_Surprised, Mouth_Scared, Mouth_Talk_A, Mouth_Talk_O, Mouth_Tired |
  | Mano izquierda | Hand_L_Open, Hand_L_Fist |
  | Mano derecha | Hand_R_Open, Hand_R_Fist, Hand_R_Point |

- **Accesorio:** Acc_Scarf.

## Cómo se genera

- `tools/chars/`: Blender 4.2 sin interfaz (bpy) crea la geometría, el esqueleto, los pesos, los atlas y los clips. Después exporta, aligera y valida el archivo.
  - Orden: `python3.11 tools/chars/build.py protagonista`.
  - Resultado: el GLB y un informe JSON en `tools/chars/out/`.
- Todo se modela por código. No se usa ni se copia ningún modelo de referencia.

## En el juego

- **`src/actors/glbChar.js`:**
  - Carga el modelo con GLTFLoader y lo clona con SkeletonUtils.
  - Cambia entre Idle, Walk y Run con un fundido de 0,2 s y ajusta el ritmo a la velocidad.
  - `setFace(boca, cejas, mano)` elige la expresión.
  - Parpadeo al azar cada 2–5 s, de 120 ms.
  - La mirada mueve la textura del ojo.
  - Al hablar, la boca alterna entre Talk_A y Talk_O.
  - El pelo y el pañuelo se mueven con muelles (rigidez 60, amortiguación 8).
  - Añade un contorno de dibujo para que encaje con el resto de personajes.
- **Beñat, el pastor de Urbasa**, es el personaje 10 del selector, con sus textos en castellano y euskera. Los otros 9 siguen igual.
- **Página de pruebas `lab/chars.html`:** selectores de animación, boca, cejas y mano, control de velocidad y contador de FPS.

## Capturas

En `entrega/chars/`:
- Frente, perfil, espalda y tres cuartos.
- Cara de frente y de perfil.
- Cada animación.
- Hoja de expresiones y párpados.

En `entrega/chars/juego/`: el selector y la portada (escritorio y móvil), y Beñat quieto, andando, corriendo y celebrando dentro de Lesaka.

## Diferencias con el encargo, y por qué

1. **Velocidades.** Con 4,3 m/s al andar, un niño de 1,1 m daría pasos de 2 m. En el juego el ritmo de las piernas sube con la raíz de la velocidad: se ven naturales a 3,3 y 6,8 m/s, las velocidades actuales del jugador. Si se cambian esas velocidades a 4,3 y 7,2, afectaría a todo el juego y a la persecución nocturna.
2. **Llamadas de dibujo.** Cada personaje tiene unas 10 mallas visibles más 4 de contorno. Para el límite de 40 llamadas con 8 personajes hará falta el LOD que une las mallas, a partir de 15 m. Queda pendiente para cuando haya más de un personaje GLB en escena.
3. **Ojos y boca.** Son piezas pegadas a la cara, no bucles de la malla de la cabeza, porque el encargo pide cambiarlos por visibilidad y no con morphs.
4. **FPS en un móvil real.** Aquí solo puedo medir con un navegador sin tarjeta gráfica. La página `lab/chars.html` muestra los FPS en el teléfono.

## Siguientes fases

- Fase 2: Maite, Amaia, Kike, Itziar y Joxemari.
- Fase 3: Basajaun, Lamia y Momotxorro, con los clips de criatura y la huida a 9 m/s.
- Fase 4: oveja latxa, vaca pirenaica, pottoka y perro pastor.
