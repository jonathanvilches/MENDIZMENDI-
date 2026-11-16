# Voces de Otsagabia que faltan por locutar

Inventario del 16 de noviembre de 2026, sacado del código. Ya tienen voz 141 frases.

| Quién | Frases con voz |
|---|---|
| Ocho vecinos en sus charlas | 78 |
| Narradora, con la voz de Maite: avisos, premios, catalejo y cartas | 33 |
| Arantxa: las diez preguntas del queso, con el acierto y el fallo | 30 |

Solo tienen voz las misiones y la información. Los paseantes y los saludos según el tiempo se quedan sin voz: el autor, 16 de noviembre de 2026, «La gente que pasa y saluda no hace falta. Solo misiones y información».

Faltan 7 frases fijas, 6 de Kike y 1 del Bobo, y 7 frases que llevan números o nombres que cambian.

Antes de grabar hay que decidir:

- Kike, el niño del frontón: hace falta una descripción de su voz y una frase de muestra para diseñarla.
- Las voces de cada vecino: las elige el autor escuchando las muestras gratis de la biblioteca. No se pone voz a ningún personaje ni se gastan créditos sin que el autor la haya escuchado y elegido.

## Kike, en el frontón (game.js)

- ¡Aupa! Soy Kike. ¿Juegas a pelota?
- Se golpea la pelota contra el frontis, la pared grande. Cuando vuelva botando, ponte cerca y dale con la mano.
- Si me devuelves seis seguidas, te doy la cinta verde. Ve al círculo verde y pulsa GOLPE cuando la pelota brille.
- ¡Eres un pelotari de verdad! Vuelve cuando quieras a jugar.
- ¡Seis seguidas! ¡Eres un txapeldun, un campeón!
- Toma la cinta verde, como el frontón. ¡Vuelve a jugar cuando quieras!

## El Bobo, en Muskilda (game.js)

- ¡Probemos otra vez!

## Sin voz a propósito

El título de la misión «¿Dónde está el Zarratrako?» y las respuestas que se eligen con botón se leen, no se dicen.

Los cinco paseantes, Patxi, Itxaso, Fermín, Txaro e Iker, y los cuatro saludos según el tiempo se leen, no se dicen.

## Con datos que cambian

Se pueden grabar por trozos o dejarlas sin voz.

- Te faltan ${left.length} cintas.
- Llevas ${st.observed.length} de 5. Los buitres se ven mejor desde zonas abiertas; el pito negro, en troncos de haya del fondo del bosque.
- Llevas ${st.litter.length} de 5. Busca cerca de los senderos de Irati.
- Pero sin sus cintas no pueden bailar… Tienes ${st.ribbons.length} de 8. ¡Tráelas todas y bailaremos juntos!
- ¡Encontrado! (${q.found}/3) …¡y se escapa!
- ¡${name} anotado en el cuaderno!
- ¡Muy bien! Has acertado ${D.hits} de ${D.total}. Para la fiesta hacen falta al menos ${Math.ceil(D.total * 0.55)}.
