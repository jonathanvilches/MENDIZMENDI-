# Herriz Herri / Mendiz Mendi: reglas para todas las ventanas de Claude

El autor del juego no lee inglés: escríbele siempre en castellano.

Varias ventanas de Claude trabajan a la vez sobre este repositorio, todas en `master`. Para no pisarse:

1. **Antes de empezar y antes de subir**: `git pull --rebase --autostash origin master`, lee `COORDINACION.md` y mira
   `git log --oneline -15`. Si otra ventana ya ha hecho lo que ibas a hacer, no lo repitas: parte de lo suyo.
2. **Cada ventana, lo suyo.** `COORDINACION.md` dice qué lleva cada una y qué archivos son suyos. No edites los de otra:
   si necesitas un cambio allí, apúntalo en «Peticiones» de ese archivo y díselo al autor.
3. **Subir**: commits pequeños a `master`, con mensaje en castellano. Si al subir hay conflicto en un archivo que no es
   tuyo, quédate con lo que hay en `master`.
4. **Publicar la web** (`docs/` y la rama `main`, que es lo que ve el autor en el móvil) lo hace la ventana principal,
   cuando está dentro lo de todas. Cuando acabes algo que deba publicarse, añade una línea en «Listo para publicar» de
   `COORDINACION.md`. Si el autor te pide a ti que publiques, hazlo, pero justo antes trae lo de todas con
   `git pull --rebase --autostash origin master` y apunta en `COORDINACION.md` hasta qué commit llega lo publicado.
5. Nada entra en el juego sin haberlo visto en pantalla (ordenador 1280×720 y móvil tumbado 844×390).
6. **Menos es más** (el autor, 20 nov 2026: «Quédate con esta frase, menos es más»). En cada pantalla, tarjeta o panel,
   solo lo que hace falta: nada de cajas dentro de cajas ni de dos cosas que digan lo mismo, y las fotos de fondo detrás
   de un velo oscuro, que se intuyan sin competir. Más imágenes que texto, sin quitar información clave.

La web se compila con `WEB=1 npx vite build` (sale en `docs/`). `npx vite build` a secas hace el archivo único de descarga,
que hoy falla al empaquetar y no hace falta para publicar.
