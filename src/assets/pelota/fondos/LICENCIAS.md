# Imágenes de las cartas del menú de pelota

Quince imágenes hechas para el juego con Higgsfield (modelo gpt_image_2_6) la noche del 17 de noviembre de 2026. Cada
una es la foto de un frontón que existe, calcada tal cual: la misma cámara, las mismas paredes, rayas, chapas, gradas y
casas. Solo se ha quitado la publicidad, las letras y la gente que salía, y se ha puesto dentro a uno de los pelotaris
del autor (src/assets/pelotaris, sus ilustraciones) con los brazos cruzados (la postura A que eligió el autor), al tamaño
que tendría un chico de doce años en ese sitio y con la luz de la foto. La del Invierno lleva además una capa fina de
nieve.

El 18 de noviembre de 2026 se regeneraron las quince a 2048 px con el mismo modelo, cada una con su imagen aprobada como
referencia y la orden de repetirla tal cual (misma cámara, mismo frontón, mismo pelotari en el mismo sitio y postura),
porque en una pantalla de ordenador la de 896 px se veía borrosa en el carrusel de campeonatos; el autor: «no me vale que
apañes las imágenes. Si hace falta, genéralas de nuevo». Aquí van en tres tamaños, los tres de esa imagen de 2048 px y
en WebP: en esta carpeta a 896 px (la que se carga al abrir), en `media/` a 1280 px y en `hd/` a 2048 px (las pide el
carrusel solo para la portada de delante, ver `src/game/carrusel3d.js`). Las de 896 px de antes están en el historial
del repositorio (commit `dfaa214c` y anteriores). `mano.webp` sale de la versión recompuesta que quedó en el juego y
`cuatro.webp`, de la del pelotari grande (commit `dfaa214c`).

El 19 de noviembre de 2026 se ampliaron por abajo diez de ellas (`camara`, `coleccion`, `comarcas`, `fiestas`,
`frontones`, `gran`, `parejas`, `retos`, `trinquete` y `valles`): la figura tenía los pies pegados al borde de abajo y en
la carta del carrusel el nombre le tapaba las piernas (el autor: «los personajes no están cerrados en las cards»). Con
Higgsfield (gpt_image_2_6, con cada imagen aprobada de referencia) se pintó el suelo que sigue hacia la cámara, y encima
va la imagen de siempre, tal cual, píxel a píxel: ahora miden 2048 × 2560 (y 1280 × 1600 y 896 × 1120). Las cuadradas
de antes están en el historial del repositorio.

El autor pidió el 17 de noviembre que fueran «frontones reales», calcados «centímetro a centímetro» de fotografías, y
que para las portadas hubiera «frontones grandes, frontones cubiertos»; dijo «me valen el Ogueta y el Beotibar». El
Ogueta está en Vitoria y el Beotibar en Tolosa. Las dos fotos del Navarra Arena que mandó no tienen licencia libre y no
se han usado.

Como las imágenes salen de las fotos, llevan el crédito de cada autor y las que vienen de una foto CC BY-SA se comparten
con esa misma licencia.

| Imagen | Carta | Frontón | Foto | Autor | Licencia | Pelotari |
|---|---|---|---|---|---|---|
| `mano.webp` | Manomanista | Ogueta, Vitoria | [Ogeta pilotalekua 2.jpg](https://commons.wikimedia.org/wiki/File:Ogeta_pilotalekua_2.jpg) | Assar | CC BY-SA 3.0 | Iñigo |
| `gran.webp` | Gran Txapela | Ogueta, Vitoria | [Ogeta pilotalekua 1.jpg](https://commons.wikimedia.org/wiki/File:Ogeta_pilotalekua_1.jpg) | Assar | CC BY-SA 3.0 | Garazi |
| `parejas.webp` | Parejas | Beotibar, Tolosa | [Beotibar pilotalekua, 2014-12-26 (1).JPG](https://commons.wikimedia.org/wiki/File:Beotibar_pilotalekua,_2014-12-26_(1).JPG) | Xabier Armendaritz | CC BY-SA 4.0 | Mikel y Amaia |
| `cuatro.webp` | Cuatro y medio | Ogueta, Vitoria | [Vitoria - Frontón Ogueta 06.jpg](https://commons.wikimedia.org/wiki/File:Vitoria_-_Front%C3%B3n_Ogueta_06.jpg) | Zarateman | CC0 | Nahia |
| `trinquete.webp` | Trinquete | Trinquete de Elizondo | [Elizondo trinquete.jpg](https://commons.wikimedia.org/wiki/File:Elizondo_trinquete.jpg) | JMSE | CC BY-SA 3.0 | Unai |
| `comarcas.webp` | Comarcas | Nazar | [Nazar - Frontón 01.jpg](https://commons.wikimedia.org/wiki/File:Nazar_-_Front%C3%B3n_01.jpg) | Basotxerri | CC BY-SA 4.0 | Ander |
| `fiestas.webp` | Fiestas | Genevilla | [Frontón, Genevilla.jpg](https://commons.wikimedia.org/wiki/File:Front%C3%B3n,_Genevilla.jpg) | Mentxuwiki | CC BY-SA 4.0 | Irati |
| `valles.webp` | Valles | Igal | [Igal - Frontón.jpg](https://commons.wikimedia.org/wiki/File:Igal_-_Front%C3%B3n.jpg) | Jialxv | CC BY-SA 4.0 | Xabier |
| `invierno.webp` | Invierno | Roncal, con nieve | [Roncal fronton.jpg](https://commons.wikimedia.org/wiki/File:Roncal_fronton.jpg) | Ardo Beltz | CC BY-SA 3.0 | Leire |
| `promesas.webp` | Promesas | Marañón | [Frontón de Marañón.jpg](https://commons.wikimedia.org/wiki/File:Front%C3%B3n_de_Mara%C3%B1%C3%B3n.jpg) | Mentxuwiki | CC BY-SA 4.0 | Ane |
| `libre.webp` | Partido libre | Areso | [Areso - Frontón 01.jpg](https://commons.wikimedia.org/wiki/File:Areso_-_Front%C3%B3n_01.jpg) | Basotxerri | CC BY-SA 4.0 | Jokin |
| `frontones.webp` | Frontones | Mendaza | [Frontón de Mendaza.jpg](https://commons.wikimedia.org/wiki/File:Front%C3%B3n_de_Mendaza.jpg) | Mentxuwiki | CC BY-SA 4.0 | Maialen |
| `retos.webp` | Retos | Mirafuentes | [Mirafuentes - Frontón 01.jpg](https://commons.wikimedia.org/wiki/File:Mirafuentes_-_Front%C3%B3n_01.jpg) | Basotxerri | CC BY-SA 4.0 | Ekaitz |
| `camara.webp` | Pelota en casa | Fontellas | [Fontellas - Frontón 1.jpg](https://commons.wikimedia.org/wiki/File:Fontellas_-_Front%C3%B3n_1.jpg) | Zarateman | CC0 | Oihana |
| `coleccion.webp` | Pelotaris | Urroz de Santesteban | [Urroz de Santesteban - Frontón 01.jpg](https://commons.wikimedia.org/wiki/File:Urroz_de_Santesteban_-_Front%C3%B3n_01.jpg) | Basotxerri | CC BY-SA 4.0 | Amaia |

Las del 16 de noviembre, dibujadas en el estilo del juego, están en entrega/pelota-fondos-dibujados-16nov; las de antes,
sin pelotari, en entrega/pelota-fondos-anteriores. En entrega/pelota-fondos-reales-17nov/alternativas quedan otras
versiones con el pelotari más grande, por si el autor las prefiere.
