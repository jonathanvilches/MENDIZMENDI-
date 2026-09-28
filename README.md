# MENDIMENDIZ · Aventura en el valle de Salazar

Juego 3D para navegador (Three.js) pensado para niños y niñas de 7 a 11 años. Se explora Otsagabia/Ochagavía,
la Selva de Irati y el santuario de Muskilda, se ayuda a los vecinos y se reúnen ocho cintas para la fiesta de Muskilda.

## Cómo jugar
- Ordenador: WASD o flechas para caminar, Mayús para correr, Espacio para saltar, E para hablar/usar,
  F prismáticos, C cuaderno, M mapa, Esc menú. Ratón (arrastrar) para mover la cámara y rueda para el zoom.
- Móvil: arrastra en la mitad izquierda para caminar y en la derecha para mirar; botón amarillo para la acción.

## Misiones
1. Ongi etorri (Maite): puente medieval, fuente y la iglesia de San Juan → cinta roja.
2. Escudos de piedra (Itziar): los palacios de Urrutia, Iriarte y Donamaría → cinta amarilla.
3. El rebaño de Joxemari: pastorear 6 ovejas latxas al redil con el perro Txuri → cinta blanca.
4. Pelota en el frontón (Kike): 6 devoluciones seguidas → cinta verde.
5. Guardianes de Irati (Iñaki): observar 5 especies con los prismáticos → cinta azul.
6. El señor del bosque (Basajaun): recoger basura del bosque → cinta naranja.
7. El peine de oro (Lamia): encontrar su peine en la orilla del Anduña → cinta morada.
8. ¿Dónde está el Zarratrako? (Amaia): escondite guiado por cencerros → cinta rosa.
9. La fiesta de Muskilda (el Bobo): baile rítmico con los ocho danzantes y sello del pasaporte.

Extras: 12 eguzkilores escondidos, 26 cartas de saberes y animales, preguntas con estrellas, ciclo de día y noche.

## Desarrollo
```
npm install
npx vite            # servidor de desarrollo
npx vite build      # genera dist/index.html (un solo archivo)
node tools/make-artifact.mjs   # prepara artifact/mendimendiz.html para publicar
```

Estructura: `src/world` (terreno, ríos, pueblo, naturaleza, cielo), `src/actors` (protagonista, vecinos, fauna),
`src/game` (misiones, diálogos, contenido), `src/ui.js`, `src/audio.js` (sonido procedural), `src/fx.js`.
El protagonista es el modelo original del proyecto (`assets/hero.glb`, preparado con `tools/prep-hero.mjs`).
La versión anterior (paseo por Otsagabia) se conserva en `old/`.

El pueblo es una interpretación para jugar: la posición de casas y calles no es un plano exacto.
Los datos culturales proceden de las fichas del proyecto original.
