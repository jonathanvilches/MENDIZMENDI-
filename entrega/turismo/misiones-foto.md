# Misiones de foto en los lugares de verdad

**Propuesta, 17 de noviembre de 2026.** Lo pidió el autor: «en todas las comarcas y pueblos, que una de las misiones sea
sácate una foto junto a la iglesia, el acueducto, el yacimiento o el puente medieval; y que el sabio del pueblo pueda
verificar que esa foto es real y es de ese lugar».

## Qué se juega

1. En cada pueblo, el sabio o la sabia del lugar histórico, que ya existe en el juego (`src/data/sabios.js`), da una
   misión nueva: **«Tráeme una foto tuya junto a la iglesia de San Pedro»** (o el puente, el acueducto, el yacimiento, la
   casa-torre…). Sale en la barra de misiones con su propio icono, una cámara, en el color de la categoría «Cultura».
2. La misión solo se puede cumplir **estando allí de verdad**. El juego avisa: «Esta misión es para cuando visites
   Puente la Reina. Cuando estés junto al puente, abre la misión».
3. Allí, el botón «Hacer la foto» abre la cámara **dentro del juego**, con un marco que ayuda a encuadrar: la silueta
   del monumento en transparencia, sacada de la maqueta del juego, para que quepan tú y el monumento.
4. Al hacer la foto, el sabio «la mira» con una pequeña animación de la lupa y responde en su voz:
   - si es correcta: «¡Ese es nuestro puente! Fíjate en los arcos apuntados: son del siglo XI». Se gana la insignia del
     lugar, el sello en el cuaderno y, si el pueblo tiene comercios adheridos, el descuento (`src/data/comercios.js`);
   - si no lo es: «Mmm, eso no parece el puente. Acércate un poco más y que se vean los arcos», y se puede repetir.
5. La foto se queda en el **álbum del viaje**, solo en el teléfono, con la fecha y el nombre del lugar.

## Cómo se comprueba que la foto es real y de ese lugar

Cuatro pruebas, de la más barata a la más fuerte. Las tres primeras van en el propio teléfono, sin servidor y sin coste.

| Prueba | Qué comprueba | Cómo | Coste |
|---|---|---|---|
| 1. Estar allí | Que el teléfono está junto al monumento | GPS del navegador: a menos de 150 m de las coordenadas del monumento y con una precisión de 50 m o mejor | 0 |
| 2. Foto nueva | Que no es una foto vieja ni bajada de internet | Se hace con la cámara dentro del juego (no se puede subir una de la galería); hora y GPS del mismo momento | 0 |
| 3. Parecido | Que en la foto sale ese monumento | Reconocimiento de imagen en el teléfono: se compara con 5-10 fotos de referencia del monumento (modelo pequeño de visión, unos 5 MB, que se descarga solo al abrir la primera misión de foto) | 0 |
| 4. El sabio «la ve» | Que de verdad es ese lugar y describirlo | Inteligencia artificial de visión en un servidor: recibe la foto reducida y la ficha del monumento, y responde sí o no con una frase para el sabio | Unos céntimos por foto; necesita servidor y clave |

Recomendación: **empezar con las pruebas 1 a 3**, que no cuestan nada y no sacan la foto del teléfono. La 4 deja que el
sabio comente lo que se ve en la foto («qué bien se ve el pórtico románico»), que es lo más vistoso, pero necesita:

- un servidor pequeño (puede ir en el mismo proyecto de Vercel de los informes de juego) y una clave de la API de
  visión, que pagas tú por uso;
- **permiso**: si en la foto sale una persona, y más si es un niño, la foto sale del teléfono. Hay que pedir permiso
  antes, y si el jugador es menor, permiso de su madre, padre o tutor; borrar la foto en el servidor nada más
  comprobarla y no guardarla nunca. Una opción más segura: el teléfono tapa las caras antes de enviar (lo puede hacer
  sin servidor) y solo viaja el monumento.

## Lo que hace falta preparar

1. **La lista de monumentos con coordenadas exactas.** Hoy el juego sabe el nombre de cada iglesia y monumento
   (`src/data/heritage.json`, 21 pueblos; `landmarks` de `src/data/levels.js`, 31 pueblos con 10 puentes, 4 castillos,
   3 dólmenes, ermitas, murallas…) y las coordenadas del centro de cada pueblo (`src/data/towns.json`), pero no las del
   monumento. Hay que sacarlas una a una de fuentes oficiales (Gobierno de Navarra, IDENA, Catálogo del Patrimonio) y
   comprobarlas en la ortofoto.
2. **Fotos de referencia** de cada monumento con licencia libre o propias (Wikimedia Commons tiene casi todas), de 5 a 10
   por monumento, desde distintos lados.
3. **Las frases del sabio** para cada resultado, en castellano y en euskera, y su locución.
4. **La cámara y el GPS** solo funcionan en la app y en la web servida con https; en el juego de prueba en el ordenador se
   simula para poder enseñarlo.

## Por dónde empezar

Un piloto con **cinco lugares** muy conocidos y fáciles de fotografiar: el puente de Puente la Reina, el de Burgui, el
Palacio Real de Olite, la iglesia de San Juan Evangelista de Ochagavía y la casa-torre de Zabaleta en Lesaka, todos
ya en el juego. Con las pruebas 1 a 3 y,
si das el visto bueno al servidor y la clave, también la 4. Si funciona bien en esos cinco, se extiende a todos los
pueblos.

**Lo que necesito que decidas:** si quieres la prueba 4 (servidor y clave de la API de visión, y cómo tratar las fotos
con personas), y si te parecen bien esos cinco lugares para el piloto.
