# HERRIZHERRI en Unity

Aquí irá el proyecto de Unity del juego, en el mismo repositorio que la versión web, para que lo que se cambie en el juego
llegue a Unity sin copiar nada a mano.

## Cómo llegan los cambios

1. Se cambia algo en el juego (aquí, con Claude) → se sube a GitHub, siempre.
2. Si son datos (pueblos, misiones, vecinos, frases…), GitHub vuelve a sacar el JSON de `exportar/datos` solo
   (`.github/workflows/exportar-datos.yml`).
3. En el ordenador donde está Unity: `git pull` (o «Pull» en GitHub Desktop).
4. Al abrir Unity, `Assets/Editor/HERRIZHERRI/SincronizarDesdeElJuego.cs` trae a `Assets/HERRIZHERRI/` lo nuevo de
   `exportar/` (también con el menú **HERRIZHERRI → Traer los cambios del juego**), y Unity lo reimporta.

Los modelos, los pueblos, el mapa y las texturas pesan mucho y no van en GitHub: se sacan cuando haga falta con
`npm run exportar:todo` (ver `PORTAR.md`) y el mismo menú los trae.

## Para empezar el proyecto

- Unity 6 (LTS), plantilla **Universal 3D (URP)**, y crear el proyecto **en esta carpeta** (`unity/`).
- Paquetes: glTFast (`com.unity.cloud.gltfast`) para los `.glb`, TextMeshPro para las letras, Input System.
- `Assets/HERRIZHERRI/` es una copia de `exportar/`: no se edita a mano ni se sube a GitHub (está en `.gitignore`).

## Ver un pueblo y pasear por él

Menú **HERRIZHERRI → Ver un pueblo en la escena…**, elegir el `.glb` (por ejemplo `lesaka.glb`) y pulsar **Play** (▶
arriba en el centro). W A S D o las flechas para moverse, botón derecho del ratón para mirar, Mayúsculas para ir rápido, E y
Q para subir y bajar (`Assets/Scripts/HERRIZHERRI/PaseoLibre.cs`). Aún no se juega: el explorador, los vecinos que hablan,
las misiones y la pelota llegan cuando se pase la lógica a C# (`PORTAR.md`, fases 1 y 2).
