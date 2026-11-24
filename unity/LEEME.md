# HERRIZHERRI en Unity

> **En pausa** (el autor, 24 nov: «déjalo todo preparado para trabajar en Unity, pero de momento seguiremos trabajando
> aquí»). Se sigue con la web; esto queda listo para cuando se quiera. Mientras tanto, lo único que sigue solo es que GitHub
> vuelve a sacar `exportar/datos` con cada cambio de datos. Nada pesado se guarda en GitHub.

El proyecto de Unity del juego está en este mismo repositorio, para que lo que se cambie en el juego llegue a Unity sin
copiar nada a mano:

- `unity/HERRIZHERRI/`: el proyecto (lo que se abre con Unity Hub).
- `unity/com.herrizherri.juego/`: el juego en C#, como paquete de Unity (lo trae el proyecto solo): el explorador, su
  cámara, los mandos, cargar un pueblo y los menús. Con el explorador y la exploradora del juego en `Modelos~/`.

## Jugar en un pueblo (lo que ya se puede hacer)

1. Instala **Unity Hub** y **Unity 6** (unity.com/download; con Unity Personal, gratis).
2. Trae el repositorio al ordenador (GitHub Desktop → Clone, o `git clone`) y, cuando haya cambios, «Pull».
3. Pon los pueblos exportados en `exportar/pueblos/` (del .zip «HERRIZHERRI-5-pueblo-lesaka», o sacándolos con
   `npm run exportar:pueblos`, ver `PORTAR.md`).
4. Unity Hub → **Add** → «Add project from disk» → la carpeta `unity/HERRIZHERRI`. Ábrelo (si pide otra versión, la de
   Unity 6 que tengas). La primera vez tarda unos minutos: descarga glTFast e importa el paquete.
5. Arriba, menú **HERRIZHERRI → Jugar en un pueblo…** → elige el `.glb` (por ejemplo `lesaka.glb`). Unity prepara la
   escena y empieza a jugar solo. Para parar, el botón ▶ de arriba.

Mandos: **W A S D** o las flechas para andar, **Mayúsculas** para correr, **arrastrar con el ratón** para girar la cámara,
**rueda** para acercar, **F** para volar con la cámara (y F otra vez para volver), **R** para volver a la entrada y **H**
para ver u ocultar la ayuda. Con un mando de consola también: palanca izquierda para andar y derecha para mirar.

- **HERRIZHERRI → Jugar otra vez en el último pueblo**: el mismo, sin volver a elegir.
- **HERRIZHERRI → Jugar con la exploradora**: la chica en vez del chico (como en el perfil del juego).

El explorador empieza donde le deja el juego al entrar en ese pueblo, a su talla (1,40 m, más bajo que los adultos),
con sus animaciones de quieto, andar y correr. Choca con el suelo, las casas, los muros y los árboles grandes. Aún no hay
vecinos que hablen, misiones, sonido ni pelota: llegan cuando se pase la lógica a C# (`PORTAR.md`, fases 1 y 2). El
suelo y el agua se ven de un color liso: en el juego los pinta un sombreador propio, que está guardado en
`exportar/sombreadores` para rehacerlo en Unity.

## Cómo llegan los cambios

1. Se cambia algo en el juego (aquí, con Claude) → se sube a GitHub, siempre.
2. Si son datos (pueblos, misiones, vecinos, frases…), GitHub vuelve a sacar el JSON de `exportar/datos` solo
   (`.github/workflows/exportar-datos.yml`). Si es el código del paquete de Unity, ya está en GitHub.
3. En el ordenador donde está Unity: «Pull» (GitHub Desktop) o `git pull`.
4. Al abrir Unity se reimporta el paquete, y `SincronizarDesdeElJuego.cs` trae a `Assets/HERRIZHERRI/` lo nuevo de
   `exportar/` (datos, relieve, modelos, sonido, vídeo, letras, texturas y sombreadores; también con el menú
   **HERRIZHERRI → Traer los cambios del juego**). Los pueblos y el mapa no se copian (pesan 100-200 MB cada uno): se leen
   de `exportar/` al jugar.

Los pueblos, el mapa, los modelos y las texturas pesan mucho y no van en GitHub: se sacan cuando haga falta con
`npm run exportar:todo` (ver `PORTAR.md`). `Assets/HERRIZHERRI/` y `Assets/Escenas/` se hacen solos: no se editan a mano ni
se suben a GitHub (están en `.gitignore`).

## Para quien programe

- Unity 6 (6000.0 o posterior), con el «Built-in Render Pipeline» (sin URP, para que glTFast ponga sus materiales sin
  configurar nada). Si se pasa a URP, glTFast usa sus materiales de URP solo.
- Mandos: `Entrada.cs` funciona con el Input Manager de siempre y, si el proyecto tiene el paquete Input System, con el
  nuevo (`HERRI_INPUT_SYSTEM`).
- El código se comprueba compilándolo contra `UnityEngine.dll` y `UnityEditor.dll` (sin abrir Unity); lo que no se ha
  probado aún es verlo en pantalla con Unity.
