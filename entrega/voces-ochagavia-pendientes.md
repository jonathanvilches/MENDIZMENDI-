# Voces de Otsagabia

Inventario del 16 de noviembre de 2026, sacado del código. Tienen voz 162 frases.

Las voces las elige el autor escuchando las muestras gratis de la biblioteca de ElevenLabs. No se pone voz a ningún personaje ni se gastan créditos sin que el autor la haya escuchado y elegido.

Solo tienen voz las misiones y la información. Los paseantes y los saludos según el tiempo se quedan sin voz: el autor, «La gente que pasa y saluda no hace falta. Solo misiones y información».

| Quién | Voz | Frases |
|---|---|---|
| Maite | Lulú, rechazada: busca voz nueva | 18 |
| Itziar | Rosa, rechazada: busca voz nueva | 11 |
| Joxemari | Rafael | 11 |
| Kike | Leo | 7 |
| Ainhoa | Sofía | 9 |
| Joseba | Martín | 7 |
| El Basajaun | Ezequiel | 7 |
| La Lamia | Sophie | 8 |
| El Bobo | Lucas | 5 |
| Arantxa | Mari | 33 |
| Narradora: avisos, premios, catalejo y cartas | Nico | 46 |

## Pendiente

- Maite e Itziar: el autor rechaza sus voces, «son un horror y pronuncian fatal». Se le mandan muestras gratis de voces nuevas de castellano de España y, cuando elija, se graban de nuevo sus 18 y 11 frases.
- Maite dice cuatro palabras en euskera que su voz actual lee mal: Kaixo, Itziar, Joxemari y Zarratrako. Se arreglan al grabarla con la voz que elija el autor.

## Pronunciación del euskera

Ninguna voz entra en el juego sin que el autor la haya escuchado y aprobado.

Las voces de castellano leen x, tx, tz y z con reglas de castellano. Una primera prueba escribía lo dicho como suena: Kaisho, Joshemari, Churi, lachas, kachucha, chapeldun, Arancha, Itsiar, Artsai, gaste, egusquilore y Sarratrako. Al autor no le convenció y se retiró del juego: siguen las 25 grabaciones de antes. La siguiente prueba usó eleven_v4 con la pronunciación en alfabeto fonético. El 16 de noviembre el autor aprobó 25 grabaciones y ya están en el juego. Zatoya se dice en castellano.

El «Kaixo» de Joseba va escrito «Kaisho»: al autor le valían las dos formas. Los saludos de tarde y noche de Itziar no entran, porque el autor rechaza su voz.

## Sin voz a propósito

- El título de la misión «¿Dónde está el Zarratrako?» y las respuestas que se eligen con botón se leen, no se dicen.
- Los cinco paseantes, Patxi, Itxaso, Fermín, Txaro e Iker, y los cuatro saludos según el tiempo.

## Con datos que cambian

Se pueden grabar por trozos o dejarlas sin voz.

- Maite: Te faltan ${left.length} cintas.
- Joseba: Llevas ${st.observed.length} de 5. Los buitres se ven mejor desde zonas abiertas; el pito negro, en troncos de haya del fondo del bosque.
- El Basajaun: Llevas ${st.litter.length} de 5. Busca cerca de los senderos de Irati.
- El Bobo: Pero sin sus cintas no pueden bailar… Tienes ${st.ribbons.length} de 8. ¡Tráelas todas y bailaremos juntos!
- El Bobo: ¡Muy bien! Has acertado ${D.hits} de ${D.total}. Para la fiesta hacen falta al menos ${Math.ceil(D.total * 0.55)}.
- Narradora: ¡Encontrado! (${q.found}/3) …¡y se escapa!
- Narradora: ¡${name} anotado en el cuaderno!
- Narradora: ovejas en el redil, basura recogida, eguzkilores, escudos encontrados, estrellas, nueva misión y nueva carta, con su cuenta o su título.

## Lo que falta, contado de nuevo la noche del 16 de noviembre

Todas las frases fijas de las misiones tienen voz: las 162 grabaciones del manifiesto existen. Lo que se oye sin voz es esto.

| Qué | Frases | Con qué voz | Cómo |
|---|---|---|---|
| Maite y Joxemari, Joseba, el Basajaun y el Bobo: frases con una cuenta («Llevas 3 de 6», «Te faltan 2 cintas») | 7 frases, unas 40 grabaciones cortas | La de cada uno, ya aprobada; Maite, con la nueva | Una grabación por cada número posible |
| El Bobo: la explicación del baile, distinta en el móvil y en el ordenador | 2 | Lucas | Una para cada caso |
| Avisos de la narradora con cuenta o nombre: ovejas en el redil, basura, eguzkilores, escudos, estrellas, «¡Encontrado!», animal anotado, misión nueva y carta nueva | 9 avisos, unas 80 grabaciones | Nico | Una por número o por nombre |
| Los cinco paseantes: Patxi, Itxaso, Fermín, Txaro e Iker | 6 frases | Sin voz elegida | Solo si el autor quiere: cuatro de ellas dan información (los tejados, el queso de Arantxa, Muskilda, los cencerros) |
| Maite e Itziar con sus voces nuevas | 18 y 11 | Inés y Nuria, a falta del visto bueno de las pruebas | Se graban de nuevo cuando el autor apruebe |

En total, unas 150 grabaciones y unos 9.000 caracteres. A ElevenLabs le quedan este mes 29.668 caracteres.

## Personajes que siguen con el cuerpo antiguo

Los vecinos normales de Otsagabia ya son de Meshy. Los que llevan traje de leyenda o de fiesta siguen con la figura de antes, porque esos trajes solo existen en ella (`COSTUME` en `src/actors/npcGlb.js`).

| Personaje | Boceto |
|---|---|
| La Lamia | Aprobada y ya en el juego con su modelo de Meshy (17 de noviembre) |
| El Basajaun | Aprobado y ya en el juego con su modelo de Meshy, con un pie de persona y una pezuña |
| El Bobo de Muskilda | Boceto hecho, falta el visto bueno: `entrega/bocetos/bobo-muskilda.jpg` |
| El Zarratrako | Falta, con referencias reales del carnaval de Otsagabia |
| Los ocho danzantes de Muskilda | Falta |

## Referencias reales del Bobo y del Zarratrako

Buscadas el 17 de noviembre de 2026.

- El Bobo: arlequín vestido de verde y rojo, con máscara de dos caras, blanca delante y negra detrás, y castañuelas en la danza de procesión. Dirige a los ocho danzantes de Muskilda, que bailan cuatro danzas de palos, una de pañuelos, una jota y la de procesión. Su gorro ha cambiado con los años. Está documentado desde 1695. El boceto sigue esto; la faja roja y las alpargatas atadas son suposición.
- Los danzantes: van de blanco. No he encontrado una descripción completa y fiable del resto del traje. Falta una foto buena antes de hacer el boceto.
- El Zarratrako: las fuentes solo dicen que los zarratrakos van de casa en casa pidiendo comida al grito de «tia-tia, txula-txula!» y que antiguamente unos iban de oso y otros de oveja. No describen el traje de hoy. Sin una foto real no hago el boceto: sería inventado.

Fuentes: [Danzas de Otsagabia, Dantzatlas](https://www.dantzatlas.navarchivo.com/es/node/1482), [Muskilda y las danzas de Ochagavía, Labayru](https://www.labayru.eus/en/basque-ethnography-at-a-glance/muskilda-and-the-dances-of-ochagavia-navarre/), [Danzantes de Ochagavía, Noticias de Navarra](https://www.noticiasdenavarra.com/navarra/fiestas/2022/09/08/danzantes-ochagavia-5989183.html), [Cultura y tradiciones, ochagavia.com](https://www.ochagavia.com/el-pueblo/cultura-y-tradiciones/), [Archivo del patrimonio inmaterial de Navarra](https://navarchivo.com/en/node/181973).
