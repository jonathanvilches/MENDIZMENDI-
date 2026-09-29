# MENDIMENDIZ · Navarra, pueblo a pueblo

Videojuego 3D para navegador (Three.js) para niños y niñas de 7 a 11 años. Se recorre Navarra pueblo a pueblo:
cada pueblo y ciudad tiene sus propias misiones sobre su iglesia y sus monumentos, sus productos, su agricultura,
su ganadería, sus danzas, su carnaval, sus oficios antiguos y sus leyendas. Al completar todas las misiones de un
pueblo se gana su sello; con todos los pueblos de una comarca, la comarca se ilumina en el mapa de Navarra.

## Estructura del juego
- **Centro de mando** (`src/hub`): inicio, mapa de Navarra con comarcas y pueblos, fichas de comarca (cultura,
  naturaleza, cimas), pueblos, 120 cimas con perfil, naturaleza y fauna, personajes (9), insignias, pasaporte y perfil.
- **30 localidades** (`src/data/levels.js`): 29 pueblos generados con arquitectura propia de su zona
  (atlántica, pirenaica, media, ribera y ciudad) y la aventura completa del valle de Salazar (Otsagabia).
- **Misiones** (`src/game/townGame.js`): cada misión tiene pasos claros (se ven en el HUD, en el cuaderno y con la
  luz dorada): visita, producto (recoger + ordenar pasos), cosecha, rebaño al redil, danza (ritmo), carnaval
  (buscar por el sonido de los cencerros), oficio (barra de precisión o pulsar rápido), leyenda, carrera por aros,
  observación con prismáticos, tradición (repetir melodía) y preguntas del sabio del pueblo.
- **Personajes** (`src/actors/minifig.js`): minifiguras de bloques con cara impresa (parpadeo y habla), estampados
  de traje, texturas de pelo, lana, paja, madera y metal, y paso de péndulo con balanceo.
- **Gráficos propios**: todos los iconos están dibujados en SVG (`src/ui/icons.js`); los retratos se renderizan
  desde las propias figuras 3D (`src/ui/portraits.js`). No se usan emojis.

## Cómo jugar
- Ordenador: WASD o flechas para caminar, Mayús para correr, Espacio para saltar, E para hablar/usar,
  F prismáticos, C cuaderno, M mapa, Esc menú. Ratón para mover la cámara y rueda para el zoom.
- Móvil: arrastra en la mitad izquierda para caminar y en la derecha para mirar; botón amarillo para la acción.

## Desarrollo
```
npm install
npx vite                        # servidor de desarrollo
npx vite build                  # genera dist/index.html (un solo archivo)
node tools/make-artifact.mjs    # prepara artifact/mendimendiz.html para publicar
```
Pruebas: `tools/play.mjs` (pasos automatizados), `tools/views.mjs` (fotos con cámara fija) y `lab/flow-town.js`
(recorre todas las misiones de un pueblo: `node tools/play.mjs "http://127.0.0.1:5173/?town=lesaka" out '[{"wait":20000},{"file":"lab/flow-town.js"}]'`).
Laboratorios: `lab/minifigs.html` (figuras y animación), `lab/icons.html` (iconos), `lab/portraits.html` (retratos).

Los datos culturales proceden de las fichas del proyecto (Turismo de Navarra, Dantzatlas, Reyno Gourmet,
ayuntamientos…). Los personajes y diálogos son ficción del juego; los pueblos son interpretaciones, no planos exactos.
