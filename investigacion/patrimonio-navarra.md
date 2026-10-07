# Patrimonio de Navarra en MENDIMENDIZ: revisión y propuestas

Objetivo del juego: conocer Navarra. El fútbol y la pelota acompañan, pero el centro es el producto local, la arquitectura,
la historia, la fauna, la flora, la agricultura, la ganadería, las tradiciones y la lectura de los escudos de las casas.

## 1. Qué hay ya en el juego (tras esta revisión)

- **Saberes de Navarra**: 11 categorías (producto, agricultura, ganadería, oficios, arquitectura, escudos, historia,
  tradiciones, fauna, flora, montes). Cada carta ganada suma a una. La portada abre con «Aprende Navarra jugando» y su
  contador. Al cumplir una misión se dice a qué saber suma.
- **Leer escudos de fachada**: en cada pueblo hay casas con escudo (hasta 8). Se lee en piedra, paso a paso: partición,
  figura, esmalte por las rayas de la piedra y una regla. Al final se ve en color con su blasón y el significado del
  nombre de la casa en euskera. En Baztán aparece el ajedrezado del valle. Insignia «Heraldista» con 5 escudos.
- **Datos comprobados en los deportes**: al final de cada partido de fútbol sale un «Saber de Navarra», como ya hacía la
  pelota con sus datos del frontón.

## 2. Escudos oficiales de Navarra en el juego

Se han buscado los escudos oficiales del reino, de las cabezas de merindad, de los valles y de todos los pueblos jugables.
Están en `src/data/armas-navarra.js`, con su blasón, cómo se lee, su historia y su fuente. En cada pueblo hay un pilar
en la plaza con su escudo pintado y una lectura guiada. En el menú, «Escudos» reúne todos con una guía de lectura.
El frontón de cada pueblo lleva también su escudo oficial.

- **conf alta**: blasón literal de la fuente. **conf media**: la fuente lo resume y el dibujo puede simplificar.
- **Sin comprobar** (no se dibujan para no inventarlos): Cortes, Goñi, Guesálaz, Larraona, Améscoa Baja, Unzué,
  Romanzado, Villamayor de Monjardín y Luzaide / Valcarlos (ajedrezado, colores sin confirmar).
- Wikipedia y heraldry-wiki estaban bloqueadas por la red de este entorno: los blasones se tomaron de los resúmenes del
  buscador sobre esas páginas y de webs municipales. Conviene revisarlos con el «Anexo: Armorial municipal de Navarra».

| Escudo | Tipo | Confianza |
|---|---|---|
| Navarra | reino | alta |
| Pamplona / Iruña | ciudad | alta |
| Tudela / Tutera | ciudad | alta |
| Estella / Lizarra | ciudad | alta |
| Olite / Erriberri | ciudad | alta |
| Sangüesa / Zangoza | ciudad | alta |
| Valle de Baztán | valle | alta |
| Valle de Roncal | valle | alta |
| Valle de Salazar | valle | alta |
| Valle de Aezkoa | valle | media |
| Valle de Esteribar | valle | alta |
| Valle de Erro | valle | alta |
| Orreaga / Roncesvalles | municipio | alta |
| Bera, Arantza y Etxalar (Cinco Villas) | municipio | alta |
| Lesaka | municipio | media |
| Leitza | municipio | alta |
| Altsasu / Alsasua | municipio | alta |
| Etxarri Aranatz | municipio | media |
| Auritz / Burguete | municipio | media |
| Zubieta | municipio | alta |
| Ezkurra | municipio | alta |
| Lantz | municipio | alta |
| Arruazu | municipio | alta |
| Iturmendi (valle de Burunda) | municipio | alta |
| Uharte Arakil | municipio | alta |
| Valle de Arakil | valle | media |
| Valle de Larraun | valle | media |
| Araitz | municipio | media |
| Basaburua | valle | alta |
| Ollo | municipio | alta |
| Iza | municipio | alta |
| Cendea de Galar | municipio | alta |
| Berrioplano / Berriobeiti | municipio | alta |
| Valle de Aranguren | valle | media |
| Izagaondoa | valle | alta |
| Monreal / Elo | municipio | alta |
| Yesa | municipio | alta |
| Carcastillo | municipio | alta |
| Valle de Lana | valle | media |
| Torralba del Río | municipio | alta |
| Piedramillera | municipio | alta |
| Aiegi / Ayegui | municipio | alta |
| Etxauri | municipio | alta |
| Ergoiena | valle | media |
| Ituren | municipio | media |
| Zugarramurdi | municipio | media |
| Lekunberri | municipio | alta |
| Aoiz / Agoitz | municipio | alta |
| Lumbier / Irunberri | municipio | alta |
| Viana | ciudad | media |
| Puente la Reina / Gares | municipio | alta |
| Artajona | municipio | alta |
| Tafalla | ciudad | media |
| Javier / Xabier | municipio | media |
| Ujué / Uxue | municipio | alta |
| Marcilla | municipio | alta |

## 3. Hallazgos de la investigación

### Heráldica en las fachadas
- Baztán: el ajedrezado de plata y sable es el escudo del valle. Sus vecinos tenían hidalguía colectiva y por eso tantas
  casas lucen armas. La tradición lo liga a Las Navas de Tolosa (1212).
- Las casas barrocas de Baztán (siglos XVII y XVIII, muchas pagadas por indianos y gente de la Corte) ponen el escudo en
  el eje de la fachada, con yelmo y grandes lambrequines.
- Figuras frecuentes en la heráldica vasconavarra: lobo (otso), panelas, árbol (roble), castillo, banda, estrellas.
- Sistema de rayas (Petra Sancta) para leer los esmaltes en la piedra o el grabado.
- Las armas de Navarra: cadenas de oro sobre gules con una esmeralda en el centro.

### Dinteles y protección de la casa
- **Atalburu**: dintel de la puerta en el norte. A veces lleva el año, los nombres de la pareja y símbolos de suerte.
- **Eguzkilore**: flor seca de cardo en la puerta, contra los malos espíritus y las tormentas.
- Marcas de cantero en los sillares de iglesias y puentes: firmas de los canteros para cobrar su trabajo.

### Románico en el Camino de Santiago
- Monasterio de Leyre: cripta y portada, origen del románico navarro.
- Santa María de Eunate: planta octogonal y claustro exterior de arcos.
- Santo Sepulcro de Torres del Río: planta octogonal y bóveda de nervios.
- San Miguel de Estella y Santa María la Real de Sangüesa: portadas llenas de figuras talladas.
- Puente la Reina: el puente románico del Camino.

### Producto local con sello de calidad
- DOP: Queso Roncal, Queso Idiazabal, Pimiento del Piquillo de Lodosa, Aceite de Navarra.
- IGP: Alcachofa de Tudela, Espárrago de Navarra, Ternera de Navarra, Cordero de Navarra.
- Indicación geográfica de bebida espirituosa: Pacharán Navarro.

## 4. Propuestas (orden de prioridad)

1. **Leer el dintel (atalburu)**: en casas del norte, descifrar el año y los nombres grabados. Enseña números romanos o
   la fecha y por qué la casa da nombre a la familia.
2. **Eguzkilore en las puertas**: encontrarlos en el pueblo. Carta de tradiciones con su leyenda.
3. **Leer una portada románica**: en Leyre, Sangüesa o Estella, señalar arquivoltas, capiteles, tímpano y crismón.
   Mismo formato que los escudos: primero ver, luego leer, luego entender.
4. **Marcas de cantero**: buscarlas en la iglesia del pueblo. Une arquitectura y oficios.
5. **Mapa de sellos de calidad**: en el mapa de Navarra, cada DOP o IGP en su zona, ligado a sus tiendas.
6. **Pestaña «Saberes» en el cuaderno**: cartas agrupadas por saber, con la frase que se aprendió.

## 5. Criterios

- Escudos del juego inventados con reglas de heráldica. No se atribuyen a familias, linajes ni casas reales.
- Nombres de casa descriptivos y comunes (Etxeberria, Elizaldea…), sin ligarlos a ningún linaje.
- Datos solo de fuentes oficiales o académicas.

## 6. Fuentes

- Cátedra de Patrimonio y Arte Navarro, Universidad de Navarra: casas barrocas de Baztán.
- blason.es: armas de Navarra.
- Wikipedia (Baztán, Santa María de Eunate) y fotw.info (bandera y escudo de Baztán).
- Heraldry of the World (heraldry-wiki.com): blasones municipales de Navarra.
- Ayuntamientos de Pamplona (Privilegio de la Unión, 1423), Sangüesa, Irurtzun y Lumbier; Auñamendi; Gran Enciclopedia de Navarra.
- BOE y Mercasa: pliegos y fichas de las DOP e IGP de Navarra.
- Noticias de Navarra y Dialnet: románico navarro.
- Buber's Basque Page y repertorios de vivienda tradicional: atalburu y eguzkilore.
