# HERRIZHERRI · Arquitectura del código

El juego se llama Herrizherri desde el 2026-10-13 (antes, Herrizherri). Solo cambia el nombre que se ve: las claves
de guardado (`herrizherri-…`), la caché, los nombres de archivo y el repositorio siguen como estaban, así nadie pierde
su progreso.

Este documento recoge las bases del proyecto: qué hace cada parte y cómo se relacionan. Hay que mantenerlo al día
cuando cambie la estructura. Las copias de seguridad son ramas de git `copia-AAAA-MM-DD` (el proxy no deja subir etiquetas).

## Pila

- **Three.js r180** (WebGL2) y **Vite** con `vite-plugin-singlefile`: el juego entero sale en un solo
  `dist/index.html` (modelos, texturas y sonidos incrustados). Se copia a `docs/` (GitHub Pages) y a
  `HERRIZHERRI-jugar.html` para entregarlo.
- **Sin servidor:** el progreso se guarda en `localStorage` (`herrizherri-perfil-v1`, en `src/game/profile.js`).
- **Modelos y animaciones:**
  - Personajes KayKit (CC0).
  - **Dos estilos de pelotari, a elegir** (17 de noviembre de 2026, el autor: «mantener todos los personajes pelotaris y
    que el usuario pueda elegir entre el antiguo, el que es como el explorador, y estos nuevos»). Los de siempre
    (`pelotari`, `pelotari_rojo` y la chica de `actors/chicas.js`) se quedan; los nuevos, un chico y una chica de 19-20
    años con el estilo de las portadas (`entrega/pelotaris-nuevos`), van en cuatro archivos, uno por camiseta:
    `pelotari_nuevo`, `pelotari_nuevo_rojo`, `pelotari_nueva` y `pelotari_nueva_azul`, con los clips con los mismos
    nombres que el de siempre. Las chicas son tres, con otra cara y otro peinado (rizos con coleta, trenza pegada y
    melena corta: `pelotari_nueva`, `pelotari_nueva2`, `pelotari_nueva3`); cada pelotari sale siempre con la misma,
    según su nombre. Al chico se le cambia el color del pelo. `src/pelota/estiloPelotari.js` decide cuál sale; el ajuste «Pelotaris de los partidos»
    (Ajustes) vale para ti y los rivales y solo aparece cuando hay algún archivo nuevo. Si falta el de un color, sale
    el de siempre.
  - **Seis seres y figuras de Meshy** (17 de noviembre de 2026, de los bocetos que aprobó el autor): la lamia y el
    Basajaun (con un pie de persona y una pezuña), el Bobo y el Zarratrako de Otsagabia, el joaldun de Ituren y el
    momotxorro de Altsasu. Hechos por la API de Meshy con la mejor calidad (image_to_3d con meshy-7.1, textura de 4K,
    50 000 triángulos; meshy_rig y meshy_animate: andar, correr, estar de pie y charlar; 41 créditos cada uno) y
    juntados con `tools/meshy-rig-vecino.mjs`, que pone a los huesos los nombres de Mixamo (el esqueleto de la API los
    llama Hips, Spine02, Spine01, Spine, neck...) y a las animaciones los que entiende `vecinos-glb.mjs`. Después, como
    los vecinos: `vecinos-glb`, `meshy-lod` (con `FUENTE=src/assets/meshy/vecinos`), `meshy-costuras`, `vecinos-cerca` y
    el busto (`CABEZA=1 SOLO=bust`). El autor los vio en la página de elecciones antes de meterlos. En `npcGlb.js` son
    VECINOS con edad «leyenda» (nadie de la calle la tiene) y `ser`: `buildNpc` usa su modelo cuando el aspecto lleva
    `myth` y el pueblo lo ha cargado; `vecinosDelPueblo` los carga solo donde salen: en Otsagabia los cuatro de
    `game/npcs.js` (`SERES_DE`), y en los demás pueblos las figuras de sus misiones de carnaval (`type: 'carnival'`,
    las de `FOLK` en `townLeyendas.js`). Alturas, con el gorro, la cesta o los cuernos: lamia 1,84 m, Bobo 1,9, Zarratrako
    2,15, momotxorro 2,15, joaldun 2,25 y Basajaun 2,5. El autor vio al joaldun «tan pequeño» y pidió que fuera «del mismo
    tamaño que un personaje adulto del juego»: con 2,05 su gorro de cintas se comía casi un sexto del alto y su cabeza es
    más pequeña que la de los vecinos, así que la cara le quedaba 15 cm por debajo de la de un adulto. Con 2,25 queda a la
    par (el Zarratrako, por su gorro, pasa de 2,05 a 2,15). Comparación en fila, con rayas cada 50 cm:
    `entrega/personajes/tamanos-seres-antes.png` y `-despues.png`. La versión ligera no baja de unos 13 000 triángulos en el Bobo y de 24 000 a 40 000 en los demás: con
    50 000 triángulos y la textura en muchas islas, sus costuras no dejan simplificar más (antes, la lamia ligera tenía
    unos 12 000). De 0,5 a 1,7 MB cada uno. Si pesan en el iPhone, Meshy puede rehacer la malla más ligera antes del
    esqueleto (remesh, 5 créditos más por personaje y repetir el esqueleto y los movimientos).
  - Vecinos de Meshy (modelos del autor del juego, 12 de noviembre de 2026): 21 personajes que son toda la gente normal de
    los pueblos: abuelos con txapela (`abuelo_bigote`, `abuelo_barba`, `abuela_trenzas`,
    `abuela_mono`), abuelos sin ella (`abuelo`, `abuela_panuelo`), niños (`nino_moreno`, `nino_rubio`, `nina_pelirroja`,
    `nina_trenzas`), adultos (`hombre`, `mujer`, `joven_rubia`) y oficios en hombre y mujer (carpintero, quesero, panadero
    y campesino). Cada uno con su ropa y su pelo, sin teñir. Salen de los GLB de Meshy con todas sus animaciones y el
    esqueleto de Mixamo con `tools/vecinos-glb.mjs`: los nombres cortos (Walk, Run, Alert, Chat, WalkW, Attack, Sit,
    WaveH), la cadera de cada animación en el sitio de la de andar (la de charlar empezaba 30 cm a un lado) y, a quien le
    falta estar de pie o charlar, la de otro vecino, hueso a hueso y con la cadera a su altura (`--de`). Luego, como los
    demás, `meshy-lod` y `meshy-costuras` (con `FUENTE`). El juego solo lleva la versión ligera (`src/assets/meshy/lod`:
    unos 5 500 triángulos y textura de 512 px, 8 MB los 21); los originales, en `src/assets/meshy/vecinos`, no entran en
    la web ni en el archivo único (17 MB) y solo los sirve el servidor de desarrollo, para los retratos. Sus gestos (`cortesVecino` de `glbChar.js`): quietos, mirando alrededor; hablando, su charla;
    saludar, el principio de la charla o su saludo con la mano; asustarse, el respingo de mirar alrededor. La charla de
    Meshy dobla la cabeza hacia atrás y encoge a la abuela del pañuelo y al abuelo: esos dos (`CHARLA_MAL`) hablan con su
    reposo. Y la charla de todos, más tranquila (`calmaClip`, 16 de noviembre de 2026: «a veces los personajes se
    balancean demasiado al hablar»): al cargar el clip, cada hueso se acerca a su postura media, el cuerpo, la cadera y la
    cabeza al 40 % de su vaivén y los brazos al 80 %; también la del pastor y la del explorador. Miden su altura fija en `MESHY_H`: el explorador (1,45) y la exploradora (1,43), de cabeza grande, quedan en
    medio: los adultos les sacan entre un 23 y un 34 % (1,78 a 1,94; los mayores, 1,71 a 1,84) y los niños del pueblo son
    más bajos (1,13 a 1,24). Las puertas miden 2,4 m.
    Quién es quién (`VECINOS` y `vecinoPara` de `actors/npcGlb.js`): por su oficio en el nombre («Iker, quesero»); si no,
    por edad y sexo, y entre esos el que más se le parece (barba, bigote, trenzas, moño, color de pelo), siempre el mismo
    para cada aspecto. Los de antes (el sanferminero, el pastor y los futbolistas teñidos) se quedan solo para los trajes:
    el carnaval, los seres de leyenda, los jueces del frontón y la ropa blanca de fiesta de quien la lleva por su papel
    (dantzaris, aizkolaris, el encierro). Cada pueblo carga solo los suyos (`preloadNpcs(d)`, con los datos del pueblo):
    los que dan sus misiones y hablan en él, los seis mayores, los cuatro niños y tres adultos de cada sexo para la gente
    de la calle y el campesino para el pastor; fuera de los pueblos, ninguno. Entre los que valen igual, cada modelo cuenta
    algo menos cada vez que ya ha salido (`vecinoPara`, `reparte`), para que no se repitan las caras. En las charlas, su
    retrato de busto (`retratoVecino`; `tools/meshy-retratos.mjs` con `CABEZA=1`, encuadrado en su cabeza).
    - Pelo de colores (`peloDe`, `tonosDe` y `TONOS` de `npcGlb.js`; `peloVecino` de `actors/hairColor.js`): la máscara del
      pelo de cada modelo va en el alfa de su textura (255 sin pelo, 128 todo pelo), en la ligera y en la de cerca
      (`tools/vecinos-pelo.mjs`, con `actors/peloVecinos.json`: el brillo y el color típicos del pelo de cada modelo). El
      color nuevo es el pintado en otro vecino (el rubio de la joven rubia…). El vecino teñido lleva material propio; sus
      retratos con cada color, en `src/assets/meshy/portraits/pelo` (`tools/vecinos-retratos-pelo.mjs`).
    - Nítidos de cerca (`actors/vecinoCerca.js`): por la calle, textura de 512 px; los modelos de los vecinos a menos de
      9 m llevan la de 1024 (`src/assets/meshy/cerca`, `tools/vecinos-cerca.mjs`), como mucho tres a la vez (uno en el
      móvil), y la sueltan al alejarse o al salir del pueblo (`sueltaCerca`). Desde el 17 de noviembre de 2026 también en
      Otsagabia (`update` de `game/game.js`, cada medio segundo; `sueltaCerca` al salir, en `exit` de `main.js`): allí no
      se llamaba y de cerca todos sus vecinos, la lamia y el Basajaun también, se veían con la ligera. La lamia y el
      Basajaun tienen ya su textura de cerca, que les faltaba.
    - Y el que habla contigo, con todos sus triángulos (`vecinoNitido`, 16 de noviembre de 2026: «los personajes tienen
      muy mala calidad. Me he dado cuenta al ampliar la imagen la cámara en las conversaciones»). Mientras dura la charla,
      su malla ligera se cambia por la completa del mismo modelo (Maite, de 6.720 a 14.598 triángulos), si los huesos son
      los mismos y en el mismo orden; material, textura de cerca y pelo teñido no cambian, y al acabar vuelve la ligera.
      Los completos (`src/assets/meshy/vecinos`, 18 MB los 21) van solo en la web (`@vecinos-full` en `vite.config.js`;
      en el archivo único, una carpeta vacía) y se bajan la primera vez que hablas con uno de ese modelo. Desde el 17 de
      noviembre de 2026 («las figuras de Meshy, lo mejor posible, la mayor definición posible»), fuera del móvil, mientras
      dura la charla ese modelo lleva además su textura original, la de 2048 px que trae su malla completa (`ponHD` y
      `quitaHD`), y al acabar vuelve la de cerca, o la ligera, y la de 2048 se suelta de la tarjeta. Medido con la lamia:
      512 px lejos, 2048 hablando y 1024 al acabar, a dos metros. En el móvil su textura se suelta al cargarlos y se queda
      la de cerca, de 1024: una de 2048 de más ya dejó sin memoria al iPhone (`FULL_CHICA` en `actors/glbChar.js`). Mejorarlos con Meshy (más detalle en la cara y la ropa) queda pendiente: este entorno no tiene
      la clave ni acceso a su servidor.
    - La calle (`game/rutinas.js`, `townGame.spawn`): 18 vecinos, 24 en las ciudades (12 y 16 en el móvil); casi la
      mitad son niños, que juegan a pillar en la plaza o echan carreras de puerta en puerta (`carrera`). Los niños pasan a
      su clip de correr antes que los mayores y al ritmo de sus piernas (`buildVecino`).
  - Personajes de Meshy (modelos del autor del juego), en `src/assets/meshy`. El explorador (`explorador.glb`) es el
    personaje del jugador. La exploradora (`exploradora.glb`) está hecha pero de momento no se elige: le faltan cinco
    animaciones para tener todos los gestos de él, y en `data/cast.js` lleva `solo: false` (con `solo: true` vuelve a
    salir el selector de chico o chica). Cuando estaba (noviembre de 2026):
    se elegía chico o chica en la bienvenida y se cambiaba en
    el Perfil («Cambiar personaje»), y en los pueblos y las misiones siempre era uno de los dos (
    `CAST` de `data/cast.js` solo los tiene a ellos; con dos, el selector de `hub.js` enseña dos botones de pastilla
    con su retrato, `.cs-dos`, en su propia fila: al lado de la figura y, en el móvil de pie, justo debajo de ella,
    antes del nombre y de empezar; un guardado con otro personaje pasa al explorador). En el frontón se pone de pelotari,
    en El Sadar de futbolista y en el encierro de sanferminero (ella, de sanferminera: `avatarIsGirl`, marca `ella` en
    `GLB_AVATARS`), como antes. Su GLB sale de los archivos de Meshy con `tools/explorador-glb.mjs` (el nombre del
    archivo de salida da el del material): los huesos con nombre de Mixamo y solo el color, a 2048 px. Él trae ocho
    animaciones (andar, correr, correr 2, andar agachado, saltar un obstáculo, respirar y mirar alrededor, hablar y
    recoger algo) y ella nueve distintas (andar, correr, andar tranquila, andar con las manos juntas, agacharse a tocar
    el suelo, la mano en alto, una pirueta, una pataleta y sentada): solo andar y correr son las mismas. Los gestos que
    usa el juego (quieto, hablar, saludar, celebrar, el salto, asustarse, recoger, golpear) salen en cada uno de sus
    propias animaciones (`MESHY_BY` de `glbChar.js`); el salto de ella se monta con el impulso de la mano en alto y la
    rodilla arriba de la pataleta. Ella tiene 15 809 triángulos (él, 51 670) y mide 1,43 m (él, 1,45). Los
    demás (sanferminero, pastor, futbolista de Osasuna y pelotari, y las chicas) siguen para sus usos y sus fichas, y
    los del partido (pelotari colorado, segunda equipación de Osasuna).
    Cada modelo tiene una altura fija (`MESHY_H`) y se carga una sola vez; el pastor también hace de pastor del pueblo.
    Meshy reparte la textura en unas dos mil piezas muy pequeñas (la mediana, de tres triángulos); lo que quedaba entre
    pieza y pieza, restos de otros colores, se colaba en los bordes y al alejarse (motas rojizas en el pelo, claras en la
    camiseta). `tools/meshy-costuras.mjs` rellena lo de fuera de cada pieza con el color de su propio borde y guarda la
    textura en WebP con el color a resolución completa en los bordes, también en sus versiones de 1024 px y ligera (solo
    la imagen: la malla no se toca, que las chicas casan sus parches con el orden de sus vértices). Rehacer el reparto
    en piezas grandes (xatlas) rompería esos parches; fundir el color a cada lado de las costuras dejaba cortes nuevos.
    Al dibujarlos, `sharpMap` (`engine/charLight.js`) lee la textura sin mezclar piezas vecinas: la UV en el centro de
    lo que cubre cada triángulo (con el suavizado de bordes del móvil, los píxeles del borde leían la pieza de al lado:
    puntitos claros en fila en el pelo y la camiseta de los pelotaris) y nunca por debajo de 512 px de lejos. Va en el
    material de cada modelo y otra vez en cada copia teñida (`hairTint`, `outfitTint`, las chicas y las equipaciones
    del fútbol), que al copiar un material se pierde su sombreador.
  - Animales y comida de Quaternius (CC0).
  - Protagonistas y piezas hechas en Blender 4.2 con scripts en `tools/blender/`.
  - Todo se prepara con `@gltf-transform`.

## Arranque

`src/main.js`:

1. Carga el perfil.
2. Precarga los vecinos, los animales y la comida.
3. Abre el centro de mando (`src/hub`).
4. Al elegir pueblo, `Runtime.load(def)` monta el mundo y crea `TownGame` (o `Game` para Salazar).
5. Antes de quitar la pantalla de carga: la aventura del pueblo (`montaAventura`), una segunda compilación con todo
   ya creado (`rt.precompile`) y un dibujo de verdad del pueblo, aún tapado, con la cámara ya en su sitio
   (`rt.dibujoTapado`, por el mismo camino que el bucle, con el postprocesado si lo hay). Compilar no basta: el primer
   dibujo de cada material termina de enlazar su programa y sube sus mallas a la tarjeta gráfica, y eso, en el primer
   fotograma de juego, era el parón de un segundo que se veía en los informes del iPhone nada más llegar. En el
   navegador de pruebas ese primer dibujo tarda unos 14 s, ahora con la carga delante.

## Capas

| Carpeta | Qué contiene |
|---|---|
| `src/engine/runtime.js` | Bucle principal: renderizador, cámara, terreno, cielo, tiempo (lluvia y nieve), agua, fauna, partículas, sonido, ambiente musical, precompilación de sombreadores y LOD |
| `src/camera.js` | La cámara en tercera persona (`FollowCamera`): órbita, zoom, seguimiento detrás del jugador y choque con las casas. Se pone detrás sola solo cuando se va hacia delante (con la palanca de lado, el caballo daba vueltas sin parar: al ponerse detrás, «ese lado» cambiaba) y su altura vuelve a la de siempre al moverse; mira como mucho 0,95 rad hacia abajo. Cuando el jugador cambia de sitio de golpe, al subir o bajar de la montura, `suaviza` hace que la cámara llegue en unas décimas en vez de saltar con él (al subir al caballo saltaba 2 m en un fotograma y parpadeaba). Mira por tres caminos, el del centro y dos que se abren medio metro a cada lado junto a la cámara, y por donde estará dentro de un cuarto de segundo si se sigue girando; se acerca con un muelle (más suave cuanto más lejos va, como a caballo) y no vuelve a alejarse hasta que el hueco lleva libre medio segundo. Antes, a caballo, al girar junto a las casas se metía 3,6 m en 0,17 s y volvía a salir: la imagen parpadeaba. En las charlas con los vecinos (el autor: «Cuando hablemos con los vecinos la cámara se acerca a los personajes»), `charla(vecino, jugador)` pone un plano de los dos, desde detrás y a un lado del explorador y a la altura de la cara del vecino. Desde el 18 de noviembre, lejos (el autor, en el ordenador: «los personajes pierden muchísima calidad cuando se acerca mucho la cámara en una conversación con el explorador. No acerques tanto la cámara»): estaba a 1,5 m del explorador con el objetivo cerrado al 72 %, y su cabeza y su hombro llenaban media pantalla; ahora, a 3,2 m en el ordenador y a 2,6 m en el móvil, bien abierta a un lado (1,9 m y 1,55 m) para que la cabeza del explorador no tape al vecino, con el objetivo al 86 % y al 80 %, el explorador sale de espaldas a un lado, casi entero, y el vecino de frente y entero, por encima del cuadro de la charla. Prueba seis sitios, a los dos lados y cada vez algo más cerca (nunca a menos de 2 m en el ordenador y 1,6 m en el móvil), y se queda con el primero que no cae en una casa ni tiene nada entre la cámara y ninguno de los dos (`despejado`); si ninguno vale, la cámara no cambia. La llaman los `say` de Ochagavía (`game.js`) y de los demás pueblos (`townCharla.js`); varias charlas seguidas con el mismo vecino son un solo plano, porque `finCharla` espera un cuarto de segundo, y la vuelta al plano de siempre dura 0,7 s con curva suave. Si el jugador se aleja más de 1,2 m o entra otro plano de cine, se acaba; con «reducir movimiento», entra y sale de corte |
| `src/world/` | Mundo: relieve (`heightfield`, `terrain`), trazado del pueblo (`layout`, `townBuilder`, `houses`, `monuments`, `landmarks`, `civic`, `pamplona*`), naturaleza (`nature`, `agro`, `water`), materiales y texturas (`builder`, `textures`), cielo y luna (`sky`), tiempo (`weather`), productos 3D del mercado (`products3d`) y colisiones (`colliders`) |
| `src/levels/townReal.js`, `src/world/townReal.js` y `src/data/reales/` | Pueblos con su trazado de verdad. Si hay `src/data/reales/<id>.json` (de `tools/pueblo-real.py` + `tools/pueblo-real-juego.py`), `engine/runtime.js` lo carga y `createRealTownLevel` da la misma interfaz que el generador (`levels/town.js`): relieve EU-DEM con interpolación cúbica (rejilla de 20 m en el pueblo y de 60 m hasta 1,5 km para el anillo de montes), ríos como polilíneas con el nivel bajando con la corriente (`RIVERS` con `pts`, que `world/water.js` dibuja como cinta; `rx` vale 9999 y las truchas usan `riverPointNear`), calles de los datos en `PATHS`, plazas de verdad (`plazaMask`), campos de los usos del suelo y lugares de las misiones buscados en sitios libres y llanos. Los monumentos de la ficha van sobre su edificio real si lo hay (por su nombre), si no en el lugar con nombre de monumento de los datos (el castillo de Cortes, el cerco de Artajona) y, si tampoco, en su sitio lógico (orilla, lo más alto, junto a la iglesia); la muralla en anillo quita las casas que cruza. En los pueblos sin plaza en los datos, el centro es el hueco libre más cercano al ayuntamiento o a la iglesia. Antes de levantar nada, `levels/ordenar.js` pone orden: las filas de casas adosadas y las manzanas que los datos traen como un solo contorno se parten en casas de unos 9 m de fachada (las manzanas con patio, solo en los cascos de la Zona Media, la Ribera y las ciudades, y solo por los lados que dan a una calle); las casas junto a una calle se alinean con ella si casi lo están; cada una se recorta lo justo para dejar libres la calle, el puente, el río con su orilla y la plaza (si casi no queda, no se levanta); dos que se pisan quedan pared con pared; y la puerta va a la fachada con sitio delante que da a la calle o a la plaza. Los puentes que cruzan agua se alargan hasta tierra firme y, donde una calle cruza el agua sin puente, se pone uno. En el casco, el cauce se estrecha donde una calle va por la orilla y se cubre donde la calle va encima. La iglesia, el ayuntamiento, el frontón y las casas de los monumentos no se tocan. `townBuilder.js` levanta las casas de los datos (`realHouses`: rectángulo con la fachada a su calle y su altura; con todo el detalle solo las más cercanas, 80/120/160 según la calidad, y el resto como bloque con tejado), los puentes (`realBridges`: tablero con lomo que nunca se hunde en el terreno, de lomo de asno en los de piedra de siempre; debajo, los muros hasta el suelo con tantos arcos como quepan, cada uno con su bóveda, y tajamares en las pilas del agua; suelo pisable por `addPlatform`) y nada más en el cauce: el río va por un cauce de tierra, sin muros, con la orilla en talud (`finalHeight`; en el casco, un talud corto que baja desde 1,8 m fuera del agua hasta 1,2 m dentro, que la rejilla del suelo de 2 m dibuja como una ladera de hierba o tierra, y fuera del casco, más ancho cuanto más alta quede la ladera). La cinta del agua (`world/water.js`) toma el ancho del cauce donde se estrecha (`hv`) y llega 1 m más allá de la orilla: con el ancho del río entero, en un cauce de 1 m medía hasta 4,6 m a cada lado y asomaba fuera de él. Hasta el 13 de noviembre de 2026 el cauce del casco iba entre muros de piedra con albardilla (`realRiverWalls`) que tapaban un escalón recto del terreno; el autor no los quería («que el río tenga un cauce normal, como tendría cualquier pueblo»). Para revisar los puentes, la cámara de prueba tiene que llamar a `terrain.update` con su propia posición: si no, lejos del jugador se ve el suelo de lejos, con rejilla de 10 m, que tapa los cauces estrechos y parece que el puente cruza suelo seco. La plaza y lo que la rodea, hasta 8 m y fundiéndose hasta 14, también son casco (`villageMask` con `aPlaza`), aunque al lado no haya casas: en Roncal la plaza da al Esca y el río no llevaba muro sino un talud de roca de unos 7 m que se comía el borde de la plaza, con la fuente al filo y un puesto del mercado en la cuesta (noviembre de 2026). La fuente del centro de la plaza tiene el pie del todo llano, al nivel de la plaza en la que está (`FUENTE_H` en `plazaLlana`; la plaza conserva algo de su cuesta de verdad y en las de ladera la pila quedaba medio enterrada: en Amaiur, 77 cm). Si el centro de los datos no cae dentro de ninguna plaza (`PL_DENTRO`), alrededor de él se hace una plaza redonda de hasta 14 m (`PLR`): en Amaiur la fuente iba en mitad de una cuesta, fuera de su única plaza. El empedrado de la plaza acaba antes del talud del río (`plazaMask`, desde 2 m de la orilla): en Roncal la plaza de los datos llega hasta el agua. El frontón va donde el real si los datos lo traen. Los JSON van en formato compacto (versión 2: líneas como diferencias entre puntos, relieve por predicción, casas como listas; unos 17 KB comprimidos por pueblo) y `data/reales/compacto.js` los devuelve a la forma de siempre al cargarlos. Con `?real=0` se juega el generado. Atribución de OpenStreetMap (ODbL) y EU-DEM en la ficha del pueblo y en `src/data/reales/LICENCIA.txt` |
| `src/world/relieve.js`, `src/data/relieve.js` y `src/world/panorama.js` | El relieve de verdad: desde cada uno de los 12 miradores, lo más alto que se ve en cada rumbo hasta cada distancia (diez «términos», de 300 m a 115 km), la silueta fina de cada monte de la misión con su cumbre a la altitud real, los montes que de verdad se ven desde allí, y el horizonte real de los 31 pueblos (grado a grado, más allá de 2,5 km). Los calcula `tools/relieve/perfiles.py` con el relieve de SRTM y GMTED2010 (USGS, dominio público) y van comprimidos (unos 18 KB); `cargarRelieve` los abre una vez antes de levantar el pueblo. Con ellos, la vista de los prismáticos en el mirador es el paisaje real (`Panorama.buildReal`: cada punto en su rumbo, a su distancia y con su ángulo reales, colores por altitud y clima, bosque, parcelas, roca, nieve, relieve menudo y bruma por distancia) y los montes del borde del pueblo siguen el horizonte real (`skylineFor`). Sin los datos (navegador sin `DecompressionStream`), los montes hechos a mano de antes. Con el relieve de detalle (`world/miradorReal.js`, `PolarGrid`), los pueblos y ciudades a menos de 10 km llevan casas con volumen (`casas`, desde noviembre de 2026; antes solo estaban pintados en el suelo y se veían planos): manzanas con calles y patios, casas de 1 a 3 alturas con tejado a dos aguas e iglesia con torre en el centro, y en las ciudades bloques de 3 a 7 pisos con tejado bajo. Tres mallas repetidas (paredes, hastiales y tejados) con la misma bruma que el terreno; hasta 14.000 casas, 7.000 en calidad baja, empezando por los pueblos más cercanos, y una ciudad que no cabe entera lleva volumen solo cerca del ojo, sin pasar del 60 % de las casas. Nada a menos de 400 m del ojo. Bajo esos pueblos el suelo es de calles y patios (`aV3`); en los demás siguen los tejados pintados. Desde Ujué, unas 4.700 casas y 161.000 triángulos en calidad baja |
| `src/actors/` | Seres vivos: jugador (`player`), personajes GLB, KayKit y Meshy (`glbChar`: clips del juego recortados de los de cada modelo, `loadMeshy`), vecinos (`npcGlb`: cuerpo KayKit con traje de su comarca), chicas sobre los modelos de Meshy (`chicas`: ver abajo), pelo de otro color (`hairColor`: ver abajo), trajes de vecinos y público y seres de leyenda (`outfits`: `OUTFITS`, `MYTHS`), trajes de carnaval y de leyenda hechos como los de verdad (`trajes`: ver abajo), público en gradas (`crowd3d`: figuras 3D cocinadas cerca de la cámara y láminas de `crowdSprites` de lejos; sentado en tendidos y gradas), animales (`animals` + `animalGlb` con los modelos de Quaternius; `beasts` es la versión procedural de reserva), minifiguras antiguas (`minifig`) y equipo (`gear3d`) |
| `src/game/` | Reglas y misiones: `townGame` (misiones, interacción y pasos de cada pueblo), `game` (Salazar), minijuegos grandes (`encierro` + `encierroPlaza` + `encierroTex`, `futbol`, `fronton`), vida del pueblo (`tienda`, `mercado`, `mochila`, `perro`, `chase`, `crowd`), señales y objetos (`senales`, `items`), perfil (`profile`) y contenido (`content`) |
| `src/pelota/` | Motor de pelota a mano independiente: reglas, física, IA (cinco niveles en `rules.js`), HUD, cancha, fichas técnicas de los pelotaris (`ficha.js`: datos inventados que salen del nombre, cualidades y golpes), el frontón que juega (`courtFeel` en `rules.js` y `setFeel` en `physics.js`: a cubierto, piedra, mojado o Labrit), la pelota elegida (`BALLS` en `rules.js`: normal, viva, muerta, de mucho bote y de poco bote, que multiplican esa física) y la pantalla VS (`vs.js`). El golpe es siempre manual (`game.js`): sale al soltar el botón y cuenta el momento respecto al justo (`idealAt`, con lo que perdona cada nivel en `TOL`); antes del bote es volea y, alta y de volea, gancho: con la izquierda, girando hacia la derecha, a la contracancha (con la palanca a fondo a la izquierda, a la pared izquierda; el rival, casi siempre a la contracancha). La energía (`EN` y `shotEnergy`) baja sobre todo con las cortadas seguidas y al esprintar a por una dejada, algo con dos paredes y ganchos, y sube peloteando normal. La fuerza (lo que se mantiene el botón, `chargeLevel` en `match.js`, a tope en 1 s y la dejada en 1,3) se nota en todos los golpes (`strike`, 13 de noviembre de 2026: el autor no notaba la diferencia entre pulsar poco y a tope): sin azar, el golpe bota de 9,5 m con un toque a 24,5 m y, a tope, llega al rebote salvo con la palanca hacia abajo (antes, de 13 a 21 m, y el rebote pedía además la palanca arriba); la cortada sale de 30 a 48 m/s y bota de 10 a 24 m; la dejada, de 1 a 8 m del frontis, más alta y más rápida cuanto más cargada; el saque, de 16,8 a 22 m, siempre entre la falta y el pasa. Encima del botón que se carga sale el porcentaje y, a tope, «MÁX» con un golpe de luz y una vibración corta en el móvil; cansado, su tope en naranja (`charge` en `hud.js`, `.pel-pw`). Se mide con una simulación sin azar de cada golpe a 15, 40, 60, 80 y 100 %. La cámara dinámica opcional está en `match.js` (`camDyn`). Las simulaciones de los golpes (`landingOf` y la dos paredes en `physics.js`) solo guardan los eventos y paran al botar El saque, de un solo gesto, como en el frontón: mantienes GOLPE para elegir la fuerza (la palanca apunta) y, al soltar, el pelotari sale corriendo del 7, bota la pelota hacia el suelo sin frenar y el golpe sale solo en el 4, con esa fuerza y esa puntería; el rival saca igual. La pelota del bote va con el que saca, en su tiempo (`tempo`), y se bota antes cuanto más despacio va, para que el golpe caiga siempre en el 4 |
| `src/ui/camaraAR.js`, `src/ui/txalapartaAR.js`, `src/pelota/camaraCuerpo.js` y `public/ar/` | Los juegos con la cámara, solo en la web (`camaraDisponible`; los modelos no caben en los archivos únicos): MediaPipe Tasks Vision 0.10.21 de Google (Apache 2.0), en el propio aparato, la imagen no sale de él. `camaraAR.js` carga el motor una vez (`motorVision`). La txalaparta (Menú, Instrumentos, Txalaparta, «Con la cámara») sigue las manos con Hand Landmarker. La pelota en casa (Torneos, Pelota a mano, losa «Pelota en casa»; `camara: true` en `playPelota` y `PelotaMatch`) empieza detectando el cuerpo (`calibra` en `match.js`, `colocado` en `camaraCuerpo.js`: la ventana de la cámara grande arriba, lo que falta, ponte delante, échate atrás o que se vean las manos, y una barra que se llena mientras te ve bien colocado; «Empezar ya» para no esperar); durante el partido tu pelotari pone los brazos como los tuyos y se agacha contigo (`brazos` en `camaraCuerpo.js`, `st.cuerpo`, y `brazosCuerpo` en `actors/glbChar.js`, encima de la animación y antes de la mano a la pelota en el golpe); en primera persona, tus brazos se ven también en cuanto levantas una mano por encima de la cintura (`alza` en `primeraPersona.js`), no solo en el golpe; sigue el cuerpo con Pose Landmarker lite: la ventana arriba a la izquierda con tu imagen de espejo y tu esqueleto, solo hasta que te ve; tu sitio a lo ancho (respecto al del primer momento quieto) lleva a tu pelotari a ese lado de la cancha (`leeCuerpo` en `match.js`) y, cuando te toca, va solo a por la pelota y apuntas hacia donde estás; el armado (la mano hacia fuera, arriba o detrás) arma su brazo como el tuyo (`st.wind` y `st.arma`); el golpe es la mano que va deprisa hacia delante respecto a los hombros (de lado hacia dentro, hacia abajo el de aire, hacia arriba y dentro el sotamano; subir por el lado es armar; y hacia la pantalla, con la profundidad del detector muy suavizada y con poco peso, que tiene unas siete veces más ruido), y se lee entero (`gesto`). La mano se sigue aunque el detector dude (en lo más rápido del golpe sale movida o se sale de la imagen: la muñeca vale desde una visibilidad de 0,2 y, si no, se estima por el codo siguiendo el brazo); si falta un momento (hasta 0,3 s), al volver a verla cuenta lo que se ha movido en ese rato, y el golpe no se cierra hasta que falta 0,2 s (antes se daba por perdida, el golpe se cerraba a medias y al volver empezaba de cero: así no salían las dos paredes ni las cortadas de verdad). Empieza (`onGolpe`, el golpe sale ya, casi recto) cuando la mano va deprisa hacia delante o, aunque no se haya visto ir deprisa en ninguna imagen, cuando ha recorrido al menos 0,75 anchos de hombros hacia delante en el último medio segundo a buen ritmo (solo desde el golpe anterior); se va afinando mientras dura (`onGolpeAvance`) y se cierra al frenar dos imágenes seguidas (`onGolpeFin`, `lee`). Todo es relativo a cada jugador (medido en el entrenamiento de un pelotari de verdad, donde el golpe va muchísimo más deprisa que el armado y se espera ya agachado): `tipico` es lo deprisa que golpea de normal (la mediana de sus 12 últimos golpes sin las dejadas; de primeras, 6 anchos de hombros por segundo); el umbral es el 36 % de eso (al menos 2,6); si la otra mano va casi igual de deprisa (armar o equilibrarse), un 50 % más; justo después de un golpe, un 35 % más; y con la mano baja o encogido, mucho menos, salvo que la mano caiga (el brazo que vuelve a su sitio). Como lo describe el autor: la cortada, el brazo mucho más rápido que lo normal (un 30 % más, al menos 5,5; de arriba abajo, algo menos); el largo, un golpe entero mucho más lento (un 75 % de lo normal o menos, con al menos un ancho de recorrido) o que acaba hacia arriba; la dejada, la mano baja (a la altura de la cadera) y con poco recorrido (menos de 1,15 anchos), o encogido un poco más que la mediana de los últimos 3 s, y nunca más rápida que lo normal. Hacia dónde: con la derecha, el brazo de derecha a izquierda, a la pared; el que acaba muy a la izquierda (la mano a la altura del hombro izquierdo, -0,5 anchos, o más allá, o el codo pasado al otro lado del cuerpo), dos paredes; el que se va hacia la derecha al final o acaba con la mano separada del cuerpo, al ancho; con la izquierda, al revés y sin dos paredes. Cada golpe va al informe de la partida (`util/informe.js`, `window.__informeEvento`: tipo, cruce, codo, pico, típico, recorrido, altura de la mano, encogido, duración, imágenes, huecos e imágenes por segundo del detector) y cada muestra lleva `camHz`, `camVisto`, `camGolpes` y `camDetector`: para afinar con golpes de verdad. Muy cerca de la cámara (los hombros, más de un tercio del ancho, o la mano saliéndose de la imagen), avisa: «Échate un poco hacia atrás». La fuerza, por lo deprisa que va respecto a lo normal (`pot`). El nombre del golpe sale un momento arriba a la izquierda (`TEXT.shots`). La ventana con tu imagen y tu esqueleto solo sirve para colocarte: en cuanto te ve y te ha medido (2 s) se quita del todo (`oculta`; el vídeo sigue en la página, de 2 px y casi transparente, porque escondido del todo algunos navegadores dejan de darle imágenes) y vuelve si deja de verte; tocándola, se quita. Queda solo, un momento, el nombre del golpe. El detector va en un trabajador aparte (`public/ar/cuerpo-worker.js`, clásico, con la copia del paquete en `public/ar/vision_bundle.js`): la imagen, reducida a 320 de ancho y una a la vez, se salta si lleva un cuarto de segundo esperando; el partido no se para (medido: la imagen del partido tarda lo mismo que sin cámara; con el detector en la página tardaba un 45 % más y con picos de 1,5 s). Si no hay trabajador, en la página y como mucho 20 imágenes por segundo. En `game.js` (`camara`), el golpe dura 0,55 s y espera hasta 0,4 s a que el gesto se cierre (`camPend`) salvo que la pelota se vaya (`seVa`); el momento justo es el de cuando empezó el gesto, descuenta 0,1 s de retraso y perdona un 35 % más; en el saque, el gesto entero manda la fuerza, la puntería y si es cortado. Sin cámara o sin permiso, los botones de siempre; con teclas o palanca, mandan ellas. Pruebas: `window.__camaraCuerpo` (`estado()` y `pose(lms, t)`, que deja de leer la cámara) |
| `src/game/pelotaris.js` | Colección de pelotaris: uno por pueblo, su carta al jugar contra él y los demás con la figura del pelotari de su frontón y un candado, por comarcas |
| `src/futbol/` | Fútbol 11 y sala: motor del partido (`game.js`), reglas por formato (`rules.js`), partido en 3D (`match.js`) y marcador y mandos (`hud.js`). Cada jugador tiene forma (`fit`), que baja jugando y más esprintando, y la energía no pasa de ella; las faltas por detrás o en plancha pueden lesionar (leve: cojea un rato; grave: corre menos y no esprinta). Cambios: cinco en fútbol 11 y sin límite en sala; el pedido con el balón en juego se hace en la siguiente parada; el rival cambia solo a lesionados y cansados, y tu equipo también con «Cambios automáticos». A la tercera falta de un mismo jugador, amarilla. El portero sale a cortar los pases al hueco. En pantalla: la ficha de tu jugador (número, puesto, energía, forma perdida en rayas, tarjeta y lesión), el aviso de cambio bajo la pausa y la ventana «Cambios» con los dos equipos |
| `src/game/rutinas.js` | La tarea de cada vecino del pueblo (misa, compra, charla, jugar a pillar, fuente, pan, paseo): sus paradas, cuánto se queda en cada una, hacia dónde mira y qué hace; `Actor.arrive` las cumple |
| `src/hub/mapa3dAmplia.js` | La isla con sus montes enteros: el contorno crecido de una comarca donde su borde cae en monte, hasta el fondo del valle, y su relieve, el de verdad de alrededor, que baja al pie en la segunda mitad de lo que crece restando una rampa, sin aplanarse. Lo usa `mapa3d.js` al hacer la isla |
| `src/game/vozVecinos.js` | Las voces de los vecinos de Otsagabia (ElevenLabs): cada línea de una charla busca su grabación por el texto, sin el nombre de quien juega, en `assets/voz/vecinos/ochagavia/manifiesto.json`; la bajan solo al decirla, una cada vez, y en euskera no suena. `game.js`, `say`, la engancha a `ui.onDialogLine` y la calla al cerrar la charla. `narra`, con la voz de la narradora, dice los avisos, premios y cartas del cuaderno que tienen grabación (`ui.onVoz`) |
| `src/data/hitzak.js` | Las palabras en euskera que enseñan los vecinos: cada uno, una de lo que está haciendo (quien va a la fuente, «ura»; quien pasea con lluvia, «euria»), con una pregunta de tres opciones. Cuando ya sabes unas cuantas, uno de cada dos vecinos charla contigo en euskera (`HIZKETAK`, 14 conversaciones): te dice algo, con el castellano al lado, y eliges qué contestar entre tres frases; la del tiempo que hace depende del cielo. Se guardan en el perfil (`hitzak` y `hizketak`: 1 oída, 2 acertada), se repasan con otros vecinos y se ven en el cuaderno del pueblo, pestaña Euskera, y en el modo didáctico; sus plantillas de euskera (`EU_RX_HITZAK`) dejan las palabras tal cual y, en euskera, quitan el castellano de al lado |
| `src/mando/` y `public/mando/index.html` | El móvil como mando, como en los juegos de Netflix. En el ordenador («Mando del móvil» arriba, o Ajustes y Pausa: «Usar el móvil como mando») sale un QR y un código de cinco letras; el móvil abre `mando/` (sin instalar nada, Android o iPhone) y, tras el saludo, los dos hablan directamente por la wifi con WebRTC (`mando.js`) o, si la wifi no lo deja, por el propio saludo. El saludo (`senal.js`, el mismo archivo en los dos: la web lo publica en `mando/senal.js`) va a la vez por PeerJS, cinco servidores públicos de MQTT (dos por el puerto 443) y ntfy.sh, cifrado con el código salvo en PeerJS; vale el primero que contesta, lo repetido se cuenta una vez, los caminos caídos se vuelven a probar y el mando, si va por el saludo, usa los caminos por los que ya ha llegado algo del otro. Las dos pantallas enseñan qué servidores contestan. Seguridad: todo va cifrado y firmado (AES-GCM) por todos los caminos y los nombres en los servidores son una huella del código; el QR lleva además un secreto de 128 bits detrás del «#», que no pasa por ningún servidor, y con él se entra directamente; quien escribe el código a mano necesita el permiso del ordenador; solo manda el móvil aceptado; lo repetido o grabado y vuelto a mandar no vale; la página del móvil (`mando/index.html` y `mando/movil.js`) solo carga código de la propia web y solo habla con los servidores del saludo. El móvil se presenta como un mando estándar (`pad.js`), que también lee los mandos Bluetooth o USB de verdad. Lo que hace cada botón depende del momento (`contextos.js`): mandos fijos para el pueblo, el encierro, los prismáticos, los diálogos, la pelota, la pasaka, el fútbol, el esquileo y la costura; en el resto de minijuegos y ventanas, el móvil copia los botones que se ven en pantalla y hace de panel táctil con una flecha (`cursor.js`). Para conectar rápido, el móvil busca sus rutas de red mientras llega al saludo, la oferta y la respuesta salen sin esperar a todas (las demás van sueltas) y, si en 0,7 s no hablan directamente, el mando ya funciona por el saludo y pasa solo a la conexión directa cuando la hay. El saludo no se da nunca por perdido: si se cae el único servidor que había contestado (en la calle, PeerJS a veces acepta y se cae enseguida), siguen los que aún estaban llegando y cada uno se vuelve a probar a los 2, 4 y 8 s y luego cada 15; el ordenador, al volver a probar, conserva el código, así que el QR que ya tiene el móvil sigue valiendo. En el móvil se juega con los mismos botones que se ven en la pantalla del juego al jugar en el móvil, para no confundir: en el fútbol, los de su pantalla (TIRO en la esquina, PASE a su izquierda, SPRINT encima y CAMBIAR en diagonal, con sus colores e iconos; al defender, ROBAR y ENTRADA; con el portero, en turquesa: `contextos.js` lee los rótulos de la pantalla en cada momento); en la pelota y la pasaka, GOLPE grande y rosa con CORTADA o GLOBO y DEJADA en columna; en lo demás, los círculos morados del pueblo con el principal en rosa en la esquina y los demás a su izquierda, encima y en diagonal; si hay uno que se queda puesto (Correr), ese va a la izquierda del principal y los demás encima, como en la pantalla del pueblo con el móvil en vertical (Acción en la esquina, Saltar encima y Correr a su izquierda), y con tres o menos, más grandes. La palanca es la del juego: el círculo de trazos con MOVER y, donde se apoye el pulgar, el aro con el botón blanco. Arriba, en qué se está y los botones de sistema, redondos (cuaderno, mapa, perro, menú, pausa, salir), y delante los de acción que se usan poco (en el pueblo, la mochila y los prismáticos), para dejar sitio abajo a hablar, saltar y correr. Los del fútbol y la pelota llevan su nombre dentro, como en su pantalla, en la letra del juego (Barlow Condensed y Nunito, OFL, copiadas en `mando/fuentes` con sus licencias); si el nombre no cabe, solo el icono. Los del pueblo y el encierro van solo con su icono, que ya se entiende (Acción, Saltar, Correr, Mochila, Prismáticos, Cámara, Anotar, Seguir); el nombre queda para el lector de pantalla. `contextos.js` dice qué se queda puesto (`fijo`), qué botón de hombro va con los de acción (`der`), qué botón de acción va arriba (`arriba`) y con qué botones del juego se pinta (`estilo`). Las pruebas usan `?senal=`, `?mqtt=` y `?ntfy=` con servidores locales, `?sinpeer`, `?sinp2p` y `?trozo=` En el pueblo, arriba a la izquierda del móvil, la misión que sigues y su paso, como el recuadro del juego; al tocarla, todas las del pueblo como en el cuaderno (hechas, en curso y nuevas, con sus pasos) y, tocando una, el ordenador pasa a seguirla (`misMovil` y `seguirMision` de `contextos.js`). La app «Mando»: la página del móvil se instala (`manifest.webmanifest`, a pantalla completa y en horizontal, con su icono, la palanca del autor sobre morado: `tools/mando-iconos.mjs`, y su propio `sw.js`, que pide siempre la red y guarda una copia); se ofrece en la pantalla de conectar y una vez al conectar (en Android con su botón; en el iPhone, Compartir y «Añadir a pantalla de inicio»). El móvil se queda con el ordenador: este guarda su código y su secreto (el QR es siempre el mismo) y, al conectar, le manda el secreto solo por la conexión directa; la app, abierta sin enlace, se conecta sola, y si el juego aún no está abierto espera sin error. El ordenador, si ya se conectó un móvil, le espera al abrir el juego sin abrir el panel (`esperarMovil`). Con el código a mano se pide permiso la primera vez y ya no más. «Olvidar este móvil» lo borra en los dos. Nada se queda pulsado: el móvil numera la palanca y los botones (por el saludo pueden llegar desordenados y el ordenador se queda con lo más nuevo), repite lo que mantiene (la palanca cada 0,3 s y los botones cada 0,5) y manda el «quieto» tres veces; el ordenador (`pad.js` y `mando.js`) suelta lo que no se repita en 1,5 s, y todo al cortarse, al irse un mando o al perder la ventana. En el móvil, la palanca se suelta también desde la ventana, sin dedos en su mitad o al irse la página, y otro dedo que toca manda él, como en las palancas de la pantalla del juego |
| `src/ui/sport.css` y `src/ui/sportCard.js` | Estilo deportivo de todo el juego: letra condensada (Barlow Condensed, OFL), morados con fucsia y rosa, fondos de retransmisión, botón fucsia, entradas escalonadas y las cartas de jugador con media y cualidades (la media sale de `pelotariRating` en `pelota/rules.js`) y, bajo la media, el icono de su arquetipo (`pelotariArq` y `arqChips`: Rematador, Defensor, Estratega o Zurdo, de sus cualidades y golpes; la mano sale de `esZurdo`, la misma en la carta y en la ficha). El nombre del arquetipo, la mano y el golpe estrella van en la pantalla VS (`pelota/vs.js`) y en la ficha (`pelota/ficha.js`) |
| `src/web/app.js` | ¿Se juega dentro de una app de tienda? (`appNativa`: `window.Capacitor`, «HerrizherriApp» en el agente de usuario o `?app`, recordado en la sesión). Entonces no se ofrece instalar desde el navegador ni descargar el juego, «Cómo jugar» solo explica los botones y no se nombran otras plataformas ni se manda a la web (normas 2.3.10 y 4.2 de Apple). Revisión para la App Store, con lo que falta y la ficha propuesta: `entrega/app-store/README.md` |
| `src/web/todo.js` | «Descargar el juego entero» (Perfil, en la web y la app instalada): baja los archivos de esta versión (la lista con sus tamaños la escribe `vite.config.js` en `todo.json`) a la misma caché del service worker; luego los pueblos y los minijuegos abren sin esperar a internet y se juega sin conexión |
| `src/util/tele.js` | La pantalla grande (una tele o un monitor grande): la interfaz se diseña a 1440 × 810 y, por encima, crece en la misma proporción con `zoom` en `<html>` (a 1920 × 1080, un 33 %; en una tele 4K a tamaño real, 2,66 veces), y las ventanas medianas (la de antes del partido y las pausas de la pelota y del fútbol, la pausa y las fichas del pueblo, el cuadro del torneo y el diálogo) otro 20 % (`<html class="tele">`, con su `--z` total, `--zt`), para que ocupe todo el ancho y se lea desde el sofá. Los `vw` y `vh` del CSS van divididos por `--z`, las vistas 3D a pantalla entera llevan la clase `pantalla3d`, que deshace el zoom, y lo que se mide en píxeles de la pantalla (clics, `getBoundingClientRect`) se pasa a los del CSS con `enCss()`. Las reglas `@media` miran la pantalla sin ampliar: la única entre 810 y 900 de alto, la del final de capítulo, se repite con `<html class="tele-bajo">`. Solo sin dedo y con el zoom estándar (`currentCSSZoom`); si no, todo sigue igual |
| `src/util/tactil.js` | Si se juega con el dedo (`pointer: coarse`: móvil y tableta; `<html class="tactil">`). Solo entonces salen los controles de pantalla (la palanca y los botones de jugar); en un ordenador, aunque su pantalla sea táctil, y en una tele, nunca. Con el mando del móvil conectado (`<html class="con-mando">`, `mando/mando.js`) se esconden en todas partes y vuelven al desconectarlo; los botones de los minijuegos se quedan, porque el móvil los copia. La pelota y la pasaka llevan en el ordenador sus tres botones (GOLPE, CORTADA y DEJADA), que se pulsan con el ratón y llevan escrita su tecla (espacio, L, mayúsculas): el autor los echaba de menos en el escritorio (14 de noviembre de 2026); con el mando del móvil queda solo GOLPE, pequeño. Los del fútbol se crean siempre, escondidos sin dedo, para que el móvil lea sus rótulos (PASE, ROBAR, PARAR…) también en el ordenador |
| `src/ui/pausa.js` y `src/ui/pausa.css` | La ventana de pausa de los partidos de pelota y de fútbol, como la de los juegos de fútbol de referencia: cabecera con el título y la equis, y una fila por opción con su nombre, qué hace y un botón redondo (`pzCabecera`, `pzFila`, `PZ_ICO`); y el icono del resultado del panel del final (`pzResultado`) |
| `src/ui/encaje.js` | Ninguna palabra partida ni cortada con «…»: vigila lo que se añade a la página y, en los textos que podrían partir una palabra larga o cortarse con puntos, baja la letra poco a poco (hasta el 65 % y nunca por debajo de 12 px) hasta que todo cabe entero; si no basta, el texto con puntos pasa a dos líneas |
| `src/ui/fitlabel.js` | Rótulos de los botones redondos (fútbol y pelota) siempre dentro del círculo: mide cada línea del texto contra el círculo y, si no cabe, lo parte en dos líneas y luego junta las letras, sin bajar nunca de 12 px. Se vuelve a mirar al cambiar el rótulo y el tamaño de la pantalla |
| Identidad común | Reglas que valen en todo el juego (`style.css`, `sport.css`): escala de letra 12, 14, 16, 20, 24 y de 32 en adelante; rótulo en letra estrecha rosa de 14 px con raya inclinada (`.kicker`); título en la letra de rótulos grandes con interlineado 1; distancias entre textos con la tabla de ritmo (ver «Ritmo de los textos» abajo); botón principal en la letra de rótulos grandes sobre el degradado y los demás en letra estrecha en mayúsculas; textos en blancos y lilas fríos, rosa para destacar; verde solo para acierto, naturaleza y los colores de comarcas y clubes; toda tarjeta, card, bloque, panel, ventana y rótulo con las esquinas redondeadas (6 px los rótulos pequeños, 8 las tarjetas, 10 los paneles); el filo de neón de 1 px, solo en las cartas de jugador (`.gx-card`); lo demás se separa del fondo con su relleno y una sombra oscura y, como mucho, una raya neutra muy tenue (`--linea`, blanco al 8 %), sin color ni brillo; ningún botón lleva borde, contorno ni anillo: el principal, en pastilla con el degradado (`--cta`), los secundarios en pastilla con relleno liso (`--btn-2`) y lo elegido (`aria-pressed`, `aria-selected`, `aria-checked`) con relleno (`--btn-on`), no con contorno (`ui/neon.css`, ver «Identidad: esquinas redondeadas; el filo de neón, solo en las cartas de jugador»), botones en pastilla y marcas en círculo, y pestañas, filtros y chips en letra estrecha: una sola lista en `sport.css` para los dos. Degradados: nunca duros ni de lado; si hace falta uno, muy paulatino, de menos a más y sutil, en varios tramos y sin saltos de oscuridad en poco espacio. Un velo para leer un nombre sobre una foto es fino, sin desenfoque y nunca opaco del todo (como mucho al 55 %), y una imagen no se encaja con bordes difuminados ni copias desenfocadas: se recorta (13 de noviembre de 2026). Las casillas de las misiones del pueblo llevan un filo de neón de 1 px del color de su categoría, la única excepción a la regla de las cartas de jugador. La misma identidad en toda la aplicación: lo que se haga en una pantalla vale para todas. Composición: todo en la rejilla de 4 px; el mismo margen en las cuatro esquinas de la pantalla de juego (`--edge` y `--thumb`, 16 px); las ventanas de papel con 12 px arriba, a los lados y abajo; en el menú, el margen de los lados (`--gut`) igual para el contenido y para la barra de arriba |
| `src/ui/infocard.css` | Las fichas de información (planta, animal, lugar, oficio, cima, escudo, misión cumplida): un mismo orden para todas (imagen con su etiqueta, cabecera, contenido en pestañas o texto, etiquetas y botón al pie) y los mismos espacios (16, 12 y 8 px). También la ficha de un sitio en el mapa del pueblo. Las pestañas van sin bandeja de fondo y «Seguir» sin foco al abrir; en pantallas bajas el pie queda pegado abajo y solo lleva velo cuando la columna de verdad se desplaza (`src/ui/pieCorre.js`, clase `corre`) |
| `src/ui/floraFoto.js` y `src/assets/flora/` | Fotos reales CC0 de iNaturalist de las 51 plantas (la planta o su flor y su hoja): 720 px en la web (`web/`) y 380 px en el archivo único (`mini/`), elegidas por el alias `@flora-fotos` de `vite.config.js`. Autores en `fotos.json`; enlaces en `legal/fotos-flora.csv`. En WebP, como las láminas (algunos visores del iPhone no enseñan AVIF). Sin foto, la ficha usa la lámina dibujada (`floraArt.js` y `leafArt.js`) |
| `src/ui/faunaImg.js` y `src/assets/fauna/` | Ilustraciones de los 40 animales (31 del autor y, desde el 12 de noviembre de 2026, nueve hechos con Higgsfield con una del autor de referencia y sin fondo: el salmón, el barbo de Graells, la madrilla y la chipa, con la trucha; el caballo de Burguete y el burro, con el zorro; la gallina, el gorrión y el jilguero, con el petirrojo). Los animales que ya salían en el juego sin ficha se apuntan al verlos de cerca (`faunaVista` de `townGame.js`): los peces al huir de la orilla, los pájaros al salir volando, la gallina al apartarse y el caballo y el burro al montarlos (cuerpo entero, fondo transparente): la ficha de cada uno con la de 1280 px en la web y la de 512 en el archivo único (alias `@fauna-big`; las de 512 se rehacen desde las de 1280 con `tools/fauna-512.mjs`, a calidad 80 para que quepan), y las tarjetas del cuaderno con la de 512 en la web y la de 256 en el archivo único (`@fauna-small`) |
| `src/ui/fonts.css` | Las tipografías incrustadas (Lilita One y Nunito, de @fontsource), solo en WOFF2: así el archivo único no lleva la copia WOFF de reserva |
| `src/assets/personajes/` | Ilustraciones del autor de 8 personajes de Navarra, en 16:9 y con el id de `data/personajes.js`: salen en las fichas de su misión (historia, placa y «Su huella hoy»), la de 1536 px en la web (y la de 2560, ampliada con `tools/laminas-grandes.mjs`, cuando la pantalla la pide; `src/web/hd.js`) y la de 320 en el archivo único. Las da `personajeUrl` de `ui/laminas.js` (alias `@personajes`); Sancho y las golondrinas llevan una lámina que ya estaba (`PERSONAJE_LAMINA`) |
| `src/assets/tradiciones/` | Ilustraciones del autor de 4 tradiciones, en 16:9: el canto de Gayarre (Roncal), los trovadores (Olite), la Bajada del Ángel (Tudela) y el Ttun-ttun (Isaba). Cada misión lleva su id en el campo `ilus` de `data/levels.js`. Salen en las fichas «¿Qué es?», «Cómo se hace» y «Antes y ahora» de la tradición y en la ficha de la danza, la de 1536 px en la web (y la de 2560 cuando la pantalla la pide) y la de 320 en el archivo único. Las da `tradicionUrl` de `ui/laminas.js` (alias `@tradiciones`) |
| `src/assets/cimas/` | Escenas del autor de las 16 cimas de las misiones de montaña, en 16:9 y con el id del monte: la tarjeta de cada cima (pantalla Cimas y comarca) lleva la de 1024 px (`tools/cimas-tarjetas.mjs`; la de 768 ya no se usa) y el buzón de cumbre, la de 1536 (o la de 2560 cuando la pantalla la pide); en el archivo único, solo la de 320, porque no caben más grandes. Las da `cimaUrl` de `ui/laminas.js` (alias `@cimas` y `@cimas-big`) |
| `src/assets/leyendas/` | Ilustraciones del autor de los 13 cuentos, en 16:9 y con el id de su cuento: el libro de leyendas lleva la de 768 px y el relato y el visor, la de 1536 (o la de 2560 cuando la pantalla la pide; en el archivo único, una sola de 640). Las da `leyendaUrl` de `ui/laminas.js` (alias `@leyendas` y `@leyendas-big`); si faltara, sale la lámina del pueblo (`CUENTO_LAMINA`) |
| `src/ui/escudoImg.js` y `src/assets/escudos/` | Escudos con el acabado del autor: los 65 del armorial (`heraldica/`, 512 px; 1024 en la ficha de la web), los emblemas propios de los 21 equipos de la liga (`equipos/`), los escudos de las casas (`casas/512`, con id `pueblo-n` = `houseArms(pueblo, n - 1)` de `data/blasones.js`; en su ficha, «en color» es la imagen y «en piedra» el dibujo tallado de la fachada; las casas sin imagen siguen con el dibujo) y los de los oficios (`oficios/512`, con los ids de `data/oficios.js` y de los jornales; en las fichas de los pasos del taller y del jornal). Casas y oficios van de 512 en la web, de 192 en el archivo ligero y de 96 en el archivo único, que no tiene sitio para más (`tools/escudos-importar.mjs` los mete desde el paquete del autor y saca los pequeños); con conexión, la fachada (`casaReadyHD`) y la ficha (`web/hd.js`) suben a los de 512 de la web. En octubre de 2026 el inventario del autor deja 167 casas de 22 pueblos sin imagen (todas las de Pamplona, Tudela, Estella, Olite...): esas siguen con el tallado dibujado hasta que lleguen. La pared de la pasaka pinta el escudo de Pamplona del autor en cuanto carga (`armsReady` + `drawReady`). En el menú y en las fichas van como imagen; en la placa de la plaza y en la pared del frontón, `drawTownArms` pinta la imagen en el lienzo (se carga al empezar la partida, `armsReady`) y, si faltara, el dibujo de `world/armas.js` La fachada enseña la imagen del autor en cuanto llega (`casaReady` + `drawReady`, lienzo de 256 × 336 en `townGame.buildShields`, que pone primero en las fachadas las casas que ya tienen imagen: cada pueblo tiene entre 0 y 8 fachadas con escudo, `tools/escudos-cuenta.mjs` las cuenta; hasta entonces y en las casas sin imagen, el tallado dibujado; desde el archivo único la pide a la web con permiso de origen cruzado para poder subirla a la textura). La pantalla Escudos del menú lista los escudos de casa leídos (cartas `escudo:<pueblo>:<n>`) con la imagen del autor y abre la misma ficha. El armorial es la serie de octubre de 2026 del autor (en volumen con marco, `heraldica/512`, importada con `--municipales --todos`); la serie anterior, plana con cadena, queda guardada en `heraldica-anterior/` sin usarse. Las copias de 1024 de la ficha (`heraldica/1024`, `casas/1024`, `oficios/1024`) son ampliaciones al doble con Real-ESRGAN (x2) de las de 512, hasta que lleguen los originales de 1254. |
| `src/data/instrumentos.js`, `src/audio/instrumentos.js` y `src/ui/instrumentos.js` | Los instrumentos de la música de siempre de Navarra (txistu y tamboril, gaita navarra, txalaparta, ttun-ttun y txirula, pandero, bandurria y guitarra, trikitixa, kirikoketa): su ficha en el menú (Saberes · Instrumentos: qué es, cómo se toca, dónde suena, en el juego; con «Escuchar» y «Tocar»), su sonido sintetizado con el Web Audio del juego (cada uno con su timbre; sin muestras grabadas) y el minijuego de tocar: las notas bajan por su carril y se pulsan al llegar a la línea (teclas 1-4, flechas, A S D F o los botones), cada pulsación suena con el instrumento y el acompañamiento (tamboril, redoblante, ttakun, guitarra, bajos) lleva el tiempo; con el 60 % de las notas, carta de tradiciones (`instrumento:<id>`) e insignia «Música de plaza» a los tres. En la plaza de los pueblos de su zona hay un músico (`townGame.js`, `tocarCon`; en Otsagabia, `game.js`) que lo enseña. Los iconos de los ocho son del autor (`src/assets/icons3d`; los siete nuevos también a 512 en `icons3d/512`, alias `@icons3d-big`, para la ficha y las pantallas densas, por `hd.js`); `ui/icon3d.js` conserva sus dibujos en código por si faltara alguno. Las frases son del juego, al estilo de cada música Desde octubre de 2026 cada instrumento toca un aire tradicional de Navarra (`game.air`: biribilketa, jota de Estella, ttakun eta herrena, bolant-dantza de Luzaide, arin-arin, jota de la Ribera, fandango y kirikoketa), frases cortas del juego al estilo de cada uno, de autor desconocido (no son transcripciones de una pieza concreta; si el autor manda las notas de una, se cambia la frase). Hasta cinco carriles (teclas A S D F G o 1-5); el botón de cada carril va dentro del escenario, al pie de su carril, y es el objetivo: la nota baja hasta su centro y el botón se enciende cuando le llega (ventana de 0,3 s; 2,3 s de caída). En el móvil no hay letras de teclas en los botones. La imagen del instrumento de la ficha pide la de 1024 (`icons3d/1024`, de los PNG de 1254 del autor) en pantallas densas. |
| `src/data/pasaka.js`, `src/ui/pasaka.js` y `src/game/pasaka3d.js` | La pasaka, el juego directo de pelota de los trinquetes y los claustros (dos parejas frente a frente, red de 1,20 m, guante corto, saque con la mano, quinces y partidos a 13 juegos; fuentes: reglamentos de las federaciones vasca y navarra, Napike y la prensa de los Encuentros Iglesia y Pelota de la catedral de Pamplona). `ui/pasaka.js`: la ficha del menú (pantalla `pasaka` de `hub.js`, con la portada horneada por `tools/pasaka-portada.mjs`, una foto del partido en `src/assets/laminas/*/dep-pasaka.webp` que no está en `data/laminas.js` a propósito, para que no salga en el álbum de ilustraciones; si faltara, el dibujo de `pasakaPreview`), el premio al acabar (carta `pasaka:claustro` de tradiciones, puntos e insignia «Pasaka en el claustro») y el menú de entre partidos. `game/pasaka3d.js`: el partido en 3D con los avatares, en el sobreclaustro montado como el frontón cubierto (a 2.400 m, fuera del pueblo, suelo registrado con `addPlatform`): techo de vigas, arquería sobre el jardín con público de pie (`crowd3d`), banco con gente sentada, frontis con chapa, red, líneas y una valla de madera a nuestra espalda; tu avatar con tu rig (brazo del golpe con `armSwing`), el canónigo de pareja y dos vecinos de negro como rivales (Actores que mueve el partido, como en la pelota); física de la pelota, saque que tiene que llegar al frontis, quinces y partido a tres juegos; mando de pelota: palanca o flechas para moverse y, como en el frontón, Golpe mantenido carga la potencia mientras la palanca apunta a lo ancho y a lo largo y el jugador corre solo hacia donde va a caer la pelota (círculo dorado en el suelo, botón que brilla al alcance), más Dejada y Globo; el recinto lleva columnas torneadas, zócalos, cornisas, ventanas con alféizar, faroles, el marcador y el escudo de Pamplona en el frontis y el jardín con paseos, fuente, cipreses y setos; se ejecuta como la pelota (`G.mode = 'pelota'`, `G.pelotaTick`) con la cámara detrás de la valla por `follow.cinematic`. Gancho de pruebas `window.__pasaka`. Se entra desde Pamplona con el canónigo del claustro (`townGame.js`, `pasakaCon`, `playPasaka`, `pasakaIntro`) o desde el menú (`onSport('pasaka')`: Pamplona en modo campeonato, `pasakaOnly`, y al salir de vuelta a la pantalla `pasaka`). La interfaz del partido es la misma del frontón (`pelota/hud.js`: `pelotaStyle`, la X, el marcador en barra, los botones redondos, la palanca, el rótulo de la fuerza y el aviso central), con las clases `pel-*`; solo lo propio lleva `pk-*`. Mandos: la palanca o las teclas mueven siempre al avatar, también mientras se carga el golpe; al soltar, la inclinación de ese momento apunta (a lo ancho y a lo largo) y, si no hay inclinación, la pelota va hacia donde está. Las figuras van en la postura `Still` de `glbChar.js` (de pie y quietas; `Ready` flexionaba las rodillas sin parar) y solo se mueven al armar el brazo cuando viene la pelota y al golpear. Los vecinos devuelven el 95 % de las pelotas cómodas y fallan sobre todo cuando les haces correr (3 % por metro a partir de metro y medio) o les pegas fuerte (más de 15 m/s); cuando fallan, dos de cada tres veces le pegan mal (a la red o fuera) y la otra no llegan. En un partido automático largo (`window.__pasakaGames`), los azules ganan en torno al 40 % de los quinces y los peloteos duran unos 7 golpes. |
| `src/world/arbol.js`, `hojasCeldas.js` y `texturasArboles.js` (noviembre de 2026) | Los árboles de los bosques y los pueblos (haya, roble, castaño, abeto, pino, chopo, olivo y manzano), hechos como árboles de verdad: un tronco que se abre en ramas madre, ramas y ramillas, y en cada ramilla sus hojas una a una (cada tarjeta es una ramita de su especie con sus hojas dibujadas: haya de borde ondulado, roble lobulado, castaño dentado, chopo triangular, olivo estrecho y plateado, manzano con manzanas, abeto de acículas planas en peine, pino en mechones). Sin bolas ni bultos: entre ramilla y ramilla se ve el cielo. Cada especie con su porte (`ESPECIES`: la haya en cúpula, el roble ancho, el abeto en cono con pisos de ramas en V para verse de lado y desde arriba, el chopo en columna, el olivo bajo y retorcido). Antes eran bolas de hojas sobre un tronco y desde arriba el bosque eran globos verdes. Tres versiones del mismo esqueleto, para que el árbol no cambie de forma al acercarse: de cerca (los más próximos a la cámara, `Nature.refrescaDetalle`: 28 en alta, 18 en media, 10 en baja, a menos de 38 o 26 m), a media distancia (los de los trozos cercanos: tronco, ramas madre y hojas más grandes; en baja, `ligero`, menos tarjetas) y de lejos (tronco y racimos, una llamada por especie). Una haya: unos 9.200 triángulos de cerca, 1.050 a media distancia y 94 de lejos. En Irati, en alta, 1,46 millones de triángulos en toda la escena y 220 llamadas (antes 1,51 millones y 202); en baja, 734.000 y 153. El atlas de hojas (`hojas.webp`, 2048 px, en el móvil a 1024; celdas en `hojasCeldas.js`) lo pinta con código `tools/hojas-pinta.js` y lo guarda `tools/hojas-atlas.mjs`, con la corteza lisa de la haya; las demás cortezas son fotos de dominio público (Poly Haven y TextureCan, CC0). Se cargan con las texturas pintadas y, hasta que llegan, los árboles no se dibujan (sin el atlas cada tarjeta sería un cuadrado). En el material (`windMaterial`, `hojas` y `corteza`): las hojas con la luz de su cara de fuera por los dos lados, temblando con el viento y sin adelgazarse de lejos; la corteza con su textura, relieve y musgo al pie. Las matas del valle, con el mismo generador (`bush`): muchos tallos que salen del suelo en abanico, los de fuera más cortos para que quede redonda (`domo`), y hojas desde abajo; a media distancia, una tarjeta en la punta de cada ramilla aunque la ramilla no se dibuje. En los trozos cercanos, la versión de media distancia (unos 320 triángulos, como la bola de antes) y, en las más próximas a la cámara, la completa (1.760; 8 en baja, 14 en media y 20 en alta, a menos de 12, 16 o 22 m: `Nature.reparte`, el mismo reparto que los árboles). Se colocan un 22 % más pequeñas (`BUSH_K`): de 1 a 2,2 m. En Irati, en baja, 750.000 triángulos en toda la escena (antes 747.000). Los helechos van ahora en su propio dibujo (`helechos-cerca`). Las maquetas del mapa del inicio y los jardines del casco siguen con las matas de antes (`TREE_MAKERS`, `makeBush`) |
| `src/world/sombraCopas.js` (noviembre de 2026) | La sombra de las copas de los árboles en el suelo: una textura de todo el mapa vista desde arriba (1024 px, un píxel por metro, de un solo canal) con la mancha de cada árbol y sus claros, que el propio suelo lee y le oscurece (`terrain.js`, `tCopas`). Se corre hacia donde cae la sombra según el sol, se apaga de noche y con el cielo cubierto y, en media y alta, cerca de la cámara, donde ya hay sombras de verdad (`Nature.luz`). Al quitar árboles se pinta otra vez, una sola vez por fotograma. Antes era una malla de manchas pegada al terreno que nunca coincidía del todo con sus triángulos: en las cuestas flotaba o se hundía. Sin triángulos ni llamadas de dibujo de más. La textura se pinta en una lista de números (`pintaCopas`), cada mancha girada y escalada a mano, sin lienzo: con un lienzo de 1024 px y leerlo después, el primer fotograma del pueblo tardaba segundos en el navegador de pruebas (5,6 s; ahora 25 ms, con la misma imagen) |
| `src/world/flora3d.js` y `leafSprig` (`src/ui/leafArt.js`) | Las plantas que se identifican en cada pueblo, en 3D. Los árboles tienen el porte de su especie (tabla `HABIT`: forma de la copa, dónde empieza, ramas principales y cuánto suben, copa en bultos, ramas torcidas, ramitas que cuelgan): tronco, ramas y ramillas de madera, y la copa hecha de cientos de ramitas planas con el dibujo de la hoja de su especie (`leafSprig`: hojas alternas, palmeadas o compuestas, mechones de agujas o ramitas planas del abeto). Los arbustos de hoja, un bulto oscuro por dentro con las ramitas por encima. Dos mallas por ejemplar (madera y hojas), sin archivos nuevos: las texturas se dibujan al entrar en el pueblo y se liberan al salir |
| Fotos de flora en el menú y en la ficha | En Naturaleza, la foto de la planta entera ocupa el ancho de la tarjeta y su hoja va en un círculo encima; en la ficha, la otra foto (la hoja o la planta) va en un círculo en la esquina de la foto grande y, tocándolo, se cambian. De los árboles, fotos del árbol entero, para reconocer su forma |
| Frontón cubierto | `PelotaCourt` con `hall: true` (`court.js`): cerrado, rebote y pared izquierda hasta el techo (`backH` y `leftH` de `setFeel`), grada con asientos y público sentado, luz de pabellón (`sky.indoor`). `hallVenue` en `fronton.js` lo monta aparte. El frontón de cada partido se elige en el menú de pelota y en el cuadro del torneo (`sedeHtml` en `game/torneo.js`; `sedes`, `venueDe` y `venueIntro` en `game/townGame.js`): el de la plaza del pueblo, el cubierto o el Labrit, y en Campeonatos también el de otro pueblo, que se carga con `exit('sports', { pelota })` de `main.js`. Sin elegir, el torneo va al cubierto y la final al Labrit (`sedeDe`); la elección del torneo se guarda por ronda en `T.sede` y la del partido libre de Campeonatos en el perfil. Se elige en «Elige tu frontón» (`eligeFronton`, `EF_CSS`), como el estadio en los juegos de fútbol: una tarjeta grande por frontón con la cancha tal como se juega (una imagen sacada del propio partido, con los pelotaris y el público: `assets/frontones-juego`, `ui/frontonFotos.js`, `canchaImg`) y, si la hay, la foto del de verdad en una esquina («El de verdad»: el Labrit y la plaza de Leitza, de `assets/frontones`). «Otro pueblo» abre las nueve sedes, cada una con su cancha (`otroPueblo`). Las imágenes se sacan con un guion de Playwright que juega un partido libre en cada sede y frontón y fotografía la cancha sin el marcador. Cada cubierto tiene la arquitectura de un frontón de verdad de las fotos del capítulo «Frontones de Navarra» (`data/frontonArq.js`, `arqDe`; `ARQ` en `court.js`, desde el 13 de noviembre de 2026; antes eran todos la misma nave con otro color): el pabellón oscuro de Iruña; el Erminea de Isaba en Estella (techo blanco con cerchas claras y tubos de luz, frontis de hormigón con su marco azul, rayas amarillas); Ziordia en Leitza y Tafalla (pared azul y frontis de sillería en el marco); Irañeta en Elizondo (todo verde, bóveda de madera laminada y ventanal en arco encima del frontis); Igantzi en Lesaka (cerchas de madera con pendolón, frontis de bloques grises); Urroz en Sangüesa y Puente la Reina (cerchas rojas de acero en celosía, frontis de sillería rojiza, fondo amarillo, policarbonato detrás de la grada); y la nave en dientes de sierra de Peralta en Marcilla. Los colores de la cancha (`ARQ_LOOK`) pasan por `legible`: la pared, el frontis y la piedra se oscurecen lo justo para que la pelota se vea (en Urroz la pared es blanca y aquí ocre). La medida de la cancha y cómo se juega no cambian. En la tarjeta, la foto del frontón en que se basa: «Como el de Isaba» (`ARQ_REF`). Las plazas llevan la red de encima del frontis y del principio de la pared izquierda, sobre postes de acero (`buildRed`, `look.red`), como Leitza, Mendaza, Areso o Nazar; la de Leitza, con el frontis de revoco gris |
| `src/hub/` | Centro de mando: inicio, mapa, pueblos, personajes (los seis jugables), insignias, pasaporte y perfil; `stage` dibuja el escenario 3D del selector de personaje (`diorama` solo lo usa `lab/portadabake.html`) |
| `src/ui/` y `src/ui.js` | HUD, iconos SVG e iconos 3D horneados (`icon3d`, que guarda WebP en `src/assets/icons3d`), retratos, mapa y minijuegos pequeños. En las charlas, el retrato de cada vecino es una ilustración del autor de la plantilla de pelotaris (`vecinoSrc` de `ui/pelotariFig.js`: la del mismo nombre o una del mismo género, siempre la misma para cada nombre), en cabeza y hombros y entera dentro del recuadro, de 48 px (40 en el móvil y 56 en pantallas grandes: desde el 16 de noviembre de 2026, más pequeño, porque la cámara ya se acerca al vecino); los avatares llevan su retrato ya hecho (`ui/portraits.js`). Hasta noviembre de 2026 se hacía en 3D con el muñeco de cada vecino durante la carga |
| `src/ui/personajes.js` y `src/data/personajes.js` | Los personajes de Navarra: 24 fichas, 12 mujeres (reinas, maestra, abogada, etnógrafa, pintora, artista, golondrinas, etxekoandreak, conserveras) y 12 hombres y colectivos (músicos, deporte, viajes, ciencia, arquitectura, antropología, pastores trashumantes, las huertas), cada una con su misión en un pueblo (`FIGURE_TOWNS`, su recuerdo con el objeto de `items.js`) y en el menú (Personajes e inicio, las mujeres primero) |
| `src/data/` | Datos: pueblos y misiones (`levels.js`), comarcas con su cultura y su traje (`comarcas.json`), montes, fauna, comida y equipo (`equipo.js`), tiendas y producto estrella (`tiendas.js`), personajes (`cast.js`) y euskera (`eu.js`) |
| `src/i18n.js` | Castellano, euskera y modo «Aprende euskera» (botón ES para ver el castellano unos segundos) |
| `src/data/figuras.js` | Las figuras de leyenda (lamia, basajaun, sorgina, tartalo, Roldán) y de carnaval (joaldun, momotxorro, cascabobo, zipotero, coronel Lagunero, irasko, paloki): quién es cada una, cómo viste, dónde sale en Navarra y en qué pueblo y misión del juego. Las enseña `ui/figuras.js` en el inicio y en Personajes, con su imagen (`src/assets/figuras`, renders de sus trajes hechos con `tools/retratos.mjs`, provisionales: 768 px en la web, 384 en el archivo único, que con conexión pide la grande; cuando el autor entrega la ilustración de una figura, `tools/figuras-ilus.mjs` la deja en `src/assets/figuras/ilus` y esa manda, apaisada) y su ficha con pestañas |
| `src/audio.js` | Sonido con Web Audio: ambiente, animales, efectos y la música por ambientes. Sonidos grabados (`GRAB`, `grab`, `hay`; Envato Elements, `src/assets/sonidos/LICENCIAS.md`): ladridos, balidos, mugido, gruñidos, el caballo de montar (relincho al montar, al arrancar a galopar si hace más de un minuto del último y por el camino cada 90 a 150 s; resoplido parado; los cascos, la grabación del galope en bucle que se acelera con él; los cascos, `cascos` y `golpeCasco`, desde `game/montura.js`: cada pisada se arma al ritmo de su aire, `AIRES`, cuatro golpes al paso, dos dobles al trote y cuatro y el vuelo al galope, con un trozo corto de la grabación del galope, uno de sus trece golpes, `GOLPES`, al azar y con algo de tono, un golpe grave a 150 Hz que le da cuerpo, un poco de eco y lo propio de cada suelo, `SUELO`: la nieve apagada y con crujido, la hierba y la tierra sordas, el empedrado con chasquido y más eco, la madera hueca y el agua con chapoteo; antes, la grabación en bucle, casi sin graves y sin eco, sonaba seca), pasos sobre piedra y en el agua, botones, avisos y premios; y desde el 12 de noviembre de 2026 el burro (`rebuzno`: al montarlo, por el camino cada dos o tres minutos y alguna vez el de la feria, `game.js`), las gallinas de las casas (`cacareo`: al apartarse y, cada 8 a 20 s, una de las que tienes a menos de 14 m, `world/pajarillos.js`), las bandadas de gorriones al salir volando (`gorriones`: las viajeras y las de la plaza; los jilgueros, solo el aleteo) y los peces del río (`chapoteo`: al huir un banco y, cerca de uno tranquilo, cada 10 a 25 s un chapoteo o, en los grandes, el salto, `world/peces.js`); si uno aún no está descomprimido suena el sintetizado de antes, y los nuevos, que no lo tienen, no suenan. Los de los menús y los pasos se descomprimen al abrir, los de los animales al entrar en un pueblo. Dos ambientes en bucle de 20 s (`Ambiente` en `audio/pistas.js`, sin quedarse con la copia de 30 s): pájaros y pueblo de día, en el monte solo pájaros y más fuertes, de noche y en los partidos ninguno (bajos: los pájaros a 0,018 en el pueblo y 0,04 en el monte, y el pueblo, que también es casi todo pájaros en los agudos, a 0,05; en el altavoz del móvil los agudos son lo que más se oye); y un tercero, las ovejas y sus cencerros en un monte del País Vasco (`ambiente-ovejas`, la grabación que pasó el autor, en bucle de 30 s), de día en las cimas, a 0,16, y en el monte, a 0,06; con ellos, los pájaros sintetizados casi no suenan. En el encierro y las persecuciones, su música de acción (`musica-accion`). En todo el juego de pelota, sus pantallas de elegir (campeonato, pelotari, sorteo, resumen) y el partido, «Sport» de rvstudio (`musica-pelota`, desde el 17 de noviembre de 2026: el autor la pasó «para el juego de pelota para todas las pantallas de selección y demás»; `engine/runtime.js`, `moodOf`, con las mismas señales que `main.js` usa para saber que se está en la pelota; la pantalla de Torneos, de pelota y de fútbol, sigue con la épica `musica-torneos`), a 0,3 mientras se juega y a algo más de la mitad de eso cuando habla el comentarista (antes 0,14 y un tercio: en el iPhone no se oía); fuera del juego, 0,42, y todos los efectos y ambientes van por un bus a 0,62 (antes la música a 0,32 y los efectos a 0,9: los sonidos pesaban más que la música), y el sonido del partido, el público y los golpes, a 0,75; si el iPhone para la música por su cuenta, `pistas.js` (`quiere`) la vuelve a pedir, y la voz y el sonido del partido despiertan el contexto también cuando está «interrupted»; Ajustes › Diagnóstico tiene una fila «Sonido» con el estado del contexto, la música y la voz; la medieval de antes, «Minstrel Guild», se quitó (noviembre de 2026: la música del juego, siempre la que pasa el autor). Todo junto, unos 13 MB de audio descomprimido. La música, siempre con las canciones grabadas (`src/audio/pistas.js`): la del juego en el pueblo, de día y de noche, en los minijuegos, las fiestas y el encierro; la de Torneos en los partidos y los campeonatos; la de inicio en el menú. No hay música sintetizada: se mezclaba con las canciones nuevas. Al abrir, la música es lo primero que se prepara (`main.js`, al empezar `boot`): cada canción se descarga entera, la del menú la primera, y suena desde esa copia, así entra al momento y sin conexión; suena en cuanto el navegador deja, desde el principio donde se puede, como la app instalada en el ordenador, y si no con el primer toque o tecla de cualquier tipo, también el de la portada del arranque: el contexto de audio y los elementos de las músicas se crean en `index.html` (`sonido-primero`) y en ese toque quedan libres para sonar luego sin otro. En el iPhone, Apple no deja sonar nada antes del primer toque, y con el interruptor de silencio puesto no suena La música del menú empieza en la propia página de arranque (`index.html`, `musica-primero`, un `<audio>` por el contexto de audio del arranque): nada más abrir si el navegador lo deja y, si no, en el primer toque, aunque el juego aún esté cargando; el juego la recoge sin cortarla (`pistas.js`, `pista`, `previa`). Se baja entera al abrir y, si aún no suena, se pone la copia, para que en el iPhone entre al momento con el toque. `sonido-primero` pide a Safari (iOS 17 o más) que el sonido sea de reproducción, `navigator.audioSession.type = 'playback'`, para que se oiga con el móvil en silencio; y la lámina animada de la portada, si no arranca sola (ahorro de batería), arranca con el primer toque. El iPhone no deja sonar nada antes de un toque |
| `src/audio/interfaz.js` | Los sonidos de las pantallas que no ponían los suyos, escuchando en el documento (`sonidosInterfaz`, desde `main.js`): en los partidos de pelota y fútbol (sus paneles, el sorteo, la ficha, la pausa, la Gran final) y en los paneles de los campeonatos (`lg-root`), el toque de botón en cada botón, salvo los del juego (golpe, cortada, dejada, pase, la palanca), y el de abrir en cada ventana que aparece (no cuando la misma se rehace al cambiar una opción); la ficha de un pelotari, con el de la carta; la Gran final, con la fanfarria, la magia de la txapela y la carta de cada finalista; las estrellas de un reto, una moneda por estrella. Para hablar, solo la voz grabada por el autor (`pelota/voz.js`): las frases de estas pantallas (`VOZ_INTERFAZ`: la Gran final, el sorteo, la txapela y el reto de tres estrellas) suenan en cuanto estén grabadas en `src/assets/voz/<voz>/<idioma>/<clave>-<n>.mp3`; hasta entonces, nada |
| `src/crowdAudio.js` | El público de la pelota y del fútbol, sintetizado: murmullo de treinta voces con formantes, aplauso de 160 personas a la vez, «¡oooh!», lamento y estallido. Se calcula una vez, a trozos, mientras carga el partido (`crowdBuffers`); `Crowd` lo reproduce con su nivel según el momento. Está apagado (`PUBLICO`): en su lugar, en el fútbol (`futbol/audio.js`), la grabación de la gente aplaudiendo, silbando y animando de la pelota (`aplausos-final`, Envato): un trozo con fundido en cada parada, poste o remate (`ooh`), detrás del grito de gol (`gol`), al final de cada parte y con el gol del rival (`clap`), y entera al ganar el partido (`ovacion`, desde el `'end'` de `match.js`; noviembre de 2026, pedido del autor) |

## Convenciones

- **Nada que ayude a cumplir una misión se quita** (regla del autor, 17 de noviembre de 2026: «no puedes eliminar cosas
  que ayuden a cumplir misiones»). Pistas de sonido, rótulos de ayuda, flechas, el perro guía, el brillo de lo que se
  busca: si se cambia el sonido, la música o el diseño, la pista tiene que seguir funcionando igual o mejor. Lo que pasó:
  al bajar los efectos y subir la música, los cencerros del Zarratrako de Otsagabia (que solo llegaban a 45 m) dejaron
  de oírse y la misión «sigue sus cencerros» quedó sin pista. Ahora suenan con `cencerroGuia` (`src/audio.js`), en todo
  el pueblo y con la dirección en cada oído, también los de las figuras de carnaval de los demás pueblos
  (`townLeyendas.js`). Antes de tocar el volumen o un sonido, buscar en `game.js`, `townGame.js`, `townCharla.js` y
  `townLeyendas.js` las misiones que dicen «escucha» o «sigue».
- **Una sola línea de diseño** (el autor, 17 de noviembre de 2026: «el juego se ha ido creando poco a poco y tiene retazos
  de todos los añadidos; hay que unificar»). Personajes: la referencia es el campesino y el joaldun, y todo personaje nuevo
  se mide con `tools/proporciones-personajes.mjs` (unas 4,75 cabezas los adultos; `CABEZA` en `glbChar.js`). Elegir algo
  de una lista (campeonatos, frontones): el carrusel 3D de `src/game/carrusel3d.js`, sin barras de filtros.
- **El partido de pelota se ve como una retransmisión** (el autor, 17 de noviembre de 2026: «rótulos mucho más FIFA, más
  dinámicos, más modernos»). Los rótulos del tanto (`.pel-call`, `.pel-golpe`, `.pel-rep-b`, `.pel-hlts` en
  `src/pelota/hud.js`) son placas inclinadas que entran barriendo (`scaleX` de un pseudo-elemento) y el texto detrás, en
  cascada; solo se animan `transform` y `opacity`. El color del bando va en `--pc` (`c-azul`, `c-rojo`). Los colores, los
  del juego: morado noche, magenta, azul y el oro de los highlights; de la referencia (FC Mobile) se toma la forma y el
  movimiento, nunca su verde ni su web. Al acabar cada partido, los highlights (`finPartido` → `verHl` → `sigHl` en
  `match.js`): los tres mejores tantos según su nota (`guardaHl`), del tercero al primero, cada uno con su rótulo grande;
  empiezan 2,4 s después del «¡Tanto y partido!», que se quita antes. Prueba: `tools/pelota-highlights.mjs`.
- **Las rayas de la cancha, perfectas a cualquier distancia** (el autor, 17 de noviembre de 2026, con una captura del
  iPhone: «Las líneas del frontón se difuminan. La línea tiene que ser perfecta»). Las rayas del suelo no se pintan en la
  textura (vista tan de lado y a la mitad en el móvil se emborronaba): se calculan en el sombreador del suelo
  (`court.js rayasNitidas`), cada píxel con su distancia exacta a la raya, suavizada solo un píxel y nunca más fina que
  algo más de un píxel. Cuadros, falta y pasa, contracancha, fondo y la raya del 4½ (`uCuatro`). Cualquier raya nueva en
  el suelo, ahí; nada de rayas pintadas en texturas que se vean de lado.
- **La carga del golpe se nota de verdad** (el autor, 17 nov: no notaba la diferencia entre un toque y mantener al 100 %).
  En `game.js strike`, golpe normal: un toque sale lento (lo justo para llegar al frontis desde donde se pega) y bota
  hacia el cuadro 3; al 30 %, el 4; a medias, el 5; al 75 %, el 7; a tope, el 9 o el rebote. Quien recibe un pelotazo
  lo controla peor (`quality`, `this.ultimo`) y uno flojo, mejor. Y se ve y se oye: estela según la velocidad
  (`court.estela`), temblor de cámara desde el 70 % y, al 100 %, una pausa de impacto (`match.parada`). Para medirlo:
  `node tools/pelota-fuerza.mjs` (velocidad, frontis y bote por carga y zona) y `JUEGA=150 node tools/pelota-rayas.mjs`
  (partido solo, sin dibujar, buscando errores).
- **Los movimientos de pelota salen de vídeos de pelotaris de verdad** (el autor, 17 nov: los de las bibliotecas
  «intuyen el golpeo, pero no son iguales que en la pelota vasca»). Cadena: `tools/pose-video.mjs` saca el esqueleto
  fotograma a fotograma con el mismo MediaPipe del juego (en la vista de la tele, `SEGUIR=azul,rojo` sigue a cada
  pelotari por el color de la camiseta y busca en un recorte ampliado); `tools/pose-dibuja.mjs` lo pinta encima para
  comprobarlo; `tools/pose-golpes.py` encuentra los golpes (la mano que más corre respecto a la cadera), con su mano,
  altura y tramo; `tools/blender/pose-a-esqueleto.py` pasa ese tramo al esqueleto mixamorig (bisagra en codo y rodilla,
  pies al suelo) y exporta la acción y su render. Rinde mucho mejor un vídeo cercano (entrenamientos) que la tele:
  ahí los brazos tiemblan. El resultado es la referencia sobre la que se afina en Blender el movimiento de Meshy.
  De espaldas a la cámara la profundidad es ambigua (el autor, 17 nov: «hace posiciones bastante raras»): el paso al
  esqueleto toma la forma de la imagen y la profundidad de la longitud de cada hueso, y aplica reglas del cuerpo (giro
  del pecho limitado, rodilla que sólo dobla hacia delante, cabeza derecha de espaldas, marcas fuera de la imagen
  descartadas). Con `MODELO=` el modelo grande de MediaPipe, más preciso. Detalle en `investigacion/movimientos-reales/`.
- **La txapela es lo más importante de la pelota** (el autor, 17 de noviembre de 2026: «que te pongan la txapela es el
  mayor honor del mundo; tiene que estar sí o sí»). Al acabar la final de un campeonato, después de los highlights, la
  entrega en el frontón (`src/pelota/ceremonia.js`, lanzada desde `match.js ceremonia`): el podio de cajones blancos
  delante del frontis (1 en medio, 2 a su izquierda), cada uno con su copa de plata bien agarrada (el puño cerrado,
  `dedos.js`; el finalista con `agarrar.js`), la txapela que baja en primer plano y se posa a la medida de la cabeza, el
  «¡Txapeldun!» en ese momento con el diálogo de Mikel y Edurne, el campeón que levanta la copa (solo él), confeti
  dorado, la familia y los amigos en la cancha (vecinos con ropa de calle teñida, `npcOutfit.js`; casi todos del color
  del campeón y ninguno del rival) y el rótulo de retransmisión. La medida de la cabeza sale de la figura (lo más alto
  de la caja del personaje), no del esqueleto: en los pelotaris la cabeza es mucho mayor que su esqueleto. Las clases
  del rótulo llevan el prefijo `pc-`: `.rotulo` ya es el cartel del pueblo (`ui/rotulo.css`). Tras ella, el campeonato
  no repite la celebración plana de `ui/champion.js` (`r.ceremonia`). Pruebas: `tools/pelota-ceremonia.mjs` (fotos) y
  `tools/pelota-ceremonia-video.mjs` (vídeo con sonido, fotograma a fotograma con el reloj parado).
- **El personaje del jugador no se reproporciona**: el explorador, la exploradora y el pelotari son el mismo personaje
  y no están en `CABEZA` (`glbChar.js`); al achicarle la cabeza al explorador el cuerpo le crecía y dejaba de parecerse
  al pelotari.
- **Contraste del rosa**: el magenta vivo (`#ff2bd6`) con letra blanca no llega a 4,5:1. En los fondos con texto (botones
  principales, rótulo de la final, el bando colorado del marcador) va el degradado `#d0189f → #a51ee0 → #6a2ff0` y el
  colorado `#d81a72 → #a8125c`; el magenta vivo queda para filos, barras y detalles sin texto encima.
- **Movimiento: un solo sistema** (`src/ui/motion.css` y `src/ui/motion.js`; noviembre de 2026, fase 1 del rediseño de
  la animación). Las curvas y los tiempos de todo el juego están en un sitio, como variables de `:root`: `--ease` para
  entrar (rápida al empezar y se posa), `--muelle` para abrirse (un pelo de sobrepaso), `--sale` para cerrar, `--anticipa`
  para confirmar (recula antes de ir) y `--vaiven` para ir y volver; y un tiempo por familia: `--d-toque` 90 ms,
  `--d-encima` 200, `--d-entra` 300, `--d-panel` 380, `--d-pantalla` 450, `--d-rotulo` 600 y `--escalon` 30 entre una
  tarjeta y la siguiente. Antes cada hoja escribía sus curvas y el menú del juego tenía las suyas solo para él; ahora las
  hojas usan las variables. Reglas: solo se anima `transform` y `opacity` (y algún `filter`), nada que recoloque lo de
  alrededor (ni `top`, ni `left`, ni `width`, ni `letter-spacing`); lo que sale va más deprisa que lo que entra; por
  capas, primero el marco y luego lo de dentro en cascada; y con «reducir movimiento» del sistema los tiempos se quedan
  en 1 ms, `style.css` apaga las animaciones y `motion.js` no anima nada. `motion.js` tiene las piezas comunes, con la Web
  Animations API: `entra`, `sale`, `cascada`, `cambiaPantalla`, `desdeAqui` (deslizar algo desde donde estaba, la
  técnica FLIP), `cuenta` (un número que sube) y `relieve` (el fondo que sigue al ratón, por capas, con `--px` y `--py`).
  Ya lo usan: el cambio de sección (`hub.js`, `go`), que llega en cascada desde el lado de la sección a la que vas (Q y E,
  la de al lado; `rise` con `--rise-x`, y `.hub-main.cambia` jugando, porque dentro del juego la cascada estaba apagada y
  el contenido cambiaba de golpe); el botón de tu retrato, que se desliza con `transform` al abrir o cerrar una sección
  (antes con `top` y `left`); el nombre de la sección, que se asienta con un fundido corto (antes abría las letras); y el
  fondo de la portada, que sigue un poco al ratón. Lo que queda con `top` o con anchos: la pastilla de las pestañas
  (fase 5) y los puntos de la galería (fase 3).
- **Rótulos de televisión** (`src/ui/rotulo.js` y `rotulo.css`; fase 2 del rediseño de la animación). Un rótulo para
  los momentos con nombre, sobrio, como los de una retransmisión: una línea de color que se dibuja de arriba abajo, el
  antetítulo que entra deslizándose, el título que sube desde detrás de una máscara (su caja corta lo que sobresale) y
  los datos debajo, uno detrás de otro; las cifras cuentan hasta su valor (`cuenta`, motion.js). Uno a la vez, sin recoger
  toques y anunciado a los lectores de pantalla. Con una ventana abierta encima del juego (la pausa, el cuaderno, el mapa:
  `body > .screen`) no se ve; antes iba por encima y, abriendo la pausa nada más llegar, tapaba sus botones. Va en el centro, debajo de la línea de los avisos, y tan ancho como pida
  su texto, hasta 560 px, pero nunca más estrecho que su ancho mínimo: 460 px en el ordenador, 420 en el móvil tumbado,
  con el nombre algo más grande, y de borde a borde de pie; con un nombre corto como Elizondo se quedaba en 190 px y al
  autor le parecía muy estrecho (noviembre de 2026). `coloca`, en rotulo.js: si a su altura le queda al lado la barra de misiones o el minimapa,
  se estrecha lo justo para no llegar a ellos, pero solo si así le cabe el texto entero; si no, baja hasta
  debajo de ellos y usa todo el ancho. Antes tenía un ancho fijo pensado para lo peor (en el móvil tumbado, la pantalla
  menos 380 px): en un iPhone pequeño se quedaba en 287 px, la comarca se cortaba con puntos suspensivos y pisaba la barra
  de misiones en dos filas; de pie pisaba el minimapa (noviembre de 2026: el autor vio los nombres muy estrechos). Sale al llegar a un pueblo (la comarca
  encima, el pueblo y sus misiones; la primera vez en una comarca, «Nueva comarca», en amarillo), en la cima (su nombre,
  la altura que cuenta y la dificultad de 1 a 4 con puntos), con cada pueblo que se ve desde la cumbre (hacia dónde queda
  y a cuántos kilómetros), con la misión siguiente (en el color de su categoría) y al llegar al destino. Los avisos de
  siempre siguen para lo que hay que hacer («Habla con…», «Busca la exclamación amarilla»). En el partido de pelota no se
  usa: allí los rótulos son otros y van con un fundido corto, como pidió el autor. Los títulos de las secciones del menú
  se destapan con una máscara de izquierda a derecha (`mascara`, un `clip-path`) y el antetítulo de las cabeceras entra
  deslizándose (`rotDesliza`), también dentro de la ventana del juego.
- **Tipografía cinética** (`src/ui/cinetica.js` y `cinetica.css`; noviembre de 2026, con el encargo de motion graphics del
  autor). Los títulos entran letra a letra (`cinetica`): cada palabra en su caja, que no se parte, y cada letra con su
  retraso, como mucho medio segundo para el título entero. Tres maneras: `sube` (los títulos: desde abajo, con un pequeño
  giro y un rebote corto), `junta` (los antetítulos: las letras llegan separadas y se juntan, como al cerrar el espaciado)
  y `cae` (los nombres grandes: desde arriba y algo más grandes). Con texto en degradado (`.degradado`, el nombre de la
  pantalla de carga), la caja de cada letra se alarga .3em por arriba y .14em por abajo con márgenes negativos que la
  dejan ocupando lo mismo: el degradado solo pinta dentro de la caja y, con el interlineado justo, la tilde de la Ñ, los
  acentos y la diéresis quedaban fuera y no se veían («SEÑORÍO» salía «SENORIO»). El propio `.ld-name` hace lo mismo. El texto queda en `aria-label` y las letras, ocultas a
  los lectores de pantalla; con «reducir movimiento», nada. Van en los títulos y antetítulos de cada sección del menú, de
  la comarca y de su pueblo (`titulosCineticos`, desde `hub.js`), en el nombre de la sección de la cabecera de la ventana,
  en la pantalla de carga (el nombre cae con su degradado, `degradado`, y la comarca se junta) y en el rótulo de la tele:
  el antetítulo se junta, un barrido de su color cruza el título y, al recogerse, las letras suben desde detrás de la
  máscara; al irse, salen hacia arriba una detrás de otra. En el partido de pelota, no: allí el autor quiere los rótulos sobrios.
- **Cartas vivas** (`ui/motion.js`: `cartasVivas`, `continuidad`, `inercia`; `ui/cartas.css`; fase 3 del rediseño de la
  animación). Con ratón, la carta que tiene el puntero encima se inclina un poco hacia él (`--rx`, `--ry`, en la regla
  común de `identidad.css` y en la del menú de `consola.css`; sin ratón valen 0), una luz suave la sigue (`.luz`, un brillo
  blanco muy flojo) y su imagen se mueve al revés (`--px`, `--py`). La ventana que abre una carta nace de ella: se apunta
  dónde estaba la carta tocada y, si en menos de 0,7 s se abre una ventana (`.mg-overlay`) o el visor de láminas, su
  recuadro sale de ese sitio y tamaño hasta el suyo (FLIP). La carta nueva (la ventana con la cinta «Nueva carta») se
  destapa: su imagen pasa de apagada y en gris a su color y la cinta entra con impulso. Las filas de cartas (`.lam-rail`,
  `.figuras.rail`, `.rail`, `.cstrip`) se arrastran con el ratón y siguen con la inercia al soltar, sin el imán de las
  cartas mientras tanto; al acabar, se asientan en una (con el dedo ya lo hacía el navegador); un arrastre no abre la carta.
  Las cascadas de entrada van con «backwards»: con «both», la animación acabada seguía mandando sobre el transform y las
  cartas no se inclinaban.
- **Cifras que suben y barras que se llenan** (`ui/motion.js`: `cuentaTexto`, `contadores`, `CIFRAS`; fase 4 del rediseño
  de la animación). Al abrir una sección, las cifras que se ven de entrada suben desde 0 hasta su valor (como mucho 24, en
  0,9 s, rápidas al principio y despacio al llegar): lo descubierto de cada colección («7 de 43»), la media y las
  cualidades de la ficha del personaje (también al cambiar de chico a chica), y en el Perfil tu nivel, tu experiencia, tus
  sellos, misiones, cartas y cimas. Solo cambia el trozo de texto con el número; el resto y los iconos quedan. Las barras
  (las cualidades, `.sbar`, y tu experiencia, `.xp`) se llenan estirándose con `transform: scaleX` desde la izquierda;
  antes animaban su ancho. El nombre «MENDI SCORE» no se usa en ningún sitio.
- **Pestañas y ventanas con profundidad** (fase 5 del rediseño de la animación). La pastilla de las pestañas (`.fl-ind`,
  `hub.js`, `pastillas`) se pone de golpe en la pestaña elegida y se desliza desde la de antes solo con `transform`: a mitad
  de camino cubre las dos, de un borde al otro, y así se estira y se recoge como antes, cuando animaba sus bordes, su
  altura y su posición. Con una ficha o el visor abiertos encima, la ventana de la sección de detrás se hunde un poco
  (97,5 %) y se apaga (55 %), y vuelve al cerrarlos; la ventana entra con «backwards» para que su animación acabada no
  mande sobre ese transform. Siguen como estaban: el menú que crece desde tu retrato, los botones que ceden al pulsar y
  las secciones de al lado con Q y E.

- **Tarjetas de comarca y ficha del pueblo del mapa** (noviembre de 2026, con el diseño de los rótulos). Las tarjetas de
  abajo (`.m3-chip`, `hub/inicio.css`) son postales desde el 12 de noviembre de 2026 (al autor no le gustaban nada; el
  tamaño, sí): la foto de la comarca ocupa toda la tarjeta, de borde a borde, con las esquinas de los paneles (10 px).
  Desde el 13 de noviembre de 2026, encuadrada con los datos de `laminas.js` (`encuadreComarca`: el explorador entero de alto
  y con su centro a `--tx` del ancho, 62 % y 76 % en el móvil tumbado), llenando siempre la tarjeta (nunca se sale por los
  lados: `clamp` en `left`), sin bordes fundidos ni copia desenfocada detrás; el velo de detrás del nombre, fino, sin
  desenfoque y como mucho al 55 %. Hasta el 13 de noviembre de 2026 los bordes se fundían sobre la misma portada
  desenfocada (`.m3-fondo`) y el velo llegaba al 82 %: el autor lo veía duro y sin sentido. En el ordenador y la tableta (desde 761 × 521),
  menos y más grandes, en el 16:9 de la foto, que sale entera y sin fundir, con el nombre encima (`--cw`, de 220 a 396 px:
  unas tres y media a la vista de 1024 a 1920; antes, cinco y media casi cuadradas). Se ve que es un carrusel: la
  siguiente asoma cortada, los bordes de la fila se apagan un poco, hasta el 45 % y nunca del todo (`--fi` y `--fd`, que se apagan en cada punta con `.rail-ini`
  y `.rail-fin`) y a los lados hay flechas (`.m3-fl`, `pasa` en `inicio.js`) que pasan las tarjetas que se ven enteras
  y dejan la anterior asomando 64 px por la izquierda. `--railh`, lo que ocupa la fila, sale de `--cw`; las tarjetas de
  las colecciones siguen con `--chw`. Encima, sobre un velo oscuro de muchos pasos,
  sin raya, que sube desde abajo (en el móvil tumbado, un óvalo desde la izquierda), el nombre y una barra con
  un tramo por sello (`barraSellos` en `inicio.js`, `.m3-pr`; los conseguidos en dorado) con la cuenta al lado; en el
  móvil tumbado, solo la cuenta, sin la palabra «sellos». La terminada lleva la marca amarilla con el check verde
  (`.m3-hecha`); la elegida, el borde blanco y una raya de su color abajo. Antes la foto iba dentro, separada 4 px del
  borde, con el sello redondo de la comarca encima y los sellos en una pastilla. En el móvil tumbado siguen midiendo
  220 × 64 px y en el ordenador, 202 × 175. Con
  ratón, se inclinan y llevan la luz de las cartas vivas (están en `CARTAS`). La ficha del pueblo (`.m3-ft`) también va a
  10 px (antes 4 px), con la raya de color de arriba curvada con sus esquinas, y su caja de misiones a 6 px. En
  `neon.css`, las dos están en la lista de los paneles.
- **Botones táctiles del pueblo** (`.cbtn` de `style.css`: correr, saltar y actuar; noviembre de 2026). Redondos y planos:
  sin el canto de 5 px de abajo, que los hacía parecer más altos que anchos, ni el anillo rosa del de actuar; solo una sombra
  muy suave alrededor, sin bajar, para que se separen de un suelo claro. Al pulsar ceden hacia dentro (`scale`). En
  `neon.css`, `.cbtn.big` lleva lo mismo con `!important`.
- **Portadas de la comarca y del pueblo** (`.pt-marco` de `hub/fichas.css`; noviembre de 2026). La lámina acaba con un borde
  limpio sobre la ficha, con una raya clara de 1 px. Antes se fundía con la ficha en los últimos 60 px y, como el pie de
  las láminas suele ser oscuro, quedaba una franja sucia que no gustaba. Los lados de la lámina estrecha siguen
  apagándose hacia fuera.
- **Cabecera de las secciones en la ventana del juego** (`#hub.juego .hub-main::before`, `hub/consola.css`). La franja de
  arriba es opaca en todo su alto y solo se funde en una tira de 12 px por debajo: antes era opaca solo en su mitad de
  arriba y, a la altura de los nombres de las secciones, se veía pasar por detrás lo que bajaba.
- **Cultura de la comarca** (`.cm-cult .cult`, `hub/fichas.css`). Las piezas sin ilustración llevan el icono pequeño junto al
  antetítulo y, debajo, el título, el texto y el sitio a todo el ancho de la pieza (el `div` de dentro va con
  `display: contents` para que sus partes entren en la rejilla de la pieza); el sitio, al pie, tras una raya fina. Antes
  el icono ocupaba una columna entera y el texto, estrecho, se partía en muchas líneas y dejaba mucho aire.
- **Casillas de las misiones del pueblo** (`#misiones` de `style.css`, arriba a la izquierda; noviembre de 2026). Cada
  icono va sobre un fondo sólido del color de su categoría (46 % del color sobre morado oscuro; hecha, 78 % con su marca;
  la que sigues, un aro blanco por dentro con `box-shadow`, porque los botones no llevan borde: `neon.css`). El panel
  que las recoge, casi opaco (90 %). Antes, con el 16 % del color, se veían apagadas y casi transparentes sobre el pueblo.
- **Placas de la pantalla VS** (`pelota/vs.js`, también la usa el fútbol; noviembre de 2026). Cada jugador tiene una sola
  placa con las esquinas de los paneles (10 px) y, dentro, separada 5 px del borde, su media en una caja clara de 6 px y
  al lado el nombre, el pueblo y las cifras. Antes eran dos cajas sueltas, la blanca montada 6 px sobre la oscura. Como
  carta de jugador, lleva un filo de 1 px del color de su bando. «Toca para empezar» es una pastilla dentro de la franja
  de abajo, con su margen (`.pvs-tap` ya no está en la lista de 6 px de `neon.css`).

- **Fidelidad a los pueblos de verdad** (regla del autor, noviembre de 2026; va por delante de cualquier mejora):
  - Los pueblos y las ciudades mantienen su estructura: las mismas calles, las mismas plazas y el frontón, la iglesia
    y los monumentos en su sitio (`src/data/reales/`, de Overture Maps y OpenStreetMap). Ninguna mejora de arte, de
    exploración o de retos mueve, quita ni inventa calles, plazas o edificios señalados.
  - Lo que no existe se puede hacer a nuestra manera, pero lo más fiel posible al lugar y sin alterar el trazado: va
    en sitios libres (la atalaya y las kutxas de la aventura) o en escenas aparte (los frontones cubiertos de los
    campeonatos, que no sustituyen al frontón del pueblo).
  - La arquitectura es la de verdad: si una iglesia es románica, románica; si es gótica, barroca o de otro tipo, la
    suya (`style` de `church` en `data/levels.js`). Antes de añadir o cambiar un estilo, una planta o un edificio se
    busca, se contrasta con fuentes fiables y se anota de dónde sale; si no se puede contrastar, se pregunta.
- **Máxima resolución y definición:** todo lo que sale en el juego, con la máxima resolución y definición para la pantalla
  donde se ve (contando su densidad y su tamaño). Un vídeo o una animación que se estiraría no sale: va la imagen fija, de
  más resolución (`basta` en `ui/videos.js`; las imágenes suben solas a su copia grande con `web/hd.js`).
- **Rendimiento ante todo:**
  - Lo estático se funde por material (`mergeGeometries`, `mergeByMaterial`).
  - Lo repetido va instanciado (público, banderines, ventanas…).
  - Cada animal y cada vecino es una sola malla con piel.
  - Las animaciones lejanas se actualizan a saltos.
  - Los iconos 3D se hornean a WebP.
  - Sombras y contornos solo de cerca: en calidad alta, vecinos a 28 m y animales a 35 (contorno 26); en la media, 20, 24
    y 20 m; aligerado, 20, 20 y 16 (`sombraPersonas` en `actors/people.js`, `Fauna` en `actors/animals.js`). En la baja,
    la del móvil, no hay sombras de verdad: solo la redonda (`util/blob.js`).
  - `visible` siempre con verdadero o falso, nunca con lo que dé un `||`: three.js solo esconde con `false`, y con
    `undefined` dibuja. Así se colaban los 50 animales del pueblo y las ardillas a cualquier distancia (130 mil triángulos
    en cada imagen); ahora, `!!a.pinVisible` y `!!this.farView` en `actors/animals.js`.
  - Las máquinas paradas del campo, con rueda sencilla a más de 60 m (`ruedaLejos` en `world/agro.js`: 170 triángulos
    en vez de 1.000 a 1.300). El género del mercado, solo a menos de 90 m de la plaza (`Mercado.cerca`); la madera y los
    toldos se ven siempre. Los frutos de las matas de la cosecha, de ocho caras.
  - Las mallas de tractores, cosechadoras y ruedas, compactadas al hacerse (`compacta` en `world/agro.js`): con índice, la
    normal en `Int8×4` y el color en `Uint8×4` normalizados (alfa 255); sin color las de pintura y cristal. En Tudela, de
    32 a 27 MB en la puerta.
- **Botones en pleno partido:** responden al levantar el dedo (`tap` de `util/tap.js`), no al clic. En el iPhone,
  mientras el partido cambia la pantalla sin parar, Safari a veces se traga el clic: la X de la pelota no dejaba salir.
  Lo usan la X y las ventanas de la pelota, y la pausa, la cámara, la ventana de pausa y la final del fútbol. Con el
  teclado y desde el código (`boton.click()`) vale el clic de siempre.
- **Nada atraviesa nada:** ni personas, ni animales, ni objetos pasan a través de paredes, muros, barandillas,
  asientos o escalones; todo tiene que tener sentido a la vista. El público sentado (`crowd3d`, sitio = pies) ocupa unos
  52 cm por delante del centro del asiento con las rodillas y los pies: el asiento va al fondo de su escalón y la grada
  dice cuánto se adelanta la figura (`court.sitAdelante`: 0,08 en butacas con respaldo, 0,3 en bancos corridos al
  borde). Delante de la primera fila, nada que los pies puedan cruzar. Para mirarlo de cerca: `tools/grada-ver.mjs pueblo`.
  Tampoco la cámara: la del mapa del inicio sube por la ladera antes de entrar en el relieve (`tools/mapa-dron.mjs`).
- **El límite del iPhone, antes de nada:** cada cosa nueva que se pida se mide con el perfil del iPhone
  (`tools/presupuesto-pueblo.mjs`: en la puerta, hasta 900 mil triángulos, 520 dibujos, 80 MB de texturas y 35 MB de
  búferes en un pueblo; 760 mil, 490, 65 y 35 en un partido). Si va a pasarse, se avisa al autor antes de hacerla, con
  lo que costaría y qué se podría quitar a cambio. Nada de vistas del pueblo entero desde lo alto.
- **Entrar en un pueblo:** siempre la carga entera con su portada y, al acabar, ya en el pueblo detrás del jugador
  (`main.js`, `play`). Sin intros desde el aire: ni zoom del mapa al darle a jugar, ni vuelo de llegada al pueblo, ni la
  intro de Otsagabia. En el iPhone, el pueblo entero visto desde lo alto pasaba del presupuesto y se perdía la imagen
  (Leitza, octubre de 2026). Al frontón, sin vuelos de cámara (`game/llegadas.js` solo quita el velo con el partido ya
  montado): el vuelo de la final en el Labrit, la grúa del cubierto y la bajada a la plaza, con su cartel (`ui/vuelo.js`),
  se quitaron, y también la presentación a oscuras con los focos que buscaban a los pelotaris (`pelota/show.js`), a
  petición del autor (noviembre de 2026). La final tiene su propia entrada (`pelota/granFinal.js` y `granFinal.css`),
  como la cabecera de una retransmisión y toda en la página, sin nada nuevo en la escena 3D: sobre el frontón oscurecido,
  con el público en pie detrás, entran «GRAN» y «FINAL», cae la txapela, llegan las cartas de los dos finalistas (el azul
  por la izquierda y el colorado por la derecha), salta el «VS» y cae el confeti; se va sola a los 6,4 s o al tocar, y
  de ahí al sorteo, sin la pantalla VS, que ya los ha enfrentado. Se prueba con `tools/labrit-final.mjs`. Se
  aparece siempre a las afueras, pasadas las últimas casas y mirando al pueblo, con el perro al lado y, unos pasos por
  delante, el cartel con las direcciones y la guía de la primera misión (`townGame.js`, al final de `spawn`). La primera
  vez, por la entrada principal; con misiones ya hechas, por la salida del pueblo más cercana a quien da la siguiente,
  mirando hacia él. La llegada la busca `levels/townReal.js` («La llegada: a las afueras») cuando ya sabe qué casas se
  levantan: en una carretera o calle que sale del pueblo, de 15 a 45 m de la casa más cercana, con casi ninguna más
  allá, en llano y lejos del agua; una por cada lado del pueblo en `PLACES.entradas`, la mejor por carretera. Antes iba a
  unos 110 m de la plaza y el núcleo del pueblo la abrazaba con 40 m de margen, así que siempre caía entre casas (en
  Puente la Reina, 31 a menos de 40 m), y con misiones hechas se aparecía en mitad del pueblo (noviembre de 2026). Los lienzos cuyos píxeles se leen van
  con `willReadFrequently`: en la tarjeta gráfica, la lectura espera a todo lo pendiente. En la carga, la descripción y
  el consejo van enteros, sin cortar (`tools/carga-textos.mjs`).
- **Colecciones por descubrir:** jugando, naturaleza, personajes, escudos y leyendas salen bloqueados (imagen apagada,
  candado, «¿?» y una pista de dónde encontrarlo) hasta que salen en pantalla en el juego (`game/coleccion.js`, `visto`).
  Lo descubierto se apunta como carta (`fauna:`, `flora:`, `armas:`, `cuento:`, `personaje:`, `figura:`). En el material
  didáctico, todo abierto.
- **Frontones clásicos:** de plaza, con su grada, y junto a la iglesia o el ayuntamiento (`ESTILO_TOWN` de
  `game/fronton.js`). El de la calle, entre casas y sin grada, no se usa: no gustaba.
- **Pelota, cansancio y descansos:** lo que cansa es esprintar (dejadas y cortadas que hacen correr); entre tantos se
  recupera poco. Descansos de un minuto como el reglamento de la Federación Navarra (cinco por lado a 22 tantos, en
  proporción en los cortos), pedidos con el botón Descanso o la tecla R para el próximo parón; el rival los pide cuando va
  fundido (`pelota/game.js`, `EN` y `DESCANSO`). En los partidos, solo los rótulos de al aire, al rebote y los pelotazos. El del golpe (`golpe` de `pelota/hud.js`, `.pel-golpe`) va justo debajo del marcador, con el borde derecho del marcador y la pausa juntos (`--pg-y`, del alto del marcador; noviembre de 2026: iba a 50 px fijos del borde de arriba, debajo de la pausa y montado sobre las barras de energía).
- **Sorteo del saque:** la chapa es de verdad, en 3D, en la cancha (`pelota/chapa.js`, `Chapa3D`): gira de canto, sube
  dando vueltas y cae con la cara que saca hacia arriba y el texto derecho para la cámara, que la sigue (`tossCam` de
  `pelota/match.js`). Encima, solo el título y, a cada lado de la chapa, la carta de cada pelotari, la misma de la
  presentación (`cartaDe`, `ui/sportCard.js`), del alto que quepa bajo el título (`--tw`), con su color y sus temporadas
  debajo; de pie, las dos abajo, una junto a otra. La que saca se levanta y la otra se apaga. Antes, una tarjeta con la
  figura de cuerpo entero asomando, que el autor pidió cambiar por las cartas (noviembre de 2026).
- **Sin propiedad ajena:** nada de personajes o logotipos de terceros. Solo recursos propios o con licencia CC0
  (las licencias están junto a los recursos, en `src/assets/*/LICENSE_*`).
- **Textos:** se escriben en castellano; el traductor (`i18n.js` + `data/eu.js`) los pasa al euskera.
  - Diccionarios: `data/eu.js` y `data/eu-mas.js` (con sus plantillas: pueblos, misiones, montes, fechas, tienda), y los
    generados `data/eu-armas.js` (escudos, saberes, edades) y `data/eu-oficios.js` (oficios, misiones, montes, comarcas,
    folclore, tienda y mochila). Lo que ya estaba traducido no se pisa.
  - Estos cuatro diccionarios van en su propio archivo y solo se cargan al jugar en euskera (`loadEU` en `i18n.js`;
    `startI18n` los espera antes de traducir). En castellano no se descargan.
  - Los textos que cambian a cada momento (objetivo, reloj, distancia, avisos de deporte) guardan en el elemento lo
    último que se escribió (`el._t`) y no se reescriben si no cambia: en euskera el elemento ya tiene la traducción y
    compararlo con el castellano haría que se reescribiera y se tradujera en cada fotograma.
  - Si un texto junta varias frases ya traducidas («Aspecto. Costumbre.», «Presentación. Altitud: …»), se traduce por
    partes. Una lista «A, B, C» se traduce si lo están todos sus elementos (`EU_RX_LISTA`, la última plantilla).
  - Lo que lleva `data-notr` ya va traducido y el traductor no lo toca: el diálogo se escribe letra a letra ya en
    euskera y, al acabar, deja el castellano para que el botón «Itzuli» pueda enseñarlo.
  - Con números, singular y plural: «1 sello», «2 sellos» (`cnt` en `hub.js`); nunca «1 sellos».
  - Los saludos de los vecinos van a la hora y con el tiempo de ahora (`game/saludo.js`): «Egun on», «Arratsalde on»
    o «Gabon», y nadie dice «qué día más bonito» si llueve o nieva.
  - Las opciones en euskera de la pregunta de los vecinos (`notr` en la línea del diálogo) no pasan por el traductor.
- **El tiempo con lógica:**
  - Bajo techo no cae nada: en los partidos (fútbol y pelota) y con `sky.indoor` (frontón cubierto y dentro del Labrit),
    la lluvia y la nieve no se ven ni hay rayos nuevos (`Weather.update(…, hold)`).
  - Las caras de dentro de un frontón con cubierta o cerrado no llevan chorreones de lluvia (`weather(…, dry)` en
    `pelota/court.js`).
  - Si en un frontón abierto nieva, se dice «Suelo con nieve» y no «Llueve» (`cond.snow`).
  - Con lluvia o nieve no salen mariposas ni luciérnagas (`fauna.wet`).
- **Animales en su sitio:** `Fauna.add` (`actors/animals.js`) los pone en un sitio libre, seco y sin otro animal encima;
  si no lo hay cerca, busca el más próximo en espiral. Un animal que saliera en el río ya no salía: el muro o la orilla
  son más altos que el paso que dan. Quien los recoloque después, como los corrales de la feria, tiene que separarlos
  igual y llamar a `sync()` para que su cuerpo, que choca, vaya con ellos. `resolve` (`world/colliders.js`) separa
  también dos cuerpos que caen justo en el mismo punto.
- **Aire antes que caber:** se puede desplazar. Mejor elementos con espacio, que se entiendan, y colocados en filas
  horizontales que todo apilado en columnas estrechas para que quepa sin desplazar.
  - Torneos (`s_sports`): una carta por fila, ancha, con su portada: la lámina del protagonista en acción
    (`dep-pelotari` y `dep-futbol`), a todo color, pegada a la derecha y fundida con el fondo (en vertical, entera arriba).
    A la izquierda, en una columna, el rótulo con tu marca a su derecha, el título y el texto; abajo, a la altura de los pies de la figura, lo elegido (el frontón o tu club)
    en una caja y el botón «Jugar» al lado: primero se elige y luego se juega. Las cajas miden lo mismo en las dos
    cartas, así los botones quedan uno encima del otro. La caja del frontón abre la lista de los 31 frontones por
    comarcas (`frontonPicker`); al elegir, cambia la caja sin volver a pintar la pantalla. En el iPhone tumbado con la
    barra de Sitecase (844 × 312) cada carta cabe entera. En vertical, el texto y la figura arriba y la elección y el
    botón debajo, a todo lo ancho.
  - El triángulo de jugar va en blanco con su relieve sobre los botones fucsia (`img.i-play` en `style.css`; cada
    icono 3D lleva la clase `i-<nombre>`).
  - Mochila: cabecera en una fila con «Cerrar» a la derecha, como «Salir» en la tienda. Debajo, una franja por cosa
    (perro, agua, comida y equipo), con el rótulo a la izquierda y lo suyo en fila, 24 px de aire y una raya fina entre
    franjas. La comida y el equipo, en filas que se deslizan. Los iconos, a su tamaño de siempre. Los botones del perro van
    juntos: si no caben junto al selector, bajan los dos a la fila de abajo.
  - Pantalla de carga (`showLoading` en `ui.js`): retícula de dos columnas en proporción áurea, con los mismos márgenes
    en los cuatro lados y un mismo hueco entre columnas y filas. A la izquierda el pueblo, su comarca, su presentación
    y sus misiones; a la derecha su lámina entera. Debajo, el consejo bajo el texto y la barra bajo la lámina. Todo el
    bloque centrado y, de fondo, la misma lámina desenfocada.
- **Láminas** (`data/laminas.js`, `ui/laminas.js`, `src/assets/laminas`): las ilustraciones del explorador que ha hecho
  el autor. Cada pueblo tiene su portada (su monumento) y otras de sus leyendas, oficios, cosechas, animales y fiestas;
  las comarcas, sus paisajes. Se ven en la carga, en la ficha y la tarjeta del pueblo, en la cabecera de cada comarca,
  en los cuentos que no tengan su ilustración propia, en el taller de cada oficio, en Torneos y en el álbum (Más · Láminas), en tiras que se deslizan de
  lado y con un visor a pantalla completa. Van en WebP, que lee cualquier iPhone: en AVIF, algunos visores no las
  enseñaban. En la web van todas, a 1280 × 720 y con copia de 640 × 360 para tarjetas (tools/laminas-pequenas.mjs) y
  grande de 2560 × 1440 (`src/assets/laminas/grande`, alias `@laminas-big`): el autor las entregó a 1280 y, a pantalla
  entera en un móvil de densidad 3 o en un ordenador (el inicio, la cabecera de la comarca, el visor), se veían
  pixeladas; las grandes salen de las de 1280 ampliadas al doble con Real-ESRGAN (tools/laminas-grandes.mjs) y solo
  las pide la pantalla que las necesita, con el mismo mecanismo de `src/web/hd.js` que usa el archivo único (en la web,
  `hdTable` con la tabla de las grandes). En el archivo único, a 640 × 360, solo las que se ven fuera del álbum (alias `@laminas` de `vite.config.js`). Con
  conexión (en el móvil, la tableta o el ordenador), el archivo único cambia cada imagen que en pantalla se ve más grande
  de lo que mide por la de la web publicada del tamaño justo (`src/web/hd.js`, con la lista `hd.json` que escribe la
  compilación web con los anchos de cada una): láminas, leyendas, cimas, personajes, tradiciones, fauna, flora, iconos,
  escudos, emblemas, sellos, pelotaris y el retrato del perfil; solo las que están a la vista, y sin conexión se queda con
  las de dentro; los escudos de las casas y de los oficios van dentro pequeños (96) y la fachada y la ficha suben a los de 512 de la web (`casaReadyHD`, `hdUrl`). En la web, la
  copia pequeña de cada lámina (`<id>-s`, de 640) sube a la de 1280 o a la de 2560 cuando se ve grande (las tarjetas de los
  pueblos en el móvil en vertical se veían pixeladas). Cuando una lámina se recorta (el inicio en el móvil tumbado, la
  ficha del pueblo, las tarjetas de comarca) se recorta el cielo: el personaje va abajo, con los pies casi en el borde. Todas
  las portadas son láminas (`townCover`, `comarcaCover` y `townImg` en `ui/laminas.js`): el inicio, el fondo del menú,
  las tarjetas y cabeceras de comarca, las tarjetas y la ficha de cada pueblo y la pantalla de carga. En tarjetas y
  fichas se ven enteras, en 16:9; las portadas de las fichas se funden muy poco a poco con el fondo, sin franja desenfocada debajo, y cubren
  siempre todo el ancho (con el personaje lo más al centro que se pueda). Las fotos 3D de antes (el diorama de la comarca
  con el personaje delante) ya no están.
  Las cabeceras de las fichas de pueblo y de comarca (y la del pueblo en el material didáctico) salen de
  `portadaPueblo` y `portadaComarca` (`ui/laminas.js`): con la pantalla tumbada, si la portada tiene panorámica
  (`src/assets/laminas/pano`, solo en la web; `PANO` y `PANO_BOSQUE` en `data/laminas.js`, con el personaje medido a
  ojo), un `<picture>` la pone en lugar de la lámina, tan ancha que llena el marco sin bordes reflejados; de pie, la
  lámina de siempre. Sin panorámica, la lámina llena el marco de lado a lado: si es más estrecha, se acerca hasta
  llenarlo y se recorta por abajo, con la cabeza en su sitio; ya no hay bordes reflejados y desenfocados ni lados
  fundidos (`.pt-esp`, hasta el 13 de noviembre de 2026). En el archivo único no van: con conexión se piden a la web (`hd.json`, grupo `pano`). Orgi, Bertiz
  y los sotos del Ebro tienen ya su portada (antes, la de otro sitio: `BOSQUE_LAMINA` queda para donde falte).
  La pantalla de carga lleva una sola lámina, fija y entera de alto, encuadrada en el personaje (`focoPortada` y
  `focoDe`, de `FOCO` y `ALTO`), sin degradado lateral ni movimiento, con un velo oscuro parejo encima, algo más denso abajo, para que se lea la
  información; el consejo y el pie de la lámina van en recuadros casi opacos. La ficha del pueblo
  en el mapa deja ver la portada (velo ligero) con el nombre en grande; las misiones van en su propia franja oscura. En el
  móvil tumbado es más pequeña, de 300 de ancho, con 14 a 16 de aire por dentro y sin la barra de progreso.
- **Partido de pelota, lo que se ve** (`pelota/hud.js`): arriba a la derecha, el marcador, solo (su fondo, el filete fucsia,
  las esquinas y la sombra son de `.pel-top`, que es quien está en las listas de esquinas y sombras de `ui/neon.css`).
  Arriba a la izquierda, sueltos, tres botones redondos de 48 px (`.pel-rapidos`, 12 de noviembre de 2026, lo pidió el
  autor para ir más rápido): la pausa, que abre la ventana de pausa; el descanso, con los que te quedan en su badge, que lo
  pide sin parar el partido (rosa si está pedido, brilla si estás cansado; en pleno descanso se esconde y la ventana de
  pausa sale sola con «Seguir»); y la pelota, que abre debajo su desplegable del cestaño (`.pr-bhoja`, la pista y una fila
  por pelota; se elige mientras sacas tú). De pie van en columna por el borde izquierdo y la lista de la pelota se abre a la
  derecha; con la cámara de la pelota en casa, a la derecha de su imagen; en la repetición y con un panel delante, no se
  ven. Del 11 al 12 de noviembre la pausa fue el último tramo del marcador, con el descanso y la pelota dentro de la ventana
  de pausa, y no le gustó al autor. En el marcador, cada lado lleva arriba su nombre y sus tantos en su color y, debajo, en el fondo oscuro, una
  sola barra: su energía, en dorado, naranja y luego roja parpadeando al cansarse; por parejas, la media de los dos.
  Delante de la barra, un rayo de su mismo color, para que se sepa que es la energía, en el borde de fuera de cada lado,
  como en espejo (`.ps-ico`). Los dos nombres van enteros y a la misma letra: si uno no cabe, los dos bajan a la vez,
  nunca de 11 px (`nombres`; antes el más largo salía con puntos suspensivos, «MIKEL · NER…»). La
  fuerza ya no va en el marcador: se ve en el aro del botón mientras cargas. En el móvil y la tableta va sin el «A 5 tantos» y más estrecho, para no tapar el frontis, que va en el centro
  de la pantalla; en el ordenador ancho, entero. El menú, con el icono de pausa como el del pueblo, para el partido al
  abrirlo con la mano o con Escape, y lleva todo junto: la pelota, que se cambia mientras sacas tú, el descanso, las
  fichas de los pelotaris y salir del partido. En su badge, los descansos que te quedan; brilla si estás cansado; con el
  descanso empezado se abre solo, con el título «Descanso», y Continuar lo termina, sin parar el minuto. Ya no hay X
  arriba a la izquierda. El menú es la ventana de pausa común a los partidos (`ui/pausa.js` y `ui/pausa.css`; el
  partido de fútbol usa la misma), como la de los juegos de fútbol de referencia que mandó el autor: centrada sobre el
  partido oscurecido, con la cabecera (el título y la equis) y una fila por opción, con su nombre, una línea que dice qué
  hace y un botón redondo del degradado del juego a la derecha; toda la fila se toca y tocar fuera la cierra. La pelota
  del cestaño va en una fila con sus pastillas; con teclado, la tecla de cada opción junto a su botón. En el móvil
  tumbado las filas bajan hasta caber sin desplazar, también con la barra de Safari. Antes era un desplegable bajo el
  botón. El panel del final lleva delante del título el icono del resultado (`pzResultado`): el check del juego si
  ganas y una equis en un aro rosa si no; en fútbol, sin icono en el empate. Los botones de
  golpe llevan el aro de la fuerza. Sin consejos en los partidos, solo el primer medio minuto del peloteo de entrenar.
- **Partido de pelota, la energía y lo que suena** (`pelota/game.js`, `EN`; `pelota/match.js` y `pelota/audio.js`): lo
  que más gasta son las cortadas seguidas, cada una más que la anterior (`racha`, que se enfría pelotando o en unos
  segundos), y esprintar a por una dejada del rival (`EN.caza`). Moverse y colocarse casi no gasta: antes cualquier
  carrera a tope gastaba como un esprint y la barra se quedaba casi vacía todo el partido. Con un jugador de prueba que
  corre siempre a tope (`tools/pelota-gasto.mjs`): pelotando, al sacar le queda en torno al
  90 %; con cortadas seguidas, al 30 %; si el rival solo le hace dejadas, al 20 %. Al cantarse el tanto, acierto o fallo,
  solo se oyen los aplausos: la pelota se calla hasta el saque siguiente (`callada`), la chapa ya no hace su «¡clonc!», la
  repetición va sin sonido y, si la grabación de los aplausos aún no ha llegado, no suena nada en su lugar. El aplauso dura
  de 3 a 5 s, entra con un fundido de algo más de medio segundo y se apaga despacio (`aplauso`; antes entraba de golpe,
  en una décima), y el murmullo de la grada no sube a la vez (los dos juntos sonaban a vibración). Desde el 17 de noviembre
  de 2026, si el tanto lo pierdes tú o tu pareja con un fallo (chapa, fuera, falta, pasa), la grada abuchea en vez de
  aplaudir (`abucheo`, la grabación «Crowd Booing» que pasó el autor: «Abucheos para fallos jugando»), un trozo de unos 3 s
  de un sitio distinto cada vez, con su fundido; solo en el partido, no entrenando ni en los retos, y nunca en el último
  tanto, que es la ovación del que gana. Si la grabación aún no ha llegado, suena el aplauso de siempre. La ovación del último
  tanto también entra con fundido (`efecto` de `audio/pistas.js`, con su tiempo de entrada). Suena
  la música de los campeonatos (`audio.js`, `nivelMusica`): baja mientras se juega (`match.js`, `enJuego`) y vuelve en la
  presentación, el sorteo, las repeticiones y el final. El partido usa el sonido del juego, ya desbloqueado con el primer
  toque (`fronton.js`, `audio`): en el iPhone, uno propio creado sin tocar empezaba callado y no se oía la chapa del sorteo,
  que ahora cae, rebota y repiquetea hasta quedarse quieta (`moneda`).
- **Golpes de la pelota con el sonido de un frontón de verdad** (17 de noviembre de 2026; `pelota/audio.js`, `golpe`;
  `tools/sonidos/golpes-pelota.py`). El autor pasó el vídeo de un entrenamiento: «este es el sonido real que hace la
  pelota al pegar contra la pared del frontón. Y este es el sonido que tiene que tener nuestro juego». El audio es de quien
  subió el vídeo, sin licencia para el juego, así que no se usa la grabación: se midió y se fabricaron golpes propios
  calcados de ella. El del frontis es un chasquido seco y muy brillante, casi plano de 250 a 4000 Hz; el de la mano lleva
  más grave; el bote es como el frontis, más corto. Cada uno: un chasquido de ruido de 6 a 10 ms con ese reparto por
  octavas, un golpe grave muy flojo que le da cuerpo y la sala de un frontón cubierto (reflexiones a 11-94 ms y una cola de
  1,05 a 1,25 s que pierde antes los agudos). Tres variantes de la mano, el frontis, el bote y la pared izquierda, en
  `src/assets/sonidos/pelota-*.mp3` (200 KB todos), sin repetir la última y algo más agudos y fuertes cuanto más fuerte el
  golpe. Si aún no han llegado, suena el sintetizado de antes. Al aire libre suenan con la misma sala (pendiente).
- **La pelota, un 10-15 % más rápida** (17 de noviembre de 2026; `pelota/rules.js`, `tempo` de cada nivel, y la fuerza
  del golpe normal según la distancia en `pelota/game.js`). En el vídeo del entrenamiento que pasó el autor, la pelota
  tarda 0,3 s del golpe al frontis desde 7 u 8 m, unos 27 m/s. Medido con partidos simulados entre dos pelotaris del
  ordenador, del golpe al frontis desde 10-16 m: en el nivel normal, de 0,70 a 0,59 s; en el experto, de 0,62 a 0,57 s.
  Ritmos: iniciación 0,68, fácil 0,8, normal 0,92, difícil 1,03 y experto 1,1. Desde cerca del frontis el golpe sale algo
  más rápido que antes (factor 0,8 + distancia / 62) y desde el fondo, igual. La pelota en casa, con la cámara, sigue
  más despacio (`CAM_TEMPO`).
- **Partido de pelota, la dirección** (`pelota/game.js`, `strike`; `pelota/physics.js`, `twoWallsTo`): el joystick apunta
  al bote. A dos paredes se busca por toda la pared izquierda el golpe que bota más cerca de donde se apunta, así que sale
  desde cualquier sitio de la cancha: con la cortada, desde media izquierda; cuanto más a la izquierda, más cruzada, y
  arriba o abajo, más larga o más corta. El saque también se dirige (de pegado a la pared al ancho, y largo o corto) y con
  CORTADA es saque cortado: rápido y raso, bota nada más pasar la falta y gasta como una cortada. La línea de puntería se
  ve también al preparar el saque. Cansado, la fuerza tiene tope (`powTope`): el aro del botón no pasa de ahí y lo que no
  se alcanza se ve en rojo.
  - Desde el 16 de noviembre de 2026, el saque, normal o cortado, con el mando del todo a la izquierda bota a 27 cm de la
    pared (a 0,3 m del borde de la cancha más el error del golpe). Antes llegaba a 1,3 m y el autor no podía «arrimarlo
    más a la pared». A la derecha sigue hasta 3,9 m.
  - **Control total** (17 de noviembre de 2026, `pelota/game.js`, `aimSide`, `RAYA`, `errRaya`, `TX_MAX`): el joystick a
    un lado va casi en proporción (medio lado, media cancha). A tope a la derecha, golpe, cortada, dejada y saque botan a
    5 cm de la raya de la contracancha (el saque a 13 cm), con un error propio que crece del 80 % del recorrido al tope:
    medido, a tope y bien dado (calidad 0,85) se van fuera de un 27 a un 38 %; al 90 % del recorrido, casi nunca. El punto
    del frontis ya puede pasar 45 cm de la raya (antes se paraba a 15 cm y nada salía nunca fuera); en el trinquete sigue
    en la pared. En el Cuatro y Medio, tu joystick arriba del todo apunta a 15 cm de la raya del 4 y medio y se pasa un 8 %
    bien dado y un 41 % con calidad 0,7. El rival y el compañero no apuntan a la raya. Arreglado de paso: la cortada que
    va al ancho (gancho o al ancho) se apuntaba con el efecto de la cortada y salía sin él, y se quedaba a medio metro.
    Pedido del autor: «tenemos que tener control absoluto y puede que a veces se nos salga de la contracancha y hagamos
    mala [...] El control tiene que ser total». Medido con partidos y golpes simulados en node.
- **Partido de pelota, el cansancio se ve** (`actors/glbChar.js`, `armSwing`; `pelota/match.js`, `suda`): por debajo de
  la mitad de la energía, el pelotari se encorva (más parado y entre tanto y tanto) y respira deprisa; le saltan gotas de
  sudor y lleva sobre la cabeza su aviso de sudor, que se ve también en el rival, lejos.
- **Partido de pelota, los pelotaris no se atraviesan** (`pelota/match.js`, `esquiva`): al volver a su sitio para el
  saque, cada uno mira dónde se cruzará con el otro según el paso que llevan y, si van a pasar a menos de un metro, se
  abre hacia su lado; si aun así se juntan a menos de 75 cm, se separan. Llegan a la vez que antes. Ojo: el salto de
  sitio se mira en la posición de la lógica (`S.px`, `S.pz`), no en la distancia de la figura a su sitio; si no, el
  camino se rehacía en línea recta cada fotograma y el desvío se perdía (al cambiar el saque, por la raya del 7 de frente,
  se atravesaban). Se prueba cambiando el saque con los dos quietos en su sitio: nunca a menos de 0,94 m.
- **Partido de pelota, corren de verdad** (`game/fronton.js`, `corre`; `actors/glbChar.js`, `GlbRig.update`): el
  pelotari pasa de andar a correr a 1,85 m/s (la gente del pueblo, a 3,6): el clip de andar a su tope solo cubre 1,9 m/s
  y, al frenar volviendo al saque, los pies patinaban. Los gestos de parado (celebrar, la pena, saludar, soplarse la
  mano, soltar el brazo, hablar) se cortan en cuanto pasa de 0,8 m/s, y el golpe, que es de cuerpo entero, deja paso a la
  carrera a las 15 centésimas del impacto si sale corriendo. Se comprueba con un partido automático avanzado a mano a 60
  fotogramas por segundo, figura por figura: velocidad real, clip y gesto suelto en cada fotograma.
- **Las manos no entran en la cabeza** (`actors/glbChar.js`, `apartaManos`, encadenado tras `armSwing`): la cabeza se
  mide una vez en la malla de cada figura (los puntos que mueve el hueso de la cabeza y lo que cuelga de él, en su
  espacio; el radio que deja dentro al 90 %) y, en cada fotograma, si la palma queda dentro, el brazo se gira desde el
  hombro hasta sacarla, en tres pasos como mucho. `globalThis.__manosLibres` lo apaga para comparar.
- **La pelota nunca dentro de una mano** (`actors/glbChar.js`, `manoPuntos`, `apartaDeMano`, `fueraDeManos`;
  `pelota/match.js`, `fueraDeManos`, `radioBola`; `pelota/primeraPersona.js`, `mano`, `fueraDeManos`): de cada mano se
  guardan una vez los puntos de su malla (palma, dedos y tacos), cada uno pegado al hueso que más lo mueve, y en cada
  fotograma se sabe dónde están con un producto por punto. Con ellos: la pelota del saque se apoya en la palma por fuera
  (antes se hundía 4 cm); en el golpe, la muñeca va adonde la palma queda pegada a la pelota, no al centro de la pelota
  (dos pasadas, porque la mano gira con el brazo, y si un dedo aún entra, la mano se retira lo justo); en la pelota en
  casa, la mano de la vista en primera persona se queda antes de la pelota y la pelota del saque va sobre su palma. Y
  como red final, después de mover a todos (también en la repetición), si la pelota que se dibuja queda dentro de una
  mano, se aparta lo justo hacia fuera, solo en la imagen. El grosor de la mano de `palmaDe` va en las medidas del hueso
  (en Mixamo, cien veces más grandes): al mundo, con la escala del hueso. Se mide con la malla deformada de verdad
  (`getVertexPosition`), fotograma a fotograma: antes, la pelota dentro de la mano en casi todas las imágenes del saque
  (1032 de 1041 en casa); ahora, en ninguna.
  El lado de la palma (`palmaDe`) se elige por hacia dónde se doblan las puntas de los dedos, que siempre se curvan hacia
  ella; con los dedos rectos, como antes, la palma al suelo en reposo. Los pelotaris de Meshy están en reposo con los brazos
  abajo y la palma hacia delante: el juego la daba al revés y la pelota del saque iba en el dorso, asomando por el canto y
  metiéndose entre los dedos, y en el golpe la mano llegaba con el dorso (noviembre de 2026).
  Y la pelota, al alcance de la mano (`match.js`, `ESTIRA`): el que va a golpear se estira hacia ella en sus últimas
  décimas (desde 2,4 m de la pelota; se queda a 0,45 m de ella, como mucho 0,9 m más allá de su sitio) y vuelve en 0,4 s
  tras el golpe, solo en la imagen. Medido en partidos: golpeaban con la pelota a 0,6 o 1,2 m del hombro y el brazo mide
  medio metro; la palma quedaba a 21-95 cm del centro de la pelota y ahora a 21-34 cm, con la palma hacia ella en 27 de 35
  golpes (medido con el piloto automático en los dos lados).
- **Más campeonatos, inventados** (`game/torneo.js`, `KINDS`, `EXTRA`, `reglaDe`; `game/townDeportes.js`): además del
  Manomanista, el de Parejas y el del Cuatro y Medio, cinco más en el menú de pelota, cada uno con su txapela:
  - el Torneo de Fiestas (mano a mano, ocho, corto);
  - el Desafío de los Valles (mano a mano con liguilla y cuadro, dieciséis);
  - la Copa de Invierno del Cuatro y Medio (ocho);
  - el Torneo de Promesas del Cuatro y Medio (ocho, con rivales que empiezan);
  - «el acontecimiento del año», la Gran Txapela de Navarra: los dieciséis mejores de toda Navarra (`global`: uno solo,
    guardado como comarca `navarra`), con su losa dorada la primera de las nuevas;
  - y el Campeonato de Comarcas (`comarcas`, también uno para toda Navarra): juegas por tu comarca, con su nombre en tu
    carta, contra los de otras siete comarcas, a suertes en cada edición.
  Los de ocho se montan por eliminatorias (`SERIE8`, el primero y el segundo cabezas de serie solo se cruzan en la
  final); antes, un formato de ocho caía en la rama de la liguilla.
  Cada uno dice sus reglas (`base`: mano a mano en toda la cancha o hasta el 4½), su formato (`fmt`), lo fuertes que
  son los rivales (`lv`) y su «Cómo funciona» (`como`, en castellano y euskera). Todos son de cada comarca salvo el
  acontecimiento del año y el de comarcas: cuatro por comarca y dos para Navarra, 50 txapelas más.
  - Y desde el 15 de noviembre de 2026, el Torneo de Trinquete (`trinquete`, `trinqueteDe`): el autor, «no te olvides
    del trinquete». El trinquete solo se jugaba como partido libre en «Frontones». Ahora tiene su torneo, mano a mano,
    ocho, uno para toda Navarra, y cada ronda en un trinquete de verdad del juego: los cuartos y la final en el de
    Elizondo y las semifinales en el de Lekunberri. No se elige frontón: el cuadro dice en qué trinquete toca. El de
    Sangüesa, del siglo XVI, ya no existe y no entra. La celebración dice la txapela de cada campeonato de toda
    Navarra; antes, todos los de Navarra decían «la Gran Txapela». Sin frases del locutor para este torneo: harían
    falta grabarlas.
- **Elegir tu pelotari en un campeonato** (`game/torneo.js`, `eligePelotari`, `ponPelotari`, `elegibles`, `tusStats`,
  `sinEmpezar`; `game/townDeportes.js`, `pelotaTorneo`; `game/fronton.js`, opción `yo`): como elegir equipo en el FIFA.
  Al abrir un campeonato nuevo sale «Elige tu pelotari»: tu carta y las de los 21 pelotaris del juego, cada uno con su
  pueblo y su nivel fijos (salen de su nombre), en fila que se desplaza (de pie, en rejilla). Con el que eliges juegas
  todo el campeonato: su nombre en el cuadro, en el marcador y en la espalda, su figura (chico o chica y su pelo, por su
  nombre: `rigPelotari`) y sus cualidades. Se guarda en el torneo (`T.yo`; `null`, el tuyo; `T.elegido`, ya preguntado)
  y se cambia con el botón «Pelotari» del cuadro hasta jugar la primera ronda. Si el elegido estaba en el cuadro, como
  rival o como tu compañero, su sitio lo ocupa otro pelotari libre. Por parejas, eliges al delantero.
- **La pelota en casa, más despacio** (`pelota/game.js`, `CAM_TEMPO`, `CAM_CORTADA`, `cortaCam`): con la cámara la
  pelota va al 85 % del tempo de su nivel (en normal, 0,68 en vez de 0,8), porque se juega con el cuerpo entero y la
  cámara llega unas décimas tarde, y las cortadas del rival (también su saque cortado) salen al 86 % de su velocidad. La
  tuya y la de tu compañero, igual que siempre. A la cortada más rápida del rival, del golpe al segundo bote, se pasa
  de 1,53 s a 1,86 s (medido con `predict`).
- **La chapa de arriba y el sonido de la chapa** (`pelota/court.js`, `chapa-arriba`, `chapa-izquierda`;
  `pelota/audio.js`, `chapa`; `pelota/game.js`, `alta` en los eventos `front` y `wall`): como en los frontones de verdad,
  encima de la raya de arriba del frontis y de la de la pared izquierda hay una franja de chapa, del color de la de
  abajo, con su colchón, el remate que sobresale. La pelota suena a metal al dar en cualquier chapa, la de abajo o las
  de arriba (antes en la chapa no sonaba nada). El sonido está sintetizado, a la espera de una grabación.
- **Rótulos del partido** (`pelota/hud.js`, `call`): el aviso grande entra y sale con un fundido de 0,3 s, sin más.
  Hubo una versión con las letras cayendo, botando o volando, una pelota cruzando el rótulo de los dos botes, la chapa
  temblando y los botones entrando de un salto: al autor no le gustó nada y se quitó (noviembre de 2026).
  El aviso del tanto dura 2,8 s (3,6 con racha, 5,5 el último) y sigue a la vista durante la repetición, que empieza a
  los 1,15 s. Dice solo lo que canta el juez («¡Dos botes!», «¡Falta!», «¡Chapa!») y debajo para quién es el tanto: sin
  la explicación de la regla, que el autor no quería ver en cada tanto, y sin el tanteo cantado en euskera cuando el
  juego está en castellano (`pelota/match.js`, caso `call`: el kantari solo en euskera). Desde el 12 de noviembre de
  2026; antes, 3,4 s con la regla explicada y el kantari siempre.
- **Marcador de retransmisión y rachas** (`pelota/hud.js`, `setScore`, `setRacha`, `call`; `pelota/match.js`, `rachaDe`):
  al sumar, la cifra salta en dorado y su lado se ilumina. El aviso del tanto lleva arriba una raya del color de quien
  lo gana y, si toca, el rótulo de racha: tres tantos seguidos o más, o el que iba tres o más por detrás iguala el
  partido o se pone por delante (la remontada, una vez cada cosa). Mientras dura la racha, una llama junto a la cifra
  del marcador (solo la llama: el número va en el aviso, para no quitarle sitio al nombre).
- **Textos grandes y alto contraste** (`util/accesible.js`; Ajustes en `hub/hub.js`): se guardan aparte del perfil, en
  `herrizherri-accesible`, y se ponen como clases de `<body>` (`textos-grandes`, `alto-contraste`) desde que se abre el
  juego. Textos grandes sube un 20 % las variables de letra (`--fs-*`) dentro del partido de pelota, la pantalla VS y la
  ficha; alto contraste pone fondo negro, letra blanca y bordes blancos en el marcador, los avisos, los paneles y los
  botones, y en el anillo y los corazones de la aventura. Cada estilo va con lo suyo (`pelota/hud.js`, `vs.js`,
  `ficha.js`, `ui/aventuraHud.js`).
- **Resumen del final** (`pelota/match.js`, `endPanel`, `claveDe`, `mapaBloque`; `pelota/game.js`, `stats.log` y
  `stats.golpes`): el resultado en la cabecera, entre los dos nombres con el color de cada uno (en el reto del frontón,
  grande, que no hay rival); a la izquierda el momento clave y la experiencia; a la derecha las estadísticas y el mapa
  de golpes (la cancha desde arriba, del frontis al rebote, con un punto de cada color donde golpeó cada uno). En dos
  columnas desde 600 px de ancho, para que en el móvil tumbado no quede nada debajo de los botones. En el móvil tumbado
  (`pelota/hud.js`, hasta 520 px de alto) cabe entero sin desplazar: 12 px entre bloques, 10-14 px dentro, las cifras sin
  casilla propia, el mapa con su título a la izquierda para que la cancha use el ancho, las dos columnas acabando a la
  misma altura y los botones a 44 px; en los de 375 px de alto, 10 px; y con la barra de Safari (320-360 px de alto),
  8 px entre bloques, 6 dentro y el mapa más bajo: antes ahí el mapa quedaba debajo de los botones y parecía cortado.
  Probado de 667×320 a 932×430, con muesca, en
  castellano y euskera y por parejas (con textos grandes se desplaza, con los botones siempre a la vista). El momento clave es
  la remontada, si el que gana iba tres o más por detrás; si no, el tanto que deshizo el último empate, contado según
  cómo se ganó (golpe y remate, saque directo o fallo del otro); y si nunca empataron, el tanto más largo.
- **Mikel y Edurne, los comentaristas nuevos** (14 de noviembre de 2026; `pelota/guionVoz.js`, el guion; `pelota/comenta.js`,
  qué se dice y cuándo; `data/pelotaris.js`, la ficha fija de cada pelotari). Toda la locución en castellano, de nuevo y
  sin recortar, con las voces de ElevenLabs de la cuenta del autor (plan Creator, uso comercial): Mikel narra y Edurne,
  que jugó a pelota, explica la jugada y cuenta historias del frontón y de los pelotaris. 648 claves, 660 grabaciones: 429
  de Mikel en `src/assets/voz/hombre/es` y 231 de Edurne en `src/assets/voz/mujer/es`; unos 32 000 créditos. Las de
  Envato de Iñaki y Miren y las del autor se guardan en `old/voz-autor/` (no se borran). Cada clave es `grupo-n`: se
  elige una frase del grupo sin repetir la última; las que acaban en `-e1`, `-e2` son la explicación de Edurne detrás de
  la de Mikel; los diálogos, `d-<tema>-<n>-<turno>`, suenan seguidos y una vez por partido. Lo que se oye: la presentación
  (saludo o diálogo, el frontón por su nombre o la plaza del pueblo, la ronda, el campeonato, los dos pelotaris y lo que
  se sabe de ellos, el favorito o si van igualados), el primer saque y alguno más, el tanto (cómo se ganó con el golpe
  concreto: saque cortado, dejada al txoko, cortada a dos paredes, gancho a la pared…; la racha, la que se corta, la
  remontada, el empate, quien se escapa en el marcador, la mitad del partido, un peloteo largo), el tanto de partido, el
  descanso, el final (la txapela, la vuelta al marcador, si fue justo o claro, si pasa de ronda) y, entre tanto y tanto,
  relleno con peso por temas sin repetir el último (el frontón y su historia, la ficha de cada pelotari, la grada, el
  material, la mano, las piernas, la energía, el Cuatro y Medio, las parejas, el zurdo). Cómo llegas al partido del
  campeonato lo cuenta Edurne una vez (`game/torneo.js`, `estDe`, frases `est-*`): tu primera final, que defiendes la
  txapela, la revancha contra uno de la edición pasada, que el campeón del año pasado ya cayó, invicto, primero del grupo,
  obligado a ganar en la última jornada de la liguilla, que vienes de remontar o que ya tienes txapela; fuera de los
  campeonatos, si el rival es favorito o van igualados. Para eso cada campeonato nuevo guarda de la edición anterior quién
  ganó y contra quién jugaste (`ant`), y el partido avisa si lo ganaste remontando (`remonta`, de `pelota/match.js` a
  `game/fronton.js` y `townDeportes.js`). Durante el peloteo, el golpe que se acaba de dar, también el saque pegado a la
  pared o abierto al ancho (`game.js`, `saquePared` y `saqueAncho`), el besagain, el bote pronto y el sotamano según la
  animación del pelotari. Ninguna frase del guion se queda sin poder salir (simulado con 6000 partidos y 120
  campeonatos; las de Iñigo, cuando juegas con él). Con «Solo Mikel» o
  «Solo Edurne», solo las frases de esa voz. Cada pelotari de la plantilla tiene ya su pueblo, su estilo y su golpe estrella
  fijos (`FICHAS`), los que cuentan los comentaristas, en la carta y en el cuadro (`pelota/rules.js`, `game/torneo.js`).
  Cómo se cortó: cada tanda con su transcripción por palabras de ElevenLabs Scribe, el corte en el silencio más largo entre
  la última palabra de una frase y la primera de la siguiente, 50 ms de silencio en cada borde, voz a -16 dBFS de media,
  picos a -1 dBFS, mp3 mono de 64 kbps; las 660 comprobadas contra su texto. El euskera aún no tiene voz: usa el
  castellano. Guion completo en el documento «Guion de los comentaristas de pelota» (Claude Docs). Lo que sigue en esta
  sección sobre Iñaki, Miren y Envato es la versión anterior.
- **Gancho y cortada, cada uno con su nombre** (noche del 14 de noviembre de 2026, `pelota/game.js`, `strike`): la cortada es
  con la derecha y hacia la pared izquierda; con CORTADA hacia el ancho, a la contracancha, ya no sale «cortada al ancho»:
  de aire, es un gancho (con la izquierda, como lo pinta `match.js`, `swingAnim`), y rasa, un golpe al ancho. «Cuando le
  damos de aire con la mano izquierda hacia la derecha [...] eso se llama gancho, no cortada». Y en el registro del tanto,
  «volea» solo para los golpes sin nombre propio: antes un gancho ganador se contaba como volea y el locutor lo llamaba así.
- **El locutor, con el pelotari y el golpe que son** (misma noche, `pelota/comenta.js`, `pelotariVoz`): las frases con
  nombre de un pelotari de la plantilla solo salen si también coincide el pueblo con el que juega (el que dice su
  presentación grabada, «Y enfrente, Unai, de Tafalla»); un Unai de otro pueblo, o el jugador que se llama Ane, ya no
  sale presentado con el pueblo de la grabación. Y la frase del golpe en el peloteo se pierde si el locutor está
  hablando, también la del gancho, que antes esperaba hasta 5 s y llegaba nombrando un golpe que ya no era el de la
  imagen («falla en los golpes que nombra [...] y con el nombre y la procedencia del pelotari»).
- **Las teclas de la pelota en el ordenador** (misma noche, `pelota/hud.js`, `.pel-teclas`; `pelota/rules.js`, `teclas`):
  J golpe, K dejada y L cortada, juntas en la fila de casa (siguen valiendo espacio y mayúsculas), con su tecla en cada
  botón y, mientras se saca en los tres primeros tantos de cada partido, una tira abajo con las teclas dibujadas como
  teclas: flechas para moverte y apuntar, J, K, L y «mantén la tecla para cargar». No sale en el móvil ni con mando. El
  autor: «en el ordenador no sé qué controles son para dejada, cortada y golpeo».
- **Edurne habla más** (misma noche, `pelota/comenta.js`; 24 frases nuevas suyas, `j-…-e` en `guionVoz.js`, con su voz
  limpia de ElevenLabs, 760 créditos, cortadas en los silencios y a -16 dBFS como las demás): en el peloteo, cuatro de
  cada diez reacciones son suyas («¡Qué tacto tiene!», «Le quita el tiempo», «Esto es un pulso»…) y con «Solo Edurne»,
  todas; tras el tanto, su explicación sale dos de cada tres veces (antes dos de cinco) y hay algo más de relleno, que es
  casi todo suyo. «Solo habla Miquel y se me queda muy soso el partido».
- **La voz de Mikel, tan limpia como la de Edurne** (misma noche): medidas las dos, la de Mikel tenía mucho más brillo duro
  entre 1 y 3 kHz y poco cuerpo (centro espectral de 2.570 Hz frente a 1.810), y era más áspera (periodicidad 0,74 frente
  a 0,86). Sus 429 frases, pasadas por un filtro: algo de cuerpo en los graves (+5,5 dB a 160 Hz), menos dureza (-6 dB a
  2,3 kHz y -3,5 a 4,2), un poco de reducción de ruido, un quita-eses y corte por encima de 11 kHz; cada una al mismo nivel
  medio que tenía, picos a -1 dBFS, mp3 de 80 kbps. Queda en 2.130 Hz y 0,82. Las originales siguen en la historia de git.
  Para igualarlas del todo habría que hacer una voz «limpia» de Mikel, como la de Edurne, y grabarlo de nuevo.
- **Comentarios menos repetidos y con sentido** (16 de noviembre de 2026; `pelota/comenta.js`, `pelota/match.js`,
  `game/torneo.js` `otrosDe`). El autor: «los comentarios son muy repetitivos y hay muchos que no tienen sentido».
  Contra la repetición, `frase()` no repite ninguna de las 24 últimas si queda otra, y los grupos de jugada, tanto y relleno
  con una o dos frases se callan cuatro tantos después de usarse. Contra lo que no viene a cuento, `fuera()`: el consejo
  contra un zurdo solo si el rival es zurdo, lo de la pared izquierda nunca en una plaza, lo de las cortadas seguidas solo
  si alguien lleva cuatro, la grada en pie solo tras un tanto vistoso o en el último tanto, y «llega»/«qué manera de
  defender» solo si el golpe fue bueno. Situaciones nuevas, con las ideas del autor: «está a dos tantos» (y a tres en los
  partidos largos, una vez por pelotari), «vaya resto de saque» (el resto que gana el tanto), «le ha pasado la pelota por
  encima», «¡atrás!» en la pelota larga, «qué bien ha sacado esa pelota de la pared», el partido perfecto (5 de ventaja,
  8 tantos o más, como mucho un fallo), el que falla 3 de los 5 últimos («no le está entrando la pelota», a veces «se le
  nota cansado»), el que anda fino con la derecha o la izquierda (2 de los 3 últimos tantos con esa mano; `match.js`
  `formaCtx`, que guarda la mano del último golpe en `swingAnim`) y lo que ha pasado en los otros partidos del campeonato
  (`otrosDe`: sorpresa, ajustado, sin historia, el favorito sigue o ha caído, otro invicto, la siguiente ronda, la liguilla).
  Las 92 frases nuevas (Mikel con su voz de siempre y el mismo filtro, Edurne con la limpia; al mismo nivel medio que las
  demás, -18 y -17 dB) las escuchó el autor en una página de escucha y las aprobó todas el mismo día («Perfecto, añade
  todos los comentarios»): están en `guionVoz.js` y en `assets/voz/hombre|mujer/es/`. `frase()` se salta toda clave sin
  audio (`voz.js`, `tiene`), así que una frase del guion sin su archivo calla en vez de fallar.
- **Ovejas nuevas, de las razas de verdad** (16 de noviembre de 2026; `actors/animalGlb.js`, `sheep` y `sheepRasa`;
  `actors/animals.js`, `razaOveja`). El autor: «las ovejas no están nada bien diseñadas». La de antes (Sheep.glb,
  derivada de la alpaca de Quaternius) parecía una oveja inglesa. Ahora hay dos razas, buscadas antes en fuentes reales
  (RFEAGAS, Interempresas, el MITECO sobre la trashumancia): la **latxa de cara negra**, cara y patas oscuras sin lana,
  orejas horizontales, cuernos pequeños y lana larga y basta que cuelga en mechones partida por el lomo, en
  Baztan-Bidasoa, Larraun, Sakana, la cuenca de Pamplona, Aezkoa y Orreaga; y la **rasa navarra**, toda blanca, sin
  cuernos, pecas en el morro, orejas algo caídas y lana más cerrada, en el Roncal, el Salazar (Otsagabia) y del
  Prepirineo al sur. Sin raza, sale la latxa (el minijuego de esquilar, la diorama del inicio). Cómo se hicieron: un
  boceto de cada una con Higgsfield, el modelo en Meshy (imagen a 3D, topología de juego, unos 4.200 triángulos, 15
  créditos cada una) y, como Meshy no monta esqueletos de cuatro patas, en Blender
  (`tools/blender/fauna/oveja-meshy.py`): el esqueleto de la oveja de antes se deforma para encajar en la malla nueva
  (pezuñas, espinazo, cabeza, cola) y la malla se pesa a los huesos (el cuerpo solo con el espinazo, el cuello y la
  cabeza; las patas solo por debajo de la tripa y pegadas a cada pata; la cola no tira de la lana), así que siguen las
  ocho animaciones de siempre. `tools/ovejapack.mjs` deja la textura en WebP de 1024 (4 MB en el iPhone en vez de 16),
  cuantiza y comprime con meshopt: 571 y 511 KB. En el juego llevan su textura con la luz de relleno y la pintura de los
  demás animales (`texScene`, `texMaterial`, sin mezclar las piezas de Meshy: `sharpMap`); la lana del minijuego de
  esquilar es lo que no mueven la cabeza, las orejas ni las patas, y `woolMaterial` admite la textura. Sheep.glb sigue en
  el repositorio, sin usar, por si hubiera que volver.
  - Las patas, rehechas la noche del 16 de noviembre (`tools/blender/fauna/oveja-meshy.py`). El autor: «las piernas no
    están bien». Vistas de lado en el paso y el galope, las patas se doblaban en zeta, se cruzaban y las pezuñas se
    estiraban en cuchillas. Tres causas: la rodilla y el corvejón del esqueleto quedaban donde caían al encajarlo, dentro de
    la lana y, el corvejón, muy detrás de la pata, con la caña trasera en diagonal; las ovejas de Meshy están de pie con una
    pata de cada par adelantada (en la latxa, la trasera derecha 0,6 detrás de la izquierda); y la punta de la pezuña, más
    ancha que la pata, se quedaba con el cuerpo. Ahora la rodilla va a algo más de un tercio de lo que hay del suelo a la
    tripa, encima de la pezuña, y el corvejón algo más alto y un poco detrás; cada pata se gira desde el hombro o la
    cadera hasta poner su pezuña a la par de la otra (de 3° a 8°), se aplica a la malla y esa pose pasa a ser la de reposo;
    lo que sigue a cada pata es lo pegado a ella y, abajo, más ancho, para la pezuña; y los giros de las patas en las
    animaciones, que son de la oveja de antes, de patas largas, van al 55 % (la caña, al 39 %). Comprobado de lado en el
    paso, el galope y comiendo, en la foto de familia del laboratorio y en el esquileo, sin errores.
- **Boceto del Bobo de Muskilda** (17 de noviembre de 2026, `entrega/bocetos/bobo-muskilda.jpg`, Higgsfield): arlequín verde y rojo, máscara de dos caras y castañuelas, según las fuentes de `entrega/voces-ochagavia-pendientes.md`. El Zarratrako y los danzantes, sin boceto hasta tener fotos reales.
- **Inventario global** (17 de noviembre de 2026, `entrega/inventario-global.md`; con las fotos del Ogueta encontradas en Commons): todo lo pendiente por partes (pelota, voces, personajes, transportes, mapa, pueblos y tráiler), con lo que depende de una decisión del autor. Se rehace cuando cambie mucho.
- **Voces del tráiler** (`entrega/trailer/`): seis muestras el 16 de noviembre y ocho más el 17 (`voces-muestra-2`), todas gratis de la biblioteca de ElevenLabs. Ninguna elegida todavía.
- **Frases con cuenta de Otsagabia, para escuchar** (17 de noviembre de 2026; `entrega/voces-cuentas/`): 26 grabaciones de
  Joxemari, Joseba, el Basajaun y el Bobo, una por cada número posible («Llevas 3 de 6») y las dos explicaciones del baile
  del Bobo. Fuera del juego hasta que el autor las apruebe; para instalarlas, copiar los mp3 a `assets/voz/vecinos/ochagavia/`
  y añadir `manifiesto-nuevo.json` al manifiesto (se buscan por el texto ya con el número, sin tocar el código).
- **Los vecinos de Otsagabia hablan** (14 de noviembre de 2026; `game/vozVecinos.js`, `assets/voz/vecinos/ochagavia/`).
  Quién da las pruebas en Ochagavía (`content.js`, QUESTS): Maite (la bienvenida, cinta roja), Itziar (los escudos,
  amarilla), Joxemari (las ovejas, blanca), Kike (la pelota, verde), Joseba (Irati, azul), el Basajaun (naranja), la
  Lamia (morada), Ainhoa (el Zarratrako, rosa) y el Bobo (la fiesta de Muskilda); Arantxa, la quesera de la plaza, hace
  las preguntas. Nombres nuevos para no repetir los de los comentaristas ni los de los pelotaris: Garazi pasa a Arantxa,
  Iñaki a Joseba y Amaia a Ainhoa; de los paseantes, Nerea a Itxaso y Edurne a Txaro. Voces de la biblioteca de
  ElevenLabs de la cuenta del autor, castellano de España: Maite, Lulú; Itziar, Abuelita de Cuento; Joxemari, Pedro
  SanJuan; Joseba, Raul Garcia; el Basajaun, Ezequiel; la Lamia, Violeta; el Bobo, Lucas Bright; Arantxa, Mari; Ainhoa,
  Carlota (no hay voces de niña de España: la más clara y joven). Cada vecino, una locución con pausas de 1,6 s entre
  frase y frase, cortada en los silencios más largos y limpiada como la de los comentaristas (80 kbps): 78 frases y
  4 MB, que se bajan solo al decirlas. Las dos que empiezan por «Egun on» tienen también «Arratsalde on» y «Gabon»
  (`saludo.js` cambia el saludo con la hora). La frase se busca por su texto, sin el nombre de quien juega, sin tildes ni
  signos (`manifiesto.json`); las que llevan cuentas o pistas que cambian se leen sin voz, y en euskera no hay voz. Una
  frase cada vez: la siguiente, o cerrar la charla, calla la anterior, y la música baja mientras hablan. Kike sigue sin
  voz: en la biblioteca no hay voz de niño de España. Falta elegir entre una de niño de Latinoamérica o diseñar una con
  la descripción y una frase de muestra del autor. El autor: «Vamos a locutar a los vecinos… Les ponemos nombres y vamos
  a ponerles voz también». Lo que falta por locutar está en `entrega/voces-ochagavia-pendientes.md` (15 de noviembre):
  71 frases fijas (la narración de los sitios, las de Kike, los paseantes, los saludos según el tiempo, las misiones,
  las cartas y las preguntas de Arantxa) y 7 con cuentas; sin grabar hasta que el autor elija las voces.
  El 16 de noviembre, 63 frases más (de 71 a 17 por grabar): con la voz de Maite como narradora («narra» en el
  manifiesto), los avisos de la fuente, el peine de la Lamia y los cencerros, los dos premios de texto fijo (los
  eguzkilores y el pasaporte, título y texto en una sola frase), el catalejo y las 26 cartas del cuaderno; y con la de
  Arantxa sus diez preguntas, cada una con su «¡Correcto!» y su «Casi…». Lo que se dice se adapta a lo hablado sin
  tocar lo escrito: los números romanos en palabras, «¡+5 estrellas!» como «¡Cinco estrellas más!», sin comillas ni
  paréntesis. `vozVecinos.js`, `narra(texto)`: dice un texto suelto si tiene grabación y, si no, no calla lo que suena;
  `ui.js` la llama por `onVoz` (que `game.js` engancha en su constructor) en cada aviso (`toast`), en el premio tras la
  fanfarria (900 ms, y se calla al cerrarlo) y al dar la vuelta a una carta del cuaderno (se calla al volverla o al
  cerrar el cuaderno). Las preguntas van por la charla de Arantxa, como el resto. Siguen sin grabar Kike (7 frases), las
  paseantes Itxaso y Txaro (6) y los saludos según el tiempo (4). El autor: «Sigue con las voces de los vecinos».
  Ese mismo día, dos decisiones del autor. Los paseantes (Patxi, Itxaso, Fermín, Txaro e Iker) y los saludos según el
  tiempo se quedan sin voz: «La gente que pasa y saluda no hace falta. Solo misiones y información». Y las voces las
  elige él: «No puedes poner voces a un personaje sin preguntarme primero… No gastes créditos sin escuchar la voz
  primero». Antes de grabar se le mandan las muestras gratis de la biblioteca de ElevenLabs; las voces puestas hasta
  ahora en Otsagabia se cambiarán si elige otras.
  Y las eligió el mismo día: Itziar, Rosa; Joxemari, Rafael; Kike, Leo; Ainhoa, Sofía; Joseba, Martín; la Lamia,
  Sophie; la narradora, Nico; siguen el Basajaun con Ezequiel, el Bobo con Lucas y Arantxa con Mari; Maite, sin elegir,
  sigue con Lulú. Grabadas de nuevo con las voces nuevas todas las frases de los que cambian (mismos archivos y
  manifiesto), y nuevas las 7 de Kike, «¡Probemos otra vez!» del Bobo y 13 avisos fijos de la narradora (el puente, la
  fuente, el mirador, Irati, las ovejas, los prismáticos, el Zarratrako, la pelota, las ocho cintas, la primera estrella
  y «Habla con Maite», en teclado y en táctil). 162 frases con voz, 8 MB. Kike, Leo: la biblioteca no tiene voces de niño
  de España; es la voz joven que eligió el autor. Coste: unos 19.500 créditos (dos tomas de cada grupo).
  Pronunciación del euskera (el autor: «Revisa bien las pronunciaciones en euskera»). Las voces de castellano leen el
  euskera con reglas de castellano y fallan en cuatro grafías: x (Kaixo, Joxemari), que es «sh»; tx (Txuri, latxa,
  katxutxa, txapeldun, Arantxa), que es «ch»; tz (Itziar, Artzai), que es «ts», y z (gazte, eguzkilore, Zarratrako),
  que es «s». En lo que se dice, no en lo que se lee en pantalla, se escriben como suenan: Kaisho, Joshemari, Churi,
  lachas, kachucha, chapeldun, Arancha, Itsiar, Artsai, gaste, egusquilore, Sarratrako. 25 frases grabadas de nuevo con
  sus mismas voces (unos 4.800 créditos). Bien leídas ya: Otsagabia, Egun on, Arratsalde on, Gabon, Ongi etorri, Eskerrik
  asko, Muskilda, Irati, Aupa, Basajaun. Zatoya se dice en castellano, que es su nombre en castellano (en euskera,
  Zatoia). Las de Maite (Kaixo, Itziar, Joxemari, Zarratrako) esperan a que el autor elija su voz.
  Retirado el mismo día. El autor: «No se pronuncia bien el euskera. Tengo que comprobarlo antes de ponerlo en el
  juego». Vuelven al juego las 25 grabaciones de antes y las escritas como suenan quedan fuera, guardadas para comparar.
  Regla: ninguna voz entra en el juego sin que el autor la haya escuchado y aprobado. La siguiente prueba usa eleven_v4,
  que acepta la pronunciación en alfabeto fonético (AFI entre barras, por ejemplo /ˈkajʃo/), y se manda antes al autor.
  16 de noviembre de 2026: con eleven_v4 y AFI, el autor aprueba 25 grabaciones y entran en el juego, con sus mismos
  nombres de archivo. Itziar va con «Egunon» junto y su nombre escrito «Itsiar», sin parones (la de AFI, /iˈtsjaɾ/,
  hacía pausas). Queda fuera el «Kaixo» de Joseba (`inaki-00`), que no le sonó bien: se graban dos formas, «Kaixo» y
  «Kaisho», y se le mandan, igual que los saludos de tarde y noche de Itziar, antes de meterlas.
  Al autor le valen las dos y entra «Kaisho» (`inaki-00`). Los saludos de tarde y noche de Itziar no entran: el autor
  rechaza la voz de Itziar y la de Maite («son un horror y pronuncian fatal»); las dos esperan voz nueva.
  El 16 de noviembre, por la noche, el autor elige la segunda toma de Inés para Maite y la segunda de Nuria para Itziar,
  pero Maite dice mal «José Mari» e Itziar pone el acento en la i de «Otsagabia». Pruebas de pronunciación, aún fuera
  del juego: `entrega/voces-prueba/maite-ines-josemari-1.mp3` y `-2`, `itziar-nuria-otsagabia-1.mp3` y `-2`. Esperan a
  que el autor diga cuál vale.
  El autor, después: Maite dice bien «José Mari» y «Otsagabia», pero no «Zarratrako», que tiene que marcar más la zeta;
  Itziar tiene que poner el acento en la i, como en «Ochagavía». Nuevas pruebas, aún fuera del juego, cada una con dos
  formas de escribirlo: `maite-ines-zarratrako-1` y `-2` (en fonética y «Sarratráko»), `maite-ines-zarratraco-z-1` y
  `-2` («Zarratraco» y en fonética con zeta), `itziar-nuria-otsagabya-1` y `-2` y `itziar-nuria-otsagabia-acento-1` y
  `-2` («Otsagabía» y en fonética con el acento en la i).
  17 de noviembre de 2026, el autor en la página de elecciones: las frases con cuenta de Joxemari, el Basajaun y el
  Bobo «valen, mételas en el juego», con una nota en cada una: «no hace falta el recuento». La voz ya no dice el número:
  de cada grabación se corta «Llevas N de M» (en el Bobo, «Tienes N de 8», que va en medio) por el silencio que lo
  separa, y queda una sola frase por vecino: `joxemari-09`, «Colócate detrás de cada oveja para que camine hacia el
  redil»; `basajaun-07`, «Busca cerca de los senderos de Irati», y `bobo-05`, «Pero sin sus cintas no pueden bailar…
  ¡Tráelas todas y bailaremos juntos!». `clipDe` busca primero la frase tal cual y, si no la encuentra, sin la cuenta
  (`CUENTA`), así que el texto en pantalla sigue diciendo cuántas llevas. Entran también las dos explicaciones del baile
  del Bobo: `bobo-06` para el móvil y `bobo-07` para el ordenador. La de Joseba no entra: el autor no la marcó; su corte
  espera en `entrega/voces-cuentas/sin-cuenta/joseba.mp3`. Las 80 cuentas de la narradora no se graban.
  El autor, a continuación: «aunque si ya las has generado las voces de recuento, añádelas para no perderlas, para no
  tirar créditos». Entran las 24 grabaciones con la cuenta, cada una con su frase entera en el manifiesto: Joxemari de
  0 a 5 de 6 (`joxemari-10` a `-15`), Joseba de 0 a 4 de 5 (`inaki-07` a `-11`), el Basajaun de 0 a 4 de 5
  (`basajaun-08` a `-12`) y el Bobo de 0 a 7 de 8 (`bobo-08` a `-15`). Como `clipDe` prueba primero la frase tal cual,
  suena la que dice el número; las cortadas sin cuenta quedan de reserva por si cambia el total de una misión.
  En la segunda ronda el autor quita las de Joseba («Quítalas»): fuera del manifiesto y del juego `inaki-07` a `-11`; su
  frase con cuenta vuelve a leerse sin voz. Las grabaciones siguen en `entrega/voces-cuentas`.
  El autor rechaza también a Inés para Maite y a Nuria para Itziar: las dos vuelven a esperar voz. De las pruebas
  quedan apuntadas las formas que le valen para cuando haya voz: «José Mari», «Sarratráko» con el acento en la tercera
  a, y la fonética con el acento en la i para «Otsagabía».
  17 de noviembre de 2026: voces nuevas. Maite con Francesca Dari e Itziar con Irma la Dulce (biblioteca de ElevenLabs,
  castellano de España, modelo eleven_v4), elegidas por el autor tras una frase de prueba. Se graban sus 29 frases con
  dos tomas cada una (`$SP/voces-mi`, fuera del repositorio) y el autor elige en la cuarta ronda de la página de
  elecciones: la toma 2 en todas menos «¿Sabes que en Otsagabia hay palacios…?» de Itziar (`itziar-04`), que va con la 1.
  Entran 27, recortadas en los bordes (50 ms), a -18 LUFS, mono y 80 kbps. Lo que se le pide a la voz va escrito para que
  lo diga bien y el manifiesto guarda el texto de pantalla: «José Mari» por «Joxemari», «Sarratráko» por «Zarratrako»,
  «Itsiar» por «Itziar», Otsagabia en fonética (/ot͡saˈɣaβja/ en Maite, /ot͡saɣaˈβia/ en Itziar) y los siglos en letra.
  El autor pide rehacer dos: «¡Ya conoces el corazón de Otsagabia!» (`maite-05`) y el saludo de noche, «Gabon…»
  (`itziar-00n`). Hasta que apruebe las nuevas, salen del manifiesto y se leen sin voz, para no mezclar con la voz de antes.
- **Locución más viva** (`tools/aviva-voz.py`, noviembre de 2026): sobre las frases ya cortadas, sin crear voz, acorta
  las pausas de dentro (en Miren, las de más de 0,45 s a 0,24 y las de más de 0,2 a 0,13; en Iñaki, las de más de 0,4 a
  0,24 y las de más de 0,28 a 0,16; junto a «Iñaki», en las frases de Miren, a 0,07, que la voz de Envato se paraba en
  la coma) y deja 50 ms de silencio en cada borde. A Miren, que sonaba robótica, le da cuerpo en los graves, le quita el
  brillo metálico de los agudos y le pone un 10 % más de ritmo sin cambiar el tono (5 % aquí y otro 5 % después, a
  petición del autor). Entre turno y turno de un diálogo, nada: el siguiente se baja mientras habla el primero
  (`pelota/voz.js`, `carga`, `sigue`). `entrega/comparacion-voz-miren.mp3`: tres frases de Miren, antes, después y
  después con un poco de eco de cabina.
- **Más frases para Miren** (`pelota/comenta.js`, `camp-*`, `ronda-*`, `r-saque`, `r-energia`, `r-cuatro`,
  `r-campeonato`, `r-final` y una frase más en las jugadas y el final; `pelota/match.js`, `comInicio`, `comCtx`;
  `game/townDeportes.js` y `game/fronton.js`, opción `camp`): al empezar un partido de campeonato, después del saludo,
  Miren dice qué campeonato es o qué ronda (siempre en la final); entre tanto y tanto, temas nuevos según el partido (el
  saque; la energía pasados diez tantos; las reglas en el Cuatro y Medio; la txapela en un campeonato y la final). Las
  frases nuevas van al final de cada lista, así las grabadas conservan su número. En euskera, las que aún no tienen su
  texto se dicen con el de castellano, como ya hacía la grabación. El guion de las 45 que faltan por grabar está en
  `entrega/locuciones-miren.md` (y para la herramienta de grabación, `tools/guion-voz/mujer-es-5.json`); hasta que estén,
  no suenan.
- **El golpe se nombra por lo que hace la pelota** (17 de noviembre de 2026; `pelota/game.js`, `boteReal` y `nombreReal`;
  `pelota/comenta.js`, `enJuego`, `tanto`, `explica`; `pelota/match.js`, el rótulo). El autor: «los comentarios siguen siendo muy
  repetitivos y sobre todo los comentarios de golpeos no se adaptan al golpeo real del jugador. Cuando hay un gancho, el
  gancho siempre es de izquierda a derecha, desde la pared hacia la contracancha, hacia el ancho. Las dejadas, los golpes
  atrás, todo tiene que estar bien identificado por el narrador» y «me hace falta más dinamismo entre los locutores». Al
  golpear se sigue la pelota hasta su primer bote (dónde da en el frontis, si toca la pared izquierda, dónde bota) y el
  golpe se llama por eso: gancho solo si va a la derecha de donde se golpea; dejada si bota antes del cuadro 2, aunque no
  se buscara, y no lo es si se buscaba y bota más allá; atrás (largo o rebote) si bota pasado el cuadro 6; dos paredes solo
  si toca la pared; a la pared o al ancho, donde bota de verdad. Va en el evento del golpe (`real`, `realSub`), en el tanto
  (`stats.log`) y en el resumen. Ya no hay «gancho a la pared»: con la palanca a fondo a la izquierda, o pegado a la raya
  del ancho, es una volea; el rival tampoco lo busca. Contra la repetición: ninguna de las 40 últimas frases, los grupos
  de una o dos frases callan seis tantos (ocho si es una sola) y las explicaciones de Edurne, mejor una que no ha dicho en
  el partido. Más charla: en el peloteo se turnan (tras Mikel contesta ella siete de cada diez veces), ella explica tres
  de cada cuatro tantos y salen más diálogos. Probado con tres partidos simulados a 22: ninguna frase más de dos veces y
  Mikel y Edurne casi a la par (de 43 a 42 hasta 57 a 41). Para que no se repita nada de verdad hacen falta más frases
  grabadas: los grupos de jugada tienen una o dos.
- **Comentarios del partido, hablados** (`pelota/comenta.js`, las frases; `pelota/voz.js`, la voz; `pelota/match.js`,
  `decir`, `comInicio`, `comTanto`; Ajustes en `hub/hub.js` con `util/comentarios.js`: `herrizherri-comentarios`, dos
  comentaristas, de serie, voz de hombre, de mujer o sin comentarios, y `herrizherri-subtitulos`, apagado de serie). Se oyen, no se leen: escritos
  tapaban la pantalla. Las frases no llevan nombres ni números, para poder grabarlas una vez; cada una tiene su clave
  («dejada-2»), que es el nombre de su grabación en `src/assets/voz/<hombre|mujer>/<es|eu>/`. Solo suenan las voces que
  pone el autor (su grabación o las que genera con Envato), nunca una voz sintética del juego: si falta la frase en esa voz, la de la otra voz; si falta en euskera, la de
  castellano; si no hay ninguna, no se dice nada. Una frase cada vez; se callan al pausar y al salir. Con los subtítulos puestos, también el rótulo de
  abajo. Las grabaciones pueden llegar en un solo archivo por idioma: `tools/corta-voz.mjs` lo corta en una frase por
  archivo, en el orden del guion, con los cortes en los silencios y cada frase de la duración que pide su texto; una
  palmada tira la toma de antes; todas al mismo volumen (-16 LUFS), mp3 mono de 96 kbps. Mientras habla, la música
  baja a un tercio (`audio.js`, `voz` y `volMus`: cuenta en todo lo que pone el volumen de la música) y vuelve al acabar
  la frase; el público y los aplausos del partido, también, sin prisa (a 0,45 en algo menos de un segundo: `pelota/audio.js`,
  su bus, con el evento `herrizherri-voz`, porque el partido suena con otro contexto). La frase del tanto llega a los
  1,5 s, cuando el aplauso ya se apaga: antes llegaba a los 0,3 s y se mezclaba con la grada aplaudiendo.
  Para que no haya silencios: durante el peloteo, frases cortas del golpe que se acaba de dar («¡Buena dejada!», «¡Buen
  gancho!», «Esa puede ir a rebote», «¡Qué bien defiende!»; `enJuego`, como mucho una cada 4,5 s y solo si no está
  hablando: las que llegan tarde ya no valen; el gancho, siempre que haya uno, con 2,5 s desde la anterior y, si está hablando,
  en cuanto acaba: antes salía en cuatro de cada diez y el autor no lo oía nunca, noviembre de 2026); entre tanto y tanto, en uno de cada tres sin la jugada, relleno según cómo
  va el partido (`relleno`: la mano del que encadena tantos, lo bien que sale la pelota del frontis, el material de la
  pelota en juego, viva o pesada, `material.js`, la grada, el marcador igualado, las piernas al final); y si el saque
  se hace esperar 5 s sin que nadie hable, relleno. Si en el peloteo ya se comentó la jugada, al cantar el tanto no se
  repite. Con «Dos comentaristas», los dos hablan entre ellos de vez en cuando (`DIALOGO`: Iñaki, la voz de hombre, y
  Miren, la de mujer; la presentación, el material, la mano, el marcador, un peloteo largo, el descanso y la despedida):
  cada turno con su voz fijada y sin la otra de repuesto (`estricta`), el segundo justo detrás del primero (`sigue`), y
  solo si están grabados los dos (`tiene`); si no, la frase suelta de siempre. Sus guiones para Envato:
  `tools/guion-voz/hombre-es-3.json` y `hombre-es-4.json` (grabados: 39 frases más de él, 110 en total; se llamaba Mikel, luego Gorka, y ahora Iñaki: la voz de IA de Miren acentuaba mal Mikel, y Iñaki lo dice bien; sus frases no dicen su nombre, así que valen igual) y, de
  Miren, toda su locución de nuevo en `mujer-es-1.json` a `mujer-es-3.json`, o todas juntas en `mujer-es-todo.json` (grabadas y cortadas en noviembre de 2026; con ellas suenan los 11 diálogos con Iñaki; 53 frases: las que explican, la segunda
  de las pantallas, las nuevas de relleno que explican y su parte de los diálogos). Si una frase no avisa de su final (el iPhone para el sonido al ir la app de fondo), se da por acabada
  a su tiempo: antes la voz se quedaba «hablando» y no se oía ninguna más. En castellano suenan las voces de Envato que el autor generó para el guion a dos voces (noviembre de
  2026): las 71 frases con la voz de hombre (Martin, en cuatro bloques: las que narran y, después, las que explican) y 33
  con la de mujer (las que explican y la segunda de cada pareja de las pantallas). La grabación de antes del autor ya
  no está: la sustituyeron las de Envato. Faltan el euskera y el kantari, que mientras tanto usan el castellano. Las de Envato se
  cortan con `tools/alinea-voz.py` (los bloques que se pegan en Envato, en `tools/guion-voz/`): llegan con pausas entre
  frases tan cortas como las de dentro de una frase, así que se alinean con el guion por DTW contra una regla sintética
  de espeak-ng, que solo sirve para medir, y se comprueba cada trozo contra su frase y las de al lado; la locución se
  normaliza entera antes de cortar (las de mujer llegaban a -36 LUFS). Solo cuentan como pausa los silencios de 80 ms o
  más (los más cortos son el cierre de una p o una t dentro de la frase), y un corte que cae en plena voz se lleva a la
  pausa de verdad más cercana a menos de medio segundo: si no, se comía la primera sílaba («¡Qué peloteo…»). Con «Dos comentaristas» (de serie
  desde noviembre de 2026, `vozDe`), la voz de hombre narra (las frases «n») y la de mujer explica la jugada (las «e»).
  El que lleva casi todo es el hombre, más enérgico, como prefiere el autor (`MUJER` en `util/comentarios.js`): narra
  siempre él y, de lo que explica la jugada, la comentarista dice una frase de cada tres más o menos; en total, unas
  ocho o nueve de cada diez son de él (el 85 % en una prueba de 22 000 frases);
  en las frases de las pantallas (`audio/interfaz.js`), cualquiera de la pareja, con la voz de hombre; la segunda, de
  vez en cuando con la de mujer, como en el guion a dos voces que el autor graba con Envato, por separado: primero todas las del hombre y luego
  las de la mujer. La segunda voz que se sacó de la misma
  grabación, más grave y con el timbre cambiado, sonaba robótica y se quitó (noviembre de 2026): solo la voz grabada.
- **El nombre en la espalda de la camiseta** (`pelota/dorsal.js`, desde `game/fronton.js` para ti, el rival y las
  parejas): el nombre de pila en mayúsculas («Tú» y «Zu» no se escriben), blanco, con el borde algo difuminado, sin filo y con
  una pizca de transparencia para que se vea estampado (con el borde negro parecía una pegatina). Va en una pieza algo
  curvada pegada al hueso del pecho, a media espalda (más arriba, la coleta de las pelotaris lo tapaba); la espalda se
  busca en el propio modelo (los ojos dicen hacia dónde mira; el vértice que más sale por detrás a la altura del pecho) y
  el ancho sale de la distancia entre hombros. No se pinta en la textura del modelo porque la espalda de los pelotaris
  de Meshy está repartida en trozos por toda la imagen: saldría roto. Al acabar el partido se quita (`quitaDorsal`).
- **Repetición desde el pelotari** (`pelota/match.js`, `startReplay`, `stepReplay`): de cada cinco repeticiones, una se
  ve por detrás del hombro del que gana el tanto, mirando la pelota, con el rótulo «Desde Xabier» («Ikuspegia: Xabier»).
  Lo grabado va en coordenadas del mundo y la cámara en las del frontón (`worldToLocal`). En vertical, más atrás y más
  alta, para que el pelotari no tape media pantalla. Las otras cuatro, los planos de siempre.
- **Las cámaras del partido** (`pelota/match.js`, `PLANOS`, `ponPlano`, `plano`; `herrizherri-pelota-plano`): tres a
  elegir en Más opciones (un grupo de tres, «Cámara», junto a los interruptores), en el menú del partido («Cámara:
  General», que cambia a la siguiente sin cerrar el menú; `pelota/hud.js`, `pm-plano`) o con la tecla C. La general,
  alta y por detrás como en la tele; la fija clásica (`camFija`), alta, centrada y quieta; y detrás de ti, a la altura
  del hombro de tu pelotari y algo a su derecha para que no tape el frontis, mirando al frontis y un poco hacia la
  pelota, que retrocede y sube un poco si la pelota se va al fondo. Los planos de después del tanto y el del saque del
  rival siguen con la cámara dinámica. Antes la fija era un interruptor aparte (`herrizherri-pelota-camfija` se sigue
  leyendo la primera vez).
- **Cartas al estilo de los juegos de fútbol, en morados** (`ui/sportCard.js`, `ui/sport.css`; `pelota/rules.js`,
  `cartaTier` y `pelotariRating`): el color de la carta va por la media, como allí, pero en la gama de morados: bronce
  (lila apagado, hasta 64), plata (lila claro, 65-74), oro (violeta con las cifras en el oro del juego, 75-84) y especial
  (casi negra, borde fucsia y halo, 85 o más). El equipo, azul o colorado, en la franja de arriba y en el puesto. Seis
  cualidades (velocidad, potencia, manos, remate, defensa y fondo; las tres últimas salen de las otras y del nombre) en
  dos filas de tres («73 VEL») cuando la carta mide 150 px o más (`@container`); en las estrechas, las tres de siempre. La
  figura va a la derecha, en dos tercios del ancho, para que la media y el puesto no le pisen el brazo. Abajo, en la placa
  (`.gx-pie`, en columna): el nombre, el pueblo con su hueco y las cifras pegadas al pie; antes iba cada uno a una altura
  fija y, en una carta pequeña, el pueblo caía sobre la raya del nombre y las cifras sobre el pueblo. Por debajo de 136 px
  no cabe el pueblo y va solo el nombre (sale en su ficha); las de por descubrir no llevan cifras, que serían rayas, y sí
  el pueblo, que dice dónde encontrarlas, con el candado bajo el «?» (`game/pelotaris.js`, `.pc-lock`).
- **La presentación del partido, con las cartas de los pelotaris** (`pelota/match.js`, `intro`, `rivalHtml` y `encaja`;
  la hoja, en `pelota/hud.js`: `.pel-pres`, `.pel-rv`, `.pel-team`, `.pel-lado`, `.pel-mas`; noviembre de 2026): el panel de
  antes de jugar enseña a quien juega con las cartas de jugador (`pelotariCard`), las mismas del cuadro del torneo y de la
  Gran final: tú con tu color a la izquierda, el «VS» y el rival; por parejas, las dos de cada lado, el delantero encima
  del zaguero, como en la cancha. Tocar una carta abre su ficha (`ficha(id)`). Antes iba una fila por pelotari con una
  foto redonda (la tuya, el avatar del pueblo, de sanferminero, que en un partido de pelota no pintaba nada) y un botón
  «Ficha»; `playerChip` y su CSS se han retirado. En una pantalla tumbada (móvil u ordenador) las cartas van a la
  izquierda, con todo el alto de la ventana, y lo demás (`.pel-lado`: el título con el campeonato y los tantos, el
  frontón, «Más opciones» con «Partes del frontón» al lado, el nivel en dos filas iguales de 3 y 2 y los botones) en una
  columna a su derecha, que no baja de 280 px; de pie, las cartas arriba y lo demás debajo. `encaja` mide el ancho de la
  carta (`--cw`, que la hoja pasa a `--w`) con el sitio que queda, como hace la Gran final, y lo vuelve a medir si la
  pantalla cambia de tamaño o se gira (`ResizeObserver`): mano a mano, de 136 a 200 px (seis cifras en dos columnas
  también en un iPhone pequeño tumbado, 667 × 375); por parejas, de 92 a 150. El peloteo y los retos no tienen rival y
  conservan la ventana de siempre. Con «Más opciones» abierto las cartas se apartan y la columna se deshace
  (`display: contents`): la ventana lleva entonces la clase `mas` (antes `opts`, que es la de las respuestas de los
  cuestionarios, `hub.css`, y en el ordenador ponía la ventana en fila); en el móvil tumbado la pestaña «Partido» cabe
  entera, con cada rótulo a la izquierda de su grupo y los dos interruptores en una fila. Lo comprueba
  `tools/auditoria-pelota.mjs` en 844 × 390, 667 × 375, 390 × 844, 1024 × 768 y 1280 × 720.
- **Pelotaris con color limpio y público más nítido** (`src/assets/meshy*/pelotari*.glb`; `actors/crowdSprites.js`,
  `TAM`; `actors/crowd3d.js`, `PUNTOS`): la textura de Meshy de los pelotaris iba a parches (dos rojos y un cuadriculado
  en la camiseta, manchas grises en el pantalón) y se veían «a trozos». Se ha limpiado zona a zona: camiseta de un solo
  color, algo más viva, pantalón blanco limpio y un poco más de color en todo; en los tres tamaños del modelo, y pesan la
  mitad. El guion que lo hace está fuera del repositorio; para otro personaje, hay que ajustar los tonos de cada zona.
  El público lejano, en láminas de 120 × 180 en calidad media y 144 × 216 en alta (antes, 96 × 144 en todas: se veía
  borroso); el cercano toma su color de la media de cinco puntos de la textura, no de uno, y ya no sale a manchas.
- **Jueces del frontón** (`game/fronton.js`, `makeJueces`; `actors/npcGlb.js`, `meshyFor` con `juez`): tres en la
  contracancha, a la altura de la chapa, del 4 y del 7. Son una persona normal, el chico del polo y el pantalón corto,
  con los dos teñidos de negro (`npcOutfit.js`), sin más: ni boina ni pañuelo ni los tacos del pelotari. En cada fallo
  (chapa, fuera, falta, pasa…) el que lo ve levanta el brazo derecho bien alto unos 2 s (`senalaJuez`, `brazoJuez`: cada
  hueso del brazo se gira para apuntar arriba encima de la animación; antes saludaba con la mano). El negro se pinta con su propia zona (`osasuna_juez` en `npcOutfit.js`): también el rojo de los bordes, de las
  sombras, de las medias y de las zapatillas, que antes quedaba en motas sobre el negro.
- **La grada del partido de pelota, con menos gente y cada uno suelto** (`game/fronton.js`; `actors/crowd3d.js`, opción
  `figuras`; 18 de noviembre de 2026, noche; el autor: «me hace falta más espacio entre los espectadores. Ahora mismo
  solo veo bultos… Prefiero que haya menos gente más definida»). La grada se sienta al tresbolillo: en cada fila, un
  asiento sí y otro no, y la fila siguiente al revés, así nadie tapa al de detrás. Con tope: 260 espectadores, 110 en
  el móvil y 60 en el más justo, los más cercanos al centro de la cancha y a las filas de abajo. Todos van con figura
  en 3D: los más cercanos con la entera y los demás con la simplificada, nunca con el retrato plano (`figuras: true`).
  Esto sustituye a «gradas llenas» de la nota siguiente, que queda como historia.
- **El esprint a mano y la cámara que deja ver el golpe al fondo** (`pelota/game.js`, `ESPRINT`, `EN.esprint`,
  `puedeEsprint`; `pelota/match.js`, `ESPRINT_TOQUE`, `encuadra`, `huyeK`, `cercaK`; `pelota/hud.js`, `.pel-sprint`,
  `esprint`; 19 de noviembre de 2026; el autor: «añadiría otro botón más que sea sprint, para cuando nos hacen una
  dejada o la pelota va hacia atrás muy rápido… y que la cámara hacia atrás vaya también mucho más rápido para que
  podamos ver al personaje golpeando, que a día de hoy eso no funciona»).
  *El esprint.* Botón ESPRINT encima de GOLPE (oscuro con el aro del color de la energía; lleno mientras corres a tope y
  apagado si no queda energía) y la tecla Mayúsculas, que deja de ser la dejada (sigue en K). Mientras se mantiene, tu
  pelotari corre la mitad más (`ESPRINT`), hacia donde lleves la palanca, sea suya la pelota o no; un toque del botón
  vale por una arrancada de 1,2 s (`ESPRINT_TOQUE`), porque en el móvil el pulgar tiene que volver a GOLPE. Con GOLPE
  mantenido (el pelotari va solo a por la pelota) también le hace correr más. Gasta energía aparte del esprint
  automático (`EN.esprint`), no sale por debajo de `EN.esprintMin` y cansado empuja menos. Solo durante el peloteo.
  *La cámara.* Tres cosas. Una: si tu pelotari corre hacia el fondo, la cámara se le adelanta según su velocidad
  (`huyeK`: sube enseguida y se apaga despacio), en vez de ir detrás de él con su retraso (a 9 m/s, casi dos metros,
  y el pelotari bajaba al borde de la pantalla); y la pelota larga la lleva atrás el doble de rápido (`largoK`). Dos:
  `encuadra`, tras `cabe`, en los planos de juego (el general y el de detrás): donde la cámara no cabe detrás del
  pelotari (el cubierto y el trinquete no pasan del rebote; el Labrit, de la grada del fondo), antes subía y miraba
  lejos, y con el pelotari en los dos últimos cuadros se salía entero por abajo. Ahora, si lo tiene cerca, baja a un
  plano por encima del hombro, abre el campo (`cercaK`, hasta 10 grados) y, si aún no cabe, mira más abajo hasta que
  sus pies quedan dentro (como mucho al 80 % de la media pantalla, que es donde ya caen en el plano de siempre; en
  el plano de detrás, al 90 %). Tres: lo mismo se comprueba con la cámara donde ha quedado en cada fotograma (solo
  inclinándola, y solo cuando ya está a menos de un par de metros de su sitio, para que no mire al suelo mientras
  cruza la cancha tras el saque), así que es continuo y no da saltos.
  Medido el 19 de noviembre con un jugador simulado que esprinta (10,2 m/s) en el frontón cubierto de Atarrabia, con
  tu pelotari al fondo (z > 24). A 1280×720: los pies quedan de media al 76 % de la media pantalla y nunca pasan del
  88 %, y la cabeza, siempre dentro. A 844×390: 79 % de media, 87 % como mucho. Antes, en lo mismo: los pies, de
  media al 193 % (es decir, fuera) y la cabeza hasta el 266 %: el pelotari no se veía al golpear. En el Labrit,
  retrocediendo a tope, los pies al 52 % de media (antes rozaban el borde, 96 %, corriendo a 5,4 m/s). En el mando, el
  esprint va en el gatillo derecho y la dejada pasa a la K (`mando/contextos.js`); en el móvil como mando, el botón
  ESPRINT encima de GOLPE (`public/mando/movil.js`).
- **Botones del partido discretos** (`pelota/hud.js`, «Botones discretos»; `style.css`, `.pel-hk`; 19 de noviembre de
  2026; el autor: «los botones son muy llamativos y quitan mucha atención visual»). Casi transparentes, con un aro fino
  blanco (`::before`, color en `--anillo`) y la letra con sombra: GOLPE, algo de rosa, se aviva un poco cuando la pelota
  está a tu alcance y ya no late; ESPRINT solo se colorea mientras lo mantienes y, sin energía, se apaga; la palanca y
  la ayuda de las teclas, también más apagadas.
- **La pelota que llega al rebote: la cámara y el golpe** (`pelota/match.js`, «LA CÁMARA DEL REBOTE», `fondoK`;
  `pelota/court.js`, `camZRebote`, `suelo-tras-rebote`, `pared-tras-rebote`; `pelota/physics.js` y `rules.js`,
  `BACK_UP`, `BACK_UP_H`; 19 de noviembre de 2026; el autor: «que podamos golpear si la pelota rebota en la pared de
  atrás. Que se pueda golpear y seguir jugando» y «la cámara debería cambiar para ver cómo la pelota llega hasta el
  final o al rebote»). *La cámara*: si la pelota es tuya y va al fondo (ya rebotada, o botada pasado el 25,5, o un
  golpe que la predicción manda al rebote, `deepShot`), la cámara se va, con un fundido, detrás de tu pelotari y por
  detrás de la pared del rebote (que se vuelve transparente: `reboteSeeThrough`), más alta y mirando a la cancha, y
  abre algo el campo; al golpear, vuelve. En los cubiertos no pasa de 4,6 m tras el rebote (`camZRebote`); allí, detrás,
  hay suelo y la pared izquierda sigue (sin ellos, por las esquinas se veía el vacío, sobre todo en el móvil tumbado,
  que ve más a los lados). *El golpe*: la pelota que tocaba el rebote después de botar salía casi rodando y se podía
  golpear durante una o dos décimas. Ahora, si da en el rebote por debajo de 1,8 m (`BACK_UP_H`) y sube despacio, sale
  hacia arriba con 3,6 m/s (`BACK_UP`, menos cuanto más alta da): unas siete décimas de margen, 4 o 5 m hacia
  delante. Medido sin pantalla con el partido de verdad: 21 de 21 pelotas al rebote se pudieron devolver (antes, 14 de
  24).
- **Las manos del público y el aplauso** (`actors/crowdAnim.js`, `manoA`, `MANOS`, `mMuslo`, `mPalma`, `mCuelga`,
  `mezcla`; 19 de noviembre de 2026; el autor: «todos los espectadores tienen las manos con las palmas hacia arriba;
  deben estar con las palmas hacia abajo o apoyadas en las rodillas» y «casi lo más importante son los aplausos»).
  Los brazos ya no se colocan con giros a ojo sobre el reposo del personaje (que trae los antebrazos levantados y las
  palmas hacia delante): la muñeca se lleva a un punto con dos huesos y trigonometría (`manoA`: brazo, antebrazo y hacia
  dónde va el codo) y la mano se orienta entera, con la palma mirando a donde se pide y los dedos hacia donde se pide.
  Como estos personajes no tienen huesos en los dedos, la palma y la dirección de los dedos se miden una vez en la malla
  sin mover (`MANOS`: los vértices de la mano; la dirección en que es más delgada es la palma, y su lado es el del
  pulgar). Sentados (`mMuslo`), las manos van sobre los muslos con la palma hacia abajo y los dedos hacia las rodillas,
  con cuatro variantes según la figura para que no estén todos igual; el brazo que cuelga del que levanta el puño va
  con la palma hacia el muslo (`mCuelga`); y el aplauso (`mPalma`) es delante del pecho, con los codos abajo, palma
  contra palma, abriéndose despacio y cerrándose de golpe (8 cuadros a 20 por segundo). De una postura a otra se pasa
  hueso a hueso (`mezcla`), sin saltos. Reparto nuevo en cada tanto (`programa`): se levanta uno de cada cuatro y los
  demás aplauden sentados (nueve de cada diez); de los que se levantan, más de la mitad aplaude de pie. Las pancartas
  de «¡Aupa…!» y la de los pelotazales se quitaron ese día (`game/fronton.js`; el autor: «no me gustan nada»).
- **El público sentado se mueve de verdad** (`actors/crowdAnim.js`, `crowdAnim`, `cocinaPublico`; `game/fronton.js`; 18
  de noviembre de 2026, noche; el autor: «que se vean los movimientos exactos de cómo se levantan y cómo celebran»).
  Antes cada espectador era una de dos figuras fijas, sentado o celebrando, y saltaba de una a otra. Ahora cada figura
  conserva su esqueleto: la malla lleva en cada vértice sus huesos y sus pesos (`aHueso`, `aPeso`) y el movimiento va
  en una textura pequeña, una fila por cuadro y tres puntos por hueso (87 cuadros por 23 huesos, unos 100 KB por
  figura). El sombreador mezcla dos cuadros (`aAnim`: antes, después y cuánto), así que todos los espectadores de una
  figura siguen siendo una sola llamada de dibujo y cada uno va por su cuadro. Movimientos, calculados al cargar sobre
  el reposo del personaje (`postura`): sentado mirando el juego, con la cabeza de un lado a otro (4 s en bucle, a 5
  cuadros por segundo; este lo pone el reloj en la tarjeta y no se manda nada mientras nadie celebra); levantarse en
  0,6 s con los pies clavados (la pierna, por trigonometría: `pierna`), el cuerpo echado hacia delante y la cadera
  avanzando sobre los pies; tres celebraciones de pie en bucle (el puño al aire, saltar con los brazos en uve y
  aplaudir); aplaudir sin levantarse; y sentarse, que es levantarse al revés y algo más despacio. En cada tanto
  (`programa`), cada uno empieza con su retraso; se levanta la mitad en un tanto normal y casi todos en el tanto final
  y en la entrega de la txapela, y de los que no, siete de cada diez aplauden sentados. Los abuelos aplauden, no
  saltan; el niño casi siempre salta. No se usa el clip de celebrar del personaje, que es el del pelotari y en la
  grada parecía una reverencia. Con la figura entera (unos 7.000 triángulos) van los más cercanos a la cámara: 60, 36
  en calidad media, 16 en el móvil y 8 en el más justo; los demás, con una más ligera (`simplifica`, de 2.000 a 3.000
  triángulos) que conserva la textura y la cabeza fina, sin grietas en las costuras, y se mueve igual. En el móvil,
  46 espectadores a la vista son unos 200.000 triángulos. Ya no se lee la textura de cada figura para sacar colores
  (unos 4 MB por figura). Si algo falla al cocinar, sale el público de antes (`crowd3d`). Las plazas con público de
  pie siguen con `crowd3d`. Página de prueba, solo en desarrollo: `tools/prueba-publico.html` (`?clip=subeA&f=0`
  para la tira de cuadros de un movimiento, `?modo=grada` para una grada entera; `window.__grada` en el partido)
- **Los planos de la grada tras un buen tanto** (`pelota/match.js` `dronGrada`, `cajaGrada`, `planoDron`; `pelota/game.js`
  `pausaTanto`; `game/fronton.js`, evento `grada`; 18 de noviembre de 2026, noche; el autor: «una vista de dron de
  todos los espectadores cuando se levantan a aplaudir, cuando se ha hecho un buen tanto. La imagen del público
  siempre es interesante»). Tras un buen tanto (un peloteo de seis golpes o más, un golpazo ganador o una volea que
  cierra un peloteo de tres), nunca en dos tantos seguidos ni en el último, la cámara corta a la grada. Desde el 19 de
  noviembre (el autor, visto el primero, que volaba por delante de la grada: «las cámaras no se ponen ahí»), son dos
  planos desde donde están las cámaras de una retransmisión de pelota, con un corte entre ellos: la principal, alta al
  fondo de la cancha (donde la fija clásica), que con el teleobjetivo cierra el plano sobre la grada mientras la gente
  se levanta (`fov` de 32 a 24, 40 a 32 en vertical); y la de pie de cancha, sobre una tarima de 2 m en la
  contracancha, pegada a la grada por fuera de la fila de los jueces y algo antes de su punta del lado del frontis,
  que mira a lo largo de las primeras filas mientras aplauden. Ninguna se mete en la cancha. `planoDron(u)` devuelve
  `{ n, p, l, fov }`; cada cambio de `n` es un corte (`camInit`). El plano de corte de «la grada que aplaude» (el
  quinto de los del tanto) sale también desde la contracancha junto al frontis; antes, desde la cancha pegado a la
  pared izquierda. Dura 3,4 s: la pausa del tanto se alarga lo justo (`pausaTanto`) y la repetición, si está puesta, viene después. La
  grada se levanta casi entera (`cheer(..., todos)`, nueve de cada diez). El encuadre sale de dónde hay gente sentada
  (`court.ocupados`): su centro, hacia dónde mira y cuánto ocupa a lo largo y a lo alto; así vale igual en una grada de pueblo (Lesaka) que en el Labrit; con menos de
  doce espectadores sentados, no hay plano. Mientras dura se esconden los mandos (`.pel-root.dron`),
  que tapaban al público; el marcador y el rótulo del tanto se quedan. Solo con la cámara dinámica y nunca con la
  cámara del cuerpo. Y un arreglo que pedía: el público elegía a quién dibujar cada doce cuadros, y tras un corte de
  cámara la grada salía vacía un instante; ahora, si la cámara salta más de 1,5 m o gira más de 20°, elige en ese
  mismo cuadro (`crowdAnim` `tick`), lo que también quita ese vacío en los demás planos del tanto. En las pruebas
  automáticas, solo con `window.__dron`, que además lo pone en cada tanto
- **La afición de los partidos de pelota** (`actors/crowdSprites.js`, conjunto `aficion`, `nFigs`; `actors/crowd3d.js`,
  `camisetaAzul`, `group.cheer(on, lado, len)`; `game/fronton.js` y `game/pasaka3d.js`): chicos y chicas con el polo de
  su bando, colorado o azul, y pantalón oscuro, para no confundirse con los pelotaris, que van de blanco. Son cuatro
  figuras: el chico del polo (`osasuna`, versión ligera) y la chica hecha sobre él (`chicas.js`, versión ligera con
  coleta, que ahora va en el juego), cada uno de colorado y de azul. El azul se pinta al cocinar la figura: lo colorado
  de los triángulos entre la cadera y el cuello pasa a azul en una copia de la textura, sin tocar labios ni botas. El
  pelo de las chicas va en un segundo grupo de la misma malla, con su color en los vértices. Sentados, en cada tanto
  se levantan casi todos los de la camiseta del que lo gana y alguno del otro, cada uno con su retraso, y se vuelven a
  sentar; al salir los pelotaris, muchos de los dos. Sin pañuelos: iban a la altura del sentado. Gradas llenas en
  todos los partidos y en todos los aparatos (`game/fronton.js`): cada butaca con su espectador, 900 en el móvil más
  justo. Antes el Labrit del móvil sentaba 400 de sus 1.881 butacas y quedaban vacías las de junto al frontis y los dos
  anfiteatros. El Labrit lleno, en el móvil, ronda los 485.000 triángulos y 175 llamadas de dibujo (el tope es 760.000 y
  490). Sin retratos (si no se pueden dibujar), la figura de lejos tiene tope: 280, 600 o 1.200. Las figuras y los retratos se preparan mientras se cargan los pelotaris (`preparaPublico`) y la presentación espera, como mucho 6 s, a que el público esté sentado: antes, en el móvil, la cámara de la presentación recorría unos 5 s la grada vacía. Los 24 más cercanos, con la figura entera y su textura (8
  en el más justo); todos los demás, con su retrato (`retratos`, `retratoMat`): cada figura, en cada pose, se dibuja una
  vez con su textura vista desde siete ángulos (de -90° a 90°, de 30 en 30) en una textura propia, y en la grada cada
  espectador es un rectángulo que mira a la cámara con el retrato del ángulo desde el que se le ve, con la misma luz que
  los de cerca. La luz propia del público, la de los pelotaris (`LUZ_PROPIA`, 0,28; antes 0,38), la piel algo más tostada
  (`PIEL`, solo los tonos de piel) y los retratos leídos con algo más de detalle (sesgo -0,7): con el sol y en el móvil, las
  caras de las primeras filas salían casi blancas y se veían grises, sin ojos ni boca (noviembre de 2026). Dos triángulos por espectador: el Labrit lleno del móvil pasa de 750.000 triángulos a 515.000. Se dibujan
  de figura en figura, una por imagen (en el iPhone, subir todas las texturas de golpe hacía perder la imagen), y la
  textura de los retratos se guarda para los partidos siguientes (`userData.shared`). Antes, los de en medio eran la figura
  simplificada con el color de cada parte en los vértices: sin ojos ni boca, como a medio cargar (noviembre de 2026). Las
  figuras de Meshy llevan la textura troceada en miles de piezas, así que al quitarles triángulos no se puede llevar la
  textura (ni juntando vértices ni con meshoptimizer: se quedaban casi igual). Si no hay tarjeta para dibujar los
  retratos, siguen las figuras simplificadas (`lejos`). Antes eran vecinos de fiesta, de pastor y de calle que celebraban
  sin levantarse.
- **Cambios de ritmo al correr** (`pelota/game.js`, `movePlayers`, `ritmo` y `sprint` de cada pelotari; `driveAI`):
  colocándose, al trote; si la pelota es tuya y a tu paso no llegas, esprint automático, con arrancada: hacia delante a
  por una dejada o una corta (×1,42) y hacia atrás si se va al fondo (×1,3). El rival también arranca a por las cortas y
  corre atrás a por las largas. El esprint gasta algo de energía propio, pero no cuenta como correr más (se mira la
  velocidad sin él): con el esprint automático la barra se vaciaba a medio partido. Al esprintar, la cámara dinámica
  abre un poco el plano (`sprintK` en `pelota/match.js`).
- **Duración de los partidos** (`pelota/rules.js`, `DURACIONES`, `duracionElegida`, `tantosDe`; en «Más opciones» del
  partido, `pelota/match.js`; `herrizherri-pelota-duracion`): rápido, normal (la de serie), largo o profesional, a 22
  tantos. Los torneos, el partido libre y la misión se escribieron a 5-9 tantos y se alargan según la duración, sin pasar
  de 22 (`game/fronton.js`, `playPelota`, guarda la base en `tBase`); los resultados de los demás partidos del torneo y lo
  que se lee en los cuadros, igual (`game/torneo.js`). Normal: el libre a 12, la final de un torneo de 16 a 22.
- **Retos del frontón** (`pelota/rules.js` `RETOS` y `estrellasReto`; la lógica, en `pelota/game.js`, sobre el peloteo de
  entrenar, `mode: 'rally'` con `reto`): como los juegos de habilidad de los juegos de fútbol, tres retos con tres
  estrellas cada uno. Peloteo: devolver seguidas todas las que puedas con 3 vidas (estrellas con 5, 10 y 15). Diana: un aro
  en el frontis, en un sitio al azar donde llegan los golpes apuntados (de 3,4 a 6,2 m de alto), y 10 pelotas (3, 5 y 7
  dianas). Dejadas: que bote antes de la raya del 2, 10 pelotas (3, 5 y 7). En la diana y las dejadas el rival solo te pasa
  pelotas y tu golpe se juzga solo (`retoTiro`); las que fallas o no devuelves también cuentan. En `pelota/match.js`: el
  panel de inicio con lo que hay que hacer y las metas, el aro (`dianaPon`), el marcador con lo que llevas a la izquierda y
  las vidas o la pelota que va a la derecha (`retoMarcador`) y el final con las estrellas. Se entra desde el menú de pelota,
  losa «Retos» (`game/torneo.js`, `retosMenu`, con un dibujo de cada reto), y se juega en el frontón elegido
  (`game/townDeportes.js`, `pelotaRetos`); la mejor marca se guarda en el perfil (`retos`, `apuntaReto`). Simulados con el
  piloto automático: los tres cuentan y se acaban; apuntando con la vista previa, de 7 a 10 dianas de 10.
- **Marcador del frontón a la derecha del frontis** (`pelota/court.js`, `bigBoard`, `setScore`): como en los frontones de
  verdad, pegado a la pared y sin postes, con dos filas (azules arriba, colorados abajo) en los morados del juego. En los
  de la calle, el frontis sigue 3,8 m sobre la contracancha, sin raya y con el revoco o la piedra de fuera
  (`frontis-contracancha`, con su caja de colisión `frontisExt`), y el marcador va en ese trozo; la pelota que da ahí
  es «lado». En los cubiertos, en la pared de delante de la contracancha. Antes estaba encima del frontis y luego en dos
  postes. En el Labrit no sale: allí está su pantalla de la pared derecha.
- **La raya de arriba de la pared izquierda** (`pelota/court.js`, `raya-izquierda`): una tira de verdad pegada a la
  pared, del color de las rayas del frontón; por encima, la pelota es mala. Pintada en la textura de la pared, de 34,5 m de
  largo y vista muy de lado, a lo lejos se emborronaba hasta desaparecer. Las texturas de la cancha (`canvasTex`) van con
  todo el filtrado que da la tarjeta (anisotropía hasta 16, antes 4).
- **Rótulos del partido que no chocan** (`pelota/hud.js`, `call`; `pelota/match.js`, `colocaRep`): el rótulo grande del
  juez y el de la repetición, si se cruzan con el marcador, bajan justo debajo de él. La fila de Ahora no y ¡A jugar! tiene
  otra vez su hueco y su fondo (`.pel-row`), que se había borrado sin querer.
- **Partido de pelota, que no se bloquee** (`pelota/match.js`): en el iPhone se quedó parado tras un tanto. La causa más
  probable: un golpe cargado cuyo botón no llegó a soltarse; con la cortada o la dejada cargadas, GOLPE no respondía y la
  palanca no movía al pelotari. Ahora el último botón que se toca manda (`chargeStart`) y, al cantarse el tanto, el golpe
  cargado se suelta sin golpear. Además, el vigía (`vigia`) destraba y apunta en el informe (`window.__errors`, «pelota
  parada») una pausa sin menú, ventana ni ficha, una repetición de más de 14 s, un golpe cargado más de 8 s en juego, los
  mandos escondidos en pleno juego y una ventana que ya no está. Cada muestra del informe lleva el estado (`estado`):
  pausa, menú, ventana, repetición, golpe cargado, mandos y ficha.
- **Maquetas del mapa** (`hub/maqueta.js`): lo que OpenStreetMap da como casa o nave y no lo es se reconoce por su
  nombre (`claseReal`): kioscos (peana, ocho columnas y tejado de ocho aguas), baluartes y portales de la muralla
  (piedra maciza sin tejado), castillos y el Palacio Real de Olite (recinto de cuatro alas con patio, torres con chapitel
  en las esquinas y, en los grandes, la del homenaje), palacios, conventos y museos (piedra, sin balcones ni leña) y
  lavaderos (abiertos, con postes). Lo pequeño y sin nombre dentro de una plaza, un pabellón bajo de piedra. Estos ya no
  se parten en casas como los bloques grandes.
- **Casas de las maquetas en orden** (`casasMaqueta` y `ordenaMaqueta` en `hub/maqueta.js`, noviembre de 2026): el mismo
  orden que dentro del pueblo (`levels/ordenar.js`). Las filas y manzanas que los datos traen como un solo edificio se
  parten en casas de unos 9 m con la fachada a la calle (`partirBloques`); dentro de las manzanas, anexos bajos de unos
  8 m con huecos de patio hasta lo que de verdad está construido, fuera de parques, plazas y huertas. Luego
  `ordenarCasasPasos`: las casas siguen la calle si casi lo hacen, dejan libres calle, plaza, puente y río, y dos que se
  pisan quedan pared con pared. Antes, en Tafalla una de cada tres casas pisaba la calle y en Tudela y Pamplona cientos
  se montaban; ahora ninguna o casi. Va por pasos de 60 casas antes de pintar el suelo de la maqueta (`mapa3d.js
  pasoMaqueta`): en Pamplona, todo de una vez era un cuarto de segundo con la imagen parada. Los ríos van en tramos de
  12 puntos y las plazas con su caja, para que no cueste comparar cada casa con todo el río o todas las plazas.
- **Anexos dentro de las manzanas** (`anexosManzana` en `levels/ordenar.js`, para el juego y la maqueta): donde
  `partirBloques` deja una manzana con casas solo a la calle, dentro van anexos bajos de unos 8 m (corrales, almacenes)
  con huecos de patio, hasta lo que de verdad está construido; no en parques, plazas, huertas ni campos. En el juego son
  casetas de piedra, revoco o ladrillo con teja (`world/townReal.js realHouses`), con su propio tope (`AMAX`: 320, 420 o
  520 según la calidad) y sin contar para el de casas, `NMAX`; se levantan hasta donde llegan las casas sencillas. Con su
  propio azar, de la posición o del nombre del pueblo, para que el resto del pueblo salga igual. Antes, en Tafalla, el
  interior de casi todas las manzanas era un prado.
- **Aire rural y medieval en pueblos y ciudades** (noviembre de 2026): en el casco, entre las casas, tierra apisonada
  con matas de hierba en vez de césped de jardín (`SURF.tierra` en `world/heightfield.js`; solo para pintar el suelo en
  `world/terrain.js`: el mapa y los pasos no lo leen como camino; los prados, huertas y campos de los datos siguen
  verdes). Sin canalones ni bajantes de cinc ni la placa azul del número (`world/houses.js`, `world/civic.js`);
  carpintería de madera oscura y cristal gris oscuro en vez de azul. Faroles de forja (`farol` en `world/village.js`):
  colgados de un brazo con tornapunta en la fachada más cercana si hay una a menos de 2,4 m, y si no en un poste fino
  sobre basa de piedra; en Pamplona, candelabros de forja con tres faroles en vez de farolas de globos. Casas de tres
  plantas y desván como mucho, cuatro en la ciudad; más portales de arco. Fuera del casco, graneros y almacenes de
  piedra o ladrillo con teja, portón de tablas y ventanucos, en vez de naves de chapa crema; los colegios, con
  contraventanas. Las tiendas de Pamplona, con tablero de madera y vidrio en cuarterones, y sus casas algo más bajas.
- **Parpadeos de paredes en el iPhone** (noviembre de 2026, vídeo de Roncesvalles): en las casas en cuesta, la base de
  piedra (`slopeBase` en `world/plot.js`) iba justo en el plano del zócalo de la casa y los dos se turnaban a trozos en
  cada imagen; ahora va 9 cm por fuera de la pared, 3 más que el zócalo, y con la piedra a la escala de las paredes (antes
  la textura iba estirada a toda la cara, con piedras gigantes). Del lado pegado a otra casa, el zócalo va 2 cm por dentro
  de la pared en vez de a ras. Y `realHouses` ya no levanta la casa de los datos que es la iglesia del juego (San
  Saturnino de Artajona va en ellos como casa y salía con la iglesia metida dentro) ni las que caen dentro de un
  monumento ya levantado con caja de choque grande.
- **Más detalle en las texturas** (noviembre de 2026; mismas medidas, sin más memoria): la mampostería, la sillería, la
  teja, la pizarra y el empedrado con el relieve picado de grano fino (`picado` en `world/textures.js`), verdín y musgo
  en las juntas y en el borde de las tejas; la madera con clavos de forja y vetas grises. En las paredes (`weather` en
  `world/builder.js`): desconchones del revoco repartidos por el mundo, con la mampostería de verdad a la vista (la misma
  textura de piedra, `tPiedra`, sin gastar más) y el canto de la
  cal, más abajo donde sube la humedad (en la textura se repetían cada 2,6 m); y de cerca, hasta 12 m, el relieve fino
  de la piedra y la cal con las derivadas de la pantalla, sin otra textura (en calidad baja, no).
- **Color de las casas del juego** (`world/textures.js`, `world/builder.js weather`, `world/sky.js`): piedra arenisca y
  parda con más color, sillería dorada, cal crema, teja de barro cocido algo más viva y pizarra gris parda en vez de gris
  azul. Las paredes (los materiales con `weather`) llevan de día una luz de rebote cálida con su propio color y un punto
  de calidez (`uDia`, que `engine/runtime.js` pone a 1 − noche en cada imagen; de noche, nada). De día, la luz del cielo
  algo menos azul y la del suelo, de tierra. Antes, a la sombra, la cal y la piedra salían grises azuladas.
- **Rótulos de las maquetas** (`rotulosMaqueta` en `hub/maqueta.js`; revisados pueblo a pueblo en noviembre de 2026):
  solo edificios y puentes con su nombre en OpenStreetMap, encima de su propio tejado. Antes salían de los lugares de
  Overture, que son sobre todo negocios con el punto en su dirección o en el centro del pueblo: el «Mirador de los
  Buitres» de Irurtzun flotaba sobre las casas, el castillo de Olite y la basílica del Puy salían dos veces. Fuera los
  nombres de negocios, servicios y calles aunque digan «iglesia» o «puente», los que solo dicen qué son («Convento»), los
  que nombran el pueblo («Base de Puente la Reina»), las pasarelas cortas y los mal escritos en el dato; el mismo sitio
  con dos nombres, en castellano y en euskera, una vez. Como mucho seis, de lo más importante a lo demás. Los núcleos de
  los pueblos guardan cuándo se vieron en `visto`, no en `t`, que es el pueblo: antes la hora lo pisaba y la maqueta no
  sabía de qué pueblo era, así que no tenía la iglesia de su ficha.
- **Los montes** (revisados uno a uno en noviembre de 2026): cada cima de `data/mountains.json` comparada con su cima de
  OpenStreetMap (de Overture, `tools/relieve/cimas-overture.py`) y con el relieve de verdad (AWS Terrain Tiles, nivel 13).
  24 tenían el punto lejos de su cumbre, hasta casi 6 km (Goñiburu, Astobizkar, Otanarte, Berrendi, Baigura,
  Lapazarra…), y se han llevado a la cima; Adi y Burdindogi, a la comarca donde caen. Bonbagaina va con `dudoso`: en OSM no
  hay cima con ese nombre; su punto, que caía en un valle, va ahora a la cima sin nombre de unos 1.175 m que hay a 800 m
  del collado de San Francisco (San Frantzisko lepoa, de donde sale su ruta), al este de Hiriberri, como dice su ficha;
  no sale en el mapa, ni en los miradores ni en el horizonte hasta confirmarlo. Con los puntos nuevos se ha vuelto a calcular `data/relieve.js` (`tools/relieve/perfiles.py`): cambian los
  montes que se ven desde los miradores de Lekunberri, Orreaga e Irulegi. En el mapa del inicio (`mapa3d.js`, `PK`), cada
  monte en su cima con su nombre y su altura, con la comarca elegida o muy de cerca; si no cabe encima, debajo, y si
  tampoco, solo el triángulo. En las comarcas con pocos montes en la colección, además, sus cimas de OSM que más destacan
  sobre su entorno (`data/montes-mapa.js`, de `tools/relieve/montes-mapa.mjs`), dentro de Navarra con un kilómetro de margen.
- **La iglesia del juego en su edificio** (`data/reales/iglesia.js`, `iglesiaReal`): la que nombra la ficha del pueblo,
  buscada por las palabras propias de su nombre (el santo o la advocación, en castellano o en euskera: «Done Mikel eliza»
  es la de San Miguel). La usan la misión de la iglesia (`levels/townReal.js`) y el rótulo de la maqueta. Antes iba en la
  iglesia más grande cerca del centro, y en Tudela, Olite, Estella y Puente la Reina era otra. Si no está en los datos,
  queda la de los datos con su propio nombre en el rótulo. También vale el edificio que solo lleva el nombre del santo, aunque
  el dato lo tenga por casa, si tiene todas las palabras de la ficha: «San Saturnino» en el Cerco de Artajona (y la muralla
  del Cerco, en anillo alrededor de ella), «San Esteban» en lo alto de Erronkari. Los monumentos de la ficha ya no se ponen
  encima de la iglesia, y lo que va junto a ella (ermitas, estelas, la tumba de César Borgia en Viana) se busca a su lado y
  no junto al centro del pueblo.
- **Monumentos con su punto de verdad** (`real: [lat, lon]` en la ficha; los yacimientos de `data/yacimientos.js` lo
  llevan solos): si cae dentro del mapa del pueblo, ahí; si no, en el borde del casco en la línea hacia donde está (los del
  río, en su orilla), para que el mapa y la brújula señalen su dirección de verdad. La Fuente del vino, a la salida de
  Estella hacia Irache, y no en la plaza; la Foz y el Puente del Diablo, al sur de Lumbier, en la orilla.
- **Frontón y pista sin caminos debajo**: el frontón de los datos se mueve hasta 24 m si así no pisa ninguna calle; la pista
  busca primero un sitio sin caminos a menos de 230 m, luego hasta 320 m, y solo si no lo hay acepta pisar alguno. Si así
  no cabe en ningún sitio, otra vez sin contar los árboles ni las matas (`rectFree(…, sinArboles)`), que la pista y el
  frontón quitan al levantarse (`clearTrees` y `clearBushes`, en `world/nature.js`): en Viana, una mata la dejaba sin pista.
  Los caminos se miran también bajo la rampa de entrada de la pista, y cada 2 m si parece libre. En Aribe, Ituren y Viana
  no hay ningún hueco llano sin camino, y la pista pisa un poco uno (en Viana, también el frontón, que está donde el real).
  La feria de ganado, si no hay prado despejado, busca hasta 320 m uno con árboles y los quita (antes, sin prado, los
  corrales iban junto al tratante y en Lumbier caían encima de una casa). Los árboles del casco no crecen en escalones ni
  escalinatas (`onPlatform(…, true)`): en Lumbier un roble salía en los escalones de la iglesia.
- **Irulegi es Lakidain** (noviembre de 2026): la ficha es la de Lakidain, al pie del monte Irulegi, pero su trazado se
  había sacado alrededor de Ilundáin, 1 km al suroeste, y salía la iglesia de San Juan Evangelista. `data/reales/irulegi.json`
  se ha vuelto a sacar centrado en Lakidain (`tools/pueblo-real.py` y `tools/pueblo-real-juego.py`, misma versión de
  Overture que los demás) y su iglesia es ya la de San Martín de Tours; `centros.js` lo sigue (`tools/reales-centros.py`, que
  ahora se salta los JSON que no son un pueblo). El yacimiento, el castillo y el poblado van hacia la cima del monte Irulegi
  (42,7794 −1,5134, OSM), al este; antes el punto del yacimiento caía al oeste.
- **Color y texturas de la maqueta y del relieve** (`hub/maqueta.js`, `hub/emblemas.js`, `hub/mapa3d.js` y
  `hub/mapa3dSombreadores.js`):
  - Los colores de las casas van en sRGB, como se ven (`PAL`, `PIZARRA`, `NAVE`, `BALCON`): por tierra, la cal
    (crema en el norte, ocre en la Zona Media), la piedra (arenisca o parda), el ladrillo de la Ribera y la teja de barro
    cocido; la pizarra del Pirineo, gris pardo. Antes iban en HSL lineal (`setHSL` es lineal: 0,75 ya se ve casi blanco)
    y con poco color, y con la luz malva salían frías: blanco gris, piedra lila y tejas rosa salmón. Cada casa toma un
    tono de su lista y un punto de luz propio; alguna teja nueva, más viva. El hastial lleva el color de su propia pared
    (atributo `aPared` de cada instancia), las contraventanas son pardas, verdes o rojo almagre de verdad y el musgo de
    los tejados, verde oscuro. Iglesias, torres, palacios y monumentos, de la piedra de su tierra.
  - La maqueta lleva su propia luz y no el tono de cine (`toneMapped: false`; caché `maqueta8`): al final del sombreador,
    un sol de media tarde del suroeste, a unos 40°, cálido, y un cielo azul que llena las caras en sombra de gris
    azulado, con algo del verde del prado en las que miran abajo. Cada casa tiene un lado soleado y otro en sombra. Hasta
    el 14 de noviembre de 2026 iba con la luz del mapa, del noroeste: desde la cámara se veían casi siempre las caras en
    sombra y, con el tono de cine, el blanco salía gris y las tejas de un mismo naranja quemado («lo más feo son las
    casas y el suelo»). Las sombras pintadas en el suelo de la maqueta, de casas y árboles, caen por eso hacia el noreste
    y son azul frías; las del núcleo de lejos siguen hacia el sureste, con la luz del mapa.
  - Desde ese día, «un mundo de fantasía, pero con una lógica»: la teja con más variedad de una casa a otra, del coral al
    pardo viejo; la cal, blanca y limpia; la pizarra del Pirineo, gris azulada, como la losa de Roncal y Salazar. Los
    árboles, tres verdes de hoja por comarca (`VERDES`, en HSL lineal) que se reparten según el mismo número al azar de
    cada árbol: fresco en el norte, algo más hondo en la Zona Media, el amarillo verdoso de los chopos en la Ribera; los
    abetos, verde azulado hondo; los cipreses, casi negros. Abajo, a la sombra de la copa, más hondos y azulados; arriba,
    más claros y cálidos. Ni rosas ni olivas donde no los hay.
  - La noche del 14, otra vez, con Estella y Leitza de cerca: «son unos colores horribles. Los tejados, el color de las
    paredes, el color del suelo». La teja, de barro cocido envejecido y no naranja: tonos pardos y de barro, de 20 a 25°,
    con menos color y más diferencia de una casa a otra (cada casa, entre 0,86 y 1,12 de luz); en el norte, más oscura,
    de clima húmedo, y en la Ribera, más de barro. La cal del norte, blanca sin amarillo; en Estella y la Zona Media,
    piedra de miel y revoco ocre; en el Pirineo, más casas encaladas entre las de piedra gris (antes, seis de cada diez
    de piedra; ahora, menos de la mitad). La luz de la maqueta, más baja (sol 0,66 y cielo algo más gris; caché
    `maqueta9`): con la de antes, la cara al sol pasaba de 1 y el blanco se quemaba y la teja se iba a naranja. Los
    verdes de los árboles, con algo más de la mitad del color de antes. Las casas del núcleo visto de lejos, con la misma
    teja envejecida (antes, naranja vivo).
  - Y el suelo: de cerca (`uCerca`, a menos de unos 10 m de mapa), la hierba más honda y sin pasarse a lima, y lo seco y
    claro, de un amarillo de verano en la foto, hacia piedra cálida. En `prado` del núcleo, la hierba ya no gana color.
    El acabado vivo del relieve sigue para ver el mapa entero.
  - Sin bordas ni casas sueltas (`sinSueltas`, `maqueta.js`, también en las casas del núcleo de lejos): fuera de los 120 m
    del centro solo se quedan las casas con al menos dos vecinas a menos de 30 m, y las bordas, solo dentro de 80 m; lo que
    tiene nombre se queda siempre. Desde el aire y el dron se veían como cajas grandes sueltas por el monte («eliminar
    esas bordas gigantes que se ven desde la vista aérea»).
  - Sin niebla (noche del 14): la bruma solo cubre el último quinto antes de donde acaba lo que se dibuja, para que no se
    vea el corte del mapa contra el cielo, y ya no se vuelve lila de cerca. «Es que no tiene que haber niebla».
  - El suelo de los núcleos (`prado` en `pueC`, `mapa3dSombreadores.js`): en la foto fina de verano los prados salían
    verde oliva, de 70 a 75°, al lado del verde de 100° del monte. Lo que es verde, con más verde que rojo y que azul, se
    lleva a prado y gana color; el cereal, la tierra, las calles, los tejados y el agua se quedan como son.
  - Antes de eso, la luz malva del cielo del mapa se corregía en la maqueta con un punto de calidez al final del
    sombreador.
  - A media distancia, una franja más oscura por piso en las fachadas, para leer la altura de cada casa.
  - En el suelo pintado de la maqueta, los adoquines y las losas solo si sus juntas caben en el lienzo; si no, piedra a
    motas. Los ríos, con orilla oscura y un brillo en el centro.
  - En el relieve de la comarca, las parcelas sin rejilla de tablero: hileras corridas al azar y parcelas partidas en
    una, dos o tres tiras. Las laderas en sombra, sin llegar al negro. Los árboles de la comarca, con algo de luz
    propia, para que no salgan como motas negras.
- **El dron de cada pueblo en el mapa del inicio** (`hub/mapa3d.js`, `perfilDron`, `holgura`, `despeje`):
  - Una vuelta en tres minutos, y todos sus vaivenes son múltiplos de esa vuelta (`DRON_W`): cada vuelta es igual a la
    anterior. El vuelo hasta el pueblo dura al menos 4,2 s desde toda Navarra, no 2,6.
  - Todos los vuelos siguen el camino de van Wijk y Nuij (`camino`, el de `d3.interpolateZoom`): lo que corre el suelo, en
    proporción a lo lejos que está la cámara, va igual de suave todo el camino. Para ir lejos (de Isaba a Tudela) sube,
    cruza por alto mirando más desde arriba y baja; para acercarse, se centra mientras aún está alta. El tiempo sale de lo
    largo del camino, hasta 5,4 s, con una curva sin tirones ni en la velocidad ni en la aceleración. El giro, el más
    corto, y siempre entre -π y π (`normaYaw`): con el dron crecía sin parar y la cámara daba vueltas al volver.
    Antes el sitio y la distancia se mezclaban cada uno por su lado y, a ras de tejado, el suelo salía disparado de lado:
    el golpe de cámara de noviembre de 2026. Los vuelos que no pasan por `volar` (el de abrir el mapa) hacen su camino
    en la primera imagen.
  - La cámara va con la comarca que tiene debajo (`hRef`): si esta sube o baja, al elegir otra o al volver a toda
    Navarra, la cámara se mueve con ella en la misma imagen. Por eso la cámara se calcula después de las comarcas. Con
    la cámara muy cerca, las comarcas suben y bajan más despacio (`velC`). Antes la de debajo bajaba de golpe más de
    cinco veces lo que la cámara estaba de cerca, y la cámara la seguía después.
  - Si las casas del pueblo llegan a medio vuelo, el final del vuelo se corre hasta ellas sin tirón (un muelle
    amortiguado, `dron.vx`), y la inclinación pasa en 2 s a la calculada allí (`dron.antes`, `mezP`). El dron arranca en
    6 s con su giro cogiendo velocidad (`DRON_T`), y su inclinación va por una curva suave entre los puntos del perfil
    (`enPerfil`). Sobre un sitio, la altura a la que mira es la de su comarca, aunque el vaivén se asome a la de al lado.
  - `despeje` sube deprisa pero sin salto, nunca a menos de media holgura. El dron y el paseo van a todas las imágenes,
    sin el tope de 30. Los programas de la maqueta se compilan al tocar una comarca o un pueblo, no a medio vuelo, y la
    maqueta se hace en pasos más cortos (tandas de casas, la imagen a la tarjeta gráfica en un paso aparte).
  - Los tirones al llegar a cada pueblo eran, sobre todo, parones de la tarjeta gráfica la primera vez que pintaba algo a
    media bajada: los pájaros y su sombra al aparecer (casi un segundo en el navegador de pruebas) y las casas de la
    maqueta al levantarse. Ahora `calienta`, al tocar una comarca o un pueblo, pinta una vez los pájaros invisibles
    (`aves.estrena`, a escala cero) y compila también el material de los lugares emblemáticos; y las casas de la maqueta
    se pintan, aún transparentes, en la imagen siguiente a hacerse, al principio del vuelo. Si se añade algo que salga
    solo de cerca, hay que estrenarlo igual: si no, el parón vuelve justo al llegar.
  - Para medirlo, las pruebas de la carpeta de trabajo `golpe.mjs` (cada imagen y las aceleraciones de la cámara),
    `inicio.mjs` (el final del vuelo y el comienzo del dron, con lo que tarda cada imagen) y `lento49.mjs` (cada pieza
    que se pinta, cronometrada, para encontrar la que para la imagen). En el navegador de pruebas algunas imágenes llegan
    a destiempo y dan aceleraciones falsas: hay que mirar el paso de cada imagen, no solo la cifra.
  - Auditoría de los vuelos, uno tras otro (entrada, paseo, comarca, dos pueblos, espacio natural, vuelta a Navarra,
    paseo y arrastre), con el gancho `estado`: véase la prueba de la carpeta de trabajo `aereo.mjs` en las notas.
  - Antes de salir se prueba la vuelta entera, cada segundo y medio, y se guarda la inclinación justa para que la cámara
    no toque el relieve (`perfilDron`); se ensancha y se suaviza, para que suba antes de llegar al monte. Antes iba
    siempre a 0,5 y, en Lesaka, Leitza, Lekunberri, Orreaga o Ujué, la cámara saltaba hacia arriba de golpe.
  - `despeje`, en cada imagen, con la misma holgura, y además alrededor de la propia cámara, con el margen de su plano
    cercano: si no, cortaba la ladera de al lado y por el corte se veía el fondo negro.
  - Siempre con el pueblo a la vista: el dron va al corazón de sus casas (`centroCasas`: su centro, contando más las
    grandes, y luego solo las que quedan a menos de 350 m), no a la chincheta, y su vaivén es de unos 40 m. Antes era de
    170 m y en Aoiz el centro de la vista acababa en el prado, con el pueblo en una esquina. Si las casas llegan después
    de tocar el pueblo, el dron se corre despacio hasta ellas.
  - Los espacios naturales, sin maqueta, van en un arco, con la cámara del lado de dentro de su comarca y más desde
    arriba: desde fuera se veía la pared de la comarca y el fondo.
  - La niebla de lo lejano: de lejos, del color del fondo; de cerca, una bruma clara.
  - Para probarlo pueblo a pueblo, los ganchos de desarrollo `saltaVuelo`, `dronT`, `fija`, `despeje`, `sonda`, `centro`,
    `vista` y `estado` (en qué está la cámara: vuelo, dron, paseo, comarca y pueblo elegidos, maqueta, inercia y subida).
- **Navarra, que se distinga de lo de alrededor** (`hub/mapa3d.js`, el suelo de fuera y `contornoM`): el relieve de
  alrededor era del mismo verde y con la misma luz, y en la vista general Navarra no se distinguía.
  - Una máscara de Navarra (`NAV`: nítida en rojo y difuminada en verde, hecha dibujándola pequeña y agrandándola, sin
    filtros del lienzo) apaga lo de fuera y pone una sombra suave junto al borde, por fuera. Desde el 12 de noviembre de
    2026, lo de fuera va casi del todo a un añil oscuro como el del fondo, con su relieve a poco contraste: se adivina,
    pero Navarra queda como una isla con luz. Casi igual de cerca que de lejos (`FUERA`, de 0,82 a 1). Antes era un gris
    frío con todas sus sombras y, de cerca, apagado solo a medias (de 0,4), se confundía con Navarra.
  - Desde que el fondo es un cielo de día (`uCielo` a 1), lo de fuera apenas se apagaba, un 17 %, y con el relieve y la
    foto también alrededor Navarra volvía a no distinguirse. El 15 de noviembre de 2026, el autor: «que se distinga algo
    el mapa de Navarra del resto de la península». Ahora lo de fuera va a la mitad hacia un gris pajizo algo frío, como
    lejano; junto al borde algo menos y del todo a un par de kilómetros, con la máscara difuminada, para que no haya
    escalón ni raya. El mar guarda su azul.
  - El contorno de fuera de Navarra: una cinta clara sobre el borde de las losas, con otra oscura debajo que la recorta,
    del mismo ancho en pantalla a cualquier distancia (`ANCHO_B`). Solo los tramos que no dan a otra comarca; va con su
    comarca al levantarse.
  - Entre comarcas, una raya fina color crema (antes una junta oscura, casi negra, que no gustaba) y, a cada lado, una franja del color de cada comarca que se apaga hacia dentro
    (`juntaM`, `bordeIn`), con el mismo ancho en pantalla: se ve dónde acaba una y empieza otra aunque sean del mismo
    verde. Los tramos se cuentan desde donde cambian (`tramos`), para no partir ni repetir uno que da la vuelta.
- **Relieve más nítido y con mejor color** (`hub/mapa3dSombreadores.js`): la imagen de relieve fino se perfila de cerca,
  cuando cada punto suyo ocupa más de un píxel; los colores apagados ganan algo de color, las sombras no llegan al negro
  y tiran a un azul malva, y las luces son algo más cálidas. En el móvil, la comarca elegida, con el relieve fino a 28 m.
- **Pájaros y agua que se mueve en el mapa del inicio** (`hub/pajaros.js`, `hub/mapa3d.js`, `hub/mapa3dSombreadores.js`):
  - Con un sitio elegido, sobre él: en los pueblos y ciudades, cigüeñas blancas y milanos pardos que planean en círculo
    sobre el corazón de sus casas; en los espacios naturales, buitres leonados y milanos, más altos y en círculos más
    anchos, a la escala de su cámara (`f`). Aletean a ratos y dejan su sombra en el suelo. Al cambiar de clase de sitio,
    primero se van las de antes y luego vienen las nuevas. Llegan despacio y se van deprisa. En la vista de toda Navarra
    y en la de una comarca, ninguno: las bandadas que cruzaban por ahí no gustaron.
  - Una sola malla repetida para todas las aves y otra para las sombras: dos dibujos, y ninguno sin pueblo elegido. El
    aleteo va en el sombreador. En el móvil, menos aves.
  - El agua: destellos que bajan por los ríos de la comarca, ondas en los embalses y en el mar, y ondas de unos 7 m en
    los ríos, balsas y piscinas pintados en el suelo de la maqueta. Estas últimas se reconocen por su color y se apagan
    de lejos, para que no titilen.
- **Ventajas en el comercio local** (`game/ventajas.js`, `data/comercios.js`, sección Ventajas del menú en `hub.js` con
  `hub/ventajas.css`, y `VENTAJAS-COMERCIOS.md` para comercios y ayuntamientos): los sellos, las insignias y los
  certificados valen bonos en los comercios adheridos. Certificados: uno por comarca, al sellar todos sus pueblos, y el de
  Navarra, con todos; se ven como un diploma con tu nombre, los pueblos y la fecha. Cada oferta de un comercio pide un
  logro (el sello de un pueblo, un certificado, una insignia o varios sellos); ganada, se saca el bono, que vale un mes, con
  su código (HZ, el comercio y siete letras, la última de control) y su QR, una franja que se mueve y la hora, que corre;
  el comercio lo canjea tecleando su clave en el móvil, y en el juego solo va la huella de la clave
  (`tools/clave-comercio.mjs`). Un bono por oferta a la vez y, tras usarlo, otro al mes. Las ofertas ganadas sin ver salen
  con un número en el botón de Ventajas; en la ficha de cada pueblo, las de sus comercios. Todo en la partida, sin
  cuentas ni datos personales; mientras no haya comercios de verdad, ejemplos sin nombre propio, marcados, con la clave
  0000. Reglas: nada de alcohol, tabaco ni apuestas, y compra una persona adulta. La fase 2, con un servidor que apunte
  los bonos para que no se repitan borrando la partida, está descrita en `VENTAJAS-COMERCIOS.md`.
- **Lugares emblemáticos del mapa** (`hub/emblemas.js`, `data/reales/emblemas.json`, `tools/emblemas-real.py`): con su
  planta de verdad, de OpenStreetMap por Overture Maps, y lo que no está en los datos, de lo que se sabe del sitio. La
  Ciudadela de Pamplona, con los muros de sus baluartes, revellines y fosos, sin los dos baluartes que miraban a la ciudad,
  derribados con el Primer Ensanche en 1888, el parque que la rodea y los edificios de dentro; El Sadar, con su fachada
  roja, sus gradas, su cubierta y el campo con sus franjas; y Castildetierra, en las Bardenas, con su falda de cárcavas, la
  chimenea de arcilla y el remate de arenisca. Estos tres van sueltos sobre su comarca y se levantan al acercarse, ya desde
  lo alto. Con la maqueta de su pueblo, en lugar de las cajas de los datos: el Palacio Real de Olite, con su contorno
  almenado, el Palacio Viejo, la muralla y las torres en las esquinas que más salen, la del homenaje de 40 m, la de las
  Tres Coronas ochavada y cuatro con los capuchones negros de la restauración del siglo XX (el sitio exacto de cada torre
  no está en los datos); el castillo de Javier, con su torre del homenaje y su muralla; y los puentes de Burgui, de cuatro
  arcos, y de Puente la Reina, de seis, con sus tajamares, su lomo y sus pretiles. El kiosco de la Plaza del Castillo ya
  estaba (`maqueta.js`). Una malla por sitio, con su color en cada vértice; la altura, con la de las casas, y en los
  puentes medida desde el agua para que toquen las dos orillas.
- **Trashumancia:** en el mapa de Navarra (`hub/mapa3d.js`), la Cañada Real de los Roncaleses, del valle de Roncal a las
  Bardenas (trazado aproximado), en una raya discontinua de una capa encima del mapa, y su rebaño, un nombre que baja por
  ella poco a poco; tocándolo, su ficha (`hub.trashumancia`), con la misión «La trashumancia» del Roncal (juntar el
  rebaño en el redil antes de salir a la cañada, al final de sus misiones para no mover las hechas).
  Desde el 15 de noviembre de 2026 la cañada es un camino pegado al relieve, como los ríos: una cinta cortada por
  comarcas (`canM`), cada trozo hijo de la suya, que sube con ella cuando flota, queda tapada por los montes de delante y
  nunca cruza el hueco ni el cielo; discontinua, color de tierra pisada con su orilla parda, y el trazo avanza despacio
  hacia las Bardenas. La raya de la capa plana, con las islas en el aire, se cortaba, pasaba por encima de los montes y se
  cruzaba con los nombres («lo de la trashumancia ahora está generando un conflicto. Ponlo de otra manera»). El rebaño
  sigue siendo una ficha sobre el camino, que se esconde detrás de una isla en el aire.
- **Ritmo de los textos** (`style.css`, `:root`): un solo orden de aire para todo. La escala, en la rejilla de 4 px:
  `--e1` 4, `--e2` 8, `--e3` 12, `--e4` 16, `--e5` 20, `--e6` 24, `--e7` 32 y `--e8` 48. Entre textos, siempre medido de
  lo que se ve (de la línea base de uno a la mayúscula del siguiente): antetítulo a título, 12 (`--r-kt`); título a
  subtítulo, 8 (`--r-ts`); del título o el subtítulo a lo siguiente (texto, datos, botones), 16 (`--r-tx`); de párrafo a
  párrafo, 12 (`--r-pp`); de la cabecera al cuerpo, 24 (`--r-bl`); de una sección a la siguiente, 32 (`--r-sec`). Para que
  el hueco del CSS sea el que se ve, los textos de las cabeceras llevan `text-box: trim-both cap alphabetic` (clase `.rt`
  o reglas propias), que recorta la caja de la línea a la mayúscula y a la línea base; por eso los nombres de los títulos
  van en su `<span>` y los rótulos son de bloque con la raya en un `::before` en línea (el recorte no vale en una caja
  flexible). Nunca en un texto con `overflow: hidden` o puntos suspensivos: se comería lo que baja de la línea. Donde no hay recorte, `--t-mt` y `--t-mb` dan los mismos 12 y 16 descontando con el «em» el aire de la letra. Va en la
  ficha del pueblo, la cabecera de la comarca, la ficha del mapa, la galería, la pantalla de carga, los cuentos, la
  pasaka, las tarjetas de deporte y las cabeceras del armorial. Rellenos de las cajas: 24 en el ordenador y 16 o 20 en el
  móvil. `tools/auditoria-diseno.mjs` lo comprueba («espacio»).
- **Galería de Pueblos** (`hub/galeria.js`): un anillo con fondo, como una rueda vista desde fuera: las cartas van una
  junto a otra, borde con borde, cada una más girada y más honda que la anterior, hasta llegar a las flechas, y las
  siguientes se apagan. La primera de cada lado va lo más girada que deje llenar hasta las flechas con dos o tres detrás,
  entre 28° y 48°: en el ordenador, mucho; en el móvil tumbado, donde la carta es pequeña para el ancho, menos y con
  tres. La perspectiva es proporcional a la carta, así la profundidad es la misma en todas las pantallas. En el móvil de
  pie asoman por el borde. Desde noviembre de 2026 no hay un carrusel por comarca: todos los pueblos van en una sola fila,
  comarca tras comarca, sin repetir ninguno, y al pasar el último de una comarca sigue el primero de la siguiente, con su
  pestaña encendida arriba y cada carta del color de la suya. Las pestañas (y ↑ ↓) saltan al primer pueblo de cada comarca:
  si está lejos, las cartas se apagan, se pasa y entran las de allí desde su lado, sin recorrer las de en medio. Es
  circular desde el 16 de noviembre de 2026: tras el último viene el primero, por el lado más corto, y las flechas no se
  apagan nunca. Empezando por la primera, el lado izquierdo quedaba vacío y la de delante parecía descentrada («las
  imágenes del carrusel no están bien centradas [...] que sean un carrusel circular»). Vale igual para el menú de pelota. Las portadas se piden al acercarse a la de delante y se
  sueltan al alejarse mucho (`foto` en `galeria.js`): con las 38 a la vez, el móvil se quedaba sin memoria. Las flechas del
  teclado son de la galería solo mientras se ve: escondida detrás de un pueblo, se las quedaba y en el ordenador el
  personaje no andaba con ellas. Antes, al
  llegar al último pueblo de una comarca había que volver arriba a elegir otra, y con menos de ocho pueblos se repetían.
  Debajo, el pueblo de delante: el rótulo y, en su propia fila (`.gi-fila`), el nombre y sus misiones; en el móvil
  tumbado van uno al lado del otro, centrados entre sí y debajo del rótulo, en una sola fila (si no caben, las casillas
  encogen un poco) y sin la cuenta en los más estrechos. Antes las misiones subían hasta el rótulo y se montaban con él.
- **Misiones en el pueblo, arriba a la izquierda** (`ui.js`, `eligeMision`, y `#misiones` en `style.css`): solo los
  iconos de las misiones del pueblo, una casilla por misión del color de su categoría (hecha, llena y con su marca verde
  sobre amarillo; la que sigues, con borde blanco). Al tocar una, pasa a ser la que sigues y debajo se despliega: su
  nombre, lo que toca hacer, sus pasos y lo lejos que está; se recoge sola a los 10 s, tocando la misma casilla o
  tocando la pantalla en cualquier sitio fuera de la barra (un `pointerdown` en captura en la ventana, que no detiene el
  toque: sigue sirviendo para andar, mirar o pulsar un botón; noviembre de 2026, lo pidió el autor), y tocando lo
  desplegado se abre el cuaderno. Empieza plegado y solo se despliega al tocar (lo pidió así el autor): al
  cambiar lo que toca hacer, late la casilla de la misión (`lateMision`) y sale el aviso de abajo. En los tumbados más
  estrechos, las casillas van en dos filas. Se probó a volver al recuadro con la misión, el pueblo y el desplegable, y el
  autor prefirió los iconos. (En la aventura de Otsagabia, la de las cintas, sigue el recuadro de antes.)
- **Mapa del pueblo que ayuda en las misiones** (`ui.js`, `openMap` y `misionesMapa`; `ui/mapview.js`): a un lado el
  mapa y al otro la lista de las misiones del pueblo, minimalista: una línea por misión con su icono en el aro del color
  de su categoría, su nombre y lo lejos que está; lo que toca hacer, solo en la que sigues, que va encendida (primero las
  que faltan). Las pestañas Misiones y Lugares hacen de cabecera, con lo hecho dentro de la de misiones; sin recuadros por
  fila ni «!» (eso lo dice el mapa). Un nombre largo pasa a la segunda línea con la misma letra. Al tocar una, pasa a ser la que sigues,
  el mapa va a ella y sale su ficha con el botón para ir. En el mapa, las marcas de misión llevan su icono y su color (como
  las casillas de arriba y el minimapa), con su «!» si no está empezada y la marca verde sobre amarillo si está hecha, y el
  camino hasta lo que sigues va en una línea rosa a trazos por calles y caminos (`nav.findPath`, se rehace al moverse 4 m).
  El encuadre del principio incluye el objetivo. En vertical, la lista va debajo del mapa; en el móvil tumbado, sin
  leyenda (la lista ya lo dice).
  El dibujo del mapa (`ui/mapvector.js`, `tesela`; `mapview.js`): cada campo lleva el dibujo de su cultivo encima de su
  color (briznas de prado, hileras de heno y cereal, surcos de tierra labrada, filas de viña y huerta, marco de olivos y
  frutales), el bosque copas, el agua ondas, la roca motas y las calles empedrado con el borde marcado; las teselas se
  pintan siempre al mismo tamaño en pantalla. Las casas, con su sombra abajo a la derecha, una vertiente con luz y otra en
  sombra, el caballete por el lado largo y un tono distinto cada una (en el Pirineo, la mitad de pizarra); los árboles,
  también con sombra. Abajo a la izquierda, el norte encima de la regla. En el móvil tumbado, el encuadre y los nombres
  dejan sitio al título, que va encima del mapa.
- **Geometría más ligera** (octubre de 2026): el suelo (`terrain.js`, `empaca`) guarda la normal, las superficies y el
  color en bytes (el color como raíz cuadrada, que el sombreador eleva al cuadrado; así los verdes oscuros no hacen
  escalones): de 56 a 28 bytes por vértice, 18 a 11 MB en Estella. Los animales (`animalGlb.js`, `aligera`) juntan los
  vértices repetidos que dejaban las aristas marcadas (`mergeVertices`, solo los iguales en todo: el sombreado no cambia) y
  guardan pesos, huesos y normales en bytes: de unos 8 a 1,6 MB (el más grande, de 33 300 a 7 300 vértices). Las casas
  (`builder.js`) ya iban en bytes; ahora normal y color van de cuatro en cuatro bytes, como quiere la tarjeta del iPhone
  (con tres, el navegador los convertía por su cuenta). En calidad baja, el prado recupera sus rodales de 20 m con un canal
  de una lectura que ya se hacía.
- **Paseo de dron por Navarra en el inicio** (`hub/mapa3d.js`, `sigueDronNavarra` y `rutaDron`): con el mapa quieto 10 s
  (la primera vez, 3 s) y nada elegido, la cámara pasa de la vista de toda Navarra a un vuelo más cerca y más inclinado
  que la recorre por el medio, por los centros de las comarcas, del Baztan y el Pirineo a la Ribera y vuelta (unos 42 s
  cada sentido), meciéndose un poco. Se para con cualquier toque, tecla o rueda y al elegir una comarca o un pueblo, y se
  queda donde está. Sin paseo con «menos movimiento» en el sistema ni en el navegador de las pruebas (salvo
  `window.__paseo`). Antes Navarra se veía entera pero pequeña encima de la tira de comarcas.
  El 16 de noviembre de 2026 se probó todo el comienzo más deprisa y se deshizo el mismo día. El autor: «no quiero que
  modifiques la velocidad en las animaciones del inicio y comarcas, quiero que no parpadee y vaya súper fluido». Siguen el
  vuelo de bajada de 1,8 s, las comarcas cada 0,07 s y el paseo de 42 s.
  Lo que se hizo en su lugar, medido con una sonda en el navegador (programas nuevos, cambios de la clase `fuera` de los
  nombres, cambios de resolución y tareas largas, por fases):
  - Al elegir la primera comarca se compilaban 18 programas de golpe, justo al empezar a subir la isla. Ahora
    `preparaIsla` los compila antes, a los 2,5 s del inicio (3,5 s en el móvil), con una isla de mentira de dos unidades
    que nunca se pinta, y pide las texturas de roca, musgo y hierba y las sube a la tarjeta de una en una (`initTexture`).
    Antes llegaban después de subir la isla y aparecían de golpe. `calienta` (maqueta y casas) también se hace en el móvil,
    a los 6,5 s, y no al tocar la comarca. Al elegir comarca ya no se compila ningún programa.
  - Los nombres del mapa esperan antes de cambiar: uno que se ve no se esconde, ni salta de encima a debajo, ni se queda
    en foto hasta que lleva 0,3 s queriéndolo; uno escondido espera 0,15 s antes de salir (`etiqueta`).
  - Un nombre que se vuelve a medir, al pasar de ficha pequeña a grande o al llegar la letra, ya no se esconde para
    medirse. Y el paso a ficha pequeña (`lejosIsla`) tiene margen: lejos por encima del 48 % de la órbita y cerca por
    debajo del 42 %. Antes, con la cámara rondando el 45 %, los nombres de los pueblos parpadeaban.
  - Resultado en la sonda: en el inicio, de 244 cambios de los nombres a 4.
- **Llegar siempre a quien da la misión** (`townGame.js`, `spot` y `repasaAccesos`; `world/acceso.js`; `freeFarm` en
  `levels/townReal.js`; la foz en `world/monuments.js`; noviembre de 2026). En algunos pueblos una barrera invisible no
  dejaba llegar a la persona de la misión: en los pueblos de verdad la granja se elegía en prados más allá del límite
  del mundo (`BOUNDARY`, 440 m en esos pueblos) y la pastora, la ganadera y las manzanas quedaban al otro lado, como en
  Altsasu, Etxalar, Elizondo o Leitza; `spot` buscaba sitio sin mirar ese límite; y la foz de Lumbier se colocaba con
  el río del pueblo inventado, que en los de verdad no vale (salía en x ≈ 9991). Ahora la granja va al menos 70 m
  dentro del límite; `spot` acerca el punto pedido a 14 m del límite, no acepta sitios a menos de 6 m y mira lo que le
  pidan (`ok`) lo último, después de lo barato; la foz sin un río que valga va junto al pueblo.
  Y por si algo más queda encerrado (entre casas o tapias, en un corro de árboles, en un alto, en una isla), al montar
  el pueblo `repasaAccesos` pregunta a `alcanzable` por cada vecino que no va por una ruta y por cada cosa que hay que
  coger, del más cercano a la plaza al más lejano: busca un camino andando desde lo que queda a distancia de hablar
  (2,6 m) o de coger (1,9 m) hasta la plaza, por una rejilla de medio metro en ocho direcciones sin cortar esquinas, con
  las reglas del personaje (choques con algo de holgura, agua de más de 95 cm fuera de los puentes, escalones de más de
  36 cm con cuesta de más de 1,25 en los dos sentidos, para no quedar atrapado, y el límite del mundo). Tampoco vale un
  rodeo exagerado: el camino, como mucho 2,2 veces la línea recta más 120 m (cruzar el río por el puente en Aribe o
  bajar a la foz de Lumbier, unos 320 m en línea recta y 800 andando, valen). Es un A* con algo de prisa que recuerda lo
  recorrido: cada camino encontrado, con lo que le falta hasta la plaza, sirve para los siguientes, y lo encerrado no
  se vuelve a recorrer. Si está encerrado o el rodeo es exagerado, se lleva al sitio libre más cercano junto a un camino
  ya encontrado (`sitiosBuenos`), sin buscar caminos nuevos para cada hueco: así costaba segundos. Si en 8000 pasos no
  se sabe, se queda donde está (con más, casi un segundo al cargar; y llevarse lejos, por ejemplo, al entrenador de su
  campo era peor). Cuesta entre 0,1 y 0,4 s al cargar en los pueblos medidos. Los de los balcones no se miran: se les
  habla desde la calle. La prueba de todo el pueblo, `node tools/accesos.mjs <pueblo|todos>`, recorre una rejilla de
  todo el mundo, hasta el límite (antes solo lo que ocupaban los objetivos, y un camino que daba la vuelta por fuera
  salía como si no lo hubiera), dice lo que queda sin acceso o con un rodeo exagerado y lo que el juego movió.
- **Navegación como el GPS de los juegos de mundo abierto** (`townGame.js`, `marcaDestino`, `objetivo` y `rutaGPS`;
  `ui.js`, `updateMinimap` y `lugaresMapa`; `mapview.js`): se toman sus costumbres, no su aspecto, que es el de Herrizherri.
  En el mapa, un toque en un sitio (o en un lugar) da la ficha con «Marcar destino»; la pestaña Lugares lista la iglesia,
  los monumentos, el frontón, la granja y los campos del más cerca al más lejos, y tocar uno lo marca. Con destino, la
  brújula, la luz dorada, la punta del anillo y la ruta van allí en dorado, hasta llegar a 6 m
  (aviso «Has llegado») o quitarlo; sin destino, a lo que toca de la misión que sigues, en rosa. La ruta va por calles y
  caminos en el minimapa (se pide a la cola de caminos de los vecinos, `nav.requestPath`, otra si cambia el objetivo o te
  alejas 6 m, como mucho una por segundo) y en el mapa grande. Marcar o quitar el destino no cierra el mapa.
  Sobre el objetivo, la flecha (`fx.js`, `Beacon`): amarilla, con volumen, girando sobre sí misma y subiendo y bajando,
  hasta 25 m, como el haz. Se probó una plana, siempre de cara a la cámara, rosa a la misión y con un filo oscuro, y el
  autor prefirió la de antes (noviembre de 2026).
  La ficha de una misión en el mapa, con su único botón, es de una sola fila: icono, nombre y la flecha en un botón
  redondo rosa (`infocard.css`, con `:has`).
- **Tradiciones en el menú del juego** (`hub.js`, en «Más»; `didactico.js`, `s_tradiciones`; `ddgal.js`): la misma galería
  del material didáctico (cada comarca, danzas, carnavales, tradiciones, romerías, ferias, pelota y campanas), pero
  jugando cada una se descubre al hacer su misión, o la de una comarca al visitar uno de sus pueblos. La que falta sale
  apagada con su candado y dice dónde descubrirla; su ficha solo cuenta cómo y sus pueblos. Arriba, cuántas van
  descubiertas. La pelota, las campanas y lo que no está en ningún pueblo del juego se ven desde el principio.
- **Bardenas Reales** (`data/bosques.js`, `bardenas-reales`; noviembre de 2026): el desierto de Navarra como paraje de la
  Ribera, con la clase de monte `bardenas` (`levels/town.js`): llano de arcilla y yeso casi sin árboles y unos 40 cabezos,
  mesas de techo plano y laderas empinadas con el borde mordido (`CABEZOS` en `bosqueH`), que se quitan si caen encima de
  un sitio de la misión, del corral o de las sendas, y a más de 55 m de Castildetierra, que se alza solo en el llano. Suelo
  `bardena` (`world/terrain.js`: blancos y grises de la Bardena Blanca con vetas ocres) y la roca de los cabezos a la
  vista (`rockMask`). Castildetierra (`world/monuments.js`): la chimenea de arcilla con su sombrero de roca dura, con
  vetas y regueros. Sol en vez de la niebla de los bosques (`weather.js`) y corralizas de una planta (`townBuilder.js`).
  Su cielo (`def.sky`, en `actors/animals.js` y `townCimas.js`): buitres, alimoches, águila real y milano; el alimoche es
  ave nueva (`actors/beasts.js`). Misiones: las aves, las ovejas del Roncal que bajan por la Cañada Real (hacia el 18 de
  septiembre), los caminos de Sanchicorrota (carrera `bardena`) y el sabio. Portada, la lámina «Las Bardenas»
  (`BOSQUE_LAMINA`). Fuentes de los datos: Parque Natural (1999), Reserva de la Biosfera (2000), unas 40.000 ha.
- **Frontones de Navarra** (`hub/frontones.js`, `s_frontones`, en «Más» y en el material didáctico; datos en
  `data/frontones.js` y `data/frontones-pueblos.json`; fotos en `assets/frontones` con su `LICENCIAS.md`): la galería de
  `ddgal.js` con seis pestañas. «Con historia»: el Labrit (1952), el Navarra Arena (2018), el Euskal Jai Berri (1977), el
  Euskal Jai (1909 a 2004), el Atarrabia (1931), el López (1935), la Mañueta, el Jito Alai (1962), el Juanjo Atxa de
  Elizondo, los trinquetes de Elizondo y de Sangüesa (siglo XVI), Muzqui, Nagore y Alloz. «La Montaña», «Zona Media y
  Tierra Estella» y «La Ribera»: frontones de los pueblos con su foto de Wikimedia Commons (CC0, CC BY y CC BY-SA; en la
  ficha, el autor, la licencia y el enlace). «Tipos de cancha»: plaza libre, pared izquierda, trinquete y las medidas.
  «Todos»: los 653 frontones del directorio frontons.net (noviembre de 2026) contados por pueblo y comarca, con un
  buscador; el pueblo que está en el juego lleva su enlace. Solo van años y aforos que dice una fuente; donde no
  coinciden, lo que dicen todas. Fuera las fotos de Commons con pintadas o carteles políticos (Alsasua, una de Leitza).
  `ddgal.js` admite ahora un apartado con contenido propio (`html`, `n`, `init`) en vez de tarjetas.
- **«Frontones» en pelota a mano: jugar en los frontones de verdad, con plaza libre y trinquete** (`frontonesMenu` y la
  tarjeta `cp-front` en `game/torneo.js`; `pelotaFrontones` y `realVenue` en `game/townDeportes.js`; `realVenue` en
  `game/fronton.js`; `tipo` en `courtFeel` de `pelota/rules.js`, `TRINQ` y `FEEL.tipo` en `pelota/physics.js`, el árbitro
  en `pelota/game.js` y la cancha en `pelota/court.js`, `buildTrinquete`; 15 de noviembre de 2026). El autor: «cuando
  elijo frontones, esa parte no está terminada. Tiene que haber muchos más frontones», «diseñar también un frontón estilo
  trinquete», «frontones con pared izquierda y pared derecha, quizá frontones con solo la pared frontal» y «que dentro de
  la pelota a mano haya una opción que sea frontones para poder jugar en esos frontones y conocerlos también».
  - En el menú de pelota a mano, una tarjeta más, «Frontones». Abre la galería de los 46 frontones del capítulo
    «Frontones de Navarra» (`DESTACADOS`), con su foto si la hay, dónde está, su tipo (y si es cubierto o al aire libre y
    su año) y la primera frase de su historia. Arriba se filtra por tipo de cancha, con cuántos hay de cada uno y lo que es
    cada tipo. Se toca uno y «Jugar aquí»: un partido libre en él; al acabar, de vuelta a la galería.
  - Qué pueblos tienen qué: del directorio frontons.net (`frontones-pueblos.json`), Navarra tiene 185 plazas libres y 6
    trinquetes (Elizondo, Lekunberri, Mutilva y tres en Iruña). En la galería van los trinquetes de Elizondo, Lekunberri
    y el juego de pelota de Sangüesa; las plazas libres de Muzqui, Arraioz, Irurita, Urroz, Areso, Roncal, Izco, Nazar,
    Mendaza, Asarta, Mirafuentes, Genevilla, Marañón, Luquin y Fontellas; y el resto, de pared izquierda.
  - La plaza libre (`tipo: 'plaza'`): solo el frontis, con raya a los dos lados; sin pared izquierda ni rebote; a la
    izquierda, plaza. Es fuera lo que da en el frontis o bota fuera de la raya de la izquierda (`ladoIzq`, `fuera`) y no
    hay dos paredes (ni para ti ni para el rival). Se monta al aire libre con la iglesia detrás del frontis, sobre un prado
    que llega al horizonte, sin focos en la pared que no hay. Sin pared izquierda, tampoco su remate de arriba (`capL`), que
    sin la pared quedaba como una viga suelta por el cielo; en el trinquete, ese remate va sobre la pared de la galería.
  - El trinquete (`tipo: 'trinquete'`): cerrado por las cuatro paredes, sin contracancha. A la izquierda, la galería del
    público tras la red metálica (del suelo a 2,35 m) y el tejadillo de tejas que sube 2,2 m hacia la pared del fondo,
    a todo lo largo, como en los trinquetes de verdad (28,5 × 9,3 m, con el tejadillo en la pared izquierda). La pelota que
    da en el tejadillo rebota en su plano y cae rodando, viva; la que va a la red es falta (`red`), o tanto para quien
    la mandó si ya había botado bien; la pared derecha vale. Sin dos paredes: a la izquierda está la red. La pared derecha
    es de una sola cara, la de la cancha, para que la cámara de la contracancha vea a través. Algo menos vivo que un
    frontón: sala pequeña y suelo de baldosa.
    - Revisado el 15 de noviembre de 2026 contra la foto del de Elizondo y el reglamento: el autor, «así no es el
      trinquete, revisa bien». Tenía el aspecto del cubierto de su comarca, con el frontis de piedra, el suelo rosado y
      las paredes azules en Lekunberri; el tejadillo era de tejas rojas, como un tejado de casa, de 2,2 m de ancho y de
      2,35 a 3,27 m; la red bajaba hasta el suelo; y la pared izquierda llevaba los números de los cuadros, que el
      trinquete no tiene. Ahora (`TRINQ_LOOK` en `fronton.js`; `buildTrinquete` en `court.js`; `TRINQ` en `physics.js`):
      - todas las paredes y el frontis pintados del mismo verde, con el remate amarillo, la chapa roja abajo, el suelo
        de hormigón gris con rayas amarillas y el techo de cerchas de madera;
      - el tejadillo liso y claro, de 1,30 m de ancho, de 1,90 m en su borde a 2,25 m en la pared, un 27 % de pendiente;
      - delante de la galería, el peto pintado de 0,95 m con su listón de madera y, encima, la red entre postes de
        madera hasta la viga del tejadillo; dentro, un banco corrido con una fila de público;
      - el tambor, o fraile: el plano a 45° de 0,46 m del rincón del frontis y la pared derecha, con sus dos aristas
        marcadas. Cuenta como frontis y la pelota sale de él hacia la izquierda, pegada al frontis.
      - Sin cambiar: la cancha mide lo que la de los frontones del juego, 31,5 × 10 m, y no 28,5 × 9,3; y el rosa del
        suelo es la zona de saque, que se ilumina al sacar en todos los frontones.
    - Revisado otra vez el mismo día con tres fotos del de Elizondo que mandó el autor:
      - encima de las dos paredes laterales, un balcón corrido con barandilla de balaustres de madera y su fila de
        público mirando a la cancha; la pared derecha, por eso, se queda en 8,5 m, como la izquierda, y el alto de encima
        de la pared izquierda ya no se pinta;
      - el techo, a 11 m y claro, con sus tubos de luz (la arquitectura `erminea`), no de cerchas de madera;
      - el tejadillo, verde como las paredes y algo más claro, y su madera más rubia;
      - en el suelo, solo las rayas de falta y pasa, amarillas; en las paredes, una raya fina amarilla a 8,4 m
        (`TRINQ.LINEA`): la pelota que da por encima, en la izquierda o en la derecha, es mala (`game.js`).
    - Y la final del Torneo de Trinquete, en un trinquete moderno inventado para el juego, el Trinquete Herrizherri
      (`TRINQ_FINAL` en `torneo.js`; `TRINQ_MODERNO` en `fronton.js`; `moderno` y `TQ_GRADA` en `court.js`). Sale de las
      dos fotos que mandó el autor después de las de Elizondo, sin texto: un trinquete azul con la pared derecha de
      cristal y la grada detrás, y el Trinquet Moderne de Baiona. Se le preguntó qué hacer con ellas y dijo «seguimos»:
      se hizo lo recomendado, dejar Elizondo como sus fotos y añadir uno moderno. Como el azul: todas las paredes azules,
      la raya blanca a 8,4 m, el suelo gris oscuro con falta y pasa en blanco y la chapa de abajo en azul hondo; la pared
      derecha, de cristal hasta el techo, de una sola cara, con montantes de acero en cada raya y la raya blanca; detrás,
      un pasillo de 1,6 m, donde cabe la cámara del saque, y la grada de siete filas con su banco y su público; a la
      izquierda, sin balcón, la pared azul hasta el techo y la galería oscura por dentro, con postes de acero. El juego
      es el de siempre: el cristal es pared. No está en el catálogo de frontones de verdad ni en «Frontones». Cuartos en
      Elizondo, semifinales en Lekunberri y la final, ahí. 76 llamadas de dibujo y 443.000 triángulos en el partido.
    - Y el otro trinquete moderno inventado, el Trinquete Beltza (`TRINQ_BELTZA` en `torneo.js` y en `fronton.js`;
      `beltza` en `court.js`), como el Trinquet Moderne de Baiona de la otra foto: el autor volvió a decir «seguimos» tras
      ofrecérselo. Las paredes casi negras, la raya y las rayas del suelo rojas, el suelo claro, el tejadillo y el tambor
      verdes (`th.tejadillo` y `th.tambor`), el techo oscuro del pabellón, la galería con postes de acero y, encima de las
      dos paredes, los balcones de siempre con la barandilla de cristal, el pasamanos rojo, los bancos azules y la pared
      del fondo oscura. Sin el xilo, el agujero del frontis de los trinquetes de Iparralde: en Navarra no se juega. La
      final del Torneo de Trinquete va un año a cada uno (`trinqueteDe`, por la edición: las impares en el Herrizherri).
      Los dos están ahora al final de «Frontones», también en la pestaña del trinquete, con «Inventado para el juego» en vez del
      lugar y la imagen sacada del propio juego (`src/assets/frontones-juego`, `canchaFoto` en `frontonFotos.js`).
      Después, con otro «seguimos», el fondo de sus balcones con la red negra de la foto de Baiona (`redT` en
      `buildTrinquete`): una malla fina sobre negro, con unas franjas azules de las filas del público detrás. Comprobado
      también qué trinquete toca en la final: Herrizherri, Beltza, Herrizherri, Beltza en las ediciones 1 a 4.
    - Las modalidades del trinquete (`pelota/herramientas.js`; `herr` en `game.js` y en `match.js`), con otro
      «seguimos» tras proponérselo: en Navarra el trinquete se juega a mano, a pala corta, a paleta y a xare. En el panel
      del partido, solo en un trinquete y no en los retos ni en los campeonatos, que son a mano, la fila «Modalidad»: A mano, Pala corta, Paleta y Xare; se
      guarda la última (`herrizherri-pelota-herr`) y el título del panel dice la elegida. Cada una lleva su herramienta en
      la mano derecha de los pelotaris, colgada del hueso de la mano en cuanto la figura está cargada (`ponHerramienta`,
      en el bucle de las figuras): la pala corta, tabla clara con el mango encintado; la paleta, más fina y estrecha; el
      xare, el aro ovalado de madera con la red floja. Y cambia el juego, sin tocar los golpes: el ritmo de la partida
      (`tempo`: 1,16 la pala, 1,10 la paleta y 1,12 el xare), lo que sale la pelota del frontis y lo que bota (la paleta,
      con su pelota de goma, bota un 8 % más; la pala, un 4 % menos). Los golpes y las animaciones son los de mano: la
      mano va a la pelota, no la pala. Las tres herramientas, 4 llamadas de dibujo más; con xare, 86 en total.
      - Y con «seguimos con lo que falte»: con herramienta, todos los golpes van con la derecha, que es la que la lleva
        (se quita la «L» de los golpes y del armado); en el golpe, la mano se queda antes de la pelota lo que mide del
        puño a la pala o al aro (`ALCANCE`), en la línea del pecho a la pelota, y lo que llega a ella es la herramienta;
        la pelota del saque va en la mano izquierda (`st.manoIzq` en `glbChar.js`), sin el gesto de llevarla y botarla
        con la derecha; y los comentaristas no dicen las frases que hablan de la mano o de jugar a mano
        (`Comentarios.sinMano`, por el texto de cada frase del guion).
      - Con herramienta, las manos sin tacos ni vendas (16 de noviembre de 2026; el autor: «si la mano lleva herramienta,
        no lleva tacos en las manos»; `actors/sinTacos.js`, desde `ponHerramienta`). Las vendas del pelotari no son piezas
        aparte, son la propia malla de la mano pintada de beis (toda la mano es una sola pieza), así que no se quitan: se
        pintan de piel en el sombreador, solo en las manos y las muñecas (`aTaco`, por los pesos de la mano y la distancia a
        la muñeca) y solo lo que tiene color de venda (en sRGB, verde bastante por encima del azul y rojo poco por encima
        del verde). La piel sale de la textura de cada modelo, de las yemas rosadas, y conserva el brillo de cada píxel.
        A mano, como siempre. La forma de las vendas sigue: los dedos, algo más gruesos que los de un pelotari sin vendar.
      - El agarre (el autor: «el agarre de la mano no está bien»; la herramienta colgaba del dorso de la mano abierta).
        Al principio se hizo doblando la malla con un objetivo de forma y desde la cámara del juego no se notaba (el autor:
        «las manos no cierran, no agarran ... las falanges no se doblan»). Ahora son dedos de verdad (`actors/dedos.js`):
        - Los personajes de Meshy traen la mano entera en un solo hueso, aunque la malla tiene los cinco dedos. Al cargar
          cada modelo, una vez y antes de copiarlo (`loadMeshy`; también en la versión ligera de los vecinos, que es la que
          llevan siempre, pero no en la de las multitudes de la grada y el campo), se buscan en la
          malla el pulgar y los cuatro dedos y a cada uno se le ponen tres huesos, hijos del de la mano: 15 por mano.
        - Cómo se encuentran: la distancia por la superficie desde la muñeca crece hasta cada punta; bajando desde las
          puntas, cada dedo es un trozo aparte hasta su pliegue con el de al lado. El pulgar, el que se junta más abajo. Los
          dedos que se tocan, como el corazón y el anular del pelotari con sus cintas, se separan tarde: de la altura del
          pliegue más hondo para arriba, cada punto va al dedo cuyo eje le queda más cerca. En manos con los dedos juntos,
          como una manopla, o de pocos puntos, como las de los vecinos ligeros, los cuatro dedos son cuatro tiras a lo
          ancho. Las piezas sueltas, como las cintas, enteras a una
          sola falange, para que no se partan en picos.
        - Los pesos: lo que cada punto tenía en la mano se reparte entre la mano y sus falanges, con un paso suave en cada
          articulación. Los huesos nuevos empiezan sin giro, así que en reposo la malla queda igual que antes.
        - Las posturas (`poses`): `relajada` (la de siempre), `carrera` (a medio cerrar, corriendo), `puno`, `mango`,
          `baston`, `pelota` (la del saque) y `abierta` (al golpear a mano).
        - El `baston`, para lo que se lleva de pie o colgando (un bastón, una escoba, una horca, el asa de un cesto): la
          misma búsqueda que el `mango`, pero casi recto por la mano, como un martillo (`RECTO`, 8°), y algo más grueso
          (1,35 cm de radio). Con la diagonal de la pala, para llevar un bastón derecho había que torcer la muñeca más de lo
          que se tuerce. Su hueco se guarda aparte (`agarreBaston`), al lado del de la pala (`agarre`).
          En el bastón el mango va en la base de los dedos, todos tocándolo cerca del nudillo, y los dedos se hunden algo
          más en él (`hunde`, 0,3 de su grosor en vez de 0,55): los vecinos tienen dedos de unos 4 cm de grueso y, con un
          palo de 2,7 cm, solo lo rodeaban a medias y parecía la mano abierta. Y en las dos posturas, el dedo que se queda
          sin tocar el mango se sigue cerrando hasta tocarlo (`aprieta`).
        - El `mango`, como en la foto que pasó el autor el 16 de noviembre (la mano abierta sobre la cara de la pala, se
          baja al mango y se cierran los dedos): el mango cruza la mano en diagonal, de la primera falange del índice al
          talón de la mano por el lado del meñique, no recto como un martillo, y la cara de la pala queda paralela a la
          palma. Antes iba recto y los dedos, gordos en estos personajes, no llegaban a rodearlo: se veía el mango por
          delante de los dedos. Ahora el mango es de 1,15 cm de radio, cada dedo se hunde un poco en él, y cada uno lo
          rodea por donde le cruza: la primera falange, tangente al mango, y las otras dos, tangentes por su mitad,
          contando con lo dobladas que ya están en reposo. El pulgar se cierra hasta apoyar la punta por fuera en la falange
          del medio del corazón. Como cada mano es distinta, al cargar se prueban giros y sitios del mango (`DIAG`, en
          números sueltos, 1 o 2 ms por mano) y se queda el que cumple mejor: ningún nudillo dentro del mango, que no se
          hunda en la palma, que cada dedo lo toque con su primera falange y la diagonal más cerca de la de la foto, que
          es de 35°. En el explorador sale de unos 17° y en el pelotari de unos 24°: con dedos tan gordos no da para más.
          La pala, por eso, sale del puño más en la línea del antebrazo que antes.
        - La `pelota` del saque, como en la otra foto del autor (la mano vendada de un pelotari con la pelota): metida en
          el hueco de la mano, contra la base de los dedos; los dedos la rodean por debajo y el pulgar la aprieta por
          encima. Antes quedaba apoyada por fuera en el centro de la palma y los dedos apenas la tocaban. Se prueban sitios
          en el plano del corazón, apoyada en la palma, y se queda el que mejor rodean los dedos, cada uno tocándola con su
          primera falange; el radio es el de la pelota del juego en la mano (`BOLA_EN_MANO`, 4,7 cm). Ese centro se guarda
          (`bola`) y el juego pone ahí la pelota (`armSwing`, `bolaW`), en vez de apartarla de la palma hacia fuera; y la
          red que saca la pelota de las manos (`fueraDeManos`) deja en paz a la mano que la coge mientras siga en su sitio,
          porque los dedos la aprietan a propósito y apartarla la sacaba 10 cm de la mano. `GlbChar.mano(lado, postura)` y, cada imagen, `Dedos.update` las alcanza poco a poco.
        - Lo pide el juego: con herramienta, la derecha en `mango` (`cierraMano`); la mano que lleva la pelota del saque,
          en `pelota`; la que golpea, abierta en el golpe (`armSwing`). La herramienta va con el mango por el hueco del
          puño (`agarre`: el punto medio del mango entre los cuatro dedos y su eje, hacia el pulgar), el final del
          mango asomando por el lado del meñique. La palma ya medida al ponerlos se guarda en el hueso (`palma`), para
          dejar la pelota en ella (`palmaDe`).
        - En todo el juego (el autor, 16 de noviembre: «aplica el agarre a todo el juego, a todos los personajes que agarren
          una herramienta o cualquier cosa»): `actors/agarrar.js` pone cualquier cosa en el puño de un personaje con
          dedos, con el mango por el hueco y los dedos cerrados encima. Tres maneras: `erguido` (de pie, con la postura
          `baston`: cada imagen, encima de su animación, el antebrazo hacia delante y la muñeca girada y doblada, hasta
          40°, para que quede derecho), `colgando` (un cesto, el asa cruzando el puño, también con `baston`) y `suelto`
          (solo en el puño, con la diagonal del `mango`; el brazo, el de su animación). Lo usan los disfrazados
          (`trajes.js`, `hold`: el isipu del joaldun, la sarde del momotxorro, el cesto y la vara del zipotero, el peine de
          la lamia, las ramas de Basajaun y Tartalo, la escoba de la sorgina, la espada de Roldán), el bastón de los
          mayores (`outfits.js`, más fino, del grueso del puño, y con la punta apoyada en el suelo: baja o sube por el puño
          cada imagen, hasta un cuarto de su largo), el banderín de los jueces de línea y la tarjeta del árbitro (`futbol.js`;
          la mano solo se cierra mientras la enseña). Sin dedos (las figuras de reserva), cada uno sigue como antes.
          La tarjeta no va por el eje del mango, como el banderín, sino con el canto de abajo metido en el puño y casi toda
          por encima de los nudillos, y cada imagen se pone de pie y de cara hacia donde mira el árbitro. El brazo del
          banderín y de la tarjeta sube algo hacia fuera y hacia delante: con la cabeza tan grande de estos personajes,
          recto hacia arriba la mano se metía en el pelo y la tarjeta no se veía.
        - Coste: unos 100 ms al cargar el pelotari y entre 10 y 50 ms cada vecino, en el ordenador de pruebas; en cada
          imagen, solo mientras una mano cambia de postura. Sin llamadas de dibujo de más.
        - Apagados desde el 16 de noviembre en todos los personajes (`CON_DEDOS = false` en `loadMeshy`; el autor: «no
          deformes los dedos, está quedándote fatal; ya seguirás más adelante»). No se ponen los huesos de los dedos y la
          malla de las manos queda como viene. Todo lo que los usa tiene su camino sin ellos y vuelve a como iba antes: la
          herramienta y la pelota del saque junto a la mano, lo que llevan los disfrazados, el bastón de los mayores y el
          banderín sin puño, y la tarjeta del árbitro sobre la mano abierta. Lo de abajo describe cómo funcionan cuando se
          vuelvan a encender.
        - Quién los lleva: los modelos completos, los vecinos del pueblo (su versión ligera, la única que tienen) y, desde
          el 16 de noviembre, también la versión ligera de los dos cuerpos de los disfrazados, la sanferminera y el pastor
          (`DEDOS_LIGEROS` en `loadMeshy`), porque llevan cosas en la mano. Las multitudes de la grada usan esos mismos
          cuerpos, pero las hornean quietas: los dedos no les cuestan nada al jugar, solo unos 80 ms más al cargar.
    - El trinquete, un campeonato más (el autor: «tiene que ser un campeonato más, como el manomanista y el 4,5»): ya no
      es el «Torneo de Trinquete» de ocho para toda Navarra, al final de los inventados, sino el Campeonato de Trinquete
      de cada comarca, como el Manomanista, el de Parejas y el del Cuatro y Medio (`KINDS.trinquete`, fuera de `EXTRA`).
      Dieciséis por eliminatorias, como el Manomanista: octavos y cuartos en el trinquete de Elizondo, semifinales en el
      de Lekunberri y la final en el Herrizherri o en el Beltza, un año en cada uno (`trinqueteDe`). Su carta va justo
      después de la del Cuatro y Medio (`pelotaMenu`, `T4`; `torneoTrinquete` en `townDeportes.js`), y el pelotari del
      pueblo lo ofrece con los otros tres. Las txapelas del torneo de antes pasan una vez al de la primera comarca donde
      se juegue y el guardado viejo se borra.
    - Las imágenes, con Higgsfield (el autor: «apóyate en Higgsfield para las imágenes»): las de las cartas del Trinquete
      Herrizherri y del Beltza en «Frontones» (`src/assets/frontones-juego`), pintadas con GPT Image a partir de una imagen
      del propio partido, la misma cancha y el mismo encuadre, como una foto, vacía y sin letras (antes, la captura del
      juego con los pelotaris y el público); y el mural del trinquete de Lekunberri (`src/assets/murales`), un pelotari de
      blanco con la faja roja, un xare, una pala y dos pelotas, con el fondo quitado para que asome el revoco de la nave;
      se carga encima del dibujo de `mural()`, que queda si no llega. Seis imágenes, 9 créditos.
    - Los trinquetes de verdad en los pueblos (`world/trinquetePueblo.js`, «sigue con lo que falte»): un monumento nuevo,
      `trinquete`, en Elizondo (Trinquete Antxitonea) y en Lekunberri (Trinquete de Lekunberri), al final de su lista para
      no mover los índices de los demás. Va sobre su edificio de los datos, el que se llama «Trinkete…»
      (`levels/townReal.js`, `trinqueteTraza`): una nave de 26 a 36 m por 14 a 18, a lo largo del lado largo del edificio,
      con la fachada hacia el lado con menos casas y sin río delante (hacia la plaza, en Elizondo daba contra las casas);
      las casas que pisa y las de una placita de 8 m delante no se levantan, y el suelo de debajo queda llano. Lekunberri:
      revoco azul verdoso, tejado de cinc, banda de luz corrida, un pelotari pintado de blanco con la faja roja, un xare,
      una pala y la pelota en la fachada (un dibujo del juego, no el mural de verdad), el rótulo azul «TRINKETEA» sin
      escudo y, a un costado, un anexo bajo de chapa gris, como en la foto. Elizondo: casa de revoco blanco con esquinales
      de sillar, tejado de teja, ventanas con marco y su rótulo. El mural y el rótulo, en un solo lienzo (768 × 384 en
      Lekunberri: 1,6 MB); las paredes teñidas, una malla con el revoco del juego. En Lekunberri ese edificio era además
      el «frontón» de los datos: el frontón del juego se levanta ahora junto a la plaza. Con el perfil del iPhone, en la
      puerta del pueblo: Elizondo 606k triángulos y 436 llamadas (antes 600k y 424); Lekunberri 489k y 366 (antes 480k y
      289; de esas 77, el trinquete pone unas 6 y el resto es el frontón, que ahora se ve desde la puerta). Las texturas,
      92 y 94 MB, ya pasaban de 80 antes del trinquete (93 y 93). Icono, el de la pelota (`ALIAS` en `ui/icons.js`).
  - Los de pared izquierda, como los de siempre: cubiertos con la arquitectura de su foto si es uno de los modelos
    (Isaba, Ziordia, Irañeta, Igantzi, Peralta, el Navarra Arena) o la de su comarca; al aire libre, en su plaza. El
    Labrit es el Labrit. En el partido se dice su nombre de verdad.
  - Lo que no se ha hecho: frontones de pared izquierda y derecha al aire libre. No se encontró ninguno en Navarra; el
    que tiene las dos es el trinquete.
- **Ferias de ganado** (`data/ferias.js`, `CORRALES` y `FERIA_TOWNS`; `townActividades.js`, `buildFair`,
  `conoceCorral` y `judgeFair`): en Estella, Elizondo, Altsasu, Lesaka, Lumbier y Lekunberri (las tres últimas, con
  datos del archivo de patrimonio inmaterial de Navarra y prensa, van al final de la lista del pueblo para no mover el
  número de las misiones guardadas). Siete corrales a los lados de un pasillo, uno por animal: vaca pirenaica, bueyes,
  pottoka, burro, oveja latxa, cabra y euskal txerria, cada uno con su cartel; al final, la pista del concurso con la mesa
  del jurado. Se recorren los corrales conociendo a cada animal (su ficha de fauna, que da la carta, o lo que cuenta el
  ganadero), luego se juzga en la pista y se cierra el trato con el tratante. Las vallas van en dos mallas y los carteles
  en una (una textura con todos los nombres); pocos animales por corral, que cada uno son varias llamadas de dibujo.
  Prueba: `tools/feria.mjs <pueblo> <carpeta>`.
- **La misión de las setas, en el bosque de Orgi** (`data/setas.js`; `setas` en `data/procesos.js` y en la lista de
  `bosque-orgi`, `data/bosques.js`; `pickSeta` en `townActividades.js`; los modelos en `items.js`; 15 de noviembre de
  2026). El autor: «una misión para la recogida de setas y hongos. Que los pequeños aprendan qué son y cómo se cogen».
  Koldo, micólogo, cuenta qué es una seta, el fruto de un hongo que vive bajo tierra pegado a las raíces, y pide tres
  setas buenas. En el robledal salen cinco con el mismo letrero, «Mirar la seta»: el hongo, el hongo beltza y el
  rebozuelo, que van a la cesta con su nombre y cómo se reconocen, y la matamoscas y la oronja verde, que se miran, se
  explica por qué son venenosas y se quedan en su sitio, sin su brillo y sin contar. Después se ordenan los pasos de
  coger una seta: mirarla y dejar las pequeñas, cortarla por el pie, quitarle la tierra allí, a la cesta de mimbre y
  enseñarla a quien sepa. Termina con el parque micológico de Ultzama y la regla de oro: ninguna seta se come sin que la
  vea alguien que sepa.
  - Setas de otoño de robledal; el perretxiko no, que sale en primavera y en prados. Más grandes que las de verdad y
    quietas en el suelo (`quieto`), sin girar ni flotar como los demás objetos de las misiones.
  - En su ficha, cada una con su modelo del juego (`ITEM` en `ui/icon3d.js`), menos el hongo, con el dibujo del autor:
    la matamoscas no podía salir con el dibujo de un hongo bueno.
  - Va la última de la lista de Orgi, para no mover el número de las misiones guardadas. `ahora` y `asi` cambian dos
    frases de las misiones de producto, que dicen «hagamos…» y «es un producto de…».
- **Minimapa con la brújula en su borde** (`ui.js`, `updateMinimap`; `#mini`, `#clock`): el mapa gira con la
  cámara y alrededor va un anillo con los puntos cardinales (la N en rosa), rayas en los intermedios, los iconos de las
  misiones que quedan fuera del mapa hacia donde están y una punta rosa hacia el objetivo (si cae sobre una letra, la letra
  deja su sitio; nada se monta). Sin la distancia en metros: hubo una pastilla rosa junto al minimapa, con una flechita
  hacia el objetivo, y el autor la quitó (noviembre de 2026); lo marcan la punta del anillo y la flecha. La hora no va en la pantalla
  de juego: se ve en la cabecera del mapa y de la pausa (`horaChip`; `setClock` la guarda y la pone al día si están
  abiertos).
  Las letras y el anillo se dibujan a su tamaño en pantalla (unos 11 px), mida lo que mida el minimapa. Antes la brújula era
  una barra arriba en el centro y en el teléfono de pie no había minimapa.
  El bloque de arriba a la derecha (`#topright`) es una rejilla. Tumbado: el minimapa en la esquina, la fila de botones a
  su izquierda; antes iba todo en columna (botones, minimapa y la hora colgando) y
  bajaba hasta y 184 en un teléfono tumbado de 390 de alto (ahora 108). De pie: los botones en columna en el margen
  derecho, que arriba no quitan sitio a las misiones (siguen en una fila, como estaban: el autor no quiere que se
  toquen), debajo el minimapa (hasta y 324 con cuatro botones; antes 356). Los huecos de la rejilla no recogen toques. El panel de arriba a la izquierda se ajusta a lo de la derecha
  en dos pasadas (`fitTop`: primero con lo que tiene al lado arriba del todo, luego con todo).
  El anillo es un camino de dos vueltas justas (de 0 a 2π, la de dentro al revés): con arcos de 0 a 7 radianes, la de
  dentro se quedaba 41° corta y por el hueco se veía una cuña del mapa sobre el anillo, a la derecha, debajo de la N.
  Lo que va en el anillo se aparta por lo que mide de verdad (`hueco`, `ang`): cada letra con su ancho medido, cada icono
  con su aro (`rIc`, el 30 % del anillo, que deja aire con las dos rayas blancas) y la punta del objetivo; entre unos y
  otros quedan 7 px de pantalla, y si no caben, el icono no se pone. Antes se apartaban un ángulo fijo y en el minimapa
  de 112 px el icono casi tocaba la letra.
  El lienzo va a los píxeles de verdad de la pantalla (`fis`: lo que mide por la densidad, hasta 3, entre 120 y 420) y se
  dibuja en 248 puntos con la escala `f`, como antes: en un iPhone grande, unos 336 px en vez de 248 estirados; en el
  ordenador, 136 en vez de 248 (unas 3,3 veces menos que pintar).
  El círculo, sin el halo oscuro de 4 px que llevaba alrededor (el anillo ya es oscuro). Los botones redondos de encima
  (`.round`): el icono es el 70 % de dentro del botón en todos los tamaños (en el de 44 px, 28; antes 26 fijos), sin el
  brillo de arriba, y el anillo de energía de la mochila va dentro de su borde (antes salía 4 px y la mochila parecía
  más grande que los demás).
  El cuaderno no tiene botón ni pestaña en el visor: está en la pausa, como «Cuaderno», solo con su nombre y debajo de
  «Seguir jugando», y se abre también tocando el texto de la misión; en el ordenador, con C. Hubo una pestaña pegada al
  borde derecho, debajo del minimapa, y se quitó (noviembre de 2026: ahí no pintaba nada). Con él, la pausa del
  ordenador tiene cinco botones y en una pantalla baja, de 1280×720, va a dos columnas como en el móvil tumbado (si no,
  la ayuda de las teclas no cabía y había que desplazar). El mapa se abre tocando el
  minimapa y, en el ordenador, con M.
  En el pueblo, el catalejo (los prismáticos, `#bBino`), la mochila con su anillo de energía (`mochila.js` la pone delante
  de la pausa) y la pausa van al final de la barra de misiones, arriba a la izquierda (`#tl.mis .mfila`: `#misiones` y
  `#mbtns`), juntos en una cápsula clara del alto de una casilla, como el menú personal del explorador; redondos, grises
  translúcidos y del tamaño de una casilla. Desde el 13 de noviembre de 2026 el catalejo sale siempre (`townGame.js`);
  antes, solo al recibir los prismáticos en una misión de observar, y los botones iban detrás de una raya de 2 px. En el
  ordenador (sin puntero grueso, `#tl.plega`), las misiones van plegadas: solo se ve la que estás haciendo (`.ve`, que pone
  `refreshDots`: la abierta, si no la que sigues, si no la primera sin hacer) y a su lado una flecha con las hechas de las
  del pueblo (`#mPliega`, «0/7»), que despliega las demás con una entrada escalonada (`misEntra`, 28 ms entre una y otra);
  al elegir una, o al pulsar fuera de la barra, se vuelven a plegar con la elegida a la vista (`pliegaMisiones`). Lo pidió
  el autor el 13 de noviembre de 2026: en el ordenador salían todas a la vez. En el móvil, todo desplegado y
  siempre en una sola fila (13 de noviembre de 2026, lo pidió el autor: la columna del margen derecho, del 12 de
  noviembre, ocupaba demasiado, y plegada en un icono tampoco le gustaba). Las casillas, de 40 px con 8 de hueco (48 con
  10 en el ordenador); si la fila no cabe, `fitTop` (ui.js) achica las casillas hasta 28 px con 4 de hueco (`--chip`,
  `--mg`, `--ms` en línea, calculados de una vez para no volver a disparar el ResizeObserver) y, si ni así, la fila de las
  misiones se desliza de lado (`.desliza`). Tumbado llega hasta el minimapa; de pie, hasta el borde, y el minimapa baja
  debajo de la barra (`top` en línea, con transición). Antes, en el tumbado pequeño y de pie, pasaba a dos filas. Al
  tocar una misión, su tarjeta sale suelta debajo de la barra (`#tl.mis #quest`, con una flechita hacia su casilla,
  `--px`) y, mientras está abierta, por encima del minimapa: el icono en el color de su categoría, la categoría y cuál es
  de las del pueblo (o «Hecha»), su nombre, lo que toca hacer, sus pasos y lo lejos que está. Los corazones
  (`aventuraHud.js`, `coloca`) van arriba en el centro; si pisan la barra, centrados en el hueco entre la barra y el
  minimapa, y si no caben, debajo de la barra, apartados mientras la tarjeta está abierta. Arriba a la derecha
  (`#topright.sin-b`) solo queda el minimapa. Un ResizeObserver en `#tl` y el cambio de tamaño de la pantalla vuelven a
  colocarlo todo. En la aventura de
  Otsagabia los botones siguen arriba a la derecha (`.rbtns`), junto al minimapa.
  Abajo a la derecha, solo saltar y acción: se corre empujando el joystick hasta el borde (`input.js`, `stickRun`: corre
  desde 0,94 de la palanca y vuelve a andar al bajar de 0,82, para que en el borde no alterne). Antes había un botón de
  correr que se quedaba puesto; con el teclado sigue siendo Mayús y el mando del móvil conserva el suyo.
- **Composición de la comarca, sin huecos de aire** (`hub.js`, `s_comarca` y `ajustaRejillas`; `fichas.css`, `section.rejilla`):
  cada sección es una rejilla de 12 columnas con el mismo hueco entre todo (`--hueco-m`). En cada ancho (ordenador,
  tumbado y estrecho, `data-max`) van por fila como mucho las piezas que tocan; si hay más, las filas justas con el mismo
  número; y las de la última fila, si no llegan, se ensanchan hasta llenarla. Con imagen (`data-igual`: pueblos,
  leyendas, cimas) se elige el número de columnas que deja la última fila menos estirada: tres pueblos en tres columnas,
  siete en 4 y 3. Cultura y Naturaleza van cada una a todo lo ancho (antes, lado a lado, Cultura era mucho más larga y
  quedaba media pantalla vacía); la danza con su ilustración, destacada, con la imagen del ancho de una pieza de la fila de
  debajo (subgrid) y el texto al lado; en cada pieza, el sitio al pie, a la misma altura en toda la fila. Con un solo
  pueblo, a su lado va lo que es, sus misiones y los botones (`puebloUnico`); una sola cima, en horizontal. Los párrafos
  ya no llevan `text-wrap: pretty`: en el iPhone acortaba todas las líneas y dejaba media caja vacía a la derecha.
- **Las ilustraciones cubren su hueco sin cortar al explorador** (`FOCO_TRAD` en `data/laminas.js`; `focoImg` y `posImg`
  en `ui/laminas.js`; `.cubre` en `ui/escudo.js` e `infocard.css`; `ddgal.js` y `block` de `didactico.js`; 13 de noviembre
  de 2026): en la ficha de una tradición, la ilustración iba entera, con bandas difuminadas arriba y abajo, y el autor la
  quería cuadrada en su hueco, en el ordenador y en el móvil, sin tapar nunca al explorador. Ahora cubre el hueco y el
  recorte se lo lleva el lado contrario a él: `posImg` da el `object-position` con su sitio en la imagen, de modo que ese
  punto queda en el mismo lugar del hueco. Su sitio, en las 53 tradiciones, medido a ojo sobre hojas con una rejilla de
  diez en diez (x, de izquierda a derecha, y el centro de su alto); en las láminas, `FOCO` y el centro de `ALTO`. Se busca
  por la dirección de la imagen, así que vale para cualquier sitio que la pinte. Las que son un recorte sin fondo (`fit`)
  y las que no son apaisadas siguen enteras. Lo mismo en las tarjetas de las galerías y en los bloques del material.
- **Las rejillas del material didáctico, sin huecos** (`.dd-grid` y `.dd-b` en `didactico.css`; `ajustaRejillas` en
  `hub.js`, que ahora se llama en cada cambio de sección; `block` y `d_cuento` en `didactico.js`; 13 de noviembre de 2026):
  el autor vio en Otsagabia una sola leyenda en una carta estrecha y el resto de la ventana vacío, y pidió que todas las
  cuadrículas fueran iguales y el texto encajara en ellas. Ahora van en las mismas 12 columnas que las fichas: hasta tres
  bloques por fila en el ordenador, dos en la tableta y uno en el móvil, las filas justas para que no quede hueco al final
  y todos los de una fila con el mismo alto. Si los bloques miden muy distinto, el largo más de 1,8 veces el corto, igualar
  la fila dejaba huecos enormes dentro de los cortos: entonces van uno por fila (`.dd-filas`). Lo escrito de cada bloque va
  en `.dd-tx`, y el bloque es un contenedor: cuando mide 760 px o más, porque va solo en su fila, la ilustración pasa a la
  izquierda con el alto del texto y lo escrito a su derecha; sin ilustración, lo escrito en dos columnas, con cada
  subtítulo pegado a lo suyo. Para verlo: `didactico-rejilla.mjs` en la carpeta de trabajo de la sesión.
- **Cosechas de verdad, con tractor o cosechadora** (`game/townTractor.js`, `RECETAS` y `DESTINOS`; `game/conducir.js`):
  todas las misiones de cosecha. El trigo, con la cosechadora en un campo de cereal de verdad: se siega casilla a
  casilla (el trigo en pie baja a rastrojo), la tolva se llena y se descarga en el remolque del tractor que espera en la
  linde; segado el campo, se sube al tractor y se lleva el grano a la cooperativa. La huerta, la viña, el olivar y los
  frutales: matas en hileras (en la huerta), cuatro temporeros que avanzan por sus hileras dejando cajas o sacos llenos,
  y con el tractor se recogen despacio (a más de 3,5 m/s no se cargan); luego, a la conservera, la bodega, la almazara,
  la sidrería o el almacén. El destino se busca junto a un camino de las afueras, a unos 230 m del campo: una nave con
  su cartel, la báscula con su caseta y silos, palés, barricas o tinajas. El camino se marca con flechas en el suelo
  cada 18 m (por donde se anda, `nav.findPath`). Quien encargó la cosecha espera en la báscula: parado encima, se pesa
  (los kilos de verdad), se descarga y se habla con él. Prueba: `tools/cosecha-vehiculo.mjs` (TOWN=artajona o estella).
- **Campos con la textura de su cultivo** (`world/terrain.js`, atributo `aCampo` y bloque del sombreador tras `grassy`):
  cada vértice lleva el tipo de campo, la dirección de sus hileras y su borde (`fieldInfo`), y el sombreador dibuja
  encima el cultivo: rastrojo y espigas en el cereal, heno en hileras, tierra labrada en surcos, hileras de hoja con
  tierra clara en la viña, caballones en la huerta y suelo claro con matas en el olivar. Las cepas y las matas de la
  huerta (`Nature.buildCrops`) llevan la masa de hojas del atlas, como las copas de lejos: antes eran bolas lisas.
- **Maquinaria del campo con sus piezas** (`world/agro.js`): neumáticos de perfil redondeado con tacos en V, llantas con
  plato, buje y tornillos; capó redondeado con rejilla de lamas, respiraderos, faros e intermitentes; contrapesos; escape
  con caperuza y filtro de aire; cabina con montantes, techo con visera, rotativo, luces de trabajo, espejos, asiento y
  volante; escalones, depósito, guardabarros curvos y enganche de tres puntos. El remolque, de tablones entre postes; la
  cosechadora, con tolva abierta, escalera, plataforma, molinete con púas, barra de corte con dedos, sinfín y tubo de
  descarga. Unos 10 000 triángulos por máquina (las piezas de menos de 9 cm, sin redondeo) y las mismas mallas que antes.
- **Nada se monta** (`tools/choques.mjs`): ningún texto puede pisar ni rozar un icono, una chapa, un botón pequeño u
  otro texto, en ninguna pantalla ni tamaño: a 6 px como poco (3 px de un icono que va dentro del mismo texto), medido
  sobre lo que se ve (la letra de lo alto de las mayúsculas a la línea base, la inclinación de la cursiva, lo pintado de
  cada imagen) y contando lo que un aviso o una chapa tapan. No cuentan lo que va a propósito encima: la chapita del
  nivel sobre el retrato, el texto dentro de su foto o de su aro, las cartas de los lados del anillo, que van en escorzo, y
  las ventanas que lo cubren todo. Se pasa por el menú entero, la galería pueblo a pueblo, las fichas y Ventajas a 844 ×
  390, 667 × 375, 390 × 844 y 1280 × 720, y va dentro de `tools/auditoria-partidos.mjs` («choque») para los marcadores
  de pelota y fútbol. Lo que encontró y se arregló: la galería; el icono del rótulo de bloque, pegado a la letra
  (`.kicker > img`); el icono de los filtros («En el juego»); la chapita del nivel junto al nombre (`.hub-menu-btn`);
  «Navarra descubierta» y su sello (`.m3-tt`); el candado de las leyendas y su pie (`.ct-lam`, en columna); el alfiler
  bajo el nombre del personaje (`.cfrom`); el título de cada deporte y sus etiquetas (`.sp-txt`); la chapita «0/6» de la
  misión y su texto (`#quest`); el icono del título de las ventanas de papel; el personaje de la barra de carga y el
  tanto por ciento (`.ld-prog`); los rótulos de los cambios de fútbol; el nombre de quien atiende la tienda bajo su icono (`.shop-keeper`); y, con el móvil de pie, la misión, que `fitTop`
  estrechaba a 140 px, y la distancia de la brújula y los avisos de la conversación, que se le montaban.
- **Tarjetas de los campeonatos** (`pelotaMenu` y `retosMenu` en `game/torneo.js`, clases `cp-`, noviembre de 2026): arriba,
  la foto (`.cp-foto`): la cancha oscura dibujada (`--cancha`, un SVG en el CSS). Del 13 de noviembre de 2026 por la
  mañana a la tarde cada tarjeta llevó un frontón real de Navarra pintado con Higgsfield a partir de una foto de Wikimedia
  Commons, con el pelotari encima, y al autor no le gustaron: «no está bien integrado el personaje, está puesto por poner
  el fondo». Esas imágenes siguen en `src/assets/frontones-cartas` como referencia, sin usar (`conFoto` ya no hace nada);
  las fotos de verdad de los frontones van en el catálogo y al elegir frontón.
  Delante, el rival de tu ronda de pie en la cancha, con su sombra en el suelo, un filo de luz claro alrededor y una luz
  suave del color del campeonato detrás. Del 12 al 13 de noviembre de 2026 los frontones eran inventados y al autor no le
  gustaron; encima de la foto, la etiqueta (individual, por parejas, hasta el 4½…) y tus txapelas, en píldoras oscuras.
  Abajo, en oscuro y separado por una raya de 2 px del color del campeonato, el nombre, la ronda en su color, contra quién
  y una barra con todas las rondas del cuadro. Las de partido libre, retos, pelota en casa y colección, igual; los dibujos
  de los retos, en una placa oscura sobre la foto. Al pasar por encima, la foto se acerca un poco. Sin brillo que barre ni
  neón (eso, solo en las cartas de pelotari). En la cabecera, el total de txapelas en una píldora dorada. Antes eran
  oscuras del todo, con el rival pequeño en medio de un halo, y antes aún losas de degradado fuerte de color a color.
- **Menú de pelota en carrusel** (`pelotaMenu` en `game/torneo.js`, noviembre de 2026): las cinco losas (individual,
  parejas, cuatro y medio, partido libre y colección) del mismo ancho, en una fila que se desliza de lado con el dedo, la
  rueda del ratón o las flechas de los lados, que solo salen si hay más hacia ese lado. Tumbado se ven tres y media y de
  pie una y media, para que asome la siguiente; el ancho lo pone el menú (`--cw`) con el del carrusel. Antes se repartían
  el ancho con proporciones distintas y cada una salía de un tamaño.
  - Con pestañas (16 de noviembre de 2026; el autor: «el carrusel, al final, es todo igual ... no puedes encontrar qué
    campeonato es, de tanto campeonato que hay»). Ya eran quince losas seguidas, con la misma cancha y el mismo pelotari
    de rojo. Arriba, en la cabecera, cuatro pestañas con cuántas hay en cada una: Tu comarca (Manomanista, Parejas,
    Cuatro y Medio y Trinquete), Navarra (Gran Txapela y Campeonato de Comarcas, los de `global`), Más torneos (Fiestas,
    Valles, Invierno y Promesas) y Jugar (partido libre, Frontones, Retos, Pelota en casa y Pelotaris). En el carrusel
    solo van las de la elegida (`data-g`), y se recuerda (`herrizherri-pelota-grupo`). Tumbado caben hasta cuatro sin
    moverlo; con menos, del ancho de tres. De pie, las pestañas en su propia fila y sin el número.
  - Cada campeonato, distinto: un emblema abajo a la izquierda de su cancha (`EMBLEMA`: la mano, la pareja, la raya del
    4½, las cuatro paredes, la txapela, la comarca en el mapa, banderines, montes, copo y brote; y los de jugar) y su
    cancha dibujada (`CANCHAS`, clases `cv-*`): el trinquete con la pared de la derecha, el tejadillo y la red; el 4½ con
    su raya encendida; la Gran Txapela con focos y la grada llena; el de fiestas con banderines; el de los valles al
    aire libre, con cielo y montes.
  - En el carrusel de los pueblos (16 de noviembre de 2026, por la tarde; el autor: «no me gusta la nueva navegación de
    la pelota, puede ser estilo carrusel como en los pueblos»). Fuera las pestañas que dejaban ver solo un grupo: el menú
    usa `galeria()` de `hub/galeria.js`, la misma de la sección Pueblos. Todos los campeonatos en una sola fila en 3D,
    grupo tras grupo; el de delante, grande y encendido, y los demás a los lados, más hondos y en penumbra. Se pasa
    arrastrando, con las flechas, la rueda o el teclado. Arriba, los cuatro grupos con su color y cuántas cartas tienen
    (Tu comarca, fucsia; Navarra, oro; Más torneos, lila; Jugar, turquesa) se encienden según se pasa y saltan al primero
    del suyo (↑ ↓ también). Cada carta (`.gal-t`): arriba su cancha dibujada con el rival y su emblema, como antes, y en
    la franja de abajo el nombre, la fase y la ronda. Debajo del carrusel, la del centro: su grupo, su nombre, la fase y
    contra quién, sus txapelas y el botón (Jugar, Nueva edición, Elegir frontón o Ver colección). Se abre con delante la
    última elegida (`herrizherri-pelota-carta`). Las figuras ponen `--o` a 0 en `.figs`: el carrusel usa `--o` en cada
    carta para su transparencia y los pelotaris se corrían al borde.
  - Con fondos ilustrados (16 de noviembre de 2026; el autor: «hay que cambiar la página de selección de competiciones de
    pelota y sus fondos más divertidos. Recuerda las conexiones con Higgsfield»). Quince fondos pintados con Higgsfield
    (`src/assets/pelota/fondos/*.webp`, de 960 px y unos 60 KB; `FONDOS` en `game/torneo.js`), uno por campeonato y por
    opción: el Manomanista en un frontón cubierto con la grada llena y confeti; las Parejas en una plaza con banderines;
    el 4½ de noche con focos de colores; el Trinquete con su tejadillo de madera; la Gran Txapela con la txapela gigante
    en un pedestal; Comarcas con estandartes de colores lisos; Fiestas con farolillos y fuegos artificiales; los Valles en
    un prado del Pirineo con ovejas; Invierno con nieve; Promesas en el patio de una escuela; el partido libre junto a una
    iglesia; Frontones con una maqueta de Navarra llena de frontones; los Retos con dianas pintadas en el frontis; Pelota
    en casa en un salón; y la colección, en una sala de trofeos. Sin personas reconocibles, sin letras ni escudos. Todos
    dejan libre el suelo en medio y abajo: el pelotari pisa en él, con su sombra, y no queda «puesto por poner el fondo»,
    como los frontones reales del 13 de noviembre, que el autor retiró. Van en `--foto` de cada carta (`con-fondo`), con
    un velo suave arriba y abajo, como mucho al 50 %. Y la página entera lleva detrás el fondo de la carta del centro
    (`--fondo-pag` en `.pel-gal::before`) bajo un velo del 55 %: cambia con cada campeonato, con un fundido en Chrome y
    Safari; los textos de debajo, con una sombra fina para leerse encima.
  - De vuelta a las pestañas y las cartas grandes (16 de noviembre de 2026, por la noche; el autor: «me gustan las
    imágenes que has puesto para los campeonatos de frontones, pero el formato no me gusta. Hazlo como estaba antes, que
    las cards eran más grandes y me gustaban más»). Fuera el carrusel: vuelve el menú de antes, con las cuatro pestañas
    (`.cp-pest`, `data-g`) y las cartas grandes (`.cp-card`), de unos 186 por 252 en el móvil y 281 por 507 en el
    ordenador. Se quedan los quince fondos: cada carta lleva el suyo en `--foto` (`con-fondo`, que pinta
    `.cp-foto::before`) con un velo arriba y abajo de como mucho el 50 % y un brillo suave del color del campeonato donde
    pisa el pelotari. Ya no hay fondo de página (`--fondo-pag` y `.pel-gal::before` se van con el carrusel) ni se usa
    `hub/galeria.js` en la pelota. La prueba de humo pulsa la pestaña Jugar (`.cp-pest [data-g="jugar"]`).
  - Frontones de verdad con el pelotari dentro (16 de noviembre de 2026, noche). El autor: «esos fondos no encajan bien
    con el avatar», «las posturas no es la postura de un pelotari», «deja la imagen de pelotaris que ya tenías, intégralos
    en un frontón [...] todo tiene que ser muy básico, muy rural» y «que sean frontones reales [...] como el Labrit, el
    Navarra Arena [...] una foto que sea idéntica a la realidad, pero con el ecosistema [...] del juego, del mismo estilo
    de dibujo, el personaje bien integrado». Cada carta lleva ahora un frontón de los que tenemos foto (el Labrit, el
    Navarra Arena, Areso, Lana, Irañeta, el trinquete de Elizondo, Nazar, Genevilla, Igal, Roncal nevado, Marañón,
    Mendaza, Mirafuentes, Fontellas y Urroz de Santesteban), pintado con Higgsfield en el estilo del juego, sin gente, sin
    letras ni escudos, y dentro uno de los pelotaris del autor con su postura de siempre, de pie, con la luz del frontón y
    su sombra en el suelo. La figura ya va en la imagen: la carta no pone la de encima (`figs`) cuando tiene imagen, y
    la imagen se encuadra algo por debajo del centro (`50% 62%`) para que el pelotari salga entero en el móvil tumbado y
    en el ordenador. Velo arriba, para leer la etiqueta, y otro suave abajo, sin pasar del 36 %. Créditos y licencias en
    `src/assets/pelota/fondos/LICENCIAS.md`; los fondos anteriores, sin pelotari, en `entrega/pelota-fondos-anteriores`.
    Se probaron antes pelotaris generados en plena jugada: el autor los rechazó por las posturas, y no se usan.
  - Frontones calcados de fotos (17 de noviembre de 2026). El autor: «no quiero que generes imágenes de frontones que no
    existen», «quiero que calques tal cual, centímetro a centímetro, fotografías», «para las portadas quiero frontones
    grandes, frontones cubiertos», «me valen el Ogueta y el Beotibar» y «las posturas de los pelotaris es la postura A».
    Las quince cartas son ahora la foto de un frontón que existe, editada con Higgsfield sin mover nada: la misma cámara,
    paredes, rayas, chapas, gradas y casas; fuera la publicidad, las letras y la gente; dentro un pelotari del autor de
    brazos cruzados. Las cuatro de campeonato van en frontones cubiertos grandes: el Manomanista, la Gran Txapela y el
    Cuatro y medio en el Ogueta de Vitoria (tres vistas distintas) y Parejas en el Beotibar de Tolosa, lleno de público.
    El pelotari sale al tamaño de un chico de doce años en el sitio donde está, medido contra las rayas, las chapas y la
    gente que había en la foto: la primera prueba los ponía de casi el doble de alto que los jueces, y no tenía sentido.
    Esas versiones grandes quedan en `entrega/pelota-fondos-reales-17nov/alternativas`. Las dibujadas del 16 de noviembre,
    en `entrega/pelota-fondos-dibujados-16nov`. Las fotos del Navarra Arena que mandó el autor no tienen licencia libre y
    no se usan; la foto del Labrit que había es de la fachada, sin interior.
    El autor, en la página de elecciones del 17 de noviembre: en el Cuatro y medio prefiere la alternativa, con el
    pelotari más grande en el frontón de Ogueta (misma foto y licencia); en el Manomanista, la Gran Txapela y Parejas,
    las de ahora. `cuatro.webp` pasa a ser la alternativa, a 896 px como las demás; la de antes queda en
    `entrega/pelota-fondos-reales-17nov/sustituidas/cuatro-real.webp`.
- **Pantalla del torneo sin texto apilado** (`torneoPanel`, `ligaHtml` y `comoFunciona` en `game/torneo.js`, noviembre de
  2026): cada dato, una sola vez. La jornada va solo en el VS («Jornada 1», sin «de 3»); la liguilla son solo las tablas,
  sin el rótulo «Liguilla · jornada 1 de 3», sin «Los dos primeros de cada grupo, a cuartos» (la raya fucsia ya marca los
  que pasan) y sin la leyenda de debajo; con cuatro grupos, sin el puesto ni la columna J. Fuera también «Toca su carta
  para ver su ficha» y «Tus txapelas» (están en la losa del menú y en tu ficha); el frontón va solo, centrado. Lo quitado
  que explica algo (tocar la carta del rival, qué son G, J y ±) pasa a «?», que ahora es una ventanita debajo de la
  cabecera que se cierra al tocarla (antes era una fila más al pie y se montaba encima de las tablas). Las tablas ocupan
  todo el alto junto al partido; Salir y ¡A jugar! van siempre en una fila; en el móvil tumbado pequeño las rondas del
  cuadro van en una palabra («Cuartos», «Semis») y el cuadro de dieciséis, algo más junto, cabe entero en 844×390.
- **Pantallas de pelota y fútbol como un juego de deportes** (`torneoPanel` en `game/torneo.js`; `ligaPanel`, `roundPanel` y
  `clubPanel` en `futbol/liga.js`; noviembre de 2026): tres franjas. La cabecera; dos paneles (`.lg-pn`) con su rótulo
  (`.lg-ph`: el nombre en pequeño y una chapa `.lg-chip` con el dato, la jornada o el grupo), el partido y la clasificación;
  y abajo, de lado a lado, la barra de acciones (`.lg-bar`): Salir a la izquierda y la acción principal a la derecha, con el
  frontón al lado en pelota. De pie, la barra va pegada abajo; en el móvil tumbado muy bajo (568 × 320) la tarjeta se
  desplaza con la barra pegada. En el fútbol, debajo de la media de cada club, su racha (`racha`: los cinco últimos
  partidos, G, E o P en cuadritos de color; en euskera I, B, G) y la explicación y el aviso de los nombres de los equipos,
  detrás de «?» (`ayuda`). Las losas del menú del club, todas del mismo ancho (antes la de la liga, 1,3 veces); de pie, en
  carrusel. Las cartas de jugador (`ui/sport.css`, `.gx-face::before`) llevan una placa oscura detrás del nombre, el pueblo
  y las cualidades: en la carta rosa del rival, el pueblo y las siglas iban rosa claro sobre rosa, con un contraste de 2 a 1.
- **Parpadeo de las paredes de cerca** (`weather` en `world/builder.js`): fuera el relieve fino calculado con las derivadas de
  la pantalla (`dFdx`/`dFdy` del ruido): cambiaba de un grupo de cuatro píxeles al siguiente con cualquier movimiento de la
  cámara y todas las paredes de cerca centelleaban. El borde de los desconchones del revoco, suavizado con `fwidth`. Medido
  con un detector (dibujar la vista, mover la cámara 2 mm y comparar): en una pared de Lesaka, de 781 bloques de 16 × 16 que
  cambiaban a 42 (el borde del pilar, que sí se mueve). En Elizondo, Isaba y Pamplona, a pie de calle y desde 45, 110 y 220 m,
  ningún parpadeo de profundidad; y en las maquetas del mapa de Lesaka, Olite, Tudela y Pamplona, tampoco.
- **Maquetas del mapa con más textura** (`haceMaqueta` en `hub/maqueta.js` y `materialEmblema` en `hub/emblemas.js`): las
  manchas del revoco, del musgo y de las tejas, con ruido suave interpolado (`vn`) y no en cuadrados de un tono; en la mitad
  de las casas del norte, la planta baja de piedra con su imposta; bajo el alero, los canecillos; bajo algunas ventanas,
  jardineras con geranios; los hastiales con su revoco, la sombra del alero y, en los grandes, un ventanuco; lo de encima de
  las paredes que asoma fuera del tejado, como un terrado de baldosa con su pretil; encima de murallas y baluartes, losas, y
  en lo alto de los muros altos, almenas; y los lugares emblemáticos, con hiladas de sillares y manchas en metros de verdad.
- **Movimiento en los menús y bordes suaves en las maquetas** (noviembre de 2026). Menús (`futbol/liga.js`, comunes a pelota):
  los paneles entran cada uno por su lado, la barra sube, las filas de las tablas y los resultados caen una tras otra, las
  chapas y los cuadritos de la racha saltan, los números grandes cuentan desde cero (`cuenta`), el VS late, las cartas y los
  jugadores del partido flotan despacio y las losas entran en cascada; con «reducir movimiento» del sistema, nada se mueve.
  Las animaciones de entrada de losas y botones van con `backwards`: con `both`, la última imagen pisaba el `transform` de
  `:hover` y `:active`. En el fútbol, debajo del partido, la comparativa (`.lg-cmp`): media y, con partidos jugados, puntos y
  goles, con barras que crecen; llena el hueco vacío que quedaba en el panel. En el torneo, las cartas tan grandes como deja
  su panel (ver «El torneo, sin nada cortado ni montado»). Maquetas (`hub/maqueta.js`): las paredes con las esquinas en chaflán de 60 cm de
  verdad (`cajaChaflan` y `aCh`, que el sombreador mete en metros sea cual sea la casa), las cumbreras algo vencidas en el
  centro (`VENCE`), los árboles que se mecen con el viento y el agua de las pilas con ondas (el reloj del mapa, `o.tiempo`).
- **Bordes suaves también en los pueblos del juego** (`boxChaflan`, `faldon`, `cumbrera` y `venceDe` en `world/builder.js`;
  `buildHouse`, `quoins` y los tejados a dos aguas en `world/houses.js`; `block` en `world/townReal.js`; noviembre de 2026):
  el cuerpo de las casas, con las esquinas libres en chaflán de 30 cm (`CHAFLAN`); las que dan contra otra casa, no, para
  no abrir una rendija entre las dos. El zócalo sigue el chaflán 6 cm por fuera y los esquinales de sillería, 2,5 cm por
  fuera, ya solo con sus caras de fuera (las de dentro quedaban metidas en el muro: ahora tienen la mitad de triángulos). Los
  faldones y la cumbrera de los tejados a dos aguas, en cuatro tramos, se vencen en el centro hasta 28 cm en vertical
  (`venceDe`: el 2 % del largo) y nada en los extremos, donde están los hastiales; el alero sigue recto. Los árboles ya se
  mecían con el viento y el agua ya tenía ondas en el juego. Presupuesto del iPhone: Lesaka 576.526 triángulos y 320
  llamadas; Pamplona 706.163 y 362.
- **Vuelta a los colores de siempre en los pueblos del juego** (noviembre de 2026): los cambios de «casas cálidas» y «más
  detalle en las texturas» dejaron los pueblos marrones y oscuros (Ochagavía, sobre todo), comparado vista a vista con la
  versión de antes (`ff4a50ba`). Vuelven a lo de antes: la luz del cielo y del suelo (`sky.js`); la hierba entre las casas
  del casco (`SURF.tierra`, en `heightfield.js`, queda a cero: la tierra apisonada llenaba el casco de pardo); la piedra
  gris, la sillería clara, la cal blanca, la pizarra gris azul y la teja (`textures.js`); el cristal gris azulado y las
  crucetas claras de las ventanas (casi negras, las ventanas parecían agujeros); y sin el rebote cálido ni el tinte de
  `weather` (`builder.js`). Se quedan, más suaves: el grano fino de la piedra y la teja, con apenas musgo; los desconchones
  del revoco, solo de vez en cuando. No se tocan el orden de las casas, los arcos, las farolas, los chaflanes ni el arreglo
  de los parpadeos. Regla: un cambio de color o de luz en los pueblos, siempre comparado con la vista de antes en un pueblo
  del norte (Ochagavía o Lesaka) y uno del sur.
- **Las calles de los pueblos, todas empedradas** (`world/heightfield.js`; 15 de noviembre de 2026). «No entiendo por qué
  el suelo tiene ese color amarillo. Si es un suelo empedrado, debería tener de textura un suelo empedrado. Todas las
  calles de los pueblos». Solo las calles de los datos llevaban el adoquín; la carretera que cruza el pueblo, que suele
  ser la calle mayor, y los pasos, callejones y escaleras entre las casas iban con la tierra clara de los caminos, y en
  pleno casco se veían franjas amarillas. Ahora, dentro del casco, todo lo que se pisa es empedrado, con la misma acera
  hasta las fachadas que las calles; fuera, los caminos siguen siendo de tierra, y entre los dos se pasa poco a poco.
  La carretera, empedrada siempre, también fuera del casco: es la calle por la que se entra al pueblo (en Lumbier se
  llegaba por una franja de tierra con piedrecitas).
- **El rastrojo de los campos, menos amarillo** (el cereal segado, `ft == 2.0`, en el sombreador de `world/terrain.js`;
  15 de noviembre de 2026). Con la misma queja del suelo amarillo: el campo de cereal junto a la entrada de Lumbier era
  de un dorado claro y liso que, al lado de la calle, parecía arena. Ahora la paja es más apagada y entre las hileras
  asoma la tierra, más de cerca; de media pasa de 218, 197, 141 a 196, 172, 123 con el sol de mediodía.
- **Misiones del pueblo, solo los cuadrados** (`eligeMision`, `cierraMision` y `setQuestPueblo` en `ui.js`; `#tl` en
  `style.css`; noviembre de 2026): durante unos días la misión que sigues iba siempre abierta debajo de los cuadrados, y
  el autor pidió limpiar el visor. Ahora arriba a la izquierda solo quedan los cuadrados: la que sigues, con borde blanco.
  Al tocar uno, esa pasa a ser la que sigues y se despliega debajo; se recoge sola a los 10 s (`ABIERTA_MS`), tocando
  otra vez su cuadrado o tocando la pantalla fuera de la barra, y tocando el texto se abre el cuaderno. Nunca se despliega sola: al cambiar lo que toca hacer,
  solo late su cuadrado y sale el aviso de abajo. En la aventura de Otsagabia, que tiene un solo icono redondo y no
  cuadrados, sigue a la vista el icono con lo que hay que hacer y las cintas: plegada, quedaba un icono suelto sin sentido.
- **Chinchetas en el mapa del inicio** (`mapa3dSombreadores.js`, `PIN_VS`, `PIN_FS`, `MIRA_FS`; `mapa3d.js`; noviembre de
  2026): los pueblos eran balizas holográficas cian con un cristal que giraba, y se confundían con los ríos, que son cian.
  Ahora cada pueblo es una chincheta quieta: una sombra en el suelo, un palito oscuro y una cabeza de cara a la cámara con
  el borde oscuro. Por descubrir, blanca con su punto morado; empezada, magenta con lo hecho en un arco; sellada, dorada
  con la marca verde. Las ciudades, más grandes y con diana; las zonas de naturaleza, con el punto verde. Los ríos no se
  tocan.
- **Identidad: esquinas redondeadas; el filo de neón, solo en las cartas de jugador** (`src/ui/neon.css`, cargada por
  `hub/hub.js` después de `identidad.css`; noviembre de 2026): dos reglas para todo el juego.
  La forma: toda tarjeta, card, bloque, panel, ventana y rótulo, en el menú, en los campeonatos, en el partido, en el
  fútbol y dentro del pueblo (el diálogo, el libro, el mapa, la mochila, la pausa, la tienda, la recompensa), lleva las
  esquinas redondeadas (6 px los rótulos pequeños, 8 las tarjetas y 10 los paneles y las ventanas).
  El filo: el filo de neón de 1 px, con su destello que da la vuelta y la luz de su color alrededor, es de las cartas de
  jugador y de nadie más (`.gx-card`, `ui/sportCard.js`: el cuadro del torneo, la presentación del partido, la Gran final
  y la colección de pelotaris). Antes lo llevaba todo lo que flotaba sobre el juego (paneles, ventanas, marcador, HUD,
  losas del menú de pelota, rótulos del partido, tarjetas del menú, la ventana de pausa) y muchos botones; el autor lo
  pidió así: «todos los botones no deben tener el borde de un píxel neón (...) solo para las cards de jugadores». Lo demás
  se separa del fondo con su relleno y una sombra oscura (`--sombra-caja`, `--sombra-panel`); como mucho, una raya
  neutra muy tenue (`--linea`, blanco al 8 %; las rayas de 1 px de todas las hojas pasaron del lila y el rosa a ese
  blanco, y `--line`, `--line2` y `--cr-l2` también), sin color ni brillo, y sin anillos de color en las sombras
  (`box-shadow: 0 0 0 Npx`). Las rayas de acento de 2 px o más a un lado (la del comentarista, la del marcador, la de
  arriba de los paneles con el degradado del juego) no son filo y siguen.
  Los botones: ninguno lleva borde, contorno ni anillo (con alto contraste sí: ahí el borde blanco es lo que se ve). El
  principal, en pastilla con el degradado del juego (`--cta`, la lista de `ui/sport.css`); los secundarios, en pastilla
  con relleno liso (`--btn-2`); lo elegido (`aria-pressed`, `aria-selected`, `aria-checked`, `.on`) se rellena
  (`--btn-on`), no se contornea: el mismo en niveles, pestañas, vistas y opciones de todas las pantallas. Los botones
  redondos (los iconos de la pausa, la equis), igual: sin aro ni brillo. Las variables están en `ui/sport.css`.
  Tampoco hay luz de color alrededor de nada que no sea carta de jugador (noviembre de 2026, a petición del autor: el
  botón de seguir jugando de la portada llevaba un halo morado): los botones principales y lo elegido, con una sombra
  oscura (`--sombra-boton`, y `--glow` ya es una sombra oscura); las rayas de arriba de los paneles y las barras, sin
  brillo; lo que iba con borde o anillo rosa (el pueblo donde estás en el mapa, la forma de jugar de este aparato, el
  tanto perdido de la pausa), con relleno. Es el último bloque de `neon.css`. Conservan su luz los textos grandes (VS,
  Gran final) y las señales del mapa y del catalejo, que no son recuadros.
  Un botón, una caja o una pantalla nuevos siguen esto sin más; las listas de `neon.css` (la forma, los botones
  secundarios, lo elegido) se amplían con lo nuevo. Sustituye
  a las esquinas cortadas en ángulo y a sus marcos dibujados (`ui/frames.js`, retirado): las 57 reglas con `clip-path`
  de corte pasaron a `border-radius` en su propia hoja. Siguen como formas, no como cajas, las cintas de premio, las dos
  mitades del VS y la silueta de la carta de pelotari (`gx-card`), que lleva
  la de escudo de las cartas de los juegos de fútbol: arriba la corona, con las esquinas cóncavas, los hombros y un pico
  en medio; los lados rectos, y abajo la punta (`--fifa`). La saca `tools/silueta-carta.py`: las curvas, muestreadas en
  un `polygon()` (`path()` no se estira con la caja y `shape()` aún no lo tiene todo Safari), en tanto por ciento. La
  carta mide 1,48 de alto por cada 1 de ancho (`CARTA_ALTO`, `ui/sportCard.js`, con el que el torneo y la colección la
  encajan por su alto); lo de arriba va medido por su ancho y el pie acaba antes de la punta. Por dentro va como las de
  ejemplo que mandó el autor: a la izquierda, en columna, la media, el puesto, el arquetipo donde ellas llevan la bandera
  y el escudo del pueblo donde el del club (`escudoDe`: del nombre del pueblo a su nivel y a su blasón de
  `data/armas-navarra.js`; sin imagen, la columna va sin él); a la derecha, la figura de busto (`.gx-fig`, la imagen de
  cuerpo entero agrandada hasta que su mitad de arriba llena la caja); debajo, el nombre centrado con una raya y las seis
  cualidades en dos columnas de tres con una raya en medio; sin placa oscura, la carta se oscurece poco a poco hacia
  abajo. Un filo fino de dentro sigue la silueta (`.gx-lin`, `--marco`, un aro de 1 px en un `polygon()` con `evenodd`).
  El color de su bando va en una cinta que sigue la corona de lado a lado (`.gx-eq`, `--corona`, el mismo borde
  desplazado hacia dentro). Las dos tarjetas de
  Torneos (`sport`, pelota y fútbol) también la llevaron, con la corona y la punta en píxeles; el autor pidió quitarla
  («estos bloques no hace falta»): son tarjetas del menú como las demás, con las esquinas de 8 px, una raya neutra de
  1 px y su sombra (noviembre de 2026). El filo de la carta de pelotari sí
  sigue su forma: un aro con degradado cónico que da la vuelta (`--neon-a`, `@property`), recortado con la silueta, el
  marco de colores 1 px por dentro y la luz de su bando alrededor. Al pasar a la identidad de neón las cartas se habían
  quedado en rectángulos redondeados: «no quiero que sea simplemente cuadrada»; la primera silueta, con las esquinas
  cortadas en ángulo, se quedó corta, y el autor mandó cartas de referencia (noviembre de 2026).
  La forma va en tres listas de `neon.css` (tarjetas y bloques, 8 px; paneles y ventanas, 10 px; rótulos pequeños,
  campos y chips, 6 px); una caja nueva entra en la que le toca. Con «menos movimiento», el destello de las cartas se
  queda quieto. La auditoría de diseño lo vigila (`tools/auditoria-medida.mjs`): `esquina` y `forma` para la forma;
  `neon`, una caja con filo, borde, anillo o brillo de color, o una carta de jugador sin su filo; `filo`, un botón con
  filo, borde o anillo.
- **La carta: una sola tarjeta para todo el menú** (`identidad.css`, al final; noviembre de 2026): las tarjetas de las
  listas iban en cajas de cristal con esquinas casi rectas, cada una a su manera, y no se parecían a las comarcas de abajo
  del mapa ni a las cartas de Torneos. Ahora todas tienen esa misma forma: las especies, los personajes y las figuras, las
  cimas, las insignias, los instrumentos, los escudos y su guía, los cuentos, los certificados y los comercios, las
  tradiciones, las leyendas de las fichas, las láminas y las páginas del pasaporte. Esquinas redondeadas de 8 px,
  un relleno morado opaco (`--carta-fondo`, en `::before`, que llena la tarjeta) y, alrededor, una raya neutra muy tenue
  y una sombra (antes, dos esquinas cortadas en ángulo; luego, un filo de luz con destello de neón, que desde noviembre
  de 2026 es solo de las cartas de jugador). Lo conseguido se rellena con un
  punto del color de su sección (`--carta-fondo-on`), no se contornea; lo bloqueado, apagado (`--carta-filo-off`); las
  cimas, con un punto del color de su comarca en el relleno. La imagen de arriba, con sus esquinas de arriba redondas. «Observado» e «Identificada», con la marca
  verde en su círculo amarillo, como en todo el juego. Se cambia aquí, en un solo sitio, para todas.
- **Láminas animadas** (`src/ui/videos.js`, `public/videos/<id de la lámina>.mp4`, `tools/laminas-video.sh`; noviembre
  de 2026): el arranque, la pantalla de carga de los pueblos y del frontón y las cartas de Torneos llevan la misma lámina
  de siempre, pero moviéndose: nubes, agua, banderas, hojas y el explorador que respira y parpadea. Son vídeos de 5 o 6 s
  sin sonido hechos en Higgsfield con MiniMax H3 Max (768p, 12,5 créditos el de 5 s) a partir de la lámina original
  (`original/`, por su dirección en raw.githubusercontent.com), con la propia lámina de primer y último fotograma para
  que se repitan sin salto. El modelo devuelve 1344 × 768 recortando 13 px por lado de la de 1672 × 941;
  `laminas-video.sh` lo escala a 1260 × 720 y lo pone en x = 10 sobre la lámina web, así coincide al píxel con la fija,
  funde el último medio segundo con el primero y lo pasa a H.264 con faststart (CRF 29: de 0,4 a 1 MB cada uno). El
  `<video>` va encima de la lámina fija, con su mismo encuadre, y entra con un fundido cuando ya se mueve; al acabar la
  carga se para y suelta el archivo. Fuera de `assets/`: no entran en «descargar todo», ni en el archivo único ni en el
  artefacto, y el service worker no los guarda (Safari pide los vídeos por trozos). En el modo sencillo, con «reducir
  movimiento», con ahorro de datos, sin conexión o si fallan, queda la fija. El arranque (`#portada-app` en `index.html`)
  pone los Pirineos al 50 % detrás del icono, con su viñeta morada, y de ahí se pasa directamente al mapa: la lámina se
  queda hasta que el mapa del inicio está pintado (`window.__mapaListo`, en `mapa3d.js`, con el suelo y el sombreado
  llegados o a los 2,5 s) y se va con un fundido. Se queda al menos 5 s desde que se abre y, si se mueve, 4 s desde que entra el vídeo (`window.__paVid`), para que se vea bien (noviembre de 2026: el autor quería verla más; con todo guardado, el mapa estaba listo en un par de segundos); un toque la quita antes con el mapa ya listo, pero no el primero, que en el iPhone da la música, ni uno antes de 2,5 s; como mucho, 15 s. La entrada de nubes del mapa (`INTRO`), que el autor veía «como humo»,
  está apagada (noviembre de 2026; con `window.__intro`, en las pruebas, sale aún). Las láminas sin vídeo siguen fijas: para añadir una,
  se genera igual, se pasa por `laminas-video.sh` y se apunta su id en `VIDEOS`.
  **Resolución ante todo** (regla del autor, noviembre de 2026: en el juego todo con la máxima resolución y definición; si
  un vídeo no la tiene, la imagen): `basta(el, w, h)` mira si un vídeo o una imagen de w × h tiene la definición de lo
  que ocupa en la pantalla, como `web/hd.js` (el ancho que pide según su encaje, por la densidad de la pantalla y por el
  zoom de las pantallas grandes, con un 2 % de holgura). `enMarcha` no pone el vídeo si se estiraría: la versión pequeña
  sube a la grande si esa basta y, si tampoco, se queda la lámina fija (`data-baja`); al cambiar el tamaño de la ventana se
  vuelve a mirar. Medido: a pantalla entera, el vídeo de 1280 × 720 solo sale hasta 1280 × 720 con densidad 1; en
  1366 × 768, 1920 × 1080, un portátil de densidad 2 o el móvil, la imagen. Las figuras animadas (384 × 576) igual: va la
  fija (la de 512, que `hd.js` sube a la de 1024 cuando hace falta) y la animada (`data-an`) solo la sustituye donde basta,
  y vuelve la fija si crece (`figura`, con un ResizeObserver).
  Las 12 comarcas también: en las tarjetas de abajo del mapa (`.m3-vid`, la versión pequeña de `public/videos/s/`, 640 ×
  360 y unos 120 KB) y en la cabecera de la ficha de la comarca y del pueblo (`.pt-vid` en `cabecera`, `laminas.js`), esta
  solo con la pantalla de pie, donde el vídeo cabe. Tumbada, la cabecera es mucho más ancha que el vídeo y va la fija de
  siempre, la panorámica o la lámina con sus bordes (antes, el vídeo con la lámina difuminada a los lados, que no gustó). `vigila(raiz)` (`videos.js`, desde `hub.show`) pone en
  marcha cada `<video data-vid>` solo mientras se ve: en la pantalla y sin nada encima (lo que hay en su centro es él o su
  tarjeta); `revisa()` lo vuelve a mirar al abrir o cerrar una sección o una ficha, así las tarjetas del mapa se paran
  debajo de la página de una comarca. Al quitar un vídeo, se para y suelta su archivo.
- **Figuras de jugador animadas** (`figuraAnimada` en `videos.js`, `pelotariFig`, `tools/figura-animada.sh`; noviembre de
  2026): la figura del pelotari, en su carta, respira, cambia el peso de pierna y parpadea. Se pone la figura del autor
  sobre un verde liso (768 × 1024, la figura en x = y = 128), se anima en Higgsfield (MiniMax H3 Max a 480p y 3:4, 7,5
  créditos, empezando y acabando en ella), y `figura-animada.sh` funde la vuelta, quita el verde con su halo, la recorta a
  su caja de 2:3 y la pasa a WebP animado con transparencia (320 × 480, 15 fps, unos 0,8 MB), que va como una imagen más
  donde iba la fija (`public/videos/figuras/<color>/<id>.webp`). La pantalla VS, tan grande, sigue con la fija de 1024. De
  momento solo Iñigo, de colorado y de azul; para otro, se genera igual y se apunta en `FIGURAS`.
  Desde el 8 de noviembre de 2026 los tienen los 22 de la plantilla, en las cartas y también en la pantalla VS, donde se
  enfrentan. Los otros 21, con Grok Video 1.5 Lite (1 crédito por segundo a 480p: 2 s cada uno, 42 créditos en total),
  que solo parte de la figura y no acaba en ella, así que el bucle es de ida y vuelta (`tools/figura-animada-ida.sh`: se
  vuelve hacia ti, parpadea y regresa); solo la roja: la azul sale de ella pasando a azul, fotograma a fotograma, el rojo
  saturado de la camiseta (`tools/figura-azul.cjs`; las figuras del autor solo cambian en eso). 320 × 480 a 12 fps, unos
  0,55 MB cada una, 25 MB las 44. En la pantalla VS del ordenador se ven algo más blandas que la fija de 1024.
  Estabilizadas desde el 8 de noviembre de 2026 (`tools/figura-estable.cjs`): esos vídeos se acercan poco a poco a la
  figura, que crece un 16 % en dos segundos; recortada siempre en el mismo sitio, se le salían la cabeza y los pies y se
  veía entrecortada. Ahora, en cada fotograma se mide la figura y se escala y se mueve al tamaño y al sitio del primero,
  que es la figura fija; el verde se quita a la resolución del vídeo con el borde suavizado (el vídeo guarda el color a
  media resolución y el recorte salía en escalera); salen a 384 × 576 y 15 fotogramas por segundo, de ida y vuelta, con la
  azul hecha en la misma pasada. En la pantalla VS, las animadas van sin sombras de filtro (`pf-an`): su halo y su sombra
  en el suelo van fijos en el fondo de la imagen, y el navegador ya no la repinta entera en cada fotograma.
  **Rehechas el 18 de noviembre de 2026.** Ese día las figuras de las cartas pasaron a ser las de los 22 pelotaris de
  siempre (el dibujo de su modelo, `tools/pelotaris10-figuras.py`) y las animadas, que eran de las ilustraciones de
  antes, se apagaron y se borraron (43 MB menos). Se rehacen igual, pero desde la figura azul, que ahora es la original:
  la figura de 512 × 768 sobre el verde de 768 × 1024, Grok Video 1.5 Lite (2 s, 480p, 3:4, 2 créditos) y
  `tools/figura-estable.cjs <vídeo> <salida> tal|colorado 320 12 56` (`tal` deja la camiseta azul; `colorado` la pasa a
  colorado como en las fijas). Salen a 320 × 480 y 12 fotogramas por segundo, unos 0,65 MB (28 MB las 44). Hechas las 22
  esa tarde (44 créditos; `PLANTILLA_IDS` en `videos.js`). Una figura sin animada respira en la carta con CSS
  (`gx-respira`, `sport.css`). Se dejan estirar hasta un 45 % (`FIG`): sin esa
  holgura, en un móvil de densidad 3 no salía ninguna. `figuraViva(img, on)` enciende o apaga la de una imagen.
- **«Elige tu pelotari» y la banda del anillo** (`torneo.js` `anilloPelotari`, `eligePelotari`, `eligePelotariLibre`;
  `carrusel3d.js`, opción `banda`; 18 de noviembre de 2026): el anillo de los campeonatos se abre de lado a lado de la
  pantalla, con portadas más estrechas (1,46 de alto por 1 de ancho) y algo menos altas; el ángulo entre portadas sale
  del hueco (de 14° a 34°: el más abierto con el que el anillo entero cabe a lo ancho) y no se ven más allá de 62°. Las
  portadas entran una tras otra al abrir, por la de delante cruza una luz y se mece (solo `translate`, `scale` y
  `opacity`). «Elige tu pelotari» es ese mismo anillo con las cartas enteras (`.ep-port`), la tuya primero, y solo la de
  delante con su figura animada. Sale antes de la primera ronda de un campeonato nuevo (y con el botón «Pelotari» del
  cuadro hasta entonces) y, desde ese día, antes de cada partido libre, de Frontones y de la pelota en casa
  (`townDeportes.js`): lo elegido va al partido en `yo` (su figura, su nombre a la espalda y sus cualidades) y se
  recuerda en el perfil (`pelotaYo`). La ficha con tu nombre sobre tu pelotari (`match.js` `sobreTi`) solo sale 3,2 s al
  ir a sacar cada tanto. Las muestras del golpe arrancan saltándose el silencio que el mp3 lleva delante y Safari no
  quita (`pelota/audio.js` `golpe`, `INICIO`).
- **Sin personalización del pelotari** (19 de noviembre de 2026, noche; el autor: «Deja el personaje como estaba en un
  principio… Olvídate de la personalización, elimínalo todo»). La equipación (elegir el color de las zapatillas, las
  muñequeras y los tacos, con su pantalla «Equipación» y la muñequera en 3D) se ha quitado entera: fuera
  `src/pelota/kit.js` y `src/pelota/equipacion.js`, el botón «Equipación» de «Elige tu pelotari» y del cuadro del
  campeonato, y lo que pintaba en el partido (`fronton.js` `rigPelotari`). `actors/npcOutfit.js`, `actors/sinTacos.js`,
  `actors/hairColor.js` y `util/offscreen.js` vuelven a como estaban antes de la equipación (el 18 de noviembre, antes de
  `a502991f`): los pelotaris salen con su ropa, sus zapatillas y su venda de siempre, y el de colorado solo con la
  camiseta teñida. Lo que se guardó en el perfil (`settings.pelotaKit`) ya no se lee. Las pruebas del fajín y la
  zapatilla de Meshy siguen en la rama `borrador-equipacion`, sin uso.
- **La pantalla de juego** (`src/ui/pantalla.js`: `ptCabecera`, `ptPie`, `cssPantalla`; 18 de noviembre de 2026; el
  autor, con una captura del móvil en la que la portada, el texto y «Jugar» se tocaban: «hay muy poco espacio», y que se
  ordene todo como los juegos de deportes del móvil). Es la disposición de las pantallas a pantalla entera, con los
  colores y las letras del juego: arriba, una barra con el botón de atrás (redondo, a la izquierda; es también «Salir»),
  el antetítulo y el título, y a la derecha lo que acompaña (las txapelas, el frontón, la ayuda); en medio, lo que se
  elige, con un hueco fijo por arriba y por abajo; y abajo, a la izquierda lo que toca (una línea fuerte y otra fina) y a
  la derecha los botones, el principal el último y el más grande. De pie, el pie se apila y el título se ajusta al ancho.
  La tarjeta del panel lleva `pt-pant` (sin marco, a pantalla entera, en columna) o `pt-libre` (solo sin marco, para las
  que traen su rejilla), y `neon.css` no les pone la sombra de ventana. La llevan el menú de pelota, «Elige tu pelotari»,
  «Elige tu frontón», Frontones y el cuadro del campeonato (que pierde el botón «Salir» de abajo: quedan
  dos botones con sitio). Y el fútbol (`futbol/liga.js`): su menú, «Elige tu club» y la liga llevan el botón de atrás en
  su cabecera (`ptAtras`, `head(S, sub, info, atras)`), sin «Salir» ni «Volver» abajo, y sin marco.
  En el inicio (`hub/consola.css`), con el móvil tumbado: la fila de comarcas ya no pisa la raya de inicio del iPhone
  (`--hud-b` vale el margen seguro entero) y el menú principal enseña sus diecisiete secciones en nueve columnas y dos
  filas, sin que ninguna quede detrás de «Cómo jugar».
- **La barra de arriba del mapa del inicio, una cabecera plana** (`src/hub/barra-inicio.css`, la última hoja de `hub.js`).
  El 20 de noviembre de 2026 por la mañana el autor la vio anticuada (tres cajas de cristal con raya clara y desenfoque);
  por la tarde fueron tres cápsulas oscuras sueltas, y por la noche: «No me gusta la barra que has añadido de menú,
  comarcas y la pantalla que estamos jugando actualmente. Ese diseño hay que cambiarlo». Ahora es una cabecera de juego
  como la del menú: sin cajas ni cápsulas, el texto suelto sobre el mapa con una sombra de texto (`--hb-ts`) y, detrás, un
  velo fino que baja del borde de arriba en cinco tramos, del 50 % a nada (`.m3d::after`, hasta 64 px por debajo de la
  fila). De izquierda a derecha: el botón redondo y oscuro del menú en la esquina, como los de la cámara (donde en el menú
  está el de volver); tu retrato dentro del aro de la experiencia (`--xp` en `.yo-c`, `renderChip` de `hub.js`) con el
  nivel en una pastilla, y tu nombre en la letra de los títulos con el rango en rosa (todo es el mismo botón, `.yo-m` va
  primero con `order`); tras una raya tenue, Navarra descubierta (`mapaHTML` de `inicio.js`: rótulo rosa, las comarcas
  terminadas en la letra de los títulos, la barra de un tramo por comarca que se llena con sus sellos, `.tt-seg`, y los
  sellos aparte, `.tt-sel`; el círculo del mapa, `.tt-ic`, ya no se ve); y a la derecha la próxima parada (foto en tarjeta
  de 8 px, rótulo rosa, el pueblo en la letra de los títulos y JUGAR en pastilla con el degradado). En el móvil tumbado,
  sin nombre, sin rótulo de Navarra y sin sellos, con la foto cuadrada y el botón de jugar redondo; de pie, la misión baja
  encima de las comarcas y allí sí lleva su panel oscuro. La sombra de caja de `neon.css` va con `!important` y un
  selector de dos ids (`#lane #toast`): para quitarla, `#hub#hub.juego`. Los botones de la cámara, la ayuda y la ficha del
  jugador en la cabecera del menú siguen el mismo lenguaje.
- **El menú, sus secciones, Cómo jugar y la pausa con la pantalla de juego** (19 de noviembre de 2026, noche; el autor,
  con cuatro capturas del móvil: «tenemos que cambiar el diseño de estas páginas para ajustarlas al nuevo diseño e
  identidad»). Las cuatro siguen ahora la disposición de las pantallas de pelota (arriba, el botón redondo de volver, el
  antetítulo rosa y el título grande; en medio, lo que se elige; abajo, la ayuda a la izquierda y el botón a la derecha),
  con su fondo morado de dos focos (`--pt-fondo`):
  - el menú (`hub-panel`, `src/hub/pantalla-hub.css`): a pantalla entera, sin dejar ver el mapa; arriba, volver, «Menú»,
    la versión y tu ficha a la derecha; en medio, las secciones en el carrusel 3D de los campeonatos y «Elige tu pelotari»
    (`carrusel3d.js` con `banda`, `hub.js` `anilloMenu`; el autor, la misma noche: «El menú que sea carrusel, como has
    estado haciendo hasta ahora»): cada sección, una portada con su icono 3D grande sobre un brillo suave del color de su
    categoría y el nombre abajo, y «Estás aquí» en la que estás, por la que empieza el anillo. Se gira con el dedo, el
    ratón, la rueda, las flechas de los lados o ← →; tocar la de delante, «Entrar» o Intro la abre y tocar una de los lados
    la trae delante. Abajo, el nombre y la línea de lo que hay en la de delante (`MORE`), Cómo jugar, el mando del móvil y
    «Entrar». El anillo se hace al abrir el menú y se suelta al cerrarlo (`menu(false)` → `destroy`), porque escucha las
    teclas de toda la página: cerrado, las flechas y el Intro son del mapa. Las reglas de la rejilla de antes
    (`consola.css`, `hub.css`) también cogían estas portadas y sus flechas (posición, tamaño, animación con `transform` que
    pisaría el giro): `pantalla-hub.css` las tapa con `#hub.juego #hNav …`. Frontones lleva su propio icono (la pared,
    `walls`). Antes (la primera versión de esta noche) era una rejilla de losas; y antes, un recuadro a la izquierda con
    media altura vacía y las comarcas asomando por debajo;
  - las secciones (Torneos, Pueblos, Cimas, Perfil…): sin ventana encima del mapa, a pantalla entera; la barra de arriba
    lleva volver (al mapa) y el menú, redondos, a la izquierda; el antetítulo de la sección (el mismo que trae dentro,
    `cab-k`, que `go()` copia del `.kicker` de la sección) y su nombre en grande; y a la derecha la sección de antes y la
    de después. El título y el antetítulo de dentro ya no se repiten. El contenido se desplaza por debajo de la barra y se
    funde arriba (máscara de 12 px);
  - Cómo jugar (`src/hub/comojugar.js`): las tres formas a la izquierda como pestañas (la del aparato en el que estás,
    marcada y elegida al abrir) y, a la derecha, los pasos de la elegida, enteros (en el ordenador, uno debajo de otro y
    grandes; en el móvil tumbado, en fila); abajo, «Elige una de las tres formas» y «Cerrar» o «Empezar». Antes eran tres
    columnas con todos los pasos que en el móvil tumbado quedaban cortados y tapados por «Cerrar», que además llevaba un
    anillo blanco de foco (ahora el foco va a la pantalla);
  - la pausa del pueblo (`ui.js` `openMenu`, `src/ui/pausa-pueblo.css`, `#pausa-pueblo`): a pantalla entera, con el pueblo
    quieto y velado detrás y su marcador oculto; arriba, volver, el sitio con la hora y «Pausa»; en medio, «Partida»
    (cuaderno, plaza, salir, el móvil de mando, borrar la partida en rojo suave y con confirmación) y «Ajustes» (la música
    como interruptor, volumen, calidad y paso del tiempo), en filas con su nombre y, en el ordenador, una línea de para qué
    es; abajo, las teclas o los gestos y «Seguir jugando». Antes «Borrar partida del valle» quedaba cortado en el móvil.
    La pausa de los partidos (`src/ui/pausa.js`, `pausa.css`) no cambia.
  Comprobado a 1280×720, 844×390 y 390×844, y las demás secciones (Pueblos, Cimas, Escudos, Frontones y Perfil) con la
  barra nueva.
- **Repaso del partido tras la grabación del autor** (18 de noviembre de 2026, noche; `pelota/court.js`, `pelota/rules.js`,
  `pelota/game.js`, `game/fronton.js`): los números de la pared izquierda, a medida real (30 cm), no se leían en el
  móvil: quedan en 58 cm con el centro a 2,55 m. Las rayas del suelo, del sombreador `rayasNitidas`, bajaban a poco más
  de un píxel a lo lejos y vibraban al moverse la cámara: mínimo de dos píxeles y medio con el borde fundido. El público
  (`ALTO_AFICION`, 1,24) medía como el pelotari en metros, pero la grada queda pegada a la cámara y parecía el doble.
  Y la dificultad: el ritmo de la pelota, que había subido un 15 %, se queda en un 7 %; un toque sin cargar sale como
  un golpe a un tercio (antes botaba en el cuadro 2 y el rival remataba) y el castigo por recibir un pelotazo se reduce
  para el jugador según la ayuda del nivel. En el carrusel de campeonatos, portadas de 1,24 de alto por ancho (antes
  1,46), nombres más grandes, el nombre del campeonato en la barra de abajo y el anillo de borde a borde de la pantalla.
  **Las portadas, nítidas en pantalla grande** (18 de noviembre, noche; el autor, con el carrusel en un ordenador: «las
  imágenes no tienen calidad. Esto no puede ocurrir» y «no me vale que apañes las imágenes. Si hace falta, genéralas de
  nuevo»). La causa, medida: la portada de delante acerca la imagen hasta 3,6 veces para encuadrar al pelotari, así que
  a 1920 × 1080 hacían falta 2.020 px de imagen y solo había 896: se estiraba 2,25 veces. Las quince se han regenerado
  en Higgsfield a 2048 px con la aprobada como referencia (misma cámara, mismo frontón, mismo pelotari en el mismo
  sitio: comprobado una a una, con menos de medio píxel de desplazamiento sobre 896, por eso valen las mismas medidas
  de `FIGURA`) y de esa imagen salen tres tamaños: `fondos/*.webp` (896 px, la que se carga al abrir, 1,9 MB entre
  todas), `fondos/media/` (1280 px) y `fondos/hd/` (2048 px, 0,5-0,9 MB cada una). El carrusel (`carrusel3d.js`, «LA
  IMAGEN NÍTIDA») mide lo ancha que se ve la portada de delante, con la escala de la pantalla y la densidad de
  píxeles, y cuando el anillo se para pide la menor que lo cubre para la de delante y, en el ordenador, para sus dos
  vecinas; ya descodificada, la pinta encima de la ligera (`--nit` sobre `--foto`), sin parpadeo, y la suelta al
  alejarse. En el móvil, solo la de delante y sin pasar de 1280 px: quince imágenes de 2048 px descodificadas serían
  250 MB. Girando deprisa no se pide ninguna. Regla: una portada que se acerca con `background-size` necesita una
  imagen de su ancho en pantalla por lo que se acerca; ampliar con un filtro una imagen pequeña no es una solución.
  Regla para lo que venga: abajo, el hueco hasta la barra de inicio del iPhone no baja de 8 px, y
  nada interactivo mide menos de 40 px. Se comprueba con la muesca y la barra de inicio simuladas
  (`Emulation.setSafeAreaInsetsOverride`, 47 px a los lados y 21 px abajo con el móvil tumbado), además de 1280×720 y de pie.
- **Movimientos de pelota del pelotari** (`src/actors/pelotaMoves.js`; noviembre de 2026): Meshy solo traía correr,
  andar, un tajo y un puño en alto, y los recortes de ahí no parecían pelota. Ahora se hacen al cargar el modelo, sobre
  su esqueleto de Mixamo, a partir de poses clave: reposo, preparado, derecha e izquierda, sotamano de las dos manos,
  golpe de aire de las dos manos, saque, pasos laterales a los dos lados, celebrar, lamentar, saludar y hablar. Cada pose
  dice el giro de la cadera, la espalda, el cuello y la cabeza, dónde va cada mano (contada en el pecho en reposo, así el
  giro del cuerpo la lleva), hacia dónde el codo, el giro del antebrazo y dónde cada tobillo. Brazos y piernas se colocan
  con cinemática inversa de dos huesos: los pies no resbalan ni se meten en el suelo. Entre poses, curva suave, horneada
  a 30 por segundo; tarda unos 100 ms y no pesa nada en la descarga. Los de la izquierda salen en espejo. En el partido
  (`match.js`, `golpeDe` y `lateral`): el golpe se elige por la altura y el lado de la pelota al darle; mientras llega,
  `armSwing` mezcla la postura de armado de ese golpe, entera si está parado y de cintura para arriba si corre; el clip
  del golpe empieza en ese armado. De lado y a menos de 3 m/s, pasos laterales mirando al frontis en vez de andar de
  lado o darse la vuelta. El tanto perdido, las manos a la cabeza. Para verlos: el guion `movs-ver.mjs` pinta cada uno en
  sus poses clave, de frente y de lado.
  Cada golpe, con la mano de su lado (la pelota a su derecha, la derecha; a su izquierda, la izquierda), también el
  gancho, que antes iba siempre con la izquierda. La volea (antes del bote y de la altura del hombro para arriba) y el
  gancho, con el brazo recto hacia arriba y algo abierto, la mano por encima de la cabeza; la dejada (`DejadaFull`,
  `Dejada`, `DejadaL`), un toque suave con la mano a la cintura (el autor, noviembre de 2026).
  Con las jugadas básicas que pasó el autor, tres más con su movimiento (`pelotaMoves.js`; se eligen en `swingAnim` de
  `match.js`): la dejada de abajo (`DejadaBaja`, la dejada con la pelota por debajo de 0,45 m: arma como una sotamano y solo
  la acaricia hacia arriba), el bote pronto (`BotePronto`, la pelota a menos de 0,4 m y antes de 0,1 s de botar, `botaT`:
  muy agachado y corto) y el besagain (`Besagain`, sin volea, la pelota por encima de 1,35 m y a más de 22 m del frontis:
  el brazo por encima del hombro y el cuerpo echado atrás), cada uno también de izquierda. Tienen la cabeza grande y
  el brazo corto: la muñeca llega a lo alto del pelo, no más, y con la mano hacia delante se tapaban la cara. Con la
  cámara (`camaraCuerpo.js`), la mano del golpe es la que lo da, por el lado de su hombro, no por dónde empieza el gesto;
  la dejada que haces tú, a la cintura (`match.js`, `onGolpe`), y en primera persona (`primeraPersona.js`) el brazo sube
  o baja igual.
- **El GLB del pelotari con sus movimientos** (`tools/pelotari-glb.mjs`): exporta el modelo de Meshy con andar y correr y
  todos los de pelota, con nombre en castellano; con `base`, sin ningún movimiento, para animarlo en otro programa. Sin
  comprimir y con la textura en PNG: unos 6,5 MB. Para entregarlo; el juego sigue usando el comprimido.
- **Texturas pintadas** (`src/world/texturasPintadas.js`, `src/assets/texturas/*.webp`, `tools/textura-enlosable.cjs`,
  `tools/textura-cruz.cjs`; noviembre de 2026): el adoquín, la hierba, la tierra, la piedra, el revoco, la teja, la
  pizarra y la madera de los pueblos están pintados en Higgsfield (Nano Banana 2, 1024 × 1024, 1,5 créditos cada una) con
  el estilo de las láminas, en lugar del dibujo hecho con código de `textures.js`. Al acabar `buildTextures` se cambia
  solo la imagen de cada `CanvasTexture`, al mismo tamaño (512, o 256 en calidad baja), así que repeticiones, materiales y
  memoria siguen igual; la pintada se lleva antes al color medio de la de siempre, canal a canal, y por eso los revocos de
  colores, la piedra y la madera oscuras y los tonos de cada comarca no cambian. El relieve sale del brillo de la pintada
  (`normalFromHeight`). `runtime.js` las espera como mucho 4 s; si no llegan, quedan las de código. Para que se repitan
  sin costura: `textura-enlosable.cjs` busca el recorte cuyo borde derecho empalma con el izquierdo y el de abajo con el de
  arriba (en las de hileras, un número entero de hileras) y funde lo que falte en una franja junto a los bordes (con
  `ejes=y` solo arriba y abajo, para que las juntas de las tablas no salgan dobles). Si aún se nota, `textura-cruz.cjs`
  la desplaza media textura para que la costura quede en una cruz en el centro, Nano Banana repinta solo esa cruz con su
  máscara, y `--junta` coge de lo repintado solo la cruz, con el color igualado, porque el modelo a veces retoca también
  lo de fuera. Para otra: se pinta igual, se pasa por las dos herramientas y se apunta en `LISTA`.
- **Mapa más limpio y menú que se reconoce** (noviembre de 2026):
  - *Menú*: el botón de tu cara lleva al lado las tres rayas con «Menú» (`.yo-m`, `MENU_M` en `hub.js`); en las secciones
    es solo eso, en su cuadro. El panel del menú, opaco (con transparencia se leían a través los nombres del mapa), y lo
    que sigue más abajo de sus casillas se funde en el borde.
  - *Comarcas como territorios*: cada una teñida con su color, también sin descubrir (`relieveM`: antes, todas las
    cerradas iban del mismo malva y el mapa se veía sucio). Las juntas, más anchas y oscuras, con la luz de cada comarca
    hacia dentro, como un canto biselado, y el contorno de Navarra más grueso (`contornoM`, `juntaM`, `luz`); el canto de
    arriba de las losas brilla más (`bordeM`). Fuera de Navarra, más apagado.
  - *Menos ruido*: los nombres de las comarcas, cortos (sin «Comarca de»), sin candado y más pequeños en el móvil, así
    caben más; la cañada de la trashumancia, en la vista de toda Navarra y con una de sus comarcas elegida, con la raya algo más gruesa y de trazos más largos (un tiempo salió solo con una de sus comarcas elegida y el autor la echaba de menos: noviembre de 2026). En el móvil tumbado, las comarcas de
    abajo en tiras bajas con la foto a un lado: Navarra pasa de un tercio a más de la mitad del alto.
  - *Definición*: el mapa se dibuja hasta con el doble de píxeles (`prMax` 2; antes 1,5), y baja solo si no da.
- **Pueblos en pastel y con más vida** (noviembre de 2026):
  - *Tono pastel* (`CustomToneMapping` en `sky.js`, puesto solo en el renderizador del juego, `runtime.js`): el mismo tono
    de cine, con el 0,8 de la saturación de los menús y las sombras un poco levantadas. El mapa, los menús y los retratos
    siguen con sus colores. De día el sol es algo más suave y el cielo da algo más de luz (`KEYS`), y las contraventanas
    van en tonos algo apagados (`SHUTTERS` en `houses.js`, `ESTILO` en `townReal.js`).
  - *El aire de cada comarca y la luz sin saltos* (`world/sky.js`, noviembre de 2026, tanda 1): sobre la paleta de la
    hora, cada familia de comarcas (`familiaAire`: atlántica, pirenaica, media y ribera) tiñe su cielo, su sol y su
    luz de relleno, y tiene sus nubes, su bruma y su hora dorada (`AIRE`: el color al que tira la luz con el sol bajo,
    cuánto y durante cuánto). Con el sol rasante sube la luz del cielo, malva, y la luz con dirección no baja de unos
    15 grados: antes el pueblo se quedaba casi negro bajo un cielo rosa. En el relevo del sol a la luna la luz con
    dirección se apaga del todo y vuelve (`crep`): antes saltaba de golpe de un lado al otro. `sky.dorada` y
    `sky.crep` los leen el postprocesado y quien quiera saber en qué momento de la tarde se está.
  - *Pintura y contorno de los personajes* (`engine/charLight.js`, tanda 1): en el pueblo, la luz del sol sobre
    personajes y animales cae en cuatro tonos con el paso suave, como pintada a pincel, y el perfil del lado del sol se
    enciende con su color (`pintura(sh)`, que se añade al final del sombreador de cada material con luces; los de
    Meshy la reciben al pedir su relleno, `fillMaterial`). Fuera del pueblo vale 0 (`applyCharFill(null)`): menús,
    retratos y escenas propias se ven como siempre. `contorno(raíz)` pone al jugador una línea de dibujo: una segunda
    piel vuelta del revés, hija de cada malla y con su esqueleto; solo en calidad media y alta (dibuja al jugador dos
    veces: unos 31 mil triángulos y una llamada más). El grosor se mide comparando lo que mide el personaje en el
    mundo con lo que mide su malla: con esqueleto, la escala de la malla no lo dice.
  - *Suelo mojado y charcos* (`world/weather.js MOJADO`, `world/terrain.js`, tanda 1): con la lluvia, calles y caminos
    se oscurecen y cogen brillo, y en lo llano se forman charcos que reflejan el cielo, más cuanto más rasante se
    mira. Es una lectura de textura más en el sombreador del terreno, solo mientras está mojado; no añade geometría.
    Sube mientras llueve y tarda en secarse al escampar. En la hierba apenas se encharca. Los charcos son pocos y
    pequeños (solo lo más alto del ruido, de 0,70 a 0,78): con el umbral de 0,5 cubrían casi media plaza y al autor le
    parecían demasiados (13 de noviembre de 2026).
  - *Un solo viento* (`world/viento.js`, tanda 1): `VIENTO` guarda la fuerza de ahora (`uWind`), hacia dónde sopla
    (`uDir`, el lado al que van las nubes) y el tiempo; `sopla()` la calcula cada fotograma en `runtime.js` con dos
    ondas lentas que no casan (rachas cada medio minuto más o menos), el aire de la comarca (en la Ribera, más) y el
    tiempo (con lluvia arrecia). De él cuelgan la hierba y los árboles (`nature.js`, cuyo `windUniforms.uWind` es ya
    el mismo objeto), el humo de las chimeneas (`fx.js Smoke`, que se tumba hacia donde sopla) y los banderines de
    fiesta (`fiestas.js`: la punta de cada banderita, marcada con `aCuelga`, aletea en el sombreador). Lo que se
    mueva con el viento de aquí en adelante, que lea `VIENTO`.
  - *Humo de las chimeneas según el tiempo* (`fx.js`, `Smoke` y `HUMO`; `sitioChimenea` y `chimney` en
    `world/houses.js`; 13 de noviembre de 2026): el autor pidió que, nevando, saliera humo de las chimeneas, porque en
    los pueblos, con frío, se enciende el fuego. Cada casa guarda la boca de su chimenea (`o.chimenea`, y `chim` en
    `TOWN.houses` y `VILLAGE.houses`) y el humo sale de ahí. Nevando humean casi ocho de cada diez casas, con un humo
    más denso, oscuro para que se vea contra el cielo gris, más alto y más largo; con lluvia, una de cada tres; con buen
    tiempo, alguna cocina. Solo humea lo que tiene chimenea: las casas sencillas y los edificios de Pamplona, que no la
    guardan, no. Hasta 90 chimeneas, 45 en calidad baja, en un solo sistema de puntos y una sola llamada. Cada
    una va a su ritmo, ondea un poco, se tumba con `VIENTO` y se pierde en la niebla (los fragmentos de niebla de three
    en el sombreador). Antes humeaban 14 casas como mucho, todas a la vez, flojo y desde el centro del tejado, hiciera
    el tiempo que hiciera. Y las chimeneas iban a media altura del faldón con una caña de 1,9 m, así que casi siempre
    quedaban enterradas en el tejado: ahora van cerca de la cumbrera, algo caídas hacia un faldón, y asoman 0,6 m sobre
    la cumbrera y 1,5 m sobre las tejas. Con los mismos dos números al azar de antes, para no mover nada más del
    pueblo. Para verlo: `humo-vista.mjs` y `humo-chimeneas.mjs` en la carpeta de trabajo de la sesión.
  - *Agua pintada* (`world/water.js`, tanda 1): el reflejo del cielo va en degradado (el horizonte si se mira rasante,
    el azul del cenit si el reflejo sube: `uZen`), la profundidad se lee por color en tres pasos (hondo, verde claro
    y casi turquesa donde se hace pie) y a la orilla llegan líneas finas de espuma, una detrás de otra. Todo en el
    sombreador que ya había, sin lecturas de textura ni geometría nuevas.
  - *Postprocesado en un único pase* (`engine/post.js`, tanda 1; solo calidad media y alta): el pueblo se dibuja en
    una imagen aparte que guarda ya el color final (mismo tono de cine y mismos colores que en pantalla: three.js solo
    lo hace con las imágenes marcadas `isXRRenderTarget`, y su formato se fija a mano, `RGBA8`, para que el volcado
    del suavizado no falle) y un rectángulo la lleva a la pantalla añadiendo de una vez: la bruma del valle (con la
    profundidad de cada píxel se sabe su altura: densa abajo y más al amanecer, al caer la tarde y con lluvia), las
    sombras de nubes sobre suelo y casas con el mismo viento que las del cielo, el resplandor de lo que da luz (de
    noche se nota, de día casi nada), el color de la hora y un viñeteado suave. El suavizado de bordes sale de las
    muestras de la propia imagen (2 en media, 4 en alta). Cuesta una llamada de dibujo más y un rectángulo. Se apaga
    en Ajustes («Efectos de imagen», `herrizherri-post`), con `?post=0`, y solo: si el juego va justo, es lo primero
    que quita `runtime.lighten()`, antes de aligerar el pueblo. Las escenas propias (fútbol, encierro, menús) no pasan
    por él. Los textos nuevos en euskera van en `data/eu-aventura.js`, que `i18n.js` carga con los demás.
  - *Música del paseo en frases* (`audio/frases.js`, tanda 1): explorando un pueblo (ambiente `explore`) ya no suena
    una canción de continuo. `Sound.musicTick` deja de pedir la canción y `Frases.tick` dice, cada 24 a 54 segundos,
    una frase de seis a diez segundos con los timbres de la comarca (txistu y txalaparta en la atlántica, txistu y
    violín en el Pirineo, acordeón y guitarra en la Zona Media, guitarra y acordeón en la Ribera); entre medias queda
    el ambiente. De noche, más espaciada y más bajo. Las canciones grabadas (`MUSICA`) vuelven solas con lo que pasa:
    persecución, leyenda, minijuego, partido, fiesta. Los instrumentos son sintetizados, a la espera de grabaciones;
    las melodías son propias. `runtime.js` le dice a `Sound` si se está de paseo (`paseo`), la familia de la comarca
    (`aire`) y cuánta noche hay.
    Desde el 11 de noviembre de 2026, de paseo suena la canción grabada que pasó el autor, «Viking Village Dance» de
    Andy Slatter (`musica-pueblo`, `MUSICA.paseo`): el autor no quiere música hecha por nosotros. Las frases quedan solo
    si no se pueden poner las grabadas (un contexto sin `<audio>`).
- **Exploración y movimiento** (noviembre de 2026, tanda 1, fase 2):
  - *Moverse cuesta* (`actors/player.js`): el jugador tiene un modo (`pie`, `trepa`, `resbala`, `planea`, `nada`) y una
    resistencia (`aguante`, de 0 a `aguanteMax`; 1 es un anillo entero). Empujando contra una cuesta que andando no se
    sube (más de 51 grados) se agarra y trepa despacio; en el aire, el botón de saltar abre y cierra la capa y se baja
    a 1,7 m/s; el agua honda ya no es un muro: se nada. Todo gasta resistencia (`AGUANTE`: 9 s trepando, 13 planeando,
    15 nadando), más con lluvia o frío (`gasto`), y vuelve sola con los pies en el suelo. Sin resistencia: resbala
    cuesta abajo, la capa se cierra o hay que volver a la orilla (`onRescate`). Una caída de más de cinco metros avisa
    (`onCaida`). Bajo un puente no se pasa nadando. Va con los mandos de siempre: la palanca o las flechas y el botón
    de saltar, así que sirve igual el teclado, el táctil, el mando y el móvil de mando. `puedeAventura` lo apaga
    donde no toca.
  - *La aventura de cada pueblo* (`game/townAventura.js`, métodos de `TownGame`): se monta durante la carga, antes de
    la segunda compilación (`montaAventura`, desde `main.js`; con `?aventura=0`, no). Antes se montaba en el primer
    fotograma de juego y cada pieza nueva paraba la imagen mientras se compilaba, ya con el pueblo a la vista. Pone una atalaya en el alto más alto que se alcanza cerca de la
    plaza, con una banderola a trece metros; cinco kutxas (cofres) escondidas, cada una en el sitio más lejano de todo
    lo que ya hay, que solo se ven a menos de 16 m; y una montura junto a la entrada (`game/montura.js`: caballo de
    Burguete en la montaña, de 2,3 m con la cabeza alta y de tiro como los de verdad, la especie `burguete` de `actors/animalGlb.js`, el modelo de base tal cual, con sus colores de siempre (alazán con las crines claras), solo más grande, y los ojos más pequeños (`ojo` 0,75): deformarlo, pintarle las patas de negro y la crin oscura no le gustó al autor y se modelará aparte; las opciones de forma siguen en `caricatura` (`torso`, `cuello`, `vientre`, `grupa`, `patas`, `abre`, `melena`, `copete`, `cola`, `calzas`, `medias`) y `brillo`, sin usar; la pieza de cada vértice, crin y cola o cascos, va en el atributo `pieza` solo mientras se cuece); burro
    grande en la Zona Media, la Ribera y Pamplona; es un «vehículo» como el tractor. La pottoka, que es un poni, se
    queda suelta en los prados: a un jinete le quedaba pequeña. La primera vez que se monta, cuenta qué animal es. En la nieve deja huellas de herradura, una por casco y en el sitio de cada pata, `PATAS`, con `hoofprint` de `world/weather.js`, que se tapan como las de bota; y avisa a los cascos del suelo que pisa. La cámara va a 8,4 m del caballo; con 9,6 chocaba más con las casas al girar). La atalaya enseña en
    el mapa las kutxas sin abrir y deja llevar una marca propia a una de ellas. Las mejoras se ganan: cada dos
    atalayas, un quinto más de anillo (hasta dos anillos); cada ocho kutxas, un corazón más (hasta seis). Los
    corazones (tres) bajan con una caída fuerte y vuelven al sentarse en un banco; sin ninguno, se vuelve a la plaza.
    Las pistas salen una sola vez, cuando hacen falta. Se guarda en `perfil.aventura` (`atalayas`, `kutxas`, `pistas`,
    `marcas`), un campo nuevo del perfil de siempre.
  - *Lo que se ve* (`ui/aventuraHud.js`, `game/planeo.js`): el anillo sale junto al personaje solo mientras se gasta o
    se recupera (se vacía, late a trazos con poca y lleva una raya cuando se agota; con una mejora, un segundo arco
    por fuera) y los corazones, arriba, solo cuando falta alguno o acaban de cambiar (lleno, macizo; vacío, su
    contorno a trazos). Ninguno ocupa sitio cuando no se ve (`hidden`, no una capa transparente sobre el visor), y los
    corazones no tapan nada de lo que ya había: van arriba en el centro solo si caben entre el panel de las misiones
    y los botones; en vertical o en pantallas estrechas bajan debajo del panel y lo siguen cuando se despliega
    (`coloca`). La capa es un kapusai de pastor, de diseño propio, que ondea con el viento del pueblo.
  - *Flores pintadas* (`flores.js`, `flores.webp`): las de jardineras, balcones y macetas de las puertas, y las de las
    fachadas sencillas (`Lienzo.flores`), son tarjetas con geranios, petunias, tagetes y gitanillas pintados (GPT Image
    en Higgsfield, con transparencia), en un atlas de 3 × 2; `celda(color)` elige la casilla por el color de siempre.
    Antes eran bolas de veinte caras. Material `flor` (`builder.js`), sin sombra.
  - *Follaje pintado* (`follaje.webp`): cada zona del atlas de follaje (los dos racimos de hojas, la rama de abeto y la masa
    de las copas) se pinta encima de la suya y se lleva a su color medio, porque el verde de cada árbol lo pone el color de
    sus vértices. El atlas pasa a 1024 en calidad alta.
  - *Flores silvestres* (`silvestres.webp`, `FlowerField` en `nature.js`): dos tarjetas cruzadas por mata con margaritas,
    botones de oro, amapolas, lavanda y acianos pintados; antes eran unos 70 triángulos por mata, ahora 4.
  - *Roca de los montes* (`roca.webp`): la de las laderas empinadas y los peñascos, en `LISTA` como las demás.
  - *Mobiliario* (`village.js`): banco de forja con listones, farol fernandino con sus aristas, aros y remate, columna de
    fundición, voluta en los faroles de pared y papeleras de forja. Farolas cada 18 m (si no caben en un lado, en el otro)
    y bancos con papelera cada 60 m en las calles anchas (`townBuilder.js`); de noche, los charcos de luz algo mayores.
  - *Pajarillos* (`pajarillos.js`): gorriones que picotean en la plaza, junto a los bancos y a las puertas y salen volando
    a una farola, a un balcón o al borde de la fuente cuando pasas (vuelven cuando te vas), palomas en la plaza y
    vencejos dando vueltas sobre los tejados. Una malla repetida por especie, con el aleteo y las alas plegadas en el
    sombreador; de noche no se ven.
    Y gallinas (noviembre de 2026): tres delante de cada una de dos o tres casas de las afueras, lejos de la plaza (dos
    rojizas, como la «gorria», y una blanca), con cresta, barbilla, patas y la cola en abanico de pie. Andan despacio de
    un sitio a otro cabeceando y se paran a picotear; si te acercas se apartan corriendo con un aleteo, sin salir volando.
    Dos mallas repetidas más.
    Y las bandadas que se cruzan andando (noviembre de 2026): 6-8 grupos de 8-11 gorriones o jilgueros (la cara roja y la
    banda amarilla de las alas, que es lo que se ve al volar) comen en la calle o junto a ella, por delante del jugador, a
    18-34 m según el rumbo de sus últimos metros, en seco y lejos de las otras. Al llegar a 6,5 m (9 si corre) sale toda la
    bandada: cada pájaro un poco después del anterior, hacia arriba con fuerza y luego en línea, alejándose del jugador y
    ondulando, por encima de los tejados, con su aleteo (`aleteo` en `audio.js`: golpes de ala cortos y sordos casi a la
    vez, que se apagan, y algún pío). La que se ha ido o queda atrás se posa otra vez más adelante. Andando por una calle de
    Lesaka de 230 m salen unas cuantas; antes solo estaban las de la plaza y casi nunca se veían salir. Dos mallas más.
  - *Peces* (`peces.js`, noviembre de 2026): bancos que nadan bajo el agua cerca del jugador, con los peces de cada
    comarca según las normas de pesca de Navarra: trucha y salmón atlántico en la cuenca del Bidasoa, trucha y chipa en
    el Pirineo, truchas, barbos y madrillas en el Prepirineo y la zona media, barbo de Graells y madrilla en la Ribera.
    Cada pez mira contra la corriente (el tramo de río más cercano, por donde baja su nivel) y se mantiene meneando la
    cola; a ratos uno da un acelerón y vuelve. Si el jugador llega a la orilla o pasa por encima por un puente, el banco
    sale río abajo y se junta más allá. Un banco que queda lejos se va a otro trozo de río cerca, con otra especie del
    río: siempre hay peces donde se mira, con 4-6 bancos en total. Una malla repetida por especie con su librea pintada
    (lomo, flanco, vientre, motas con halo en la trucha, línea lateral) y el meneo en el sombreador. Se dibujan después
    del agua (que no escribe profundidad y, por encima, los tapaba casi del todo con su color), algo transparentes y
    teñidos del verde del río; un tercio más grandes que los de verdad y con el lomo más ancho, porque desde la orilla los
    de su tamaño eran rayas. De noche no se ven. Al acercarse a la orilla y ver huir un banco, su pez se apunta en la fauna del
    cuaderno, una vez por especie (`onVisto`; `townGame.js`): los cinco tienen ficha.
  - *Vecinos en los balcones* (`spawnBalcones`): hasta 8, también en los balcones de las fachadas sencillas, que ahora se
    apuntan en `TOWN.balcones`.
  - *Ropa tendida* (`colada.js`, noviembre de 2026): en uno de cada tres balcones de `TOWN.balcones` (uno de cada cuatro en
    calidad baja), una cuerda con su comba medio metro por fuera de la barandilla, para no pisar a los vecinos que se
    asoman, y tres o cuatro prendas de colores de casa colgadas de arriba que se mecen con el viento (más cuanto más
    abajo; en el sombreador). Dos mallas: las cuerdas, en una sola geometría, y las prendas, repetidas; en Lumbier, 66.
- **Primero la comarca, luego el pueblo** (`quien` en `mapa3d.js`, `PUEBLO_D`; noviembre de 2026): al tocar el mapa se
  elegía el pueblo cuya chincheta quedara más cerca del dedo, y con toda Navarra a la vista casi cualquier toque caía cerca
  de alguno, así que se iba directo a un pueblo. Ahora, sin comarca elegida y con la cámara lejos, tocar lleva a la
  comarca; sus pueblos se eligen ya con ella elegida, o con la cámara cerca, donde salen sus nombres. Un pueblo de otra
  comarca lleva primero a la suya.
- **De una comarca a otra sin alejarse** (`navega` y `cand` en `mapa3d.js`, `vecina` y `.cb-fl` en `inicio.js`; noviembre
  de 2026): con una comarca elegida, moverse por el mapa a mano (arrastrar, dos dedos, el panel táctil o las flechas del
  teclado) pasa a la comarca que queda en el centro cuando lleva 0,2 s en ella, sin volar ni cambiar la distancia: se
  enciende, sale su rótulo y se apaga la de antes. Fuera de Navarra se queda la que había, y no cambia con un pueblo
  elegido ni con una colección. Solo después de mover a mano, porque el centro de una comarca con entrantes puede caer en
  la vecina. Las de alrededor muestran su nombre apagado (`.m3-cl.fondo`), los últimos en sitio, para ver hacia dónde ir.
  En el rótulo de arriba, a los lados del nombre, las flechas a la anterior y a la siguiente en el orden de la fila de
  abajo, dando la vuelta; esas sí vuelan y encajan la comarca. En el móvil de pie, sin el sello, para que quepa el nombre.
- **El inicio, repasado** (noviembre de 2026): las tarjetas de abajo, algo más grandes y del mismo cristal que los botones
  de arriba, con las esquinas redondas: la foto y, debajo (en el móvil tumbado, al lado), el nombre y los sellos de la
  comarca o el icono de cada misión del pueblo, las hechas encendidas con su color (`.m3-ms`); sin el marco de degradado
  con las esquinas cortadas ni la bandeja gris detrás de los pueblos. El botón del menú, con tres rayas finas de trazo y
  «Menú» debajo (`MENU_M` en `hub.js`), en lugar del icono dibujado de barras doradas. Las juntas entre comarcas y el
  contorno de Navarra, finos otra vez (`contornoM`, `juntaM`, `luz` en `mapa3d.js`). En la entrada, la imagen de la
  península se funde con el fondo por sus bordes, mucho por los lados lejanos y poco por el norte, pegado a Navarra, con
  las esquinas redondas (`funde` en `suelo`); antes, al abrirse las nubes, se veía su rectángulo flotando, como un
  cuadrado. Tampoco hay ya esquinas de visor en la entrada.
- **La carga, vigilada** (`play` en `main.js`, noviembre de 2026): cada quinto del progreso de la carga de un pueblo o de un
  campeonato queda en el informe («carga 40 % · …»); si en 40 s no avanza nada (sin contar el rato con la app de fondo o
  el móvil en vertical), se apunta «carga atascada» y se vuelve al mapa del inicio en lugar de quedarse en «cargando».
  Pasó al recargar tras perder la imagen en el iPhone: el juego entraba directo al partido y no acababa de cargar.
- **El mapa con otro color, más relieve y nieve; los pueblos, en medallones** (noviembre de 2026): la paleta de alturas,
  menos verde (salvia grisácea en lo bajo, oliva en las sierras, pardo y gris en la roca, blanco arriba; `PALETA`); el
  relieve fino de cada comarca, que traía los verdes de antes pintados, aporta solo sus luces y sus sombras; las luces,
  más suaves y sin el tono cálido que amarilleaba las laderas al sol, y las sombras, con más contraste; el bosque, oliva
  apagado. El relieve, más alto (`EXA` de 0,0026 a 0,0033). Nieve en las cumbres desde unos 1.250 a 1.500 m, con el borde
  roto y menos en lo muy pendiente: en Navarra, solo el Pirineo. Los pueblos, en un medallón con su foto (la tira
  `fotosT`, casillas de 96 px de las portadas pequeñas) dentro de un aro fino de su estado: blanco, rosa con lo hecho en
  un arco, dorado con el check; con una comarca elegida, más grandes (`medG`); en toda Navarra, un punto limpio. El palito,
  fino y claro. Antes, disco de borde oscuro con un punto morado sobre un palito oscuro.
- **Los pueblos en el mapa, fichas con foto** (`.m3-tl` en `inicio.css`, `T` y `etiqueta` en `mapa3d.js`; noviembre de
  2026): fuera las chinchetas en 3D, su palito y su punto en el suelo, que no gustaban. Cada pueblo es una ficha pequeña
  encima del mapa, en HTML para que se vea nítida: su foto en redondo con el aro de su estado (blanco por descubrir, rosa
  con lo hecho en blanco, dorado con el check si está sellado) y su nombre, con un pico abajo que señala su sitio. En toda
  Navarra no sale ninguna, salvo la de tu pueblo; con una comarca elegida, las de sus pueblos. Si encima no cabe, va
  debajo con el pico arriba; si tampoco, solo la foto; un pueblo de la comarca elegida no se esconde nunca. El elegido, en
  blanco. Se toca en toda la ficha, y el punto que se toca y donde se ancla la ficha del pueblo es su sitio en el suelo.
  Las piezas en 3D siguen creadas pero apagadas.
- **Relieve fino de la comarca elegida** (`src/assets/relieve/fino.webp`, `tools/relieve/fino.mjs`, `hazFino` y `finos` en
  `mapa3d.js`; noviembre de 2026): el relieve del mapa es una altura cada 620 m, y las sierras salían como bultos lisos;
  el sombreado fino ponía el dibujo, pero no la forma. Ahora, una imagen gris de toda Navarra (80 KB, EU-DEM a 56 m,
  media de nueve lecturas cada 145 m) guarda cuánto se aparta la altura de verdad de la gruesa. Al elegir una comarca,
  con la cámara quieta y en tres pasos cortos, su losa se rehace con una malla unas cuatro veces más densa (de 43.000 a
  65.000 triángulos) y cada punto sube o baja lo suyo, algo exagerado (×1,35), a cero junto a su borde para que case con
  sus paredes y sus vecinas. Sus ríos, sus árboles, sus medallones, los nombres de sus montes y la cámara siguen a ese
  relieve; entra y sale suave (`fk`) y se va con la maqueta de un pueblo. Se guardan las mallas de las tres últimas
  comarcas. Con ella, un bosque denso donde hay bosque (de 7 a 14 árboles por casilla de la máscara, según el aparato),
  que crece con el relieve. La vista de una comarca, algo más de lado (`PITCH_C` 0,82, antes 0,95) y con algo más de
  relieve a esa distancia (`exaDe`), para que se vean las siluetas de los montes; de cerca, los medallones ya no se
  agrandan. La comarca elegida, casi sin su color encima. Para verlo: `mapav.mjs` y `cerca.mjs`.
- **Calidad del mapa al mover la cámara** (`BAJA`, `prMax`, `prSuelo`, `prQuieto` y `detalles` en `mapa3d.js`; 13 de
  noviembre de 2026): el autor veía el mapa muy pobre en cuanto el dron se movía. Había tres causas. La resolución bajaba
  un cuarto cada vez que un fotograma tardaba y no volvía a subir nunca: en el iPhone podía quedarse en 1, un tercio de
  sus píxeles. Ahora el suelo es 1,5 en una pantalla de 2 o 3 (0,75 solo en un ordenador con gráfica floja), y con la
  cámara 1,5 s quieta vuelve a la de partida. El relieve fino solo se pedía con la cámara quieta: el de la comarca elegida
  se pide también moviéndose, y el de las vecinas, quieta. Y el móvil usaba la versión pobre de todo (losas, ríos,
  bosque, maquetas a 512): eso queda solo para `?ligero` y el ordenador flojo (`BAJA`); el móvil, como el ordenador
  (medido con el perfil del iPhone: 165.000 triángulos y 112 llamadas). Las texturas de las comarcas, con filtro
  anisótropo hasta 8, para que no se emborronen de lado.
- **La comarca elegida, una isla flotante** (`mapa3dIsla.js`, `hazIsla`, `texturasIsla`, `materialRoca` y `cieloShader`;
  `islaDe`, `PITCH_ISLA`, `PITCH_ALTA`, `hyIsla`, `cieloFondo` y `CIELO` en `mapa3d.js`; 13 de noviembre de 2026): el autor
  quería que al elegir una comarca subiera mucho más y se separase del mapa, como las islas flotantes de sus imágenes de
  referencia, y luego, con realismo: «hiperrealismo». Sube casi lo que mide de radio, con un muelle que se pasa un poco y
  vuelve, y se mece despacio. Es una pieza rígida: sale entera del hueco, que es su molde.
  Cuánta tierra se arranca se calcula por lógica (lo pidió el autor): las montañas tienen raíz, la corteza es más gruesa
  bajo las sierras, así que la pieza es más honda cuanto más relieve tiene, lo que va del valle a las cumbres (sin el 2 %
  más bajo ni el más alto). Hasta el 14 de noviembre de 2026 era ese relieve por 1,3, entre 0,22 y 0,5 veces su radio:
  una losa, y de lado apenas se veía roca. Ese día el autor mandó su «imagen de referencia por excelencia», una isla
  pintada cuya roca es una montaña del revés, y ahora es el relieve por 2,4, entre 0,62 y 0,9 veces el radio (`D`). La
  roca empieza justo bajo lo más bajo de la comarca (`base`): un escalón casi recto bajo el césped, hombros anchos y luego
  se cierra cada vez más deprisa hasta la punta (`ANI`, 13 anillos; en cono recto se veía un tallo fino bajo una losa). La
  punta no queda en el centro sino corrida a un lado (`ladoX`, `ladoZ`), cuelga más por tres o cuatro sitios (`puntas`) y
  no baja lisa: tiene panzas y entrantes grandes y repisas a lo largo (`bulto`, de ruido), además de las estrías, que
    se pierden hacia abajo, y la pared de la comarca se esconde mientras está en el aire. El canto (`canto`) cubre la orilla
  con un labio de hierba, un fleco que cuelga, su tierra y la roca (ver «El borde de la isla, integrado», más abajo).
  La roca son fotos con su relieve (mapa de normales): la caliza de la panza, con grietas verticales, generada con
  Higgsfield (`caliza.webp`, desde el 14 de noviembre de 2026; antes «Marble Cliff 04» de Poly Haven), y la roca en
  estratos de las paredes del hueco, de Poly Haven, CC0 («Cliff Side») (`src/assets/isla`). `materialRoca` les da la luz en la propia isla, un sol de lado y la luz del cielo y la que rebota
  del suelo, porque con las luces del mapa la roca de debajo salía negra.
  El hueco que deja en Navarra no da al cielo («debajo no hay cielo: es tierra más oscura; pon lógica geográfica», pidió el
  autor): es el molde exacto de la panza (su misma geometría: pieza y hueco, el mismo volumen), a la altura del corte
  (`CORTE`), con la roca a la sombra, oscura, más cuanto más honda; en lo más hondo se junta el agua en una charca verde
  oscuro, con ondas de ruido, algo del cielo reflejado de lado y la orilla suave (`LAGO`; el fondo va liso, que si ondula
  la orilla sale a dientes y a puntos). Se ve solo por la boca, con el búfer de plantilla (stencil, `stencil: true` en
  `stage.js`): se marca la boca donde se ve, se borra ahí la profundidad y se pinta lo de dentro; la panza se pinta dos
  veces, la de siempre y, dentro del hueco mientras sale de él, con la plantilla (`panzaA`). El agua cae: donde un río
  sale de la comarca, por el borde de la isla; donde un río de Navarra entraba en ella, por el borde del hueco, pegada a su
  pared (`porPared`), hasta la charca (los ríos van río abajo en los datos: `salen` y `entran`, hasta cuatro de cada). Son
  columnas de ocho lados que de canto se desvanecen, con su rocío y la bruma donde caen. Al despegarse cae un derrumbe de
  piedras con polvo por todo el borde, y luego se siguen soltando unas pocas cada segundo, de la panza y del borde del
  hueco; las que llegan al fondo levantan polvo. Todo lo demás de la comarca (ríos, árboles, chinchetas, nombres y
  maqueta) sigue su altura, `c.py`.
  El mapa es de día desde el principio (`cieloK` vale siempre 1): cielo azul con cúmulos (una esfera alrededor de la cámara
  que se pinta antes que nada), bruma de ese cielo a lo lejos, y la península de alrededor con su mar y su tierra, apenas
  apagada (`uCielo` en el suelo). Antes el mapa era morado, de noche, y solo pasaba a ser de día con una isla en el aire;
  el autor pidió que empezase ya «como un paisaje terrestre, con el cielo azul, el mar y la tierra». Con una comarca
  elegida, las demás no se quedan grises: guardan buena parte de su color (`fv`), y las paredes de todas van de roca.
  Por debajo del horizonte, y justo encima, ese cielo es del color de la niebla de lo lejano (`uBruma`, que cada imagen
  copia de `scene.fog.color`): donde el mapa se acaba, la tierra se deshace en el cielo sin raya. Antes el cielo se
  repetía hacia abajo como un espejo, y con la cámara mirando al mapa entero quedaba arriba una franja de azul fuerte.
  El azul sube deprisa desde el horizonte (`CIELO_HORIZONTE`, `CIELO_MEDIO`, `CIELO_ARRIBA`): claro abajo, vivo a poca
  altura y hondo arriba, porque en las vistas del mapa solo se ve una franja baja del cielo y con el degradado de verdad
  quedaba toda pálida («me falta más cielo azul»). La bruma de lo lejano es de ese mismo azul claro, sin gris, y empieza
  algo antes. El cielo ya no pinta nubes: son las de `mapa3dNubes.js`.
  La cámara de la isla es una sola toma, sin paradas (`sigueDronIsla`, `SUBE_ISLA`; 14 de noviembre de 2026). El autor,
  con su imagen de referencia: «es el plano cuando iniciamos la ascensión, pero luego la cámara termina en un plano mucho
  más cenital. Pero la cámara es muy dinámica. Vemos como la tierra sale hacia arriba y enseguida la cámara ya se va
  desplazando y empieza a planear con vuelo de dron sobre el territorio». Al elegir la comarca la cámara vuela a un plano
  bajo, de lado (`PITCH_ISLA` 0,27; a mano se deja bajar hasta 0,24), y la tierra espera a que vaya a medio camino para
  empezar a salir: la ascensión arranca con ese plano. Sube en segundo y medio (antes, en uno). Con la tierra a medio
  salir (`I.k` > 0,5) la cámara arranca despacio de lado, sube en arco girando casi un radián alrededor de la isla hasta
  casi encima (`PITCH_ALTA` 1,2, unos 69°; en 4,6 s) y, antes de acabar de subir, ya se acerca y planea sobre el
  territorio: va y viene por la comarca (un tercio de su radio), gira, baja a mirar el relieve y los pueblos algo de lado
  y vuelve a subir. Cualquier toque la para. Con «reducir movimiento» sube y se queda quieta. Si el jugador ya ha movido la
  cámara, no arranca. Antes esperaba quieta 1,3 s de lado, subía recta a 0,96 y solo entonces empezaba a moverse; y antes
  de eso, el 13 de noviembre, la subida no se veía nunca porque la cuenta que la disparaba estaba detrás de un comentario
  en su misma línea. Esa misma tarde, al verlo en su teléfono: «me gusta cómo acaba la escena y el movimiento, pero tiene
  que ser mucho más rápido». La subida en arco pasó de 4,6 s a 2,6; el planeo entra en 1,6 s y va a casi el doble de
  paso; la tierra sale en un segundo; y el vuelo de llegada al plano bajo es un tercio más corto. Se mide con
  `tools/islas/alta-dbg.mjs`, con reloj propio: de 0,27 de inclinación a 1,2 a los tres segundos de elegir (antes, a los
  seis), con el giro de 0 a 0,9, y luego entre 0,95 y 1,25, a tres cuartos de la distancia.
  Los nombres no salen mientras la tierra se arranca (`sinNombres`): los de los pueblos, los montes y los ríos de la
  comarca elegida aparecen cuando el dron empieza a planear sobre ella, a los tres segundos. El autor: «que al principio
  no aparezcan los pueblos y que luego, cuando se empiece a mover el dron entre las nubes, entonces ya salen». Si el
  jugador toca antes, o no hay vuelo de dron, salen en cuanto la cámara se queda quieta; y nunca más tarde de 8 s. El
  nombre de la comarca sí se ve desde el principio. La raya de la trashumancia
  se corta en su orilla. Para verlo: `isla.mjs` (con `PITCH` y `DK`), `isla-flujo.mjs`, `isla-salir.mjs` y `anim.mjs`, que
  graba la animación fotograma a fotograma con un reloj propio.
  El encaje de las piezas está comprobado con los datos (`comarcas-encaje.json`): cada linde entre dos comarcas es una sola
  línea que comparten las dos (988 tramos, cada uno en dos comarcas justas y ninguno en tres), el borde de fuera es un
  único anillo cerrado de 1.733 tramos y su área es la suma de las doce (250.104 unidades, sin huecos ni solapes); y
  Navarra cae en la imagen de la península con la misma proyección (`mapaXY`), así que encaja en ella.
  Las mugas entre comarcas son orgánicas (`organico` en `mapa3dFormas.js`; 14 de noviembre de 2026): venían de un mapa
  administrativo simplificado, con tramos largos casi rectos, y el autor pidió «no hacer tanto borde recto» en las
  líneas de rotura. Cada punto de una muga se corre lo que diga un campo de ruido en su sitio (tres ondas, de unos 9 km,
  3,5 km y 1,5 km; hasta 1.000, 700 y 230 m), y los tramos largos se parten antes cada 500 m. Como el corrimiento solo
  depende de dónde está el punto, las dos comarcas que comparten la muga la tuercen igual y el encaje sigue siendo
  exacto. No se toca el borde de Navarra, que es el de verdad (cerca de él el corrimiento se apaga en 2,5 km), ni las
  cercanías de los pueblos (de 1,7 a 3,7 km de su centro). De ese contorno sale todo lo demás (la losa, las paredes, la
  isla, su molde, la máscara de Navarra, a quién pertenece cada río), así que todo lo sigue. Comprobado con
  `tools/encaje-org.mjs`: 1.580 tramos de dentro, cada uno en dos comarcas justas; los 1.733 de fuera, como estaban, en
  un anillo cerrado; el área, 250.104, la misma; ningún contorno se cruza; ningún pueblo cambia de comarca; y ninguna
  comarca cambia más de un 2,5 % de superficie. Con ondas mayores (11 km y 2,3 km de corrimiento) dos contornos se
  cruzaban y alguna comarca cambiaba un 13 %: por eso se quedó en estas.
  La hierba del canto de la isla cuelga desigual (`CUELGA` en `mapa3dIsla.js`): entre la mitad y el doble según el sitio,
  con dos ondas de ruido a lo largo del borde, como en la imagen de referencia del autor.
  El hueco es el molde de esa roca, así que también es más hondo, y el agua lo llena hasta la mitad (`LAGO`): un lago
  ancho y azul bajo la isla, turquesa en la orilla, con el cielo reflejado de lado, al que llegan las cascadas. Antes era
  un charco verde oscuro en lo más hondo. La isla sube lo que mide su roca y algo más (`alto`), para que la punta salga
  del hueco y se vea el lago debajo.
  Los rótulos de las comarcas vecinas y la raya de la cañada que quedan detrás de la isla no se pintan encima de su roca
  (`tapaIsla` en `mapa3d.js`, con `cuerpo` de la isla): si la línea de la cámara al rótulo atraviesa la comarca o la roca
  de debajo, se quitan. Con la roca honda, tapaban media isla.
- **Los colores vivos del mapa** (14 de noviembre de 2026): el autor, con su imagen de referencia, un mundo pintado: «los
  colores son quizá más vivos». `acabado` (en `TONO_ORTO`, que comparten el relieve y el suelo de alrededor) da más color
  a todo, sobre todo donde había poco, pasa los verdes de oliva a prado quitándoles rojo (los ocres del cereal se quedan
  como son) y aclara algo los medios tonos. El cielo es más azul (`CIELO_ARRIBA`, `CIELO_MEDIO`, `CIELO_HORIZONTE`, y la
  bruma, que es la misma). La roca de la isla tiene la sombra azulada, de la luz del lago y del cielo, y la luz cálida;
  antes la sombra era parda. Y un tope al color al final de `acabado`: el color que pasa de 0,45 se va apretando, sin escalón, porque
  muy de cerca el verde de un prado se quedaba fosforito (lo vio el autor esa misma tarde). Las cascadas, con más cuerpo y más azules. Una nube que se va ya no se vuelve un velo gris: se encoge y se
  deshace en jirones, blanca hasta el final. Y lo que más apagaba el cielo no estaba en el mapa: el velo morado de
  encima (`#hub.juego .m3d::after`, en `consola.css`), de cuando el mapa era de noche, tapaba un tercio arriba y las
  esquinas. Se ha dejado en casi nada; lo de encima lleva su propio fondo.
- **El borde de la isla, integrado** (`canto`, `FILAS`, `suelo` en `mapa3dIsla.js`; 14 de noviembre de 2026): con una foto
  de la isla muy de cerca, el autor: «los bordes de los mapas no están bien integrados. No tienen bordes»; y luego: «ese
  labio que has puesto en el contorno no tiene nada que ver con el verde del césped» y «no puede haber cambios de colores
  bruscos que se note que son elementos pegados». Antes el canto era una cinta plana con una foto de césped estirada,
  que asomaba como una valla oscura, con la raya blanca de la muga encima.
  - El borde es un labio: el prado dobla sobre el filo, redondeado (11 filas, `FILAS`), sale más o menos según el sitio
    (`ANCHO`, de ruido) y menos en los entrantes (`ENC`); por dentro empieza transparente, en lenguas desiguales.
  - Debajo cuelga un fleco de hierba y musgo con enredaderas (`colgante.webp`) y, metida detrás, tierra con raíces
    (`tierra.webp`); luego la caliza. Son tiras con transparencia generadas con Higgsfield (Seedream 5.5 con fondo
    transparente; la caliza y la hierba vista de arriba, GPT Image 2) y hechas repetibles con
    `tools/islas/texturas-borde.py` (las tiras, solo a lo largo). Las raíces de antes, rayas de un píxel que colgaban como
    alambres, se han quitado.
  - El color no es suyo: labio y fleco toman el del suelo de la comarca justo dentro del borde (`suelo`), con las mismas
    cuentas que el terreno: la ortofoto con `tonoOrto`, la luz del relieve, el grano de cerca, la nieve, `acabado`, la
    sombra de las nubes y el velo de la comarca, con los mismos uniformes que su `relieveM`. De las fotos solo se toma la
    luz de cada hoja y su transparencia. Lo que sale fuera del borde toma el color en espejo, hacia dentro: tomado del
    mismo punto, el labio salía rayado.
  - La caliza ya no se repite en mosaico: `uVar` mezcla la misma foto a otra escala, a manchas grandes.
  - Mientras la isla está en el aire, ni la raya clara de la muga ni las cintas del contorno (`c.cintas`): subían con la
    losa y dibujaban una raya a trozos sobre el labio. La boca del hueco baja lo que se hunden las vecinas al quedar de
    fondo (`hundidas` en `update`): quedaba por encima de su borde y se veía una cuña de la base oscura del mapa. De cerca
    de la isla la niebla empieza más lejos.
  - Las paredes del hueco llevan la mitad de niebla (`uNiebla`): por estar más hondas que el suelo se aclaraban hacia el
    color del cielo y parecían de cristal. Y las paredes de las vecinas que asoman junto a la boca, de la misma tierra
    oscura (`TIERRA_HUECO`) y sin el filo claro de arriba.
  - El contorno tiene entre 300 y 560 puntos según lo que mide (antes 300 siempre), para que en las comarcas grandes el
    labio no vaya a tramos rectos.
- **Sin cortes ni rayas: todo termina** (`hazFalda`, `faldaM`, `sueloM` y `navDentro` en `mapa3d.js`; `pue`, `pueM` y
  `pueC` en `mapa3dSombreadores.js`; `libre` en `maqueta.js`; 14 de noviembre de 2026). El autor, con un vídeo de su
  teléfono y una imagen de islas flotantes de referencia: «no quiero un fondo como si hubiera niebla, quiero un fondo bien
  azul, bien claro, con nubes», «no quiero líneas separatorias», «que termine todo, no quiero cortes», y luego: «no hay
  cortes, todos los bordes terminan».
  - Sin rayas: fuera la cinta clara del contorno de Navarra con la oscura de debajo, la junta clara entre comarcas, la
    franja del color de cada una hacia dentro y la línea del borde de cada comarca (`linea`, que se queda oculta porque
    otras partes la mueven). Tampoco la sombra del suelo de fuera junto al borde, que de día se leía como una raya. Las
    comarcas se distinguen por su color, su nombre y la luz al pasar por encima.
  - Sin escalones: las comarcas ya no se levantan con sus sellos (`alzado` vale 0). Levantada, entre ella y sus vecinas
    quedaba una pared, un corte en el monte; lo que lleva cada una se ve en su tarjeta de abajo.
  - La falda: el borde de Navarra era una pared del suelo a la altura del monte, con la raya encima y el suelo plano
    detrás. Ahora el relieve sigue fuera y baja hasta meterse bajo el suelo de alrededor: una malla que empieza en cada
    punto del borde a su misma altura (las paredes de las comarcas quedan dentro, tapadas) y baja en 8 o 12 filas, más
    larga cuanto más alto es el monte (de 1,2 a 6,5 unidades), deprisa al principio y lisa abajo, con lomas a dos escalas.
    Hacia fuera, cada punto con su normal de cerca y, más lejos, la de muchos vecinos, para que en las entradas no se
    cruce consigo misma, y sin llegar nunca a la otra orilla de Navarra (`navDentro`, de la máscara de Navarra). Lleva la
    imagen de verdad de alrededor, con las mismas cuentas que el suelo plano, la luz de cada ladera (en lo llano vale 1,
    así abajo casa con el suelo) y roca clara con grano en lo muy pendiente. Crece con las comarcas al empezar y se
    hunde con las que quedan de fondo al subir una isla, así su borde sigue pegado al suyo. Unos 42.000 triángulos. Con
    montes muy altos, como en el Pirineo, de muy cerca aún se ve lisa: no hay relieve de verdad fuera de Navarra.
  - El fondo azul: la bruma empieza a vez y media la distancia de la cámara y tapa del todo a más de tres veces y media
    (antes, a una y a dos), y la cámara ve hasta cuatro veces su distancia. Lo lejano se ve con su color, el mar y la
    tierra, y solo al fondo se funde con el cielo.
  - Navarra sin descubrir, menos apagada (`uGris` 0,05, `uTintK` 0,17, brillo 0,95), y lo de fuera algo más (0,17):
    con el suelo de alrededor de verdad, Navarra quedaba más gris que España.
  - El paso del pueblo al mapa: el núcleo pintado de cada pueblo se funde con el relieve desde el 12 % del radio, en
    varios tramos, y su borde no es un círculo: se deshace a lenguas con un ruido de unos 250 m (`pue`). Su color pasa
    por las mismas cuentas que la ortofoto del relieve y, además, se le quita su color medio, tomado de una imagen más
    pequeña de la misma, y se le pone el del relieve en ese sitio (`pueC`): la foto fina del pueblo es más clara y más
    viva que la del mapa y se veía como un parche pegado. En la maqueta, los árboles llegan hasta un borde desigual,
    entre algo más de la mitad y el 93 % del radio según el ángulo, y no en un círculo. Para verlo: `tools/islas/ir-pueblo.mjs`
    (vuela a un pueblo como al tocarlo y saca fotos de la bajada) y `tools/islas/vistas-mapa.mjs` (el mapa desde varias
    cámaras).
- **Los montes terminan en la orilla de la isla** (`orT`, `orillaEn`, `RIM`, `WI`, `WO` y `KI` en `mapa3dIsla.js`;
  `ORILLA` en `mapa3dSombreadores.js`; `ORS`, `orU`, `orJS` y `orillas` en `mapa3d.js`; 14 de noviembre de 2026). El
  autor: «sigue habiendo como cortes transversales. Quiero que todo termine, como en las referencias, que todos los
  montes terminen, no que tengan un corte perimetral». El borde de la isla seguía la altura del terreno: donde un monte
  tocaba la muga, la isla lo cortaba en seco y debajo del césped se veía su perfil en roca; y alrededor del hueco, las
  vecinas quedaban cortadas en pared.
  - Con la isla en el aire, su terreno baja poco a poco hasta un borde bajo (`RIM`): algo por encima de donde empieza la
    roca, más un poco si el tramo de muga es de monte alto. La ladera es más larga cuanto más alto era el monte (`WI`,
    de 0,45 unidades hasta un 30 % del radio). Fuera, el terreno de las vecinas y la falda baja igual hasta la boca del
    hueco (`WO`), que se abre como una hondonada.
  - Todo sale de un campo en una imagen pequeña de unos 168 píxeles por lado (`orT`): en el rojo, cuánto baja dentro;
    en el verde, cuánto fuera; en el azul, la altura del borde. Cada lado se pasa dos píxeles al otro, para que los puntos
    que caen justo en la muga bajen del todo: si no, quedaban de pie, como pinchos.
  - Lo leen el relieve (con la luz de su pendiente nueva donde ha bajado), sus paredes, los árboles, los ríos, los
    embalses, la falda, las casas de los núcleos, el suelo de la maqueta del pueblo y cada pieza de la maqueta en
    su sitio (casas, tejados, árboles y detalles: `orilla` en `haceMaqueta`, `maqueta.js`; el grupo baja lo del
    centro, que es lo que necesitan los emblemas, y cada pieza, en su sombreador, la diferencia, `uOrC`). Hasta el
    16 de noviembre de 2026 todas las casas bajaban lo del centro: en Burgui, la mitad del pueblo más lejos de la
    orilla bajaba de más y quedaba enterrada bajo su propio suelo, con solo los tejados de la ortofoto a la vista
    («En el mapa faltan por construir pueblos»). En las cuentas (`orJS`): las chinchetas, los nombres, la
    cámara, los pájaros y la cabeza de las cascadas. El canto de césped va a la altura del borde ya bajado.
  - Baja mientras la isla sube (de un 8 % a un 70 % del camino) y vuelve al bajar; en tierra no cambia nada.
  - El labio, sin rayas: con una foto de muy cerca («estos cortes hay que corregir»), el fleco de hierba salía mucho más
    oscuro que el césped y la tierra de debajo casi negra, y de lado se leían como rayas a lo largo del borde. El fleco
    toma ahora la luz de sus hojas a medias y casi el tono del suelo (`cantoM`, zona 1), con menos diferencia entre el
    lado al sol y el de sombra; la tierra, parda y clara.
  - El labio, fino y desigual (16 de noviembre de 2026: «en el ordenador los labios de contorno de las islas flotantes se
    nota que están pegadas y que no son orgánicas»). Era un cojín de hasta 600 m que sobresalía y colgaba igual en todo el
    contorno, liso y más claro que el prado: de cerca, un tubo alrededor. Ahora (`FILAS`, `ANCHO` de `mapa3dIsla.js`)
    sobresale y cuelga menos de la mitad; su grosor va de casi nada a matas, con bultos pequeños; tiene la luz del prado,
    sin aclararse del lado del sol; y el filo de abajo se deshilacha en mechones. En el terreno de la orilla bajada
    (`RELIEVE_FS`), la foto solo se difumina donde la pendiente es fuerte (`empin`), no en toda la orilla: en las penínsulas
    estrechas el prado entero quedaba liso, y lleva más grano de hierba. La península de delante de Burgui aún se ve algo lisa.
  - Los colores, más vivos el mismo día («para dar esa sensación de mundos de fantasía», `acabado`): más color en todo
    (1,3 a 1,72 en vez de 1,15 a 1,51), medios tonos más claros y un tope al color algo más alto. Medido en la bajada a
    Etxalar, la saturación media del terreno pasa de 0,53 a 0,59, lejos de un verde fosforito. Para verlo:
    `tools/islas/isla-lado.mjs` con `ISLAS=0,4`.
- **El bloque de tierra sin corte transversal y el cielo hondo** (`ANI`, `aTope`, `uMusgo` y `cieloShader` en
  `mapa3dIsla.js`; `CIELO_BRUMA` en `mapa3d.js`; 14 de noviembre de 2026). El autor: «los bordes perimetrales siguen
  teniendo un corte transversal», «en el bloque de tierra no puede haber esos cortes» y «el cielo sigue como nublado,
  muy claro: más oscuro, más azul, más vivo». Con sus referencias de islas flotantes se generaron en Higgsfield dos
  imágenes de cómo debería verse; de ellas salen estas reglas:
  - La roca empieza justo bajo el césped en cada punto del contorno (`aTope`, en el sombreador de la roca: cada columna
    de la panza sube lo que va de su borde a la base, menguando hacia abajo). Antes empezaba a la altura más baja de toda
    la orilla y, en el monte alto, entre el césped y la roca quedaba una pared lisa, la banda que se leía como corte.
  - La roca se abomba bajo el labio (anillos de `ANI`, hasta un 3 % hacia fuera) y luego se cierra: ya no baja recta con
    el mismo contorno de arriba, como una tajada.
  - Musgo (`uMusgo`): el verde del césped baja por la roca en lenguas y mechones desiguales, hasta una cuarta parte de lo
    hondo de la pieza, con manchas sueltas más abajo; la caliza del canto, verde también. La roca, ocre y parda.
  - El hueco, como una hondonada: hierba por casi toda la pared del molde y roca solo abajo, junto al lago.
  - La ladera de la orilla, más larga (`WI`, hasta un 36 % del radio). Se probó un perfil redondeado que bajaba deprisa
    junto al borde y en el Pirineo dejaba paredes: se quedó la bajada suave.
  - El cielo: azul hondo arriba (`#0a4cc2`), vivo enseguida (`#1d7ce8`) y azul también en el horizonte (`#5cb0f4`, antes
    casi blanco), con la bruma de lo lejano azul (`#74b8f3`).
- **El corte, en llano; la cámara, en perspectiva; la roca, de Higgsfield** (`RIM`, `WI` y `uEscT` en `mapa3dIsla.js`;
  `sigueDronIsla` y `PITCH_ORBITA` en `mapa3d.js`; `tools/islas/isla-orbita.mjs`; noche del 14 de noviembre de 2026). El
  autor, con dos imágenes de islas flotantes: «no se parte una montaña por medio: intenta que el corte coincida en
  territorios llanos», «la cámara no gira tan rápido, simplemente se pone en la perspectiva que queramos y empieza a
  girar 360», «no quiero un plano visto de arriba, lo quiero en perspectiva» y «te puedes apoyar mucho más en Higgsfield».
  - El corte, en llano: el borde de la isla queda bajo y casi a nivel en todo el contorno (`RIM`: apenas un 3 % de lo
    que sube el tramo de muga, antes un 10 %) y la ladera hacia él es más larga (`WI`, hasta un 70 % del radio). Los
    montes bajan hasta el borde en vez de asomar partidos, y la orilla baja nada más despegarse la isla (a un 30 % del
    camino, antes a un 70 %), para que no se vea el monte cortado mientras sube.
  - Se probó antes llevar las mugas por el fondo de los valles (el camino más bajo dentro de una franja de 3 km a cada
    lado de la muga de verdad) y se descartó: las mugas de Navarra van por las cumbres y dentro de esa franja casi no
    hay valle; la altura media de cada tramo apenas cambiaba (unos 30 m de más de 900) y la mitad de los tramos se
    cruzaban con otros. Lo que quita el corte es bajar el terreno hasta un borde llano, no mover la muga.
  - La cámara: ya no sube en arco hasta casi encima ni gira de golpe. En 3,4 s pasa suave del plano bajo de la subida a
    la perspectiva de la órbita (`PITCH_ORBITA`, 23°: se ven el territorio y la roca de debajo) y gira alrededor de la
    isla una vuelta por minuto; el giro arranca desde parado y coge su paso en 4 s. La distancia es la que deja ver la
    isla entera desde cualquier lado (un cilindro alrededor de ella y su punta). Con cualquier toque se para. Esa misma
    noche, a 41° en vez de 23°: «aún quiero que salga un poco más arriba [...] tenemos que conseguir ver todo el
    territorio de la comarca» y «el ángulo de la cámara tienes que inclinarlo más hacia arriba para conseguir ver toda
    la superficie»; a 23° los montes de delante tapaban los valles de detrás. Sigue en perspectiva, no cenital.
    El 15, a 33°: a 41° quedaba demasiado cenital («que tenga un poco de perspectiva para ver todo el relieve de los
    montes, de los pueblos»). Y el cambio de plano, antes: «tarda mucho entre la elevación del territorio y el cambio de
    plano». La isla empieza a subir a los dos quintos del vuelo de llegada; la cámara arranca en cuanto la isla despega,
    con el vuelo ya en su último tercio, que se deja; y pasa a la órbita en 2,4 s con una curva que sale viva y frena
    suave. Antes esperaba al vuelo entero, de hasta 3,7 s, y luego tardaba 3,4 s más, con un arranque casi parado.
    Esa misma noche, más corto aún, porque el autor lo seguía viendo lento: el vuelo de llegada, a 0,55 de su duración
    (antes 0,68, como mucho 3 s); la isla, subiendo desde los tres décimos del vuelo; la cámara, en cuanto ha subido un
    cuarto y con medio vuelo hecho; y la órbita, en 1,8 s. De tocar la comarca a la vista de la órbita, unos 3,3 s como
    mucho; antes, unos 4,8. Y a 29° en vez de 33°: «la visión tiene que quedar en perspectiva para poder ver el relieve,
    no que quede cenital 100%». En las
    pruebas automáticas el mapa se toma por «reducir movimiento» y no gira: `isla-orbita.mjs` lo evita con `__paseo`.
  - La roca de la panza es una imagen generada con Higgsfield a partir de la referencia del autor
    (`src/assets/isla/roca-musgo.webp`, repetible, caliza cálida con surcos que bajan y matas de musgo), con sus normales
    sacadas de su propia luz (`roca-musgo-n.webp`) y al doble de tamaño (`uEscT` 0,5) para que tenga formas grandes. La
    caliza de Poly Haven de antes sigue en la carpeta, sin cargarse.
  - En la orilla bajada, donde es muy pendiente, la ortofoto se toma más difuminada: se estiraba en vetas.
- **El borde de cada isla, que se lea** (`FILAS`, `cantoH`, el musgo de `rocaM` y el canto en `mapa3dIsla.js`; la orilla en
  `RELIEVE_FS`; 15 de noviembre de 2026): «no me gusta cómo están los bordes individuales de cada comarca 3D». De lado, entre
  los montes y el filo quedaba una rampa verde lisa, porque la foto se difuminaba mucho en la orilla; el musgo de la roca
  subía en lenguas largas y la franja de bajo el labio era un 82 % verde, así que no se leía dónde acababa la tierra; y en
  la punta este del Pirineo el labio salía nevado, un saliente blanco, porque tomaba la nieve de la altura de la cumbre.
  Ahora la rampa guarda la foto, apenas suavizada, con un grano de hierba a matas; el musgo de la panza son manchas cortas
  bajo el borde; bajo el labio, roca con algo de musgo que se va hacia abajo; la tierra, parda media y algo más gruesa; la
  nieve del labio, la del filo ya bajado; y el labio, un cojín de hierba que sobresale y se dobla, con el fleco colgando en
  mechones. Hierba, tierra y roca, en ese orden.
- **Sin contorno: la tierra termina sola y la roca nace debajo** (`ANI`, `NIN`, `FILAS` y `TIERRA_ARRIBA` en
  `mapa3dIsla.js`; 15 de noviembre de 2026). El autor seguía viendo un contorno: «no tiene cortes, solo tiene un corte
  horizontal, no hay cortes verticales», «todo lo que está sobre un territorio horizontal plano está terminado [...] solo
  está arrancada la parte de abajo» y «el labio que estás creando en el borde tiene que ser orgánico con el resto. No puede
  ser un añadido». En fotos muy de cerca se veía por qué: la roca se abombaba hasta un 3 % hacia fuera bajo el filo y, con
  las estrías y los bultos, asomaba más que la hierba; desde arriba y de lado era una repisa clara alrededor de toda la
  isla, con caras casi verticales. Y debajo del labio colgaban tres franjas de colores (el fleco, la tierra y la caliza),
  que se leían como un borde pegado.
  - La roca ya no sale: desde el primer anillo se mete hacia dentro, y arriba no hacia el centro de la isla (que en las
    bahías la empujaba fuera) sino por la normal de cada punto del borde, un cuarto de lo que baja. Más abajo pasa a la
    forma de montaña del revés de siempre. Las estrías y los bultos, solo desde algo más abajo.
  - El labio es la propia hierba del prado que dobla sobre el filo y se mete bajo él hasta la roca: siete filas en vez de
    once, sin fleco, sin franja de tierra y sin franja de caliza; con una luz algo más baja que la del prado de al lado,
    que lleva la sombra del relieve (con la misma salía como una cinta más clara).
  - La tierra, en la misma pieza que la roca: los anillos de arriba de la panza van pardos (`#8a6a4e`; con la panza de tierra, `#7a5c42`) y pasan a la caliza
    en el primer 7 % de lo hondo.
  - Las paredes de la losa de la comarca ya se ocultaban con la isla subida; antes las tapaban la tierra y la caliza del
    canto.
- **La panza, de tierra parda con piedras, como la isla de la cascada** (`terron`, `HONDO`, `TIERRA_ARRIBA` y la textura
  `tierra-roca` en `mapa3dIsla.js`; `tools/islas/tierra-roca.py`; 15 de noviembre de 2026). El autor pasó otra imagen de
  referencia, una isla pequeña con césped que cuelga del borde, una cascada y debajo un pedazo de tierra que se cierra en
  punta: «me vas entendiendo, te paso otra referencia». Comparada con la isla del juego, lo que más se apartaba era la
  panza: aquí, caliza clara con surcos verticales que de lejos se leía como rayas estiradas; allí, tierra parda con piedras
  y terrones, sin dirección.
  - La textura nueva, generada con Higgsfield con la cuenta del autor (tierra con piedras ocres y pardas, grietas oscuras,
    raíces y algo de musgo), hecha repetible sin costuras, algo menos roja y con sus normales sacadas de su propia luz.
  - Las estrías de la forma se quedan en una quinta parte; en su lugar, terrones: bultos pequeños en las dos direcciones,
    que dan la silueta de pedazo de tierra. El fondo, pardo a la sombra en vez de azulado, y la tierra de debajo del
    césped, algo más oscura.
- **Copas con grano y ortofoto de los pueblos afinada** (`arbolM` en `mapa3d.js`; `tools/relieve/ortofoto.py`; 15 de
  noviembre de 2026): «que tengan la mayor posible textura de copas, de roca y afinar el ortofoto». Las copas de los árboles
  del mapa llevan matas de hojas más claras y más hondas, cada árbol con las suyas, y la punta más clara, donde da el sol;
  antes, un cono liso de un solo verde. Las 32 ortofotos finas de los pueblos, con un enfoque suave (máscara de enfoque de
  1,4 px en las de 2.048 y de 1 px en las de 1.024): tejados, calles y copas más definidos, sin halos; pasan de 32 a 37 MB y
  de 9,5 a 11 MB. No se hicieron más grandes: la maqueta pinta el suelo en un lienzo de 2.048 px, y uno de 4.096 serían
  64 MB de memoria gráfica, demasiado para el iPhone y los ordenadores con gráfica integrada.
- **Copas redondas para hayas y robles; conos solo para pinos y abetos** (`copaG` y `conifera` en `mapa3d.js`; 15 de
  noviembre de 2026). Con la isla de la cascada de referencia del autor, de copas frondosas y redondas, y su «los árboles
  simplemente son polígonos»: todos los árboles del mapa eran conos de seis caras, también los robles y las hayas de abajo.
  Ahora los de hoja ancha son una bola algo aplastada, con bultos y la luz de una esfera (80 triángulos; 20 en calidad baja)
  y un verde más vivo; los conos quedan para lo alto: por encima de 1.350 m, coníferas; de 900 a 1.350, mezclados (cuatro
  de cada diez, coníferas), como en Irati, que es un hayedo con abetos; y abajo, hoja ancha. Igual en el bosque denso de la
  comarca elegida. Medido en el mapa: 3.451 árboles, 62.000 triángulos en calidad alta.
- **La isla con sus montes enteros** (`mapa3dAmplia.js`, `islaAmpliada`; `hueco` en `hazIsla`; `ampDe`, `gIsla` y el
  cambio de malla en `finos` en `mapa3d.js`; `aAmp` y `enRect` en `mapa3dSombreadores.js`; 15 de noviembre de 2026). El
  autor: «los montes que no coincidan o que coincidan justo en el corte, tú hazlos completos. Todo el borde, si coincide
  que hay montañas, tú completa las montañas. No pasa nada que se repitan». Hasta entonces la isla era la comarca justa y
  donde la muga pasaba por un monte la orilla lo bajaba hasta el borde: quedaba medio monte.
  - Por cada punto del borde, cada medio kilómetro: si allí el monte sube al menos 90 m sobre su pie (el 12 % más bajo
    de lo que hay alrededor en Navarra, a tres unidades, el fondo de los valles), la isla crece hacia fuera mientras el
    monte siga alto; a más distancia, más alto tiene que estar. Luego se redondea en lóbulos y se quitan los lazos donde
    el borde crecido se cruza consigo mismo. Puede crecer de 1,4 a 3 unidades (3 a 6 km), algo menos de un tercio de lo
    que mide la comarca.
  - El relieve de lo que crece: dentro de Navarra, el de la comarca vecina, que sale en las dos (la del mapa se queda como
    estaba); fuera, donde no hay datos, el del lado de dentro en un espejo. Más allá de un tercio de lo que puede crecer
    baja poco a poco hasta el pie, como una ladera, y la isla acaba en tierra baja. Su relieve fino y su bosque, los del
    punto de donde sale. Donde salen o entran los ríos no crece: sus cascadas siguen en su sitio.
  - El hueco del mapa sigue siendo el de la comarca: la boca, el molde de sus paredes, su lago, las cascadas que caen a
    él y las piedras de su borde van con su contorno (`Qh`); la panza, el canto, la orilla de dentro y las cascadas de la
    isla, con el de la isla.
  - La isla en el aire lleva su propia losa (`gIsla`, con la rejilla alineada con la de la comarca para que ríos y
    árboles queden a la misma altura) y su malla densa es la de la isla; al volver al mapa, la de siempre.
  - Donde el relieve ya no es el de los datos (lo que baja hacia el pie y lo del espejo), la luz sale de la propia malla,
    como en la orilla (`aAmp`); y las imágenes finas de la comarca no se estiran fuera de su cuadro (`enRect`).
  - Lo añadido baja hasta el pie justo al llegar al borde de la isla (`extL`): medido en las 12, el borde crecido queda de
    mediana a unos 10 m sobre el fondo del valle. Su relieve fino se va antes que el grueso (`fino`): sobre el monte ya
    bajado, sus crestas salían como pinchos bajo un velo.
  - Con la isla crecida, la orilla de dentro solo baja hasta el fondo del valle de cerca (`VAL` en `hazIsla`), no hasta
    lo más bajo de toda la isla: en Bidasoa quedaba alrededor una repisa llana y, dentro, un escalón.
  - En la orilla y en lo que crece, la ortofoto, solo algo difuminada como antes, y la fina, a medias. Más difuminada
    volvía la rampa verde lisa que el autor no quiso el 14 de noviembre; los montes fantasma venían del relieve fino.
  - Medido con el contorno de las 12: crecen entre un 11 % (Ribera Alta) y un 54 % (Pirineo). Con la isla del Pirineo en
    el aire, su losa densa tiene 92.000 triángulos y los árboles del mapa con su bosque denso, 191.000.
- **El relieve, también alrededor de Navarra** (`tools/relieve/alrededor.mjs`; `src/data/mapa-relieve.js`, `fino.webp`
  y `FINO_R` en `mapa3d.js`; 15 de noviembre de 2026). El autor: «no te dejes ningún monte de los Pirineos nevado; no me
  importa que coja montes de provincias, localidades o países limítrofes. Lo que sí quiero es que esté completo». Hasta
  entonces el relieve del mapa guardaba solo el tramo de cada fila que toca Navarra; fuera era cero, y lo que cogía de
  fuera la isla de una comarca era inventado, el lado de dentro en un espejo.
  - Ahora la rejilla llega 20 puntos más a cada lado, 60 unidades del mapa, unos 12 km: Gipuzkoa, Araba, La Rioja, Aragón
    y Francia, con las mismas teselas y las mismas cuentas que `mapa-relieve.py` (SRTM y GMTED2010, dominio público). Lo
    que ya había no se toca; al sacarlo de nuevo salen iguales los 30.790 puntos de antes. Lo nuevo, 52.930 puntos, hasta
    2.400 m.
  - El relieve fino, `fino.webp`, igual, de las teselas de nivel 11 de EU-DEM: de 1.025 × 1.106 a 1.196 × 1.278 puntos.
- **La ortofoto, sin la mancha de Francia y también fuera de su cuadro** (`tools/relieve/orto-fuera.py`; `ORTO_FUERA` en
  `mapa3dSombreadores.js`; el canto en `mapa3dIsla.js`; `uEnt` en `mapa3d.js`; 15 de noviembre de 2026). Para que lo que
  coge la isla de fuera de Navarra no parezca una pieza de puzle:
  - En Francia, la ortofoto era la capa de fondo del servicio, oscura y a cuadros. Donde la foto es de esa capa, casi sin
    detalle y mucho más oscura, va la imagen de alrededor del mapa, `entorno-sat.webp`, del mismo servicio y con el mismo
    tono, con el borde fundido en ancho. Un 10 % de la imagen; lo demás no se toca.
  - Fuera del cuadro de la ortofoto, el relieve y el canto de la isla toman esa misma imagen de alrededor, la del suelo de
    fuera; antes la foto se estiraba desde su borde. La foto fina de cada comarca, solo dentro de su cuadro.
- **La isla crece con los montes de verdad de alrededor** (`islaAmpliada` en `mapa3dAmplia.js`; 15 de noviembre de
  2026). Con el relieve ya alrededor de Navarra, lo que coge la isla de fuera es el monte de verdad y no un espejo: en el
  Pirineo, la cara francesa con sus cumbres nevadas.
  - Cada rayo hacia fuera sigue el relieve de verdad hasta casi el fondo del valle: para cuando el monte baja a un 15 % de
    lo que subía sobre su pie, algo más cuanto más lejos. Puede crecer hasta dos quintos de lo que mide la comarca, de 1,6
    a 5 unidades, de 3 a 10 km.
  - Lo añadido conserva su relieve y su relieve fino; solo en el último quinto de lo que crece baja al pie, o en la mitad
    si el monte llegó al tope sin bajar. El pie de cada punto se mide también con lo de fuera.
  - Fuera de Navarra la luz sale de la malla, que el sombreado del mapa no llega; el bosque, de la misma máscara, que
    también llega alrededor.
  - Medido con el contorno de las 12: crecen entre un 22 % (Ribera Alta) y algo más del doble (Larraun-Leitzaldea y
    Sakana, que cogen enteras Aralar, Urbasa y Andía). Con la isla del Pirineo en el aire, su malla tiene 116.000
    triángulos y los árboles del mapa con su bosque denso, 216.000.
- **La isla, de cerca y en perspectiva, como la captura del autor** (`encuadreIsla`, `ENC_ISLA`, `hyMira` y `dDeGiro` en
  `mapa3d.js`; 15 de noviembre de 2026). «El plano de cámara, cuando se levanta la comarca, sigue terminando en un plano
  desde arriba. Y no, tiene que estar con más perspectiva» y «se aleja demasiado la cámara», con una captura del Pirineo
  en el aire de referencia. La inclinación ya era de 29°, pero la cámara se quedaba lejos: encajaba un cilindro alrededor
  de la isla, con el radio de su punta más lejana, y la punta de la panza; desde que las islas crecen con los montes de
  alrededor, ese cilindro era aún mayor. En el móvil tumbado la isla salía pequeña en lo alto de la imagen, con el mapa
  ocupándolo casi todo, y se leía como un mapa visto desde arriba.
  - La órbita encaja ahora el contorno de verdad de la isla, con la altura del relieve en cada punto, y una rejilla de
    dentro con sus montes. Lo hace desde cada lado, una distancia cada 30° (`dY`), suavizadas con las de al lado solo
    hacia arriba para que la cámara no se acerque y se aleje a golpes; al girar pasa de una a otra con una curva suave.
  - Mira a la cara de arriba de la isla y no a la mitad del bloque (`hyMira`): en la subida, a la mitad, como antes; con
    la órbita, poco a poco, a la cara de arriba. La punta de la panza puede quedar detrás de la fila de fichas.
  - A 32° en vez de 29°: de cerca, con 29° los montes de delante tapaban los valles.
  - En el móvil tumbado, con el Pirineo, la cámara queda a entre 37 y 46 de distancia según el lado, en vez de 61, y la
    isla llena la imagen.
  - Esa misma noche, con otra captura del autor, el Pirineo visto de punta desde el oeste: «se aleja mucho la cámara y la
    comarca está demasiado lejos». Para que cupieran los dos extremos de una isla larga, la cámara se iba a 46 y la isla
    quedaba estrecha en medio de la imagen. Ahora, desde ningún lado se aleja más de un 15 % de lo que se acerca desde el
    lado más cercano (`c.dOrb`): de punta se recortan un poco los extremos. Y con márgenes más justos arriba y a los
    lados, ya sin nombres encima. El Pirineo, entre 36 y 41.
  - Y el dron, desde el 15 a mediodía, empieza volando sobre la superficie (`CERCA_DRON`, `PITCH_DRON` y
    `ACERCA_SUBIDA`). El autor: «cuando se anima la comarca y sale de la tierra hay que acercar más el plano y más
    perspectiva para que el dron comience a volar sobre la superficie». La subida se ve más cerca, al 72 % de lo que
    encaja la comarca entera con su bloque. Tras ella, el dron baja a la mitad de la distancia de la isla entera y a 23°,
    sobre los montes y con los nombres de los pueblos. Con la vuelta va subiendo: a los 30 s enseña la isla entera a 32°
    y luego vuelve a bajar. En el Pirineo, del móvil tumbado: 34 en la subida, 20 al empezar el dron y 37 a media vuelta.
  - Y desde el 15 por la tarde, el vuelo acaba en un plano fijo (`DRON_ISLA`, `SESGO_DRON`): la isla entera de frente,
    desde el sur y con el norte arriba, a 32°. El autor mandó la captura de ese plano: «este sería el plano perfecto
    después de la animación». Ya no da vueltas. Sale de cerca, se abre medio radián hacia un lado y vuelve mientras se
    aleja, y a los 9 s llega y se para; las dos curvas llegan con velocidad cero. A los lados deja un 12 % de aire, como
    la captura; con la pantalla de pie, el 3 % de antes. En Sakana, del móvil tumbado, a 20,4; de pie, a 56,5.
  - Y desde el 16 de noviembre de 2026, todo más deprisa («la animación de las comarcas que salen de la tierra va muy
    lenta»): la tierra arranca con el vuelo de llegada al 15 % en vez de al 30 %, su muelle es el doble de firme (34 en
    vez de 17, amortiguado 8,2) y sube en unos 0,4 s en vez de 0,6; el vuelo de llegada dura un 45 % del normal en vez de
    un 55 %; y el dron llega al plano final en 5 s en vez de 9 (`LLEGA_ISLA`, 1,4 s en vez de 1,8). Ojo: el mapa no deja
    pasar más de 0,1 s por imagen, así que en un ordenador que vaya a menos de 10 imágenes por segundo todo va a cámara lenta.
    La tarde del 16 de noviembre se deshace y se hace con calma. El autor: «no quiero que aumente la velocidad. Quiero que se
    vea perfectamente cómo la comarca se despega de Navarra, sube, y cuando pasamos de comarca a comarca también [...] con
    una pausa». Ahora va por pasos: la cámara llega (vuelo al 70 % del normal); la isla espera a que llegue y se despega
    con un muelle blando (6 y 4,2), que sube en algo más de 1,2 s; se queda quieta arriba 0,8 s (`PAUSA_ISLA`) y entonces
    arranca el dron, que llega a su sitio en 2,6 s (`LLEGA_ISLA`) y al plano de la isla entera en 10 (`DRON_ISLA`). Medido
    en el navegador de pruebas: la cámara llega a 1,2 s, la isla empieza a subir ahí y el dron arranca a 3,1 s.
- **La subida, en perspectiva y algo más rápida** (`PITCH_ISLA` y el muelle de la isla en `mapa3d.js`; noche del 16 de
  noviembre de 2026). El autor, con su vídeo del iPhone: «cuando sale la comarca de la tierra, el plano que no sea
  horizontal, también que esté un poco en perspectiva. Y cuando se arranca la tierra de la comarca, que vaya un poquito más
  deprisa». La cámara de la subida baja ahora a 24° (`PITCH_ISLA` 0,42) en vez de a 15°: se ve la cara de arriba de la
  isla con sus montes y pueblos, y a la vez la roca y el hueco de debajo. El muelle de la isla pasa de 6 y 4,2 a 9,5 y 5,3,
  con el mismo poco rebote: sube en algo menos de un segundo en vez de en algo más de 1,2. La pausa de arriba antes del
  dron (`PAUSA_ISLA`, 0,8 s) y el resto de la toma no cambian. Comprobado con fotogramas de Sangüesa a 844 × 390.
- **La isla sube ya hecha, con árboles por todo y más polvo al romperse** (`finoYa`, `preIslas`, `finos`, `hazFino` y
  `TOPE_ARB` en `mapa3d.js`; el derrumbe y el polvo de `update` en `mapa3dIsla.js`; noche del 16 de noviembre de 2026). El
  autor, al verlo en su teléfono: «los cambios de cámara y de plano van a trompicones», «hay árboles en una parte, en otra
  parte no hay árboles, no queda orgánico [...] o pones árboles por todo, que tenga sentido, que se construyan a la vez»,
  «cuando se despega de la Tierra, debería romperse y salir un poco más de humo, como polvo» y «ya se despega construido
  todo, no se va construyendo conforme va subiendo».
  - Los tirones venían del relieve fino y del bosque denso de la isla: se hacían en tres pasos con la cámara quieta, que
    caían a medio vuelo del dron (de 0,2 a 0,7 s cada comarca en el navegador de pruebas, el más pesado la malla densa), y
    luego entraban poco a poco, con los árboles creciendo, que era lo que se veía construirse. Además el bosque denso
    tenía su propio programa, que se compilaba justo al aparecer. Ahora todo se hace al tocar la comarca, antes de que se
    mueva nada (`finoYa`), y entra de golpe en cuanto la isla se despega: sube entera. Si ya estaba hecho de antes, tocar
    no para nada; si no, la pausa es al principio, con la cámara quieta, y no a mitad de un movimiento.
  - Se hace de antemano (`preIslas`) para la elegida y las dos de cada lado en la fila de abajo (una en calidad baja), un
    paso cada vez con la cámara quieta, después de sus islas. Ya no se hace nada durante el vuelo del dron de la isla. Se
    guardan las seis últimas (cuatro en calidad baja), unos 6 MB cada una.
  - El bosque de la isla, con el mismo material de los árboles de siempre: salen todos a la vez y sin programa nuevo. Con
    él a la vista, los árboles gruesos de esa comarca se esconden, que si no salían dos tamaños mezclados.
  - Árboles por toda la comarca, con sentido: el bosque, espeso donde dice la máscara, como antes, y fuera de él árboles
    sueltos y en grupitos, como setos, riberas y bordes de campos, menos en el sur seco y ninguno en lo más alto; del
    bosque a los campos se pasa poco a poco, sin el corte que había. Ninguno encima de los pueblos. Como mucho 9.000 por
    comarca (4.500 en calidad baja), quitando al azar, y con una copa sencilla de 20 triángulos: en el Pirineo salían
    20.000, el doble de lo que cabe en el presupuesto del iPhone.
  - Al despegarse se rompe de verdad: el doble de piedras al soltarse, algunas grandes, y una nube de polvo, como humo, de
    setenta y dos bocanadas repartidas por toda la grieta, por fuera de la isla y dentro del hueco, que se abren, suben
    despacio y se deshacen en algo más de 3 s.
- **Sin tirones al elegir una comarca** (`orT` y `crucesDe` en `mapa3dIsla.js`; `losaDe`, `preIslas` e `islaMueve` en
  `mapa3d.js`; 16 de noviembre de 2026). El autor mandó un vídeo del iPhone pasando de comarca a comarca por la fila de
  abajo: «para que veas también lo lento que va y a trompicones». Medido en la grabación: entre 40 y 50 imágenes por
  segundo y, en cada comarca nueva, uno o varios parones de 0,1 a 0,4 s justo al empezar el vuelo y la subida.
  - La isla de cada comarca se hacía entera en el momento de tocarla: de 0,12 a 0,41 s en el navegador de pruebas, con la
    imagen parada. Casi la mitad se iba en el dibujo de la orilla (`orT`): por cada píxel se recorrían los 300 a 560 puntos
    del borde, dos veces, para buscar el más cercano, y otras dos para saber si estaba dentro. Ahora el más cercano se busca
    por casillas, en anillos que se abren hasta que ya no puede haber otro más cerca (con empate, el de menor número, como
    antes), y lo de dentro, por filas: los cruces del contorno con cada fila, una sola vez (`crucesDe`). Lo mismo para el
    relieve de la comarca que decide lo honda que es la roca. El resultado es idéntico, comprobado con una huella de la
    imagen de la orilla y del relieve en las doce comarcas, y la isla se hace en menos de la mitad: de 2 s a 0,9 s las doce.
  - Y se hacen de antemano (`preIslas`), una cada vez y en dos trozos (su contorno crecido y su losa; luego la roca, el
    hueco y el agua): un trozo cada 1,2 s con la cámara quieta y cada 3 s en los movimientos lentos, el paseo por Navarra o
    el dron de la isla ya en su sitio. Nunca en un vuelo, con el dedo en la pantalla ni mientras una isla sube o baja.
    Primero las de al lado de la elegida en la fila de abajo. Hechas, se esconden y no se pintan ni se suben a la tarjeta;
    las doce ocupan unos 12 MB de memoria. Con una ya hecha, tocar su comarca no para nada.
  - El relieve fino de la comarca elegida, que se hace en tres pasos con la cámara quieta, esperaba a que la cámara llegara
    y caía justo en la subida y la pausa de arriba. Ahora espera a que la isla esté arriba y el dron haya llegado a su sitio.
  - Las pruebas automáticas, con reloj propio y la tarjeta de mentira del navegador, no sirven para medir la fluidez: allí
    una imagen con la isla tarda segundos. Se mide la parte de los cálculos, que es la misma en el teléfono.
- **Menos tirones al preparar y subir la isla** (`bordeDe` y `detalles` en `mapa3d.js`; `fuera` en `mapa3dAmplia.js`; 17
  de noviembre de 2026). El autor, con otro vídeo del iPhone: «hay que revisarlo y optimizarlo porque cada vez va más
  lento». Medido con el perfil de la CPU al elegir comarcas en el navegador de pruebas:
  - La distancia al borde del relieve fino (`bordeDe`) recorría, en cada punto de su rejilla, todos los lados del contorno:
    114 ms de una vez en el Pirineo. Solo hace falta hasta 0,75, donde su curva ya vale 1: ahora cada lado mira solo los
    puntos que tiene a esa distancia, y ya no sale en el perfil.
  - El relieve, la luz, el fino y el bosque de lo que crece una isla pedían cada uno el punto del borde más cercano para
    los mismos vértices (`cerca`, lo que más tardaba): ahora cada punto se busca una vez y se guarda mientras se hace esa
    malla (`olvida` lo suelta al acabar). En el Pirineo, de 142 a 33 ms.
  - Las texturas de cerca de la comarca elegida (relieve y ortofoto, hasta 22 MB cada una en el Pirineo) llegaban a media
    subida y se subían a la tarjeta en ese momento: 2,8 s parados en el navegador de pruebas. Ahora, si una isla se mueve,
    esperan (`pendD`) y se suben una a una, con `initTexture`, en cuanto está quieta.
  - Si se toca una comarca antes de que el mapa haya preparado la isla, se prepara en ese momento (`preparaIsla` en
    `select`): sus programas se compilan durante el vuelo de llegada, y la isla no despega hasta tenerlos (`islaComp`).
  - Con todo, el montón de memoria tras tres comarcas, de 191 a 164 MB.
- **La isla se rompe a ras del suelo y sube hecha, sin cortinas verdes** (`lift`, `hundeK` y la espera de `hecha` en
  `mapa3d.js`; `KI` en `mapa3dIsla.js`; `altoI` y `fuera` en `mapa3dAmplia.js`; los surcos de `RELIEVE_FS`; 17 de
  noviembre de 2026). El autor, con el mismo vídeo: «la transición desde el suelo a la elevación, esa generación de todo
  lo que es el modelado, queda fatal. Esto no puede ser así». Fotograma a fotograma, en la subida pasaban varias cosas
  seguidas:
  - La comarca elegida se levantaba antes 0,9 del mapa y las de alrededor se hundían, y se veían sus paredes pardas, como
    una galleta recortada; luego salía la isla, con otro contorno. Ahora, con isla, la elegida se queda a ras y las de
    alrededor no se hunden hasta que la isla se rompe: la grieta se abre a ras del suelo y la pieza sube.
  - La orilla de la isla seguía bajando a media subida (de k 0,02 a 0,3): ahora baja casi a ras (de 0,004 a 0,16) y luego
    sube de una pieza.
  - Si su relieve fino no estaba hecho, subía con la malla gruesa, casi llana, y a media subida le crecían los montes. Ahora
    no despega hasta tenerlo, o 1,6 s después de tocarla.
  - Lo que crece una isla para que sus montes salgan enteros (`islaAmpliada`) bajaba al pie en el último quinto de lo que
    crece, y con el relieve exagerado quedaba una ladera casi vertical, lisa y con la foto estirada en vetas: unas cortinas
    verdes delante de la isla. Ahora empieza a bajar en algo más de la mitad, a una distancia que cambia en lenguas a lo
    largo del borde, y baja restando una rampa (lo que el monte del borde sube sobre su pie) en vez de encogerse todo hacia
    el pie: guarda sus crestas y barrancos y los fondos llegan antes al llano. Y en lo pendiente de esa falda, surcos de
    erosión ladera abajo en la luz, de unos 300 m de uno a otro.
  - Comprobado con capturas de la subida del Pirineo a k fija, con la cámara del juego y desde fuera, antes y después. No
    probado en un teléfono de verdad.
- **Musgo en la panza, como la isla de la tercera referencia** (`uMusgoT`, `conMusgo` y el musgo de `ROCA_FS` en
  `mapa3dIsla.js`; `tools/islas/musgo.py`; 15 de noviembre de 2026). El autor pasó otra referencia, una isla cuya roca
  está cubierta de musgo y hierba que baja desde el borde: «más referencias que te ayuden». Lo que más se apartaba de la
  nuestra era la panza, casi toda tierra parda.
  - Una foto de musgo en cojines con helechos pequeños, generada con Higgsfield con la cuenta del autor, repetible, con
    sus normales y en dos escalas mezcladas para que no se repita.
  - El musgo baja más, hasta algo más de una quinta parte de lo hondo de la panza, en lenguas con hebras que cuelgan en
    las puntas, a matas con la tierra asomando entre ellas, y en manchas en las repisas que miran arriba. La roca de
    justo debajo, a su sombra. En el sur seco, la Ribera, menos.
  - Para que siga leyéndose dónde acaba la tierra, lo que se quiso el 14 de noviembre: el musgo es más oscuro que el
    césped del labio, y en muchos sitios queda debajo del labio una franja de tierra a la sombra.
  - Las paredes del hueco llevan la misma foto de musgo.
- **Los caseríos** (`mapa3dCaserios.js`, `hazCaserios`; 14 de noviembre de 2026): «los pueblos tienen que estar muy bien
  integrados dentro del mapa». A la distancia de una comarca, un pueblo era solo su ficha con foto flotando encima: a su
  tamaño de verdad mide dos o tres píxeles, y sus casas reales no se levantan hasta estar muy cerca (los núcleos). Ahora
  cada pueblo del juego tiene su caserío sobre el relieve: de 6 a 10 casas de paredes claras y tejado a dos aguas, 16 en
  las ciudades, alrededor de su iglesia con torre, cada una a la altura del suelo que pisa, con un solar claro debajo
  que junta el suelo del pueblo. Van agrandadas, como el relieve y los árboles: son un dibujo del pueblo, no su plano.
  De teja en casi toda Navarra y de pizarra en el Pirineo; de cal en el norte, piedra dorada en el centro y ocre en la
  Ribera. Las zonas de naturaleza no llevan. Crecen algo al alejarse la cámara (`f`, de 0,8 a 1,55) y a menos de 9,5 de
  distancia se encogen y se van: ahí salen las casas de verdad. Una malla con instancias por comarca, hija de la comarca,
  así que sube con ella cuando flota; las de las comarcas del fondo se apagan con ellas. Su luz es propia, clara, para
  que los tejados salgan de su color. En total, unas 420 casas y 12 llamadas de dibujo como mucho.
  Se quitaron el 15 de noviembre de 2026, con su archivo: al acercarse desaparecían y salía el pueblo de verdad, y el
  autor no les veía sentido («que sea el pueblo»). Está en la historia de git, en el commit anterior a «Mapa: sin caseríos».
- **La isla, a la primera sin nombres encima** (`lejosIsla` en el bucle de los nombres de `mapa3d.js`; 15 de noviembre de
  2026). «Las insignias o letreros de cada pueblo hacen que se tape la comarca [...] de primer vistazo no». Con la isla
  en el aire y la cámara a la distancia de la órbita no salen las fichas de sus pueblos, ni los rótulos de las comarcas,
  ni los parajes, los montes o el rebaño de la trashumancia. Al acercarse, a un 80 % de esa distancia, van saliendo:
  con el botón de acercar, un toque algo largo.
  - Desde el 15 por la tarde, los pueblos sí salen, pero mínimos (`.m3-tl.mini` en `inicio.css`): solo su nombre, en
    11 px, blanco con una sombra fina, y un punto en su sitio; sin ficha, sin foto y sin fondo. El tuyo, con el punto
    rosa; los sellados, dorado. El autor: «que salgan los nombres de los pueblos de una manera minimalista. Que no
    emborrone». Lo demás, y los pueblos con su ficha, sale al acercarse a menos de la mitad de esa distancia, también
    en el vuelo de dron de después de la subida, que antes iba lleno de montes y sierras.
  - Esa noche, los puntos salen en cuanto la isla empieza a subir, sin esperar al vuelo del dron, y se tocan con un
    margen de un dedo (`quien`: hasta 38 px alrededor del punto en el móvil, 26 con el ratón; la chincheta de debajo es
    diminuta a esa distancia y antes no se podía elegir el pueblo). El punto, de 13 px, blanco con el filo oscuro si el
    pueblo está por descubrir, rosa si está empezado y dorado si está sellado; el nombre, en 12 px sobre una pastilla
    oscura al 50 %, sin desenfoque. El autor: «un punto minimalista, muy fácil de acceder, pero que se note claro cuál es
    cada pueblo».
  - El 16 de noviembre, fuera el punto: el autor, «No me gusta el punto del pueblo para seleccionar». En la isla, cada
    pueblo lleva ya su ficha, la misma de cuando se acerca la cámara (como la de Burgui), algo más pequeña: foto de 24 px
    con el aro de cómo va, nombre en 12 px y el pico abajo; si no cabe, solo la foto (`.m3-tl.mini` en `inicio.css`; lo
    que ocupa sin nombre, 30 por 36 px). Se sigue tocando en toda la ficha y con el margen de un dedo alrededor del pico.
  - Y un paso atrás cada vez (`atras`): la casa del mapa y Escape llevan del pueblo a su comarca y de la comarca a toda
    Navarra; antes la casa iba siempre a toda Navarra. Al salir de un pueblo («Volver a la comarca», en el menú de pausa),
    el inicio se abre con su comarca levantada (`hub.show('home', comarca)` en `main.js` y `enMapa` en `inicio.js`), y no
    en la página de la comarca. El autor: «el paso es mapa de Navarra, comarca, pueblo y para atrás comarca, mapa de
    Navarra».
- **Las animaciones del mapa, a su paso aunque el móvil vaya justo** (el paso de cada imagen, `dt`, en el bucle de
  `mapa3d.js`; 15 de noviembre de 2026). «Revisar por qué las animaciones van muy lentas». El paso de cada imagen tenía
  un tope de 0,05 s: por debajo de 20 imágenes por segundo, todo iba a cámara lenta, la isla que sube, el vuelo y la
  órbita, y con la isla del Pirineo y sus montes de alrededor el teléfono baja de ahí. El tope pasa a una décima: van a
  su paso hasta 10 imágenes por segundo. Los muelles de la isla, las piedras que caen y las curvas de la cámara aguantan
  esa décima sin desbocarse.
- **Las nubes del mapa** (`mapa3dNubes.js`, `hazNubes`; 13 y 14 de noviembre de 2026): el autor pidió «nubes que se van
  apartando conforme la cámara se va acercando y alguna residual se queda», con perspectiva y textura, «no manchas blancas
  al uso». La primera versión, unas capas planas de ruido, lo eran; la segunda, una imagen de nube siempre de cara a la
  cámara, se veía plana: «no son en 3D». Ahora cada nube tiene volumen: es un montón de copos (hasta 14; 10 en el móvil y 8
  en los equipos flojos) repartidos en una cúpula, grandes abajo y en medio y pequeños arriba y en los bordes, cada uno en
  su sitio del espacio. Al mover la cámara, los copos se mueven unos respecto de otros, y la nube se ve desde arriba, de
  lado o desde abajo como lo que es. Cada copo es una bola con la luz del sol del mapa (`uSolV`, el sol en la vista de la
  cámara): blanco por donde le da, azulado por el otro lado y por la base; con el borde deshilachado y bultos pequeños, de
  un ruido que se repite, hecho una vez en una textura de 128 px. Son 60 nubes (34 en el móvil, 16 en los equipos flojos),
  entre 17 y 23 unidades de alto, y pasan despacio con el viento por un campo de 340 unidades. Dan sombra: una mancha
  suave en el suelo de alrededor, corrida hacia donde no da el sol (la sombra de nubes pintada con ruido que había en el
  suelo y en el relieve se queda en casi nada). Con Navarra entera a la vista casi no hay encima de ella, para que se lea
  el mapa. Al acercarse la cámara (`abre`, de 112 a 42 de distancia), las de en medio se corren hacia fuera y se
  deshacen; una de cada cinco se queda, a medias. Ninguna se pone delante de la cámara. Los copos se ordenan de lejos a
  cerca cada imagen. En las pruebas, con `?q=high`: sin tarjeta gráfica el mapa entra en calidad baja y pone pocas.
  Junto a la isla de la comarca elegida no quedaba ninguna: el campo es grande y las de cerca se apartan. Desde el 14 de
  noviembre hay unas pocas suyas (`deIsla`: 9, 6 en el móvil y 4 en los equipos flojos), como los cúmulos de la imagen de
  referencia: van en medidas de la isla, a entre 1,75 y 3,25 radios de su centro y entre la mitad de su roca y algo por
  encima de su base, y solo se ven las que quedan detrás de ella o a los lados vistas desde la cámara; las de delante se
  deshacen, y al girar la cámara salen unas y se van otras, despacio. No dan sombra.
  - De tamaños distintos y dispersas (noche del 14 de noviembre de 2026; el autor: «más nubes de diferentes tamaños, no
    que sean igual» y «muchas veces las nubes son más dispersas, no están tan centralizadas en núcleos»). Casi la mitad
    son jirones pequeños, de 3,5 a 8,5 unidades; algo más de un tercio, medianas, de 9 a 18; y unas pocas, grandes, de
    hasta 32 (antes todas medían de 11 a 26). Y entre un tercio y la mitad no son un cúmulo apretado sino copos sueltos
    repartidos en una mancha ancha y baja, más transparentes y con la mitad de sombra (`nube`, `suelta`). Hay más nubes
    (92 en el ordenador, 54 en el móvil y 24 en calidad baja; antes 60, 34 y 16) pero los copos que se pintan son casi
    los mismos: unos 700, 300 y 115. Las de junto a la isla, 12, 8 y 5, también de tamaños distintos.
    Esa misma noche, casi el doble: 180, 100 y 36, y junto a la isla 30, 18 y 8 («tiene que haber bastantes más nubes»).
    Son copos en una sola malla: más copos, la misma llamada de dibujo.
  El 16 de noviembre de 2026, el autor: «Las nubes son muy compactas. En la realidad no son así, hay más nubes entre las
  islas flotantes y de diferentes tamaños». Junto a la isla, 50 en el ordenador, 30 en el móvil y 12 en calidad baja (antes
  30, 18 y 8), de tres tamaños (de un quinto de radio a casi dos), más de la mitad de copos sueltos, en un anillo de 1,1 a
  3,9 radios y a más alturas, por debajo de la roca y por encima de la hierba; solo se deshacen las que quedan entre la
  cámara y la isla. En todas, la cúpula de copos es más ancha, los copos más pequeños, los del borde más transparentes y el
  borde de cada copo algo más suave y deshilachado.
  Ese mismo día, con una imagen de referencia: «las nubes son así, no como las estás haciendo tú». Cada copo deja de ser
  una bola iluminada con sombra azulada y pasa a ser una bruma blanda que se apaga desde el centro, deshilachada por el
  ruido y con grano por dentro; más clara arriba y hacia el sol, con un gris suave y neutro en la base (`uSombra`
  `#c6d0dd`), y algo tendida, 1,55 de ancho por 1 de alto. Juntas hacen nubes algodonosas como las de la imagen.
  - Al acercarse a un pueblo (16 de noviembre de 2026; el autor: «debe haber más nubes en la atmósfera que se apartan al
    acercar un pueblo y empezar la cámara de dron a acercarse, y alguna pasa por medio»). Al elegir un pueblo,
    `irPueblo` guarda en `acerca` la recta por la que llega la cámara (su giro y su inclinación finales) y lo lejos que
    empieza, como mucho 32 unidades. `hazNubes` tiene 22 nubes más para eso (`dePueblo`; 14 en el móvil y 8 en calidad
    baja), quietas en el aire a lo largo de esa recta, desde el 60 % de la distancia de salida hasta 3,5 veces la de
    llegada, repartidas por igual en escala y un poco a los lados, del tamaño que les toca a su distancia. La cámara baja
    entre ellas y, por la perspectiva, cada una crece y se va hacia el borde de la imagen al pasar; las que quedan muy cerca
    de la cámara se deshacen. Y una más, en la recta a 2,6 veces la distancia final: la cámara la atraviesa al final del
    vuelo y la imagen se vela un momento de blanco antes de salir sobre los tejados. La altura del suelo del pueblo se lee
    en cada imagen (`pisoEn`), porque con la isla en el aire cambia. Al llegar se deshacen. Son copos de la misma malla:
    ninguna llamada de dibujo más.
- **Girar e inclinar el mapa con botones** (`.m3-pad2`, `B2` y las teclas `pu` y `pd` en `mapa3d.js`; `inicio.css` y
  `consola.css`; 15 de noviembre de 2026). El autor: «tendrás que añadir también nuevos controles para navegar por el
  mapa». Girar solo iba con dos dedos, el clic derecho o Q y E, e inclinar solo con dos dedos; en el móvil, quien no lo
  sabía no tenía manera. Ahora, a la izquierda de acercar, ver toda Navarra y alejar, cuatro botones más pequeños en dos
  por dos: girar a la izquierda, girar a la derecha, ver más de lado y ver desde arriba. Se mantienen pulsados, como los
  otros, y paran el dron de la isla. En el teclado, R y F o las teclas de página inclinan. Con la ficha abierta en el
  móvil estrecho se esconden con los demás.
  - El mismo día por la tarde, «y los controles densos, que sean táctiles»: en las pantallas táctiles, `(hover: none)
    and (pointer: coarse)`, solo queda el botón de ver toda Navarra, suelto y de 46 px. Lo demás va con los dedos: un dedo
    mueve; con dos, pellizcar acerca, girarlos gira y deslizarlos juntos arriba o abajo inclina (`mueveGesto`, el
    `modo` de `gesto`: se decide en los primeros 10 px; si los dos van en vertical y hacia el mismo lado, con los dedos uno
    al lado del otro, inclina). La ayuda del móvil de pie lo dice. En el ordenador siguen los siete botones.
- **La barra de misiones, plegada del todo** (`ui.js buildHUD`, `pliegaMisiones`, `eligeMision`; 13 y 14 de noviembre de
  2026): el autor pidió «un menú desplegable horizontal que entre en las misiones, la mochila, un poco todo, [...] que se
  quede el icono marcado de la misión que estamos haciendo y que cuando queramos hacer otra misión o ver las misiones
  que nos quedan, pulsemos y se nos despliegue, porque si no, ocupa muchísima pantalla». Plegada (`#tl.plega`), solo
  queda la casilla de la misión que se está haciendo, con una flecha fina pegada: 84 px de ancho en el móvil y 92 en el
  ordenador. Al tocar la casilla o la flecha se despliega a lo ancho todo lo demás (`.abierta`), con una entrada
  escalonada: las otras misiones, la flecha con las que llevas hechas, y el catalejo, la mochila y la pausa; y debajo,
  la tarjeta de la misión. Se recoge al elegir una misión (queda esa a la vista, con su tarjeta), al usar el catalejo, la
  mochila o la pausa, al tocar fuera o a los 10 s sin tocarla (`esperaPlegar`). Igual en el móvil y en el ordenador.
  La primera versión, del 14 por la mañana, plegaba solo las otras misiones: la flecha con su cuenta, el catalejo, la
  mochila y la pausa seguían fuera, y de pie la barra ocupaba 276 px de los 390 de la pantalla. El autor: «sigue sin estar
  plegada como hablamos». La pausa queda a dos toques. Para verlo: `tools/barra-plegada.mjs`.
  Desde la tarde del 14 se pliega solo con el dedo (`html.tactil`, `style.css`): en el ordenador va siempre entera, con
  todas las misiones, la cuenta, el catalejo, la mochila y la pausa, y cada casilla elige su misión a la primera. El
  autor no veía en el escritorio ni las misiones, ni el catalejo, ni la mochila («tiene que estar la misma barra que en
  el móvil»), y en una pantalla de ordenador la barra entera, unos 660 px, cabe de sobra.
  El 15 vuelve a plegarse en el móvil y en el ordenador, pero el catalejo, la mochila y el menú se ven siempre: «me
  gusta que esté todo plegado, pero obviamente debe haber una flecha que indique que despliega y que pliega» y «quiero
  que sean visibles el icono de la mochila y del catalejo y el del menú, aunque tapen pantalla». Plegada: la misión que
  haces, la flecha con la cuenta (2/7) en una pastilla clara y la cápsula del menú personal; desplegada, la flecha se da
  la vuelta y apunta a la izquierda.
  Ese mismo día, la misión que juegas lleva en su esquina un triángulo de «en juego» (`#misiones button.cur::before`),
  además del aro blanco: «que sea un icono donde se marque qué misión estamos jugando y el resto esté plegado». Y el
  botón de pausa pasa a ser el de menú, con tres rayas (`ICON.menu` en `ui.js`, «Menú (Esc)»): con el símbolo de pausa
  no se veía que abría el menú.
  - También en la aventura de Otsagabia (16 de noviembre de 2026; el autor: «en Ochagavía no sale la barra de misiones.
    Revisa todo por favor»). La aventura tenía su propio recuadro, solo con la misión que seguías y las cintas. Ahora
    `Game` da lo mismo que los pueblos (`barraMisiones`, `missions`, `tracked` y `setBook` en `game/game.js`): las nueve
    misiones en el orden de siempre (`ORDEN_MIS`), cada una con su categoría de color (`Q_CAT` de `data/misionCat.js`), y
    `ui.js` pinta la misma barra (`esBarra`). Tocar una misión que ya está abierta la sigue; las que aún no lo están dicen
    con quién hay que hablar, y la fiesta, que faltan las cintas. Debajo de la barra, pequeñas, las ocho cintas y los
    eguzkilores (`#ribbons.bajo`). Al entrar salía además un error, porque el nombre de la barra se leía del pueblo
    (`game.def`), que la aventura no tiene.
- **Las tarjetas de abajo, con la insignia** (`inicio.js`, `.m3-rail.m3-insig` en `inicio.css`; 13 de noviembre de 2026):
  con el mapa de día, la foto de cada comarca tapaba demasiado. Ahora son tarjetas pequeñas, de 60 px de alto (50 en el
  móvil), en carrusel: la insignia de la comarca (su sello, `stampImg`), su nombre y sus sellos, sobre un velo sin
  desenfoque al 55 %. (La clase no puede llamarse «ins»: ya hay otra con ese nombre que cambia la posición.)
- **Vídeo de la isla** (`src/data/videos-isla.js`, `public/videos/islas/`, `videoIsla`, `quitaVideoIsla` y `tv` en
  `mapa3d.js`, `tools/islas/fotogramas.mjs`; 13 de noviembre de 2026): el autor pidió juntar Higgsfield con lo hecho para
  que el momento en que la tierra se arranca fuera espectacular. La primera vez que se elige una comarca que tiene vídeo, con
  la pantalla tumbada (ancho/alto de 1,3 o más) y si se pueden vídeos (`puedenVideos`), la cámara vuela a la vista con que se
  sacaron sus fotogramas, sin rótulos, con la isla quieta abajo. Cuando el vídeo ya puede reproducirse, se pone encima del
  lienzo, justo donde está el 3D (de alto, o de ancho cerrando un poco la cámara si la pantalla es más ancha que el vídeo), y
  la isla sube detrás. El vídeo empieza en ese mismo fotograma y acaba en el de la isla en el aire, así que al final se funde
  con el 3D muy despacio, en 1,4 s y desde 1,35 s antes del final, sin que se note (el autor pidió que el paso del vídeo
  al 3D fuese muy gradual); después la cámara sube a la vista alta y empieza su vuelo de dron (`sigueDronIsla`). Tocarlo lo salta; si no llega en 4,5 s, la isla sube como siempre. Cada vídeo se hace
  en Higgsfield (MiniMax H3 Max, 5 s, 768p, unos 12,5 créditos) con el primer y el último fotograma sacados del propio mapa
  (`fotogramas.mjs`, a 1280 × 720 por 1,5, que deja también la cámara para `videos-isla.js`), y se recomprime con
  `ffmpeg -an -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -profile:v main -movflags +faststart` (el de Pamplona,
  1,2 MB). Sale a 1344 × 768 (1,75), algo recortado de lado respecto a 16:9 (`ar`). De momento solo Pamplona. Si cambia
  el aspecto de la isla o del mapa, hay que volver a sacar los fotogramas y rehacer el vídeo: su final tiene que ser el 3D.
  En pausa desde el 14 de noviembre de 2026 (`VIDEOS_ISLA_EN_PAUSA`): el de Pamplona se hizo con el mapa de antes, y con
  el suelo real, el cielo nuevo y los bordes orgánicos el fundido enseñaba dos islas distintas. Hay que volver a sacar
  sus fotogramas y rehacerlo cuando el autor dé por bueno el aspecto nuevo.
- **El color de verdad del suelo: la ortofoto** (`tools/relieve/ortofoto.py`, `src/data/mapa-orto.js`, `ORTO_K`, `quiereOrto`
  y `cargaOrto` en `mapa3d.js`, `tonoOrto` en `mapa3dSombreadores.js`; 13 de noviembre de 2026): el autor quería un mapa del
  inicio con calidad casi de mapa real. El relieve tomaba el color de una paleta por alturas, con parcelas, bosque y roca
  pintados a mano; ahora lo toma de la ortofoto del PNOA del Instituto Geográfico Nacional (CC BY 4.0, con su crédito en
  Perfil › Créditos): campos, bosques, ríos, pueblos y roca como son. Se bajaron 2.160 teselas del nivel 13 (unos 14 m) del
  servicio WMTS `pnoa-ma` y se pasaron a la rejilla del mapa: toda Navarra cada 93 m (`orto.webp`, 1600 × 1726, 0,6 MB),
  que se ve siempre, y cada comarca en la rejilla de su relieve de detalle, a 28 m (`hd/orto`, 3,9 MB entre todas) y a 56 m
  (`hd/orto-medio`), que se pide con su relieve de detalle. En el móvil, la de 28 m solo para la comarca elegida y las de
  alrededor ni la ortofoto de cerca ni el relieve a 28 m: así no se pasa de los 80 MB de texturas del iPhone. Encima va
  la luz del relieve, algo más suave (la foto ya trae la suya), y del relieve de detalle solo lo que se aparta de lo de
  alrededor, crestas y barrancos. Lo pintado a mano (parcelas, bosque, roca y el tinte del clima) se apaga con ella
  (`pin`); la nieve, las nubes, los pueblos pintados y el tinte de cada comarca siguen. Para la web y el archivo único, como
  el relieve de detalle (`@orto-full` y `@orto-medio` en `vite.config.js`). Para verlo: `vista.mjs` e `isla.mjs`.
- **El suelo de alrededor, imagen de verdad** (`tools/relieve/fuera.py`; `entorno-sat.webp`, `entorno-sat-medio.webp` y
  `espana-sat.webp` en `src/assets/relieve`; `suelo` en `mapa3d.js`, `TONO_ORTO` en `mapa3dSombreadores.js`; 14 de
  noviembre de 2026): el autor pidió «mejor integración de los mapas reales en el mapa 3D». Navarra llevaba la ortofoto y
  lo de fuera era un relieve pintado, hecho para el mapa de noche: otro dibujo. Ahora lo de fuera también es imagen de
  verdad, del mismo servicio del IGN (WMS «pnoa-ma», CC BY 4.0): su ortoimagen, que solo cubre España, y su capa de
  fondo, el Blue Marble de la NASA, para Francia, Portugal y el mar. Las dos se piden ya en la rejilla del mapa (que es
  lineal en longitud y latitud), el fondo se lleva al tono de la ortoimagen por sus histogramas, canal a canal, en lo
  que las dos cubren, y se juntan con el borde fundido: al cruzar la frontera no cambia el color. El relieve sale de las
  imágenes de antes (`entorno.webp` y `espana.webp`, que se quedan en el repositorio para eso): sus luces y sombras, sin
  su color. El mar, que en el servicio es un morado plano, se pinta de azul, más claro junto a la costa. En el juego, el
  suelo pasa por las mismas cuentas que la ortofoto de Navarra (`tonoOrto` y `acabado`, en valores de pantalla), apenas
  se apaga fuera de Navarra y la sombra junto a su borde es más leve. La niebla del relieve de Navarra usaba el color
  lineal tal cual y salía más oscura que la del suelo y la del cielo: ahora es la misma. Las comarcas que no están
  elegidas guardan casi todo su color (`fv`), y los ríos son de un azul de agua, no de neón. El móvil y el modo sencillo
  usan la imagen de 1.280 px.
- **La ortofoto fina de los pueblos** (`tools/relieve/ortofoto.py pueblos-bajar` y `pueblos-hacer`,
  `tools/relieve/pueblos-lista.mjs`, `src/data/mapa-orto-pueblos.js`, `fotoPueblo` y `pintaNucleo` en `mapa3d.js`; 13 de
  noviembre de 2026): el autor pidió la mayor definición posible, también en el zoom de los pueblos. La ortofoto de la
  comarca va a 28 m por píxel y de cerca se emborronaba bajo el núcleo pintado. Ahora cada pueblo del mapa tiene la suya,
  del PNOA en el nivel 18 (medio metro por píxel): el cuadrado de su núcleo, de lado 2R (R, su radio, casi siempre 700 m),
  centrado en su centro y en sus mismos metros (los de `pueblo-real.py`), a 2.048 px (`hd/orto-pueblos`, 0,68 m por píxel)
  y a 1.024 para el móvil y los equipos flojos (`hd/orto-pueblos-medio`). Se baja con los datos del pueblo, la primera vez
  que se acerca la cámara, y es el suelo del lienzo de su núcleo y del de su maqueta: la foto de verdad, con sus calles,
  sus tejados, sus huertas y su río, sin nada pintado encima salvo, en la maqueta, la sombra de las casas que se levantan.
  Desde el 16 de noviembre de 2026, en la maqueta, además, el empedrado de las calles y las plazas y el asfalto de las
  carreteras («en las maquetas recuerda poner también el suelo empedrado de las calles. No ese amarillo»): `pintaNucleo`
  dibuja aparte una máscara (calles en rojo, carreteras en verde, a la mitad de resolución y con el mismo fundido del
  borde), y el suelo de la maqueta (`RELIEVE_FS` con `CALLES`, `uCalles`, `uCallesR`) pinta encima piedra gris parda en
  adoquines de 90 por 60 cm con sus juntas, solo de cerca, y asfalto gris, con su color fijo. Pintadas en la foto, el
  tono del mapa (`tonoOrto`, `pueC`) y el acabado las volvían pardas o amarillas. Los caminos de tierra, como en la foto.
  Si no hay foto o no llega, el núcleo se pinta como antes. La lista de pueblos con su centro y su radio sale del propio
  juego (`pueblos-lista.mjs`), y el radio de cada imagen va en `mapa-orto-pueblos.js`. En el archivo único no van
  (`@orto-pueblos` apunta a una carpeta vacía en `vite.config.js`).
- **Un solo navegador: la fila de las comarcas** (`enFila` en `inicio.js`; noviembre de 2026): la fila de abajo se queda
  siempre y lleva solo las comarcas. Al elegir una, su tarjeta se enciende y la fila se corre para que se vea; también al
  cambiarla arrastrando el mapa. Los pueblos se eligen en el mapa, en sus medallones, que con una comarca elegida se
  agrandan. La tarjeta elegida dice qué hace otro toque (`.ver`, `.m3-vr`): abrir la página de la comarca. Con un pueblo
  abierto, tocar su comarca vuelve a ella entera. A toda Navarra, con la casa o Escape; Escape, con un pueblo, vuelve a su
  comarca. La ficha del pueblo en el mapa va siempre encima de la fila. Una primera versión tenía unas migas arriba, con
  flechas, y otra abría los pueblos de la comarca en la misma fila, detrás de ella (`.m3-hijos`): eran dos navegadores
  para lo mismo y se quitaron. También se probaron pestañas finas, solo con el sello y el nombre: gustaban más las
  tarjetas, con su foto y sus misiones.
  La página de cada comarca lleva a los lados de su nombre la anterior y la siguiente (`vecinas` en `hub.js`, también con Q
  y E), y la ficha de cada pueblo, arriba a la izquierda, el anterior y el siguiente de su comarca con cuál es (`.fh-nav`).
  En la barra de arriba de la ventana, cada lado lleva una flecha en su círculo (`FLECHA` en `hub.js`, `.cab-fl` en
  `consola.css`), igual en el ordenador y en el móvil; Q y E siguen valiendo y salen al pasar el ratón. Hasta el 13 de
  noviembre de 2026, en el ordenador se dibujaban las teclas Q y E, y el autor prefería flechas, que entiende todo el mundo.
- **Las colecciones en el mapa** (`coleccionMapa.js`, `modoColeccion` en `inicio.js`, `coleccion` y `encuadra` en
  `mapa3d.js`; noviembre de 2026): al abrir Naturaleza, Escudos o Personajes desde el menú del juego, en lugar
  de su ventana se queda el mapa con su colección. Arriba, su cabecera con cuántas llevas, sus pestañas, «Lista» (la
  pantalla de siempre) y cerrar; abajo, sus tarjetas en lugar de las comarcas; y en el mapa, cada sitio con lo suyo: las
  especies en sus comarcas; los escudos, los personajes y las figuras de leyenda y de carnaval en sus pueblos. Tocar una
  tarjeta enseña dónde está, con sus comarcas en primer plano y la cámara encima; tocarla otra vez abre su ficha. Torneos
  se probó en el mapa y el autor lo quiso en su pantalla de siempre, con las dos cartas bien claras: «Torneo de pelota» y
  «Torneo de fútbol», y el botón de cada una dice a qué se juega («Jugar a pelota», «Jugar al fútbol»; en el móvil
  tumbado más estrecho, solo «Jugar», para que quepan el frontón y el club). Tocar un sitio deja abajo solo lo suyo. Lo bloqueado sale con su candado y su pista. El hub
  sigue con `data-screen="home"` y la colección en `data-col`, así el mapa se pinta y vale todo lo del inicio. Lo que no
  tiene sitio en el mapa solo sale en la lista. En el material didáctico, las pantallas de siempre.
- **El torneo, sin nada cortado ni montado** (`torneoPanel` y su CSS en `game/torneo.js`; noviembre de 2026): en el iPhone
  tumbado, el cuadro de dieciséis se montaba encima de la barra y del frontón, las cartas se cortaban y el título se iba
  por arriba. Ahora, tumbado, la tarjeta ocupa todo el alto y la rejilla tiene tres zonas (`grid-template-areas`): la
  cabecera arriba, con el frontón (`.tq-sitio`) junto a «?»; debajo, a la izquierda, el partido y bajo él la barra (Salir y
  la acción); y a la derecha, el cuadro desde la cabecera hasta abajo, sin rótulo encima si no hay pestañas. De pie, una
  columna con la barra pegada abajo. Las cartas del partido y la del campeón las mide `cartas()` con el sitio real de su
  panel (el ancho junto al VS y, tumbado, el alto con aire para flotar), con un `ResizeObserver`; antes salían de fórmulas
  con el tamaño de la ventana, que no sabían de la muesca ni de la barra de inicio. Cada eliminatoria, del ancho de su
  columna (`grid-template-columns:minmax(0,1fr)` en `.tq-m`): la casilla se ensanchaba con el nombre y los tantos quedaban
  fuera, cortados. El cuadro de dieciséis, con sus cuatro columnas iguales y las filas a la medida de su letra en el móvil
  tumbado; el campeón, con la carta junto a su texto. Comprobado con un medidor de cajas (nada fuera de su panel ni de la
  pantalla, nada recortado por su caja, bloques sin pisarse, textos enteros y la tarjeta sin desplazarse tumbada) en los tres
  campeonatos y todas sus rondas (liguilla, cuadro, final, eliminado y campeón), con la muesca y la barra de inicio del
  iPhone simuladas, en 812 × 375, 844 × 390, 852 × 393, 932 × 430, 667 × 375, 740 × 360, 915 × 412, 640 × 360, de pie y en
  el ordenador. En 568 × 320 (iPhone SE de 2016) el cuadro de dieciséis no cabe y se desplaza dentro de su panel. Ya no
  hay banda sesgada azul y rosa detrás de las cartas: en el ordenador se veía como dos rectángulos oscuros sin sentido.
  Entre las cartas y el VS, 16 px a cada lado (12 en el móvil tumbado estrecho); bajo el VS, a cuántos tantos en dos
  líneas y sin caja (`.tq-a`): con su caja de etiqueta era más ancho que el hueco y pisaba el borde de las dos cartas.
- **La liga de fútbol, igual** (`ligaPanel` y `roundPanel` en `futbol/liga.js`; noviembre de 2026): tumbado, en cualquier
  tamaño, la tarjeta a todo el alto con la cabecera arriba, el partido o los resultados a la izquierda con la barra debajo y
  la clasificación a la derecha de arriba abajo (en el iPhone con muesca no cabía y la barra, pegada abajo, tapaba la
  última fila y la comparativa; en el iPad iba en una columna). Los jugadores a los lados del partido, solo si el panel
  mide más de 440 px (consulta de contenedor en `.lg-match`): si no, «Fuera de casa» se montaba encima de la media. Con
  la barra estrecha, «Simular» a secas (`.lg-l` y `.lg-c`, consulta de contenedor en la barra). Comprobado con el mismo
  medidor (`pantallas.mjs`): menú de pelota, club, liga al empezar, a media temporada y al acabar, jornada, elegir rival y
  elegir club, en los mismos tamaños.
- **Las sierras de alrededor, de verdad** (`world/sierras.js`, `src/data/sierras/<pueblo>.js`, `tools/relieve/sierras.mjs`;
  noviembre de 2026): el horizonte real de cada pueblo ya estaba en los datos, pero se dibujaba como un anillo a 1,2-1,5 km, a
  media altura y justo donde la niebla ya era total: en Altsasu no se veía Urbasa y la Ribera parecía un mar blanco. Ahora,
  detrás del relieve del pueblo (que llega de verdad hasta 1,5 km), una malla polar con las alturas reales de 1,4 a 48 km
  (40 anillos, cada grado; EU-DEM en teselas de nivel 10), cosida al borde del terreno (`alturaLejos` en `terrain.js`). Lo
  lejano se acerca (a 48 km, unos 5,5 km en el juego) y baja en la misma proporción: desde la plaza cada sierra se ve en su
  sitio y con su ángulo de verdad. Más allá de 48 km, la silueta de lo que asoma (la Demanda desde Viana, el Pirineo francés
  desde Isaba). Con la luz del sol y del cielo del momento (normales de la pendiente real), color según la altitud, la
  pendiente y la comarca (prados, bosque a manchas, campos en el llano del sur, caliza, el yeso de las Bardenas y nieve solo
  por encima de 2150 m) y el aire de en medio, más azul cuanto más lejos y nunca un blanco del todo. En esos pueblos la
  niebla de la escena va de 220 a 4200 m (antes de 160 a 1500) y la cámara ve hasta 7 km. Unos 12 KB por pueblo, cargados
  solo en su pueblo. Sin la malla en los frontones sin suelo y en la vista corta de los ordenadores flojos.
- **Elegir personaje en el móvil tumbado** (`hub.css`, `.csel2` en `max-height: 430px`): con la muesca y la barra de inicio del
  iPhone a la habilidad especial le faltaban 35 px y su texto quedaba cortado debajo de «Jugar». Ahora, el nombre un punto
  menor, la media algo más pequeña, sin la línea del pueblo y con menos aire entre bloques: cabe entera en 667 × 375, 812 ×
  375, 844 × 390 y 932 × 430. Las pantallas del inicio se comprueban con `hub.mjs`, que simula la muesca de verdad
  (`Emulation.setSafeAreaInsetsOverride`, el `env(safe-area-inset-*)` del teléfono) y no cuenta lo tapado por otra tarjeta.
- **Otsagabia, con su relieve de verdad alrededor** (`load` en `engine/runtime.js`; `rawHeight` en `levels/salazar.js`): su valle
  sigue hecho a mano, pero ya no lo cierra una muralla de picos grises dentados y nevados (crestas de ruido de 170 m y el
  anillo de montes de siempre, con la nieve en metros del juego). Ahora las laderas del borde son lomas redondeadas y
  boscosas, detrás van las sierras de verdad (`world/sierras.js`) y la nieve y la roca van a su altitud real (la plaza, a
  765 m: `ALT0` y `sierras` en una copia del módulo del nivel, que no se deja modificar).
- **Lo que falta de voz y de personajes en Otsagabia** (`entrega/voces-ochagavia-pendientes.md`, recontado el 16 de
  noviembre de 2026 por la noche contra `dialogFor` de `game/game.js` y el manifiesto): las frases fijas de las misiones
  tienen todas su grabación; sin voz quedan las que llevan una cuenta o un nombre (unas 120 grabaciones cortas, una por
  número), los paseantes y, a falta de aprobar sus voces nuevas, Maite e Itziar. La Lamia, el Basajaun, el Bobo, el
  Zarratrako y los danzantes de Muskilda siguen con el cuerpo antiguo (`COSTUME` en `actors/npcGlb.js`).
- **Isla: frondosidad sin árboles, raíces y musgo en 3D** (16 de noviembre de 2026; `ARBOLES_ISLA` en `hub/mapa3d.js`,
  «la frondosidad» de `RELIEVE_FS` en `hub/mapa3dSombreadores.js`, `ponColgantes` en `hub/mapa3dIsla.js`): el autor no quería
  árboles de polígonos en la isla («desde el ángulo de la cámara no se verían árboles, se vería frondosidad») y veía el musgo
  del costado pegado, sin raíces. En el aire la isla ya no lleva árboles (tampoco se construye el bosque denso, que costaba
  unos 300 ms al elegir el Pirineo); el terreno pinta, donde la máscara dice bosque, una masa de copas con su lado al sol, su
  sombra y huecos, a un tamaño de pantalla fijo que se funde entre dos escalas. El musgo pintado de la panza baja al 22 %.
  Bajo el filo de la hierba cuelgan raíces (tubos que se afinan, una de cada cuatro largas) y matas de musgo (briznas en
  estrella), instanciadas, que se apartan un poco de la roca y se mecen con el aire en el vértice.
  - Borde roto en vez de peine (17 de noviembre de 2026). El autor: «se nota que está apegado, se nota que no es 3D», «no
    cuelgan raíces tampoco con movimiento», «que todo parezca que es de la misma pieza, que es orgánico, que realmente se
    ha roto». De lado, las raíces eran un peine de palos oscuros iguales, una cada cuarto de unidad, y de cerca las largas
    bajaban casi toda la isla como postes. Ahora salen en mechones donde dice un ruido a lo largo del borde, con huecos entre
    medias: casi todas cortas, alguna larga de hasta 1,3 unidades, finas, del color de la tierra y cada una torcida a su
    manera (`aC` en el vértice), con raicillas de tres caras alrededor. Las matas de musgo son romas, más cortas y claras, y
    van donde no hay raíces. Bajo la hierba asoman terrones (`terrones`, bolas de veinte caras deformadas con ruido, tierra
    con grano, alguna piedra y hierba arriba), medio salidos del canto y algunos ya caídos un poco, como si el borde se
    hubiera roto al arrancar la isla. La roca de la panza ya no lleva musgo pintado (`uMusgo` a 0): en su lugar, bajo la
    hierba, una franja de tierra negra de grosor desigual (`uHumus`), para que se lea un pedazo de suelo arrancado y no una
    roca con césped encima. Unos 55.000 triángulos más en la isla elegida.
  - La isla, del color del mapa (17 de noviembre de 2026; `uGris` y `uBrillo` de cada comarca en el bucle de `hub/mapa3d.js`).
    El autor: «hay que integrar mejor el mapa con la maqueta». Medido en Sakana: la isla en el aire iba un 32 % más clara que
    las comarcas de alrededor (`uBrillo` 1,17 frente a 0,88) y con mucho más color (`uGris` −0,11 frente a 0,22), un verde
    chillón al lado de la foto apagada, como una pieza de otro juego puesta encima. Ahora la isla sube solo un poco de luz y
    de color al levantarse (0,08 y 0,05 por cada unidad de `lift`, antes 0,24 y 0,18) y las de alrededor, con el cielo de
    día, se apagan la mitad que antes (`fv` con 0,88 en vez de 0,78): la isla manda, pero es el mismo terreno.
  - El hueco, el molde de la panza (17 de noviembre de 2026; la pared del molde en `hazIsla`, `hub/mapa3dIsla.js`): la pared
    del hueco era una hondonada con hierba por casi toda ella (`uMusgo` hasta 3,2 unidades, de un verde vivo), un embudo verde
    con rayas pardas debajo de una panza de tierra que acababa de salir de él. Ahora es la misma tierra rota que la panza: la
    franja de tierra negra bajo el borde (`uHumus`, como en la panza), estratos más oscuros cuanto más hondo y solo un fleco de
    hierba de un verde apagado en lo alto (`uMusgo` de 0,35 a 0,9). Los materiales de la panza y de la pared se vuelven a
    soltar al cambiar de isla (`mats.push`, que se había quedado dentro de un comentario).
  - El borde, de cerca (17 de noviembre de 2026, por la mañana; `piedraG`, `mataG`, `TERRON` y `colgF` en
    `hub/mapa3dIsla.js`). Las piedras que flotan y caen eran dodecaedros de doce caras planas, grises y con brillo propio:
    ahora son cantos de 80 caras con los vértices compartidos, deformados con ruido, de caliza con vetas y tierra pegada por
    abajo. Las matas eran estrellas de cinco hojas anchas, que de lado parecían colmillos verdes: ahora son once briznas
    finas que salen de puntos distintos y se abren al colgar, de un verde más apagado, y algunas más. Los terrones, que
    asomaban como setas pardas pegadas, son más pequeños, menos, más metidos en el canto y del color de la tierra negra de
    la franja de arriba. Las raíces salían casi negras, como estacas: su sombreador aplicaba la luz sobre el color de
    pantalla y no lo pasaba a la salida como la roca (`linearToOutputTexel`); ahora cuelgan como hebras pálidas de tierra.
  - Alrededor de la maqueta de un pueblo (17 de noviembre de 2026; al final del grano fino de `RELIEVE_FS`,
    `hub/mapa3dSombreadores.js`): la foto fina de la comarca es de 28 m por punto y, al acercarse a un pueblo, cada punto
    ocupa varios píxeles de pantalla; junto a las casas nítidas el prado era una mancha verde lisa y clara y la maqueta
    parecía puesta encima. Ahora, en cuanto la foto se estira (más de 1,3 píxeles por punto, a tope desde 4), se le suma un
    grano de prado en tres tamaños, de unos 20, 7 y 2,5 m, y matas algo más hondas en lo verde. Solo con la foto fina
    cargada y fuera del modo ligero del ordenador.
- **Charcas con orilla y dique** (`orillaCharca` en `levels/charca.js`, para la balsa de Irati de Otsagabia y las charcas
  del bosque de `levels/town.js`; `ORILLA` en `world/water.js`; `waterLevelAt` en `world/heightfield.js`): el agua tiene un
  nivel fijo y la ladera no. Antes el terreno solo se rebajaba, y por el lado que baja de la balsa de Irati el suelo quedaba
  hasta 6 m por debajo del agua: el disco del agua se veía como una lámina en el aire, y la lamia, en la orilla oeste,
  estaba a 1 m por debajo del agua. El juego trataba esa zona como agua honda hasta 8 m más allá del borde, así que desde el
  sur el jugador se quedaba parado a 6,5 m de ella y desde el oeste llegaba vadeando en seco (captura del autor del 16 de
  noviembre de 2026). Ahora dentro hay un cuenco 1,6 m por debajo del agua y la orilla, con algo de ruido, queda 0,45 m por
  encima. Por el lado alto la ladera se rebaja hasta esa orilla. Por el lado bajo se levanta un dique de tierra, llano hasta
  5 m del agua y luego en talud de 0,35. El disco del agua llega solo 1,2 m más allá de la charca, ya bajo la tierra, y el
  agua para el jugador, 2 m. Alrededor de la lamia hay un claro sin árboles (`PLACES.clearings`). Comprobado andando hacia
  ella desde el oeste, el norte y el sur: llega a 2 m, sin vadear, con «Hablar con Lamia».
- **La cascada de la balsa de Irati, peña y agua nuevas** (`buildWaterfall` en `world/landmarks.js`, `Waterfall` en `fx.js`,
  16 de noviembre de 2026, noche; el autor: «esa cascada es un horror»): la roca son cinco peñascos de roca natural, esferas
  de muchos triángulos aplastadas y rotas con ruido en dos tamaños (grietas, repisas), a los lados del canal, detrás del agua
  y en los hombros; nada de bolas apiladas. El agua son tres láminas de distinto ancho y velocidad, con hilos blancos, que se
  abren al caer; al pie, una poza de espuma que hierve y más rocío.
- **Cascada de la lamia en anfiteatro de roca con musgo** (`buildWaterfall` en `world/landmarks.js`, material `rockMoss`
  en `world/builder.js`, `Waterfall` en `fx.js` y la peña en `rawHeight` de `levels/salazar.js`; 17 de noviembre de 2026, el
  autor otra vez: «la cascada de la lamia es un horror»): la peña sube a 10,5 m y son siete peñascos de caliza en
  anfiteatro, los dos lados del canal, la pared de detrás del agua, los hombros y las alas que bajan a la ladera. Cada uno
  es una esfera con los vértices compartidos (con `mergeVertices`; la de three trae los triángulos sueltos y la luz la
  pintaba en facetas), ensanchada abajo, con estratos en repisas y el color en cada vértice: caliza clara con vetas, musgo
  en lo que mira arriba, en lo alto y en el pie, y la cara que da al agua mojada y más oscura. Las coordenadas del relieve
  van de lado y en alto, sin costuras. El agua es más ancha, cuatro láminas con un hilo aparte a un lado, la poza de espuma
  de 4,6 m y más rocío. La ladera de detrás sube hasta 10,4 m sobre la balsa para que el salto salga de ella.
- **La cascada de la balsa de Irati, en la orilla** (`buildWaterfall` en `world/landmarks.js`; `PLACES.waterfall` y la peña
  en `rawHeight` de `levels/salazar.js`): antes el salto, de 9 m, caía sobre la hierba, a 4 m del agua, desde una caja de
  16 × 15 m con la textura de los muros de piedra, más alta que la ladera de detrás. Ahora está en la orilla y cae en la
  balsa, desde 7 m. Detrás, la ladera sube hasta el labio del salto en unos 8 m, sin entrar en el agua. A los lados del canal
  van bloques de roca natural (`rock`, con su relieve) y otros medio hundidos en la ladera, a la altura del suelo.
- **Orillas en talud** (`finalHeight` en `levels/townReal.js`): fuera del casco, el ancho de la orilla crece con lo alto que
  queda la ladera sobre el agua (1,6 veces el desnivel, entre 4,5 y 30 m; el río se busca hasta 36 m, `riverAt`). Antes, con
  4,5 m fijos, donde el río va al pie de un monte, como en Ituren, el cauce cortaba la ladera en un muro de roca gris.
- **Nieve y roca por altitud real** (`cota` en `world/terrain.js`; `ALT0` del pueblo en `levels/townReal.js`): en los pueblos
  con su relieve de verdad, la nieve (2150 m), la roca, los pastos de altura y el bosque van en metros de altitud real, no del
  juego. Antes, en Isaba, a 809 m, las lomas de 950 m salían nevadas.
- **Pueblos más alegres** (noviembre de 2026; comparado vista a vista con lo de antes en Lesaka y en Tudela y Olite): banderines
  de fiesta cruzando la plaza de cada pueblo (`world/fiestas.js`: cuerdas de banderitas de colores colgadas de fachada a
  fachada, entre casas que dan a la plaza, a unos 5 m y siempre por encima de 3,8 m; una malla y un material); en el casco,
  más revoco de color y menos piedra gris (`MUROS` en `world/townReal.js`: la cal blanca en la vertiente atlántica y los
  ocres, cremas y rosas hacia el sur); y macetas con flores en siete de cada diez casas (antes, algo más de la mitad).
- **Colores de las misiones:** cada misión lleva el color de su categoría (`CAT` y `CAT_COLOR` en `data/misionCat.js`, variable
  `--mc`) en la ficha del mapa, en la lista de la ficha del pueblo y en las tarjetas: patrimonio, amarillo; oficios y
  productos, rojo anaranjado; campo y naturaleza, verde; fiestas, rosa; leyendas, violeta; preguntas, azul; deporte y
  monte, turquesa. Sin hacer, un tinte y el borde; hecha, llena de su color; la siguiente, borde blanco. La marca de
  hecha, en cambio, es siempre la misma en todo el juego: el check verde en su círculo amarillo, sin colores de categoría.
  Los cuatro botones del menú de pelota llevan los pelotaris del autor (ver abajo): en el torneo, tu rival de la ronda;
  por parejas, la pareja rival; en el partido libre, tú, de azul; en la colección, los tres últimos que has conocido,
  en abanico. Las ilustraciones de antes siguen en `src/assets/pelota`, sin cargarse.
- **Pelotaris del autor** (`src/ui/pelotariFig.js`, `src/assets/pelotaris`): 22 chicos y chicas de cuerpo entero, de
  azul y de rojo, para las cartas, la pantalla VS, la colección, el cuadro del torneo y las portadas de pelota. Cada
  nombre de la plantilla tiene su figura (los rivales y compañeros salen de ella; Iñigo es el protagonista) y otro
  nombre toma una del mismo género, siempre la misma. Cada pueblo tiene su pelotari fijo en el frontón
  (`townPelotari`), que es el de su carta en la colección. La web lleva los de 512 de los dos colores; el archivo único,
  el rojo de 256 y la camiseta azul suelta. La figura es siempre una sola imagen (`img.pf`): en el archivo único, la
  azul es la camiseta con el rojo de fondo de esa misma imagen (`.pf-az` en `sport.css`). Con dos imágenes una encima de
  otra, Safari en el iPhone dejaba la camiseta suelta a un lado; en las portadas del menú, cada figura va con posición
  absoluta dentro de su caja. En la web, la pantalla VS lleva además los de 1024 (`big` en `pelotariFig`). Las figuras
  miran a su izquierda: en la pantalla VS solo se gira la roja. Cada uno lleva en 3D el pelo de su figura
  (`pelotariHair`: el rubio Mikel, la pelirroja Leire…), con el tinte de abajo.
- **Pelo de otro color** (`src/actors/hairColor.js`): los personajes de Meshy traen todos el pelo castaño oscuro
  pintado en su textura y se tiñe en el material, encadenado al sombreador que ya tengan (la ropa de los vecinos, las
  equipaciones, la sombra de la cubierta de El Sadar). El pelo es lo castaño de la cabeza fuera de la cara: la cara es la
  franja de delante bajo las cejas, así los ojos (el iris también es castaño), las pestañas y la boca no cambian; en el
  pastor, lo que queda bajo el ala de la boina. Los colores (`HAIR_COLORS`: negro, castaño, castaño claro, cobrizo,
  pelirrojo, rubio oscuro, rubio, canoso y blanco) se dan como se quieren ver y se pasan al de la textura, que con la
  luz del juego se aclara mucho. Lo llevan los vecinos (el `hair` de su «look»), los futbolistas (uno por dorsal y
  equipo, `hairFor`) y los pelotaris rivales y compañeros. En las chicas, el pelo va en sus propias mallas
  (`userData.peloColor`): su textura es gris y el color lo pone el material (`peloMaterial`, con el brillo propio de
  `peloEmisivo`); lo pintado debajo se tiñe igual, con el brillo de referencia de la chica (`hairRef`). Las medidas
  salen de `tools/pelo/zonas.mjs` y se revisan con `tools/pelo/ver.mjs`.
- **Trajes de carnaval y de leyenda** (`src/actors/trajes.js`): la indumentaria de los personajes con traje, hecha
  según las fuentes de cada uno (anotadas junto a cada traje: el Museo del Traje y el Museo Etnológico de Navarra para
  los joaldunak, las crónicas de Altsasu para los momotxorros, el programa de Aoiz para los cascabobos, el de Vidángoz
  para los zipoteros…; de iraskos y palokis, lo que dice el propio juego). Va sobre el personaje de Meshy de cada traje
  (`TRAJES[id].model`), con su ropa pintada de los colores del traje (`ropa`, con `outfitTint`), y `vestirTraje` le cose
  las prendas: lo ceñido (pieles, sábanas, calzones, capuchas, caretas, el pelo de Basajaun) son los triángulos del
  propio cuerpo hinchados hacia fuera con sus mismos huesos (`ceñida`); las faldas, enaguas y faldones van en campana
  desde la cadera y hacia el bajo siguen a cada pierna (`campana`), y las esclavinas y chales, del pecho; melenas y
  barbas son tiras que bajan rozando el cuerpo, de la cabeza al pecho (`cortina`); lo rígido (ttuntturro, joareak,
  cestas con cuernos, cabezudos, sombreros de picos, herramientas en la mano) cuelga de su hueso. Las caretas, el antifaz
  y los trapos de la cara se pintan en una proyección de frente con los agujeros donde están los ojos del modelo, que se
  ven a través. Todas las texturas se pintan al vuelo en un lienzo: no ocupan imágenes. Los «looks» de `FOLK`
  (townGame) llevan `traje`, y los seres de leyenda lo toman de su `myth`. Se revisan con `tools/trajes/ver.mjs`
  (de frente, de espaldas, la cara de cerca y andando de lado) y `tools/trajes/hoja.py`.
  Para que la ropa vaya pegada al cuerpo y no parezca un añadido:
  - **Bordes limpios**: `ceñida` acepta en vez de sí o no un número con signo (dentro, fuera) y recorta los
    triángulos por donde cruzan el borde; el dobladillo engorda junto a él. Las aberturas de la cara (`sinCara`) y el
    nacimiento del pelo (`frentePelo`, redondeado por las sienes) se dan así.
  - **Capuchas, tocas y pañuelos a la medida del cráneo** (`ajustada`): el pelo de punta del modelo se aplasta contra
    el cráneo en el sombreador (`aplanarPelo`, que respeta siempre ojos y párpados) y la prenda va sobre él (`lisa`); lo
    que sobresale junto a la cara se lleva al cráneo, y lo que sigue al cuerpo se alisa (`alisar`: cada punto hacia la
    media de sus vecinos, con su normal rehecha; los triángulos que quedan del revés se quitan). La textura va por donde
    queda la prenda, así las capas coinciden sin manchas. La careta, igual por la frente (`frenteLisa`).
  - **Faldas que siguen al cuerpo** (`campana`): el perfil va en tramos de 0,03 y cada anillo se ajusta al contorno del
    cuerpo en su ángulo (`polar`/`radio`, también los pies abajo); bajo la rodilla, el bajo va también con la espinilla,
    y en medio, delante y detrás, menos con las piernas (no se mete entre ellas). Las faldas largas llegan al tobillo,
    con botines (`zapatos`) o los pies de pato de la lamia. El ribete del bajo lleva los mismos pliegues (`rango`).
  - **Volumen**: relieves de tela con mapas de normales (`relieve`: trama, pliegues, arrugas, saco), la tela tejida en
    sarga (`tejido`) y las abarcas con su lana y sus correas (`abarcas`). Melenas y barbas bajan rozando el cráneo cuando
    el pelo de debajo está aplastado (`rCraneo`).
- **Chicas** (`src/actors/chicas.js`): los personajes de Meshy son todos chicos; las chicas son el mismo modelo con la
  cabeza rehecha en Blender (`tools/blender/chicas`): el cráneo liso sin el pelo de chico (`cabeza.py`), el nacimiento
  del pelo (`nacimiento.py`), la textura repintada (`textura.py`: castaño bajo el pelo, del tono del pelo, para la nuca y
  detrás de las orejas; piel en la frente, las sienes y las patillas, fundida con la de alrededor; cejas finas,
  pestañas pintadas con tres sueltas en el rabillo y labios) y su peinado (`pelo.py`: la coleta con su goma y tres
  huesos, `Hair_1..3`, que `glbChar.js` mueve como muelles; la nariz, más pequeña). No va otro modelo entero:
  `tools/chicas/parche.mjs` guarda lo que cambia sobre el chico (los vértices que se mueven, cambian de normal o de UV y
  unos pocos nuevos, comprimidos con el códec de vértices de meshopt; la textura repintada, solo lo que cambia, en una
  capa webp con transparencia a la resolución de cada versión) y el pelo en su GLB. En el juego, `loadChica` lo monta
  sobre el chico ya cargado y se usa como cualquier personaje de Meshy (sus animaciones, su escala). La versión ligera
  se casa con la del chico vértice a vértice: los vértices partidos toman la UV más parecida a la suya y las capas del
  pelo de chico que quedan bajo la piel se hunden un poco. En el juego van la futbolista y la pelotari completas
  (fútbol y frontón) y la sanferminera ligera (vecinas, corredoras del encierro y trajes de lamia y sorgina, estas sin
  peinado: el pelo o la toca los pone el traje). Las vecinas llevan falda y delantal cosidos al cuerpo
  (`falda` de `trajes.js`). Todo se rehace con `tools/chicas/construir.sh <modelo> coleta <carpeta>` y se revisa con
  `tools/chicas/ver.mjs` (el chico, la chica y la ligera, de cerca; DIST, SOLA, OCULTA, PELO) y `tools/chicas/vecinas.mjs`.
- **Chicas y chicos en el fútbol** (`src/game/futbol.js`): la mitad de los jugadores y un tercio de los árbitros son
  chicas, por dorsal y equipo (un número fijo, mezclado con `mix` para que salgan repartidas), con la futbolista de
  `chicas.js` (la del equipo visitante, teñida de su equipación) y la goma del color del equipo. Se revisan con
  `tools/futbol/jugadoras.mjs` (SOLA=1 para verla sola). Las corredoras del encierro (`encierro.js`), las pelotaris
  rivales y compañeras (`rigPelotari` en `fronton.js`, de colorado en el lado rojo) y las vecinas también son chicas.
- **Caravinagre fuera**: no sale en Pamplona ni en ningún sitio; las partidas guardadas pasan solas a la lista de
  misiones de Pamplona sin él (`mig.pamplona1` en `profile.js`).
- **Jugadores de fútbol del autor** (`src/futbol/jugadorFig.js`, `src/assets/jugadores`): un chico y una chica por
  equipación, de cuerpo entero (1024 × 1536), su busto (360 × 480, `jugadorBusto`) y la pareja de los dos juntos
  (`jugadorDuo`: a su alto completo, unos 1.040 px, para la pantalla VS y 480 para los menús); el visitante, con la segunda equipación blanca o
  azul marino (`duoId`). Solo en la web: en el archivo único no caben nítidos y siguen las camisetas dibujadas
  (`kitSvgOf`).
  - **VS de equipo:** cada equipo sale con su pareja; la del rival, girada.
- **Composición de la pantalla VS** (`layoutVs` en `src/pelota/vs.js`, la misma para pelota y fútbol): se mide en cada
  pantalla al abrirla, al cargar las imágenes y las letras y al girar el móvil. En horizontal, una columna central tan
  ancha como el VS y las etiquetas (en columna si así deja más sitio); la línea del partido sube a la barra de arriba si
  cabe en una fila. Cada bando, lo más grande que cabe en su lado sin pisar esa columna, los dos a la misma altura, con
  la cabeza bajo la barra de arriba o, si no llega abajo, de pie sobre la barra de abajo. Ninguna placa tapa una cara
  (`FACE`: hasta dónde llega la cara en la imagen). En pelota por parejas, la figura delantera junto al centro y el
  compañero detrás, algo más pequeño (`MS`), hacia fuera: puede salirse del borde, pero no su cara. En vertical, arriba
  los azules y abajo los colorados, partidos por una diagonal con el VS en medio, cada placa sobre la cintura de los
  suyos y las etiquetas bajo la barra de arriba. Las placas, del ancho de su texto, sin hueco oscuro de más. La prueba
  visual: una página que solo abre la VS con figuras reales.
  - **Portadas de equipo** (`liga.js`, clases `eq-`, que no chocan con las del marcador del partido, `fb-`): el menú del
    club en losas como el de pelota (la liga con tu pareja, el amistoso con la de un club del otro grupo que cambia
    cada día, el partido rápido con Iruña, el del sello con los vecinos y cambiar de club con tres bustos en abanico);
    elegir club y rival en cartas que se pasan de lado (en vertical, hacia abajo), con escudo, media, grupo y pueblo o
    campo; y el campeón de la liga con su pareja.
  - La caja del próximo partido de la liga lleva los bustos; en el móvil de pie, sin bustos, que no caben.
- **Nitidez** (`tools/nitidez.mjs`): cada imagen a la vista en el iPhone 12 tumbado (densidad 3) se mide por los píxeles
  de pantalla que le tocan a cada píxel suyo; más de 1,5, pixelada, y de 1,2 a 1,5, blanda. Para la web: copias
  pequeñas de las láminas de 640 × 360, cimas de 1024, fauna de 512 en las tarjetas, retrato del perfil de 512 × 768
  (`src/assets/meshy/portraits/web`, alias `@retratos`) y pelotaris y jugadores de 1024 en la VS. Lo único que sigue
  blando son las portadas grandes, porque el autor entregó las láminas a 1280 × 720.
- **Sellos de comarca:** los 12 del autor (`src/assets/sellos`, `stampImg` en `src/assets.js`), en el pasaporte, el
  mapa, las comarcas, las tarjetas de pueblo y el pueblo completado; `src/ui/art.js` los dibuja si faltara alguno. En el
  aro de arriba llevan el nombre del juego, HERRIZHERRI (`tools/sellos-nombre.mjs`).
- **Iconografía de una sola familia:** un archivo `src/assets/icons3d/256/<nombre>.webp` (y sus copias de `512/` y `128/`)
  sustituye al icono de ese nombre sin tocar el código (`has3D` mira también los archivos horneados).
  - Son los 182 iconos 3D del autor (los 165 nombres de `ICONS` en `src/ui/icons.js` y 17 controles: los del fútbol,
    pausa, cámara y los del mapa), recortados y centrados con el mismo margen: el lado mayor ocupa el 89 % del cuadro.
    La web los lleva a 256 px (`icons3d/256`, alias `@icons3d`) y además a 512 (`icons3d/512`, `@icons3d-big`) y los
    instrumentos a 1024 (`icons3d/1024`, `@icons3d-huge`), que `src/web/hd.js` pide cuando el icono se ve más grande de lo
    que mide (fichas, pantallas densas); el archivo único, la copia de 128 px de `icons3d/128`, por peso, y con conexión
    sube a las de la web. Los de 512 salen de los 512 del autor (los que tenían que crecer para llenar el 89 %, de una
    ampliación ×2 con Real-ESRGAN), los instrumentos de sus PNG de 1254, los nueve de las láminas de octubre (boot,
    fullscreen, globe, info, key, mute, retry, search, sound) de sus celdas ampliadas ×2 y los siete renders del juego de
    `tools/iconbake.mjs` a 512. La serie anterior de 192 se guarda en `icons3d/192` sin usarse. La lista del autor está
    en `icons3d/LICENSE_iconos-autor.txt` y `tools/iconbake.mjs` no la vuelve a hornear.
  - Los usan también los botones del HUD y los táctiles (`ICON` en `ui.js`: correr, saltar y, en el de acción, la
    mano, hablar, beber, la lupa para mirar y pelota), la X de la pelota y los botones del mapa (centrar y
    viajar; acercar y alejar llevan solo un «+» y un «−» de trazo blanco, `.mapctl .zm`, en vez de las lupas, noviembre
    de 2026). Sobre el degradado de los botones principales llevan un contorno oscuro fino.
  - El fútbol no: sus botones, la pausa, la cámara y la pantalla de controles llevan los símbolos de trazo de los
    controles del autor (`ICON` en `futbol/hud.js`), sobre botones redondos y planos de color sólido, sin el canto de abajo ni los brillos de dentro, como los del pueblo (noviembre de 2026; antes, con relieve) (tiro fucsia, pase azul,
    cambiar marrón, el resto morado; con tu portero, turquesa). Sus 13 iconos 3D siguen en la carpeta sin cargarse.
  - Un animal con dos nombres usa el icono del autor (`SAME` en `icon3d.js`: águila, ardilla, jabalí, buitre, cigüeña,
    ciervo, trucha, zorro, pottoka y pito); sus renders de antes siguen en la carpeta sin cargarse. Los pocos que el
    autor no ha dibujado (corzo, grulla, lechuza, milano, quebrantahuesos, cabra) son renders del juego.
- **Nada en sitios imposibles** (noviembre de 2026, tras la plaza de Roncal): ningún árbol en el agua ni a menos de 1,5 m
  del cauce, venga de donde venga (`treeSpots` en `world/nature.js`: los de los linderos y los frutales no lo miraban y
  dos salían del Esca al pie del muro). Los puestos del día de mercado (`game/mercado.js`), solo en suelo llano, con la
  mesa, los postes y quien vende detrás a menos de 30 cm de diferencia, y a 2,5 m del cauce como poco. Las personas
  (`TownGame.spot`), solo donde el suelo está parejo hacia los cuatro lados y en diagonal, con 45 cm de diferencia como
  mucho a 70 cm alrededor; si no hay ningún sitio así, en el de menos desnivel, y no en el punto pedido a ciegas: el sabio
  de Leitza quedaba metido dentro de la escalinata de la iglesia y el de Estella al borde de un muro. Para revisarlo en
  todos los pueblos, `tools/plazas.mjs`.
- **Puentes como los de verdad** (noviembre de 2026, tras «puentes mal construidos» en Roncal):
  - Cada puente llega a lo alto de la orilla por los dos lados (`ordenarPuentes` en `levels/ordenar.js`, con
    `altoOrilla` de `levels/townReal.js`, la altura del suelo como la deja `finalHeight` sin el relieve fino): se alarga
    mientras el suelo siga subiendo más de un 12 %, al menos hasta 2,5 m del agua y nunca hacia ella, con un tope según el
    agua que salva (unos 5 m por lado sobre una regata de 4 m, 12 m sobre un río). Al levantarlo
    (`realBridges` en `world/townReal.js`), con el terreno de verdad, hasta 3 m más si aún sube. Antes acababa a 1-4 m del
    agua, a media cuesta del talud, y la calle bajaba a él por un hoyo: en Roncal, la carretera quedaba 2 m por debajo de
    la calle a los dos lados y el puente de junto a la plaza, en el fondo de una zanja de 6 m.
  - Si una orilla queda mucho más baja que la otra, el tablero no pasa del 12 %: sigue de rampa por el lado bajo hasta el
    suelo, como mucho 15 m.
  - El lomo, lo justo para el agua que pasa debajo: un metro sobre una regata de 4 m y 2,2 m sobre un río de 20 m, y nunca
    más del 12 % de cuesta en las puntas (el 22 % en los viejos y románicos). Antes pedía siempre 2,2 m y, sobre las regatas
    del casco, salían medios cilindros de 2 m de alto en 7 m de largo.
  - El tablero nunca queda por debajo del suelo en todo su ancho (antes solo miraba lo más bajo y, donde el puente cruza
    una ladera de lado, el prado asomaba por el tablero).
  - En cada esquina, una aleta (`aletas` en `world/townReal.js`): un muro que sale del pilar del pretil, se abre en curva
    hacia el costado y baja poco a poco hasta el suelo, como los que sujetan la orilla y llevan la calle al tablero. No
    donde caería al agua, dentro de una casa o encima de una calle que gira al salir del puente.
  - No se levanta un puente al que no llega ninguna calle ni camino (en Etxalar había uno en mitad de un prado) y, de dos
    que se cruzan o se montan, se queda uno: el de la misión, el de los datos antes que uno nuevo, el que tiene nombre, el
    más ancho y el más largo (en Isaba había dos en aspa sobre el Esca). Los nuevos, donde una calle cruza el agua, solo
    si pasa de verdad a la otra orilla y solo sobre el tramo del agua con 3 m a cada lado (en Isaba y en Ituren salían
    pasarelas de 35-40 m sobre una regata de 4 m).
  - Para revisarlo en todos los pueblos, `tools/puentes-casas.mjs`.
- **El Esca de Burgui, río abajo** (`tools/corriente-rio.py`, noviembre de 2026): `tools/pueblo-real-juego.py` orienta
  cada tramo de río para que empiece por el extremo más alto según el relieve y le pone de nivel el mínimo de lo
  recorrido. En la Foz de Burgui el relieve de 20 m ve las paredes del desfiladero y el tramo que cruza el pueblo quedó al
  revés: el agua subía 9 m hacia la Foz y la corriente se pintaba río arriba. `corriente-rio.py` encadena los tramos de un
  río desde su fuente, da la vuelta a los que van al revés y rehace el nivel con lo más bajo del cauce (a 12 m del eje)
  visto hasta ahí, bajando además un 0,2 %, sin quedar nunca por encima del suelo. En Burgui el Esca baja ahora de −22 a
  −24,4 m y en el casco queda 2,5 m más hondo; el puente medieval sale más alto sobre el agua, con su arco grande de 15 m.
  Si se vuelve a sacar Burgui, hay que pasarlo otra vez (`python3 -I tools/corriente-rio.py burgui-burgi Ezka 498,-278 --presa 51.3,149.8,1.1`).
- **La presa del Esca en Burgui** (`world/presas.js`, noviembre de 2026): 70 m antes del puente medieval, la presa que
  saltan las almadías. Un azud de piedra algo oblicuo a la corriente, como los de los molinos: paramento casi vertical
  aguas arriba, coronación de sillería y glacis hasta el agua de abajo, con el portillo, el paso abierto por donde bajaba
  la almadía con el agua, entre dos cajeros de sillar y con su rampa de losas. El agua baja 1,1 m en la presa
  (`tools/corriente-rio.py ... --presa 51.3,149.8,1.1`, con dos puntos más a su lado para que el escalón sea corto) y
  espumea por el glacis y, más blanca, por el portillo (láminas con rayas que corren, que se deshacen río abajo). Y nueve
  peñas que asoman en el Esca, que la almadía tiene que esquivar. `cadena(real, rio, fuente)` da el río en el sentido de la
  corriente con su nivel y su distancia (`at(s)`, `proyecta(x, z)`); todo queda en `real.presas` para la bajada. Las
  pilas del puente famoso y su ojo grande quedan en `P.famoso` (`pilas`, `ojo`).
- **La bajada en almadía por el Esca** (`game/almadia.js`, noviembre de 2026, tras «un juego de bajar por el río con las
  almadías y que cuente su historia»): la misión del almadiero de Burgui (`race` de tipo `almadia` en `data/levels.js`)
  ya no es una carrera de aros por las calles. Se baja el Esca de verdad, en el pueblo: unos 760 m desde río arriba, por el
  casco, por el portillo de la presa y por el ojo grande del puente medieval, hasta la orilla de después del puente.
  - La almadía es un vehículo como el tractor y la montura (`P.vehiculo`): tres tramos de nueve troncos de pino de 7 m
    atados con avellano retorcido, con sus travesaños, unidos uno detrás de otro; cada tramo sigue el camino que hizo la
    proa (`huella`), así que se doblan en las curvas como las de verdad. Un remo largo en la proa, con el almadiero (un
    vecino con la ropa del de la misión), y otro en la popa, que lleva el jugador: con la cámara detrás, algo más alta y
    lejos, se ve la almadía entera.
  - Se maneja con la palanca o las flechas: a los lados, el remo la lleva a un lado u otro del río, con su inercia;
    adelante se rema algo más deprisa y atrás se frena. La corriente es más viva en la presa y bajo el puente. Las peñas y
    las pilas del puente chocan con los tramos (cada uno, un rectángulo; cada cosa, un círculo): frena, salta agua y se
    cuenta un golpe. En la presa, o por el portillo (salto con espuma) o golpe; en el puente, si pasa por el ojo grande.
  - La historia se cuenta en seis partes sin parar la bajada, en un cuadro a la izquierda (centrado y más abajo en la
    pantalla estrecha): del monte al río, atar los troncos, con el deshielo, las presas (antes de llegar a la de Burgui),
    hasta el mar (pasado el puente) y hoy (la última almadía de trabajo bajó en 1952 y Burgui celebra cada primavera el Día
    de la Almadía). Antes, una ficha con la lámina y cómo se maneja; al final, de una a tres estrellas, «Antes y ahora» y la
    carta «La almadía». Con la acción de bajar se deja a medias y se vuelve a la orilla.
  - El 13 de noviembre de 2026 el autor la probó en el iPhone: los paneles se montaban (la historia pisaba el cuadro del
    avance y la barra de misiones), iba «muy despacio» y no se entendía qué había que hacer. Desde el 14:
    - Todo lo suyo va en una sola columna (`hud()`, `.alm-hud`), colgada de la barra de arriba (`#tl`) como la ficha de
      una misión: el avance con las rayas de la presa y del puente, los golpes y, debajo, la historia. Al ir en columna,
      nada puede pisar a nada. No coge los toques, para que la palanca siga naciendo bajo el dedo. Ya no usa el cuadro de
      en medio (`#mg`), y los avisos van abajo en el centro mientras dura (`body.alm-on`).
    - Una línea dice siempre qué toca hacer y hacia qué lado, con su flecha (`guia()`): «Peña delante» en rojo, con el
      lado por el que cabe; «Al portillo de la presa» o «Al ojo grande del puente» en amarillo, con los metros; «Recto,
      por el portillo» en verde cuando ya va bien; y al principio, cómo se lleva. En el agua, una fila de flechas
      amarillas lleva al portillo y otra al ojo grande, los últimos 80 m (`hazFlechas`).
    - La palanca iba al revés: a la derecha, la almadía se iba a la izquierda de la pantalla. La normal del río mira a la
      derecha de la corriente (`presas.js`) y el remo empujaba hacia el otro lado. Ahora va hacia donde se empuja
      (`derecha()`).
    - Casi el doble de deprisa: 6,4 m/s en vez de 3,6 (8,8 remando), y a los lados 3,9 en vez de 2,6. La bajada, de 741 m,
      dura menos de dos minutos; antes, más de tres.
    - La historia, en una frase por parte (`HISTORIA[i].t`); el texto entero se guarda en `largo`, para el material
      didáctico. Sale tres veces hasta la presa, un poco antes de ella, a medio camino del puente y al pasar por debajo.
    - Para verlo: `almadia-movil.mjs` (en 932 × 430 con dedo, con un piloto que la lleva sola): fotos por el camino y lo
      que mide cada panel, con los que se pisan, que tienen que ser ninguno.
- **Puentes famosos como los de verdad** (`world/puentesFamosos.js` y su plan, `world/puentesFamososPlan.js`, noviembre
  de 2026): el de los Peregrinos de Puente la Reina y el medieval de Burgui se levantan con su forma y no con la de
  cualquier puente. Cada uno tiene su ficha (`FAMOSOS`): cuántos arcos, la luz del grande, el ancho, el grueso de las
  pilas frente a sus arcos, la cuesta más fuerte del tablero, la piedra (arenisca dorada en Puente la Reina), la forma de
  los tajamares y si las pilas llevan ojos de aliviadero.
  - El plan, como un arquitecto: el tablero sube en dos rampas rectas desde la calle de cada orilla hasta la clave,
    redondeada arriba, sin pasar de la cuesta de la ficha; el arco grande va centrado sobre el agua y, de dentro afuera,
    cada arco toma la luz que le cabe bajo el tablero (desde medio metro sobre el agua, o desde el suelo en seco, hasta la
    rosca y el relleno), nunca mayor que el de dentro; cuando ya no cabe ninguno de la luz mínima, estribo macizo. Se
    prueban la clave y su sitio (sobre el río o hacia la orilla alta) y se queda lo que da los arcos de la ficha con la luz
    del grande más parecida. Puente la Reina sale con seis arcos de 6 a 17 m que crecen hacia el centro y su lomo; Burgui,
    con cuatro de 7 a 15 m.
  - Lo que se ve: muros de los costados de una pieza con cada arco abierto, la bóveda por dentro, las dovelas de sillería
    por las dos caras, la imposta corrida bajo el pretil, tajamares triangulares con su sombrerete contra la corriente (el
    lado se saca del río más cercano, por donde baja su nivel) y espolones aguas abajo, y en Puente la Reina los ojos de
    aliviadero sobre cada tajamar, con su antepecho, sus jambas y su arquillo. Los muros suben hasta el pretil para tapar
    el canto del empedrado, que va entre ellos.
  - En Burgui la orilla sur queda a ras del agua: el puente sigue por ella en rampa hasta 16 m (sin entrar en el agua ni
    en una casa) para llegar a su lomo, como el de verdad. El suavizado del tablero usa una ventana igual a los dos lados
    que se acorta hacia las puntas: con la de siempre, el primer metro subía de golpe un 48 %.
  - Fotos de cada uno, `tools/puentes-famosos.mjs`; el perfil con el que se planea queda en `P.perfilFamoso` para
    ensayar el plan fuera del juego.
- **Casas en cuesta como las de verdad** (noviembre de 2026): el zócalo de piedra de más de 1,2 m va en talud, algo más
  ancho abajo (`slopeBase` y `taludZocalo` en `world/plot.js`: 6 cm por metro, 25 cm como mucho), y el de más de 2 m es
  una planta más, la bajera (`bajeras` en `world/townReal.js`): puerta de madera entre jambas y dintel de sillería donde
  la cara queda más alta y ventanucos con su alféizar cada 3 m, solo en las caras que dan a algo libre. Antes eran paredes
  ciegas de piedra de hasta 4 m bajo la casa (en Artajona y Ujué, decenas): la casa parecía puesta en un pedestal. Las
  piezas van en el grupo de las medianas: como menudas, de menos de 90 cm, no se dibujaban en calidad baja. Un camino de
  tierra que pasa por en medio de una casa la recorta como una calle (en Irulegi una caseta quedaba en mitad de un cruce);
  si solo la roza, como en las bordas, no.
- **Comentarios en castellano**, explicando el porqué.
- **Sin duplicados** (revisión de noviembre de 2026):
  - Toda escucha en `window` o `document` se quita al soltar lo que la puso, con una función con nombre. El mapa del
    inicio ponía una en `blur` sin nombre y, con cada vuelta al menú, se quedaba vivo el mapa anterior entero.
  - Toda lista de módulo que apunte a mallas del pueblo se vacía al soltarlo (`unload` en `engine/runtime.js`): por el
    padre de cada malla llega a la escena entera. `MATAS`, la de las matas de `world/nature.js`, solo se vaciaba al
    cargar el pueblo siguiente, y en el menú seguía en memoria el pueblo anterior con sus vecinos (unos 4.400 huesos);
    ahora `resetNature` la vacía con `TREES` al salir (noviembre de 2026: unos 40 MB menos en el menú, medido con
    instantáneas del montón tras salir de Aoiz, Lumbier, Estella y Lesaka). Lo que queda son plantillas que se reusan
    en el pueblo siguiente (los personajes y animales ya cargados), sin escena detrás.
  - En el menú, el lienzo del juego se queda en un píxel y el postprocesado suelta su imagen (`unload`): con el
    suavizado eran unos 25 o 30 MB de la gráfica del iPhone ocupados detrás del mapa del menú, que tiene su propio
    contexto, y al volver de Elizondo se perdía la imagen (informe del 12 de noviembre de 2026). El juego sigue
    dibujando retratos e iconos del menú, pero en su propia textura (`util/offscreen.js`). El tamaño de verdad vuelve
    en `applySize`, antes del primer dibujo del pueblo siguiente (`dibujoTapado`).
  - Lo que se dibuja en una escena aparte, fuera de la del pueblo, lo suelta quien lo hizo, porque `unload` no lo ve:
    la vista del mirador por los prismáticos (`Panorama`, con sus aves y las marcas de las cumbres) se guarda mientras
    se está en el pueblo, para volver a mirar sin esperar, y se suelta en `TownGame.dispose`. Antes se quedaba en la
    gráfica al salir (en Irurtzun, 3 mallas de aves y el relieve, comprobado con la prueba `mirador.mjs` de la carpeta
    de trabajo: tras salir, el menú queda igual que sin haber mirado, 1 geometría y 27 texturas).
  - En un pueblo no hay dos personas con el mismo nombre ni ninguna con el del jugador (`nombresUnicos` en
    `townGame.js`, con `nombreLibre` de `data/nombres.js`). Los anfitriones de misión conservan el suyo.
  - Los sabios no se repiten en un pueblo: hay 16 en `data/sabios.js` y se coge el siguiente libre.
  - Cada paseante tiene su sitio un poco a un lado en cada parada, en un anillo, para no andar ni pararse uno dentro de
    otro cuando comparten ruta.
  - Para revisarlo, en la carpeta de trabajo de la sesión: `estatico.mjs` (claves repetidas en un objeto, casos repetidos,
    funciones dobles, ids repetidos en las listas), `datos.mjs` (ids y nombres repetidos en los datos), `dobles.mjs`
    (escuchas, bucles de dibujo, relojes, contextos y músicas que se acumulan al entrar y salir) y `gemelos.mjs` (en
    cada pueblo, personas encima unas de otras o con el mismo nombre, misiones y objetos repetidos). Las calles de
    `village.js` repiten id a propósito: una por cada lado.
  - Las reglas repetidas de `style.css` son la capa de la identidad morada encima del papel de antes: se ve la última.

## Herramientas y pruebas (`tools/`)

**Servidor MCP de Meshy para las sesiones en la nube** (`.mcp.json`, noviembre de 2026): `meshy-nube` arranca el servidor
oficial de Meshy (`@meshy-ai/meshy-mcp-server`, fijado en 0.6.11; antes, 0.6.6) para que el asistente pueda generar y bajar modelos 3D.
La clave que lleva es de relleno, no es secreta: la de verdad se guarda en los ajustes del entorno de la nube, en los
secretos de red, para `api.meshy.ai` con la cabecera `Authorization: Bearer`, y el proxy la pone en cada petición. Sin
ese secreto el proxy no deja llegar a `api.meshy.ai`. Nunca se escribe una clave de verdad en este archivo ni en ningún
otro del repositorio. Se llama `meshy-nube` y no `meshy` para no tapar, en un ordenador con Claude Code, el servidor
`meshy` que el autor tenga configurado allí con su propia clave.
Lleva `NODE_USE_ENV_PROXY=1`: sin él, el `fetch` de Node no pasa por el proxy de la nube y no llega a Meshy (probado el 16
de noviembre de 2026: sin él, «ENOTFOUND»). Con el servidor arrancado da sus 28 herramientas (`meshy_text_to_3d`,
`meshy_retexture`, `meshy_remesh`, `meshy_rig`, `meshy_check_balance` y demás). El secreto se añade a mano en los ajustes
del entorno: menú del entorno en la barra de la sesión, Editar, Secretos de red, servidor `api.meshy.ai`, cabecera
`Authorization`, valor `Bearer` y la clave. Una sesión nueva lo recoge.

| Herramienta | Qué hace |
|---|---|
| `meshy-costuras.mjs` | Las texturas de los personajes de Meshy sin motas: lo de fuera de cada pieza, con el color de su borde; WebP con el color a resolución completa en los bordes, también en las versiones de 1024 px y ligera (solo la imagen) |
| `silueta-carta.py` | La silueta de escudo de las cartas (corona, lados y punta) en `polygon()` de CSS: `--fifa`, `--corona` y `--marco` de la carta de pelotari, para pegar en `src/ui/neon.css` |
| `presupuesto-pueblo.mjs` | El presupuesto de cada pueblo: lo que pinta con el perfil del iPhone (triángulos, dibujos y memoria de texturas y búferes, con `presupuesto-gpu.js`) en su puerta mirando a los cuatro lados y, con `PELOTA=1`, en su partido de pelota, frente a lo que aguanta el iPhone 13 (unos 900 mil triángulos, 520 dibujos y 80 MB de texturas en el pueblo). Todo pueblo nuevo tiene que pasarlo antes de publicarse: solo se carga un pueblo cada vez, así que lo que cuenta es lo que pesa cada uno. Sale con código 1 si alguno se pasa |
| `puntos-control.mjs` | Los puntos de control de arte y luz: de cada pueblo, dos vistas fijas (a pie de calle desde la puerta y desde 22 m sobre la plaza) en cuatro condiciones (día, atardecer, noche y lluvia), con lo que pinta cada una (triángulos y llamadas de dibujo) y lo que tarda en cargar. Las mismas fotos antes y después de cada cambio de arte, luz o atmósfera: `node tools/puntos-control.mjs <carpeta> <etiqueta> [pueblos] [calidad] [condiciones]`. Las de la auditoría de noviembre de 2026 y su informe, en `entrega/tanda1/`. |
| `puntos-interes.mjs` | Los puntos de interés de cada pueblo, medidos: qué parte de lo que se pisa ve algo a lo lejos (contando el relieve y las casas), cuánto paisaje vacío hay como mucho (andando a 3,3 m/s) y si hay retos de las tres escalas. Cuenta lo que rotula el mapa, los vecinos con misión y lo que añade la aventura (`game.puntosInteres()`: la atalaya y las kutxas, estas como escondidas). Pasa con el 85 % viendo algo lejano, ningún vacío de más de 60 s y las tres escalas. `node tools/puntos-interes.mjs <salida.json> [pueblos \| todos]`; con `?aventura=0` en la dirección se mide el pueblo sin la aventura. |
| `muros.mjs` | La prueba automática de muros: un explorador que se lanza contra los 40 muros mayores del pueblo, de frente y en diagonal, andando, corriendo y saltando, con el código del jugador y sin dibujar (unos 13 000 pasos por pueblo). Falla si alguna vez queda dentro de un muro, da un paso más largo que su cuerpo o sale del mapa. `node tools/muros.mjs <salida.json> [pueblos \| todos]`. |
| `aventura.mjs` | La prueba automática de la aventura de un pueblo: que se monta (atalaya, cinco kutxas y montura), que nadar, planear, trepar y caer hacen lo que deben con el anillo y los corazones, que se monta y se baja, que la atalaya y la kutxa se guardan en el perfil sin tocar lo demás, y que no hay errores. Deja una captura de cada cosa. `node tools/aventura.mjs <carpeta> [pueblo] [calidad]`. |
| `grada-ver.mjs` | La primera fila del público de un frontón, de cerca, con una cámara propia: que nadie atraviese su escalón, el antepecho ni el asiento de delante. Tres capturas por frontón y lo que mide la figura sentada. |
| `perro-guia.mjs` | «Enséñame el camino»: el perro se adelanta por las calles (el camino de los vecinos), ladra, espera y sigue tramo a tramo hasta dejarte junto al vecino (`CERCA=1`) o hacia una misión lejana. Simulado a pasos fijos. |
| `pelota-cansancio.mjs` | Cansancio y descansos de la pelota, sin navegador: partidos enteros pelotando normal y jugando a cansar al rival con dejadas y cortadas. El rival tiene que cansarse bastante más en el segundo caso, pedir sus descansos sin pasarse y tus descansos se toman en el parón antes del saque. |
| `campeonato-pueblo.mjs` | El pelotari junto al frontón de un pueblo invita al campeonato de la comarca: el diálogo con sus cuatro opciones, el campeonato elegido con su cuadro (solo el frontón) y, al salir, la vuelta a la puerta del frontón del pueblo. |
| `auditoria-entradas.mjs` | Entrar en cada pueblo y bosque como en el iPhone, con la app recién abierta y el botón de jugar del mapa: la carga con su foto, que la foto se descarga, que no hay vuelo desde el aire y que al acabar la carga se juega sin errores. Deja capturas de la carga y del juego de cada uno (`OUT=carpeta`, contra la web compilada en 8099). |
| `plazas.mjs` | Las plazas de todos los pueblos, con el día de mercado puesto (`?market=1`): que la plaza no tenga trozos empinados ni agua dentro, que el pie de la fuente sea llano (25 cm como mucho) y que los puestos, quien vende, la tienda y quien da las misiones estén en suelo llano y seco. Mide el terreno, sin escalinatas ni tarimas (el kiosco de Pamplona contaba como cuesta). Una línea por pueblo, una captura desde arriba de cada plaza y la lista de los que fallan. `node tools/plazas.mjs <carpeta> [pueblos]`; con `BASE=http://127.0.0.1:8099/`, sobre la web compilada. Nació con la plaza de Roncal al borde del Esca (noviembre de 2026) |
| `corriente-rio.py` | Da la vuelta a los tramos de un río que quedaron río arriba y rehace su nivel en el sentido de la corriente; con `--presa x,z,salto`, el escalón de una presa (`python3 -I tools/corriente-rio.py <pueblo> <río> <x,z de la fuente> [--presa x,z,salto]`) |
| `puentes-famosos.mjs` | Fotos de un puente famoso (`world/puentesFamosos.js`): de lado desde aguas abajo y aguas arriba, en tres cuartos, de cerca bajo el arco grande y andando por el tablero, con los arcos que han salido |
| `puentes-casas.mjs` | Los puentes y las casas de todos los pueblos con trazado de verdad: puentes con las dos puntas en tierra, agua debajo, sin cuestas imposibles ni escalón al subir, con sitio sobre el agua, sin casas encima ni una casa justo a la salida; calles que cruzan el agua sin puente; casas en el agua, atravesadas por una calle, metidas en otra, sobre un puente, en la plaza, torcidas respecto a su calle, en mucha cuesta o lejos de toda calle. Una línea por pueblo y capturas de lo peor (`BASE=http://127.0.0.1:8099/` para la web compilada) |
| `carga-textos.mjs` | La pantalla de carga con la descripción de cada pueblo, cada consejo y cada «¿Sabías que…?» de la pelota y la pasaka, en 667×375, 844×390, 932×430 y 1280×720: que nada se corte con puntos suspensivos, se monte o se salga de la pantalla (`LNG=eu`, en euskera). |
| `mapa-dron.mjs` | El vuelo de dron del mapa del inicio sobre los pueblos con montes alrededor: en 24 puntos de la vuelta, la cámara por encima del relieve y sin montes entre ella y el pueblo. Capturas. |
| `revision.mjs` | Carga los 31 pueblos y comprueba misiones, anfitriones, suelo, perro y errores; deja el informe en `entrega/revision.json` |
| `encierro.mjs` | Prueba el encierro con capturas |
| `iconos-nitidez.mjs` | Nitidez de los iconos 3D en las pantallas del menú (móvil de densidad 3 y escritorio): píxeles de pantalla frente a los de la imagen tras el cambio a la grande, rotos y cuántos de cada tamaño |
| `encargo-personajes.py` | Paquete para encargar las ilustraciones de los personajes de Navarra (lista completa, prompts en castellano e inglés, referencias de estilo, LEEME) |
| `encargo-total.mjs` | El encargo de imágenes completo en un solo archivo de texto: lo que el juego enseña sin imagen del autor (escudos de casas con su blasón, personajes, leyendas, figuras, tradiciones, cimas, fauna, láminas, iconos que son renders, instrumentos y, con la carpeta del paquete de escudos, los señalados para corregir), con el estilo de cada apartado y un prompt por imagen con su nombre de archivo. Lo saca de los datos cargados en el servidor de pruebas |
| `escudos-cuenta.mjs` | Entra en los 32 pueblos y escribe un JSON con las casas que de verdad tienen escudo en la fachada (entre 0 y 8 por pueblo); `encargo-total.mjs` lo lee con `CASAS=` para no encargar escudos de casas que no existen |
| `pueblo-real.py` | Datos reales de cada pueblo (contornos de casas con altura y nombre, calles, ríos y balsas, puentes y lugares) en metros locales, leídos de Overture Maps por rangos HTTP desde AWS (`indice` una vez por versión; `pueblo` por localidad). Escribe JSON fuera del juego: los datos son ODbL (OpenStreetMap) y entran solo con esa licencia aceptada; la alternativa oficial, IDENA (Gobierno de Navarra), no es alcanzable desde el entorno de desarrollo |
| `pueblo-real-juego.py` | Del JSON crudo de un pueblo a `src/data/reales/<id>.json`: centra en la plaza del ayuntamiento, baja el relieve EU-DEM (teselas terrarium de AWS, comprobando la fuente), ríos con nivel, calles y tramos de puente, casas como rectángulo orientado a su calle con altura y nombre, plaza, iglesia, ayuntamiento, frontón, fuentes y usos del suelo. Escribe el formato compacto (con `--legible`, el de siempre para mirarlo) y deja fuera lo que el juego no usa: casas a más de 480 m o de menos de 9 m², contornos y nombres sueltos |
| `mujeres-ver.mjs` | Las mujeres de Navarra en el menú: pantalla Personajes, tira del inicio y fichas, en castellano y en euskera |
| `encierro-tactil.mjs` | El encierro en el móvil: la palanca táctil, los botones, la salida al acabar (fichas o la X) y la vuelta al menú |
| `futbol.mjs` | Prueba el fútbol con capturas |
| `tienda.mjs` | Prueba la tienda con capturas |
| `mercado.mjs` | Prueba el mercado con capturas |
| `clima.mjs` | Prueba la lluvia, la nieve y la luna con capturas |
| `vecinos.mjs` | Prueba los vecinos con capturas |
| `trajes.mjs` | Prueba los trajes con capturas |
| `carnaval.mjs` | Prueba los personajes de carnaval |
| `llamadas.mjs` | Mide las llamadas de dibujo por partes |
| `mitos.mjs` | Prueba Basajaun, la lamia, la sorgina y Roldán con capturas |
| `musica.mjs` | Prueba la música por ambientes: qué canción grabada suena en cada uno |
| `figuras-ilus.mjs` | Las ilustraciones de las figuras de leyenda y carnaval que entregue el autor (16:9, como las láminas): a 1280 y 640 en `src/assets/figuras/ilus`; en cuanto están, sustituyen al render del traje |
| `encargo-importar.mjs` | Las imágenes del encargo (`entrega/encargo-imagenes-*.md`) que entregue el autor, con el nombre que pide el encargo: cada una a su sitio y a sus tamaños en WebP (escudos de casa, personajes, tradiciones y danzas de comarca `danza-<comarca>`, leyendas, figuras con `figuras-ilus.mjs` e iconos recortados a su dibujo y centrados al 89 %, como la familia del autor). Las de 1672 px no se amplían. Las copias del archivo único solo con `--unico`: ese archivo va a pocos KB de su límite, y sin ellas sigue con lo de antes (el dibujo tallado de los escudos, la lámina prestada, el render del traje); con conexión, los escudos los pide a la web. Las variantes con otro nombre: `«archivo.png»=nombre`. La entrega del 2026-10-23 (77 imágenes) entró así; lo que falta, en `entrega/encargo-pendiente-2026-10-23.md` |
| `retratos.mjs` | Retratos para el menú con `lab/retratos.html`: de un avatar (busto, cuerpo entero y el grande de la web) o de una figura de leyenda o carnaval con su traje (`src/assets/figuras`) |
| `personajes-ver.mjs` | Capturas de la pantalla Personajes, la tira de figuras del inicio y una ficha, en escritorio y en el móvil tumbado |
| `hub-escritorio.mjs` | Capturas del menú en escritorio, pantalla por pantalla |
| `fauna-512.mjs` | Rehace la fauna del archivo único (`src/assets/fauna/512`) desde las de 1280: 512 px, WebP calidad 80 |
| `euskera.mjs` | Prueba el modo «Aprende euskera» |
| `eu-faltan.mjs` | Juega en euskera con `?eufaltan` (menú, fichas y las misiones de los pueblos pedidos o de `todos`) y apunta lo que se queda sin traducir en `/tmp/eu-faltan.json`. Las tarjetas y minijuegos que `__autoWin` se salta pasan sus textos por `window.__autoSeen` |
| `animalpack.mjs` | Empaqueta los animales |
| `foodpack.mjs` | Empaqueta las frutas y verduras |
| `iconbake.mjs` | Hornea los iconos 3D que no son del autor, a 512, 256 y 128 (`lab/iconbake.html?iconS=512`) |
| `luz-ver.mjs` | Luz estable al girar la cámara en el pueblo y al entrar y salir de un partido de pelota (de día, con lluvia) |
| `ux-medir.mjs` | Auditoría de interfaz en el móvil tumbado: botones de menos de 44 px, rejilla de 4 px, interlineado, interletrado, contraste, orden de los botones y lo que obliga a desplazar, en las ventanas del juego y en el menú |
| `espaciado.py` | Lleva rellenos, márgenes y huecos de todas las hojas de estilo a la rejilla de 4 px |
| `responsive.mjs` y `popups-medir.mjs` | Auditorías de tamaños: las pantallas del menú en 21 dispositivos y las ventanas del juego, con `IDIOMA=eu` también en euskera; anotan lo que se sale, lo que no cabe, los botones pequeños y, con `palabras-medir.mjs`, las palabras partidas entre dos líneas y los textos cortados con «…» o a las N líneas |
| `ventanas-casos.mjs` | Cómo se abre cada ventana del juego para las auditorías (`popups-medir`, `ux-medir`) |
| `pelota-ficha-ver.mjs` | Las fichas de los pelotaris: antes del partido, por parejas, en la pausa y en el torneo |
| `pelota-frontones-juego.mjs` | El frontón que juega: el mismo golpe en cada tipo de frontón y partidos enteros de la IA en todos (sin gráficos) |
| `pelota-vs-ver.mjs` | El panel del partido y «Más opciones» en pestañas (pelota y cámara dinámica, sin desplazar), la pantalla VS, el partido (marcador sobre el frontis, FALTA y PASA, tu energía, el aro del botón de golpe) y la colección en el móvil tumbado (con `clear` o `rain`) |
| `pelota-gasto.mjs` | La energía con el joystick siempre a tope, como juega una persona: pelotando, con cortadas seguidas y con el rival haciéndote dejadas; en qué se va y lo que cuesta cada carrera y cada cortada (sin gráficos) |
| `pelota-golpe-manual.mjs` | Golpeo manual: sin pulsar no se devuelve nada; a tiempo, perfecto; pronto y tarde; volea y gancho; la energía; las cinco pelotas (sin gráficos) |
| `auditoria-diseno.mjs` | Auditoría de diseño del menú (también su marco: la barra de arriba y la de las secciones) y de las pantallas de deporte (TAM=844x390 o 1180x820): texto cortado o con puntos suspensivos, texto encima de figuras (mirando la transparencia de la imagen) o de otro texto, verdes fuera de sitio, cajas con las esquinas en ángulo, el filo de neón fuera de las cartas de jugador (cajas con filo, borde, anillo o brillo de color: «neon») y botones con filo, borde o anillo («filo»), texto que se sale de su botón o su caja (círculo, píldora, esquinas redondeadas o en ángulo), distancias de rótulo a título y de título a texto, letra fuera de la escala o de las fuentes del juego colores de texto fuera de la gama, cajas que se salen de su caja, texto en columnas de una palabra por línea, lo que hay que desplazar, esquinas de más de 12 px o casi rectas y botones con letra de lectura. La medida está en `auditoria-medida.mjs`; también mide la composición: bloques de una fila con la misma altura o el mismo centro y el mismo hueco, columnas con el mismo borde y el mismo ancho, cajas con el mismo relleno a los dos lados, rellenos y huecos en la rejilla de 4 px, y bordes que casi coinciden (de 2 a 12 px) dentro de una misma caja, que se toman por descuadres. Con TODO=1 lista todas las distancias y con DETALLE=1 dice la regla de CSS de cada fallo. Con IDIOMA=eu, en euskera |
| `cosecha-vehiculo.mjs` | La cosecha de principio a fin, con cosechadora (Artajona) o con tractor y temporeros (Estella): el campo, la descarga, el camino, la báscula y la conversación final |
| `choques.mjs` | Textos que se montan con un icono, una chapa, un botón pequeño u otro texto, o que tapa un aviso: el menú entero, la galería pueblo a pueblo, las fichas y Ventajas, a cuatro tamaños; `choques` se usa también en `auditoria-partidos.mjs` |
| `auditoria-pelota.mjs` | La misma auditoría en un partido de pelota de verdad, de la presentación al final: abre un pueblo, monta un partido en el Labrit y mide la presentación (las cartas de los pelotaris; también por parejas, y dice si la ventana cabe sin desplazar y el ancho de las cartas), «Más opciones», la ficha, la pantalla VS, el sorteo del saque, el partido, la pausa, la Gran final y el final, con una captura de cada una. `URL=… node tools/auditoria-pelota.mjs [carpeta] [tamaños] [pantallas]` |
| `auditoria-partidos.mjs` | La misma auditoría en los marcadores y mandos de fútbol y pelota, montados sin el partido en 3D, en castellano y euskera y en cada estado de los botones (atacar, defender, portero, penaltis, lesionado, tarjeta, cambio y la ventana de cambios; golpe, gancho y volea) |
| `auditoria-pueblo.mjs` | La misma auditoría dentro del pueblo (TAM=844x390 o 1180x820): HUD, diálogo, cada pestaña del libro, mapa con la tarjeta de una misión y de un lugar, mochila, pausa, cada pestaña de la tienda y recompensa. Con IDIOMA=eu, en euskera; con EUFALTAN=1, además, la lista de lo que se queda sin traducir |
| `auditoria-ventanas.mjs` | La misma auditoría en las ventanas del juego (fichas, minijuegos, misión cumplida, cuestionarios). Con IDIOMA=eu, en euskera |
| `auditoria-medida.mjs` | La medida común de las cuatro auditorías. «junto»: texto, botones, tarjetas e imágenes seguidos con menos aire del mínimo (texto y botón 12 px, 16 en el ordenador; tarjetas 8, 16 en el ordenador; imagen y texto 8; un texto que acaba y un título que empieza 16, 24 en el ordenador) o texto a menos de 8 px del borde de su caja. «centrado»: texto o icono descentrado más de 1,5 px dentro de su forma (botón, círculo, cuadrado, píldora, etiqueta), midiendo del icono lo pintado y del texto de las mayúsculas a la línea base. «cortado» también mira lo que baja de la línea (la «j», la «g») recortado por abajo. «justo»: texto de un botón que se sale o va a menos de 2 px de su borde. «imagen»: imagen deformada, descentrada en su caja, recortada más por un lado, con bandas vacías, desigual con las de sus tarjetas hermanas o con un encuadre que enseña menos del 70 %. Con MUESCA=1, todas miden con los márgenes de la muesca del iPhone 12 tumbado (47 px a cada lado y 21 abajo), que estrechan el menú: así se ve lo que en el iPhone se sale y en el ordenador no |
| `labrit-final.mjs` | La final en el Labrit: la entrada de «Gran final» en cuatro momentos (título, txapela, cartas y confeti), que se va sola hacia el sorteo, el partido dentro y vistas de la grada y del marcador |
| `pelota-cubierto-ver.mjs` | El frontón cubierto: llegada, luz de pabellón a mediodía, grada, cámara de retransmisión siempre dentro y rebote hasta el techo |
| `futbol-vs-ver.mjs` | La presentación VS del fútbol: camisetas, medias, competición y que al tocar empieza el partido |
| `paquete-pelota.mjs` | Prepara los pelotaris y los sellos del autor desde su ZIP descomprimido: los de 512 y, para la VS, los de 1024 para la web y, para el archivo único, el rojo de 256, la camiseta azul suelta y los sellos de 176 |
| `sellos-nombre.mjs` | Escribe el nombre del juego en el aro de arriba de los 12 sellos de comarca: borra lo que llevaban, con el color de la banda, y pone HERRIZHERRI en el mismo arco, altura y color; escribe los de 512 (web) y 176 (archivo único) |
| `paquete-futbol.mjs` | Prepara los jugadores de fútbol del autor desde su ZIP descomprimido: los de 1024 para la web |
| `jugadores-busto.mjs` | Recorta el busto de cada jugador de fútbol para la caja de la liga y el menú del club |
| `relieve/descargar.sh` y `relieve/perfiles.py` | Descargan las teselas de relieve (nivel 8, unos 450 m por píxel; en Navarra salen de SRTM y GMTED2010, de dominio público, y se comprueba en la cabecera de cada una) y calculan con ellas `src/data/relieve.js`: rayo a rayo desde cada mirador y desde cada pueblo, con la curvatura de la Tierra y la refracción. Imprime qué montes se ven y cuáles quedan tapados. Uso: `sh tools/relieve/descargar.sh <carpeta nueva>` y `python3 -I tools/relieve/perfiles.py <carpeta> . src/data/relieve.js` |
| `mirador-ver.mjs` | La vista real desde el mirador de un pueblo: una captura hacia cada monte de la misión y otra con el visor abierto, sin rótulos, para comparar con fotos |
| `prismaticos-ver.mjs` | El visor de los prismáticos en el móvil tumbado o en el ordenador: botones encima, rótulos sin pisarse, la marca coge el monte y el ave |
| `pelota-camara-parejas.mjs` | Pelota por parejas: en cada golpe, si el que golpea sale en la imagen |
| `jugadores-duos.mjs` | Recorta las parejas de cada equipación del ZIP del autor: a su alto completo para la VS y 480 para los menús |
| `laminas-pequenas.mjs` | Las copias pequeñas de las láminas de la web, de 640 × 360 |
| `mando-iconos.mjs` | Los iconos de la app «Mando» (`public/mando`): la palanca del autor sobre el morado de la página del móvil, a 192, 512 (normal y «maskable») y 180 px |
| `laminas-importar.mjs` | Las láminas que rehace el autor (parte B del encargo), de una carpeta con `<id>.png`: la original a calidad 90, la de la web de 1280 y su copia de 640 sacadas del PNG, las del archivo único y del ligero sin pesar más que las de antes y, con `laminas-grandes.mjs`, la grande de 2560 |
| `laminas-grandes.mjs` | Las láminas grandes de la web, de 2560 × 1440: las de 1280 ampliadas al doble con Real-ESRGAN (`laminas-ampliar.py`, en CPU) y guardadas en WebP; con un grupo (leyendas, cimas, personajes, tradiciones), lo mismo con sus ilustraciones de 1536 |
| `cimas-tarjetas.mjs` | Las escenas de las cimas de 1024 para las tarjetas de la web |
| `nitidez.mjs` | Nitidez de las imágenes en el iPhone 12 tumbado (o en un ordenador, con `VISTA=1920x1080` y `DPR=`): cuánto se amplía cada una, por pantallas (URL de la web o del archivo único con MINI=1) |
| `nitidez-hd.mjs` | Nitidez del archivo único con red (las imágenes grandes de `hd.json` se sirven desde `docs/`) o sin ella (`SIN_RED=1`): al llegar a cada pantalla y 5 s después |
| `escudos-importar.mjs` | Mete los escudos de casa y de oficio del paquete del autor (`inventario-completo.json` + `revision-512/` o `grande/`) en `src/assets/escudos/casas` y `oficios`, solo los revisados (`--todos` para los señalados; `--municipales` para sobrescribir el armorial); de cada 512 saca los de 192 y 96 de los archivos únicos |
| `escudos-ver.mjs` | La ficha de un escudo de casa con la imagen del autor y su vista en piedra, y una ficha de oficio con su escudo, en el móvil tumbado (servidor de pruebas, o el archivo único con `ARCHIVO=`) |
| `portadas-movil.mjs` | Las portadas en el iPhone (inicio, lista de pueblos y ficha de un pueblo; `VISTA=390x844` para vertical): tamaño real de cada imagen frente al que ocupa y si la grande ha llegado |
| `instrumentos-ver.mjs` | Los instrumentos: la lista del menú, la ficha (con Escuchar), el minijuego tocado entero (pulsa cada nota a tiempo con el gancho `window.__tocar`) y la carta; luego el músico de la plaza en un pueblo. Capturas en escritorio y móvil |
| `pasaka-ver.mjs` | La pasaka en 3D: desde el menú (la pantalla con su portada, el botón que carga Pamplona en modo campeonato y lleva al sobreclaustro, el partido, la carta, el menú de entre partidos y la vuelta a la pantalla) y desde Pamplona (el canónigo del claustro, el diálogo, el partido y la vuelta junto a él). En cada partido, el saque y un golpe tuyos con el gancho `window.__pasaka`, el resto en automático y adelantado sin dibujar. Capturas en el móvil tumbado. |
| `encargo-portadas.py` | Paquete de encargo para regenerar las 110 láminas con más calidad en una herramienta de imágenes: las referencias actuales en JPEG numeradas por prioridad (portadas de pueblo, paisajes de comarca y deportes primero), hojas de contacto, `encargo.csv` y `encargo.json` con sitio, título, prioridad, nombre de entrega y prompt por imagen, y el LEEME con las instrucciones (16:9 al mayor tamaño, misma escena, el explorador igual, sin texto, PNG con el id como nombre). Lee los datos sin ejecutarlos. |
| `pasaka-portada.mjs` | Hornea la portada de la pantalla Pasaka: una foto del partido en el sobreclaustro sacada del propio juego en calidad alta, sin interfaz, en los cuatro tamaños de las láminas (`grande`, `web`, `web -s` y `mini`, como `dep-pasaka`). Volver a ejecutar cuando cambie el recinto. |

Tamaños con que se revisa el diseño (`auditoria-diseno`, `-partidos`, `-ventanas` y `-pueblo`): móvil tumbado 667 × 375,
740 × 360, 844 × 390, 932 × 430 y 844 × 312 con muesca (Safari con sus barras), vertical 390 × 844 e iPad 1180 × 820 y
820 × 1180. Las auditorías de partidos y ventanas ponen la etiqueta viewport del juego en su página de pruebas: sin ella,
el móvil se pintaba a 980 px de ancho y no a su tamaño.
| `cambios-sim.mjs` | Cambios, lesiones y forma sin gráficos: el cambio espera a la parada, el suplente entra con la forma entera y sin tarjeta, cinco cambios en fútbol 11 y sin límite en sala, el expulsado no se cambia, la lesión grave frena y avisa, la leve se pasa y la tercera falta es amarilla |
| `vecinos-tareas.mjs` | Cada vecino con su tarea: llegan a sus paradas, se quedan haciendo lo suyo, los del corrillo charlan y los niños corren |
| `rediseno-ver.mjs` | Capturas del menú y de las pantallas de deporte en el móvil tumbado (campeonatos, personajes, mapa, torneo, colección, liga y VS) con lo que se sale, la letra pequeña y lo que obliga a desplazar |
| `minijuegos-comarcas.mjs` | Un pueblo de cada comarca: misiones con anfitrión y datos válidos, y sus minijuegos jugados con sus datos |
| `blender/fauna/derivar.py` | Crea la oveja, la cabra, el cerdo y el jabalí a partir de otros modelos |
| `blender/fauna/sentado.py` | Crea la pose «Sentado» de los perros |
| `blender/arq/` | Puente de Ochagavía (blockout) |
| `glb-abrir.mjs` | Descomprime un GLB de Meshy (meshopt y cuantización) para abrirlo en Blender. Su salida no es para three.js |
| `trajes/ver.mjs`, `trajes/hoja.py`, `trajes/caja.mjs`, `trajes/hueso.mjs` y `trajes/rayo.mjs` | Trajes: cada personaje con traje de cerca (frente, espalda, cara y andando) y su hoja; y para depurar, dónde acaba cada prenda con la piel, sus huesos y pesos, y qué tapa un punto de la cara |
| `pelo/zonas.mjs` y `pelo/ver.mjs` | Pelo de otro color: dónde están los ojos y cuánto brilla el pelo pintado de cada personaje de Meshy (píxel a píxel de su textura, en la pose de reposo) y la hoja de prueba con cada personaje y cada color de cerca |
| `pelo/parpados.mjs` | La línea del párpado de arriba de cada personaje de Meshy, medida en su textura (`blender/chicas/parpados.json`), para pintar las pestañas de las chicas |
| `blender/chicas/` y `chicas/construir.sh` | Las chicas, de principio a fin: cabeza, nacimiento del pelo, textura, peinado y exportación (Blender), y el parche para el juego (`chicas/parche.mjs`). Los pasos van en la cabecera de cada uno |
| `chicas/ver.mjs` y `chicas/vecinas.mjs` | Chicas en el juego de cerca (el chico, la chica y la ligera; frente, espalda, cara, perfil, nuca) y una fila de vecinas con falda, delantal, mayor y los trajes de lamia y sorgina |
| `futbol/jugadoras.mjs` y `futbol/cajas.mjs` | Chicas y chicos del fútbol de cerca (frente, espalda, cara, nuca, perfil y corriendo) y el tamaño de cada pieza del pelo |
| `blender/pelotari-chica/` | Prototipo de la versión chica del pelotari sobre su mismo cuerpo: cara repintada, nariz menor, coletas atadas al hueso de la cabeza. Los pasos van en la cabecera de `chica.py` |

Las pruebas usan Chromium con SwiftShader (muy lento), así que **simulan el tiempo de juego** llamando a
`update(1/30)` en bucle, en vez de esperar a los fotogramas.

## Publicar

El archivo único (`npx vite build`) es el que se abre en el móvil con Sitecase. Para que pese menos, los modelos 3D
van comprimidos con gzip (`vite.config.js`, plugin `glb-gzip`; los descomprime `src/util/glb.js` con el fflate de
three.js) y los personajes de Meshy con la textura a 1024 px (`src/assets/meshy-1024`, `tools/meshy-textura.mjs`).
El código del juego también va comprimido con gzip (plugin `js-gzip`): de unos 3,8 MB a 1,7 MB. Solo el código: las
imágenes, sonidos y modelos que van dentro ya están comprimidos, así que se sacan aparte (cada «data:…» suelto del
código, buscado en su árbol con `rolldown/parseAst`, pasa a ser `__hzD[n]` y sus textos van en el bloque `#hz-datos`).
Al abrir el archivo, el cargador `#hz-cargador` (unos 4,6 KB, con el mismo fflate) lo descomprime y lo ejecuta como el
módulo que era; si falla, lo recoge el aviso de arranque. Así queda casi 1 MB libre dentro de los 30 MB de Sitecase (con las chicas).
Con `MINI=1 npx vite` el servidor de pruebas carga lo mismo que el archivo único. La web (`WEB=1`) no cambia.
Con `LIGERO=1 npx vite build` sale una variante unos 6 MB más pequeña (`HERRIZHERRI-jugar-ligero.html`): los
personajes de Meshy van en su versión ligera (`src/assets/meshy/lod`) y todo lo demás es igual.

**Las dos descargas, solo cuando se pidan** (noviembre de 2026). Los dos archivos únicos de `docs/descargas` pesan unos
47 MB cada uno y cada versión nueva añadía unos 90 MB al historial: con 113 versiones guardadas, el repositorio llegó a
unos 3 GB. Ahora la web se compila sin ellos y `docs/descargas` se queda como está en git; solo se vuelven a compilar
cuando el autor lo pide. A la vez se limpió el historial: fuera las versiones viejas de las descargas, las compilaciones
viejas de la web (`docs/`) y las capturas de revisión de `entrega/`, que ya no se guardan en git. En `entrega/` quedan
los modelos de los personajes (`.blend`), las capturas de la App Store, los encargos y los informes de texto. El código
de todas las versiones se conserva.

La web se guarda con un service worker (`src/web/sw.js`): la página se pide primero a la red y sin la copia del
navegador, y lo demás sale de la caché. La app instalada en el iPhone vuelve de segundo plano tal como estaba, así que
`src/web/update.js` mira al volver qué versión hay publicada: si ha cambiado y se está en el menú, carga la nueva al
momento (con `?v=…`, una sola vez por versión); si se está jugando, sale en el menú un aviso «Versión nueva» para
actualizar con un toque. Desde el 14 de noviembre de 2026, también la carga sola si se está en el menú o en el mapa sin
tocar la pantalla desde hace 6 s, y mira cada 4 minutos en vez de cada 10: el autor seguía viendo en su iPhone la versión
de la tarde anterior, con el alrededor del mapa en relieve gris, y daba por no hecho lo que ya estaba publicado.

Cómo jugar (`src/hub/comojugar.js`): la primera pantalla de quien empieza, tras el idioma y antes del nombre, y
siempre a mano con «Cómo jugar» arriba del menú (en el móvil de pie, en «Más») y en Ajustes; no sale en el modo
didáctico. Las tres formas de jugar, cada una con sus pasos y su botón: en el ordenador o en la tele (teclado y ratón
o un mando de consola, e instalar el juego), con el móvil de mando (abre el panel del QR; en el móvil, «Descargar la
app Mando» abre `mando/`, que se instala) y en el móvil o la tableta (en el ordenador, un QR con la dirección del
juego; en el móvil, instalarlo aquí). La del aparato en el que se está va marcada y, en el móvil, la primera. Se ve
una sola vez sola (`seen.comoJugar` del perfil).

El material didáctico (`src/hub/didactico.js`) enseña tradiciones, oficios, productos, historia y palabras en euskera
como la página de naturaleza: `src/hub/ddgal.js` pinta la galería, con pestañas por apartado (en el móvil, la elegida
se trae a la vista) y una tarjeta por cosa con su lámina o, si aún no la tiene, su icono grande sobre su color. Al
tocarla se abre su ficha (`infoCard`) con el texto en pestañas: qué es, cómo se hace, herramientas, antes y ahora, y
dónde, con enlaces a sus pueblos. Las palabras en euskera van en tarjetas con la palabra en grande y el castellano
debajo, y las conversaciones, en bocadillos. Lo que sale con icono está en el encargo de imágenes pendiente.

La web se instala como app. `src/web/install.js`, desde «Cómo jugar»: en Android y en Chrome o Edge del ordenador abre
el aviso del navegador; en el iPhone y el iPad enseña los tres pasos de Safari, y deja compartir el enlace. En la app
ya instalada lo dice, y en el archivo único y en el artefacto manda a la web. El icono, la portada con la que arranca la página
(`#portada-app` en `index.html`, se quita sola cuando sale el menú) y las pantallas de arranque del iPhone y del iPad
(`public/splash`, 17 tamaños de `src/web/splash.js` en vertical y en horizontal, enlazadas por `vite.config.js`) son
el explorador de la lámina de Ezkaba (del autor), de rodillas sobre el mapa y señalando a Navarra, que va como una
pegatina con un marcador (el contorno de `src/data/comarcas.json`, el del mapa del juego): `node tools/app-iconos.mjs`
los rehace todos. Las capturas del aviso de instalación (`public/capturas`) salen de `tools/app-capturas.mjs` con el servidor de
pruebas. La app instalada se juega en horizontal: en Android lo fija el manifest; el iPhone y el iPad no dejan fijarlo,
así que si se abre o se gira en vertical sale la pantalla «Gira la pantalla · Biratu pantaila» (`#girar-app` en
`index.html`, la misma que su pantalla de arranque en vertical) y `window.__girado` pone en pausa el bucle del juego
(`src/engine/runtime.js`) hasta volver a horizontal. En el navegador, sin instalar, se sigue pudiendo jugar en vertical.

En el iPhone, el iPad y Safari, `src/util/glb.js` hace que GLTFLoader lea las texturas de los modelos como imagen
normal y no como ImageBitmap (un complemento del cargador cambia su `textureLoader` por un `TextureLoader`). Con
ImageBitmap, Safari en iOS a veces subía la textura en negro: pelotaris y espectadores como siluetas. GLTFLoader ya
lo evita en Safari anterior al 17, pero lo reconoce por el nombre del navegador y la app instalada en la pantalla de
inicio no lo lleva. En los demás navegadores no cambia nada. Esas imágenes se descodifican al cargar el modelo, fuera
del hilo principal (`decodeAll`), y `shrinkMap` (`glbChar.js`) no las copia a un lienzo si no hay que reducirlas; si las
reduce, vacía la original. Copiarlas dejaba dos copias en memoria y el iPhone cerraba el juego al entrar.

```
npx vite build
cp dist/index.html docs/index.html
cp dist/index.html HERRIZHERRI-jugar.html
git push origin master:main
```
- **Tráiler para inversores, primer guion** (`entrega/trailer/guion-trailer.md`; 16 de noviembre de 2026). El autor:
  «tenemos que ver cuántos créditos tenemos en Higgsfield para crear un tráiler del videojuego. Un tráiler que
  presentaremos a inversores» y «le pondremos un locutor, una voz en off, que tendré que elegir». Guion de 75 s, casi todo
  con imágenes grabadas del propio juego (la isla que se despega, Ochagavía, las misiones, las leyendas, la pelota en el
  Labrit) y solo tres planos de Higgsfield. Muestras públicas de seis voces de narrador en castellano de España en
  `entrega/trailer/voces-muestra`, sacadas de la biblioteca de ElevenLabs sin gastar créditos; la voz se elige antes de
  generar nada. Quedaban 341,25 créditos de Higgsfield.
- **Tráiler para inversores, primer montaje** (17 de noviembre de 2026). El autor: «Estos personajes quiero que los añadas
  también al tráiler. El tráiler tiene que ir avanzando. El tráiler lo necesito cuanto antes». Las piezas, en
  `tools/trailer/`:
  - `rodar-mapa.mjs` graba el mapa del inicio fotograma a fotograma con un reloj propio (performance.now, Date.now y
    requestAnimationFrame solo avanzan con `__paso`): Navarra entera, la cámara baja y la comarca sube como una isla. El
    vuelo de dron sobre la isla tarda unos 15 s por fotograma con el pintado por software; con 11 s basta para el principio.
  - `planos-inversores.mjs` son los planos del pueblo con los seis seres de Meshy, Maite, Joxemari y sus ovejas, Otsagabia
    desde el aire y un partido en el Labrit. Sus ayudas (`AYUDA`) van a la página como texto, porque los planos se ejecutan
    allí y no ven lo que hay fuera de su función. `frente` pone la cámara delante del personaje con un rumbo fijo y le gira
    hacia ella en cada fotograma: las figuras del carnaval y los seres de leyenda giraban solos. El Zarratrako tiene el
    frente al revés (`vuelta`). De noche los momotxorros huyen del jugador; en su plano se dan por encontrados. `despeja`
    aparta a los vecinos que se cruzaban delante de la cámara. `rodar.mjs` carga otro archivo de planos con `PLANOS=`.
  - `capturas-menu.mjs` saca las pantallas del juego a 1920 × 1080 (torneos, pasaporte, ventajas, láminas e insignias) con
    un perfil de ejemplo que ya tiene sellos.
  - `montaje-inversores.js` es el montaje de 75 s con el motor de `montaje.js`: tomas, textos, rótulos con el nombre de cada
    personaje, el móvil tumbado con el partido dentro y la cámara del jugador en una esquina, y el logo con «Buscamos
    socios para llevarlo a cada pueblo». Las tres frases que no se pudieron grabar con la voz de Salva salen escritas.
    `montar.mjs` lo carga con `MONTAJE=montaje-inversores.js` y toma la duración del propio montaje.
  - La voz va en una mezcla aparte: la música de los torneos, las seis frases de Salva en su sitio y la música que baja
    sola cuando habla (compresión con la voz como llave), a unos -15 LUFS.
  Grabar a 1080p con el pintado por software tarda unos 4 a 6 s por fotograma: los 670 de los planos nuevos, una hora larga.
  De los planos del tráiler de 60 s solo quedan los que no enseñan los personajes de antes (Olite, plaza, subida, Javier
  y la pelota en el frontis); los huecos los llenan láminas del juego (`src/assets/laminas/grande`). El partido salió en
  el frontón de Lesaka, no en el Labrit (el clic del frontón en `rodar.mjs` no lo cambia): se rotula «Lesaka». Del plano
  que sigue a la pelota (`pelotaLabrit`) solo valían los primeros fotogramas y no se usa; sí la vista de la tele
  (`pelotaLabrit2`), también dentro del móvil. Los seres que giran solos se usan solo en el trozo en que miran a la cámara
  (`desde` y la duración de la toma). El Zarratrako está fuera: al autor no le gusta («no me gusta el zarratrako», 17 de
  noviembre de 2026); en su sitio, la lámina de Otsagabia. El vídeo: 75 s a 1920 × 1080 (437 MB con el grano del montador)
  y una versión ligera de 33 MB para enviar.
