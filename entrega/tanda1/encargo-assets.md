# Tanda 1 · Lo que necesito que generes tú

Tres encargos. El primero es el que más cambia el juego: es la respuesta a lo que más te preocupa, la indumentaria.
Ninguno bloquea lo ya hecho: todo funciona con lo que hay, y cada pieza se cambia por la tuya cuando llegue.

## 1. Personajes con ropa propia, modelada (Meshy)

Por qué hace falta: los seis avatares de hoy son el mismo cuerpo y la misma cara con otra pintura. La ropa no tiene
volumen, por eso se ve impuesta. No se arregla con texturas ni con luz: hace falta que cada personaje nazca con su
ropa modelada, con grosor, cuello, pliegues y complementos.

Cómo hacerlo, en dos pasos por personaje: primero la hoja de referencia (imagen), luego el modelo 3D a partir de esa
imagen. Usa siempre el mismo bloque de estilo para que todos parezcan del mismo juego.

### Bloque de estilo, igual para todos (pégalo al principio de cada prompt de imagen)

```
Hoja de personaje para videojuego infantil estilizado, estilo gouache pintado a mano, colores limpios y saturados,
sin brillos plásticos. Niño o niña de 9 años, proporciones de 4,5 cabezas de alto, cabeza grande, manos y pies
grandes y redondeados, ojos grandes con brillo, expresión simpática. Tres vistas del mismo personaje en la misma
imagen: frontal, lateral derecha y trasera, de cuerpo entero, en pose A (brazos separados 45 grados del cuerpo,
piernas algo abiertas), alineadas a la misma altura. Fondo gris claro liso, luz suave y uniforme, sin sombras
duras. La ropa es de tela de verdad con volumen y grosor: cuellos, puños, dobladillos, pliegues y costuras se ven
como piezas con relieve encima del cuerpo, no pintadas sobre la piel. Sin texto, sin logotipos, sin escudos, sin
marcas, sin números. Personaje original, no se parece a ninguna persona real ni a ningún personaje existente.
```

### Los seis personajes (añade uno de estos párrafos detrás del bloque de estilo)

```
PASTOR DEL PIRINEO. Niño de pelo castaño revuelto. Boina negra de lana posada sobre la cabeza, con su vuelo y su
rabito. Camisa de lino crema remangada, chaleco de lana marrón oscuro con botones de madera, pañuelo rojo anudado
al cuello con el nudo en relieve, pantalón de pana pardo hasta media pierna, calcetines gruesos de lana cruda y
abarcas de cuero con cordones que suben por la pierna. Zurrón de cuero en bandolera. La capa de pastor no va
puesta: se entrega aparte.
```
```
SANFERMINERA. Niña de pelo negro recogido en una coleta alta. Camisa blanca de manga corta con cuello, pantalón
blanco recto, faja roja ancha enrollada a la cintura con el nudo y los flecos colgando a un lado, pañuelo rojo al
cuello doblado en triángulo y anudado delante, alpargatas blancas con cintas rojas atadas al tobillo.
```
```
PELOTARI. Niño de pelo corto castaño claro. Camisa blanca de manga corta con cuello y botones, pantalón largo
blanco, faja azul ancha a la cintura, zapatillas blancas de suela plana. Las dos manos vendadas con esparadrapo
blanco y tacos de protección en la palma, modelados con relieve. Sin escudos ni publicidad en la camisa.
```
```
DANTZARI. Niña de pelo rubio oscuro en dos trenzas. Boina roja, camisa blanca de manga larga, dos cintas rojas
cruzadas sobre el pecho y la espalda, faja roja, falda roja con una cinta negra en el borde, enaguas blancas que
asoman, medias blancas y alpargatas blancas con cintas rojas cruzadas hasta la rodilla. Un cascabel pequeño en
cada tobillo.
```
```
HORTELANA DE LA RIBERA. Niña de piel morena y pelo oscuro ondulado. Pañuelo de cuadros anudado a la cabeza,
blusa de algodón de color tostado remangada, delantal verde oliva largo con un bolsillo grande delante, falda
marrón hasta la rodilla, medias de lana y botas bajas de cuero. Una cesta de mimbre pequeña colgada del brazo.
```
```
MONTAÑERO. Niño pelirrojo con pecas. Gorro de lana verde con pompón, jersey grueso de lana con cenefa geométrica
sencilla, pantalón de montaña gris por encima de unas botas marrones con calcetín doblado, mochila pequeña de lona
a la espalda con sus correas en relieve.
```

Pieza suelta, misma hoja de estilo, para el planeador:

```
CAPA DE PASTOR sola, sin personaje: capa corta de lana gruesa parda con capucha, dos listas de color crema
cerca del borde y una cenefa roja en zigzag. Vista frontal, lateral y trasera, extendida y abierta, fondo gris liso.
```

### Paso a 3D en Meshy (igual para todos)

- Modo: Image to 3D, con la hoja de tres vistas como imagen de entrada (si tu plan admite varias vistas, las tres).
- Pose: A. Simetría: activada. Topología: quads.
- Polígonos: 30 000 caras como objetivo. Yo lo bajo luego a 20 000 y a 8 000 para lejos.
- Texturas: PBR, 2048 píxeles. Yo las bajo a 1024.
- Prompt de textura, si lo pide: `pintado a mano tipo gouache, colores planos y limpios, sin brillos, tela mate`.
- Esqueleto: el automático de Meshy para bípedo. Sin animaciones: las pongo yo con el mismo esqueleto de ahora.
- Exporta en GLB, un archivo por personaje, con este nombre: `pastor.glb`, `sanferminera.glb`, `pelotari.glb`,
  `dantzari.glb`, `hortelana.glb`, `montanero.glb`, `capa-pastor.glb`.

Lo que compruebo yo al recibirlos: que la ropa es geometría con grosor y no pintura, que no hay caras sueltas ni
agujeros, que el esqueleto dobla bien codos y rodillas, que pesa menos de 1,2 MB por personaje ya comprimido y que,
puesto junto a un vecino y a una oveja del juego, parece del mismo sitio.

## 2. Frases de música grabadas

Hoy las frases del paseo suenan con instrumentos sintetizados. Para que suenen de verdad necesito grabaciones cortas.
Lo mejor, un músico de aquí con el móvil en una habitación sin eco. Por cada instrumento, seis frases de 6 a 10
segundos, una detrás de otra con dos segundos de silencio entre ellas, melodía inventada, sin acompañamiento:

| Instrumento | Carácter | Comarca |
|---|---|---|
| Txistu | lento, aire de zortziko, notas largas | Atlántica y Pirineo |
| Txalaparta | preguntas y respuestas cortas, ttakun | Atlántica |
| Violín | pausado, con eco de valle | Pirineo |
| Acordeón o trikitixa | alegre, a tres, aire de jota tranquila | Zona Media y Ribera |
| Guitarra | punteada, seca y luminosa | Ribera y Zona Media |

Formato: WAV o M4A, un archivo por instrumento. Que sean melodías propias, no canciones conocidas: así son tuyas
y no hay licencia que pedir. Si prefieres generarlas con una herramienta, usa una cuyo plan te dé derechos de uso
comercial y este prompt, cambiando el instrumento:

```
Frase corta de txistu solo, sin acompañamiento, 8 segundos, melodía tradicional vasco-navarra inventada, tempo
lento, grabación seca sin reverberación, sin percusión, sin voz, termina en silencio.
```

## 3. La voz amable de las pistas (opcional)

Seis frases, en castellano y en euskera, con la misma voz en los dos idiomas: una persona joven o un abuelo
cercano, tono tranquilo, sin prisa. Formato WAV o M4A, un archivo por frase.

| Castellano | Euskera |
|---|---|
| Estás trepando. Mira el anillo: cuando se vacía, te sueltas. | Eskalatzen ari zara. Begiratu eraztunari: husten denean, askatu egiten zara. |
| En el aire, pulsa saltar otra vez y abres la capa. | Airean, sakatu berriro salto eta kapa irekiko duzu. |
| Nadas mientras te quede anillo. | Eraztuna duzun bitartean egiten duzu igeri. |
| Eso de la banderola es una atalaya. Sube a mirar. | Banderatxoa duen hori talaia bat da. Igo begiratzera. |
| ¡Una kutxa! Ábrela. | Kutxa bat! Ireki ezazu. |
| Siéntate en un banco y recuperas los corazones. | Eseri banku batean eta bihotzak berreskuratuko dituzu. |

## Y dos cosas que solo puedes medir tú

- En el iPhone y en el ordenador, abre el juego, entra en un pueblo, pasea un minuto y hazme una captura de
  Ajustes, Diagnóstico. Con eso tengo las imágenes por segundo de verdad, que aquí no puedo medir.
- Dime si las frases de música te gustan así o prefieres recuperar la canción de fondo mientras se explora.
