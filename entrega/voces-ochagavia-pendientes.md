# Voces de Otsagabia que faltan por locutar

Inventario del 16 de noviembre de 2026, sacado del código. Ya tienen voz 141 frases.

| Quién | Frases con voz |
|---|---|
| Ocho vecinos en sus charlas | 78 |
| Narradora, con la voz de Maite: avisos, premios, catalejo y cartas | 33 |
| Arantxa: las diez preguntas del queso, con el acierto y el fallo | 30 |

Faltan 17 frases fijas y 7 que llevan números o nombres que cambian.

Antes de grabar hay que decidir:

- Kike, el niño del frontón: hace falta una descripción de su voz y una frase de muestra para diseñarla.
- Itxaso y Txaro, las paseantes: se proponen dos voces de mujer de España de la biblioteca, que aún no usa nadie. Se escuchan antes de grabar.
- Los saludos según el tiempo: con la voz de cada vecino o con una sola.

## Kike, en el frontón (game.js)

- ¡Aupa! Soy Kike. ¿Juegas a pelota?
- Se golpea la pelota contra el frontis, la pared grande. Cuando vuelva botando, ponte cerca y dale con la mano.
- Si me devuelves seis seguidas, te doy la cinta verde. Ve al círculo verde y pulsa GOLPE cuando la pelota brille.
- ¡Eres un pelotari de verdad! Vuelve cuando quieras a jugar.
- ¡Seis seguidas! ¡Eres un txapeldun, un campeón!
- Toma la cinta verde, como el frontón. ¡Vuelve a jugar cuando quieras!
- ¡Probemos otra vez!

## Paseantes, Itxaso y Txaro (npcs.js)

- ¡Egun on! Hace un día precioso en el valle.
- "Egun on" significa "buenos días" en euskera.
- Mañana es la fiesta de Muskilda. ¡Toda la villa sube al santuario!
- ¿Has probado el queso de Arantxa? Está en la plaza.
- Cuando nieva, los tejados tan inclinados hacen que la nieve resbale.
- He oído cencerros por las calles… ¿será el Zarratrako?

## Saludos según el tiempo, de cualquier vecino (saludo.js)

- ¡Cómo nieva! Abrígate bien si subes al monte.
- Vaya día de lluvia… ¡pero el campo lo agradece!
- Qué noche más tranquila para pasear.
- Qué día más bonito para pasear.

## Sin voz a propósito

El título de la misión «¿Dónde está el Zarratrako?» y las respuestas que se eligen con botón se leen, no se dicen.

## Con datos que cambian

Se pueden grabar por trozos o dejarlas sin voz.

- Te faltan ${left.length} cintas.
- Llevas ${st.observed.length} de 5. Los buitres se ven mejor desde zonas abiertas; el pito negro, en troncos de haya del fondo del bosque.
- Llevas ${st.litter.length} de 5. Busca cerca de los senderos de Irati.
- Pero sin sus cintas no pueden bailar… Tienes ${st.ribbons.length} de 8. ¡Tráelas todas y bailaremos juntos!
- ¡Encontrado! (${q.found}/3) …¡y se escapa!
- ¡${name} anotado en el cuaderno!
- ¡Muy bien! Has acertado ${D.hits} de ${D.total}. Para la fiesta hacen falta al menos ${Math.ceil(D.total * 0.55)}.
