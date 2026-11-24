// HERRIZHERRI · Traer a Unity lo que se cambia en el juego (ver unity/LEEME.md y PORTAR.md)
//
// El proyecto de Unity vive en unity/HERRIZHERRI, dentro del mismo repositorio que el juego. Al abrir Unity (y con el menú
// HERRIZHERRI → Traer los cambios del juego) copia lo exportado en exportar/ a Assets/HERRIZHERRI/: los datos en JSON,
// las alturas de Navarra, los modelos, el sonido, el vídeo, las letras y las texturas. Solo copia lo que es nuevo o ha
// cambiado, y luego Unity lo reimporta (los .glb con glTFast: com.unity.cloud.gltfast). Los pueblos y el mapa no se
// copian (pesan 100-200 MB cada uno): JuegoPueblo los lee de exportar/ al jugar (menú HERRIZHERRI → Jugar en un pueblo…).
// El camino de un cambio: se hace en el juego → se sube a GitHub (siempre) → GitHub saca los datos de nuevo
// (.github/workflows/exportar-datos.yml) → en el ordenador de Unity, «git pull» → Unity lo trae al abrirse.
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Herrizherri.Editor
{
    [InitializeOnLoad]
    public static class SincronizarDesdeElJuego
    {
        // (carpeta de exportar/ → carpeta dentro de Assets/HERRIZHERRI/)
        static readonly string[,] Carpetas =
        {
            { "datos", "Datos" }, { "relieve", "Relieve" }, { "modelos", "Modelos" }, { "sonido", "Sonido" }, { "video", "Video" }, { "fuentes", "Fuentes" }, { "texturas", "Texturas" }, { "sombreadores", "Sombreadores" },
        };

        static SincronizarDesdeElJuego()
        {
            // (una vez al abrir el editor, cuando ha terminado de cargar)
            if (!SessionState.GetBool("HERRIZHERRI.sincronizado", false))
            {
                SessionState.SetBool("HERRIZHERRI.sincronizado", true);
                EditorApplication.delayCall += () => Sincronizar(false);
            }
        }

        [MenuItem("HERRIZHERRI/Traer los cambios del juego", false, 40)]
        public static void TraerAhora() => Sincronizar(true);

        static void Sincronizar(bool avisar)
        {
            string repo = Repositorio.Buscar();
            if (repo == null)
            {
                if (avisar) EditorUtility.DisplayDialog("HERRIZHERRI", "No encuentro la carpeta del juego (la que tiene PORTAR.md). El proyecto de Unity tiene que ser unity/HERRIZHERRI, dentro del repositorio.", "Vale");
                return;
            }
            string origen = Path.Combine(repo, "exportar"), destino = Path.Combine(Application.dataPath, "HERRIZHERRI");
            int copiados = 0;
            for (int i = 0; i < Carpetas.GetLength(0); i++)
                copiados += Copiar(Path.Combine(origen, Carpetas[i, 0]), Path.Combine(destino, Carpetas[i, 1]));
            if (copiados > 0) AssetDatabase.Refresh();
            Debug.Log($"HERRIZHERRI: {copiados} archivos nuevos o cambiados traídos de {origen}");
            if (avisar) EditorUtility.DisplayDialog("HERRIZHERRI", copiados > 0 ? $"{copiados} archivos nuevos o cambiados." : "Todo estaba al día.", "Vale");
        }

        static int Copiar(string de, string a)
        {
            if (!Directory.Exists(de)) return 0;
            int n = 0;
            foreach (string f in Directory.GetFiles(de, "*", SearchOption.AllDirectories))
            {
                string rel = f.Substring(de.Length).TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                string dst = Path.Combine(a, rel);
                var fi = new FileInfo(f);
                var di = new FileInfo(dst);
                if (di.Exists && di.Length == fi.Length && di.LastWriteTimeUtc >= fi.LastWriteTimeUtc) continue;
                Directory.CreateDirectory(Path.GetDirectoryName(dst));
                File.Copy(f, dst, true);
                n++;
            }
            return n;
        }
    }
}
